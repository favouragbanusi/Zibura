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

const products = JSON.parse(fs.readFileSync(find("products.json", "data/products.json"), "utf8"));

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

const TAX = JSON.parse(fs.readFileSync(find("taxonomy.json"), "utf8"));
const COLORS = JSON.parse(fs.readFileSync(find("colors.json"), "utf8"));
const AUDIENCES = ["Women", "Men", "Everyone"];
const categories = TAX.map((c) => c.name);
const countIn = (fn) => products.filter(fn).length;

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
        <div><label for="${id}-first">First name</label><input id="${id}-first" name="first" autocomplete="given-name" required></div>
        <div><label for="${id}-last">Last name</label><input id="${id}-last" name="last" autocomplete="family-name" required></div>
        <div class="full"><label for="${id}-email">Email</label><input id="${id}-email" name="email" type="email" autocomplete="email" required></div>
        <div><label for="${id}-country">Country</label>
          <select id="${id}-country" name="country" autocomplete="country-name" required><option value="">Choose</option>${COUNTRIES.map((c) => `<option>${c}</option>`).join("")}</select></div>
        <div><label for="${id}-city">City</label><input id="${id}-city" name="city" autocomplete="address-level2" required></div>
        <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      </div>
      <button class="btn" type="submit">Save my place</button>
      <div class="msg wl-msg" role="status"></div>
    </form>`;
}

const MODAL = `<dialog id="wl-modal" aria-labelledby="wl-title">
  <button class="close" type="button" aria-label="Close" data-close-waitlist>&times;</button>
  <h2 class="display" id="wl-title">Be there when the world opens.</h2>
  <p class="sub">Join the list for first word on Signal I.</p>
  ${waitlistForm("m")}
</dialog>`;

function zcard() {
  return `<div class="zcard" role="img" aria-label="Sample Zi Card">
  <div class="z-title">ZI CARD</div>
  <div class="z-tag">YOUR EXPRESSION, YOUR WORLD.</div>
  <img class="z-mark" src="/assets/logo-icon-navy.png" alt="" width="434" height="436">
  <div class="z-issued">ISSUED BY ZI REPUBLIC<br>MINISTRY OF ZI INTERIOR</div>
  <div class="z-photo"><span>YOUR PORTRAIT</span></div>
  <div class="z-lab" style="top:calc(var(--u)*187);left:calc(var(--u)*390)">NAME</div><div class="z-box" style="top:calc(var(--u)*213);left:calc(var(--u)*394);width:calc(var(--u)*482)"><span>YOUR NAME</span></div>
  <div class="z-lab" style="top:calc(var(--u)*301);left:calc(var(--u)*390)">ID NUMBER</div><div class="z-box" style="top:calc(var(--u)*328);left:calc(var(--u)*394);width:calc(var(--u)*482)"><span>ZIYYMM000000</span></div>
  <div class="z-lab" style="top:calc(var(--u)*414);left:calc(var(--u)*390)">STATUS</div><div class="z-box" style="top:calc(var(--u)*442);left:calc(var(--u)*394);width:calc(var(--u)*482)"><span>ZI RESIDENT</span></div>
  <div class="z-lab" style="top:calc(var(--u)*529);left:calc(var(--u)*390)">ISSUED</div><div class="z-box" style="top:calc(var(--u)*555);left:calc(var(--u)*394);width:calc(var(--u)*214)"><span>MONTH YEAR</span></div>
  <div class="z-lab" style="top:calc(var(--u)*529);left:calc(var(--u)*661)">VALIDITY</div><div class="z-box" style="top:calc(var(--u)*555);left:calc(var(--u)*661);width:calc(var(--u)*219)"><span>PERPETUAL</span></div>
  <div class="z-side"><i></i><b>ZI REPUBLIC</b></div>
  <img class="z-seal" src="/assets/zi-card-seal.png" alt="" width="80" height="80">
</div>`;
}

// A card that tilts with the pointer and turns over on click.
function flipCard() {
  return `<div class="flip" tabindex="0" role="button" aria-label="Turn the Zi Card over" data-flip>
  <div class="inner">
    <div class="face front">${zcard()}</div>
    <div class="face back"><img src="/assets/zi-card-back.png" alt="" width="1011" height="637"></div>
  </div>
  <span class="hint">Click to turn it over</span>
