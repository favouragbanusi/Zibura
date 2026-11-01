// Handles the two store functions and serves every other page as a static file.
const CURRENCIES = ["CAD", "USD", "GBP", "NGN"];
const CURRENCY_BY_COUNTRY = { CA: "CAD", US: "USD", GB: "GBP", NG: "NGN" };
const SHIP_TO = ["CA", "US", "GB", "NG"];

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...extra }
  });
}

function region(request) {
  const country = (request.cf && request.cf.country) || "";
  const currency = CURRENCY_BY_COUNTRY[country] || "USD";
  return json({ country, currency }, 200, { "cache-control": "no-store" });
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

async function checkout(request, env) {
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


async function waitlist(request, env) {
  if (!env.DB) {
    return json({ error: "The waitlist is being set up. Please check back soon." }, 503);
  }
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "The form could not be read." }, 400);
  }
  if (body.website) return json({ ok: true });
  const clean = (v, n) => String(v || "").trim().slice(0, n);
  const first = clean(body.first, 60);
  const last = clean(body.last, 60);
  const email = clean(body.email, 160).toLowerCase();
  const country = clean(body.country, 60);
  const city = clean(body.city, 80);
  if (!first || !last || !country || !city || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ error: "Please complete every field with a valid email." }, 400);
  }
  try {
    await env.DB.prepare(
      "INSERT INTO waitlist (email, first, last, country, city, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(email, first, last, country, city, new Date().toISOString()).run();
  } catch (e) {
    if (String(e).includes("UNIQUE")) {
      return json({ ok: true, again: true });
    }
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
  return json({ ok: true });
}

async function reviewsGet(url, env) {
  if (!env.DB) return json({ reviews: [], count: 0, avg: 0, dist: [0, 0, 0, 0, 0] });
  const slug = String(url.searchParams.get("slug") || "").slice(0, 80);
  const rows = await env.DB.prepare(
    "SELECT name, rating, title, body, created_at FROM reviews WHERE slug = ? ORDER BY id DESC LIMIT 100"
  ).bind(slug).all();
  const list = rows.results || [];
  const dist = [0, 0, 0, 0, 0];
  let sum = 0;
  list.forEach((r) => { dist[r.rating - 1] += 1; sum += r.rating; });
  return json({ reviews: list, count: list.length, avg: list.length ? sum / list.length : 0, dist }, 200, { "cache-control": "no-store" });
}

async function ratingsGet(env) {
  if (!env.DB) return json({});
  const rows = await env.DB.prepare("SELECT slug, COUNT(*) AS n, AVG(rating) AS avg FROM reviews GROUP BY slug").all();
  const out = {};
  (rows.results || []).forEach((r) => { out[r.slug] = { count: r.n, avg: r.avg }; });
  return json(out, 200, { "cache-control": "public, max-age=60" });
}

async function reviewPost(request, env) {
  if (!env.DB) return json({ error: "Reviews are being set up. Please check back soon." }, 503);
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "The review could not be read." }, 400); }
  if (body.website) return json({ ok: true });
  const clean = (v, n) => String(v || "").trim().slice(0, n);
  const slug = clean(body.slug, 80);
  const name = clean(body.name, 60);
  const title = clean(body.title, 100);
  const text = clean(body.body, 1500);
  const rating = parseInt(body.rating, 10);
  if (!slug || !name || !title || text.length < 10 || !(rating >= 1 && rating <= 5)) {
    return json({ error: "Please add a rating, your name, a headline, and a comment of at least 10 characters." }, 400);
  }
  const origin = new URL(request.url).origin;
  const cat = await (await env.ASSETS.fetch(new URL("/catalog.json", origin))).json();
  if (!cat.some((p) => p.slug === slug)) return json({ error: "That Piece could not be found." }, 400);
  await env.DB.prepare(
    "INSERT INTO reviews (slug, name, rating, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(slug, name, rating, title, text, new Date().toISOString()).run();
  return json({ ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/region" && request.method === "GET") {
      return region(request);
    }
    if (url.pathname === "/api/checkout" && request.method === "POST") {
      return checkout(request, env);
    }
    if (url.pathname === "/api/reviews" && request.method === "GET") return reviewsGet(url, env);
    if (url.pathname === "/api/reviews" && request.method === "POST") return reviewPost(request, env);
    if (url.pathname === "/api/ratings" && request.method === "GET") return ratingsGet(env);
    if (url.pathname === "/api/waitlist" && request.method === "POST") {
      return waitlist(request, env);
    }
    return env.ASSETS.fetch(request);
  }
};
