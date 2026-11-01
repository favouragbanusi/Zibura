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

const categories = [];
products.forEach((p) => {
  if (!categories.includes(p.category)) categories.push(p.category);
});

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
  <div class="z-photo"><img src="/assets/logo-icon-navy.png" alt="" width="434" height="436"></div>
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
      <a href="/shop/">Shop</a>
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
${categories.map((c) => `        <a href="/shop/?category=${encodeURIComponent(c)}">${esc(c)}</a>`).join("\n")}
      </div>
      <div>
        <h3>Zi Republic</h3>
        <a href="/brand/">The world</a>
        <a href="/note/">From the founder</a>
        <a href="/zi-card/">The Zi Card</a>
        <a href="/waitlist/" data-open-waitlist>Join the waitlist</a>
        <a href="/cart/">Cart</a>
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
  <div class="plate"><img class="mark" src="/assets/logo-icon-navy.png" alt="" width="434" height="436"></div>
  <div class="info"><span class="nm">${esc(p.name)}</span><span class="price" data-price-for="${esc(p.slug)}"></span><span class="cat">${esc(p.category)}</span></div>
</a>`;
}

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

const TICK = Array.from({ length: 5 }, () => `<li>Your expression, your world.</li><li class="gl"><img src="/assets/logo-icon-navy.png" alt="" width="434" height="436"></li>`).join("");

// Home
write(
  "index.html",
  layout({
    title: "Zibura",
    description: "Zibura is a world built for human expression, in all its complexity.",
    page: "home",
    body: `<main>
<section class="hero" data-hero>
  <img class="z z1" src="/assets/logo-icon-navy.png" alt="" width="434" height="436" data-depth="30">
  <img class="z z2" src="/assets/logo-icon-sky.png" alt="" width="434" height="436" data-depth="-18">
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
${products.slice(0, 8).map((p) => card(p)).join("\n")}
  </div>
  <div class="wrap" style="margin-top:36px"><a class="text-link" href="/shop/">See every Piece</a></div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head" data-reveal><h2>Find your way in</h2></div>
    <div class="cats" data-cats>
${categories
  .map((c) => {
    const n = products.filter((p) => p.category === c).length;
    return `      <a href="/shop/?category=${encodeURIComponent(c)}" data-count="${n} ${n === 1 ? "Piece" : "Pieces"}">${esc(c)}</a>`;
  })
  .join("\n")}
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
      <h2 class="display">Your passport to the republic.</h2>
      <p class="lead">One card opens the door to standing, to Zillar, and to experiences money alone cannot buy.</p>
      <p style="margin-top:32px"><a class="btn light" href="/zi-card/">Claim your Zi Card</a></p>
    </div>
  </div>
</section>
</main>`
  })
);

// Brand
const PROVINCES = [
  ["Ripple", "the capital"],
  ["Glow", ""],
  ["Blaze", ""],
  ["Bloom", ""],
  ["Dash", ""],
  ["Swirl", ""]
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
  <h2 class="display" data-reveal>A whole world, built for you.</h2>
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

<section class="section" style="padding-top:0"><div class="wrap">
  <div class="section-head" data-reveal><h2>Six provinces, one republic</h2></div>
  <ul class="dotlist" data-reveal>
${PROVINCES.map(([n, r]) => `    <li>${n}${r ? ` <span class="role">${r}</span>` : ""}</li>`).join("\n")}
  </ul>
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
    <li>Ready to Wear</li><li>Accessories</li><li>Bags and Footwear</li><li>Fragrance</li><li>Lifestyle and Objects</li>
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
    description: "The Zi Card is your passport into Zi Republic.",
    page: "zicard",
    body: `<main>
<section class="page-head"><div class="wrap">
  <h1 class="display rise">${words("Your passport to Zi Republic.")}</h1>
  <p class="fade">Apply once, and in two days the republic has a card with your name on it.</p>
</div></section>
<section class="section" style="padding-top:clamp(16px,3vw,40px)"><div class="wrap split">
  <div data-reveal>${flipCard()}</div>
  <div data-reveal>
    <ol class="steps">
      <li><div><b>Create your account.</b><span>Your home inside the republic.</span></div></li>
      <li><div><b>Apply with your portrait.</b><span>Show us your face and your name. We take it from there.</span></div></li>
      <li><div><b>Collect your card.</b><span>Come back in two days. It will be waiting in your account, ready to download and carry everywhere.</span></div></li>
    </ol>
    <p style="margin-top:40px"><a class="btn" href="#" aria-disabled="true">Applications open soon</a></p>
    <p class="small" style="margin-top:16px">Want the first word? <a href="/waitlist/" data-open-waitlist>Join the waitlist</a>.</p>
  </div>
</div></section>
<section class="section navy-band"><div class="wrap split">
  <h2 class="display" data-reveal>Arrive as a Resident. Become a Zitizen.</h2>
  <dl class="plain-list light" data-reveal>
    <div><dt>Zi Resident</dt><dd>Your way in. Every card holder begins here.</dd></div>
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
    <p class="fade">Ruova is putting the words together. Come back soon.</p>
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
<div class="filters" id="filters">
  <input type="search" id="search" placeholder="Search Pieces" aria-label="Search Pieces">
</div>
<div class="grid" id="grid"></div>
<div style="height:clamp(56px,8vw,110px)"></div>
</main>`
  })
);

// Piece pages
products.forEach((p) => {
  const colors = p.colors
    .map((c, k) => `<label><input type="radio" name="color" value="${esc(c)}"${k === 0 ? " checked" : ""}><span>${esc(c)}</span></label>`)
    .join("\n        ");
  const sizes = p.sizes
    .map((s, k) => `<label><input type="radio" name="size" value="${esc(s)}"${k === 0 ? " checked" : ""}><span>${esc(s)}</span></label>`)
    .join("\n        ");
  write(
    `piece/${p.slug}/index.html`,
    layout({
      title: `${p.name} | Zibura`,
      description: p.description,
      page: "piece",
      body: `<main class="wrap piece" data-slug="${esc(p.slug)}">
  <div class="plate"><img class="mark" src="/assets/logo-icon-navy.png" alt="" width="434" height="436"></div>
  <div>
    <p class="crumb"><a href="/shop/?category=${encodeURIComponent(p.category)}">${esc(p.category)}</a>, ${esc(p.signal)}, ${esc(p.arc)}</p>
    <h1 class="display">${esc(p.name)}</h1>
    <span class="price" data-price-for="${esc(p.slug)}"></span>
    <p class="desc">${esc(p.description)}</p>
    <form id="add-form">
      <fieldset class="field">
        <legend>Color</legend>
        <div class="opts">
        ${colors}
        </div>
      </fieldset>
      <fieldset class="field">
        <legend>Size</legend>
        <div class="opts">
        ${sizes}
        </div>
      </fieldset>
      <button class="btn" type="submit">Add to cart</button>
      <div class="msg" id="msg" role="status"></div>
    </form>
  </div>
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
<img src="/assets/logo-icon-navy.png" alt="" width="434" height="436">
<h1 class="display rise">${words("Welcome to the republic.")}</h1>
<p class="fade">Your payment went through. Your Pieces are now part of your world.</p>
<a class="btn" href="/shop/">Keep exploring</a>
</main>`
  })
);

// Assets and catalog
write("assets/styles.css", fs.readFileSync(find("styles.css")));
write("assets/app.js", fs.readFileSync(find("app.js")));
for (const f of [
  "logo-icon-navy.png",
  "logo-icon-sky.png",
  "logo-wordmark-sky.png",
  "logo-wordmark-navy.png",
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

console.log("Built " + products.length + " Pieces into dist/");