</div>`;
}

const MEGA = `<div class="mega" id="mega">
  <div class="mega-grid">
    <div class="mega-col">
      <a class="mega-h" href="/shop/">Every Piece</a>
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
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300..700&family=Public+Sans:wght@400;500;600&family=Lexend+Exa:wght@400;600&display=swap">
<link rel="stylesheet" href="/assets/styles.css">
<script>document.documentElement.className = "js";</script>
</head>
<body data-page="${page}">
<div class="notice">Signal I is landing soon. <a href="/waitlist/" data-open-waitlist>Be first through the door</a></div>
<header class="site-header" id="top">
  <div class="wrap">
    <nav class="nav" aria-label="Main">
      <div class="has-mega"><a href="/shop/">Shop</a>${MEGA}</div>
      <a href="/brand/">Zi Republic</a>
      <a href="/note/">From the founder</a>
    </nav>
    <a class="brand" href="/" aria-label="Zibura home"><img src="/assets/logo-wordmark-navy.png" alt="Zibura" width="636" height="120"></a>
    <nav class="nav right" aria-label="Account and cart">
      <a href="/zi-card/">Zi Card</a>
      <a href="/cart/">Cart (<span id="cart-count">0</span>)</a>
      <select id="currency" aria-label="Currency">
        <option value="CAD">CAD</option>
        <option value="USD">USD</option>
        <option value="GBP">GBP</option>
        <option value="NGN">NGN</option>
      </select>
    </nav>
  </div>
</header>
${body}
<footer class="site-footer">
  <div class="wrap">
    <div class="top">
      <div>
        <img class="word" src="/assets/logo-wordmark-navy.png" alt="Zibura" width="636" height="120">
        <p class="tag">Your expression, your world.</p>
      </div>
      <div>
        <h3>Shop</h3>
        <a href="/shop/">Every Piece</a>
${AUDIENCES.map((a) => `        <a href="/shop/?audience=${a}">${a}</a>`).join("\n")}
${categories.map((c) => `        <a href="/shop/?category=${encodeURIComponent(c)}">${esc(c)}</a>`).join("\n")}
      </div>
      <div>
        <h3>Zi Republic</h3>
        <a href="/brand/">The world</a>
        <a href="/brand/#provinces">The provinces</a>
        <a href="/brand/#calendar">The calendar</a>
        <a href="/note/">From the founder</a>
        <a href="/zi-card/">The Zi Card</a>
        <a href="/waitlist/" data-open-waitlist>Join the waitlist</a>
      </div>
      <div>
        <h3>The Embassy</h3>
        <p class="s">The Zi Republic Embassy<br>6 Founding Day Avenue<br>Ripple, Zi Republic</p>
      </div>
    </div>
    <p class="legal">&copy; 2026 Zibura. Your expression, your world.</p>
  </div>
</footer>
${MODAL}
<script src="/assets/app.js" defer></script>
</body>
</html>
`;
}

function card(p) {
  return `<a class="card" href="/piece/${esc(p.slug)}/">
  <div class="plate"></div>
  <div class="info"><span class="nm">${esc(p.name)}</span><span class="price" data-price-for="${esc(p.slug)}"></span><span class="cat">${esc(p.type)}</span><span class="rate" data-rating-for="${esc(p.slug)}"></span></div>
</a>`;
}

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

const TICK = Array.from({ length: 5 }, () => `<li>Your expression, your world.</li><li class="gl"></li>`).join("");

// Home
write(
  "index.html",
  layout({
    title: "Zibura",
    description: "Zibura is a world built for human expression, in all its complexity.",
    page: "home",
    body: `<main>
<section class="hero" data-hero>
  <span class="orb o1" data-depth="34"></span>
  <span class="orb o2" data-depth="-22"></span>
  <span class="orb o3" data-depth="14"></span>
  <div class="center">
    <h1 class="display rise">${words("Your expression, your world.")}</h1>
    <p class="lede fade">Step into Zi Republic, where every Piece is another way of saying exactly who you are.</p>
    <div class="actions fade">
      <a class="btn" href="/shop/">Shop Signal I</a>
      <a class="btn line" href="/brand/">Enter the world</a>
    </div>
  </div>
  <div class="foot"><span>Signal I, Arc I</span><a class="text-link" href="#pieces">Scroll</a></div>
</section>

<section class="ticker" aria-hidden="true"><div class="track"><ul>${TICK}</ul><ul>${TICK}</ul></div></section>

<section class="section" id="pieces">
  <div class="wrap">
    <div class="section-head" data-reveal>
      <h2>Signal I, Arc I</h2>
      <div class="rail-nav"><button type="button" data-rail="-1" aria-label="Previous Pieces">&larr;</button><button type="button" data-rail="1" aria-label="Next Pieces">&rarr;</button></div>
    </div>
  </div>
  <div class="rail" data-rail-track>
