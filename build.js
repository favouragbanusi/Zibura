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
const AUDIENCES = ["Women", "Men"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthOptions = `<option value="">Month</option>${MONTHS.map((m, i) => `<option value="${i + 1}">${m}</option>`).join("")}`;
const dayOptions = `<option value="">Day</option>${Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("")}`;
const categories = TAX.map((c) => c.name);
const countIn = (fn) => products.filter(fn).length;

// Images and films drop in by file name. Add a file such as signal-1-cover.jpg or arc-1-film.mp4 next to build.js and it appears on the page.
function media(name, alt) {
  for (const ext of ["jpg", "jpeg", "png", "webp"]) {
    const file = path.join(root, `${name}.${ext}`);
    if (fs.existsSync(file)) {
      write(`assets/media/${name}.${ext}`, fs.readFileSync(file));
      return `<img src="/assets/media/${name}.${ext}" alt="${esc(alt)}" loading="lazy">`;
    }
  }
  return `<div class="ph-empty" role="img" aria-label="${esc(alt)}"></div>`;
}
// Returns an <img> for a product photo if the file exists, or an empty string.
function photo(name, alt) {
  for (const ext of ["jpg", "jpeg", "png", "webp"]) {
    const file = path.join(root, `${name}.${ext}`);
    if (fs.existsSync(file)) {
      write(`assets/media/${name}.${ext}`, fs.readFileSync(file));
      return `<img src="/assets/media/${name}.${ext}" alt="${esc(alt)}" loading="lazy">`;
    }
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
        <div><label for="${id}-first">First name</label><input id="${id}-first" name="first" autocomplete="given-name" required></div>
        <div><label for="${id}-last">Last name</label><input id="${id}-last" name="last" autocomplete="family-name" required></div>
        <div class="full"><label for="${id}-email">Email</label><input id="${id}-email" name="email" type="email" autocomplete="email" required></div>
        <div><label for="${id}-country">Country</label>
          <select id="${id}-country" name="country" autocomplete="country-name" required><option value="">Choose</option>${COUNTRIES.map((c) => `<option>${c}</option>`).join("")}</select></div>
        <div><label for="${id}-city">City</label><input id="${id}-city" name="city" autocomplete="address-level2" required></div>
        <div><label for="${id}-bm">Birthday month <span class="opt-tag">optional</span></label><select id="${id}-bm" name="birth_month">${monthOptions}</select></div>
        <div><label for="${id}-bd">Birthday day <span class="opt-tag">optional</span></label><select id="${id}-bd" name="birth_day">${dayOptions}</select></div>
        <div class="full"><label for="${id}-phone">Phone <span class="opt-tag">optional</span></label><input id="${id}-phone" name="phone" type="tel" autocomplete="tel"></div>
        <div class="full checks">
          <label class="check"><input type="checkbox" name="email_consent" required><span>Send me news from Zi Republic by email. I can unsubscribe at any time.</span></label>
          <label class="check"><input type="checkbox" name="sms_consent"><span>Text me about Signal I. Message and data rates may apply. Reply STOP to opt out.</span></label>
        </div>
        <input type="hidden" name="province">
        <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      </div>
      <button class="btn" type="submit">Join the Register</button>
      <div class="msg wl-msg" role="status"></div>
    </form>`;
}

function subscribeForm(id) {
  return `<form class="subscribe-form" novalidate>
      <div class="form-grid">
        <div class="full"><label for="${id}-first">Name</label><input id="${id}-first" name="first" autocomplete="given-name" required></div>
        <div class="full"><label for="${id}-email">Email</label><input id="${id}-email" name="email" type="email" autocomplete="email" required></div>
        <div class="full checks"><label class="check"><input type="checkbox" name="email_consent" required><span>Send me news from Zi Republic by email. I can unsubscribe at any time.</span></label></div>
        <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      </div>
      <button class="btn" type="submit">Subscribe</button>
      <div class="msg sub-msg" role="status"></div>
    </form>`;
}

function arrivalCard(id) {
  return `<div class="arrival">
    <div class="arr-head">
      <img src="/assets/logo-icon-navy.png" alt="" width="434" height="436">
      <div><b>Zi Republic</b><span>Bureau of Arrivals</span></div>
      <span class="arr-tag">Arrival card</span>
    </div>
    ${waitlistForm(id)}
    <div class="arr-foot">
      <img src="/assets/zi-card-seal.png" alt="" width="304" height="300">
      <span>Signal I opens its borders April 18, 2027</span>
    </div>
    <p class="mrz" aria-hidden="true">ZI&lt;REPUBLIC&lt;&lt;ARRIVALS&lt;&lt;SIGNAL&lt;I&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</p>
  </div>`;
}

const MODAL = `<dialog id="wl-modal" aria-labelledby="wl-title">
  <button class="close" type="button" aria-label="Close" data-close-waitlist>&times;</button>
  <h2 class="display" id="wl-title">Get the Zi Gazette.</h2>
  <p class="sub">News from Zi Republic, delivered to your inbox.</p>
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
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300..700&family=Public+Sans:wght@400;500;600&family=Lexend:wght@400;500;600&family=Lexend+Zetta:wght@700&family=Yellowtail&family=Mrs+Saint+Delafield&display=swap">
<link rel="stylesheet" href="/assets/styles.css">
<script>document.documentElement.className = "js";</script>
</head>
<body data-page="${page}">
<div class="notice">The first Signal is coming. <a href="/waitlist/" data-open-waitlist>Be the first to know</a></div>
<header class="site-header" id="top">
  <div class="wrap">
    <nav class="nav" aria-label="Main">
      <div class="has-mega"><a href="/shop/">Shop</a>${MEGA}</div>
      <a href="/explore/">Explore</a>
      <a href="/brand/">Zi Republic</a>
      <a href="/note/">From the founder</a>
    </nav>
    <a class="brand" href="/" aria-label="Zibura home"><img src="/assets/logo-wordmark-navy.png" alt="Zibura" width="636" height="120"></a>
    <nav class="nav right" aria-label="Account and cart">
      <a href="/zi-card/">Zi Card</a>
      <a href="/account/" id="acct-link">Sign in</a>
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
        <p class="tag">Your expression,<br>your world.</p>
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
        <a href="/brand/#calendar">The national calendar</a>
        <a href="/note/">From the founder</a>
        <a href="/zi-card/">The Zi Card</a>
        <a href="/explore/">Explore the Signals</a>
        <a href="/province/">Find your province</a>
        <a href="/waitlist/">Join the Register</a>
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
  <div class="plate">${photo(`${p.slug}-1`, p.name)}${photo(`${p.slug}-2`, p.name) ? `<span class="alt">${photo(`${p.slug}-2`, p.name)}</span>` : ""}</div>
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
    <h1 class="display rise">${words("Your expression,")}<br>${words("your world.")}</h1>
    <p class="lede fade">Zi Republic is a fashion country for people with more than one side. The borders open April 18, 2027.</p>
    <div class="actions fade">
      <a class="btn" href="#register">Join the Register</a>
      <a class="btn line" href="/brand/">Enter Zi Republic</a>
    </div>
  </div>
  <div class="foot"><span>Signal I, Arc I</span><a class="text-link" href="#pieces">Scroll</a></div>
</section>

<section class="ticker" aria-hidden="true"><div class="track"><ul>${TICK}</ul><ul>${TICK}</ul></div></section>

<section class="section register-band" id="register">
  <div class="wrap split">
    <div data-reveal>
      <h2 class="display">Join the Register.</h2>
      <p class="reg-lead">The Bureau of Arrivals is taking names. Add yours and your name goes on the register of Zi Republic, ahead of the day Signal I opens its borders.</p>
      <ul class="reg-points">
        <li>Your name on the register before the borders open</li>
        <li>First word on Signal I, April 18, 2027</li>
        <li>The Zi Gazette, straight to your inbox</li>
      </ul>
    </div>
    <div data-reveal>${arrivalCard("h")}</div>
  </div>
</section>


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
    <div class="section-head" data-reveal><h2>Start here.</h2></div>
    <div class="who" data-reveal>
${AUDIENCES.map((a) => `      <a href="/shop/?audience=${a}"><span>${a}</span><small>${countIn((p) => p.audience.includes(a))} Pieces</small></a>`).join("\n")}
    </div>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="wrap">
    <div class="section-head" data-reveal><h2>Around the republic</h2></div>
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
    <p class="scrollwords" data-scrollwords>Some brands sell you clothes. Zi Republic hands you a passport. It has provinces, a currency, a calendar, and a card with your name on it. Every Signal opens a new era. Every Arc tells its story. Every Piece lets you say a little more of who you are.</p>
    <p style="margin-top:40px" data-reveal><a class="btn line" href="/explore/">Explore the Signals</a></p>
  </div>
</section>

<section class="wrap" data-reveal style="margin-bottom:clamp(56px,8vw,120px)">
  ${film("signal-1-home-film", "Signal I, in motion. The first day of the republic.")}
</section>

<section class="section navy-band">
  <div class="wrap split">
    <div data-reveal>${flipCard()}</div>
    <div data-reveal>
      <h2 class="display">Become a resident.</h2>
      <p class="lead">The Zi Card is your passport into the republic. Apply, and the Ministry of Zi Interior reviews your application. Every resident receives standing, Zillar, and experiences money alone cannot buy.</p>
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
  ["Founding Day", "The republic's birthday, marked each year on December 1. One day to celebrate how it all began.", "December 1, 2026"],
  ["Ziesta", "The festival of rest, where fiesta meets siesta. The whole republic slows down, gathers, and dresses for joy.", ""],
  ["Zi Dawn", "The morning a new Signal opens its borders. The first Zi Dawn, the opening of Signal I, is April 18, 2027.", "April 18, 2027"]
];
write(
  "brand/index.html",
  layout({
    title: "Zi Republic | Zibura",
    description: "Zi Republic is a fashion country for people with more than one side. Provinces, a calendar, a currency, and a passport of its own.",
    page: "brand",
    body: `<main>
<section class="page-head"><div class="wrap">
  <h1 class="display rise">${words("Every version of you has a place here.")}</h1>
  <p class="fade">Expression is the most human thing we do. There is no single right way to exist, and every side of you deserves space.</p>
</div></section>

<section class="wrap" data-reveal>
  ${film("republic-film", "The republic in motion. A short film introducing Zi Republic.")}
</section>

<section class="section"><div class="wrap split">
  <h2 class="display" data-reveal>A fashion country, open to anyone.</h2>
  <div class="prose" data-reveal>
    <p class="big">Zi Republic is where everything we make lives.</p>
    <p>It has provinces, a calendar, a currency, and a passport, because belonging should feel like belonging somewhere.</p>
    <p>The republic opens to you in Signals, creative eras that begin when the vision is ready and end when it has been fully expressed. Each Signal holds Arcs, full collections with a story of their own.</p>
    <p><a class="btn line" href="/explore/">Explore the Signals</a></p>
  </div>
</div></section>

<section class="section" style="padding-top:0"><div class="wrap">
  <div class="section-head" data-reveal><h2>The Charter</h2><span class="small">What the republic stands on</span></div>
  <ol class="charter" data-reveal>
    <li><b>Article I</b><span>Expression is the most human thing we do.</span></li>
    <li><b>Article II</b><span>There is no single right way to exist.</span></li>
    <li><b>Article III</b><span>Every side of you, every version, deserves space.</span></li>
    <li><b>Article IV</b><span>Nobody is re-educated. Everyone belongs exactly as they already are.</span></li>
  </ol>
</div></section>

<section class="section" id="provinces" style="padding-top:0"><div class="wrap">
  <div class="section-head" data-reveal><h2>Six provinces. One is yours.</h2><a class="btn" href="/province/">Find your province</a></div>
  <p class="province-intro" data-reveal>Every resident of Zi Republic calls one province home. Hover over a province to meet it, or take the seven question quiz and let your answers decide.</p>
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
  <h2 class="display" data-reveal>The national calendar.</h2>
  <dl class="plain-list" data-reveal>
${CALENDAR.map(([n, d, dt]) => `    <div><dt>${n}</dt><dd>${d}</dd><span class="tag-soon">${dt || "Date announced soon"}</span></div>`).join("\n")}
  </dl>
</div></section>

<section class="section" style="padding-top:0"><div class="wrap">
  <div class="section-head" data-reveal><h2>Belonging, in three parts.</h2></div>
  <p class="big-p" data-reveal>A passport gets you in. Standing lets you stay. A currency lets you live well.</p>
  <ol class="ladder" data-reveal>
    <li><span class="rung">1</span><h3>Zi Resident</h3><p class="what">Your passport</p><p>Everyone begins here. Apply for a Zi Card and the Ministry of Zi Interior writes your name into the register. From that day you live in Zi Republic, with a card that proves it and a province to call home.</p></li>
    <li><span class="rung">2</span><h3>Zitizen</h3><p class="what">Your standing</p><p>Zitizens are the inner circle of the republic. The title is earned by how you show up, season after season, in what you wear, what you say, and who you bring with you. Every order builds your standing.</p></li>
    <li><span class="rung">3</span><h3>Zillar</h3><p class="what">Your currency</p><p>The republic keeps its own money. Zillar is earned with every order and spent on access and experiences that money alone cannot buy. The more you take part, the further it takes you.</p></li>
  </ol>
</div></section>

<section class="section" style="padding-top:0"><div class="wrap">
  <div class="section-head" data-reveal><h2>The departments</h2></div>
  <ul class="world-list" data-reveal>
${TAX.map((c) => `    <li><a href="/shop/?category=${encodeURIComponent(c.name)}">${esc(c.name)}</a></li>`).join("\n")}
  </ul>
</div></section>

<section class="section navy-band"><div class="wrap split">
  <h2 class="display" data-reveal>Take your place in the republic.</h2>
  <div class="prose" data-reveal>
    <p class="big">Join the Register and hear first when Signal I opens its borders.</p>
    <p style="margin-top:28px"><a class="btn light" href="/waitlist/">Join the Register</a></p>
  </div>
</div></section>
</main>`
  })
);

// Explore: Signals and Arcs
const PAL = { Ripple: "#111c44", Sky: "#d2eaff", Glow: "#ffce1b", Dash: "#ff7900", Blaze: "#960018", Bloom: "#3a5a54", Swirl: "#684787", White: "#ffffff", Sand: "#d9cbb4", Cream: "#f4efe3" };
const SIGNALS = [
  {
    id: "signal-1", name: "Signal I", tag: "The Opening", status: "Opens April 18, 2027",
    lead: "Every country has a first day. Signal I is ours.",
    story: [
      "Signal I is the morning the borders open. It is the first time anyone outside the republic can walk in, look around, and pick something up.",
      "We made it for the version of you who is already halfway out the door: curious, a little loud, ready to be seen. Every Piece in it is built to move with you, from the first coffee to the last song of the night.",
      "It holds two Arcs. The first turns play all the way up. The second slows down and stays a while."
    ],
    direction: [
      "Daylight, open sky, and pale studio walls. Colour arrives in small, confident hits against white and Ripple blue.",
      "Nobody is posed to sit still. Models spin, laugh, walk out of frame, and look back. Every frame should feel like the second before something good happens."
    ],
    rationale: [
      "A country needs a first impression that tells people how it feels to live there. Signal I says light, open, and in motion.",
      "It also sets the standard. Every Signal that follows is measured against how free this one feels."
    ],
    palette: ["Ripple", "Sky", "Glow", "Dash", "White"],
    materials: "Wool, cotton, silk, brass, leather, and glass.",
    mood: ["Open", "Playful", "Quick", "Warm"],
    frames: ["Opening frame. The Halo coat in the doorway of a pale studio, daylight behind it.", "Movement. A model mid-spin in the Meridian trousers, fabric catching the air.", "Detail. Brass Orbit jewelry against skin, light on the edge.", "Group. Five people crossing a white floor, each in a different province colour.", "Still life. The Rumour perfume on a pale step, a single Glow yellow ribbon beside it.", "Closing frame. The studio emptied, one coat left on a chair."],
    film: "Signal I, in motion. A ninety second film of the first day.",
    arcs: ["arc-1", "arc-2"]
  },
  {
    id: "signal-2", name: "Signal II", tag: "Sealed", status: "Date announced soon",
    lead: "The next era of the republic, still sealed.",
    story: ["A Signal begins when the vision is ready and ends when it has been fully expressed. Signal II begins when Signal I is complete.", "What we can tell you now is that it will not repeat the first one. Each era has to earn its place, and this one is still being written."],
    direction: ["The direction for Signal II is held until the first Signal has said everything it has to say."],
    rationale: ["Signals are numbered so the republic can grow without ever running out of things to say."],
    palette: ["Ripple", "Sky", "White"], materials: "Announced soon.", mood: ["Sealed", "Patient"], frames: [], film: "", arcs: []
  },
  {
    id: "signal-3", name: "Signal III", tag: "Sealed", status: "Date announced soon",
    lead: "Further down the line.",
    story: ["Every Signal opens a new chapter of the republic. Signal III is a long way ahead, and the people on the Register will hear about it first."],
    direction: ["The direction for Signal III is held."],
    rationale: ["A republic that keeps opening new chapters is one people can keep returning to."],
    palette: ["Ripple", "Sky", "White"], materials: "Announced soon.", mood: ["Sealed", "Patient"], frames: [], film: "", arcs: []
  }
];
const ARCS = [
  {
    id: "arc-1", signal: "signal-1", name: "Arc I", tag: "Play, turned all the way up.", status: "Opens April 18, 2027",
    lead: "A collection for the version of you who is already dancing before the music starts.",
    story: [
      "Arc I begins with one question. When did getting dressed stop being fun?",
      "Somewhere between the first job and the tenth meeting, most of us traded play for polish. Arc I gives it back. The coats are generous. The colours are loud on purpose. The jewelry catches the light when you turn your head.",
      "Nothing in this Arc asks you to tone anything down. It asks you to turn it up and see who notices."
    ],
    direction: [
      "Colour blocking, big silhouettes, and one unexpected accent on every look. Navy and white do the talking, and Glow yellow and Dash orange answer back.",
      "Photographed in motion and in daylight. A Piece is shown the way it is worn at its best, which is on someone who is laughing."
    ],
    rationale: [
      "Adults dress for rules. Arc I is built to remind people they were once allowed to dress for joy.",
      "It is also the right place to begin. A country that opens with play tells everyone who comes in that they can relax."
    ],
    palette: ["Ripple", "Sky", "Glow", "Dash", "White"],
    materials: "Wool, cotton, brass, leather, glass, and paper.",
    mood: ["Playful", "Bold", "Bright", "Moving"],
    frames: ["The Halo coat, worn open, mid-stride on a white floor.", "Meridian trousers in a spin, the camera low.", "Orbit jewelry in close detail, brass against Ripple blue.", "The Cove bag swinging from a hand, motion blur on the strap.", "Rumour perfume on a sunlit sill, a hand reaching in.", "The Margin notebook open on a desk, a Glow yellow pen across the page."],
    film: "Arc I, in motion. Forty five seconds of getting ready to go out.",
    pieces: (p) => p.arc === "Arc I"
  },
  {
    id: "arc-2", signal: "signal-1", name: "Arc II", tag: "Slow down. Stay a while.", status: "Opens April 18, 2027",
    lead: "A collection for the hour after the party, when the lights go low and the best conversations start.",
    story: [
      "Arc II is what happens after the music softens. People find a corner, a sofa, a candle, a long conversation.",
      "Where Arc I is loud, Arc II is warm. The silk moves slowly. The leather is soft from the first wear. The candle is already lit when you walk in.",
      "It is for the version of you that does not need to be anywhere else."
    ],
    direction: [
      "Low light, long shadows, and rooms that look lived in. Swirl purple and Bloom green join Ripple blue, with sand and cream underneath.",
      "People are photographed sitting, leaning, and listening. Nobody looks at the camera for long."
    ],
    rationale: [
      "A country cannot only celebrate. Arc II gives the republic somewhere to rest, and gives Ziesta, its festival of rest, a wardrobe of its own.",
      "It balances the first Arc, so Signal I feels whole instead of loud."
    ],
    palette: ["Ripple", "Swirl", "Bloom", "Sand", "Cream"],
    materials: "Silk, cotton, leather, soy wax, and silicone.",
    mood: ["Warm", "Slow", "Soft", "Close"],
    frames: ["Tidal, the silk dress, in lamplight on a low sofa.", "Ember, the cotton top, in close profile, a smile held back.", "Kite, the silk scarf, drifting from a chair back.", "Stride shoes on a worn rug, a candle behind them.", "The Hearth candle lit on a table, hands around a mug.", "The Pocket phone case on a bedside table, the screen dark."],
    film: "Arc II, in motion. Sixty seconds of a quiet room.",
    pieces: (p) => p.arc === "Arc II"
  }
];
const sigById = Object.fromEntries(SIGNALS.map((s) => [s.id, s]));
const arcById = Object.fromEntries(ARCS.map((a) => [a.id, a]));

function pals(list) {
  return `<ul class="palette">${list.map((n) => `<li><i style="background:${PAL[n]}"></i><span>${n}</span></li>`).join("")}</ul>`;
}
function paras(list) { return list.map((t) => `<p>${esc(t)}</p>`).join(""); }
function frames(prefix, list) {
  if (!list.length) return "";
  return `<section class="section" style="padding-top:0"><div class="wrap">
  <div class="section-head" data-reveal><h2>The images</h2></div>
  <div class="frames" data-reveal>
${list.map((c, i) => `    <figure>${media(`${prefix}-${i + 1}`, c)}<figcaption>${esc(c)}</figcaption></figure>`).join("\n")}
  </div>
</div></section>`;
}

function storyPage(item, parent) {
  const isArc = !!parent;
  const sig = parent || item;
  const url = isArc ? `/explore/${sig.id}/${item.id}/` : `/explore/${item.id}/`;
  const prefix = isArc ? `${sig.id}-${item.id}` : item.id;
  const pieces = isArc ? products.filter(item.pieces) : [];
  const siblings = isArc ? ARCS.filter((a) => a.signal === sig.id && a.id !== item.id) : ARCS.filter((a) => a.signal === item.id);
  write(
    url.slice(1) + "index.html",
    layout({
      title: `${isArc ? sig.name + ", " : ""}${item.name} | Zibura`,
      description: item.lead,
      page: "story",
      body: `<main>
<section class="story-head"><div class="wrap">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/explore/">Explore</a> <span>/</span> ${isArc ? `<a href="/explore/${sig.id}/">${sig.name}</a> <span>/</span> ${item.name}` : item.name}</nav>
  <p class="small">${esc(item.status)}</p>
  <h1 class="display rise">${words(item.name)}</h1>
  <p class="story-tag fade">${esc(item.tag)}</p>
  <p class="story-lead fade">${esc(item.lead)}</p>
</div></section>
<section class="wrap" data-reveal><figure class="hero-fig">${media(prefix + "-cover", `${item.name} cover image`)}<figcaption>Cover image for ${esc(item.name)}.</figcaption></figure></section>

<section class="section"><div class="wrap split">
  <h2 class="display" data-reveal>The story.</h2>
  <div class="prose" data-reveal>${paras(item.story)}</div>
</div></section>

<section class="section" style="padding-top:0"><div class="wrap split">
  <div data-reveal><h2 class="display">Art direction.</h2><div class="prose" style="margin-top:24px">${paras(item.direction)}</div></div>
  <div data-reveal><h2 class="display">Why it exists.</h2><div class="prose" style="margin-top:24px">${paras(item.rationale)}</div></div>
</div></section>

<section class="section" style="padding-top:0"><div class="wrap facts" data-reveal>
  <div><h3>Palette</h3>${pals(item.palette)}</div>
  <div><h3>Materials</h3><p>${esc(item.materials)}</p></div>
  <div><h3>Mood</h3><ul class="moods">${item.mood.map((m) => `<li>${esc(m)}</li>`).join("")}</ul></div>
</div></section>

${frames(prefix, item.frames)}

${item.film ? `<section class="wrap" data-reveal style="margin-bottom:clamp(56px,8vw,120px)">${film(prefix + "-film", item.film)}</section>` : ""}

${pieces.length ? `<section class="section" style="padding-top:0"><div class="wrap">
  <div class="section-head" data-reveal><h2>The Pieces</h2><a class="text-link" href="/shop/?signal=${encodeURIComponent(sig.name)}&amp;arc=${encodeURIComponent(item.name)}">Shop ${item.name}</a></div>
</div>
  <div class="rail" data-rail-track>
${pieces.map(card).join("\n")}
  </div>
</section>` : ""}

${!isArc && siblings.length ? `<section class="section" style="padding-top:0"><div class="wrap">
  <div class="section-head" data-reveal><h2>The Arcs inside ${item.name}</h2></div>
  <div class="arcs">${siblings.map((a) => `
    <a class="arc arc-link" href="/explore/${item.id}/${a.id}/"><h3>${a.name}</h3><p class="arc-line">${esc(a.tag)}</p><p>${esc(a.lead)}</p><span class="text-link">Read the full story</span></a>`).join("")}
  </div>
</div></section>` : ""}

${isArc && siblings.length ? `<section class="section" style="padding-top:0"><div class="wrap">
  <div class="section-head" data-reveal><h2>Also in ${sig.name}</h2></div>
  <div class="arcs">${siblings.map((a) => `
    <a class="arc arc-link" href="/explore/${sig.id}/${a.id}/"><h3>${a.name}</h3><p class="arc-line">${esc(a.tag)}</p><p>${esc(a.lead)}</p><span class="text-link">Read the full story</span></a>`).join("")}
  </div>
</div></section>` : ""}

<section class="section navy-band"><div class="wrap split">
  <h2 class="display" data-reveal>${pieces.length || !isArc && sig.arcs.length ? "Be in the room when it opens." : "Hear first, when it is time."}</h2>
  <div class="prose" data-reveal>
    <p class="big">Join the Register and the Bureau of Arrivals will tell you the moment ${esc(item.name)} opens its borders.</p>
    <p style="margin-top:28px"><a class="btn light" href="/waitlist/">Join the Register</a></p>
  </div>
</div></section>
</main>`
    })
  );
}
SIGNALS.forEach((s) => storyPage(s, null));
ARCS.forEach((a) => storyPage(a, sigById[a.signal]));

write(
  "explore/index.html",
  layout({
    title: "Explore | Zibura",
    description: "Explore every Signal and Arc in Zi Republic.",
    page: "explore",
    body: `<main>
<section class="page-head"><div class="wrap">
  <h1 class="display rise">${words("Explore the Signals.")}</h1>
  <p class="fade">A Signal is an era of the republic. Each one holds Arcs, collections with a story of their own. Open a Signal to see what is inside, then read the full story.</p>
</div></section>
<section class="section" style="padding-top:0"><div class="wrap signals">
${SIGNALS.map((s, i) => `  <details class="signal" id="${s.id}"${i === 0 ? " open" : ""} data-reveal>
    <summary><span class="sg-name">${s.name}</span><span class="sg-lead">${esc(s.lead)}</span><span class="tag-soon">${esc(s.status)}</span></summary>
    <div class="sg-body">
      <p class="big-p">${esc(s.story[0])}</p>
${ARCS.filter((a) => a.signal === s.id).length ? `      <div class="arcs">${ARCS.filter((a) => a.signal === s.id).map((a) => `
        <a class="arc arc-link" href="/explore/${s.id}/${a.id}/"><h3>${a.name}</h3><p class="arc-line">${esc(a.tag)}</p><p>${esc(a.lead)}</p><span class="text-link">Read the full story</span></a>`).join("")}
      </div>` : ""}
      <p style="margin-top:24px"><a class="btn" href="/explore/${s.id}/">Read the story of ${s.name}</a></p>
    </div>
  </details>`).join("\n")}
</div></section>
</main>`
  })
);

// Province quiz
const PLACEMENT = [
  ["It is Saturday and nothing is planned. What happens?", ["I read, think, and let the day find its shape.", "I text everyone and turn it into a gathering.", "I pick the boldest plan on the table and commit.", "I cook something slow and reset.", "I am already out the door chasing three things.", "I lose hours inside a daydream and a playlist."]],
  ["Your outfit says:", ["Quiet confidence. Every detail was chosen.", "Look at me, I am happy to be here.", "Rules were for other people.", "Comfortable, natural, made to last.", "Whatever I grabbed on the way out, and it works.", "A layered story with a twist you notice later."]],
  ["How do you make a big decision?", ["I wait until it is clear, then move.", "I ask the people I love.", "I decide fast and never look back.", "I give it time and let it grow on me.", "I try it and adjust as I go.", "I follow the feeling I cannot explain."]],
  ["Pick a place.", ["A lake at dawn.", "A rooftop at sunset.", "A stage with the lights on.", "A garden after rain.", "A city street at full speed.", "A foggy hillside at midnight."]],
  ["What do your friends thank you for?", ["Staying calm and seeing clearly.", "Making every moment feel special.", "Saying what everyone was thinking.", "Showing up, every time.", "Getting things moving.", "Seeing something in them nobody else saw."]],
  ["Choose your soundtrack.", ["Slow, spacious, and intelligent.", "Everything you can sing along to.", "Loud, with a point to make.", "Warm, acoustic, and unhurried.", "Fast, with surprises.", "Dreamy, layered, hard to place."]],
  ["Which word belongs next to your name?", ["Magnetic.", "Radiant.", "Fearless.", "Grounded.", "Unstoppable.", "Enigmatic."]]
];
write(
  "province/index.html",
  layout({
    title: "Find your province | Zibura",
    description: "Answer seven questions and find out which of the six provinces of Zi Republic is your home.",
    page: "placement",
    body: `<main>
<section class="page-head"><div class="wrap">
  <h1 class="display rise">${words("Find your province.")}</h1>
  <p class="fade">Seven questions. Your answers decide which of the six provinces of Zi Republic you call home.</p>
</div></section>
<section class="section" style="padding-top:clamp(16px,3vw,40px)"><div class="wrap">
  <div id="quiz" class="quiz" data-quiz>
    <div class="q-bar"><span id="q-step"></span><div class="q-track"><i id="q-fill"></i></div></div>
    <h2 class="display q-title" id="q-title" tabindex="-1"></h2>
    <div class="q-opts" id="q-opts"></div>
  </div>
  <div id="result" class="result" hidden></div>
  <script type="application/json" id="quiz-data">${JSON.stringify({ questions: PLACEMENT, provinces: PROVINCES.map(([n, c, hex, line, note, traits]) => ({ n, hex, line, note, traits })) })}</script>
</div></section>
</main>`
  })
);

// Waitlist
write(
  "waitlist/index.html",
  layout({
    title: "Join the Register | Zibura",
    description: "Join the Zi Republic Register for first word on Signal I.",
    page: "waitlist",
    body: `<main>
<section class="page-head"><div class="wrap">
  <h1 class="display rise">${words("Join the Register.")}</h1>
  <p class="fade">The Bureau of Arrivals is taking names. Add yours and you will hear first when Signal I opens its borders.</p>
</div></section>
<section class="section" style="padding-top:clamp(16px,3vw,40px)"><div class="wrap">
  <div class="register-page">${arrivalCard("p")}</div>
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
  <h1 class="display rise">${words("Your passport into Zi Republic.")}</h1>
  <p class="fade">Residency is by application. Every application is reviewed by the Ministry of Zi Interior.</p>
</div></section>
<section class="section" style="padding-top:clamp(16px,3vw,40px)"><div class="wrap split">
  <div data-reveal>${flipCard()}</div>
  <div data-reveal>
    <ol class="steps">
      <li><div><b>Create your account.</b><span>Your file in the Zi Registry begins here.</span></div></li>
      <li><div><b>Upload your portrait and apply.</b><span>Your portrait appears on your card, so choose one that looks like you.</span></div></li>
      <li><div><b>Collect your Zi Card.</b><span>Once your application is accepted, your Zi Card appears in your account, ready to download.</span></div></li>
    </ol>
    <p style="margin-top:40px"><a class="btn" href="/account/">Start your application</a></p>
    <p class="small" style="margin-top:16px">Want first word on Signal I? <a href="/waitlist/">Join the Register</a>.</p>
  </div>
</div></section>
<section class="section navy-band"><div class="wrap split">
  <h2 class="display" data-reveal>Arrive as a Resident. Rise to Zitizen.</h2>
  <dl class="plain-list light" data-reveal>
    <div><dt>Zi Resident</dt><dd>Your passport. Every approved applicant begins here, with a card and a province to call home.</dd></div>
    <div><dt>Zitizen</dt><dd>Your standing. The inner circle of the republic, earned by how you show up.</dd></div>
    <div><dt>Zillar</dt><dd>Your currency. Earned with every order, spent on access money alone cannot buy.</dd></div>
  </dl>
</div></section>
</main>`
  })
);


// Account and application
write(
  "account/index.html",
  layout({
    title: "Your account | Zibura",
    description: "Sign in to apply for your Zi Card or collect it once approved.",
    page: "account",
    body: `<main>
<section class="page-head"><div class="wrap">
  <h1 class="display rise" id="acct-h">${words("Your Zi Registry.")}</h1>
  <p class="fade" id="acct-sub">Create an account to apply for your Zi Card.</p>
</div></section>
<section class="section" style="padding-top:clamp(16px,3vw,40px)"><div class="wrap">
  <div id="acct-loading" class="small">Loading.</div>

  <div id="v-auth" class="form-card" hidden>
    <div class="tabs" role="tablist">
      <button type="button" class="tab on" data-tab="signup">Create account</button>
      <button type="button" class="tab" data-tab="login">Sign in</button>
    </div>
    <form id="f-signup" class="acct-form">
      <div class="form-grid">
        <div><label for="s-first">First name</label><input id="s-first" name="first" autocomplete="given-name" required></div>
        <div><label for="s-last">Last name</label><input id="s-last" name="last" autocomplete="family-name" required></div>
        <div><label for="s-bm">Birthday month</label><select id="s-bm" name="birth_month">${monthOptions}</select></div>
        <div><label for="s-bd">Birthday day</label><select id="s-bd" name="birth_day">${dayOptions}</select></div>
        <div class="full"><label for="s-email">Email</label><input id="s-email" name="email" type="email" autocomplete="email" required></div>
        <div class="full"><label for="s-pass">Password (8 characters or more)</label><input id="s-pass" name="password" type="password" minlength="8" autocomplete="new-password" required></div>
      </div>
      <button class="btn" type="submit">Create account</button>
      <div class="msg" role="status"></div>
    </form>
    <form id="f-login" class="acct-form" hidden>
      <div class="form-grid">
        <div class="full"><label for="l-email">Email</label><input id="l-email" name="email" type="email" autocomplete="email" required></div>
        <div class="full"><label for="l-pass">Password</label><input id="l-pass" name="password" type="password" autocomplete="current-password" required></div>
      </div>
      <button class="btn" type="submit">Sign in</button>
      <div class="msg" role="status"></div>
    </form>
  </div>

  <div id="v-apply" class="form-card" hidden>
    <form id="f-apply" class="acct-form">
      <div class="form-grid">
        <div class="full"><label for="a-name">Name as it will appear on your card</label><input id="a-name" name="name" maxlength="40" required></div>
        <div class="full"><label for="a-photo">Portrait photo (JPG, PNG, or WebP)</label><input id="a-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" required></div>
      </div>
      <div class="cropper" id="a-crop" hidden>
        <canvas id="a-canvas" width="562" height="724" aria-label="Portrait frame. Drag to position."></canvas>
        <label class="zoom">Zoom <input type="range" id="a-zoom" min="1" max="3" step="0.01" value="1"></label>
        <p class="small">Drag the photo to place your face inside the frame, then use the slider to zoom. This is exactly how it will appear on your card.</p>
      </div>
      <p class="small">Use a clear, front facing portrait with your face and shoulders in view.</p>
      <button class="btn" type="submit">Submit my application</button>
      <div class="msg" role="status"></div>
    </form>
  </div>

  <div id="v-pending" class="form-card" hidden>
    <h2 class="display" style="font-size:clamp(28px,3.4vw,40px)">We are processing your application.</h2>
    <p class="sub">The Ministry of Zi Interior is reviewing it now. Check your account in a few days to see if you have been approved.</p>
  </div>

  <div id="v-declined" class="form-card" hidden>
    <h2 class="display" style="font-size:clamp(28px,3.4vw,40px)">Not this time.</h2>
    <p class="sub">The Ministry did not approve this application. You are welcome to apply again with a new portrait.</p>
    <button class="btn" type="button" id="reapply">Apply again</button>
  </div>

  <div id="v-card" hidden>
    <div class="card-out"><canvas id="card-canvas" width="2022" height="1274" aria-label="Your Zi Card"></canvas></div>
    <p style="margin-top:28px"><button class="btn" type="button" id="dl-card">Download your Zi Card</button></p>
  </div>

  <p id="acct-out" class="small" style="margin-top:40px" hidden><span id="acct-who"></span> <button type="button" class="linkbtn" id="signout">Sign out</button></p>
</div></section>
</main>`
  })
);

// Ministry review page
write(
  "admin/index.html",
  layout({
    title: "Ministry | Zibura",
    description: "Ministry of Zi Interior review desk.",
    page: "admin",
    body: `<main>
<section class="page-head"><div class="wrap">
  <h1 class="display">Ministry of Zi Interior.</h1>
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
    title: "From the founder | Zibura",
    description: "A letter from Ruova, founder of Zibura.",
    page: "note",
    body: `<main class="note">
  <div class="photo" data-reveal><img src="/assets/ruova.jpg" alt="Ruova, founder of Zibura" width="1000" height="1500">
    <h1 class="who-name">Ruova</h1>
    <p class="who-role">Zi-in-Chief</p>
  </div>
  <div class="body">
    <p class="lead-b fade">Expression is the most human thing we do. There's no single right way to exist, and every side of you, every version, deserves space.</p>
    <div class="letter fade">
      <p>Fashion has always been a language to me, maybe the first one I ever really learned to speak on my own terms. It's how I've found the truest way to express who I am.</p>
      <p>I wanted that for other people too. Because if I'm honest, life comes with so many rules and regulations, so many quiet ideas about what's appropriate, what's too much, what belongs together and what doesn't. One morning I just thought, I'm going to build a new country because who is going to check me? So I did.</p>
      <p>That's Zi Republic, built on the idea that people deserve a place to actually express themselves, however that looks for them. This was never about re-educating anyone or writing a new set of rules to replace the old ones. It's about giving people somewhere to belong, exactly as they already are.</p>
    </div>
    <blockquote class="pull"><span class="qm" aria-hidden="true">&ldquo;</span>How you show up in the world is a language. We built Zibura so more people could speak it fluently, on their own terms.</blockquote>
    <p class="signature" aria-label="Ruova">Ruova</p>
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
<div class="page-head" style="padding-left:0;padding-right:0"><h1 class="display rise">${words("Shop the republic.")}</h1><p class="fade">Signal I, Arc I. Pick your color, pick your size, and wear it your way.</p></div>
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
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/shop/">Shop</a> <span>/</span> <a href="/shop/?audience=${esc(p.audience[0])}">${esc(p.audience.join(" and "))}</a> <span>/</span> <a href="/shop/?category=${encodeURIComponent(p.category)}">${esc(p.category)}</a> <span>/</span> <a href="/shop/?category=${encodeURIComponent(p.category)}&amp;type=${encodeURIComponent(p.type)}">${esc(p.type)}</a></nav>
  <div class="piece">
    <div class="gallery" aria-label="Photos of ${esc(p.name)}">
      ${[1, 2, 3, 4].map((n) => ({ n, img: photo(`${p.slug}-${n}`, `${p.name}, photo ${n}`) })).filter((x) => x.img || x.n === 1).map((x) => `<div class="ph${x.n === 1 ? " big" : ""}">${x.img}</div>`).join("")}
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
<h1 class="display rise">${words("Payment received.")}</h1>
<p class="fade">Welcome to the republic. Your Pieces are now part of your world.</p>
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
write("catalog.json", JSON.stringify(products.map((p) => ({ ...p, photos: [1, 2].map((n) => { const m = photo(`${p.slug}-${n}`, "").match(/src="([^"]+)"/); return m ? m[1] : null; }).filter(Boolean) }))));
write("taxonomy.json", JSON.stringify(TAX));
write("colors.json", JSON.stringify(COLORS));

console.log("Built " + products.length + " Pieces into dist/");
