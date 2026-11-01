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

const MODAL = `<dialog id="wl-modal" aria-labelledby="wl-title">
  <button class="close" type="button" aria-label="Close" data-close-waitlist>&times;</button>
  <h2 class="display" id="wl-title">Join the Register.</h2>
  <p class="sub">Be first in line when Signal I opens its borders.</p>
  ${waitlistForm("m")}
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
        <a href="/brand/#calendar">The calendar</a>
        <a href="/note/">From the founder</a>
        <a href="/zi-card/">The Zi Card</a>
        <a href="/explore/">Explore the Signals</a>
        <a href="/placement/">Find your province</a>
        <a href="/waitlist/" data-open-waitlist>Join the Register</a>
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
    <h1 class="display rise">${words("Your expression,")}<br>${words("your world.")}</h1>
    <p class="lede fade">Step into Zi Republic, where every Piece is another way of saying exactly who you are.</p>
    <div class="actions fade">
      <a class="btn" href="/brand/">Enter Zi Republic</a>
      <a class="btn line" href="/shop/">Shop Signal I</a>
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
    <div class="section-head" data-reveal><h2>Start here.</h2></div>
    <div class="who" data-reveal>
${AUDIENCES.map((a) => `      <a href="/shop/?audience=${a}"><span>${a}</span><small>${countIn((p) => p.audience.includes(a))} Pieces</small></a>`).join("\n")}
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
      <h2 class="display">Become a resident.</h2>
      <p class="lead">Apply for your Zi Card. The Ministry of Zi Interior reviews every application, and every resident receives standing, Zillar, and experiences money alone cannot buy.</p>
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
  <div class="section-head" data-reveal><h2>Find your province.</h2><a class="btn" href="/placement/">Take the Placement</a></div>
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
${CALENDAR.map(([n, d, dt]) => `    <div><dt>${n}</dt><dd>${d}</dd><span class="tag-soon">${dt || "Date announced soon"}</span></div>`).join("\n")}
  </dl>
</div></section>

<section class="section" style="padding-top:0"><div class="wrap split">
  <h2 class="display" data-reveal>Belonging, in three parts.</h2>
  <div data-reveal>
  <p class="big-p">You enter as a Resident, rise to Zitizen, and spend in Zillar.</p>
  <dl class="plain-list">
    <div><dt>Zi Resident</dt><dd>Your passport into the republic. Apply for a Zi Card and your name goes on the register. Every resident begins here.</dd></div>
    <div><dt>Zitizen</dt><dd>The inner circle of the republic. Zitizen is earned by how you show up, through the Pieces you wear and the reviews you write.</dd></div>
    <div><dt>Zillar</dt><dd>The republic's own currency. Every order builds your standing, and Zillar unlocks access and experiences money alone cannot buy.</dd></div>
  </dl></div>
</div></section>

<section class="section" style="padding-top:0"><div class="wrap">
  <div class="section-head" data-reveal><h2>Everything you reach for</h2></div>
  <ul class="world-list" data-reveal>
${TAX.map((c) => `    <li><a href="/shop/?category=${encodeURIComponent(c.name)}">${esc(c.name)}</a></li>`).join("\n")}
  </ul>
</div></section>

<section class="section navy-band"><div class="wrap split">
  <h2 class="display" data-reveal>Take your place in the republic.</h2>
  <div class="prose" data-reveal>
    <p class="big">Join the Register and hear first when Signal I opens its borders.</p>
    <p style="margin-top:28px"><a class="btn light" href="/waitlist/" data-open-waitlist>Join the Register</a></p>
  </div>
</div></section>
</main>`
  })
);