${products.slice(0, 8).map(card).join("\n")}
  </div>
  <div class="wrap" style="margin-top:36px"><a class="text-link" href="/shop/">See every Piece</a></div>
</section>

<section class="section" style="padding-top:0">
  <div class="wrap">
    <div class="section-head" data-reveal><h2>Who are you dressing?</h2></div>
    <div class="who" data-reveal>
${AUDIENCES.map((a) => `      <a href="/shop/?audience=${a}"><span>${a}</span><small>${countIn((p) => p.audience === a || p.audience === "Everyone")} Pieces</small></a>`).join("\n")}
    </div>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="wrap">
    <div class="section-head" data-reveal><h2>Find your way in</h2></div>
    <div class="cats" data-cats>
${TAX.map((c) => {
  const n = countIn((p) => p.category === c.name);
  return `      <a href="/shop/?category=${encodeURIComponent(c.name)}" data-count="${n} ${n === 1 ? "Piece" : "Pieces"}">${esc(c.name)}</a>`;
}).join("\n")}
    </div>
  </div>
</section>

<section class="section statement">
  <div class="wrap">
    <p class="scrollwords" data-scrollwords>Some brands sell you clothes. Zi Republic hands you a place to belong. Every Signal opens a new era, every Arc tells its story, and every Piece lets you say a little more of who you are.</p>
    <p style="margin-top:40px" data-reveal><a class="btn line" href="/brand/">Explore the republic</a></p>
  </div>
</section>

<section class="section navy-band">
  <div class="wrap split">
    <div data-reveal>${flipCard()}</div>
    <div data-reveal>
      <h2 class="display">Residency is earned.</h2>
      <p class="lead">Apply for your Zi Card and the Ministry of Zi Interior will take a look. Approved applicants receive standing, Zillar, and experiences money alone cannot buy.</p>
      <p style="margin-top:32px"><a class="btn light" href="/zi-card/">Apply for your Zi Card</a></p>
    </div>
  </div>
</section>
</main>`
  })
);

// Brand
const PROVINCES = [
  ["Ripple", "Blue", "#111c44", "The capital. Composed, curious, magnetic.", "Ripple is the calm at the center of the republic. It is where ideas gather before they move, and where every big wave begins as one small ring in still water.", ["Composed", "Curious", "Magnetic"]],
  ["Glow", "Yellow", "#ffce1b", "Warm, generous, impossible to miss.", "Glow walks into a room and the room remembers it. Generous with attention and quick with joy, Glow turns every gathering into an occasion.", ["Warm", "Generous", "Radiant"]],
  ["Blaze", "Red", "#960018", "Bold, certain, unapologetic.", "Blaze says it first and says it loudest. Decisions come fast, taste comes strong, and apologies never come at all.", ["Bold", "Certain", "Fearless"]],
  ["Bloom", "Green", "#3a5a54", "Patient, rooted, always growing.", "Bloom is soft on the surface and deeply rooted underneath. It takes its time, and it is always becoming something new.", ["Patient", "Grounded", "Growing"]],
  ["Dash", "Orange", "#ff7900", "Quick, playful, already on to the next thing.", "Dash is mid-motion at all times. Ideas arrive fast, plans change faster, and the party is wherever Dash is headed.", ["Quick", "Playful", "Restless"]],
  ["Swirl", "Purple", "#684787", "Dreamy, layered, a little mysterious.", "Swirl holds many versions of itself at once. Every look has a second meaning, and every answer opens another question.", ["Dreamy", "Layered", "Mysterious"]]
];
const CALENDAR = [
  ["Founding Day", "The republic's birthday. One day each year to celebrate how it all began."],
  ["Ziesta", "The republic's holiday. A day set aside to slow down, gather, and dress for joy."],
  ["Signal Day", "The day a new Signal opens and the republic enters a new era."]
];
write(
  "brand/index.html",
  layout({
    title: "Zi Republic | Zibura",
    description: "Zibura is a fashion and lifestyle brand built for personal expression, across clothing, accessories, and lifestyle products.",
    page: "brand",
    body: `<main>
<section class="page-head"><div class="wrap">
  <h1 class="display rise">${words("Express every version of you.")}</h1>
  <p class="fade">Zibura is a fashion and lifestyle world for people who live from the inside out, and every Piece is an invitation to be all of it, without apology.</p>
</div></section>

