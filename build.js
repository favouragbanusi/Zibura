// Builds the Zibura storefront into the dist folder.
// Run with: node build.js
const fs = require("fs");
const path = require("path");

const root = __dirname;
const dist = path.join(root, "dist");
const products = JSON.parse(fs.readFileSync(path.join(root, "data", "products.json"), "utf8"));

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

function layout({ title, description, page, body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="stylesheet" href="/assets/styles.css">
</head>
<body data-page="${page}">
<header class="site">
  <div class="wrap">
    <a class="logo" href="/">ZIBURA</a>
    <nav class="main" aria-label="Main">
      <a href="/shop/">Shop</a>
      <a href="/cart/">Cart (<span id="cart-count">0</span>)</a>
      <label class="meta" for="currency" style="display:none">Currency</label>
      <select id="currency" class="cur" aria-label="Currency">
        <option value="CAD">CAD</option>
        <option value="USD">USD</option>
        <option value="GBP">GBP</option>
        <option value="NGN">NGN</option>
      </select>
    </nav>
  </div>
</header>
${body}
<footer class="site">
  <div class="wrap">
    <p class="tag">Your expression, your world.</p>
    <p>Zibura is a world built for human expression, in all its complexity.</p>
  </div>
</footer>
<script src="/assets/app.js" defer></script>
</body>
</html>
`;
}

function card(p) {
  return `<a class="card" href="/piece/${esc(p.slug)}/">
  <div class="ph">${esc(p.name)}</div>
  <p class="name">${esc(p.name)}</p>
  <span class="meta">${esc(p.category)}</span>
  <span class="meta price" data-price-for="${esc(p.slug)}"></span>
</a>`;
}

const categories = [];
products.forEach((p) => {
  if (!categories.includes(p.category)) categories.push(p.category);
});
const arcs = [];
products.forEach((p) => {
  const key = p.signal + ", " + p.arc;
  if (!arcs.includes(key)) arcs.push(key);
});

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
  <div class="wrap">
    <h1>Your expression, your world.</h1>
    <p>Zibura is a world built for human expression, in all its complexity.</p>
    <a class="btn" href="/shop/">Shop the Pieces</a>
  </div>
</section>
<section class="block">
  <div class="wrap">
    <h2>Shop by category</h2>
    <div class="cats">
${categories.map((c) => `      <a href="/shop/?category=${encodeURIComponent(c)}">${esc(c)}</a>`).join("\n")}
    </div>
  </div>
</section>
<section class="block">
  <div class="wrap">
    <h2>Signal I</h2>
    <div class="grid">
${products.slice(0, 8).map(card).join("\n")}
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
<h1 class="page-title">Shop</h1>
<div class="filters" id="filters">
  <input type="search" id="search" placeholder="Search Pieces" aria-label="Search Pieces">
</div>
<div class="grid" id="grid"></div>
<div style="height:64px"></div>
</main>`
  })
);

// Piece pages
products.forEach((p) => {
  const colors = p.colors
    .map(
      (c, i) =>
        `<label><input type="radio" name="color" value="${esc(c)}"${i === 0 ? " checked" : ""}><span>${esc(c)}</span></label>`
    )
    .join("\n        ");
  const sizes = p.sizes
    .map(
      (s, i) =>
        `<label><input type="radio" name="size" value="${esc(s)}"${i === 0 ? " checked" : ""}><span>${esc(s)}</span></label>`
    )
    .join("\n        ");
  write(
    `piece/${p.slug}/index.html`,
    layout({
      title: `${p.name} | Zibura`,
      description: p.description,
      page: "piece",
      body: `<main class="wrap piece" data-slug="${esc(p.slug)}">
  <div class="ph" style="aspect-ratio:4/5">${esc(p.name)}</div>
  <div>
    <span class="meta">${esc(p.signal)}, ${esc(p.arc)} &middot; ${esc(p.category)}</span>
    <h1>${esc(p.name)}</h1>
    <span class="price" data-price-for="${esc(p.slug)}"></span>
    <p>${esc(p.description)}</p>
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
<h1 class="page-title">Cart</h1>
<div id="cart"></div>
<div class="msg" id="cart-msg" role="status"></div>
<div style="height:64px"></div>
</main>`
  })
);

// Thank you
write(
  "thanks/index.html",
  layout({
    title: "Thank you | Zibura",
    description: "Your order is confirmed.",
    page: "thanks",
    body: `<main class="wrap">
<h1 class="page-title">Thank you.</h1>
<p>Your payment went through. A receipt is on its way to your email.</p>
<p><a class="btn" href="/shop/">Keep shopping</a></p>
<div style="height:64px"></div>
</main>`
  })
);

// Assets and catalog
write("assets/styles.css", fs.readFileSync(path.join(root, "src", "styles.css")));
write("assets/app.js", fs.readFileSync(path.join(root, "src", "app.js")));
write("catalog.json", JSON.stringify(products));

console.log("Built " + products.length + " Pieces into dist/");
