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

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function write(rel, content) {
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
      <div class="form-grid">
        <div><label for="${id}-first">${T("forms.first-name", "First name")}</label><input id="${id}-first" name="first" autocomplete="given-name" required></div>
        <div><label for="${id}-last">${T("forms.last-name", "Last name")}</label><input id="${id}-last" name="last" autocomplete="family-name" required></div>
        <div class="full"><label for="${id}-email">${T("forms.email", "Email")}</label><input id="${id}-email" name="email" type="email" autocomplete="email" required></div>
        <div><label for="${id}-country">${T("forms.country-of-origin", "Country of origin")}</label>
          <select id="${id}-country" name="country" autocomplete="country-name" required><option value="">${T("forms.choose", "Choose")}</option>${COUNTRIES.map((c) => `<option>${c}</option>`).join("")}</select></div>
        <div><label for="${id}-city">${T("forms.city-of-residence", "City of residence")}</label><input id="${id}-city" name="city" autocomplete="address-level2" required></div>
        <div><label for="${id}-bm">${T("forms.birthday-month", "Birthday month")} <span class="opt-tag">${T("forms.optional", "optional")}</span></label><select id="${id}-bm" name="birth_month">${monthOptions}</select></div>
        <div><label for="${id}-bd">${T("forms.birthday-day", "Birthday day")} <span class="opt-tag">${T("forms.optional", "optional")}</span></label><select id="${id}-bd" name="birth_day">${dayOptions}</select></div>
        <div class="full"><label for="${id}-phone">${T("forms.phone", "Phone")} <span class="opt-tag">${T("forms.optional", "optional")}</span></label><input id="${id}-phone" name="phone" type="tel" autocomplete="tel"></div>
        <div class="full checks">
          <label class="check"><input type="checkbox" name="email_consent" required><span>${T("forms.email-consent", "Send me the Zi Memo and news from Zibura and Zi Republic by email. I can unsubscribe at any time.")}</span></label>
          <label class="check"><input type="checkbox" name="sms_consent"><span>${T("forms.sms-consent", "Text me the Collection I announcements. Message and data rates may apply. Reply STOP to opt out.")}</span></label>
        </div>
        <input type="hidden" name="leaning">
        <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      </div>
      <button class="btn" type="submit">${T("forms.join-the-waitlist", "Join the waitlist")}</button>
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
      <button class="btn" type="submit">${T("forms.subscribe", "Subscribe")}</button>
      <div class="msg sub-msg" role="status"></div>
    </form>`;
}

function arrivalCard(id) {
  return `<div class="arrival">
    <div class="arr-head">
      <img src="/assets/logo-icon-navy.png" alt="" width="434" height="436">
      <div><b>${T("forms.zi-republic", "Zi Republic")}</b><span>${T("forms.ministry-of-communications", "Ministry of Communications")}</span></div>
      <span class="arr-tag">${T("forms.waitlist-tag", "Waitlist")}</span>
    </div>
    ${waitlistForm(id)}
    <div class="arr-foot">
      <img src="/assets/zi-card-seal.png" alt="" width="304" height="300">
      <span>${T("forms.collection-launch", "Collection I is launching soon")}</span>
    </div>
    <p class="mrz" aria-hidden="true">ZI&lt;REPUBLIC&lt;&lt;WAITLIST&lt;&lt;COLLECTION&lt;I&lt;&lt;&lt;&lt;&lt;&lt;</p>
  </div>`;
}

const MODAL = `<dialog id="wl-modal" aria-labelledby="wl-title">
  <button class="close" type="button" aria-label="Close" data-close-waitlist>&times;</button>
  <h2 class="display" id="wl-title">${T("forms.newsletter-title", "Get the Zi Memo.")}</h2>
  <p class="sub">${T("forms.newsletter-sub", "The Zi Memo is the Zibura newsletter, with news from Zibura and Zi Republic.")}</p>
  ${subscribeForm("m")}
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
<div class="notice">${T("notice_text", "Official notice: Collection I is launching soon.")} <a href="/waitlist/" data-open-waitlist>${T("notice_link", "Join the waitlist")}</a></div>
<header class="site-header" id="top">
  <div class="wrap">
    <button type="button" class="burger" id="burger" data-tip="Menu" aria-label="Open menu" aria-expanded="false" aria-controls="drawer"><span></span><span></span><span></span></button>
    <nav class="nav" aria-label="Main">
      <div class="has-mega"><a href="/shop/">${T("site.shop", "Shop")}</a>${MEGA}</div>
      <a href="/explore/">${T("site.collections", "Collections")}</a>
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
    <a class="d-link big" href="/explore/">${T("site.collections", "Collections")}</a>
    <a class="d-link big" href="/brand/">${T("site.zi-republic", "Zi Republic")}</a>
    <a class="d-link big" href="/style-profile/">${T("site.style-profile", "Style Profile")}</a>
    <a class="d-link big" href="/note/">${T("site.from-the-zi-in-chief", "From the Zi-in-Chief")}</a>
    <a class="d-link" href="/account/" id="acct-link-m">${T("site.my-account", "My account")}</a>
    <a class="d-link" href="/cart/">${T("site.cart", "Cart")}</a>
    <div class="d-cur" role="group" aria-label="Currency">${["CAD", "USD", "GBP", "NGN"].map((c) => `<button type="button" data-cur="${c}">${c}</button>`).join("")}</div>
    <div class="socs d-socs">${SOCIAL}</div>
    <a class="btn wide" href="/zi-card/">${T("site.apply-for-zi-residency", "Apply for Zi Residency")}</a>
  </div>
</div>
${body}
<footer class="site-footer">
  <div class="wrap">
    <div class="f-hero">
      <p class="f-big">${T("site.your-expression", "Your expression,")}<br>${T("site.your-world", "your world.")}</p>
      <div class="f-cta"><p>${T("footer_cta", "Join the waitlist to hear when Collection I launches.")}</p><a class="btn light" href="/waitlist/">${T("site.join-the-waitlist", "Join the waitlist")}</a></div>
    </div>
    <div class="top">
      <div class="f-brand">
        <img class="word" src="/assets/logo-wordmark-sky.png" alt="Zibura" width="636" height="120">
        <p class="s">${T("footer_about", "Zibura is a lifestyle brand with its own country. Zi Republic has a flag, a currency, public institutions and a membership open to anyone who applies. Both are built around personal expression.")}</p>
      </div>
      <div>
        <h3>${T("site.shop-heading", "Shop")}</h3>
        <a href="/shop/">${T("site.all-products", "All products")}</a>
${AUDIENCES.map((a) => `        <a href="/shop/?audience=${a}">${a}</a>`).join("\n")}
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
        <a href="/style-profile/">${T("site.style-profile", "Style Profile")}</a>
      </div>
      <div>
        <h3>${T("site.explore-heading", "Explore")}</h3>
        <a href="/explore/">${T("site.collections", "Collections")}</a>
        <a href="/note/">${T("site.from-the-zi-in-chief", "From the Zi-in-Chief")}</a>
        <a href="/waitlist/">${T("site.join-the-waitlist", "Join the waitlist")}</a>
        <a href="/account/">${T("site.your-account", "Your account")}</a>
        <h3 class="f-follow">${T("site.follow-zibura", "Follow Zibura")}</h3>
        <div class="socs">${SOCIAL}</div>
      </div>
    </div>
    <div class="legal-row">
      <p class="legal">${T("legal_line", "&copy; 2026 Zibura. Official business. Unofficial personalities.")}</p>
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
    description: TR("home.meta-description", "Zibura is a lifestyle brand with its own country. Zi Republic has a flag, a currency, public institutions and a membership open to anyone who applies."),
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
        </div>
      </div>
    </article>
    ${HERO3 ? `<article class="he-slide">
      <img src="/assets/hero-3.${HERO3.ext}" alt="Editorial image for Zi Republic" width="1500" height="1000" loading="lazy">
      <div class="he-copy">
        <h2 class="he-title">${T("home.hero2-title", "A country of our own. A style of your own.")}</h2>
        <p class="he-lede">${T("home.hero2-sub", "Welcome to Zibura and Zi Republic.")}</p>
        <div class="he-actions"><a class="he-btn" href="/brand/">${T("home.hero2-button", "Enter the Republic")}</a></div>
      </div>
    </article>` : ""}
    ${HERO2 ? `<article class="he-slide">
      <img src="/assets/hero-2.${HERO2.ext}" alt="Collection I editorial" width="1500" height="1000" loading="lazy">
      <div class="he-copy">
        <h2 class="he-title">${T("home.hero3-title", "Collection I is launching soon.")}</h2>
        <p class="he-lede">${T("home.hero3-sub", "Capsule I is back to the basics.")}</p>
        <div class="he-actions"><a class="he-btn" href="/explore/collection-1/">${T("home.hero3-button", "Explore the collection")}</a><a class="he-btn ghost" href="/waitlist/">${T("home.hero3-button2", "Join the waitlist")}</a></div>
      </div>
    </article>` : ""}
  </div>
  <nav class="he-rail" aria-label="Quick links">
    <a href="/shop/?audience=Women">${T("home.shop-women", "Shop women")}</a>
    <a href="/shop/?audience=Men">${T("home.shop-men", "Shop men")}</a>
    <a href="/style-profile/">${T("home.style-profile", "Style Profile")}</a>
    <a href="/brand/#calendar">${T("home.calendar", "Calendar")}</a>
  </nav>
  <div class="he-ctrl">
    ${SLIDE_N > 1 ? `<button type="button" class="he-prev" aria-label="Previous slide"><svg viewBox="0 0 40 12" width="40" height="12" aria-hidden="true"><path d="M40 6H2M7 1L2 6l5 5" fill="none" stroke="currentColor" stroke-width="1.2"/></svg></button><span class="he-count"><b>1</b> / ${SLIDE_N}</span><button type="button" class="he-next" aria-label="Next slide"><svg viewBox="0 0 40 12" width="40" height="12" aria-hidden="true"><path d="M0 6h38M33 1l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.2"/></svg></button>` : ""}
  </div>
  <a class="he-scroll" href="#products" aria-label="Scroll to products"><span>${T("home.scroll", "Scroll")}</span><i></i></a>
</section>

<section class="section register-band" id="register">
  <div class="wrap split">
    <div data-reveal>
      <h2 class="display">${T("home.waitlist-title", "Join the waitlist.")}</h2>
      <p class="reg-lead">${T("home.waitlist-lead", "The Ministry of Communications maintains the waitlist with great seriousness. Register your interest and the Ministry will email you when Collection I launches.")}</p>
      <ul class="reg-points">
        <li>${T("home.waitlist-point1", "Your name on the waitlist before Collection I launches")}</li>
        <li>${T("home.waitlist-point2", "First word on Collection I")}</li>
        <li>${T("home.waitlist-point3", "The Zi Memo, straight to your inbox")}</li>
      </ul>
    </div>
    <div data-reveal>${arrivalCard("h")}</div>
  </div>
</section>


<section class="section" id="products">
  <div class="wrap">
    <div class="section-head" data-reveal>
      <h2>${T("home.collection-capsule", "Collection I, Capsule I")}</h2>
      <div class="rail-nav"><button type="button" data-rail="-1" aria-label="Previous products">&larr;</button><button type="button" data-rail="1" aria-label="Next products">&rarr;</button></div>
    </div>
  </div>
  <div class="rail" data-rail-track>
${products.slice(0, 8).map(card).join("\n")}
  </div>
  <div class="wrap" style="margin-top:36px"><a class="text-link" href="/shop/">${T("home.see-all-products", "See all products")}</a></div>
</section>

<section class="hscroll" data-hscroll aria-label="Collection I look book">
  <div class="hs-pin">
    <div class="wrap hs-head"><h2>${T("home.the-look-book", "The look book")}</h2><p>${T("home.look-book-sub", "Collection I, Capsule I, frame by frame.")}</p></div>
    <div class="hs-track">
${[TR("home.opening-frame", "Opening frame"), TR("home.movement", "Movement"), TR("home.detail", "Detail"), TR("home.group", "Group"), TR("home.still-life", "Still life"), TR("home.closing-frame", "Closing frame")].map((c, i) => `      <figure class="hs-card${i % 2 ? " low" : ""}">${media("collection-1-" + (i + 1), c)}<figcaption>${c}</figcaption></figure>`).join("\n")}
      <a class="hs-end" href="/explore/collection-1/"><span>${T("home.read-about-collection", "Read about Collection I")}</span></a>
    </div>
    <div class="hs-bar" aria-hidden="true"><i></i></div>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="wrap">
    <div class="section-head" data-reveal><h2>${T("home.shop-by-audience", "Shop by audience")}</h2></div>
    <div class="who" data-reveal>
${AUDIENCES.map((a) => `      <a href="/shop/?audience=${a}">${media("audience-" + a.toLowerCase(), a)}<span>${a}</span><small>${countIn((p) => p.audience.includes(a))} ${countIn((p) => p.audience.includes(a)) === 1 ? "product" : "products"}</small></a>`).join("\n")}
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
      <figure class="cl a" data-parallax="0.12">${media("collection-1-2", "Editorial frame")}</figure>
      <figure class="cl b" data-parallax="-0.1">${media("collection-1-4", "Editorial frame")}</figure>
      <figure class="cl c" data-parallax="0.2">${media("collection-1-6", "Editorial frame")}</figure>
    </div>
    <p class="scrollwords" data-scrollwords>${T("home.supporting", "A brand built around personal expression. A world with its own identity. Design, individual style and a point of view that leaves room for more than one thing.")}</p>
    <p style="margin-top:40px" data-reveal><a class="btn line" href="/brand/">${T("home.read-republic-story", "Read the Republic story")}</a></p>
  </div>
</section>

<section class="wrap" data-reveal style="margin-bottom:clamp(56px,8vw,120px)">
  ${film("collection-1-home-film", TR("home.film-caption", "Collection I, in motion."))}
</section>

<section class="section navy-band">
  <div class="wrap split">
    <div data-reveal>${flipCard()}</div>
    <div data-reveal>
      <h2 class="display">${T("home.residency-title", "Apply for Zi Residency.")}</h2>
      <p class="lead">${T("home.residency-lead", "Zi Residency is the Republic's membership. Anyone may apply. Republic Administration processes each completed application. Applicants become Zi Residents and receive a Zi Card, the everyday credential of membership.")}</p>
      <p style="margin-top:32px"><a class="btn light" href="/zi-card/">${T("home.residency-button", "Apply for Zi Residency")}</a></p>
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
  ["Zi Day", "Zi Day is the Republic's founding day. Zi Residents and Zitizens mark it each year.", "December 1, 2026"],
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

<section class="section" id="ministries" style="padding-top:0"><div class="wrap split">
  <div data-reveal>
    <h2 class="display">${T("brand.ministries-title", "The Ministries.")}</h2>
    <p class="province-intro">${T("brand.ministries-intro", "The Ministries oversee the Republic's public functions, from creative direction and community programs to communications, commerce and administration.")}</p>
  </div>
  <dl class="plain-list" data-reveal>
${MINISTRIES.map(([n, d]) => `    <div><dt>${n}</dt><dd>${d}</dd></div>`).join("\n")}
  </dl>
</div></section>

<section class="section" id="calendar" style="padding-top:0"><div class="wrap split">
  <h2 class="display" data-reveal>${T("brand.calendar-title", "The calendar.")}</h2>
  <dl class="plain-list" data-reveal>
${CALENDAR.map(([n, d, dt]) => `    <div><dt>${n}</dt><dd>${d}</dd><span class="tag-soon">${dt || T("brand.date-soon", "Date announced soon")}</span></div>`).join("\n")}
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
    <p class="big">${T("brand.cta-lead", "Anyone may apply. Join the waitlist to hear when Collection I launches.")}</p>
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
    lead: "Introducing Collection I. A collection brings together a body of work under one creative direction. It may include different product categories, united by a shared idea.",
    idea: [],
    film: "Collection I, in motion.",
    capsules: ["capsule-1", "capsule-2"]
  },
  {
    id: "collection-2", soon: true, name: "Collection II", tag: "Date announced soon", status: "Date announced soon",
    lead: "Collection II is announced soon.", idea: [], film: "", capsules: []
  },
  {
    id: "collection-3", soon: true, name: "Collection III", tag: "Date announced soon", status: "Date announced soon",
    lead: "Collection III is announced soon.", idea: [], film: "", capsules: []
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
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/explore/">${T("story.collections", "Collections")}</a> <span>/</span> ${isCap ? `<a href="/explore/${col.id}/">${col.name}</a> <span>/</span> ${item.name}` : item.name}</nav>
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
    title: TR("explore.meta-title", "Collections | Zibura"),
    description: TR("explore.meta-description", "Explore Collection I and its capsules from Zibura."),
    page: "explore",
    body: `<main>
<section class="page-head"><div class="wrap">
  <h1 class="display rise">${words(TR("explore.title", "Collections."))}</h1>
  <p class="fade">${T("explore.intro", "A collection brings together a body of work under one creative direction. A capsule is a focused group of products built around a particular idea, form, material, colour story or occasion.")}</p>
</div></section>
<section class="sg-stage" aria-label="Collections">
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
      <span class="tag-soon">${T("explore.date-soon", "Date announced soon")}</span>
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

// Style Profile
const LEANINGS = [
  ["Composed", "Calm, precise and considered.", "Composed preferences favour clean lines, fine fabrics and decisions made once, with care.", ["Calm", "Precise", "Considered"]],
  ["Warm", "Generous, bright and social.", "Warm preferences favour saturated colour, soft shapes and clothes made for gathering.", ["Generous", "Bright", "Social"]],
  ["Bold", "Direct, strong and certain.", "Bold preferences favour sharp structure, high contrast and one loud focal point.", ["Direct", "Strong", "Certain"]],
  ["Grounded", "Patient, natural and lasting.", "Grounded preferences favour natural fabrics, earth tones and products that age well.", ["Patient", "Natural", "Lasting"]],
  ["Playful", "Quick, bright and in motion.", "Playful preferences favour easy movement, bright colour and combinations that change by the hour.", ["Quick", "Bright", "Mobile"]],
  ["Layered", "Soft, dreamy and detailed.", "Layered preferences favour draped shapes, sheer layers and details that reveal themselves slowly.", ["Soft", "Dreamy", "Detailed"]]
];
LEANINGS.forEach((p) => {
  p[1] = TR(`quiz.${p[0]}-line`, p[1]);
  p[2] = TR(`quiz.${p[0]}-note`, p[2]);
  p[3] = p[3].map((t, k) => TR(`quiz.${p[0]}-trait-${k + 1}`, t));
});
const PLACEMENT = [
  ["It is Saturday and nothing is planned. What happens?", ["I read, think, and let the day find its shape.", "I text everyone and turn it into a gathering.", "I pick the boldest plan on the table and commit.", "I cook something slow and reset.", "I am already out the door chasing three things.", "I lose hours inside a daydream and a playlist."]],
  ["Your outfit says:", ["Quiet confidence. Every detail was chosen.", "Look at me, I am happy to be here.", "Rules were for other people.", "Comfortable, natural, made to last.", "Whatever I grabbed on the way out, and it works.", "A layered story with a twist you notice later."]],
  ["How do you make a big decision?", ["I wait until it is clear, then move.", "I ask the people I love.", "I decide fast and never look back.", "I give it time and let it grow on me.", "I try it and adjust as I go.", "I follow the feeling I cannot explain."]],
  ["Pick a place.", ["A lake at dawn.", "A rooftop at sunset.", "A stage with the lights on.", "A garden after rain.", "A city street at full speed.", "A foggy hillside at midnight."]],
  ["What do your friends thank you for?", ["Staying calm and seeing clearly.", "Making every moment feel special.", "Saying what everyone was thinking.", "Showing up, every time.", "Getting things moving.", "Seeing something in them nobody else saw."]],
  ["Choose your soundtrack.", ["Slow, spacious, and intelligent.", "Everything you can sing along to.", "Loud, with a point to make.", "Warm, acoustic, and unhurried.", "Fast, with surprises.", "Dreamy, layered, hard to place."]],
  ["Which word belongs next to your name?", ["Magnetic.", "Radiant.", "Fearless.", "Grounded.", "Unstoppable.", "Enigmatic."]],
  ["Pick a fabric.", ["Crisp cotton and fine wool.", "Satin with a little shine.", "Leather and sharp structure.", "Linen, knit, and natural weaves.", "Technical nylon and stretch mesh.", "Silk, lace, and sheer layers."]],
  ["How do you shop?", ["I buy once and wear it for years.", "I buy for the occasion and the photo.", "I know in five seconds and pay at once.", "I wait for the product that grows on me.", "I take several home and see what sticks.", "I follow a feeling, then find the reasons."]],
  ["Your closet is mostly:", ["Navy, white, and clean neutrals.", "Sunny, happy, saturated colours.", "Black, red, and one loud product.", "Earth tones and soft greens.", "Bright colours that mix and match.", "Purples, smoke, and the shades between."]],
  ["A last minute invite arrives. You:", ["Arrive on time and observe first.", "Bring the snacks and the playlist.", "Walk in as the main character.", "Bring a host gift and stay until the end.", "Stop by four parties in one night.", "Arrive late with a good story."]],
  ["Pick the accessory you would never leave without.", ["A fine watch or a simple chain.", "Statement earrings.", "A heavy ring or a sharp belt.", "A woven bag or a soft scarf.", "Sneakers made for moving.", "Layered chains and dark sunglasses."]]
];
const PROFILES = [
  { style: "Quiet tailoring", silhouette: "Clean lines, long coats, straight trousers, and precise proportions.", palette: ["Zibura Blue", "White", "Sky Blue", "Silver"], fabrics: "Wool, cotton poplin, fine knit", loves: ["Outerwear with a strong shoulder", "Neutral base layers", "One refined jewellery item"], moments: "Early meetings, gallery openings, long train rides, and any room where listening matters.", shopper: "You buy fewer products and wear them for years. Fit comes first and trends come second.", stretch: "Add a single bright accent, like a Sky Blue scarf, and the whole look gains a second voice.", picks: ["halo", "margin", "orbit"], notice: ["You dress with intention, and every detail has a reason.", "You decide when the picture is clear, and then you move without second guessing.", "You buy once and wear it for years.", "Your closet is organized around navy, white, and clean neutrals."] },
  { style: "Joyful colour", silhouette: "Fitted waists, flowing skirts, soft shoulders, and anything that moves when you do.", palette: ["Yellow", "Peach", "Coral", "Cream"], fabrics: "Satin, silk blends, cotton with a bright hand", loves: ["Warm saturated colours", "Statement earrings", "Dresses made for gathering"], moments: "Birthdays, brunches, weddings, and every dinner where you arrive with the playlist.", shopper: "You shop for the occasion and the photograph. A product earns its place when it makes the room smile.", stretch: "Try one deep navy product and watch your bright colours glow even more against it.", picks: ["ember", "kite", "hearth"], notice: ["You dress to be happy in the room, and the room notices.", "You ask the people you love, and their joy becomes part of the decision.", "You shop for the moment and the photo.", "Your closet is full of sunny, saturated colour."] },
  { style: "Sharp and certain", silhouette: "Structured shoulders, high contrast, strong lines, and one loud focal point.", palette: ["Red", "Black", "White", "Gold"], fabrics: "Leather, crepe, heavy satin", loves: ["A red product you can see from across the street", "Sharp belts and heavy rings", "Black as a base"], moments: "Stages, openings, negotiations, and any room that needs someone to go first.", shopper: "You know in five seconds and pay at once. Hesitation is for other people.", stretch: "Try one soft, warm product in Sand or Tan and discover how much louder the red gets.", picks: ["tidal", "stride", "rumour"], notice: ["You treat the rules as suggestions, and your outfit proves it.", "You decide fast and keep moving.", "You buy in five seconds and never look back.", "Your closet runs on black, red, and one loud product."] },
  { style: "Natural and lasting", silhouette: "Relaxed shapes, easy trousers, soft layers, and products built to age well.", palette: ["Green", "Sand", "Olive", "Tan"], fabrics: "Linen, wool knit, soft leather, washed cotton", loves: ["Earth tones and soft greens", "Totes and woven textures", "Candles and slow mornings"], moments: "Weekend markets, long dinners, garden days, and any plan that gets better with time.", shopper: "You wait for the product that grows on you. The ones you keep for ten years are the ones you thought about for ten days.", stretch: "Try one bright, saturated product and let your earth tones frame it.", picks: ["meridian", "cove", "hearth"], notice: ["You choose comfort and durability, and your wardrobe shows it.", "You give a decision time and let it grow on you.", "You wait for the product that earns its place.", "Your closet is built from earth tones and soft greens."] },
  { style: "Fast and playful", silhouette: "Easy movement, athletic ease, bright layers, and combinations that change by the hour.", palette: ["Orange", "Sky Blue", "Lime", "Hot Pink"], fabrics: "Technical nylon, jersey, stretch mesh, canvas", loves: ["Bright colours that mix and match", "Sneakers and shoes made for moving", "Bags that carry everything"], moments: "City days, travel, side projects, and nights that change plans three times.", shopper: "You take several products home and see what sticks. Your wardrobe is a working lab.", stretch: "Pick one slower, more tailored product and see how it calms the whole outfit.", picks: ["ember", "pocket", "cove"], notice: ["You dress in motion, and it works.", "You try it and adjust as you go.", "You take several products home and keep the winners.", "Your closet is bright and everything mixes."] },
  { style: "Dreamy and layered", silhouette: "Draped shapes, sheer layers, long scarves, and details that reveal themselves slowly.", palette: ["Purple", "Lilac", "Silver", "Black"], fabrics: "Silk, lace, chiffon, soft velvet", loves: ["Purples, smoke, and shades in between", "Layered chains and scarves", "Perfume with a second note"], moments: "Late dinners, night walks, quiet exhibitions, and any evening that deserves a story.", shopper: "You follow a feeling and find the reasons afterward. The best products feel like they already knew you.", stretch: "Try a crisp white shirt as your base and watch the layers get louder.", picks: ["kite", "orbit", "rumour"], notice: ["You dress in layers with a twist people notice later.", "You follow the feeling you cannot explain, and it is usually right.", "You follow a feeling, then find the reasons.", "Your closet lives between purple, smoke, and shadow."] }
];
PLACEMENT.forEach((q, qi) => {
  q[0] = TR(`quiz.question-${qi + 1}`, q[0]);
  q[1] = q[1].map((t, k) => TR(`quiz.question-${qi + 1}-answer-${k + 1}`, t));
});
PROFILES.forEach((pr, pi) => {
  const n = LEANINGS[pi][0];
  ["style", "silhouette", "fabrics", "moments", "shopper", "stretch"].forEach((f) => { pr[f] = TR(`quiz.${n}-${f}`, pr[f]); });
  ["loves", "notice"].forEach((f) => { pr[f] = pr[f].map((t, k) => TR(`quiz.${n}-${f}-${k + 1}`, t)); });
});

write(
  "style-profile/index.html",
  layout({
    title: TR("quiz.meta-title", "Style Profile | Zibura"),
    description: TR("quiz.meta-description", "Answer twelve questions to see your style preferences as six meters."),
    page: "placement",
    body: `<main>
<section class="page-head"><div class="wrap">
  <h1 class="display rise">${words(TR("quiz.title", "Style Profile."))}</h1>
  <p class="fade">${T("quiz.intro", "Twelve questions. Your answers set six preference meters and match you with products from Collection I.")}</p>
</div></section>
<section class="section" style="padding-top:clamp(16px,3vw,40px)"><div class="wrap">
  <div id="quiz" class="quiz" data-quiz>
    <div class="q-bar"><span id="q-step"></span><div class="q-track"><i id="q-fill"></i></div></div>
    <h2 class="display q-title" id="q-title" tabindex="-1"></h2>
    <div class="q-opts" id="q-opts"></div>
  </div>
  <div id="result" class="result" hidden></div>
  <script type="application/json" id="quiz-data">${JSON.stringify({ questions: PLACEMENT, leanings: LEANINGS.map(([n, line, note, traits], i) => ({ n, line, note, traits, profile: PROFILES[i] })) })}</script>
</div></section>
</main>`
  })
);

// Waitlist
write(
  "waitlist/index.html",
  layout({
    title: TR("waitlist.meta-title", "Join the waitlist | Zibura"),
    description: TR("waitlist.meta-description", "Join the Zibura waitlist for first word on Collection I."),
    page: "waitlist",
    body: `<main>
<section class="page-head"><div class="wrap">
  <h1 class="display rise">${words(TR("waitlist.title", "Join the waitlist."))}</h1>
  <p class="fade">${T("waitlist.lead", "The Ministry of Communications maintains the waitlist with great seriousness. Register your interest and you will receive an email when Collection I launches.")}</p>
</div></section>
<section class="section" style="padding-top:clamp(16px,3vw,40px)"><div class="wrap">
  <div class="register-page">${arrivalCard("p")}</div>
</div></section>
</main>`
  })
);

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
  ["Does a Zi Card expire?", "A Zi Card is valid for five years from the date of issue. The date through which it is valid shows on the card. Renew from your account before that date."],
  ["Can Zillar buy Zi Residency or Zitizenship?", "No. Zillar cannot be used to purchase Zi Residency or Zitizenship."],
  ["What is Zi Day?", "Zi Day is the Republic's founding day. Zi Residents and Zitizens mark it each year."],
  ["What is Ziesta?", "Ziesta is the Republic's festival of rest, a time to slow down and gather."]
].map((r, i) => [TR(`zi-card.faq-${i + 1}-q`, r[0]), TR(`zi-card.faq-${i + 1}-a`, r[1])]);
write(
  "zi-card/index.html",
  layout({
    title: TR("zi-card.meta-title", "Apply for Zi Residency | Zibura"),
    description: TR("zi-card.meta-description", "Zi Residency is the Republic's membership. Anyone may apply. Applicants become Zi Residents and receive a Zi Card."),
    page: "zicard",
    body: `<main>
<section class="page-head"><div class="wrap">
  <p class="small">${T("zi-card.eyebrow", "Residency is open.")}</p>
  <h1 class="display rise">${words(TR("zi-card.title", "Apply for Zi Residency."))}</h1>
  <p class="fade">${T("zi-card.lead", "Completed applications are processed by Republic Administration. Applicants become Zi Residents and receive a Zi Card, the everyday credential of membership.")}</p>
</div></section>
<section class="section" style="padding-top:clamp(16px,3vw,40px)"><div class="wrap split">
  <div data-reveal>${flipCard()}</div>
  <div data-reveal>
    <ol class="steps">
      <li><div><b>${T("zi-card.create-your-account", "Create your account.")}</b><span>${T("zi-card.create-your-account-text", "Your Zi Residency application begins in your account.")}</span></div></li>
      <li><div><b>${T("zi-card.upload-your-portrait-and-apply", "Upload your portrait and apply.")}</b><span>${T("zi-card.your-portrait-appears-on-your", "Your portrait appears on your Zi Card, so choose one that looks like you.")}</span></div></li>
      <li><div><b>${T("zi-card.collect-your-zi-card", "Collect your Zi Card.")}</b><span>${T("zi-card.once-your-application-is-accepted", "Once your application is accepted, your Zi Card appears in your account, ready to download. It is valid for five years from the date of issue.")}</span></div></li>
    </ol>
    <p style="margin-top:40px"><a class="btn" href="/account/">${T("zi-card.start-your-application", "Start your application")}</a></p>
    <p class="small" style="margin-top:16px">${T("zi-card.want-first-word", "Want first word on Collection I?")} <a href="/waitlist/">${T("zi-card.join-the-waitlist", "Join the waitlist")}</a>.</p>
  </div>
</div></section>

<section class="section" style="padding-top:0"><div class="wrap">
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
  <h1 class="display rise" id="acct-h">${words(TR("account.title", "Your Zibura account."))}</h1>
  <p class="fade" id="acct-sub">${T("account.create-an-account-to-open", "Create an account to view your orders, save your details and find your Zi Card.")}</p>
</div></section>
<section class="section" style="padding-top:clamp(16px,3vw,40px)"><div class="wrap">
  <div id="acct-loading" class="small">${T("account.checking-your-papers", "Loading.")}</div>

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
      <button type="button" data-sec="style">${T("account.style", "Style Profile")}</button>
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
<div class="page-head" style="padding-left:0;padding-right:0"><h1 class="display rise">${words(TR("shop.title", "Shop the collection."))}</h1><p class="fade">${T("shop.subtitle", "Collection I is launching soon. Choose a colour and a size, then add the product to your cart.")}</p></div>
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
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/shop/">${T("shop.shop", "Shop")}</a> <span>/</span> <a href="/shop/?audience=${esc(p.audience[0])}">${esc(p.audience.join(" and "))}</a> <span>/</span> <a href="/shop/?category=${encodeURIComponent(p.category)}">${esc(p.category)}</a> <span>/</span> <a href="/shop/?category=${encodeURIComponent(p.category)}&amp;type=${encodeURIComponent(p.type)}">${esc(p.type)}</a></nav>
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
<div class="page-head" style="padding-left:0;padding-right:0"><h1 class="display rise">${words(TR("cart.title", "Your cart."))}</h1></div>
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

// Assets and data
write("assets/styles.css", fs.readFileSync(find("styles.css")));
write("assets/app.js", fs.readFileSync(find("app.js")));
for (const f of [
  "logo-wordmark-sky.png",
  "logo-wordmark-navy.png",
  "logo-icon-navy.png",
  "favicon.png",
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
  "/province/ /style-profile/ 301",
  "/province /style-profile/ 301",
  "/explore/signal-1/arc-1/ /explore/collection-1/capsule-1/ 301",
  "/explore/signal-1/arc-2/ /explore/collection-1/ 301",
  "/explore/signal-1/ /explore/collection-1/ 301"
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

console.log("Built " + products.length + " products into dist/");

if (process.env.COPY_EXPORT) fs.writeFileSync(process.env.COPY_EXPORT, JSON.stringify(REG));