<section class="section"><div class="wrap split">
  <h2 class="display" data-reveal>A whole country, built for you.</h2>
  <div class="prose" data-reveal>
    <p class="big">Zi Republic is where everything we create lives.</p>
    <p>We open it to you in Signals, creative eras that begin when the vision is ready and end when it has been fully expressed. Each Signal holds Arcs, full collections with a story of their own.</p>
  </div>
</div></section>

<section class="section" style="padding-top:0"><div class="wrap split">
  <h2 class="display" data-reveal>Signal I begins here.</h2>
  <div class="prose" data-reveal>
    <p class="big">Arc I is play, turned all the way up.</p>
    <p>A collection for the version of you who is already dancing before the music starts.</p>
    <p><a class="btn" href="/shop/">Shop Signal I</a></p>
  </div>
</div></section>

<section class="section" id="provinces" style="padding-top:0"><div class="wrap">
  <div class="section-head" data-reveal><h2>Six provinces, six personalities</h2><span class="small">Find your home province</span></div>
  <div class="provinces" data-reveal>
${PROVINCES.map(
  ([n, c, hex, line, note, traits]) => `    <article class="province" tabindex="0" style="--pc:${hex}">
      <span class="pdot"></span>
      <div class="pbody">
        <h3>${n}</h3>
        <p class="pline">${line}</p>
        <div class="pmore"><p>${note}</p><ul>${traits.map((t) => `<li>${t}</li>`).join("")}</ul></div>
      </div>
    </article>`
).join("\n")}
  </div>
</div></section>

<section class="section" id="calendar" style="padding-top:0"><div class="wrap split">
  <h2 class="display" data-reveal>The calendar of the republic.</h2>
  <dl class="plain-list" data-reveal>
${CALENDAR.map(([n, d]) => `    <div><dt>${n}</dt><dd>${d}</dd><span class="tag-soon">Date announced soon</span></div>`).join("\n")}
  </dl>
</div></section>

<section class="section" style="padding-top:0"><div class="wrap split">
  <h2 class="display" data-reveal>Belonging, in three parts.</h2>
  <dl class="plain-list" data-reveal>
    <div><dt>Zi Resident</dt><dd>Your way in. Every Zi Card holder starts here, inside the world.</dd></div>
    <div><dt>Zitizen</dt><dd>The inner circle of the republic, earned by how you show up.</dd></div>
    <div><dt>Zillar</dt><dd>The republic's own currency. Every order builds your standing, and Zillar unlocks access and experiences money alone cannot buy.</dd></div>
  </dl>
</div></section>

<section class="section" style="padding-top:0"><div class="wrap">
  <div class="section-head" data-reveal><h2>Everything you reach for</h2></div>
  <ul class="world-list" data-reveal>
${TAX.map((c) => `    <li><a href="/shop/?category=${encodeURIComponent(c.name)}">${esc(c.name)}</a></li>`).join("\n")}
  </ul>
</div></section>

<section class="section navy-band"><div class="wrap split">
  <h2 class="display" data-reveal>Your new favorite brand is waiting.</h2>
  <div class="prose" data-reveal>
    <p class="big">Move through the world on your own terms. We will meet you there.</p>
    <p style="margin-top:28px"><a class="btn light" href="/waitlist/" data-open-waitlist>Save my place</a></p>
  </div>
</div></section>
</main>`
  })
);

// Waitlist
write(
  "waitlist/index.html",
  layout({
    title: "Join the waitlist | Zibura",
    description: "Join the Zibura waitlist for first word on Signal I.",
    page: "waitlist",
    body: `<main>
<section class="page-head"><div class="wrap">
  <h1 class="display rise">${words("Be there when the world opens.")}</h1>
  <p class="fade">Leave your details and Signal I finds you first.</p>
</div></section>
<section class="section" style="padding-top:clamp(16px,3vw,40px)"><div class="wrap">
  <div class="form-card">${waitlistForm("p")}</div>
</div></section>
</main>`
  })
);

// Zi Card
write(
  "zi-card/index.html",
  layout({
    title: "The Zi Card | Zibura",
    description: "Apply for the Zi Card, your passport into Zi Republic.",
    page: "zicard",
    body: `<main>
<section class="page-head"><div class="wrap">
  <h1 class="display rise">${words("Earn your place in Zi Republic.")}</h1>
  <p class="fade">Residency is by application. Show us who you are, and the Ministry of Zi Interior will take it from there.</p>
