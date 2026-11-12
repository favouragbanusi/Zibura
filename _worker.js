// Handles the two store functions and serves every other page as a static file.
const CURRENCIES = ["CAD", "USD", "GBP", "EUR", "AUD", "AED", "ZAR", "NGN"];
const CURRENCY_BY_COUNTRY = { CA: "CAD", US: "USD", GB: "GBP", NG: "NGN", AU: "AUD", AE: "AED", ZA: "ZAR", DE: "EUR", FR: "EUR", IE: "EUR", ES: "EUR", IT: "EUR", NL: "EUR", BE: "EUR", PT: "EUR", AT: "EUR", FI: "EUR", GR: "EUR" };
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
  params.set("success_url", origin + "/thanks/?session_id={CHECKOUT_SESSION_ID}");
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
      line.size ? line.color + ", " + line.size : line.color
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
    return json({ error: "Your cart is empty. The Republic has plenty to show you." }, 400);
  }

  const origin = new URL(request.url).origin;
  const catalogRes = await env.ASSETS.fetch(new URL("/catalog.json", origin));
  const catalog = await catalogRes.json();
  const bySlug = new Map(catalog.map((p) => [p.slug, p]));

  const lines = [];
  for (const item of items) {
    const piece = bySlug.get(item.slug);
    if (!piece || !piece.colors.includes(item.color) || (piece.sizes.length ? !piece.sizes.includes(item.size) : false)) {
      return json({ error: "A product in your cart is no longer available." }, 400);
    }
    const qty = Math.min(Math.max(parseInt(item.qty, 10) || 1, 1), 10);
    lines.push({ piece, color: item.color, size: piece.sizes.length ? item.size : "", qty });
  }

  let result = await createSession(env, origin, lines, currency);
  if (!result.ok && currency !== "USD") {
    result = await createSession(env, origin, lines, "USD");
  }
  if (!result.ok || !result.data.url) {
    return json({ error: "Something went wrong on our side. Try again in a moment." }, 502);
  }
  try {
    const user = await currentUser(request, env);
    if (env.DB && user) {
      const cur = result.data.currency ? result.data.currency.toUpperCase() : currency;
      const items = lines.map((l) => ({ slug: l.piece.slug, name: l.piece.name, color: l.color, size: l.size, qty: l.qty, unit: l.piece.prices[cur] || l.piece.prices.USD }));
      await env.DB.prepare("INSERT OR IGNORE INTO orders (user_id, stripe_session, status, currency, total, items_json, ship_json, created_at) VALUES (?, ?, 'pending', ?, ?, ?, '', ?)")
        .bind(user.id, result.data.id, cur, Math.round((result.data.amount_total || items.reduce((s, i) => s + i.unit * i.qty * 100, 0))), JSON.stringify(items), new Date().toISOString()).run();
    }
  } catch (e) {}
  return json({ url: result.data.url });
}

// ---------- Account extras: orders, profile, addresses, saved, security ----------
async function stripeSession(env, id) {
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions/" + encodeURIComponent(id), { headers: { authorization: "Bearer " + env.STRIPE_SECRET_KEY } });
  return res.ok ? res.json() : null;
}
async function confirmOrder(request, env) {
  const off = needDb(env); if (off) return off;
  let b; try { b = await request.json(); } catch (e) { return json({ error: "The request could not be read." }, 400); }
  const id = clean(b.session_id, 200);
  if (!id || !env.STRIPE_SECRET_KEY) return json({ ok: false });
  const s = await stripeSession(env, id);
  if (!s || s.payment_status !== "paid") return json({ ok: false });
  const sd = s.shipping_details || (s.collected_information && s.collected_information.shipping_details) || null;
  const ship = sd ? JSON.stringify({ name: sd.name, address: sd.address }) : "";
  await env.DB.prepare("UPDATE orders SET status = 'paid', total = ?, currency = ?, ship_json = ?, email = ? WHERE stripe_session = ?")
    .bind(s.amount_total || 0, String(s.currency || "usd").toUpperCase(), ship, (s.customer_details && s.customer_details.email) || "", id).run();
  const row = await env.DB.prepare("SELECT id FROM orders WHERE stripe_session = ?").bind(id).first();
  return json({ ok: true, number: row ? orderNo(row.id) : "" });
}
const orderNo = (id) => "ZR-" + String(1000 + id);

