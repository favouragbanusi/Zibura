// Builds the Zibura storefront into the dist folder.
// Run with: node build.js
const fs = require("fs");
const path = require("path");

const root = __dirname;
const dist = path.join(root, "dist");

// Finds a file in the project, whether it sits in the main folder or in a subfolder.
function find(...candidates) {
  for (const rel of candidates) {
    const file = path.join(root, rel);
    if (fs.existsSync(file)) return file;
  }
  throw new Error("Missing file. Looked for: " + candidates.join(", "));
}

// Content from the Google Sheet (written by sheet.js) wins over the files in this project.
try { require("child_process").execFileSync(process.execPath, [path.join(__dirname, "sheet.js")], { stdio: "inherit" }); } catch (e) { console.log("sheet.js did not run:", e.message); }
const fromSheet = (name) => { const f = path.join(__dirname, "content", name); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null; };
const COPY = fromSheet("copy.json") || {};
const LINKS = fromSheet("links.json") || {};
const REG = [];
const reg = (key, text) => { if (!REG.some((r) => r.key === key)) REG.push({ key, text }); };
const T = (key, fallback) => { reg(key, fallback); return COPY[key] ? esc(COPY[key]) : fallback; };
const TR = (key, raw) => { reg(key, raw); return COPY[key] ? COPY[key] : raw; };
const products = fromSheet("pieces.json") || JSON.parse(fs.readFileSync(find("products.json", "data/products.json"), "utf8"));
// Currencies without a price column use an indicative rate from the USD price. Set exact prices in the sheet with price_EUR, price_AUD, price_AED and price_ZAR.
const EXTRA_RATES = { EUR: 0.63, AUD: 1.02, AED: 2.59, ZAR: 11.63 }; // per 1 CAD, only used when the sheet has no price
products.forEach((p) => { Object.keys(EXTRA_RATES).forEach((c) => { if (!(p.prices[c] > 0)) p.prices[c] = Math.round(p.prices.CAD * EXTRA_RATES[c]); }); });

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function seoHead(rel, html) {
  if (!/\.html$/.test(rel) || !html.includes("<head>")) return html;
  let url = "/" + rel.replace(/index\.html$/, "").replace(/\.html$/, "");
  if (rel === "404.html") url = "/404";
  const priv = /^(admin|reset|thanks|join)\//.test(rel) || rel === "404.html";
  const t = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || "Zibura";
  const d = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || "";
  let add = "";
  if (!priv && !html.includes('rel="canonical"')) add += `<link rel="canonical" href="https://zibura.com${url}">\n`;
  if (!html.includes("og:title")) add += `<meta property="og:title" content="${t}">\n<meta property="og:description" content="${d}">\n`;
  if (!html.includes("og:image")) add += `<meta property="og:type" content="website">\n<meta property="og:site_name" content="Zibura">\n<meta property="og:url" content="https://zibura.com${url}">\n<meta property="og:image" content="https://zibura.com/assets/share.png">\n<meta name="twitter:card" content="summary_large_image">\n`;
  const IG = (typeof LINKS !== "undefined" && LINKS.instagram) || "https://www.instagram.com/thezibura/";
  const TT = (typeof LINKS !== "undefined" && LINKS.tiktok) || "https://www.tiktok.com/@thezibura";
  const ld = [];
  if (rel === "index.html") {
    ld.push({ "@context": "https://schema.org", "@type": "Organization", name: "Zibura", url: "https://zibura.com/", logo: "https://zibura.com/assets/share.png", email: "hello@zibura.com", sameAs: [IG, TT] });
    ld.push({ "@context": "https://schema.org", "@type": "WebSite", name: "Zibura", url: "https://zibura.com/" });
  }
  const pm = rel.match(/^product\/([^/]+)\/index\.html$/);
  if (pm && typeof products !== "undefined") {
    const p = products.find((x) => x.slug === pm[1]);
    if (p) ld.push({ "@context": "https://schema.org", "@type": "Product", name: p.name, description: p.description, brand: { "@type": "Brand", name: "Zibura" }, offers: { "@type": "Offer", url: "https://zibura.com" + url, priceCurrency: "CAD", price: String(p.prices.CAD), availability: p.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" } });
  }
  ld.forEach((o) => { add += `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>\n`; });
  if (priv && !html.includes("noindex")) add += `<meta name="robots" content="noindex,nofollow">\n`;
  return html.replace("<head>", "<head>\n" + add);
}
function write(rel, content) {
  if (typeof content === "string") content = seoHead(rel, content);
  // The Archive shows full-screen images and capsule tiles that open on a tap, so they load up front.
  if (rel === "explore/index.html" && typeof content === "string") content = content.replace(/ loading="lazy"/g, ' decoding="async"');
  const file = path.join(dist, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

// A new value on every build, so browsers and Cloudflare fetch fresh CSS and JS after each deploy.
const BUILD_V = Date.now().toString(36);
const TAX = JSON.parse(fs.readFileSync(find("taxonomy.json"), "utf8"));
const COLORS = JSON.parse(fs.readFileSync(find("colors.json"), "utf8"));
const AUDIENCES = ["Women", "Men"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthOptions = `<option value="">${T("forms.month", "Month")}</option>${MONTHS.map((m, i) => `<option value="${i + 1}">${m}</option>`).join("")}`;
const dayOptions = `<option value="">${T("forms.day", "Day")}</option>${Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("")}`;
const categories = TAX.map((c) => c.name);
const countIn = (fn) => products.filter(fn).length;

// Images and films drop in by file name. Add a file such as signal-1-cover.jpg or arc-1-film.mp4 next to build.js and it appears on the page.
// Real files next to build.js win. The placeholders folder fills any gap until the real image arrives.
function findImage(name) {
  for (const dir of [path.join(__dirname, "content", "images"), root, path.join(root, "placeholders")]) {
    for (const ext of ["jpg", "jpeg", "png", "webp"]) {
      const file = path.join(dir, `${name}.${ext}`);
      if (fs.existsSync(file)) return { file, ext };
    }
  }
  return null;
}
function media(name, alt) {
  const hit = findImage(name);
  if (hit) {
    write(`assets/media/${name}.${hit.ext}`, fs.readFileSync(hit.file));
    return `<img src="/assets/media/${name}.${hit.ext}" alt="${esc(alt)}" loading="lazy">`;
  }
  if (process.env.LIST_SLOTS) console.log("SLOT image", name, "|", alt);
  return `<div class="ph-empty" role="img" aria-label="${esc(alt)}"></div>`;
}
// Returns an <img> for a product photo if the file exists, or an empty string.
function photo(name, alt) {
  const hit = findImage(name);
  if (hit) {
    write(`assets/media/${name}.${hit.ext}`, fs.readFileSync(hit.file));
    return `<img src="/assets/media/${name}.${hit.ext}" alt="${esc(alt)}" loading="lazy">`;
  }
  return "";
}
function film(name, caption) {
  for (const ext of ["mp4", "webm"]) {
    const file = path.join(root, `${name}.${ext}`);
    if (fs.existsSync(file)) {
      write(`assets/media/${name}.${ext}`, fs.readFileSync(file));
      return `<figure class="film"><video controls playsinline preload="metadata" src="/assets/media/${name}.${ext}"></video><figcaption>${esc(caption)}</figcaption></figure>`;
    }
  }
  const poster = findImage(name + "-poster");
  if (poster) {
    write(`assets/media/${name}-poster.${poster.ext}`, fs.readFileSync(poster.file));
    return `<figure class="film"><div class="video-slot has-poster" role="img" aria-label="${esc(caption)}"><img src="/assets/media/${name}-poster.${poster.ext}" alt="" loading="lazy"><span class="film-tag">${T("forms.film-soon", "Film coming soon")}</span></div><figcaption>${esc(caption)}</figcaption></figure>`;
  }
  if (process.env.LIST_SLOTS) console.log("SLOT film", name, "|", caption);
  return `<figure class="film"><div class="video-slot" role="img" aria-label="${esc(caption)}"><span class="play"></span></div><figcaption>${esc(caption)}</figcaption></figure>`;
}

// Splits a headline into words so each word can rise into place.
function words(text) {
  return text
    .split(" ")
    .map((w, i) => `<span class="w"><span style="--i:${i}">${esc(w)}</span></span>`)
    .join(" ");
}

const COUNTRIES = ["Canada", "United States", "United Kingdom", "Nigeria", "Qatar", "Ghana", "Kenya", "South Africa", "Australia", "Germany", "France", "United Arab Emirates", "Other"];

function waitlistForm(id) {
  return `<form class="waitlist-form" novalidate>
      <div class="wl-prog" aria-hidden="true"><span class="wl-count">Step 1 of 3</span><div class="wl-track"><i></i></div></div>
      <div class="wl-step on" data-step="1">
        <div class="form-grid">
          <div><label for="${id}-first">${T("forms.first-name", "First name")}</label><input id="${id}-first" name="first" autocomplete="given-name" required></div>
          <div><label for="${id}-last">${T("forms.last-name", "Last name")}</label><input id="${id}-last" name="last" autocomplete="family-name" required></div>
          <div class="full"><label for="${id}-email">${T("forms.email", "Email")}</label><input id="${id}-email" name="email" type="email" autocomplete="email" required></div>
        </div>
      </div>
      <div class="wl-step" data-step="2">
        <div class="form-grid">
          <div><label for="${id}-country">${T("forms.country-of-origin", "Country of origin")}</label>
            <select id="${id}-country" name="country" autocomplete="country-name" required><option value="">${T("forms.choose", "Choose")}</option>${COUNTRIES.map((c) => `<option>${c}</option>`).join("")}</select></div>
          <div><label for="${id}-city">${T("forms.city-of-residence", "City of residence")}</label><input id="${id}-city" name="city" autocomplete="address-level2" required></div>
          <div><label for="${id}-bm">${T("forms.birthday-month", "Birthday month")} <span class="opt-tag">${T("forms.optional", "optional")}</span></label><select id="${id}-bm" name="birth_month">${monthOptions}</select></div>
          <div><label for="${id}-bd">${T("forms.birthday-day", "Birthday day")} <span class="opt-tag">${T("forms.optional", "optional")}</span></label><select id="${id}-bd" name="birth_day">${dayOptions}</select></div>
        </div>
      </div>
      <div class="wl-step" data-step="3">
        <div class="form-grid">
          <div class="full"><label for="${id}-phone">${T("forms.phone", "Phone")} <span class="opt-tag">${T("forms.optional", "optional")}</span></label><input id="${id}-phone" name="phone" type="tel" autocomplete="tel"></div>
          <div class="full checks">
            <label class="check"><input type="checkbox" name="email_consent" required><span>${T("forms.email-consent", "Send me the Zi Memo and news from Zibura and Zi Republic by email. I can unsubscribe at any time.")}</span></label>
            <label class="check"><input type="checkbox" name="sms_consent"><span>${T("forms.sms-consent", "Text me the capsule collection announcements. Message and data rates may apply. Reply STOP to opt out.")}</span></label>
          </div>
        </div>
      </div>
      <input type="hidden" name="leaning">
      <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <div class="wl-nav">
        <button class="btn line wl-back" type="button" hidden>${T("forms.back", "Back")}</button>
        <button class="btn wl-next" type="button">${T("forms.next", "Next")}</button>
        <button class="btn wl-submit" type="submit">${T("forms.join-the-waitlist", "Join the waitlist")}</button>
      </div>
      <div class="msg wl-msg" role="status"></div>
    </form>`;
}

function subscribeForm(id) {
  return `<form class="subscribe-form" novalidate>
      <div class="form-grid">
        <div class="full"><label for="${id}-first">${T("forms.name", "Name")}</label><input id="${id}-first" name="first" autocomplete="given-name" required></div>
        <div class="full"><label for="${id}-email">${T("forms.email", "Email")}</label><input id="${id}-email" name="email" type="email" autocomplete="email" required></div>
        <div class="full checks"><label class="check"><input type="checkbox" name="email_consent" required><span>${T("forms.email-consent", "Send me the Zi Memo and news from Zibura and Zi Republic by email. I can unsubscribe at any time.")}</span></label></div>
        <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      </div>
      <p class="form-legal">${T("policy.agree-prefix", "By continuing you agree to the")} <a href="/terms/">${T("policy.terms-link", "Terms")}</a> ${T("policy.and", "and")} <a href="/privacy/">${T("policy.privacy-link", "Privacy")}</a>.</p>
      <button class="btn" type="submit">${T("forms.subscribe", "Subscribe")}</button>
      <div class="msg sub-msg" role="status"></div>
    </form>`;
}

function arrivalCard(id) {
  return `<div class="arrival">
    <header class="arr-band">
      <p class="arr-republic">${T("forms.zi-republic", "Zi Republic")}</p>
      <p class="arr-kicker">${T("forms.ministry-of-communications", "Ministry of Communications")}</p>
      <h2 class="arr-title">${T("forms.join-the-waitlist", "Join the waitlist")}</h2>
      <p class="arr-sub">${T("forms.collection-launch", "The capsule collection is launching soon")}</p>
    </header>
    <div class="arr-body">
    ${waitlistForm(id)}
    <p class="form-legal">${T("policy.agree-prefix", "By continuing you agree to the")} <a href="/terms/">${T("policy.terms-link", "Terms")}</a> ${T("policy.and", "and")} <a href="/privacy/">${T("policy.privacy-link", "Privacy")}</a>.</p>
    </div>
  </div>`;
}

const MODAL = `<dialog id="wl-modal" class="memo" aria-labelledby="wl-title">
  <button class="close" type="button" aria-label="Close" data-close-waitlist>&times;</button>
  <div class="memo-art" aria-hidden="false">
    <span class="ring r1"></span><span class="ring r2"></span><span class="ring r3"></span>
    <img class="memo-seal" src="/assets/zi-card-seal.png" alt="" width="152" height="150">
    <div class="memo-head">
      <p class="memo-tag">${T("forms.memo-tag", "Official memo")}</p>
      <h2 class="display" id="wl-title">${T("forms.newsletter-title", "Get the Zi Memo.")}</h2>
    </div>
  </div>
  <div class="memo-body">
    ${subscribeForm("m")}
  </div>
</dialog>`;

function zcard() {
  return `<canvas class="zc" data-sample width="2022" height="1274" role="img" aria-label="Sample Zi Card"></canvas>`;
}

// A card that tilts with the pointer and turns over on click.
function flipCard() {
  return `<div class="flip" tabindex="0" role="button" aria-label="Turn the Zi Card over" data-flip>
  <div class="inner">
    <div class="face front">${zcard()}</div>
    <div class="face back"><img src="/assets/zi-card-back.png" alt="" width="1011" height="637"></div>
  </div>
  <span class="hint">${T("forms.turn-card-over", "Click to turn it over")}</span>
</div>`;
}

const MEGA = `<div class="mega" id="mega">
  <div class="mega-grid">
    <div class="mega-col">
      <a class="mega-h" href="/shop/">${T("forms.all-products", "All products")}</a>
      <a href="/looks/">${T("looks.switch-looks", "Zi Looks")}</a>
      ${AUDIENCES.map((a) => `<a href="/shop/?audience=${a}">${a}</a>`).join("")}
    </div>
${TAX.map(
  (c) => `    <div class="mega-col">
      <a class="mega-h" href="/shop/?category=${encodeURIComponent(c.name)}">${esc(c.name)}</a>
${c.types.map((t) => `      <a href="/shop/?category=${encodeURIComponent(c.name)}&amp;type=${encodeURIComponent(t.name)}">${esc(t.name)}</a>`).join("\n")}
    </div>`
).join("\n")}
  </div>
</div>`;

const SOCIAL = `<a class="soc" href="${LINKS.instagram || "https://www.instagram.com/thezibura/"}" target="_blank" rel="noopener" aria-label="Zibura on Instagram"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r=".6" fill="currentColor"/></svg><span>${T("forms.instagram", "Instagram")}</span></a><a class="soc" href="${LINKS.tiktok || "https://www.tiktok.com/@thezibura"}" target="_blank" rel="noopener" aria-label="Zibura on TikTok"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3v11.2a3.7 3.7 0 11-3.7-3.7"/><path d="M14 3c.4 2.6 2 4.2 5 4.4"/></svg><span>${T("forms.tiktok", "TikTok")}</span></a>`;

function layout({ title, description, page, body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#ffffff">
<link rel="icon" href="/assets/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300..700&family=Public+Sans:wght@400;500;600&family=Lexend:wght@400;500;600&family=Lexend+Zetta:wght@700&family=Yellowtail&family=Mrs+Saint+Delafield&display=swap">
<link rel="stylesheet" href="/assets/styles.css?v=${BUILD_V}">
<script>document.documentElement.className = "js";</script>
</head>
<body data-page="${page}">
<div class="notice">${T("notice_text", "Official notice: The capsule collection is launching soon.")} <a href="/waitlist/">${T("notice_link", "Join the waitlist")}</a></div>
<header class="site-header" id="top">
  <div class="wrap">
    <button type="button" class="burger" id="burger" data-tip="Menu" aria-label="Open menu" aria-expanded="false" aria-controls="drawer"><span></span><span></span><span></span></button>
    <nav class="nav" aria-label="Main">
      <div class="has-mega"><a href="/shop/">${T("site.shop", "Shop")}</a>${MEGA}</div>
      <a href="/explore/">${T("site.collections", "Zi Archive")}</a>
      <a href="/brand/">${T("site.zi-republic", "Zi Republic")}</a>
      <a href="/note/">${T("site.from-the-zi-in-chief", "From the Zi-in-Chief")}</a>
    </nav>
    <a class="brand" href="/" aria-label="Zibura home"><img src="/assets/logo-wordmark-navy.png" alt="Zibura" width="636" height="120"></a>
    <nav class="nav right" aria-label="Account and cart">
      <label class="icon-btn cur" data-tip="Currency"><span class="sr">${T("site.currency", "Currency")}</span><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9S14.5 18.3 12 21c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/></svg><span class="cur-code" id="cur-code">USD</span>
        <select id="currency" aria-label="Currency">
          <option value="CAD">CAD</option>
          <option value="USD">USD</option>
          <option value="GBP">GBP</option>
          <option value="EUR">EUR</option>
          <option value="AUD">AUD</option>
          <option value="AED">AED</option>
          <option value="ZAR">ZAR</option>
          <option value="NGN">NGN</option>
        </select></label>
      <a class="icon-btn" href="/account/" id="acct-link" aria-label="Sign in" data-tip="Sign in"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.2-4 4.2-6 8-6s6.8 2 8 6"/></svg></a>
      <a class="icon-btn" href="/cart/" id="cart-link" aria-label="Cart" data-tip="Cart"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6.5a3 3 0 016 0V8"/></svg><span class="cart-badge" id="cart-count">0</span></a>
      <a class="btn nav-cta" href="/zi-card/">${T("site.apply-for-zi-residency", "Apply for Zi Residency")}</a>
    </nav>
  </div>
</header>
<div class="drawer" id="drawer" aria-hidden="true">
  <div class="drawer-in">
    <a class="d-link big" href="/shop/">${T("site.shop", "Shop")}</a>
    <div class="d-sub">${TAX.map((c) => `<a href="/shop/?category=${encodeURIComponent(c.name)}">${esc(c.name)}</a>`).join("")}</div>
    <a class="d-link big" href="/explore/">${T("site.collections", "Zi Archive")}</a>
    <a class="d-link big" href="/brand/">${T("site.zi-republic", "Zi Republic")}</a>
    <a class="d-link big" href="/note/">${T("site.from-the-zi-in-chief", "From the Zi-in-Chief")}</a>
    <a class="d-link" href="/account/" id="acct-link-m">${T("site.my-account", "My account")}</a>
    <a class="d-link" href="/cart/">${T("site.cart", "Cart")}</a>
    <div class="d-cur" role="group" aria-label="Currency">${["CAD", "USD", "GBP", "EUR", "AUD", "AED", "ZAR", "NGN"].map((c) => `<button type="button" data-cur="${c}">${c}</button>`).join("")}</div>
    <div class="socs d-socs">${SOCIAL}</div>
    <a class="btn wide" href="/zi-card/">${T("site.apply-for-zi-residency", "Apply for Zi Residency")}</a>
  </div>
</div>
${body}
<footer class="site-footer">
  <div class="wrap">
    <div class="f-hero">
      <p class="f-big">${T("site.your-expression", "Your expression,")}<br>${T("site.your-world", "your world.")}</p>
      <div class="f-cta"><p>${T("footer_cta", "Join the waitlist to hear when the capsule collection launches.")}</p><div class="cta-pair"><a class="btn light" href="/waitlist/">${T("site.join-the-waitlist", "Join the waitlist")}</a><a class="btn ghost-light" href="/waitlist/" data-open-waitlist>${T("site.get-the-zi-memo", "Get the Zi Memo")}</a></div></div>
    </div>
    <div class="top">
      <div class="f-brand">
        <img class="word" src="/assets/logo-wordmark-sky.png" alt="Zibura" width="636" height="120">
        <p class="s">${T("footer_about", "Zibura is a lifestyle brand built around personal expression. Zi Republic is its country, and anyone may apply to join.")}</p>
      </div>
      <div>
        <h2 class="foot-h">${T("site.shop-heading", "Shop")}</h2>
        <a href="/shop/">${T("site.all-products", "All products")}</a>
${AUDIENCES.map((a) => `        <a href="/shop/?audience=${a}">${a}</a>`).join("\n")}
        <a href="/looks/">${T("looks.switch-looks", "Zi Looks")}</a>
        <a href="/cart/">${T("site.your-cart", "Your cart")}</a>
      </div>
      <div>
        <h3>${T("site.departments", "Departments")}</h3>
${categories.map((c) => `        <a href="/shop/?category=${encodeURIComponent(c)}">${esc(c)}</a>`).join("\n")}
      </div>
      <div>
        <h3>${T("site.zi-republic-heading", "Zi Republic")}</h3>
        <a href="/brand/">${T("site.about-zi-republic", "About Zi Republic")}</a>
        <a href="/brand/#ministries">${T("site.the-ministries", "The Ministries")}</a>
        <a href="/zi-card/">${T("site.zi-residency", "Zi Residency")}</a>
        <a href="/zi-card/#zitizenship">${T("site.zitizenship", "Zitizenship")}</a>
        <a href="/brand/#calendar">${T("site.zi-day-and-ziesta", "Zi Day and Ziesta")}</a>
      </div>
      <div>
        <h3>${T("site.explore-heading", "Explore")}</h3>
        <a href="/explore/">${T("site.collections", "Zi Archive")}</a>
        <a href="/note/">${T("site.from-the-zi-in-chief", "From the Zi-in-Chief")}</a>
        <a href="/waitlist/">${T("site.join-the-waitlist", "Join the waitlist")}</a>
        <a href="/account/">${T("site.your-account", "Your account")}</a>
        <h3 class="f-follow">${T("site.follow-zibura", "Follow Zibura")}</h3>
        <div class="socs">${SOCIAL}</div>
      </div>
    </div>
    <div class="legal-row">
      <p class="legal">${T("legal_line", "&copy; 2026 Zibura. Official business. Unofficial personalities.")}</p>
      <nav class="legal-links" aria-label="${esc(TR("policy.nav-label", "Policies"))}"><a href="/privacy/">${T("policy.privacy-link", "Privacy")}</a><a href="/terms/">${T("policy.terms-link", "Terms")}</a><a href="/shipping-returns/">${T("policy.shipping-link", "Shipping and returns")}</a><a href="/contact/">${T("contact.link", "Contact")}</a></nav>
      <button type="button" class="to-top" id="to-top">${T("site.back-to-top", "Back to top")}</button>
    </div>
  </div>
</footer>
${MODAL}
<script src="/assets/app.js?v=${BUILD_V}" defer></script>
</body>
</html>
`;
}

function card(p) {
  return `<a class="card" href="/product/${esc(p.slug)}/">
  <div class="plate">${photo(`${p.slug}-1`, p.name)}${photo(`${p.slug}-2`, p.name) ? `<span class="alt">${photo(`${p.slug}-2`, p.name)}</span>` : ""}</div>
  <div class="info"><span class="nm">${esc(p.name)}</span><span class="price" data-price-for="${esc(p.slug)}"></span><span class="cat">${esc(p.type)}</span><span class="rate" data-rating-for="${esc(p.slug)}"></span></div>
</a>`;
}

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });


const HERO2 = findImage("hero-2");
if (HERO2) write(`assets/hero-2.${HERO2.ext}`, fs.readFileSync(HERO2.file));
// Home
const HERO3 = findImage("hero-3");
if (HERO3) write(`assets/hero-3.${HERO3.ext}`, fs.readFileSync(HERO3.file));
const SLIDE_N = 1 + (HERO3 ? 1 : 0) + (HERO2 ? 1 : 0);
write(
  "index.html",
  layout({
    title: TR("home.meta-title", "Zibura"),
    description: TR("home.meta-description", "Zibura is a lifestyle brand built around personal expression. Zi Republic is its country, and anyone may apply to join."),
    page: "home",
    body: `<main>
<section class="hero-ed" data-hero-ed>
  <div class="he-slides">
    <article class="he-slide on">
      <img src="/assets/hero.jpg" alt="Editorial portrait for Zibura" width="1500" height="2249" fetchpriority="high">
      <div class="he-copy">
        <h1 class="he-title">${T("home.hero1-title", "Your expression, your world.")}</h1>
        <div class="he-actions">
          <a class="he-btn" href="/explore/">${T("home.hero1-button", "Explore Zibura")}</a>
          <a class="he-btn ghost" href="/waitlist/">${T("home.hero1-button3", "Join the waitlist")}</a>
        </div>
      </div>
    </article>
    ${HERO3 ? `<article class="he-slide">
      <img src="/assets/hero-3.${HERO3.ext}" alt="Editorial image for Zi Republic" width="1500" height="1000" loading="lazy">
      <div class="he-copy">
        <h2 class="he-title two">${T("home.hero2-title", "A country of our own. A style of your own.").replace(". ", ".<br>")}</h2>
        <p class="he-lede">${T("home.hero2-sub", "Welcome to Zibura and Zi Republic.")}</p>
        <div class="he-actions"><a class="he-btn" href="/brand/">${T("home.hero2-button", "Enter the Republic")}</a><a class="he-btn ghost" href="/zi-card/">${T("home.hero2-button2", "Apply for Zi Residency")}</a></div>
      </div>
    </article>` : ""}
    ${HERO2 ? `<article class="he-slide">
      <img src="/assets/hero-2.${HERO2.ext}" alt="Capsule collection editorial" width="1500" height="1000" loading="lazy">
      <div class="he-copy">
        <h2 class="he-title">${T("home.hero3-title", "Back to the basics.")}</h2>
        <p class="he-lede">${T("home.hero3-sub", "Our capsule collection is launching soon. A capsule just for you, carefully created to bring you back to the basics.")}</p>
        <div class="he-actions"><a class="he-btn" href="/explore/collection-1/">${T("home.hero3-button", "Explore the collection")}</a><a class="he-btn ghost" href="/waitlist/">${T("home.hero3-button2", "Join the waitlist")}</a></div>
      </div>
    </article>` : ""}
  </div>
  <nav class="he-rail" aria-label="Quick links">
    <a href="/shop/?audience=Women">${T("home.shop-women", "Shop women")}</a>
    <a href="/shop/?audience=Men">${T("home.shop-men", "Shop men")}</a>
    <a href="/style-compass/">${T("home.style-profile", "Style Compass")}</a>
    <a href="/brand/#calendar">${T("home.calendar", "Calendar")}</a>
  </nav>
  <div class="he-ctrl">
    ${SLIDE_N > 1 ? `<button type="button" class="he-prev" aria-label="Previous slide"><svg viewBox="0 0 40 12" width="40" height="12" aria-hidden="true"><path d="M40 6H2M7 1L2 6l5 5" fill="none" stroke="currentColor" stroke-width="1.2"/></svg></button><span class="he-count"><b>1</b> / ${SLIDE_N}</span><button type="button" class="he-next" aria-label="Next slide"><svg viewBox="0 0 40 12" width="40" height="12" aria-hidden="true"><path d="M0 6h38M33 1l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.2"/></svg></button>` : ""}
  </div>
  <a class="he-scroll" href="#products" aria-label="Scroll to products"><span>${T("home.scroll", "Scroll")}</span><i></i></a>
</section>




<section class="section" id="products">
  <div class="wrap">
    <div class="section-head" data-reveal>
      <h2>${T("home.collection-capsule", "The capsule collection")}</h2>
      <div class="rail-nav"><button type="button" data-rail="-1" aria-label="Previous products">&larr;</button><button type="button" data-rail="1" aria-label="Next products">&rarr;</button></div>
    </div>
  </div>
  <div class="rail" data-rail-track>
${products.slice(0, 8).map(card).join("\n")}
  </div>
  <div class="wrap" style="margin-top:36px"><a class="text-link" href="/shop/">${T("home.see-all-products", "See all products")}</a></div>
</section>

<section class="hscroll" data-hscroll aria-label="Look book">
  <div class="hs-pin">
    <div class="wrap hs-head"><h2>${T("home.the-look-book", "The look book")}</h2><p>${T("home.look-book-sub", "Back to the basics.")}</p></div>
    <div class="hs-track">
${[TR("home.opening-frame", "People are complex."), TR("home.movement", "Every way of existing deserves space."), TR("home.detail", "Expression is personal."), TR("home.group", "Identity can change."), TR("home.still-life", "Belonging does not require conformity."), TR("home.closing-frame", "Structure should serve freedom.")].map((c, i) => `      <figure class="hs-card${i % 2 ? " low" : ""}">${media("collection-1-" + (i + 1), c)}<figcaption>${c}</figcaption></figure>`).join("\n")}
      <a class="hs-end" href="/explore/collection-1/"><span>${T("home.read-about-collection", "Read about the capsule collection")}</span></a>
    </div>
    <div class="hs-bar" aria-hidden="true"><i></i></div>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="wrap">
    <div class="section-head" data-reveal><h2>${T("home.shop-by-audience", "Shop by audience")}</h2></div>
    <div class="who" data-reveal>
${AUDIENCES.map((a) => `      <a href="/shop/?audience=${a}">${media("audience-" + a.toLowerCase(), a)}<span>${a}</span></a>`).join("\n")}
    </div>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="wrap">
    <div class="section-head" data-reveal><h2>${T("home.shop-by-department", "Shop by department")}</h2></div>
    <div class="cats" data-cats>
${TAX.map((c) => {
  const n = countIn((p) => p.category === c.name);
  return `      <a href="/shop/?category=${encodeURIComponent(c.name)}" data-count="${n} ${n === 1 ? "product" : "products"}">${esc(c.name)}</a>`;
}).join("\n")}
    </div>
  </div>
</section>

<section class="section statement collage-sec">
  <div class="wrap collage-wrap">
    <div class="collage" aria-hidden="true">
      <figure class="cl a" data-parallax="0.22">${media("collection-1-2", "Editorial frame")}</figure>
      <figure class="cl b" data-parallax="-0.18">${media("collection-1-4", "Editorial frame")}</figure>
      <figure class="cl c" data-parallax="0.32">${media("collection-1-6", "Editorial frame")}</figure>
    </div>
    <p class="scrollwords" data-scrollwords>${T("home.supporting", "A brand built around personal expression. A world with its own identity. Design, individual style and a point of view that leaves room for you to exist in all your dimensions.")}</p>
    <p style="margin-top:40px" data-reveal><a class="btn line" href="/brand/">${T("home.read-republic-story", "Read the Republic story")}</a></p>
  </div>
</section>

<section class="section" style="padding-top:0"><div class="wrap"><div class="cta-row" data-reveal>
  <p>${T("home.compass-text", "Not sure where to start? Eighteen questions find your style leaning.")}</p>
  <a class="btn line" href="/style-compass/">${T("home.compass-button", "Take the Style Compass")}</a>
</div></div></section>

<section class="wrap" data-reveal style="margin-bottom:clamp(56px,8vw,120px)">
  ${film("collection-1-home-film", TR("home.film-caption", "The capsule collection, in motion."))}
</section>

<section class="section navy-band">
  <div class="wrap split">
    <div data-reveal>${flipCard()}</div>
    <div data-reveal>
      <h2 class="display">${T("home.residency-title", "Apply for Zi Residency.")}</h2>
      <p class="lead">${T("home.residency-lead", "Anyone may apply. Apply and receive your Zi Card.")}</p>
      <p class="cta-pair" style="margin-top:32px"><a class="btn light" href="/zi-card/">${T("home.residency-button", "Apply for Zi Residency")}</a><a class="btn ghost-light" href="/zi-card/#rights">${T("home.residency-button2", "How residency works")}</a></p>
    </div>
  </div>
</section>
</main>`
  })
);

// Brand
const MINISTRIES = [
  ["Ministry of Creative and Design", "Responsible for creative direction, design, visual identity and product concepts."],
  ["Ministry of Community and Culture", "Responsible for residents, community programs, cultural initiatives, Republic events, Zi Day and Ziesta."],
  ["Ministry of Communications", "Responsible for public announcements, campaigns, editorial and media relations."],
  ["Ministry of Commerce and Trade", "Responsible for products, sales, orders, partnerships, Zillar and commercial activity."],
  ["Ministry of Republic Administration", "Responsible for Zi Cards, passports, residency applications, Zitizenship Calls and official records."]
].map(([n, d], i) => [TR(`brand.ministry-${i + 1}-name`, n), TR(`brand.ministry-${i + 1}-role`, d)]);
const CALENDAR = [
  ["Zi Day", "Zi Day is the Republic's founding day. Zi Residents and Zitizens mark it each year.", ""],
  ["Ziesta", "Ziesta is the Republic's festival of rest, a time to slow down and gather.", ""]
];
CALENDAR.forEach((c) => {
  c[1] = TR(`brand.calendar-${c[0]}-description`, c[1]);
  if (c[2]) c[2] = TR(`brand.calendar-${c[0]}-date`, c[2]);
});
write(
  "brand/index.html",
  layout({
    title: TR("brand.meta-title", "Zi Republic | Zibura"),
    description: TR("brand.meta-description", "Zi Republic is Zibura's country. It has its own identity, membership, public institutions, calendar and rewards system."),
    page: "brand",
    body: `<main>
<section class="page-head"><div class="wrap">
  ${crumbs([[T("site.home", "Home"), "/"], [T("site.zi-republic", "Zi Republic")]])}
  <h1 class="display rise">${words(TR("brand.title", "A country of our own. A style of your own."))}</h1>
  <p class="fade">${T("brand.about", "Zi Republic is Zibura's country. It has its own identity, membership, public institutions, calendar and rewards system. The Republic gives the brand's central idea a public identity and gives people a way to take part.")}</p>
</div></section>

<section class="wrap" data-reveal>
  ${film("republic-film", TR("brand.film-caption", "Zi Republic, introduced."))}
</section>

<section class="section"><div class="wrap split">
  <h2 class="display" data-reveal>${T("brand.story-title", "We didn't start a brand. We started a country.")}</h2>
  <div class="prose" data-reveal>
    <p class="big">${T("brand.story-1", "Not a company with a flag on the side. A country. With a name, a currency, a population and all the official business that comes with it.")}</p>
    <p>${T("brand.story-2", "The idea began with a question: what would a place look like if people did not have to reduce themselves to one version in order to belong?")}</p>
    <p>${T("brand.story-3", "Zibura exists to make room beyond The Box. Its work moves through different styles, references, products and forms of expression, all connected by the belief that expression belongs to the individual.")}</p>
    <p>${T("brand.story-4", "Zi Republic gives that belief a public life. It has its own identity, membership, institutions and traditions. It is a country built around an idea that leaves room for more than one way to be.")}</p>
    <p><a class="btn line" href="/explore/">${T("brand.explore-collections", "Explore the collections")}</a></p>
  </div>
</div></section>

<section class="section" id="the-box" style="padding-top:0"><div class="wrap split">
  <h2 class="display" data-reveal>${T("brand.box-title", "The Box was never the whole picture.")}</h2>
  <div class="prose" data-reveal>
    <p class="big">${T("brand.box-1", "The Box is the pressure to fit one look, one label or one version of yourself.")}</p>
    <p>${T("brand.box-2", "People are often sorted into categories that make them easier to describe, market to or understand. One look. One label. One lane. Zibura exists to make room for people and forms of expression that do not fit neatly inside it.")}</p>
  </div>
</div></section>

<section class="hscroll" data-hscroll aria-label="The Charter"><div class="hs-pin">
  <div class="wrap hs-head"><h2>${T("brand.charter", "The Charter")}</h2><p>${T("brand.charter-sub", "What Zibura and Zi Republic stand on.")}</p></div>
  <div class="hs-track">
    <div class="hs-card text"><div class="hs-bg">${media("charter-1", "")}</div><b>${T("brand.charter-1-head", "People are complex.")}</b><span>${T("brand.charter-1-body", "That complexity deserves to be respected, and no one should have to reduce themselves to fit a category.")}</span></div>
    <div class="hs-card text low"><div class="hs-bg">${media("charter-2", "")}</div><b>${T("brand.charter-2-head", "Every way of existing deserves space.")}</b><span>${T("brand.charter-2-body", "Loud, quiet and everything in between.")}</span></div>
    <div class="hs-card text"><div class="hs-bg">${media("charter-3", "")}</div><b>${T("brand.charter-3-head", "Expression is personal.")}</b><span>${T("brand.charter-3-body", "Each person decides how they show up, and has the right to define and express themselves.")}</span></div>
    <div class="hs-card text low"><div class="hs-bg">${media("charter-4", "")}</div><b>${T("brand.charter-4-head", "Identity can change.")}</b><span>${T("brand.charter-4-body", "People can grow, shift and hold different versions of themselves without justifying every version.")}</span></div>
    <div class="hs-card text"><div class="hs-bg">${media("charter-5", "")}</div><b>${T("brand.charter-5-head", "Belonging does not require conformity.")}</b><span>${T("brand.charter-5-body", "Shared values can bring people together without demanding sameness. No one needs to simplify themselves to be part of the community.")}</span></div>
    <div class="hs-card text low"><div class="hs-bg">${media("charter-6", "")}</div><b>${T("brand.charter-6-head", "Structure should serve freedom.")}</b><span>${T("brand.charter-6-body", "The Republic's systems should support expression, participation and community.")}</span></div>
  </div>
  <div class="hs-bar" aria-hidden="true"><i></i></div>
</div></section>

<section class="section" id="ministries"><div class="wrap">
  <div class="mini-head" data-reveal>
    <h2 class="display">${T("brand.ministries-title", "The Ministries.")}</h2>
    <p class="province-intro">${T("brand.ministries-intro", "The Ministries oversee the Republic's public functions, from creative direction and community programs to communications, commerce and administration.")}</p>
  </div>
  <div class="mini-grid" data-reveal>
${MINISTRIES.map(([n, d]) => `    <button type="button" class="mini" aria-expanded="false"><span class="mn">${n}</span><span class="mx" aria-hidden="true"></span><span class="md"><span>${d}</span></span></button>`).join("\n")}
  </div>
</div></section>

<section class="section" id="calendar" style="padding-top:0"><div class="wrap split">
  <h2 class="display" data-reveal>${T("brand.calendar-title", "The calendar.")}</h2>
  <dl class="plain-list" data-reveal>
${CALENDAR.map(([n, d, dt]) => `    <div><dt>${n}</dt><dd>${d}</dd><span class="tag-soon">${dt || T("brand.date-soon", "Coming soon")}</span></div>`).join("\n")}
  </dl>
</div></section>

<section class="hscroll" data-hscroll aria-label="Residency, Zitizenship and Zillar"><div class="hs-pin">
  <div class="wrap hs-head"><h2>${T("brand.tiers-title", "Residency, Zitizenship and Zillar.")}</h2><p>${T("brand.tiers-sub", "Three parts of membership in Zi Republic.")}</p></div>
  <div class="hs-track">
    <div class="hs-card tier" id="residency"><div class="hs-bg">${media("tier-resident", "")}</div><h3>${T("brand.zi-residency", "Zi Residency")}</h3><p class="what">${T("brand.zi-residency-what", "The Republic's membership")}</p><p>${T("brand.zi-residency-text", "Anyone may apply. Republic Administration processes each completed application. Applicants become Zi Residents and receive a Zi Card, the everyday credential of membership.")}</p></div>
    <div class="hs-card tier" id="zitizenship"><div class="hs-bg">${media("tier-zitizen", "")}</div><h3>${T("brand.zitizenship", "Zitizenship")}</h3><p class="what">${T("brand.zitizenship-what", "An additional recognition")}</p><p>${T("brand.zitizenship-text", "Zi Residents may apply during a Zitizenship Call. Applications are reviewed based on meaningful participation over time. Every approved Zitizen keeps their Zi Card and receives a Zi Republic passport as an additional credential.")}</p></div>
    <div class="hs-card tier" id="zillar"><div class="hs-bg">${media("tier-zillar", "")}</div><h3>${T("brand.zillar", "Zillar")}</h3><p class="what">${T("brand.zillar-what", "Currency and rewards")}</p><p>${T("brand.zillar-text", "Zillar is Zi Republic's official currency and rewards system. It can be earned through eligible purchases and selected participation, then redeemed for designated rewards, benefits and experiences. Product prices remain listed in standard currencies.")}</p></div>
  </div>
  <div class="hs-bar" aria-hidden="true"><i></i></div>
</div></section>

<section class="section navy-band"><div class="wrap split">
  <h2 class="display" data-reveal>${T("brand.cta-title", "Apply for Zi Residency.")}</h2>
  <div class="prose" data-reveal>
    <p class="big">${T("brand.cta-lead", "Anyone may apply. Join the waitlist to hear when the capsule collection launches.")}</p>
    <p style="margin-top:28px"><a class="btn light" href="/zi-card/">${T("brand.cta-apply", "Apply for Zi Residency")}</a> <a class="btn light" href="/waitlist/">${T("brand.cta-waitlist", "Join the waitlist")}</a></p>
  </div>
</div></section>
</main>`
  })
);

// Explore: Collections and Capsules
const COLLECTIONS = [
  {
    id: "collection-1", name: "Collection I", tag: "The first collection", status: "Launching soon",
    lead: "Collection I is the first collection from Zibura. It opens with Capsule I, high quality basics to build a wardrobe on.",
    idea: [],
    film: "Collection I, in motion.",
    capsules: ["capsule-1", "capsule-2"]
  },
  {
    id: "collection-2", soon: true, name: "Collection II", tag: "Coming soon", status: "Coming soon",
    lead: "Coming soon.", idea: [], film: "", capsules: []
  },
  {
    id: "collection-3", soon: true, name: "Collection III", tag: "Coming soon", status: "Coming soon",
    lead: "Coming soon.", idea: [], film: "", capsules: []
  }
];
const CAPSULES = [
  {
    id: "capsule-1", collection: "collection-1", name: "Capsule I", tag: "Back to the basics.", status: "Launching soon",
    lead: "",
    idea: [],
    film: "Capsule I, in motion.",
    products: (p) => p.capsule === "Capsule I"
  },
  {
    id: "capsule-2", soon: true, collection: "collection-1", name: "Capsule II", tag: "", status: "Coming soon",
    lead: "",
    idea: [],
    film: "Capsule II, in motion.",
    products: (p) => p.capsule === "Capsule II"
  }
];
CAPSULES.forEach((c) => {
  c.lead = c.soon ? "Coming soon." : "Every good wardrobe starts with the basics. Capsule I is high quality basics to build a wardrobe on.";
});
[...COLLECTIONS, ...CAPSULES].forEach((it) => {
  ["tag", "status", "lead", "film"].forEach((f) => { if (typeof it[f] === "string") it[f] = TR(`collection.${it.id}.${f}`, it[f]); });
  it.idea = [1, 2, 3].map((k) => TR(`collection.${it.id}.idea-${k}`, (it.idea || [])[k - 1] || "")).filter(Boolean);
});
const colById = Object.fromEntries(COLLECTIONS.map((s) => [s.id, s]));

const FRAME_LABELS = ["Frame one", "Frame two", "Frame three", "Frame four", "Frame five", "Frame six"];
function paras(list) { return list.map((t) => `<p>${esc(t)}</p>`).join(""); }
function frames(prefix, name) {
  return `<section class="hscroll" data-hscroll aria-label="Images"><div class="hs-pin">
  <div class="wrap hs-head"><h2>${T("story.the-images", "The images")}</h2></div>
  <div class="hs-track">
${FRAME_LABELS.map((c, i) => `    <figure class="hs-card${i % 2 ? " low" : ""}">${media(`${prefix}-${i + 1}`, `${name}, ${c.toLowerCase()}`)}<figcaption>${esc(TR("story.frame-" + (i + 1), c))}</figcaption></figure>`).join("\n")}
    <a class="hs-end" href="/shop/"><span>${T("story.shop-the-collection", "Shop the collection")}</span></a>
  </div>
  <div class="hs-bar" aria-hidden="true"><i></i></div>
</div></section>`;
}
const uniqList = (arr) => [...new Set(arr.filter(Boolean))];
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

function capsuleTile(colId, a) {
  if (a.soon) return `<div class="arc arc-soon" aria-disabled="true"><h3>${a.name}</h3><p class="arc-line">${T("story.coming-soon", "Coming soon")}</p></div>`;
  return `<a class="arc arc-link" href="/explore/${colId}/${a.id}/"><h3>${a.name}</h3><p class="arc-line">${esc(a.tag)}</p><p>${esc(a.lead)}</p><span class="text-link">${T("story.view-the-capsule", "View the capsule")}</span></a>`;
}
function storyPage(item, parent) {
  const isCap = !!parent;
  const col = parent || item;
  const url = isCap ? `/explore/${col.id}/${item.id}/` : `/explore/${item.id}/`;
  const prefix = isCap ? `${col.id}-${item.id}` : item.id;
  const list = isCap ? products.filter(item.products) : products.filter((p) => p.collection === col.name);
  const siblings = isCap ? CAPSULES.filter((a) => a.collection === col.id && a.id !== item.id) : CAPSULES.filter((a) => a.collection === item.id);
  const depts = uniqList(list.map((p) => p.category));
  const mats = uniqList(list.map((p) => p.material));
  const announce = isCap
    ? TR("story.announce-capsule", "{name} is launching soon. Explore the collection at the link below.")
    : TR("story.announce-collection", "{name} is launching soon. Explore the collection at the link below.");
  write(
    url.slice(1) + "index.html",
    layout({
      title: `${isCap ? col.name + ", " : ""}${item.name} | Zibura`,
      description: item.lead,
      page: "story",
      body: `<main>
<section class="story-head"><div class="wrap">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">${T("site.home", "Home")}</a> <span aria-hidden="true">/</span> <a href="/explore/">${T("story.collections", "Zi Archive")}</a> <span aria-hidden="true">/</span> ${isCap ? `<a href="/explore/${col.id}/">${col.name}</a> <span>/</span> ${item.name}` : item.name}</nav>
  <p class="small">${esc(item.status)}</p>
  <h1 class="display rise">${words(item.name)}</h1>
  <p class="story-tag fade">${esc(item.tag)}</p>
  <p class="story-lead fade">${esc(item.lead)}</p>
</div></section>
<section class="wrap" data-reveal><figure class="hero-fig"><div class="hf-img">${media(prefix + "-cover", `${item.name} cover image`)}</div><figcaption>${esc(TR("story.cover-caption", "Cover image for {name}.").replace("{name}", item.name))}</figcaption></figure></section>

<section class="section"><div class="wrap split">
  <h2 class="display" data-reveal>${T("story.launch-title", "Launch.")}</h2>
  <div class="prose" data-reveal>
    <p class="big">${esc(announce.replace("{name}", item.name))}</p>
    ${item.idea.length ? paras(item.idea) : ""}
    <p><a class="btn line" href="/shop/?collection=${encodeURIComponent(col.name)}${isCap ? "&amp;capsule=" + encodeURIComponent(item.name) : ""}">${T("story.shop-the-collection", "Shop the collection")}</a></p>
  </div>
</div></section>

<section class="section" style="padding-top:0"><div class="wrap facts" data-reveal>
  <div><h3>${T("story.products", "Products")}</h3><p>${esc(plural(list.length, "product"))}</p></div>
  <div><h3>${T("story.departments", "Departments")}</h3><p>${esc(depts.join(", "))}</p></div>
  <div><h3>${T("story.materials", "Materials")}</h3><p>${esc(mats.join(", "))}</p></div>
</div></section>

${frames(prefix, item.name)}

${item.film ? `<section class="wrap" data-reveal style="margin-bottom:clamp(56px,8vw,120px)">${film(prefix + "-film", item.film)}</section>` : ""}

${list.length ? `<section class="section" style="padding-top:0"><div class="wrap">
  <div class="section-head" data-reveal><h2>${T("story.the-products", "The products")}</h2><a class="text-link" href="/shop/?collection=${encodeURIComponent(col.name)}${isCap ? "&amp;capsule=" + encodeURIComponent(item.name) : ""}">${esc(TR("story.shop-link", "Shop {name}").replace("{name}", item.name))}</a></div>
</div>
  <div class="rail" data-rail-track>
${list.map(card).join("\n")}
  </div>
</section>` : ""}

${!isCap && siblings.length ? `<section class="section" style="padding-top:0"><div class="wrap">
  <div class="section-head" data-reveal><h2>${esc(TR("story.capsules-inside", "The capsules in {name}").replace("{name}", item.name))}</h2></div>
  <div class="arcs">${siblings.map((a) => `
    ${capsuleTile(item.id, a)}`).join("")}
  </div>
</div></section>` : ""}

${isCap && siblings.length ? `<section class="section" style="padding-top:0"><div class="wrap">
  <div class="section-head" data-reveal><h2>${esc(TR("story.also-in", "Also in {name}").replace("{name}", col.name))}</h2></div>
  <div class="arcs">${siblings.map((a) => `
    ${capsuleTile(col.id, a)}`).join("")}
  </div>
</div></section>` : ""}

<section class="section navy-band"><div class="wrap split">
  <h2 class="display" data-reveal>${T("story.band-title", "Join the waitlist.")}</h2>
  <div class="prose" data-reveal>
    <p class="big">${esc(TR("story.band-text", "Join the waitlist and the Ministry of Communications will email you when {name} launches.").replace("{name}", item.name))}</p>
    <p style="margin-top:28px"><a class="btn light" href="/waitlist/">${T("story.join-the-waitlist", "Join the waitlist")}</a></p>
  </div>
</div></section>
</main>`
    })
  );
}
COLLECTIONS.filter((s) => !s.soon).forEach((s) => storyPage(s, null));
CAPSULES.filter((a) => !a.soon).forEach((a) => storyPage(a, colById[a.collection]));

write(
  "explore/index.html",
  layout({
    title: TR("explore.meta-title", "Zi Archive | Zibura"),
    description: TR("explore.meta-description", "Explore Collection I and its capsules from Zibura."),
    page: "explore",
    body: `<main>
<section class="page-head"><div class="wrap">
  ${crumbs([[T("site.home", "Home"), "/"], [T("site.explore-heading", "Zi Archive")]])}
  <h1 class="display rise">${words(TR("explore.title", "Zi Archive."))}</h1>
  <p class="fade">${T("explore.intro", "A collection brings together a body of work under one creative direction. A capsule is a focused group of products built around a particular idea, form, material, colour story or occasion.")}</p>
</div></section>
<section class="sg-stage" aria-label="Zi Archive">
${COLLECTIONS.filter((x) => !x.soon).map((x) => `  <article class="sg-scene" data-sg>
    <div class="sg-bg" data-drift>${media(x.id + "-cover", x.name + " cover image")}</div>
    <div class="sg-body">
      <p class="sg-tag">${esc(x.tag)}. ${esc(x.status)}.</p>
      <h2 class="sg-title">${x.name}</h2>
      <p class="sg-lead">${esc(x.lead)}</p>
      <div class="sg-actions">
        <button type="button" class="sg-open" aria-expanded="false" aria-controls="caps-${x.id}"><span class="o">${esc(TR("explore.open-collection", "Open {name}").replace("{name}", x.name))}</span><span class="c">${esc(TR("explore.close-collection", "Close {name}").replace("{name}", x.name))}</span></button>
        <a class="sg-read" href="/explore/${x.id}/">${esc(TR("explore.view-collection", "View {name}").replace("{name}", x.name))}</a>
      </div>
      <div class="sg-arcs" id="caps-${x.id}">
        <div class="sg-arcs-in">
          <p class="sg-arcs-label">${esc(TR("explore.capsules-inside", "The capsules in {name}").replace("{name}", x.name))}</p>
          <div class="sg-arc-row">
${CAPSULES.filter((a) => a.collection === x.id).map((a) => a.soon ? `            <div class="sg-arc soon" aria-disabled="true">${media(x.id + "-" + a.id + "-cover", a.name + " cover image")}<div class="sga-txt"><h3>${a.name}</h3><span class="tag-soon">${T("explore.coming-soon", "Coming soon")}</span></div></div>` : `            <a class="sg-arc" href="/explore/${x.id}/${a.id}/">${media(x.id + "-" + a.id + "-cover", a.name + " cover image")}<div class="sga-txt"><h3>${a.name}</h3><p>${esc(a.tag)}</p><span class="text-link">${T("explore.view-the-capsule", "View the capsule")}</span></div></a>`).join("\n")}
          </div>
        </div>
      </div>
    </div>
  </article>`).join("\n")}
</section>

<section class="sg-sealed-wrap" aria-label="${esc(TR("explore.next-collections", "Next collections"))}">
${COLLECTIONS.filter((x) => x.soon).map((x) => `  <div class="sg-sealed" aria-disabled="true">
    <div class="sg-bg" data-drift>${media(x.id + "-cover", x.name + " cover image")}</div>
    <div class="sg-body">
      <span class="tag-soon">${T("explore.date-soon", "Coming soon")}</span>
      <h2 class="sg-title">${x.name}</h2>
      <p class="sg-lead">${esc(x.lead)}</p>
    </div>
  </div>`).join("\n")}
</section>

<section class="hscroll" data-hscroll aria-label="Frames"><div class="hs-pin">
  <div class="wrap hs-head"><h2>${T("explore.frames", "Frames")}</h2><p>${T("explore.frames-sub", "Silhouette, colour, texture, light and attitude.")}</p></div>
  <div class="hs-track">
${[TR("explore.silhouette", "Silhouette"), TR("explore.colour", "Colour"), TR("explore.texture", "Texture"), TR("explore.light", "Light"), TR("explore.attitude", "Attitude")].map((c, i) => `    <figure class="hs-card${i % 2 ? " low" : ""}">${media("explore-" + (i + 1), c)}<figcaption>${c}</figcaption></figure>`).join("\n")}
    <a class="hs-end" href="/shop/"><span>${T("explore.shop-the-collection", "Shop the collection")}</span></a>
  </div>
  <div class="hs-bar" aria-hidden="true"><i></i></div>
</div></section>
</main>`
  })
);

// Style Compass
// Style is measured on eight axes. Every answer moves one or more axes. The profile with the closest pattern wins.
const AXES = [
  ["Structure", "Relaxed", "Tailored", "You prefer relaxed shapes that move with you.", "You prefer tailored shapes with a clear structure."],
  ["Colour", "Neutral", "Vivid", "You build outfits from neutral tones.", "You build outfits around colour."],
  ["Attention", "Understated", "Statement", "You let quality speak quietly.", "You dress to be noticed."],
  ["Detail", "Clean", "Layered", "You keep outfits clean and simple.", "You add layers, texture and detail."],
  ["Pace", "Classic", "Experimental", "You favour pieces that last across seasons.", "You favour new shapes and new ideas."],
  ["Movement", "Refined", "Active", "You dress for polish and occasion.", "You dress for movement and ease."],
  ["Fit", "Fitted", "Oversized", "You like clothes close to the body.", "You like room, volume and an oversized fit."],
  ["Heritage", "Contemporary", "Cultural", "You dress from current style and global basics.", "You wear textiles, prints and craft with a cultural story."]
].map((a, i) => a.map((t, k) => (k === 0 ? TR(`quiz.axis-${i + 1}`, t) : TR(`quiz.axis-${i + 1}-${["low", "high", "low-note", "high-note"][k - 1]}`, t))));
// Axis order for every answer vector: Structure, Colour, Attention, Detail, Pace, Movement, Fit, Heritage.
const PLACEMENT = [
  ["Which outfit do you reach for first?", [["Tailored blazer, straight trousers, clean shoes.", [2, -1, 0, -1, -1, -1]], ["Oversized knit, easy trousers, sneakers.", [-2, -1, -1, -1, 0, 1]], ["Flowing dress with soft layers and delicate jewellery.", [-1, 0, 0, 2, -1, -1]], ["Bright set in a print nobody else has.", [0, 2, 2, 1, 1, 1]], ["Black leather, sharp lines and one strange detail.", [1, -1, 2, 1, 2, 0]]]],
  ["Pick a colour story.", [["Navy, white and stone.", [1, -2, -1, -1, -1, 0]], ["Earth tones: olive, sand and rust.", [-1, -1, -1, 0, -1, 0]], ["Soft pastels and cream.", [-1, 0, -1, 1, -1, -1]], ["Saturated reds, yellows and pinks.", [0, 2, 1, 0, 0, 1]], ["Black with one unexpected shade.", [1, -1, 1, 0, 1, 0]]]],
  ["How loud should an outfit be?", [["Quiet. People notice the fit, then the outfit.", [1, -1, -2, -1, -1, 0]], ["Calm, with one detail worth a second look.", [0, 0, -1, 0, 0, 0]], ["Clear. People can see I made a choice.", [0, 1, 1, 0, 1, 0]], ["Loud. I dress to be seen from across the room.", [0, 1, 2, 1, 1, 0]]]],
  ["What do you look at first on a rack?", [["The cut and the proportions.", [2, 0, 0, -1, 0, 0]], ["The fabric and how it feels.", [-1, -1, -1, 0, -1, 1]], ["The embellishment, the trim and the print.", [0, 1, 1, 2, 0, 0]], ["The silhouette nobody else would try.", [0, 0, 1, 1, 2, 0]], ["Whether I can move in it.", [-1, 0, 0, -1, 0, 2]]]],
  ["Pick a fabric.", [["Crisp cotton and fine wool.", [2, -1, -1, -1, -1, -1]], ["Linen, jersey and soft knit.", [-2, -1, -1, -1, -1, 1]], ["Silk, lace and chiffon.", [-1, 0, 0, 2, -1, -2]], ["Leather, vinyl and heavy satin.", [1, 0, 2, 0, 1, -1]], ["Technical nylon and stretch.", [-1, 1, 1, -1, 1, 2]]]],
  ["Describe your closet in one sentence.", [["A few excellent pieces that go with each other.", [1, -1, -1, -1, -1, 0]], ["Many pieces, and every one has a story.", [0, 1, 1, 2, 1, 0]], ["Comfortable pieces I can wear any day.", [-1, -1, -1, -1, -1, 1]], ["Pieces that only make sense on me.", [0, 0, 1, 1, 2, -1]], ["A rotating set of bright things that all mix.", [-1, 2, 1, 0, 1, 1]]]],
  ["How do you feel about trends?", [["I wear what lasts, trends or no trends.", [1, -1, -1, -1, -2, 0]], ["I borrow one idea each season.", [0, 0, 0, 0, 0, 0]], ["I like to be early.", [0, 1, 1, 1, 1, 0]], ["I try to be the reason something trends.", [0, 1, 2, 1, 2, 0]]]],
  ["A long day on foot. What is on your feet?", [["Polished loafers or leather boots.", [2, -1, 0, -1, -1, -2]], ["Clean white sneakers.", [-1, -1, -1, -1, 0, 1]], ["Bright trainers made for moving.", [-1, 1, 1, 0, 1, 2]], ["Ballet flats or soft sandals.", [-1, 0, 0, 1, -1, -1]], ["Chunky boots with a point to make.", [1, -1, 2, 0, 1, 0]]]],
  ["Choose an accessory.", [["A fine watch or a thin chain.", [1, -1, -1, -1, -1, 0]], ["A woven bag.", [-1, -1, -1, 0, -1, 0]], ["Layered necklaces and rings.", [0, 0, 1, 2, 0, -1]], ["Statement earrings in colour.", [0, 2, 2, 1, 0, 0]], ["Sharp sunglasses and a heavy belt.", [1, -1, 2, 0, 1, 0]], ["A bag that carries everything.", [-1, 0, 0, -1, 0, 2]]]],
  ["Choose a setting.", [["A gallery on a quiet weekday.", [1, -1, -1, 0, 0, -1]], ["A weekend market.", [-1, 0, 0, 0, -1, 1]], ["A garden party.", [-1, 1, 0, 2, -1, -1]], ["A rooftop with a good playlist.", [0, 1, 2, 1, 1, 1]], ["A basement venue after midnight.", [1, -1, 1, 1, 2, 0]]]],
  ["How do you decide what to buy?", [["Once, carefully, and I keep it for years.", [1, -1, -1, -1, -2, 0]], ["On feel. It has to be comfortable.", [-1, -1, -1, -1, -1, 1]], ["On impulse, when something calls to me.", [0, 1, 1, 1, 1, 0]], ["On whether it surprises me.", [0, 0, 1, 1, 2, 0]]]],
  ["What do people say about how you dress?", [["Always polished.", [2, -1, 0, -1, -1, -1]], ["So effortless.", [-1, -1, -1, -1, -1, 1]], ["So pretty and soft.", [-1, 0, -1, 1, -1, -1]], ["Where did you find that?", [0, 1, 1, 1, 2, 0]], ["You never miss.", [1, 0, 2, 0, 1, 0]]]],
  ["Which layering is closest to yours?", [["One strong layer and nothing extra.", [1, -1, -1, -2, 0, 0]], ["A coat over a knit over a shirt.", [1, -1, 0, 1, -1, -1]], ["Drapes, scarves and sheer on sheer.", [-1, 0, 0, 2, 0, -1]], ["A hoodie and a shell.", [-1, 0, 0, -1, 0, 2]], ["Pattern on pattern.", [0, 2, 1, 2, 1, 0]]]],
  ["Which trousers do you pick?", [["Straight and sharp creased.", [2, -1, -1, -1, -1, -1]], ["Wide and relaxed.", [-2, 0, 0, 0, 0, 1]], ["Cargo and technical.", [-1, 0, 1, -1, 1, 2]], ["Printed or colourful.", [0, 2, 2, 1, 1, 0]], ["Cut in a way you look at twice.", [0, 0, 1, 1, 2, 0]]]]
];
// The first fourteen questions carry Fit from Structure, with a few direct overrides, and Heritage from a few direct answers.
const FIT_OVERRIDE = { "Oversized knit, easy trousers, sneakers.": 2, "Wide and relaxed.": 2, "Straight and sharp creased.": -1 };
const HER_OVERRIDE = { "Earth tones: olive, sand and rust.": 1, "A woven bag.": 1, "A weekend market.": 1 };
PLACEMENT.forEach((q) => q[1].forEach((a) => {
  const st = a[1][0];
  const fit = a[0] in FIT_OVERRIDE ? FIT_OVERRIDE[a[0]] : (Math.abs(st) === 2 ? (st > 0 ? -1 : 1) : 0);
  a[1].push(fit, a[0] in HER_OVERRIDE ? HER_OVERRIDE[a[0]] : 0);
}));
PLACEMENT.push(
  ["Which fit feels most like you?", [["Close to the body, with every line defined.", [1, 0, 0, -1, 0, -1, -2, 0]], ["True to size and neat.", [1, -1, -1, -1, -1, 0, -1, 0]], ["A little room, so I can move.", [-1, 0, 0, 0, 0, 1, 1, 0]], ["Oversized and roomy, with plenty of volume.", [-1, 0, 1, 0, 1, 0, 2, 0]]]],
  ["Pick a textile.", [["Plain and smooth, with no pattern.", [1, -1, -1, -1, -1, 0, 0, -2]], ["A fine stripe or a quiet check.", [1, -1, -1, 0, -1, 0, 0, -1]], ["Hand dyed or woven cloth with a story behind it.", [0, 0, 0, 1, 0, 0, 0, 2]], ["A bold wax print in saturated colour.", [0, 2, 2, 1, 0, 0, 0, 2]]]],
  ["Where do your style ideas come from?", [["Runways and fashion magazines.", [1, 0, 1, 0, 1, -1, 0, -1]], ["Streetwear and global brands.", [-1, 0, 1, 0, 1, 1, 1, -2]], ["Family, elders and the places I come from.", [0, 0, 0, 1, -1, 0, 0, 2]], ["Vintage shops and secondhand finds.", [0, 0, 0, 1, 0, 0, 0, 1]]]],
  ["How should a jacket fit?", [["Close, with the shoulders exact.", [2, -1, 0, -1, -1, -1, -2, 0]], ["True to size.", [1, 0, 0, 0, 0, 0, -1, 0]], ["One size up, for layering.", [-1, 0, 0, 1, 0, 0, 1, 0]], ["Big and boxy.", [-1, 0, 1, 0, 1, 0, 2, 0]]]]
);
// Each profile has a target pattern on the eight axes, from -1 (left label) to +1 (right label).
const PROFILES = [
  { n: "Minimalist", v: [1, -1, -0.86, -0.99, -1, -0.66, -0.98, -0.62], line: "Clean, quiet and exact.", define: "Minimalist style removes what is unnecessary. The outfit relies on fit, fabric and a tight palette.", silhouette: "Straight lines, simple shapes and exact proportions.", palette: ["White", "Black", "Sand", "Silver"], fabrics: "Cotton poplin, fine wool, smooth knit", loves: ["A perfect white shirt", "One coat that goes with everything", "Plain leather bags"], moments: "Quiet offices, gallery visits, early flights and any room that rewards calm.", shopper: "You buy few pieces and keep them for years. Fit decides every purchase.", stretch: "Add one saturated accent, such as a scarf in Sky Blue, and the outfit gains a second voice.", picks: ["halo", "margin", "orbit"] },
  { n: "Classicist", v: [1, -1, -0.75, -0.92, -0.99, -0.83, -1, -0.26], line: "Polished, lasting and sure.", define: "Classic style favours well made shapes that stay in season. Tailoring and tradition lead.", silhouette: "Tailored jackets, straight trousers, crisp collars and defined waists.", palette: ["Zibura Blue", "White", "Tan", "Gold"], fabrics: "Wool, cotton, leather, fine knit", loves: ["A blazer that fits at the shoulder", "Loafers and leather belts", "A trench coat"], moments: "Meetings, dinners, weddings and any occasion with a dress code.", shopper: "You choose quality over quantity and replace very little.", stretch: "Try one relaxed knit under the tailoring and watch the whole look soften.", picks: ["margin", "halo", "meridian"] },
  { n: "Maximalist", v: [-0.17, 0.98, 1, 0.98, 0.99, 0.34, 0.55, 0.63], line: "Rich, layered and generous.", define: "Maximalist style adds more: more colour, more pattern, more detail. Every piece has something to say.", silhouette: "Volume, print on print, embellishment and rich layers.", palette: ["Purple", "Gold", "Coral", "Hot Pink"], fabrics: "Velvet, brocade, satin, embroidered cotton", loves: ["Pattern on pattern", "Collected jewellery", "Statement coats"], moments: "Parties, openings, travel days and anywhere the room needs colour.", shopper: "You buy what makes you stop. Every piece has a story.", stretch: "Try one plain base layer and see how each detail sharpens.", picks: ["ember", "kite", "rumour"] },
  { n: "Romantic", v: [-0.3, 0.64, 0.81, 0.97, 0.4, -0.3, 0.13, 0.7], line: "Soft, detailed and graceful.", define: "Romantic style favours softness: drape, texture and delicate detail.", silhouette: "Flowing skirts, soft sleeves, gentle waists and sheer layers.", palette: ["Lilac", "Peach", "Cream", "Silver"], fabrics: "Silk, lace, chiffon, soft cotton", loves: ["A dress that moves", "Delicate jewellery", "Soft scarves"], moments: "Dinners, weddings, gardens and evenings that deserve a story.", shopper: "You follow a feeling, then find the reasons. The best pieces feel like they already knew you.", stretch: "Add one structured jacket and the softness gets sharper.", picks: ["kite", "orbit", "hearth"] },
  { n: "Provocateur", v: [0.38, 0.49, 1, 0.87, 0.99, -0.11, 0.06, 0.15], line: "Sharp, dark and deliberate.", define: "Provocateur style uses structure and contrast to make a point. The outfit has an edge.", silhouette: "Sharp shoulders, leather, heavy hardware and an asymmetrical line.", palette: ["Black", "Red", "Silver", "White"], fabrics: "Leather, crepe, heavy satin, denim", loves: ["A leather jacket", "Heavy boots", "A single red piece"], moments: "Stages, nights out, openings and any room that needs someone to go first.", shopper: "You know in five seconds. Hesitation costs the outfit its edge.", stretch: "Try one soft warm tone, such as Sand, and the red gets louder.", picks: ["tidal", "stride", "rumour"] },
  { n: "Naturalist", v: [-0.57, -0.93, -0.81, -0.7, -0.85, 0.78, 0.62, 0.52], line: "Easy, natural and lasting.", define: "Naturalist style chooses comfort, honest fabrics and earth tones. Clothes age well.", silhouette: "Relaxed shapes, easy trousers and soft layers.", palette: ["Green", "Sand", "Olive", "Tan"], fabrics: "Linen, wool knit, washed cotton, soft leather", loves: ["Earth tones and soft greens", "Totes and woven textures", "Boots that age well"], moments: "Weekend markets, long lunches, garden days and slow mornings.", shopper: "You wait for what grows on you. The pieces you keep for ten years are the ones you thought about for ten days.", stretch: "Try one bright, saturated piece and let the earth tones frame it.", picks: ["meridian", "cove", "hearth"] },
  { n: "Mover", v: [-0.74, 0.52, 0.77, 0.05, 0.68, 0.97, 0.82, -0.26], line: "Fast, comfortable and ready.", define: "Mover style starts with motion. Clothes work hard and look good doing it.", silhouette: "Athletic ease, technical fabrics, layers that zip and bags that carry everything.", palette: ["Orange", "Sky Blue", "Lime", "Black"], fabrics: "Technical nylon, jersey, stretch mesh, canvas", loves: ["Trainers made for the day", "A shell jacket", "A bag that holds everything"], moments: "City days, travel, studios and plans that change three times.", shopper: "You take several pieces home and keep the winners.", stretch: "Try one tailored piece and see how it sharpens the whole outfit.", picks: ["ember", "pocket", "cove"] },
  { n: "Colourist", v: [-0.24, 0.99, 1, 0.92, 0.99, 0.58, 0.41, 0.44], line: "Bright, generous and social.", define: "Colourist style leads with colour. The palette is the outfit.", silhouette: "Fitted waists, flowing skirts, soft shoulders and anything that moves with you.", palette: ["Yellow", "Coral", "Hot Pink", "Peach"], fabrics: "Satin, silk blends, bright cotton", loves: ["Saturated colour", "Statement earrings", "Dresses made for gathering"], moments: "Birthdays, brunches, weddings and every dinner where you arrive with the playlist.", shopper: "You shop for the occasion and the photograph.", stretch: "Try deep navy and watch the bright colours glow against it.", picks: ["ember", "kite", "hearth"] },
  { n: "Avant-gardist", v: [0.09, 0.67, 1, 0.95, 1, 0.02, 0.59, 0.21], line: "Inventive, unexpected and ahead.", define: "Avant-garde style treats clothing as an experiment: new cuts and new proportions.", silhouette: "Unusual cuts, asymmetry, oversized volume and sculpted lines.", palette: ["Black", "Silver", "Purple", "White"], fabrics: "Technical cotton, wool crepe, coated and structured fabrics", loves: ["A cut nobody has seen before", "Sculptural accessories", "Mixed proportions"], moments: "Exhibitions, studios, late nights and rooms full of curious people.", shopper: "You buy what surprises you and wear it before the trend arrives.", stretch: "Try a plain white shirt as a base and watch the shapes read clearer.", picks: ["rumour", "orbit", "tidal"] },
  { n: "Easy Dresser", v: [-0.81, -0.86, -0.66, -0.75, -0.65, 0.95, 0.89, -0.18], line: "Relaxed, effortless and ready.", define: "Easy style puts comfort first, with clothes that take no effort to wear.", silhouette: "Relaxed fits, soft knits, simple layers and flat shoes.", palette: ["Cream", "Sand", "Sky Blue", "Olive"], fabrics: "Jersey, soft cotton, knit, denim", loves: ["The perfect t-shirt", "Wide trousers", "Clean sneakers"], moments: "Weekends, errands, long flights and days with no fixed plan.", shopper: "You choose comfort first, then check how it looks.", stretch: "Add one sharp piece, such as a structured coat, and the ease becomes deliberate.", picks: ["pocket", "cove", "margin"] }
];
PROFILES.forEach((pr) => {
  ["line", "define"].forEach((f) => { pr[f] = TR(`quiz.${pr.n}-${f}`, pr[f]); });
});

write(
  "style-compass/index.html",
  layout({
    title: TR("quiz.meta-title", "Style Compass | Zibura"),
    description: TR("quiz.meta-description", "Eighteen questions that read your style across eight dimensions and match you to one of ten style leanings."),
    page: "placement",
    body: `<main>
<section class="page-head"><div class="wrap">
  ${crumbs([[T("site.home", "Home"), "/"], [T("site.style-profile", "Style Compass")]])}
  <h1 class="display rise">${words(TR("quiz.title", "Style Compass."))}</h1>
  <p class="fade">${T("quiz.intro", "Style is how you choose to present yourself: the shapes, colours, fabrics and details you reach for. It changes with the day and with the person. Eighteen questions read your style across eight dimensions and match you to one of ten style leanings.")}</p>
</div></section>
<section class="section" style="padding-top:clamp(16px,3vw,40px)"><div class="wrap">
  <div id="quiz" class="quiz" data-quiz>
    <div class="q-bar"><span id="q-step"></span><div class="q-track"><i id="q-fill"></i></div></div>
    <h2 class="display q-title" id="q-title" tabindex="-1"></h2>
    <div class="q-opts" id="q-opts"></div>
  </div>
  <div id="result" class="result" hidden></div>
  <script type="application/json" id="quiz-data">${JSON.stringify({ axes: AXES, questions: PLACEMENT.map((q, qi) => [q[0], q[1]]), profiles: PROFILES })}</script>
</div></section>
</main>`
  })
);

// Waitlist (stands alone, no site header or footer, for Instagram and other links)
const WL_TILES = ["collection-1-1", "collection-1-2", "collection-1-3", "collection-1-4", "collection-1-5", "collection-1-6", "explore-5", "explore-2"];
const WL_ALTS = ["Zi Republic frame 1", "Zi Republic frame 2", "Zi Republic frame 3", "Zi Republic frame 4", "Zi Republic frame 5", "Zi Republic frame 6", "Zi Republic frame 7", "Zi Republic frame 8"];
const wlSky = findImage("waitlist-sky") || findImage("hero-3") || findImage("hero");
if (wlSky) write(`assets/waitlist-sky.${wlSky.ext}`, fs.readFileSync(wlSky.file));
const ICON_IG = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r=".6" fill="currentColor"/></svg>`;
const ICON_TT = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3v11.2a3.7 3.7 0 11-3.7-3.7"/><path d="M14 3c.4 2.6 2 4.2 5 4.4"/></svg>`;
function waitlistPage() {
  const tiles = WL_TILES.map((n, i) => {
    const hit = findImage(n);
    if (hit) write(`assets/media/${n}.${hit.ext}`, fs.readFileSync(hit.file));
    return `<div class="mu-tile mu-t${i + 1}">${hit ? `<img src="/assets/media/${n}.${hit.ext}" alt="${esc(WL_ALTS[i])}" loading="lazy" draggable="false">` : `<div class="ph-empty"></div>`}</div>`;
  }).join("");
  return bare({
    title: TR("waitlist.meta-title", "Zibura | Coming soon"),
    description: TR("waitlist.meta-description", "Zi Republic is about to open its borders. Join the Zibura waitlist for first word on the capsule collection."),
    page: "waitlist",
    body: `<div class="mu">
<header class="mu-top">
  <a class="mu-logo" href="/" aria-label="Zibura home"><img src="/assets/logo-wordmark-sky.png" alt="Zibura" width="636" height="120"></a>
  <nav class="mu-soc" aria-label="Social">
    <a href="${LINKS.instagram || "https://www.instagram.com/thezibura/"}" target="_blank" rel="noopener" aria-label="Zibura on Instagram">${ICON_IG}</a>
    <a href="${LINKS.tiktok || "https://www.tiktok.com/@thezibura"}" target="_blank" rel="noopener" aria-label="Zibura on TikTok">${ICON_TT}</a>
  </nav>
</header>
<main>
<section class="mu-hero" id="top">
  <div class="mu-sky">${wlSky ? `<img src="/assets/waitlist-sky.${wlSky.ext}" alt="" fetchpriority="high">` : ""}</div>
  <div class="mu-hero-in">
    <h1 class="mu-h1 mu-in" style="--d:.5s">${T("waitlist.headline", "Zi Republic is about to open its borders&hellip;")}</h1>
    <div class="mu-count mu-in" style="--d:.8s" data-jn-count data-date="${TR("join.count-date", "2027-04-18")}" role="timer" aria-label="${esc(TR("join.count-label", "Countdown to 18 April 2027"))}">
      <div class="mu-count-row">
        <div><b data-u="d">00</b><span>${T("join.count-days", "Days")}</span></div><i>:</i>
        <div><b data-u="h">00</b><span>${T("join.count-hours", "Hours")}</span></div><i>:</i>
        <div><b data-u="m">00</b><span>${T("join.count-minutes", "Minutes")}</span></div><i>:</i>
        <div><b data-u="s">00</b><span>${T("join.count-seconds", "Seconds")}</span></div>
      </div>
      <p class="mu-count-done" hidden>${T("join.count-done", "The doors are open.")}</p>
    </div>
    <a class="mu-btn mu-in" style="--d:1.1s" href="#waitlist" data-mu-go>${T("join.button", "Join the waitlist")}</a>
  </div>
  <a class="mu-down mu-in" style="--d:1.5s" href="#waitlist" data-mu-go aria-label="${esc(TR("join.scroll-label", "Scroll down"))}">&darr;</a>
</section>
<div class="mu-blend" aria-hidden="true"></div>
<section class="mu-zoom" id="waitlist" data-mu-zoom>
  <div class="mu-stage">
    <div class="mu-grid" aria-hidden="false">${tiles}</div>
    <div class="mu-core">
      <img class="mu-mark" src="/assets/logo-wordmark-navy.png" alt="Zibura" width="636" height="120">
      <p class="mu-tag">${T("waitlist.tagline", "Be the first through the door when the capsule collection opens.")}</p>
      <form class="mu-mail" novalidate data-mu-mail>
        <label class="sr" for="mu-email">${T("forms.email", "Email")}</label>
        <input id="mu-email" type="email" name="email" autocomplete="email" placeholder="${esc(TR("waitlist.placeholder", "your@email.com"))}" required>
        <button type="submit">${T("join.button", "Join the waitlist")}</button>
        <p class="mu-err" role="status"></p>
      </form>
    </div>
  </div>
</section>
<section class="mu-after">
  <h2>${T("waitlist.after-title", "While you wait")}</h2>
  <div class="mu-cards">
    <a href="/style-compass/"><b>${T("join.next1-title", "Take the Style Compass")}</b><span>${T("join.next1-text", "Eighteen questions to find your style leaning.")}</span></a>
    <a href="/looks/"><b>${T("join.next3-title", "Wander Zi Looks")}</b><span>${T("join.next3-text", "See complete outfits and every piece in them.")}</span></a>
    <a href="/zi-card/"><b>${T("join.next2-title", "Apply for Zi Residency")}</b><span>${T("join.next2-text", "Anyone may apply. Residents receive a Zi Card.")}</span></a>
  </div>
  <p class="mu-foot"><a href="/">${T("join.enter", "Enter Zibura")}</a> <span>${T("legal_line", "&copy; 2026 Zibura. Official business. Unofficial personalities.")}</span></p>
</section>
</main>
<dialog class="mu-dialog" id="mu-dialog" aria-label="${esc(TR("waitlist.dialog-label", "Join the waitlist"))}">
  <button class="mu-x" type="button" aria-label="Close" data-mu-close>&times;</button>
  <div class="mu-form" data-mu-form>${arrivalCard("w")}</div>
  <div class="mu-done" data-mu-done hidden tabindex="-1">
    <img src="/assets/zi-card-seal.png" alt="" width="304" height="300">
    <h2><span data-mu-name>${T("join.done-title", "You are on the list.")}</span></h2>
    <p>${T("join.done-text", "A confirmation is on its way to your inbox. While you wait, three things to do.")}</p>
    <div class="mu-cards">
      <a href="/style-compass/"><b>${T("join.next1-title", "Take the Style Compass")}</b><span>${T("join.next1-text", "Eighteen questions to find your style leaning.")}</span></a>
      <a href="/looks/"><b>${T("join.next3-title", "Wander Zi Looks")}</b><span>${T("join.next3-text", "See complete outfits and every piece in them.")}</span></a>
      <a href="/zi-card/"><b>${T("join.next2-title", "Apply for Zi Residency")}</b><span>${T("join.next2-text", "Anyone may apply. Residents receive a Zi Card.")}</span></a>
    </div>
  </div>
</dialog>
</div>
<script src="/assets/waitlist.js?v=${BUILD_V}" defer></script>`
  });
}
write("waitlist/index.html", waitlistPage());
write("assets/waitlist.js", fs.readFileSync(find("waitlist.js")));

// Breadcrumbs: [[label, url], ..., [current label]]
function crumbs(items) {
  return `<nav class="crumbs" aria-label="${esc(TR("site.breadcrumb", "Breadcrumb"))}">${items.map((c, i) => (i === items.length - 1 || !c[1] ? `<span aria-current="page">${c[0]}</span>` : `<a href="${c[1]}">${c[0]}</a><span aria-hidden="true">/</span>`)).join(" ")}</nav>`;
}

// Policy pages (standard wording, editable in the Copy tab)
const POLICY_DATE = "11 November 2026";
const P_EMAIL = TR("policy.email", "hello@zibura.com");
const POLICIES = {
  privacy: {
    title: "Privacy policy",
    intro: "This policy explains what information Zibura collects, why we collect it and the choices you have. Zibura is the fashion and lifestyle brand of Zi Republic, based in Calgary, Alberta, Canada.",
    sections: [
      ["Information we collect", "We collect the details you give us: your name, email address, phone number, city, country, birthday month and day, delivery addresses, and the portrait photo you upload when you apply for a Zi Card. We also keep your orders, saved products, size preferences and Style Compass result. When you browse, your device keeps your cart, your chosen currency and your Style Compass progress in its own storage."],
      ["How we use it", "We use your information to run your account, process and deliver orders, send the confirmations and updates you request, produce your Zi Card, send the Zi Memo and capsule collection announcements when you agree to receive them, answer your questions, and keep the website secure and working well."],
      ["Who receives it", "We share information with the services that help us operate: Stripe processes payments, Brevo sends our emails, and Cloudflare hosts the website and stores account data. Delivery partners receive the name and address needed to deliver your order. These providers use your information only to carry out their service for us. We do not sell your personal information."],
      ["Email and text messages", "We send marketing email and text messages only when you give consent. Every email includes an unsubscribe link, and you can reply STOP to any text message to opt out. Order and account messages continue because they relate to your purchases."],
      ["Cookies and device storage", "Zibura uses small amounts of device storage to keep your cart, currency and session working. We use these items to provide the features you ask for."],
      ["How long we keep it", "We keep account and order records for as long as your account is open and for the period the law requires for business and tax records. You can ask us to delete your account at any time from your account page."],
      ["Your choices and rights", "You can view and update your details in your account, ask for a copy of the information we hold about you, ask us to correct it, withdraw your consent to marketing, or ask us to delete your account. We handle these requests in line with Canada's Personal Information Protection and Electronic Documents Act and applicable Alberta law."],
      ["Security", "We protect your information with encrypted connections, hashed passwords and restricted access to account data. Card details go directly to Stripe, and Zibura does not store them."],
      ["Children", "Zibura is intended for adults and for young people shopping with a parent or guardian. We do not knowingly collect information from children."],
      ["Changes to this policy", "We update this policy when our practices change and show the date of the latest update at the top of the page."],
      ["Contact us", "Questions about privacy go to " + P_EMAIL + "."]
    ]
  },
  terms: {
    title: "Terms of service",
    intro: "These terms apply when you browse zibura.com, create an account or place an order. By using the website you agree to them.",
    sections: [
      ["Using the website", "You may use Zibura for lawful, personal shopping and to explore Zi Republic. Please give accurate information, keep your password private and tell us if you suspect anyone else has used your account."],
      ["Products and pricing", "We describe and photograph our products as accurately as we can. Colours can look different on different screens. Prices are shown in the currency you choose. Prices in currencies other than Canadian dollars are converted for your convenience, and the amount confirmed at checkout is the amount you pay. Taxes, shipping and any duties are shown or explained before you pay."],
      ["Orders and payment", "An order is complete when we send your confirmation email. Payments are handled by Stripe on a secure payment page. We may cancel and refund an order if a product is out of stock, a price was shown in error or we cannot verify the payment."],
      ["Shipping and returns", "Delivery and returns follow our Shipping and returns page, which forms part of these terms."],
      ["Zi Residency, Zitizenship and Zi Card", "Zi Residency is open to anyone who applies. Zi Cards are issued after an application is accepted and remain the property of Zibura. Residency, Zitizenship, the Zi Card and Zillar are brand experiences and carry no legal citizenship, identity or government status. We may update, pause or end them with notice on the website."],
      ["Your content", "When you upload a portrait, write a review or send us other content, you confirm it belongs to you or you have permission to share it. You give Zibura permission to use it to operate the service, including displaying your review and producing your Zi Card. Content that is unlawful, offensive or misleading may be removed."],
      ["Our content", "The Zibura name, logos, photography, copy, designs and the Zi Republic world belong to Zibura or its licensors. Please ask for written permission before copying or reusing them."],
      ["Limits on our responsibility", "We provide the website and products with reasonable care. To the extent the law allows, Zibura is responsible only for direct losses that result from our failure to meet these terms, and the total is limited to the amount you paid for the order concerned. Nothing in these terms limits rights that the law gives you as a consumer."],
      ["Governing law", "These terms are governed by the laws of Alberta and the federal laws of Canada that apply there."],
      ["Changes", "We may update these terms. The date at the top of the page shows the latest version, and the version in place when you order applies to that order."],
      ["Contact us", "Questions about these terms go to " + P_EMAIL + "."]
    ]
  },
  "shipping-returns": {
    title: "Shipping and returns",
    intro: "Everything you need to know about how Zibura orders travel to you and how to return them.",
    sections: [
      ["Processing", "We prepare orders within 5 to 7 business days. You receive an email with tracking details when your order ships."],
      ["Where we ship", "We ship to the countries available at checkout. Delivery costs and estimated delivery times appear at checkout before you pay."],
      ["Taxes and duties", "Canadian orders include applicable sales taxes. International orders may carry import duties and taxes that the destination country charges. The carrier or customs authority collects these on delivery."],
      ["Delivery issues", "If your order arrives damaged, or a different item arrives than the one you ordered, email " + P_EMAIL + " within 7 days of delivery with your order number and a photo. We will replace the item or refund you."],
      ["Returns", "You can return unworn, unwashed items with their tags attached within 30 days of delivery for a refund to your original payment method."],
      ["Items for exchange", "Email " + P_EMAIL + " with your order number to exchange an item for another size or colour. We will confirm availability and arrange the exchange."],
      ["Items that are final sale", "Gift cards, opened fragrance and candles, and personalised items are final sale because of hygiene and the nature of the product."],
      ["How to start a return", "Email " + P_EMAIL + " with your order number and the items you wish to return. We reply with return instructions and the return address."],
      ["Refunds", "We process a refund within 7 business days after the returned items reach us. Your bank may take a few more days to show it. Original shipping charges are refunded when the return is due to our error."],
      ["Questions", "Email " + P_EMAIL + " and we will help."]
    ]
  }
};
Object.keys(POLICIES).forEach((slug) => {
  const pol = POLICIES[slug];
  write(`${slug}/index.html`, layout({
    title: TR(`policy.${slug}.meta-title`, `${pol.title} | Zibura`),
    description: TR(`policy.${slug}.meta-description`, pol.intro),
    page: "policy",
    body: `<main>
<section class="page-head"><div class="wrap">
  ${crumbs([[T("site.home", "Home"), "/"], [T(`policy.${slug}.title`, pol.title)]])}
  <h1 class="display rise">${words(TR(`policy.${slug}.title`, pol.title))}</h1>
  <p class="fade">${T(`policy.${slug}.intro`, pol.intro)}</p>
  <p class="policy-date">${T("policy.updated", "Last updated")} ${T("policy.date", POLICY_DATE)}</p>
</div></section>
<section class="section" style="padding-top:clamp(8px,2vw,24px)"><div class="wrap"><div class="policy">
${pol.sections.map((s, i) => `  <section><h2>${T(`policy.${slug}.s${i + 1}-h`, s[0])}</h2><p>${T(`policy.${slug}.s${i + 1}-p`, s[1])}</p></section>`).join("\n")}
  <nav class="policy-more" aria-label="${esc(TR("policy.nav-label", "Policies"))}">${Object.keys(POLICIES).filter((k) => k !== slug).map((k) => `<a href="/${k}/">${T(`policy.${k}.title`, POLICIES[k].title)}</a>`).join("")}<a href="/contact/">${T("contact.link", "Contact")}</a></nav>
</div></div></section>
</main>`
  }));
});

// Contact
write("contact/index.html", layout({
  title: TR("contact.meta-title", "Contact | Zibura"),
  description: TR("contact.meta-description", "Email Zibura at hello@zibura.com for questions about orders, returns, Zi Residency or anything else."),
  page: "policy",
  body: `<main>
<section class="page-head"><div class="wrap">
  ${crumbs([[T("site.home", "Home"), "/"], [T("contact.title", "Contact")]])}
  <h1 class="display rise">${words(TR("contact.title", "Contact"))}</h1>
  <p class="fade">${T("contact.intro", "Questions about an order, a return, Zi Residency or anything else go to one inbox.")}</p>
</div></section>
<section class="section" style="padding-top:clamp(8px,2vw,24px)"><div class="wrap"><div class="policy">
  <section><h2>${T("contact.email-h", "Email us")}</h2><p><a class="contact-mail" href="mailto:${esc(P_EMAIL)}">${esc(P_EMAIL)}</a></p></section>
  <section><h2>${T("contact.orders-h", "Orders and returns")}</h2><p>${T("contact.orders-p", "Include your order number in your email. Delivery times and the returns process are on the")} <a href="/shipping-returns/">${T("policy.shipping-link", "Shipping and returns")}</a> ${T("contact.orders-p2", "page.")}</p></section>
  <section><h2>${T("contact.social-h", "Follow Zibura")}</h2><p><a href="${LINKS.instagram || "https://www.instagram.com/thezibura/"}" target="_blank" rel="noopener">${T("forms.instagram", "Instagram")}</a> &nbsp; <a href="${LINKS.tiktok || "https://www.tiktok.com/@thezibura"}" target="_blank" rel="noopener">${T("forms.tiktok", "TikTok")}</a></p></section>
  <section><h2>${T("contact.base-h", "Where we are")}</h2><p>${T("contact.base-p", "Zibura is based in Calgary, Alberta, Canada.")}</p></section>
  <nav class="policy-more" aria-label="${esc(TR("policy.nav-label", "Policies"))}">${Object.keys(POLICIES).map((k) => `<a href="/${k}/">${T(`policy.${k}.title`, POLICIES[k].title)}</a>`).join("")}</nav>
</div></div></section>
</main>`
}));

// Zi Residency
const RIGHTS = [
  ["Access to public content, collections, capsules and public information", "Yes", "Yes"],
  ["Early insight into open opportunities, jobs, casting calls and creative openings", "Yes", "Yes"],
  ["Attend public Republic events", "Yes", "Yes"],
  ["Participate in selected community consultations", "Where open to all members", "Yes, where applicable"],
  ["Vouch for a Zi Resident during a Zitizenship Call", "No", "Yes"],
  ["Eligibility for Republic appointments and Ministry roles", "No", "Yes"],
  ["Zi Card", "Yes", "Yes"],
  ["Zi Republic passport", "No", "Yes"]
].map((r, i) => [TR(`zi-card.right-${i + 1}`, r[0]), TR(`zi-card.right-${i + 1}-resident`, r[1]), TR(`zi-card.right-${i + 1}-zitizen`, r[2])]);
const FAQS = [
  ["What is Zi Republic?", "Zi Republic is Zibura's country. It has a flag, a currency, public institutions and a membership open to anyone who applies. International relations remain a work in progress."],
  ["What is Zi Residency?", "Zi Residency is the Republic's membership. Anyone may apply. Applicants become Zi Residents and receive a Zi Card."],
  ["Does a Zi Card make someone a Zitizen?", "No. A Zi Card confirms Zi Residency. Zitizenship is an additional recognition based on meaningful participation over time."],
  ["Do Zitizens keep their Zi Cards?", "Yes. Every Zitizen keeps their Zi Card and receives a Zi Republic passport as an additional credential."],
  ["Does a Zi Card expire?", "A Zi Card is valid for five years from the date of issue. The date through which it is valid shows on the card. Renew from your account before that date. A change of favourite colour does not affect it."],
  ["Can Zillar buy Zi Residency or Zitizenship?", "No. Zillar cannot be used to purchase Zi Residency or Zitizenship."],
  ["What is Zi Day?", "Zi Day is the Republic's founding day. Zi Residents and Zitizens mark it each year."],
  ["What is Ziesta?", "Ziesta is the Republic's festival of rest, a time to slow down and gather."],
  ["Does a change in style affect residency?", "No. A change in personal style does not affect residency status, and no new application is required. The Republic recognizes that wardrobes may change."]
].map((r, i) => [TR(`zi-card.faq-${i + 1}-q`, r[0]), TR(`zi-card.faq-${i + 1}-a`, r[1])]);
write(
  "zi-card/index.html",
  layout({
    title: TR("zi-card.meta-title", "Apply for Zi Residency | Zibura"),
    description: TR("zi-card.meta-description", "Zi Residency is the Republic's membership. Anyone may apply. Applicants become Zi Residents and receive a Zi Card."),
    page: "zicard",
    body: `<main>
<section class="page-head"><div class="wrap">
  ${crumbs([[T("site.home", "Home"), "/"], [T("site.zi-residency", "Zi Residency")]])}
  <p class="small">${T("zi-card.eyebrow", "Residency is open.")}</p>
  <h1 class="display rise">${words(TR("zi-card.title", "Apply for Zi Residency."))}</h1>
  <p class="fade">${T("zi-card.lead", "Completed applications are processed by Republic Administration. Applicants become Zi Residents and receive a Zi Card, the everyday credential of membership.")}</p>
</div></section>
<section class="section" style="padding-top:clamp(16px,3vw,40px)"><div class="wrap split">
  <div data-reveal>${flipCard()}</div>
  <div data-reveal>
    <ol class="steps">
      <li><div><b>${T("zi-card.create-your-account", "Create your account.")}</b><span>${T("zi-card.create-your-account-text", "Your Zi Residency application begins in your account. The Republic has enough paperwork already.")}</span></div></li>
      <li><div><b>${T("zi-card.upload-your-portrait-and-apply", "Upload your portrait and apply.")}</b><span>${T("zi-card.your-portrait-appears-on-your", "Your portrait appears on your Zi Card, so choose one that looks like you. The Republic recommends a good photo.")}</span></div></li>
      <li><div><b>${T("zi-card.collect-your-zi-card", "Collect your Zi Card.")}</b><span>${T("zi-card.once-your-application-is-accepted", "Once your application is accepted, your Zi Card appears in your account, ready to download. It is valid for five years from the date of issue. Republic Administration has noted the date.")}</span></div></li>
    </ol>
    <p style="margin-top:40px"><a class="btn" href="/account/">${T("zi-card.start-your-application", "Start your application")}</a></p>
    <p class="small" style="margin-top:16px">${T("zi-card.want-first-word", "Want first word on the capsule collection?")} <a href="/waitlist/">${T("zi-card.join-the-waitlist", "Join the waitlist")}</a>.</p>
  </div>
</div></section>

<section class="section" id="rights" style="padding-top:0"><div class="wrap">
  <h2 class="display" data-reveal>${T("zi-card.rights-title", "Rights of Zi Residents and Zitizens.")}</h2>
  <div class="table-wrap" data-reveal>
    <table class="rights">
      <thead><tr><th scope="col">${T("zi-card.rights-col-right", "Right")}</th><th scope="col">${T("zi-card.rights-col-resident", "Zi Resident")}</th><th scope="col">${T("zi-card.rights-col-zitizen", "Zitizen")}</th></tr></thead>
      <tbody>
${RIGHTS.map(([r, a, c]) => `        <tr><th scope="row">${r}</th><td>${a}</td><td>${c}</td></tr>`).join("\n")}
      </tbody>
    </table>
  </div>
</div></section>

<section class="section navy-band" id="zitizenship"><div class="wrap split">
  <h2 class="display" data-reveal>${T("zi-card.parts-title", "Residency, Zitizenship and Zillar.")}</h2>
  <dl class="plain-list light" data-reveal>
    <div><dt>${T("zi-card.zi-residency", "Zi Residency")}</dt><dd>${T("zi-card.zi-residency-text", "The Republic's membership. Anyone may apply. Applicants become Zi Residents and receive a Zi Card.")}</dd></div>
    <div><dt>${T("zi-card.zitizenship", "Zitizenship")}</dt><dd>${T("zi-card.zitizenship-text", "An additional recognition. Zi Residents may apply during a Zitizenship Call. Applications are reviewed based on meaningful participation over time. Every approved Zitizen keeps their Zi Card and receives a Zi Republic passport.")}</dd></div>
    <div id="zillar"><dt>${T("zi-card.zillar", "Zillar")}</dt><dd>${T("zi-card.zillar-text", "The Republic's official currency and rewards system. Zillar can be earned through eligible purchases and selected participation, then redeemed for designated rewards, benefits and experiences. Product prices remain listed in standard currencies.")}</dd></div>
  </dl>
</div></section>

<section class="section"><div class="wrap split">
  <h2 class="display" data-reveal>${T("zi-card.faq-title", "Questions.")}</h2>
  <div class="faq" data-reveal>
${FAQS.map(([q, a]) => `    <details><summary>${q}</summary><p>${a}</p></details>`).join("\n")}
  </div>
</div></section>
</main>`
  })
);


// Account and application
write(
  "account/index.html",
  layout({
    title: TR("account.meta-title", "Your Zibura account | Zibura"),
    description: TR("account.meta-description", "Create an account to view your orders, save your details and find your Zi Card."),
    page: "account",
    body: `<main>
<section class="page-head"><div class="wrap">
  ${crumbs([[T("site.home", "Home"), "/"], [T("site.your-account", "Your account")]])}
  <h1 class="display rise" id="acct-h">${words(TR("account.title", "Your Zibura account."))}</h1>
  <p class="fade" id="acct-sub">${T("account.create-an-account-to-open", "Create an account to view your orders, save your details and find your Zi Card.")}</p>
</div></section>
<section class="section" style="padding-top:clamp(16px,3vw,40px)"><div class="wrap">
  <div id="acct-loading" class="small">${T("account.checking-your-papers", "Loading.")}</div>

  <script type="application/json" id="quiz-data">${JSON.stringify({ axes: AXES, questions: PLACEMENT.map((q) => [q[0], q[1]]), profiles: PROFILES })}</script>
  <div id="v-auth" class="form-card" hidden>
    <div class="tabs" role="tablist">
      <button type="button" class="tab on" data-tab="signup">${T("account.create-account", "Create account")}</button>
      <button type="button" class="tab" data-tab="login">${T("account.sign-in", "Sign in")}</button>
    </div>
    <form id="f-signup" class="acct-form">
      <div class="form-grid">
        <div><label for="s-first">${T("account.first-name", "First name")}</label><input id="s-first" name="first" autocomplete="given-name" required></div>
        <div><label for="s-last">${T("account.last-name", "Last name")}</label><input id="s-last" name="last" autocomplete="family-name" required></div>
        <div><label for="s-bm">${T("account.birthday-month", "Birthday month")}</label><select id="s-bm" name="birth_month">${monthOptions}</select></div>
        <div><label for="s-bd">${T("account.birthday-day", "Birthday day")}</label><select id="s-bd" name="birth_day">${dayOptions}</select></div>
        <div class="full"><label for="s-email">${T("account.email", "Email")}</label><input id="s-email" name="email" type="email" autocomplete="email" required></div>
        <div class="full"><label for="s-pass">${T("account.password-8-characters-or-more", "Password (8 characters or more)")}</label><input id="s-pass" name="password" type="password" minlength="8" autocomplete="new-password" required></div>
      </div>
      <p class="form-legal">${T("policy.agree-prefix", "By continuing you agree to the")} <a href="/terms/">${T("policy.terms-link", "Terms")}</a> ${T("policy.and", "and")} <a href="/privacy/">${T("policy.privacy-link", "Privacy")}</a>.</p>
      <button class="btn" type="submit">${T("account.create-account-button", "Create account")}</button>
      <div class="msg" role="status"></div>
    </form>
    <form id="f-login" class="acct-form" hidden>
      <div class="form-grid">
        <div class="full"><label for="l-email">${T("account.email", "Email")}</label><input id="l-email" name="email" type="email" autocomplete="email" required></div>
        <div class="full"><label for="l-pass">${T("account.password", "Password")}</label><input id="l-pass" name="password" type="password" autocomplete="current-password" required></div>
      </div>
      <button class="btn" type="submit">${T("account.sign-in-button", "Sign in")}</button>
      <p class="small" style="margin-top:14px"><button type="button" class="linkbtn" id="show-forgot">${T("account.forgot-your-password", "Forgot your password?")}</button></p>
      <div class="msg" role="status"></div>
    </form>
    <form id="f-forgot" class="acct-form" hidden>
      <p class="sub">${T("account.enter-the-email-on-your", "Enter the email on your account. Republic Administration will send a reset link that works for one hour.")}</p>
      <div class="form-grid"><div class="full"><label for="fg-email">${T("account.email", "Email")}</label><input id="fg-email" name="email" type="email" autocomplete="email" required></div></div>
      <button class="btn" type="submit">${T("account.send-reset-link", "Send reset link")}</button>
      <p class="small" style="margin-top:14px"><button type="button" class="linkbtn" id="back-login">${T("account.back-to-sign-in", "Back to sign in")}</button></p>
      <div class="msg" role="status"></div>
    </form>
  </div>

  <div id="dash" hidden>
    <div class="dash-head">
      <div class="dash-avatar" id="d-avatar"></div>
      <div class="dash-who"><h2 class="display" id="d-name"></h2><p id="d-meta" class="small"></p></div>
      <button type="button" class="btn line" id="signout">${T("account.sign-out", "Sign out")}</button>
    </div>
    <nav class="dash-nav" id="dash-nav" aria-label="Account sections">
      <button type="button" data-sec="overview">${T("account.overview", "Overview")}</button>
      <button type="button" data-sec="card">${T("account.zi-card", "Zi Card")}</button>
      <button type="button" data-sec="orders">${T("account.orders", "Orders")}</button>
      <button type="button" data-sec="style">${T("account.style", "Style Compass")}</button>
      <button type="button" data-sec="saved">${T("account.saved", "Saved")}</button>
      <button type="button" data-sec="addresses">${T("account.addresses", "Addresses")}</button>
      <button type="button" data-sec="profile">${T("account.profile", "Profile")}</button>
      <button type="button" data-sec="prefs">${T("account.sizes", "Sizes")}</button>
      <button type="button" data-sec="security">${T("account.security", "Security")}</button>
    </nav>
    <section class="panel" data-panel="overview"></section>
    <section class="panel" data-panel="card" hidden>
  <div id="v-apply" class="form-card" hidden>
    <form id="f-apply" class="acct-form">
      <div class="form-grid">
        <div class="full"><label for="a-name">${T("account.name-as-it-will-appear", "Name as it will appear on your Zi Card")}</label><input id="a-name" name="name" maxlength="40" required></div>
        <div class="full"><label for="a-photo">${T("account.portrait-photo-jpg-png-or", "Portrait photo (JPG, PNG, or WebP)")}</label><input id="a-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" required></div>
      </div>
      <div class="cropper" id="a-crop" hidden>
        <canvas id="a-canvas" width="562" height="724" aria-label="Portrait frame. Drag to position."></canvas>
        <label class="zoom">${T("account.zoom", "Zoom")} <input type="range" id="a-zoom" min="1" max="3" step="0.01" value="1"></label>
        <p class="small">${T("account.drag-the-photo-to-place", "Drag the photo to place your face inside the frame, then use the slider to zoom. This is exactly how it will appear on your card.")}</p>
      </div>
      <p class="small">${T("account.use-a-clear-front-facing", "Use a clear, front facing portrait with your face and shoulders in view.")}</p>
      <button class="btn" type="submit">${T("account.submit-application", "Submit application")}</button>
      <div class="msg" role="status"></div>
    </form>
  </div>

  <div id="v-pending" class="form-card" hidden>
    <h2 class="display" style="font-size:clamp(28px,3.4vw,40px)">${T("account.your-application-is-on-the", "Your Zi Residency application is received.")}</h2>
    <p class="sub">${T("account.the-ministry-of-zi-interior", "Republic Administration is processing it now. Check your account in a few days for your Zi Card.")}</p>
  </div>

  <div id="v-declined" class="form-card" hidden>
    <h2 class="display" style="font-size:clamp(28px,3.4vw,40px)">${T("account.application-returned-for-revision", "Application not approved.")}</h2>
    <p class="sub">${T("account.the-ministry-did-not-approve", "Republic Administration did not approve this application. You are welcome to apply again with a new portrait.")}</p>
    <button class="btn" type="button" id="reapply">${T("account.apply-again", "Apply again")}</button>
  </div>

  <div id="v-card" hidden>
    <div class="card-out"><canvas id="card-canvas" width="2022" height="1274" aria-label="Your Zi Card"></canvas></div>
    <p style="margin-top:28px"><button class="btn" type="button" id="dl-card">${T("account.download-your-zi-card", "Download your Zi Card")}</button></p>
  </div>

    </section>
    <section class="panel" data-panel="orders" hidden></section>
    <section class="panel" data-panel="style" hidden></section>
    <section class="panel" data-panel="saved" hidden></section>
    <section class="panel" data-panel="addresses" hidden></section>
    <section class="panel" data-panel="profile" hidden></section>
    <section class="panel" data-panel="prefs" hidden></section>
    <section class="panel" data-panel="security" hidden></section>
    <p id="acct-out" hidden><span id="acct-who"></span></p>
  </div>
</div></section>
</main>`
  })
);

// Password reset
write(
  "reset/index.html",
  layout({
    title: TR("reset.meta-title", "Reset your password | Zibura"),
    description: TR("reset.meta-description", "Choose a new password for your Zibura account."),
    page: "reset",
    body: `<main>
<section class="page-head"><div class="wrap">
  ${crumbs([[T("site.home", "Home"), "/"], [T("reset.choose-a-new-password", "Choose a new password")]])}
  <h1 class="display rise">${words(TR("reset.choose-a-new-password", "Choose a new password."))}</h1>
  <p class="fade">${T("reset.pick-something-of-8-characters", "Pick something of 8 characters or more. Signing in on other devices will be asked again.")}</p>
</div></section>
<section class="section" style="padding-top:clamp(16px,3vw,40px)"><div class="wrap">
  <form id="f-reset" class="form-card acct-form">
    <div class="form-grid"><div class="full"><label for="rs-pass">${T("reset.new-password", "New password")}</label><input id="rs-pass" type="password" minlength="8" autocomplete="new-password" required></div></div>
    <button class="btn" type="submit">${T("reset.save-new-password", "Save new password")}</button>
    <div class="msg" role="status"></div>
  </form>
</div></section>
</main>`
  })
);

// Ministry review page
write(
  "admin/index.html",
  layout({
    title: TR("admin.meta-title", "Republic Administration | Zibura"),
    description: TR("admin.meta-description", "Republic Administration review desk."),
    page: "admin",
    body: `<main>
<section class="page-head"><div class="wrap">
  <h1 class="display">Ministry of Republic Administration.</h1>
</div></section>
<section class="section" style="padding-top:16px"><div class="wrap">
  <form id="adm-key" class="form-card"><div class="form-grid"><div class="full"><label for="adm-k">Admin key</label><input id="adm-k" type="password" autocomplete="off"></div></div><button class="btn" type="submit" style="margin-top:20px">Open desk</button><div class="msg" role="status"></div></form>
  <div id="adm-desk" hidden>
    <div class="tabs"><button class="tab on" data-st="pending">Pending</button><button class="tab" data-st="approved">Approved</button><button class="tab" data-st="declined">Declined</button></div>
    <div id="adm-list" class="adm-list"></div>
    <form id="adm-reset" class="form-card" style="margin-top:56px"><h2 class="display" style="font-size:28px;margin-bottom:16px">Reset a member's password</h2><div class="form-grid"><div class="full"><label for="r-e">Member email</label><input id="r-e" name="email" type="email" required></div><div class="full"><label for="r-p">New password (8 characters or more)</label><input id="r-p" name="password" type="text" minlength="8" required></div></div><button class="btn" type="submit" style="margin-top:20px">Set new password</button><div class="msg" role="status"></div></form>
  </div>
</div></section>
</main>`
  }).replace("<head>", '<head>\n<meta name="robots" content="noindex,nofollow">')
);

// Founder's note
write(
  "note/index.html",
  layout({
    title: TR("note.meta-title", "From the Zi-in-Chief | Zibura"),
    description: TR("note.meta-description", "A letter from Ruova, founder of Zibura and Zi-in-Chief."),
    page: "note",
    body: `<main class="note">
  <div class="photo" data-reveal><div class="photo-frame"><img src="/assets/ruova.jpg" alt="Ruova, founder of Zibura" width="1000" height="1500"></div>
    <h1 class="who-name">${T("note.ruova", "Ruova")}</h1>
    <p class="who-role">${T("note.ziinchief", "Zi-in-Chief")}</p>
  </div>
  <div class="body">
    <p class="lead-b scrollwords" data-scrollwords>${T("founder_lead", "Expression is the most human thing we do. There's no single right way to exist, and every side of you, every version, deserves space.")}</p>
    <div class="letter">
      <p data-reveal>${T("founder_p1", "Fashion has always been a language to me, maybe the first one I ever really learned to speak on my own terms. It's how I've found the truest way to express who I am.")}</p>
      <p data-reveal>${T("note.i-wanted-that-for-other", "I wanted that for other people too. Because if I'm honest, life comes with so many rules and regulations, so many quiet ideas about what's appropriate, what's too much, what belongs together and what doesn't. One morning I just thought, I'm going to build a new country because who is going to check me? So I did.")}</p>
      <p data-reveal>${T("note.thats-zi-republic-built-on", "That's Zi Republic, built on the idea that people deserve a place to actually express themselves, however that looks for them. This was never about re-educating anyone or writing a new set of rules to replace the old ones. It's about giving people somewhere to belong, exactly as they already are.")}</p>
    </div>
    <blockquote class="pull" data-reveal><span class="qm" aria-hidden="true">&ldquo;</span><span class="pq scrollwords" data-scrollwords>${T("note.pull-quote", "How you show up in the world is a language. We built Zibura so more people could speak it fluently, on their own terms.")}</span></blockquote>
    <div class="sig-box" data-reveal><p class="signature" id="sig" aria-label="Ruova">${T("note.ruova", "Ruova")}</p></div>
  </div>
</main>`
  })
);

// Shop
write(
  "shop/index.html",
  layout({
    title: TR("shop.meta-title", "Shop the collection | Zibura"),
    description: TR("shop.meta-description", "Every Zibura product, with filters for audience, department, type, material, colour and size."),
    page: "shop",
    body: `<main class="wrap">
${crumbs([[T("site.home", "Home"), "/"], [T("shop.shop", "Shop")]])}
<div class="page-head" style="padding-left:0;padding-top:0;padding-right:0"><h1 class="display rise">${words(TR("shop.title", "Shop the collection."))}</h1><p class="fade">${T("shop.subtitle", "The capsule collection is launching soon. Choose a colour and a size, then add the product to your cart.")}</p><p style="margin-top:16px"><a class="btn line small-btn" href="/style-compass/">${T("home.compass-button", "Take the Style Compass")}</a></p></div>
<div class="lk-switch shop-switch"><a href="/shop/" class="on" aria-current="page">${T("looks.switch-all", "All pieces")}</a><a href="/looks/">${T("looks.switch-looks", "Zi Looks")}</a></div>
<div class="toolbar">
  <button type="button" class="btn line small-btn" id="open-filters">${T("shop.filters", "Filters")}</button>
  <p class="count" id="count" role="status"></p>
  <label class="sort">${T("shop.sort", "Sort")} <select id="sort" aria-label="Sort products">
    <option value="new">${T("shop.newest", "Newest")}</option>
    <option value="rated">${T("shop.top-rated", "Top rated")}</option>
    <option value="low">${T("shop.price-low-to-high", "Price, low to high")}</option>
    <option value="high">${T("shop.price-high-to-low", "Price, high to low")}</option>
    <option value="az">${T("shop.name-a-to-z", "Name, A to Z")}</option>
  </select></label>
</div>
<div class="chips" id="chips"></div>
<div class="shop-layout">
  <aside class="filters-pane" id="filters-pane" aria-label="Filters">
    <div class="pane-head"><strong>${T("shop.filters", "Filters")}</strong><button type="button" class="close-pane" id="close-filters" aria-label="Close filters">&times;</button></div>
    <div id="facets"></div>
    <div class="pane-foot"><button type="button" class="btn" id="apply-filters">${T("shop.show-products", "Show products")}</button></div>
  </aside>
  <div>
    <div class="grid shop-grid" id="grid"></div>
  </div>
</div>
<div style="height:clamp(56px,8vw,110px)"></div>
</main>`
  })
);

// Product pages
function stars(avg) {
  return `<span class="stars" style="--p:${Math.round((avg / 5) * 100)}%" aria-hidden="true">★★★★★</span>`;
}
products.forEach((p) => {
  const colors = p.colors
    .map(
      (c, k) =>
        `<label class="swatch"><input type="radio" name="color" value="${esc(c)}"${k === 0 ? " checked" : ""}><span class="dot" style="background:${COLORS[c] || "#eef6ff"}" title="${esc(c)}"></span><span class="sr">${esc(c)}</span></label>`
    )
    .join("\n        ");
  const sizes = (p.sizes || [])
    .map((s, k) => `<label><input type="radio" name="size" value="${esc(s)}"${k === 0 ? " checked" : ""}><span>${esc(s)}</span></label>`)
    .join("\n        ");
  const related = products.filter((q) => q.slug !== p.slug && q.category === p.category).slice(0, 4);
  const more = (related.length ? related : products.filter((q) => q.slug !== p.slug).slice(0, 4)).map(card).join("\n");
  write(
    `product/${p.slug}/index.html`,
    layout({
      title: `${p.name} | Zibura`,
      description: p.description,
      page: "piece",
      body: `<main class="wrap piece-page" data-slug="${esc(p.slug)}">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">${T("site.home", "Home")}</a> <span aria-hidden="true">/</span> <a href="/shop/">${T("shop.shop", "Shop")}</a> <span>/</span> <a href="/shop/?audience=${esc(p.audience[0])}">${esc(p.audience.join(" and "))}</a> <span>/</span> <a href="/shop/?category=${encodeURIComponent(p.category)}">${esc(p.category)}</a> <span>/</span> <a href="/shop/?category=${encodeURIComponent(p.category)}&amp;type=${encodeURIComponent(p.type)}">${esc(p.type)}</a> <span aria-hidden="true">/</span> <span aria-current="page">${esc(p.name)}</span></nav>
  <div class="piece">
    <div class="gallery" aria-label="Photos of ${esc(p.name)}">
      ${[1, 2, 3, 4].map((n) => ({ n, img: photo(`${p.slug}-${n}`, `${p.name}, photo ${n}`) })).filter((x) => x.img || x.n === 1).map((x) => `<div class="ph${x.n === 1 ? " big" : ""}">${x.img}</div>`).join("")}
    </div>
    <div class="buy">
      <p class="crumb">${esc(p.collection)}, ${esc(p.capsule)}</p>
      <h1 class="display">${esc(p.name)}</h1>
      <a class="rate-line" href="#reviews" data-rating-for="${esc(p.slug)}" data-long="1"></a>
      <span class="price" data-price-for="${esc(p.slug)}"></span>
      <p class="desc">${esc(p.description)}</p>
      <form id="add-form">
        <fieldset class="field">
          <legend>${T("shop.colour", "Colour:")} <b id="color-name">${esc(p.colors[0])}</b></legend>
          <div class="opts swatches">
        ${colors}
          </div>
        </fieldset>
        ${sizes ? `<fieldset class="field">
          <legend>${T("shop.size", "Size")}</legend>
          <div class="opts">
        ${sizes}
          </div>
        </fieldset>` : ""}
        <button class="btn wide" type="submit">${T("shop.add-to-cart", "Add to cart")}</button>
        <button class="btn line wide" type="button" id="save-btn" data-slug="${p.slug}">${T("shop.save", "Save")}</button>
        <div class="msg" id="msg" role="status"></div>
      </form>
    </div>
  </div>

  <section class="reviews" id="reviews" aria-labelledby="rev-h">
    <div class="rev-grid">
      <div>
        <h2 class="display" id="rev-h">${T("shop.reviews", "Reviews")}</h2>
        <div id="rev-summary" class="rev-summary"></div>
      </div>
      <div>
        <div id="rev-list" class="rev-list"></div>
        <form id="review-form" class="review-form" novalidate>
          <h3>${T("shop.write-review", "Write a review")}</h3>
          <fieldset class="rate-input">
            <legend>${T("shop.your-rating", "Your rating")}</legend>
            <div class="rate-stars">
              ${[5, 4, 3, 2, 1].map((n) => `<input type="radio" id="r${n}" name="rating" value="${n}"><label for="r${n}" title="${n} out of 5">★</label>`).join("")}
            </div>
          </fieldset>
          <div class="form-grid">
            <div class="full"><label for="rv-name">${T("shop.your-name", "Your name")}</label><input id="rv-name" name="name" autocomplete="name" maxlength="60"></div>
            <div class="full"><label for="rv-title">${T("shop.headline", "Headline")}</label><input id="rv-title" name="title" maxlength="100"></div>
            <div class="full"><label for="rv-body">${T("shop.your-comment", "Your comment")}</label><textarea id="rv-body" name="body" rows="5" maxlength="1500"></textarea></div>
            <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
          </div>
          <button class="btn" type="submit">${T("shop.submit-review", "Submit review")}</button>
          <div class="msg" id="rv-msg" role="status"></div>
        </form>
      </div>
    </div>
  </section>

  <section class="more">
    <div class="section-head"><h2>${esc(TR("shop.more-from", "More from {name}").replace("{name}", p.category))}</h2><a class="text-link" href="/shop/?category=${encodeURIComponent(p.category)}">${T("shop.see-all", "See all")}</a></div>
    <div class="grid">
${more}
    </div>
  </section>
</main>`
    })
  );
});

// Cart
write(
  "cart/index.html",
  layout({
    title: TR("cart.meta-title", "Your cart | Zibura"),
    description: TR("cart.meta-description", "Your Zibura cart."),
    page: "cart",
    body: `<main class="wrap">
${crumbs([[T("site.home", "Home"), "/"], [T("site.your-cart", "Your cart")]])}
<div class="page-head" style="padding-left:0;padding-top:0;padding-right:0"><h1 class="display rise">${words(TR("cart.title", "Your cart."))}</h1></div>
<div id="cart"></div>
<div class="msg" id="cart-msg" role="status"></div>
<div style="height:clamp(56px,8vw,110px)"></div>
</main>`
  })
);

// Thank you
write(
  "thanks/index.html",
  layout({
    title: TR("thanks.meta-title", "Order confirmation | Zibura"),
    description: TR("thanks.meta-description", "Your payment was received."),
    page: "thanks",
    body: `<main class="thanks">
<h1 class="display rise">${words(TR("thanks.title", "Payment received."))}</h1>
<p class="fade">${T("thanks.text", "Thank you for your order. Orders appear in your account once placed.")}</p>
<p class="fade" id="order-no" hidden></p>
<a class="btn" href="/shop/">${T("thanks.back-to-shop", "Continue shopping")}</a>
</main>`
  })
);

// ---------- Zi Looks: the outfit shop ----------
const LOOK_POS = { Outerwear: [50, 36], Topwear: [50, 32], Fullwear: [56, 52], Bottomwear: [50, 64], Shoes: [50, 91], Totes: [22, 62], Jewelry: [60, 20], Scarves: [42, 25], Perfume: [80, 76], "Tech Accessories": [78, 70], Stationery: [78, 70], Candles: [80, 76] };
const DEFAULT_LOOKS = [
  ["Women", "halo,tidal,cove,orbit"], ["Men", "ember,meridian,stride,pocket"], ["Women", "tidal,kite,cove"], ["Men", "ember,meridian,stride,orbit"],
  ["Women", "halo,tidal,kite,rumour"], ["Men", "meridian,ember,kite,stride"], ["Women", "halo,cove,orbit"], ["Men", "ember,meridian,stride,kite"],
  ["Women", "tidal,orbit,rumour"], ["Men", "ember,meridian,stride,rumour"], ["Women", "halo,tidal,kite,orbit"], ["Men", "ember,meridian,pocket,kite"]
].map((r, i) => ({ id: i + 1, name: "Look " + (i + 1), audience: r[0], pieces: r[1] }));
const LOOKS = (fromSheet("looks.json") || DEFAULT_LOOKS).map((l, i) => {
  const pieces = String(l.pieces || "").split(",").map((s) => s.trim()).filter(Boolean).map((s) => {
    const [slug, x, y] = s.split(":");
    const p = products.find((q) => q.slug === slug);
    if (!p) return null;
    const d = LOOK_POS[p.type] || [50, 50];
    return { p, x: x ? Number(x) : d[0], y: y ? Number(y) : d[1] };
  }).filter(Boolean);
  return { n: i + 1, name: l.name || "Look " + (i + 1), audience: l.audience || "", blurb: l.blurb || "", pieces };
}).filter((l) => l.pieces.length);
const lookImg = (l) => media("look-" + l.n, l.name);
const lookBlurb = (l) => l.blurb || (l.pieces.length + " pieces: " + l.pieces.map((q) => q.p.name).join(", ") + ".");
// Four depth rows. Far rows are small, faint and blurred. The near row is large and soft.
const LOOK_ROWS = [
  { id: "far", step: 5, every: 1, rev: 1 },
  { id: "back", step: 3, every: 1, rev: 0 },
  { id: "mid", step: 0, every: 1, rev: 0 },
  { id: "near", step: 7, every: 3, rev: 0 }
];
function lookRow(r) {
  const n = LOOKS.length;
  let order = LOOKS.map((_, i) => (i + r.step) % n);
  if (r.rev) order = order.reverse();
  order = order.filter((_, i) => i % r.every === 0);
  return `<div class="lk-row lk-${r.id}" data-lk-row="${r.id}">${order.map((i) => `<button type="button" class="lk-f" data-look="${i}" aria-label="${esc(LOOKS[i].name + ", " + LOOKS[i].audience)}"${r.id === "mid" ? "" : ' tabindex="-1"'}>${lookImg(LOOKS[i])}</button>`).join("")}</div>`;
}

function lookDetail(l) {
  return `<section class="lk-detail" data-detail="${l.n - 1}" hidden aria-label="${esc(l.name)}">
    <div class="lk-info">
      <p class="lk-aud">${esc(l.audience)}</p>
      <h2 class="lk-name">${esc(l.name)}</h2>
      <p class="lk-blurb">${esc(lookBlurb(l))}</p>
    </div>
    <div class="lk-fig">${lookImg(l)}</div>
    <aside class="lk-panel">
      <p class="lk-kicker">${l.pieces.length} ${T("looks.pieces", "pieces")}</p>
      <div class="lk-big">${l.pieces.map((q, k) => `<span class="lk-bigimg${k === 0 ? " on" : ""}" data-piece="${esc(q.p.slug)}">${photo(q.p.slug + "-1", q.p.name) || '<i class="ph-empty"></i>'}</span>`).join("")}</div>
      <ul class="lk-pieces">
        ${l.pieces.map((q, k) => `<li data-piece="${esc(q.p.slug)}"${k === 0 ? ' class="on"' : ""}>
          <a href="/product/${esc(q.p.slug)}/"><span class="lk-th">${photo(q.p.slug + "-1", q.p.name) || '<i class="ph-empty"></i>'}</span><span class="lk-meta"><b>${esc(q.p.name)}</b><em>${esc(q.p.type)}</em></span><span class="price" data-price-for="${esc(q.p.slug)}"></span></a>
          <div class="lk-buy">
            <select class="lk-col" aria-label="${esc(T("looks.colour", "Colour"))}: ${esc(q.p.name)}">${q.p.colors.map((c) => `<option>${esc(c)}</option>`).join("")}</select>
            ${(q.p.sizes || []).length ? `<select class="lk-size" aria-label="${esc(T("looks.size", "Size"))}: ${esc(q.p.name)}">${q.p.sizes.length > 1 ? `<option value="">${T("looks.size", "Size")}</option>` : ""}${q.p.sizes.map((s) => `<option>${esc(s)}</option>`).join("")}</select>` : '<span class="lk-nosize"></span>'}
            <button class="lk-add" type="button">${T("looks.add", "Add to cart")}</button>
          </div>
          <p class="lk-msg" role="status"></p>
        </li>`).join("")}
      </ul>
      <div class="lk-all">
        <div class="lk-total"><span>${T("looks.complete", "The complete look")}</span><b data-lk-total></b></div>
        <button class="btn wide lk-addall" type="button" data-lk-sum-open>${T("looks.add-all", "Add the full look")}</button>
      </div>
      <div class="lk-sum" hidden role="group" aria-label="${esc(T("looks.summary", "Look summary"))}">
        <h3>${T("looks.summary", "Look summary")}</h3>
        <ul class="lk-sumlist" data-lk-sumlist></ul>
        <div class="lk-sumtotal"><span>${T("looks.total", "Total")}</span><b data-lk-sumtotal></b></div>
        <p class="lk-msg" role="status" data-lk-summsg></p>
        <div class="lk-sumdone" hidden><p>${T("looks.added", "The look is in your cart.")}</p><a class="btn wide" href="/cart/">${T("looks.view-cart", "View cart")}</a><button class="btn line wide" type="button" data-lk-sum-back>${T("looks.keep", "Keep browsing")}</button></div>
        <div class="lk-sumbtns"><button class="btn line" type="button" data-lk-sum-back>${T("looks.back", "Back")}</button><button class="btn" type="button" data-lk-sum-add>${T("looks.add-all-cart", "Add all to cart")}</button></div>
      </div>
    </aside>
  </section>`;
}

write("looks/index.html", layout({
  title: TR("looks.meta-title", "Zi Looks | Zibura"),
  description: TR("looks.meta-description", "Shop complete outfits. Wander the wall of looks, step closer to one and see every piece in it."),
  page: "looks",
  body: `<main class="looks" data-looks>
  <h1 class="sr">${T("looks.heading", "Zi Looks")}</h1>
  <div class="lk-bar">
    <div class="lk-switch" role="group" aria-label="Ways to shop">
      <a href="/shop/">${T("looks.switch-all", "All pieces")}</a>
      <a href="/looks/" class="on" aria-current="page">${T("looks.switch-looks", "Zi Looks")}</a>
    </div>
    <p class="lk-count" aria-live="polite"><span data-lk-label>${T("looks.label-idle", "Zi Looks")}</span></p>
  </div>
  <div class="lk-stage" data-lk-stage tabindex="0" aria-label="${esc(TR("looks.wall-label", "Wall of looks. Drag or use the arrow keys to move."))}">
    <div class="lk-mark" data-lk-mark aria-hidden="true">${T("looks.wordmark", "Zi Looks")}</div>
    <div class="lk-rows" data-lk-rows>
${LOOK_ROWS.map(lookRow).join("\n")}
    </div>
    <p class="lk-hint">${T("looks.hint", "Drag to wander. Select a look to step closer.")}</p>
    <span class="lk-cursor" data-lk-cursor aria-hidden="true"></span>
  </div>
  <div class="lk-view" data-lk-view hidden role="dialog" aria-modal="true" aria-label="${esc(TR("looks.view-label", "Look detail"))}">
    <div class="lk-tools">
      <span class="lk-pos" data-lk-pos></span>
      <button type="button" class="lk-btn lk-x" data-lk-close>${T("looks.close", "Back to the wall")}</button>
    </div>
${LOOKS.map(lookDetail).join("\n")}
    <nav class="lk-nav" aria-label="Looks">
      <button type="button" data-lk-prev aria-label="Previous look"><svg viewBox="0 0 40 12" width="30" height="12" aria-hidden="true"><path d="M40 6H2M7 1L2 6l5 5" fill="none" stroke="currentColor" stroke-width="1.2"/></svg><span data-lk-prev-name></span></button>
      <button type="button" data-lk-next aria-label="Next look"><span data-lk-next-name></span><svg viewBox="0 0 40 12" width="30" height="12" aria-hidden="true"><path d="M0 6h38M33 1l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.2"/></svg></button>
    </nav>
  </div>
</main>
<script>window.LOOK_NAMES=${JSON.stringify(LOOKS.map((l) => l.name))};</script>
<script src="/assets/looks.js?v=${BUILD_V}" defer></script>`
}));

// ---------- Waitlist landing page (stands alone, for Instagram and other links) ----------
function bare({ title, description, page, body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta name="theme-color" content="#111c44">
<link rel="icon" href="/assets/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300..700&family=Public+Sans:wght@400;500;600&family=Lexend:wght@400;500;600&family=Noto+Serif:ital,wght@0,400;1,400&family=Noto+Sans:wght@300;400;500&display=swap">
<link rel="stylesheet" href="/assets/styles.css?v=${BUILD_V}">
<script>document.documentElement.className = "js";</script>
</head>
<body data-page="${page}">
${body}
<script src="/assets/app.js?v=${BUILD_V}" defer></script>
</body>
</html>
`;
}
// Assets and data
write("assets/styles.css", fs.readFileSync(find("styles.css")));
write("assets/app.js", fs.readFileSync(find("app.js")));
write("assets/looks.js", fs.readFileSync(find("looks.js")));
for (const f of [
  "logo-wordmark-sky.png",
  "logo-wordmark-navy.png",
  "logo-icon-navy.png",
  "favicon.png",
  "share.png",
  "ruova.jpg",
  "hero.jpg",
  "zi-card-seal.png",
  "zi-card-bg.png",
  "zi-card-back.png"
]) {
  write("assets/" + f, fs.readFileSync(find(f)));
}
for (const n of ["hero", "ruova"]) {
  const h = findImage(n);
  if (h) write("assets/" + n + ".jpg", fs.readFileSync(h.file));
}
write("_worker.js", fs.readFileSync(find("_worker.js")));
write("catalog.json", JSON.stringify(products.map((p) => ({ ...p, photos: [1, 2].map((n) => { const m = photo(`${p.slug}-${n}`, "").match(/src="([^"]+)"/); return m ? m[1] : null; }).filter(Boolean) }))));
write("taxonomy.json", JSON.stringify(TAX));
write("colors.json", JSON.stringify(COLORS));

write("_redirects", [
  "/piece/* /product/:splat 301",
  "/province/ /style-compass/ 301",
  "/province /style-compass/ 301",
  "/explore/signal-1/arc-1/ /explore/collection-1/capsule-1/ 301",
  "/explore/signal-1/arc-2/ /explore/collection-1/ 301",
  "/explore/signal-1/ /explore/collection-1/ 301",
  "/join /waitlist/ 301",
  "/join/ /waitlist/ 301"
].join("\n") + "\n");
write(
  "404.html",
  layout({
    title: TR("notfound.meta-title", "Page not found | Zibura"),
    description: TR("notfound.meta-description", "Page not found."),
    page: "notfound",
    body: `<main class="thanks">
<h1 class="display rise">${words(TR("notfound.title", "Page not found."))}</h1>
<p class="fade">${T("notfound.text", "The Republic searched its records and found nothing at this address.")}</p>
<a class="btn" href="/">${T("notfound.home", "Return to the homepage")}</a>
</main>`
  })
);

// Search engine files
(function () {
  const skip = /^\/(admin|reset|thanks|join|404\.html)/;
  const urls = [];
  (function walk(dir) {
    for (const n of fs.readdirSync(dir, { withFileTypes: true })) {
      const f = path.join(dir, n.name);
      if (n.isDirectory()) walk(f);
      else if (n.name === "index.html") {
        const u = "/" + path.relative(dist, path.dirname(f)).split(path.sep).join("/") + "/";
        const clean = u === "//" ? "/" : u;
        if (!skip.test(clean)) urls.push(clean);
      }
    }
  })(dist);
  urls.sort();
  write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>https://zibura.com${u}</loc></url>`).join("\n")}\n</urlset>\n`);
  write("robots.txt", "User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nDisallow: /reset/\nDisallow: /thanks/\n\nSitemap: https://zibura.com/sitemap.xml\n");
})();

console.log("Built " + products.length + " products into dist/");

if (process.env.COPY_EXPORT) fs.writeFileSync(process.env.COPY_EXPORT, JSON.stringify(REG));
