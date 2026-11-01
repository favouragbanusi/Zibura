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

const BAND = `<div class="band" aria-hidden="true"><span class="p-ripple"></span><span class="p-glow"></span><span class="p-blaze"></span><span class="p-bloom"></span><span class="p-dash"></span><span class="p-swirl"></span></div>`;

function layout({ title, description, page, body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#111c44">
<link rel="icon" href="/assets/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..700&family=DM+Sans:wght@400;500;700&display=swap">
<link rel="stylesheet" href="/assets/styles.css">
</head>
<body data-page="${page}">
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="/" aria-label="Zibura home"><img src="/assets/logo-wordmark-sky.png" alt="Zibura" width="636" height="120"></a>
    <nav class="nav" aria-label="Main">
      <a href="/shop/">Shop</a>
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
${BAND}
<footer class="site-footer">
  <div class="wrap">
    <div>
      <img class="word" src="/assets/logo-wordmark-sky.png" alt="Zibura" width="636" height="120">
      <p class="tag">Your expression, your world.</p>
      <p class="one">Zibura is a world built for human expression, in all its complexity.</p>
    </div>
    <nav aria-label="Footer">
      <a href="/shop/">Shop</a>
      <a href="/cart/">Cart</a>
      <a href="/#zi-card">Zi Card</a>
    </nav>
  </div>
</footer>
<script src="/assets/app.js" defer></script>
</body>
</html>
`;
}

function card(p, i) {
  return `<a class="card" href="/piece/${esc(p.slug)}/" data-tone="${i % 6}">
  <div class="plate"><img class="mark" src="/assets/logo-icon-navy.png" alt="" width="434" height="436"><span class="plate-name">${esc(p.name)}</span></div>
  <div class="info"><span class="cat">${esc(p.category)}</span><span class="price" data-price-for="${esc(p.slug)}"></span></div>
</a>`;
}

const categories = [];
products.forEach((p) => {
  if (!categories.includes(p.category)) categories.push(p.category);
});

const EXPORTS = ["Looks", "Vibes", "Silhouettes", "Stories", "Scents", "Movement", "Emotions"];
const exportsList = EXPORTS.map((e) => `<li>${e}</li>`).join("");

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

// Home
write(
  "index.html",
  layout({
    title: "Zibura",
    description: "Zibura is a world built for human expression, in all its complexity.",
    page: "home",
    body: `<main>
<section class="hero">
  <img class="emblem" src="/assets/logo-icon-sky.png" alt="" width="434" height="436">
  <div class="wrap">
    <h1 class="display">Your expression, your world.</h1>
    <p class="lede">We didn't start a brand. We started a country.</p>
    <div class="actions">
      <a class="btn sky" href="/shop/">Shop the Pieces</a>
      <a class="btn ghost" href="#zi-card">Get your Zi Card</a>
    </div>
  </div>
</section>

<section class="exports" aria-label="The republic's exports">
  <div class="track">
    <ul>${exportsList}</ul>
    <ul aria-hidden="true">${exportsList}</ul>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head">
      <h2 class="display">Shop by category</h2>
      <p>Every Piece in the republic, grouped the way you reach for it.</p>
    </div>
    <div class="tiles">
${categories
  .map((c) => {
    const n = products.filter((p) => p.category === c).length;
    return `      <a class="tile" href="/shop/?category=${encodeURIComponent(c)}"><span class="name">${esc(c)}</span><span class="count">${n} ${n === 1 ? "Piece" : "Pieces"}</span></a>`;
  })
  .join("\n")}
    </div>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="wrap">
    <div class="section-head">
      <h2 class="display">The latest Pieces</h2>
      <a class="text-link" href="/shop/">See every Piece</a>
    </div>
    <div class="grid">
${products.slice(0, 8).map(card).join("\n")}
    </div>
  </div>
</section>

<section class="section zi" id="zi-card">
  <div class="wrap">
    <div class="zi-card" aria-hidden="true">
      <img class="mark" src="/assets/logo-icon-sky.png" alt="" width="434" height="436">
      <div>
        <p class="big">Zi Card</p>
        <p class="sub">Zi Resident</p>
      </div>
      <div class="bar"><span class="p-ripple"></span><span class="p-glow"></span><span class="p-blaze"></span><span class="p-bloom"></span><span class="p-dash"></span><span class="p-swirl"></span></div>
    </div>
    <div>
      <h2 class="display">Get your Zi Card.</h2>
      <p class="intro">Anyone can apply to become a Zi Resident. The card is issued after a short wait, by design. The wait is part of wanting it.</p>
      <dl class="terms">
        <div><dt>Zi Resident</dt><dd>A Zi Card holder, inside the world, not yet a citizen.</dd></div>
        <div><dt>Zitizen</dt><dd>A citizen of Zi Republic. Zitizenship is earned, not bought and not automatic.</dd></div>
        <div><dt>Zillar</dt><dd>The republic's own currency, earned and spent, separate from political standing.</dd></div>
      </dl>
      <a class="btn quiet" href="#zi-card" aria-disabled="true">Applications open soon</a>
    </div>
  </div>
</section>
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
<div class="page-head"><h1 class="display">Shop</h1></div>
<div class="filters" id="filters">
  <input type="search" id="search" placeholder="Search Pieces" aria-label="Search Pieces">
</div>
<div class="grid" id="grid"></div>
<div style="height:clamp(56px,8vw,110px)"></div>
</main>`
  })
);

// Piece pages
products.forEach((p, i) => {
  const colors = p.colors
    .map(
      (c, k) =>
        `<label><input type="radio" name="color" value="${esc(c)}"${k === 0 ? " checked" : ""}><span>${esc(c)}</span></label>`
    )
    .join("\n        ");
  const sizes = p.sizes
    .map(
      (s, k) =>
        `<label><input type="radio" name="size" value="${esc(s)}"${k === 0 ? " checked" : ""}><span>${esc(s)}</span></label>`
    )
    .join("\n        ");
  write(
    `piece/${p.slug}/index.html`,
    layout({
      title: `${p.name} | Zibura`,
      description: p.description,
      page: "piece",
      body: `<main class="wrap piece" data-slug="${esc(p.slug)}">
  <div class="plate" data-tone="${i % 6}"><img class="mark" src="/assets/logo-icon-navy.png" alt="" width="434" height="436"><span class="plate-name">${esc(p.name)}</span></div>
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
<div class="page-head"><h1 class="display">Cart</h1></div>
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
    body: `<main class="wrap thanks">
<img src="/assets/logo-icon-navy.png" alt="" width="434" height="436">
<h1 class="display">Thank you.</h1>
<p>Your payment went through. Welcome to the republic.</p>
<a class="btn" href="/shop/">Keep shopping</a>
</main>`
  })
);

// Assets and catalog
write("assets/styles.css", fs.readFileSync(find("styles.css", "src/styles.css")));
write("assets/app.js", fs.readFileSync(find("app.js", "src/app.js")));
for (const f of [
  "logo-icon-navy.png",
  "logo-icon-sky.png",
  "logo-wordmark-sky.png",
  "logo-wordmark-navy.png",
  "favicon.png"
]) {
  write("assets/" + f, fs.readFileSync(find(f, "assets/" + f)));
}
write("_worker.js", fs.readFileSync(find("_worker.js")));
write("catalog.json", JSON.stringify(products));

console.log("Built " + products.length + " Pieces into dist/");