async function account(request, env) {
  const off = needDb(env); if (off) return off;
  const user = await currentUser(request, env);
  if (!user) return json({ user: null }, 200, { "cache-control": "no-store" });
  const db = env.DB;
  const full = await db.prepare("SELECT birth_day, birth_month, created_at FROM users WHERE id = ?").bind(user.id).first();
  const prof = (await db.prepare("SELECT * FROM profiles WHERE user_id = ?").bind(user.id).first()) || {};
  const orders = (await db.prepare("SELECT id, status, currency, total, items_json, ship_json, created_at FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT 100").bind(user.id).all()).results || [];
  const addresses = (await db.prepare("SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC").bind(user.id).all()).results || [];
  const saved = ((await db.prepare("SELECT slug FROM saved WHERE user_id = ? ORDER BY created_at DESC").bind(user.id).all()).results || []).map((r) => r.slug);
  let style = null, prefs = {};
  try { style = prof.style_json ? JSON.parse(prof.style_json) : null; } catch (e) {}
  try { prefs = prof.prefs_json ? JSON.parse(prof.prefs_json) : {}; } catch (e) {}
  const hasAvatar = !!(env.PHOTOS && prof.avatar_key);
  return json({
    user: { first: user.first, last: user.last, email: user.email, birth_day: full && full.birth_day, birth_month: full && full.birth_month, since: full && full.created_at },
    profile: { province: prof.province || "", phone: prof.phone || "", city: prof.city || "", country: prof.country || "", bio: prof.bio || "", pronouns_note: "", avatar: hasAvatar, style, prefs },
    orders: orders.map((o) => ({ number: orderNo(o.id), status: o.status, currency: o.currency, total: o.total, items: safeParse(o.items_json, []), ship: safeParse(o.ship_json, null), at: o.created_at })),
    addresses, saved
  }, 200, { "cache-control": "no-store" });
}
function safeParse(s, d) { try { return s ? JSON.parse(s) : d; } catch (e) { return d; } }

async function saveProfile(request, env) {
  const off = needDb(env); if (off) return off;
  const user = await currentUser(request, env);
  if (!user) return json({ error: "Please sign in first." }, 401);
  let b; try { b = await request.json(); } catch (e) { return json({ error: "The form could not be read." }, 400); }
  const cur = (await env.DB.prepare("SELECT * FROM profiles WHERE user_id = ?").bind(user.id).first()) || {};
  const next = {
    province: b.province !== undefined ? clean(b.province, 20) : cur.province || "",
    phone: b.phone !== undefined ? clean(b.phone, 40) : cur.phone || "",
    city: b.city !== undefined ? clean(b.city, 80) : cur.city || "",
    country: b.country !== undefined ? clean(b.country, 80) : cur.country || "",
    bio: b.bio !== undefined ? clean(b.bio, 280) : cur.bio || "",
    style_json: b.style !== undefined ? JSON.stringify(b.style).slice(0, 4000) : cur.style_json || "",
    prefs_json: b.prefs !== undefined ? JSON.stringify(b.prefs).slice(0, 4000) : cur.prefs_json || ""
  };
  await env.DB.prepare("INSERT INTO profiles (user_id, province, phone, city, country, bio, style_json, prefs_json, avatar_key, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET province=excluded.province, phone=excluded.phone, city=excluded.city, country=excluded.country, bio=excluded.bio, style_json=excluded.style_json, prefs_json=excluded.prefs_json, updated_at=excluded.updated_at")
    .bind(user.id, next.province, next.phone, next.city, next.country, next.bio, next.style_json, next.prefs_json, cur.avatar_key || "", new Date().toISOString()).run();
  if (b.first !== undefined || b.last !== undefined || b.birth_day !== undefined) {
    const first = clean(b.first, 60) || user.first, last = clean(b.last, 60) || user.last;
    await env.DB.prepare("UPDATE users SET first = ?, last = ?, birth_day = ?, birth_month = ? WHERE id = ?")
      .bind(first, last, parseInt(b.birth_day, 10) || null, parseInt(b.birth_month, 10) || null, user.id).run();
  }
  return json({ ok: true });
}

async function avatarPost(request, env) {
  const off = needDb(env); if (off) return off;
  if (!env.PHOTOS) return json({ error: "Photo storage is being set up." }, 503);
  const user = await currentUser(request, env);
  if (!user) return json({ error: "Please sign in first." }, 401);
  let form; try { form = await request.formData(); } catch (e) { return json({ error: "The photo could not be read." }, 400); }
  const file = form.get("photo");
  if (!file || typeof file === "string" || file.size < 500 || file.size > 2 * 1024 * 1024) return json({ error: "Please choose a photo under 2 MB." }, 400);
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return json({ error: "Please choose a JPG, PNG, or WebP photo." }, 400);
  const key = "avatars/" + user.id;
  await env.PHOTOS.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
  await env.DB.prepare("INSERT INTO profiles (user_id, avatar_key, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET avatar_key = excluded.avatar_key, updated_at = excluded.updated_at")
    .bind(user.id, key, new Date().toISOString()).run();
  return json({ ok: true });
}
async function avatarGet(request, env) {
  const user = await currentUser(request, env);
  if (!user || !env.PHOTOS) return new Response("Not found", { status: 404 });
  const obj = await env.PHOTOS.get("avatars/" + user.id);
  if (!obj) return new Response("Not found", { status: 404 });
  return new Response(obj.body, { headers: { "content-type": obj.httpMetadata?.contentType || "image/jpeg", "cache-control": "private, max-age=60" } });
}

