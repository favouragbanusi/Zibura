const CURRENCIES = ["CAD", "USD", "GBP", "NGN"];
const SHIP_TO = ["CA", "US", "GB", "NG"];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" }
  });
}

async function createSession(env, origin, lines, currency) {
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", origin + "/thanks/");
  params.set("cancel_url", origin + "/cart/");
  SHIP_TO.forEach((c, i) => {
    params.set("shipping_address_collection[allowed_countries][" + i + "]", c);
  });
  lines.forEach((line, i) => {
    const amount = Math.round(line.piece.prices[currency] * 100);
    const p = "line_items[" + i + "]";
    params.set(p + "[quantity]", String(line.qty));
    params.set(p + "[price_data][currency]", currency.toLowerCase());
    params.set(p + "[price_data][unit_amount]", String(amount));
    params.set(p + "[price_data][product_data][name]", line.piece.name);
    params.set(
      p + "[price_data][product_data][description]",
      line.color + ", " + line.size
    );
  });
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      authorization: "Bearer " + env.STRIPE_SECRET_KEY,
      "content-type": "application/x-www-form-urlencoded"
    },
    body: params.toString()
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

export async function onRequestPost({ request, env }) {
  if (!env.STRIPE_SECRET_KEY) {
    return json({ error: "Checkout is being set up. Please check back soon." }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "The request could not be read." }, 400);
  }

  const currency = CURRENCIES.includes(body.currency) ? body.currency : "USD";
  const items = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
  if (items.length === 0) {
    return json({ error: "Your cart is empty." }, 400);
  }

  const origin = new URL(request.url).origin;
  const catalogRes = await env.ASSETS.fetch(new URL("/catalog.json", origin));
  const catalog = await catalogRes.json();
  const bySlug = new Map(catalog.map((p) => [p.slug, p]));

  const lines = [];
  for (const item of items) {
    const piece = bySlug.get(item.slug);
    if (!piece || !piece.colors.includes(item.color) || !piece.sizes.includes(item.size)) {
      return json({ error: "A Piece in your cart is no longer available." }, 400);
    }
    const qty = Math.min(Math.max(parseInt(item.qty, 10) || 1, 1), 10);
    lines.push({ piece, color: item.color, size: item.size, qty });
  }

  let result = await createSession(env, origin, lines, currency);
  if (!result.ok && currency !== "USD") {
    result = await createSession(env, origin, lines, "USD");
  }
  if (!result.ok || !result.data.url) {
    return json({ error: "Checkout could not start. Please try again." }, 502);
  }
  return json({ url: result.data.url });
}