// Explore: Signals and Arcs
const SIGNALS = [
  { id: "signal-1", name: "Signal I", status: "Opens April 18, 2027", lead: "The first era of Zi Republic.", body: "Signal I is where the republic opens its borders. Every Piece in it is a way of saying who you are, out loud.", arcs: [
    { name: "Arc I", line: "Play, turned all the way up.", note: "A collection for the version of you who is already dancing before the music starts.", live: true },
    { name: "Arc II", line: "Details announced soon.", note: "The second story inside Signal I.", live: false }
  ] },
  { id: "signal-2", name: "Signal II", status: "Date announced soon", lead: "The next era, still sealed.", body: "A Signal begins when the vision is ready and ends when it has been fully expressed. Signal II begins when Signal I is complete.", arcs: [] },
  { id: "signal-3", name: "Signal III", status: "Date announced soon", lead: "Further down the line.", body: "Every Signal opens a new chapter of the republic. Join the Register and you will hear about each one as it is announced.", arcs: [] }
];
write(
  "explore/index.html",
  layout({
    title: "Explore | Zibura",
    description: "Explore every Signal and Arc in Zi Republic.",
    page: "explore",
    body: `<main>
<section class="page-head"><div class="wrap">
  <h1 class="display rise">${words("Explore the Signals.")}</h1>
  <p class="fade">A Signal is a creative era. Each Signal holds Arcs, full collections with a story of their own. Open one to learn more.</p>
</div></section>
<section class="section" style="padding-top:0"><div class="wrap signals">
${SIGNALS.map((s, i) => `  <details class="signal" id="${s.id}"${i === 0 ? " open" : ""} data-reveal>
    <summary><span class="sg-name">${s.name}</span><span class="sg-lead">${esc(s.lead)}</span><span class="tag-soon">${esc(s.status)}</span></summary>
    <div class="sg-body">
      <p class="big-p">${esc(s.body)}</p>
${s.arcs.length ? `      <div class="arcs">${s.arcs.map((a) => `
        <div class="arc"><h3>${a.name}</h3><p class="arc-line">${esc(a.line)}</p><p>${esc(a.note)}</p>${a.live ? `<a class="btn line" href="/shop/?signal=${encodeURIComponent(s.name)}&amp;arc=${encodeURIComponent(a.name)}">Shop ${a.name}</a>` : `<a class="text-link" href="/waitlist/" data-open-waitlist>Join the Register</a>`}</div>`).join("")}
      </div>` : `      <p><a class="btn" href="/waitlist/" data-open-waitlist>Join the Register</a></p>`}
    </div>
  </details>`).join("\n")}
</div></section>
</main>`
  })
);

// Placement: the province quiz
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
  "placement/index.html",
  layout({
    title: "The Placement | Zibura",
    description: "Answer seven questions and the Zi Republic Placement assigns you a home province.",
    page: "placement",
    body: `<main>
<section class="page-head"><div class="wrap">
  <h1 class="display rise">${words("Find your province.")}</h1>
  <p class="fade">Seven questions. The Placement reads your answers and assigns you a home province in Zi Republic.</p>
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
    <p class="small" style="margin-top:16px">Want first word on Signal I? <a href="/waitlist/" data-open-waitlist>Join the Register</a>.</p>
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
      <div class="crop-prev" id="a-prev" hidden><img alt="Portrait preview" width="281" height="362"></div>
      <p class="small">Use a clear, front facing portrait. It is cropped to the card frame automatically.</p>
      <button class="btn" type="submit">Submit my application</button>
      <div class="msg" role="status"></div>
    </form>
  </div>

  <div id="v-pending" class="form-card" hidden>
    <h2 class="display" style="font-size:clamp(28px,3.4vw,40px)">Your application is with the Ministry.</h2>
    <p class="sub">The Ministry of Zi Interior is reviewing your application. Check back soon.</p>
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
  <div class="photo" data-reveal><img src="/assets/ruova.jpg" alt="Ruova, founder of Zibura" width="1000" height="1500"></div>
  <div class="body">
    <h1 class="display rise" style="font-size:clamp(36px,5vw,72px)">${words("Welcome to Zi Republic.")}</h1>
    <div class="letter fade">
      <p>I am never just one thing. Some days I am quiet and exact. Other days I am loud and playful. The clothes I wanted had to keep up with both.</p>
      <p>So I built a place for that. Zi Republic is a country with provinces, a currency, a calendar, and a card of its own. Signals set the era. Arcs tell the story. Pieces are what you wear.</p>
      <p>You can be soft and fierce in the same day. You can be dressed for the party and thinking about tomorrow. Here, that is normal.</p>
      <p>Find your province, take your place, and wear all of it.</p>
    </div>
    <p class="signature" aria-label="Ruova">Ruova</p>
    <p class="signed">Zi-in-Chief, Zi Republic</p>
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
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/shop/">Shop</a> <span>/</span> <a href="/shop/?audience=${esc(p.audience[0])}">${esc(p.audience.join(" and "))}</a> <span>/</span> <a href="/shop/?category=${encodeURIComponent(p.category)}">${esc(p.category)}</a> <span>/</span> <a href="/shop/?category=${encodeURIComponent(p.category)}&amp;type=${encodeURIComponent(p.type)}">${esc(p.type)}</a></nav>
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