async function addressPost(request, env) {
  const off = needDb(env); if (off) return off;
  const user = await currentUser(request, env);
  if (!user) return json({ error: "Please sign in first." }, 401);
  let b; try { b = await request.json(); } catch (e) { return json({ error: "The form could not be read." }, 400); }
  if (b.action === "delete") {
    await env.DB.prepare("DELETE FROM addresses WHERE id = ? AND user_id = ?").bind(parseInt(b.id, 10) || 0, user.id).run();
    return json({ ok: true });
  }
  if (b.action === "default") {
    await env.DB.prepare("UPDATE addresses SET is_default = CASE WHEN id = ? THEN 1 ELSE 0 END WHERE user_id = ?").bind(parseInt(b.id, 10) || 0, user.id).run();
    return json({ ok: true });
  }
  const a = { label: clean(b.label, 40) || "Home", name: clean(b.name, 80), line1: clean(b.line1, 120), line2: clean(b.line2, 120), city: clean(b.city, 80), region: clean(b.region, 80), postal: clean(b.postal, 20), country: clean(b.country, 60), phone: clean(b.phone, 40) };
  if (!a.name || !a.line1 || !a.city || !a.postal || !a.country) return json({ error: "Please add a name, street address, city, postal code, and country." }, 400);
  const count = await env.DB.prepare("SELECT COUNT(*) AS n FROM addresses WHERE user_id = ?").bind(user.id).first();
  if (!b.id && count.n >= 10) return json({ error: "You can keep up to 10 addresses." }, 400);
  if (b.id) {
    await env.DB.prepare("UPDATE addresses SET label=?, name=?, line1=?, line2=?, city=?, region=?, postal=?, country=?, phone=? WHERE id=? AND user_id=?")
      .bind(a.label, a.name, a.line1, a.line2, a.city, a.region, a.postal, a.country, a.phone, parseInt(b.id, 10) || 0, user.id).run();
  } else {
    await env.DB.prepare("INSERT INTO addresses (user_id, label, name, line1, line2, city, region, postal, country, phone, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(user.id, a.label, a.name, a.line1, a.line2, a.city, a.region, a.postal, a.country, a.phone, count.n === 0 ? 1 : 0).run();
  }
  return json({ ok: true });
}

async function savedPost(request, env) {
  const off = needDb(env); if (off) return off;
  const user = await currentUser(request, env);
  if (!user) return json({ error: "Please sign in first." }, 401);
  let b; try { b = await request.json(); } catch (e) { return json({ error: "The request could not be read." }, 400); }
  const slug = clean(b.slug, 80);
  if (!slug) return json({ error: "Missing product." }, 400);
  const row = await env.DB.prepare("SELECT 1 AS x FROM saved WHERE user_id = ? AND slug = ?").bind(user.id, slug).first();
  if (row) { await env.DB.prepare("DELETE FROM saved WHERE user_id = ? AND slug = ?").bind(user.id, slug).run(); return json({ ok: true, saved: false }); }
  await env.DB.prepare("INSERT INTO saved (user_id, slug, created_at) VALUES (?, ?, ?)").bind(user.id, slug, new Date().toISOString()).run();
  return json({ ok: true, saved: true });
}

async function passwordPost(request, env) {
  const off = needDb(env); if (off) return off;
  const user = await currentUser(request, env);
  if (!user) return json({ error: "Please sign in first." }, 401);
  let b; try { b = await request.json(); } catch (e) { return json({ error: "The form could not be read." }, 400); }
  const row = await env.DB.prepare("SELECT salt, pass_hash FROM users WHERE id = ?").bind(user.id).first();
  if (!row || (await hashPassword(String(b.current || ""), row.salt)) !== row.pass_hash) return json({ error: "Your current password does not match." }, 403);
  const next = String(b.next || "");
  if (next.length < 8 || next.length > 200) return json({ error: "Your new password needs at least 8 characters." }, 400);
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  await env.DB.prepare("UPDATE users SET salt = ?, pass_hash = ? WHERE id = ?").bind(salt, await hashPassword(next, salt), user.id).run();
  return json({ ok: true });
}

// ---------- Password reset by email (Brevo) ----------
async function sendMail(env, to, subject, html) {
  if (!env.BREVO_API_KEY || !env.MAIL_FROM) return false;
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ sender: { name: "Zibura", email: env.MAIL_FROM }, to: [{ email: to }], subject, htmlContent: html })
  });
  return res.ok;
}
async function forgotPassword(request, env) {
  const off = needDb(env); if (off) return off;
  let b; try { b = await request.json(); } catch (e) { return json({ error: "The form could not be read." }, 400); }
  const email = clean(b.email, 160).toLowerCase();
  const done = json({ ok: true });
  if (!emailOk(email)) return done;
  const user = await env.DB.prepare("SELECT id, first FROM users WHERE email = ?").bind(email).first();
  if (!user) return done;
  const recent = await env.DB.prepare("SELECT created_at FROM password_resets WHERE user_id = ? ORDER BY created_at DESC LIMIT 1").bind(user.id).first();
  if (recent && Date.now() - recent.created_at < 60000) return done;
  const token = hex(crypto.getRandomValues(new Uint8Array(32)));
  await env.DB.prepare("INSERT INTO password_resets (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
    .bind(await sha256(token), user.id, Date.now() + 3600000, Date.now()).run();
  const link = new URL(request.url).origin + "/reset/?token=" + token;
  await sendMail(env, email, "Reset your Zibura password",
    "<p>Hello " + user.first.replace(/[<>&]/g, "") + ",</p><p>Republic Administration received a request to reset your password. Use the link below within one hour.</p><p><a href=\"" + link + "\">Reset my password</a></p><p>If you did not ask for this, you can ignore this email. Your password stays the same.</p>");
  return done;
}
async function resetPassword(request, env) {
  const off = needDb(env); if (off) return off;
  let b; try { b = await request.json(); } catch (e) { return json({ error: "The form could not be read." }, 400); }
  const password = String(b.password || "");
  if (password.length < 8 || password.length > 200) return json({ error: "Your new password needs at least 8 characters." }, 400);
  const row = await env.DB.prepare("SELECT user_id, expires_at FROM password_resets WHERE token_hash = ?").bind(await sha256(String(b.token || ""))).first();
  if (!row || row.expires_at < Date.now()) return json({ error: "This reset link has expired. Ask for a new one." }, 400);
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  await env.DB.prepare("UPDATE users SET salt = ?, pass_hash = ? WHERE id = ?").bind(salt, await hashPassword(password, salt), row.user_id).run();
  await env.DB.prepare("DELETE FROM password_resets WHERE user_id = ?").bind(row.user_id).run();
  await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(row.user_id).run();
  return json({ ok: true });
}

async function deleteAccount(request, env) {
  const off = needDb(env); if (off) return off;
  const user = await currentUser(request, env);
  if (!user) return json({ error: "Please sign in first." }, 401);
  let b; try { b = await request.json(); } catch (e) { return json({ error: "The form could not be read." }, 400); }
  const row = await env.DB.prepare("SELECT salt, pass_hash FROM users WHERE id = ?").bind(user.id).first();
  if (!row || (await hashPassword(String(b.password || ""), row.salt)) !== row.pass_hash) return json({ error: "Your password does not match." }, 403);
  for (const t of ["sessions", "applications", "profiles", "addresses", "saved", "orders", "password_resets"]) {
    await env.DB.prepare("DELETE FROM " + t + " WHERE user_id = ?").bind(user.id).run();
  }
  await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(user.id).run();
  if (env.PHOTOS) { await env.PHOTOS.delete("photos/" + user.id); await env.PHOTOS.delete("avatars/" + user.id); }
  return json({ ok: true }, 200, { "set-cookie": sessionCookie("", 0) });
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
  const day = parseInt(body.birth_day, 10) || null;
  const month = parseInt(body.birth_month, 10) || null;
  const phone = clean(body.phone, 30).replace(/[^\d+()\-\s]/g, "");
  const emailOk = body.email_consent ? 1 : 0;
  const smsOk = phone && body.sms_consent ? 1 : 0;
  const province = ["Minimalist", "Classicist", "Maximalist", "Romantic", "Provocateur", "Naturalist", "Mover", "Colourist", "Avant-gardist", "Easy Dresser", "Ripple", "Glow", "Blaze", "Bloom", "Dash", "Swirl", "Composed", "Warm", "Bold", "Grounded", "Playful", "Layered"].includes(body.province || body.leaning) ? (body.province || body.leaning) : null;
  if (!first || !last || !country || !city || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ error: "Please complete every field with a valid email." }, 400);
  }
  if (!emailOk) return json({ error: "Please tick the box to receive news from Zi Republic." }, 400);
  if ((day && (day < 1 || day > 31)) || (month && (month < 1 || month > 12))) {
    return json({ error: "Please check your birthday." }, 400);
  }
  try {
    await env.DB.prepare(
      "INSERT INTO waitlist (email, first, last, country, city, birth_day, birth_month, phone, email_consent, sms_consent, province, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(email, first, last, country, city, day, month, phone || null, emailOk, smsOk, province, new Date().toISOString()).run();
  } catch (e) {
    if (String(e).includes("UNIQUE")) {
      await env.DB.prepare("UPDATE waitlist SET province = COALESCE(?, province), birth_day = COALESCE(?, birth_day), birth_month = COALESCE(?, birth_month), phone = COALESCE(?, phone), sms_consent = MAX(sms_consent, ?) WHERE email = ?")
        .bind(province, day, month, phone || null, smsOk, email).run();
      return json({ ok: true, again: true });
    }
    if (String(e).includes("no such column") || String(e).includes("no such table")) {
      return json({ error: "The database needs its update. Run update.sql in the D1 Console, then try again." }, 500);
    }
    return json({ error: "Something went wrong on our side. Try again in a moment." }, 500);
  }
  return json({ ok: true });
}

