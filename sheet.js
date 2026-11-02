// Pulls content from the Zibura Content Google Sheet before every build.
// If the sheet cannot be reached, the build keeps using the files in this project.
const fs = require("fs");
const path = require("path");
const https = require("https");

const SHEET_ID = process.env.SHEET_ID || "1hOZRub-aKxw-bH9MnA0yqlOMyeUlL-p1fEBLgI7qqxQ";
const out = path.join(__dirname, "content");

function get(url, redirects = 5) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "user-agent": "zibura-build" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
          res.resume();
          return resolve(get(new URL(res.headers.location, url).toString(), redirects - 1));
        }
        if (res.statusCode !== 200) { res.resume(); return reject(new Error("HTTP " + res.statusCode + " for " + url)); }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve({ body: Buffer.concat(chunks), type: res.headers["content-type"] || "" }));
      })
      .on("error", reject);
  });
}

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

async function tab(name) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`;
  const { body } = await get(url);
  const text = body.toString("utf8");
  if (/^\s*</.test(text)) throw new Error("the sheet is not shared with Anyone with the link");
  const rows = parseCsv(text).filter((r) => r.some((c) => c.trim() !== ""));
  const head = rows.shift().map((h) => h.trim());
  return rows.map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] || "").trim()])));
}

function driveDirect(u) {
  const m = u.match(/drive\.google\.com\/file\/d\/([^/]+)/) || u.match(/[?&]id=([^&]+)/);
  if (/drive\.google\.com/.test(u) && m) return `https://drive.google.com/uc?export=download&id=${m[1]}`;
  return u;
}

(async () => {
  if (SHEET_ID === "SHEET_ID_HERE") { console.log("sheet.js: no sheet configured, using project files."); return; }
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(path.join(out, "images"), { recursive: true });
  try {
    const pieces = await tab("Pieces");
    const list = (v) => v.split(",").map((s) => s.trim()).filter(Boolean);
    const products = pieces.filter((p) => p.slug).map((p) => ({
      slug: p.slug, name: p.name, category: p.category, type: p.type, signal: p.signal, arc: p.arc,
      description: p.description,
      prices: { CAD: Number(p.price_CAD), USD: Number(p.price_USD), GBP: Number(p.price_GBP), NGN: Number(p.price_NGN) },
      colors: list(p.colors), sizes: list(p.sizes), audience: list(p.audience), material: p.material,
      inStock: /^(true|yes|1)$/i.test(p.inStock), isNew: /^(true|yes|1)$/i.test(p.isNew)
    }));
    if (products.length) fs.writeFileSync(path.join(out, "pieces.json"), JSON.stringify(products));
    console.log("sheet.js: Pieces", products.length);
  } catch (e) { console.log("sheet.js: Pieces skipped,", e.message); }
  try {
    const copy = {};
    (await tab("Copy")).forEach((r) => { if (r.key && r.text) copy[r.key] = r.text; });
    fs.writeFileSync(path.join(out, "copy.json"), JSON.stringify(copy));
    console.log("sheet.js: Copy", Object.keys(copy).length);
  } catch (e) { console.log("sheet.js: Copy skipped,", e.message); }
  try {
    const links = {};
    (await tab("Links")).forEach((r) => { if (r.key && r.url) links[r.key] = r.url; });
    fs.writeFileSync(path.join(out, "links.json"), JSON.stringify(links));
    console.log("sheet.js: Links", Object.keys(links).length);
  } catch (e) { console.log("sheet.js: Links skipped,", e.message); }
  try {
    let n = 0;
    for (const r of await tab("Images")) {
      if (!r.name || !r.url) continue;
      try {
        const { body, type } = await get(driveDirect(r.url));
        if (!/image\//.test(type) && body.length < 5000) continue;
        const ext = /png/.test(type) ? "png" : /webp/.test(type) ? "webp" : "jpg";
        fs.writeFileSync(path.join(out, "images", `${r.name}.${ext}`), body);
        n++;
      } catch (e) { console.log("sheet.js: image skipped", r.name, e.message); }
    }
    console.log("sheet.js: Images", n);
  } catch (e) { console.log("sheet.js: Images skipped,", e.message); }
})();