</div></section>
<section class="section" style="padding-top:clamp(16px,3vw,40px)"><div class="wrap split">
  <div data-reveal>${flipCard()}</div>
  <div data-reveal>
    <ol class="steps">
      <li><div><b>Create your account.</b><span>Your first step into the republic.</span></div></li>
      <li><div><b>Upload your portrait and apply.</b><span>Every application is read by the Ministry of Zi Interior.</span></div></li>
      <li><div><b>Check back in two days.</b><span>If you are approved, your Zi Card will be waiting in your account, ready to download and carry everywhere.</span></div></li>
    </ol>
    <p style="margin-top:40px"><a class="btn" href="#" aria-disabled="true">Applications open soon</a></p>
    <p class="small" style="margin-top:16px">Want first word when they open? <a href="/waitlist/" data-open-waitlist>Join the waitlist</a>.</p>
  </div>
</div></section>
<section class="section navy-band"><div class="wrap split">
  <h2 class="display" data-reveal>Arrive as a Resident. Earn your way to Zitizen.</h2>
  <dl class="plain-list light" data-reveal>
    <div><dt>Zi Resident</dt><dd>Your way in. Every approved applicant begins here.</dd></div>
    <div><dt>Zitizen</dt><dd>The inner circle, earned by how you show up.</dd></div>
    <div><dt>Zillar</dt><dd>The republic's own currency, earned and spent your way.</dd></div>
  </dl>
</div></section>
</main>`
  })
);

// Founder's note
write(
  "note/index.html",
  layout({
    title: "From the founder | Zibura",
    description: "A letter from Ruova, founder of Zibura.",
    page: "note",
    body: `<main class="note">
  <div class="photo" data-reveal><img src="/assets/ruova.jpg" alt="Ruova, founder of Zibura" width="1000" height="1500"></div>
  <div class="body">
    <h1 class="display rise" style="font-size:clamp(36px,5vw,72px)">${words("A letter from Ruova.")}</h1>
    <div class="letter fade">
      <p>Most of us carry more than one version of ourselves. The one who dresses for the day, the one who shows up at night, the one only close friends ever meet. I wanted a world where every one of them is welcome.</p>
      <p>Zibura asks one thing of clothing: hold all of me. My mood, my personality, my story, all at once.</p>
      <p>So we built a country around the answer. Zi Republic has provinces, Signals, Arcs, a currency of its own, and a card that makes you one of us. Every Piece is a small part of that country, made to be worn out loud.</p>
      <p>Complexity is not contradiction. You can be soft and fierce, quiet and loud, playful and exact, and still be entirely yourself. Wear every version.</p>
      <p>Welcome to Zi Republic. Your expression, your world.</p>
    </div>
    <p class="sign">Ruova</p>
  </div>
</main>`
  })
);

// Shop
write(
  "shop/index.html",
  layout({
    title: "Shop | Zibura",
    description: "Every Piece in the Zibura world.",
    page: "shop",
    body: `<main class="wrap">
<div class="page-head" style="padding-left:0;padding-right:0"><h1 class="display rise">${words("Shop the republic.")}</h1><p class="fade">Signal I, Arc I. Choose your color, choose your size, make it yours.</p></div>
<div class="toolbar">
  <button type="button" class="btn line small-btn" id="open-filters">Filters</button>
  <p class="count" id="count" role="status"></p>
  <label class="sort">Sort <select id="sort" aria-label="Sort Pieces">
    <option value="new">Newest</option>
    <option value="rated">Top rated</option>
    <option value="low">Price, low to high</option>
    <option value="high">Price, high to low</option>
    <option value="az">Name, A to Z</option>
  </select></label>
</div>
<div class="chips" id="chips"></div>
<div class="shop-layout">
  <aside class="filters-pane" id="filters-pane" aria-label="Filters">
    <div class="pane-head"><strong>Filters</strong><button type="button" class="close-pane" id="close-filters" aria-label="Close filters">&times;</button></div>
    <div id="facets"></div>
    <div class="pane-foot"><button type="button" class="btn" id="apply-filters">Show results</button></div>
  </aside>
  <div>
    <div class="grid shop-grid" id="grid"></div>
  </div>