async function subscribe(request, env) {
  if (!env.DB) return json({ error: "Sign up is being set up. Please check back soon." }, 503);
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "The form could not be read." }, 400); }
  if (body.website) return json({ ok: true });
  const clean = (v, n) => String(v || "").trim().slice(0, n);
  const first = clean(body.first, 60);
  const email = clean(body.email, 160).toLowerCase();
  const province = ["Minimalist", "Classicist", "Maximalist", "Romantic", "Provocateur", "Naturalist", "Mover", "Colourist", "Avant-gardist", "Easy Dresser", "Ripple", "Glow", "Blaze", "Bloom", "Dash", "Swirl", "Composed", "Warm", "Bold", "Grounded", "Playful", "Layered"].includes(body.province || body.leaning) ? (body.province || body.leaning) : null;
  if (!first || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "Please add your name and a valid email." }, 400);
  if (!body.email_consent) return json({ error: "Please tick the box to receive news from Zi Republic." }, 400);
  try {
    await env.DB.prepare("INSERT INTO subscribers (email, first, province, created_at) VALUES (?, ?, ?, ?)")
      .bind(email, first, province, new Date().toISOString()).run();
  } catch (e) {
    if (String(e).includes("UNIQUE")) return json({ ok: true, again: true });
    if (String(e).includes("no such table")) return json({ error: "The database needs its update. Run update.sql in the D1 Console, then try again." }, 500);
    return json({ error: "Something went wrong on our side. Try again in a moment." }, 500);
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
  if (!cat.some((p) => p.slug === slug)) return json({ error: "That product could not be found." }, 400);
  await env.DB.prepare(
    "INSERT INTO reviews (slug, name, rating, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(slug, name, rating, title, text, new Date().toISOString()).run();
  return json({ ok: true });
}

// ---------- Accounts, applications, and the Zi Card ----------
const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const unhex = (s) => new Uint8Array((s.match(/../g) || []).map((h) => parseInt(h, 16)));

async function hashPassword(password, saltHex) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: unhex(saltHex), iterations: 100000 }, key, 256);
  return hex(bits);
}
async function sha256(text) {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode(text)));
}
function cookieValue(request, name) {
  const m = (request.headers.get("cookie") || "").match(new RegExp("(?:^|; )" + name + "=([^;]+)"));
  return m ? m[1] : "";
}
function sessionCookie(token, maxAge) {
  return "zs=" + token + "; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=" + maxAge;
}
async function currentUser(request, env) {
  if (!env.DB) return null;
  const token = cookieValue(request, "zs");
  if (!token) return null;
  const row = await env.DB.prepare(
    "SELECT u.id, u.email, u.first, u.last FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?"
  ).bind(await sha256(token), Date.now()).first();
  return row || null;
}
async function startSession(env, userId) {
  const raw = crypto.getRandomValues(new Uint8Array(32));
  const token = hex(raw);
  const maxAge = 60 * 60 * 24 * 30;
  await env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(await sha256(token), userId, Date.now() + maxAge * 1000).run();
  return sessionCookie(token, maxAge);
}
const needDb = (env) => (env.DB ? null : json({ error: "Accounts are being set up. Please check back soon." }, 503));
const clean = (v, n) => String(v || "").trim().slice(0, n);
const emailOk = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

