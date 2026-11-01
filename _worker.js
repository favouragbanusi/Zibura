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
  if (!first || !last || !emailOk(email) || password.length < 8 || password.length > 200) {
    return json({ error: "Please add your name, a valid email, and a password of at least 8 characters." }, 400);
  }
  const exists = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (exists) return json({ error: "An account with that email already exists. Try signing in." }, 409);
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await hashPassword(password, salt);
  const res = await env.DB.prepare("INSERT INTO users (email, first, last, salt, pass_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(email, first, last, salt, hash, new Date().toISOString()).run();
  const id = res.meta.last_row_id;
  const cookie = await startSession(env, id);
  return json({ ok: true }, 200, { "set-cookie": cookie });
}

async function login(request, env) {
  const off = needDb(env); if (off) return off;
  let b; try { b = await request.json(); } catch (e) { return json({ error: "The form could not be read." }, 400); }
  const email = clean(b.email, 160).toLowerCase();
  const u = await env.DB.prepare("SELECT id, salt, pass_hash FROM users WHERE email = ?").bind(email).first();
  const bad = json({ error: "That email and password do not match." }, 401);
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
  return json({
    user: { first: user.first, last: user.last, email: user.email },
    open: env.APPLICATIONS_OPEN !== "false",
    application: app ? { status: app.status, name: app.name, submitted_at: app.submitted_at } : null,
    card: cardView(app, env)
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
  if (existing && existing.status === "approved") return json({ error: "Your card has already been issued." }, 409);
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
    await approveApplication(env, row.id);
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

// ---------- Admin (the Ministry of Zi Interior) ----------
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

const SCRIPT_LINES = ["Zi Wanderer", "Zi Dreamer", "Zi Trailblazer", "Zi Daydreamer", "Zi Muse", "Zi Maverick", "Zi Storyteller", "Zi Explorer", "Zi Stylist", "Zi Visionary", "Zi Free Spirit", "Zi Rhythm", "Zi Spark", "Zi Dazzler", "Zi Voyager", "Zi Tastemaker", "Zi Glow Getter", "Zi Moonwalker", "Zi Firefly", "Zi Original"];

async function approveApplication(env, id) {
  const row = await env.DB.prepare("SELECT u.email FROM applications a JOIN users u ON u.id = a.user_id WHERE a.id = ?").bind(id).first();
  const founder = env.FOUNDER_EMAIL && row && row.email === String(env.FOUNDER_EMAIL).trim().toLowerCase();
  const title = founder ? "Zi-in-Chief" : SCRIPT_LINES[crypto.getRandomValues(new Uint32Array(1))[0] % SCRIPT_LINES.length];
  const now = new Date();
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
    if (url.pathname === "/api/apply" && request.method === "POST") return apply(request, env);
    if (url.pathname === "/api/photo" && request.method === "GET") return ownPhoto(request, env);
    if (url.pathname === "/api/admin/applications" && request.method === "GET") return adminList(request, env);
    if (url.pathname === "/api/admin/photo" && request.method === "GET") return adminPhoto(request, env);
    if (url.pathname === "/api/admin/reset" && request.method === "POST") return adminReset(request, env);
    if (url.pathname === "/api/admin/decide" && request.method === "POST") return adminDecide(request, env);
    if (url.pathname === "/api/waitlist" && request.method === "POST") {
      return waitlist(request, env);
    }
    return env.ASSETS.fetch(request);
  }
};