</div>
<div style="height:clamp(56px,8vw,110px)"></div>
</main>`
  })
);

// Piece pages
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
  const sizes = p.sizes
    .map((s, k) => `<label><input type="radio" name="size" value="${esc(s)}"${k === 0 ? " checked" : ""}><span>${esc(s)}</span></label>`)
    .join("\n        ");
  const related = products.filter((q) => q.slug !== p.slug && q.category === p.category).slice(0, 4);
  const more = (related.length ? related : products.filter((q) => q.slug !== p.slug).slice(0, 4)).map(card).join("\n");
  write(
    `piece/${p.slug}/index.html`,
    layout({
      title: `${p.name} | Zibura`,
      description: p.description,
      page: "piece",
      body: `<main class="wrap piece-page" data-slug="${esc(p.slug)}">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/shop/">Shop</a> <span>/</span> <a href="/shop/?audience=${esc(p.audience)}">${esc(p.audience)}</a> <span>/</span> <a href="/shop/?category=${encodeURIComponent(p.category)}">${esc(p.category)}</a> <span>/</span> <a href="/shop/?category=${encodeURIComponent(p.category)}&amp;type=${encodeURIComponent(p.type)}">${esc(p.type)}</a></nav>
  <div class="piece">
    <div class="gallery" aria-label="Photos of ${esc(p.name)}">
      <div class="ph big"></div><div class="ph"></div><div class="ph"></div><div class="ph"></div>
    </div>
    <div class="buy">
      <p class="crumb">${esc(p.signal)}, ${esc(p.arc)}</p>
      <h1 class="display">${esc(p.name)}</h1>
      <a class="rate-line" href="#reviews" data-rating-for="${esc(p.slug)}" data-long="1"></a>
      <span class="price" data-price-for="${esc(p.slug)}"></span>
      <p class="desc">${esc(p.description)}</p>
      <form id="add-form">
        <fieldset class="field">
          <legend>Color: <b id="color-name">${esc(p.colors[0])}</b></legend>
          <div class="opts swatches">
        ${colors}
          </div>
        </fieldset>
        <fieldset class="field">
          <legend>Size</legend>
          <div class="opts">
        ${sizes}
          </div>
        </fieldset>
        <button class="btn wide" type="submit">Add to cart</button>
        <div class="msg" id="msg" role="status"></div>
      </form>
    </div>
  </div>

  <section class="reviews" id="reviews" aria-labelledby="rev-h">
    <div class="rev-grid">
      <div>
        <h2 class="display" id="rev-h">Reviews</h2>
        <div id="rev-summary" class="rev-summary"></div>
      </div>
      <div>
        <div id="rev-list" class="rev-list"></div>
        <form id="review-form" class="review-form" novalidate>
          <h3>Share your take</h3>
          <fieldset class="rate-input">
            <legend>Your rating</legend>
            <div class="rate-stars">
              ${[5, 4, 3, 2, 1].map((n) => `<input type="radio" id="r${n}" name="rating" value="${n}"><label for="r${n}" title="${n} out of 5">★</label>`).join("")}
            </div>
          </fieldset>
          <div class="form-grid">
            <div class="full"><label for="rv-name">Your name</label><input id="rv-name" name="name" autocomplete="name" maxlength="60"></div>
            <div class="full"><label for="rv-title">Headline</label><input id="rv-title" name="title" maxlength="100"></div>
            <div class="full"><label for="rv-body">Your comment</label><textarea id="rv-body" name="body" rows="5" maxlength="1500"></textarea></div>
            <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
          </div>
          <button class="btn" type="submit">Post my review</button>
          <div class="msg" id="rv-msg" role="status"></div>
        </form>
      </div>
    </div>
  </section>

  <section class="more">
    <div class="section-head"><h2>More from ${esc(p.category)}</h2><a class="text-link" href="/shop/?category=${encodeURIComponent(p.category)}">See all</a></div>
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
    title: "Cart | Zibura",
    description: "Your cart.",
    page: "cart",
    body: `<main class="wrap">
<div class="page-head" style="padding-left:0;padding-right:0"><h1 class="display rise">${words("Your cart.")}</h1></div>
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
    title: "Thank you | Zibura",
    description: "Your payment went through.",
    page: "thanks",
    body: `<main class="thanks">
<h1 class="display rise">${words("Welcome to the republic.")}</h1>
<p class="fade">Your payment went through. Your Pieces are now part of your world.</p>
<a class="btn" href="/shop/">Keep exploring</a>
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
  "zi-card-seal.png",
  "zi-card-bg.png",
  "zi-card-back.png"
]) {
  write("assets/" + f, fs.readFileSync(find(f)));
}
write("_worker.js", fs.readFileSync(find("_worker.js")));
write("catalog.json", JSON.stringify(products));
write("taxonomy.json", JSON.stringify(TAX));
write("colors.json", JSON.stringify(COLORS));

console.log("Built " + products.length + " Pieces into dist/");