async function signup(request, env) {
  const off = needDb(env); if (off) return off;
  let b; try { b = await request.json(); } catch (e) { return json({ error: "The form could not be read." }, 400); }
  const email = clean(b.email, 160).toLowerCase();
  const first = clean(b.first, 60), last = clean(b.last, 60);
  const password = String(b.password || "");
  const bday = parseInt(b.birth_day, 10) || null, bmonth = parseInt(b.birth_month, 10) || null;
  if (!first || !last || !emailOk(email) || password.length < 8 || password.length > 200) {
    return json({ error: "Please add your name, a valid email, and a password of at least 8 characters." }, 400);
  }
  const exists = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (exists) return json({ error: "An account with that email already exists. Try signing in." }, 409);
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await hashPassword(password, salt);
  const res = await env.DB.prepare("INSERT INTO users (email, first, last, salt, pass_hash, birth_day, birth_month, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(email, first, last, salt, hash, bday, bmonth, new Date().toISOString()).run();
  const id = res.meta.last_row_id;
  const cookie = await startSession(env, id);
  return json({ ok: true }, 200, { "set-cookie": cookie });
}

async function login(request, env) {
  const off = needDb(env); if (off) return off;
  let b; try { b = await request.json(); } catch (e) { return json({ error: "The form could not be read." }, 400); }
  const email = clean(b.email, 160).toLowerCase();
  const u = await env.DB.prepare("SELECT id, salt, pass_hash FROM users WHERE email = ?").bind(email).first();
  const bad = json({ error: "The email or password is incorrect. Try again or reset your password." }, 401);
  if (!u) return bad;
  const hash = await hashPassword(String(b.password || ""), u.salt);
  if (hash !== u.pass_hash) return bad;
  return json({ ok: true }, 200, { "set-cookie": await startSession(env, u.id) });
}

async function logout(request, env) {
  if (env.DB) {
    const token = cookieValue(request, "zs");
    if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  }
  return json({ ok: true }, 200, { "set-cookie": sessionCookie("", 0) });
}

function cardView(app, env) {
  if (!app || app.status !== "approved") return null;
  const d = new Date(app.decided_at);
  const mo = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
  const years = parseInt(env.CARD_VALID_YEARS, 10) || 5;
  return { id: app.card_id, name: app.name, issued: mo[d.getUTCMonth()] + " " + d.getUTCFullYear(), status: "ZI RESIDENT", validity: mo[d.getUTCMonth()].slice(0, 3) + " " + (d.getUTCFullYear() + years), title: app.title || "" };
}

async function me(request, env) {
  const off = needDb(env); if (off) return off;
  const user = await currentUser(request, env);
  if (!user) return json({ user: null }, 200, { "cache-control": "no-store" });
  const app = await env.DB.prepare("SELECT status, name, submitted_at, decided_at, card_id, title FROM applications WHERE user_id = ?").bind(user.id).first();
  // A card is released on its release date, which is set when the application arrives.
  const released = !!(app && app.status === "approved" && app.decided_at && new Date(app.decided_at) <= new Date());
  return json({
    user: { first: user.first, last: user.last, email: user.email },
    open: env.APPLICATIONS_OPEN !== "false",
    application: app ? { status: released ? app.status : (app.status === "approved" ? "pending" : app.status), name: app.name, submitted_at: app.submitted_at } : null,
    card: released ? cardView(app, env) : null
  }, 200, { "cache-control": "no-store" });
}

async function apply(request, env) {
  const off = needDb(env); if (off) return off;
  if (!env.PHOTOS) return json({ error: "Applications are being set up. Please check back soon." }, 503);
  if (env.APPLICATIONS_OPEN === "false") return json({ error: "Applications are paused right now." }, 403);
  const user = await currentUser(request, env);
  if (!user) return json({ error: "Please sign in first." }, 401);
  let form; try { form = await request.formData(); } catch (e) { return json({ error: "The application could not be read." }, 400); }
  const file = form.get("photo");
  const name = clean(form.get("name"), 80) || (user.first + " " + user.last);
  if (!file || typeof file === "string" || file.size < 1000 || file.size > 3 * 1024 * 1024) {
    return json({ error: "Please upload a portrait photo under 3 MB." }, 400);
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return json({ error: "Please upload a JPG, PNG, or WebP photo." }, 400);
  }
  const existing = await env.DB.prepare("SELECT status FROM applications WHERE user_id = ?").bind(user.id).first();
  if (existing && existing.status === "approved") return json({ error: "Your Zi Residency application is already approved." }, 409);
  const key = "photos/" + user.id;
  await env.PHOTOS.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
  const now = new Date().toISOString();
  if (existing) {
    await env.DB.prepare("UPDATE applications SET status = 'pending', name = ?, photo_key = ?, submitted_at = ?, decided_at = NULL WHERE user_id = ?")
      .bind(name.toUpperCase(), key, now, user.id).run();
  } else {
    await env.DB.prepare("INSERT INTO applications (user_id, status, name, photo_key, submitted_at) VALUES (?, 'pending', ?, ?, ?)")
      .bind(user.id, name.toUpperCase(), key, now).run();
  }
  if (env.AUTO_APPROVE !== "false") {
    const row = await env.DB.prepare("SELECT id FROM applications WHERE user_id = ?").bind(user.id).first();
    const hours = env.CARD_DELAY_HOURS !== undefined && env.CARD_DELAY_HOURS !== "" ? parseFloat(env.CARD_DELAY_HOURS) : 48;
    await approveApplication(env, row.id, new Date(Date.now() + (isNaN(hours) ? 48 : hours) * 3600 * 1000));
  }
  return json({ ok: true });
}

// Member's own portrait, used when drawing the approved card.
async function ownPhoto(request, env) {
  const user = await currentUser(request, env);
  if (!user || !env.PHOTOS) return new Response("Not found", { status: 404 });
  const obj = await env.PHOTOS.get("photos/" + user.id);
  if (!obj) return new Response("Not found", { status: 404 });
  return new Response(obj.body, { headers: { "content-type": obj.httpMetadata?.contentType || "image/jpeg", "cache-control": "private, max-age=300" } });
}

// ---------- Admin (the Ministry of Republic Administration) ----------
function isAdmin(request, env) {
  const key = request.headers.get("x-admin-key") || "";
  return !!env.ADMIN_KEY && key.length > 0 && key === env.ADMIN_KEY;
}
const base36 = (n) => n.toString(36).toUpperCase().padStart(6, "0");

async function adminList(request, env) {
  if (!isAdmin(request, env)) return json({ error: "Not authorized." }, 401);
  const status = new URL(request.url).searchParams.get("status") || "pending";
  const rows = await env.DB.prepare(
    "SELECT a.id, a.status, a.name, a.submitted_at, a.decided_at, a.card_id, u.email, u.first, u.last FROM applications a JOIN users u ON u.id = a.user_id WHERE a.status = ? ORDER BY a.submitted_at ASC LIMIT 200"
  ).bind(status).all();
  return json({ applications: rows.results || [] }, 200, { "cache-control": "no-store" });
}
async function adminPhoto(request, env) {
  if (!isAdmin(request, env)) return new Response("Not authorized", { status: 401 });
  const id = parseInt(new URL(request.url).searchParams.get("id"), 10);
  const row = await env.DB.prepare("SELECT photo_key FROM applications WHERE id = ?").bind(id).first();
  if (!row) return new Response("Not found", { status: 404 });
  const obj = await env.PHOTOS.get(row.photo_key);
  if (!obj) return new Response("Not found", { status: 404 });
  return new Response(obj.body, { headers: { "content-type": obj.httpMetadata?.contentType || "image/jpeg", "cache-control": "no-store" } });
}
async function adminDecide(request, env) {
  if (!isAdmin(request, env)) return json({ error: "Not authorized." }, 401);
  let b; try { b = await request.json(); } catch (e) { return json({ error: "Bad request." }, 400); }
  const id = parseInt(b.id, 10);
  const app = await env.DB.prepare("SELECT id, status FROM applications WHERE id = ?").bind(id).first();
  if (!app) return json({ error: "Application not found." }, 404);
  const now = new Date();
  if (b.decision === "decline") {
    await env.DB.prepare("UPDATE applications SET status = 'declined', decided_at = ? WHERE id = ?").bind(now.toISOString(), id).run();
    return json({ ok: true });
  }
  if (b.decision !== "approve") return json({ error: "Unknown decision." }, 400);
  if (app.status === "approved") return json({ ok: true });
  const r = await approveApplication(env, id);
  return r ? json({ ok: true, card_id: r }) : json({ error: "Could not assign a card number. Please try again." }, 500);
}

// Card titles are government and community offices, so a Zi Card reads like a real post in the Republic.
const OFFICES_OF = ["Minister", "Ambassador", "Counsellor", "Commissioner", "Secretary", "Envoy", "Governor", "Chancellor", "Deputy Minister", "Under-Secretary"];
const OFFICE_DOMAINS = ["Style", "Colour", "Fit", "Mood", "Light", "Trade", "Culture", "Rhythm", "Texture", "Craft"];
const OFFICES_ALONE = ["Vice President", "Chief of Staff", "Senator", "Speaker", "Magistrate", "Treasurer", "Attorney General", "Consul", "Counsellor", "Chief Justice", "Mayor", "Registrar", "Chief Whip", "Prime Minister", "Ombudsman"];
function pickTitle() {
  const r = crypto.getRandomValues(new Uint32Array(3));
  if (r[0] % 100 < 40) return OFFICES_ALONE[r[1] % OFFICES_ALONE.length];
  return OFFICES_OF[r[1] % OFFICES_OF.length] + " of " + OFFICE_DOMAINS[r[2] % OFFICE_DOMAINS.length];
}

async function approveApplication(env, id, when) {
  const row = await env.DB.prepare("SELECT u.email FROM applications a JOIN users u ON u.id = a.user_id WHERE a.id = ?").bind(id).first();
  const founder = env.FOUNDER_EMAIL && row && row.email === String(env.FOUNDER_EMAIL).trim().toLowerCase();
  const title = founder ? "Zi-in-Chief" : pickTitle();
  const now = when || new Date();
  for (let attempt = 0; attempt < 5; attempt++) {
    const last = await env.DB.prepare("SELECT COALESCE(MAX(card_seq), 0) AS m FROM applications").first();
    const seq = last.m + 1;
    const cardId = "ZI" + String(now.getUTCFullYear()).slice(-2) + String(now.getUTCMonth() + 1).padStart(2, "0") + base36(seq);
    try {
      await env.DB.prepare("UPDATE applications SET status = 'approved', decided_at = ?, card_seq = ?, card_id = ?, title = ? WHERE id = ?")
        .bind(now.toISOString(), seq, cardId, title, id).run();
      return cardId;
    } catch (e) { /* number taken by a simultaneous approval, try the next one */ }
  }
  return null;
}

async function adminReset(request, env) {
  if (!isAdmin(request, env)) return json({ error: "Not authorized." }, 401);
  let b; try { b = await request.json(); } catch (e) { return json({ error: "Bad request." }, 400); }
  const email = clean(b.email, 160).toLowerCase();
  const password = String(b.password || "");
  if (password.length < 8 || password.length > 200) return json({ error: "The new password needs 8 characters or more." }, 400);
  const u = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (!u) return json({ error: "No account uses that email." }, 404);
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  await env.DB.prepare("UPDATE users SET salt = ?, pass_hash = ? WHERE id = ?").bind(salt, await hashPassword(password, salt), u.id).run();
  await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(u.id).run();
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
    if (url.pathname === "/api/auth/signup" && request.method === "POST") return signup(request, env);
    if (url.pathname === "/api/auth/login" && request.method === "POST") return login(request, env);
    if (url.pathname === "/api/auth/logout" && request.method === "POST") return logout(request, env);
    if (url.pathname === "/api/me" && request.method === "GET") return me(request, env);
    if (url.pathname === "/api/auth/forgot" && request.method === "POST") return forgotPassword(request, env);
    if (url.pathname === "/api/auth/reset" && request.method === "POST") return resetPassword(request, env);
    if (url.pathname === "/api/account" && request.method === "GET") return account(request, env);
    if (url.pathname === "/api/profile" && request.method === "POST") return saveProfile(request, env);
    if (url.pathname === "/api/avatar" && request.method === "POST") return avatarPost(request, env);
    if (url.pathname === "/api/avatar" && request.method === "GET") return avatarGet(request, env);
    if (url.pathname === "/api/address" && request.method === "POST") return addressPost(request, env);
    if (url.pathname === "/api/saved" && request.method === "POST") return savedPost(request, env);
    if (url.pathname === "/api/password" && request.method === "POST") return passwordPost(request, env);
    if (url.pathname === "/api/account/delete" && request.method === "POST") return deleteAccount(request, env);
    if (url.pathname === "/api/orders/confirm" && request.method === "POST") return confirmOrder(request, env);
    if (url.pathname === "/api/apply" && request.method === "POST") return apply(request, env);
    if (url.pathname === "/api/photo" && request.method === "GET") return ownPhoto(request, env);
    if (url.pathname === "/api/admin/applications" && request.method === "GET") return adminList(request, env);
    if (url.pathname === "/api/admin/photo" && request.method === "GET") return adminPhoto(request, env);
    if (url.pathname === "/api/admin/reset" && request.method === "POST") return adminReset(request, env);
    if (url.pathname === "/api/admin/decide" && request.method === "POST") return adminDecide(request, env);
    if (url.pathname === "/api/subscribe" && request.method === "POST") return subscribe(request, env);
    if (url.pathname === "/api/waitlist" && request.method === "POST") {
      return waitlist(request, env);
    }
    const res = await env.ASSETS.fetch(request);
    // Pages and data refresh on every visit. Versioned assets keep for a year because their address changes with each build.
    const headers = new Headers(res.headers);
    const versioned = url.pathname.startsWith("/assets/") && url.searchParams.has("v");
    const stable = /\.(jpg|jpeg|png|webp|mp4|webm|woff2?)$/i.test(url.pathname);
    headers.set("cache-control", versioned ? "public, max-age=31536000, immutable" : stable ? "public, max-age=3600, must-revalidate" : "no-cache");
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  }
};
