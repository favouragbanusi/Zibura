(function () {
  var CURRENCIES = ["CAD", "USD", "GBP", "EUR", "AUD", "AED", "ZAR", "NGN"];
  var CART_KEY = "zibura_cart";
  var CUR_KEY = "zibura_currency";

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function load(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  var currency = "USD";
  var catalog = null;

  function loadCatalog() {
    if (catalog) return Promise.resolve(catalog);
    return fetch("/catalog.json").then(function (r) { return r.json(); }).then(function (data) {
      catalog = data;
      return data;
    });
  }

  function detectCurrency() {
    var chosen = load(CUR_KEY, null);
    if (chosen && CURRENCIES.indexOf(chosen) !== -1) return Promise.resolve(chosen);
    return fetch("/api/region")
      .then(function (r) { return r.json(); })
      .then(function (d) { return CURRENCIES.indexOf(d.currency) !== -1 ? d.currency : "USD"; })
      .catch(function () { return "USD"; });
  }

  function money(amount) {
    try {
      return new Intl.NumberFormat("en", {
        style: "currency",
        currencyDisplay: "code",
        currency: currency,
        minimumFractionDigits: amount % 1 === 0 ? 0 : 2
      }).format(amount);
    } catch (e) {
      return currency + " " + amount;
    }
  }

  function getCart() { return load(CART_KEY, []); }
  function setCart(cart) { save(CART_KEY, cart); updateCount(); }
  var lastCount = null;
  function updateCount() {
    var n = getCart().reduce(function (sum, l) { return sum + l.qty; }, 0);
    var el = $("#cart-count");
    if (el) {
      el.textContent = n;
      el.classList.toggle("zero", n === 0);
      var cl = document.getElementById("cart-link");
      if (cl) { var ct = n === 0 ? "Cart, empty" : "Cart, " + n + (n === 1 ? " item" : " items"); cl.setAttribute("data-tip", ct); cl.setAttribute("aria-label", ct); }
      if (lastCount !== null && n > lastCount) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
    }
    lastCount = n;
  }
  function toast(html) {
    var t = document.getElementById("toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.innerHTML = html; void t.offsetWidth; t.classList.add("on");
    clearTimeout(toast.h); toast.h = setTimeout(function () { t.classList.remove("on"); }, 3600);
  }
  function flyToCart(img) {
    var target = document.getElementById("cart-link");
    if (!img || !target || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) return;
    var a = img.getBoundingClientRect(), b = target.getBoundingClientRect();
    var f = document.createElement("img"); f.src = img.currentSrc || img.src; f.className = "fly"; f.alt = "";
    f.style.left = (a.left + a.width / 2 - 35) + "px"; f.style.top = (a.top + a.height / 2 - 44) + "px";
    document.body.appendChild(f);
    var dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    var anim = f.animate([{ transform: "translate(0,0) scale(1) rotate(0)", opacity: 1 }, { transform: "translate(" + dx * 0.5 + "px," + (dy * 0.5 - 80) + "px) scale(.7) rotate(8deg)", opacity: 1, offset: .55 }, { transform: "translate(" + dx + "px," + dy + "px) scale(.12) rotate(20deg)", opacity: .2 }], { duration: 750, easing: "cubic-bezier(.5,0,.3,1)" });
    anim.onfinish = function () { f.remove(); };
  }
  function confetti(colors) {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var c = document.createElement("canvas"); c.className = "confetti"; c.width = innerWidth; c.height = innerHeight; document.body.appendChild(c);
    var g = c.getContext("2d"), parts = [];
    for (var i = 0; i < 140; i++) parts.push({ x: innerWidth / 2, y: innerHeight * 0.55, vx: (Math.random() - 0.5) * 18, vy: -Math.random() * 18 - 4, s: 6 + Math.random() * 8, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: colors[i % colors.length] });
    var t0 = performance.now();
    (function frame(t) {
      g.clearRect(0, 0, c.width, c.height);
      parts.forEach(function (p) { p.vy += 0.45; p.x += p.vx; p.y += p.vy; p.r += p.vr; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore(); });
      if (t - t0 < 2600) requestAnimationFrame(frame); else c.remove();
    })(t0);
  }
  function syncCur() {
    var s = document.getElementById("currency"), code = document.getElementById("cur-code");
    if (!s) return;
    if (code) code.textContent = s.value;
    var cb = code && code.closest(".icon-btn"); if (cb) cb.setAttribute("data-tip", "Currency: " + s.value);
    $all(".d-cur button").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-cur") === s.value); });
  }
  function initScrollFx() {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    $all(".hero-fig .hf-img, .sg-bg, .sg-img, .arc-photo, .sg-soon, .who a, .film .video-slot, .sg-arc img").forEach(function (el) { el.setAttribute("data-drift", ""); });
    var drift = $all("[data-drift]");
    var par = $all("[data-parallax]");
    var hs = $all("[data-hscroll]");
    function setHdr() {
      var h = 0, n = document.querySelector(".notice, .notice-bar, .top-notice");
      var hd = document.querySelector(".site-header");
      if (n) h += n.offsetHeight;
      if (hd) h += hd.offsetHeight;
      document.documentElement.style.setProperty("--hdr", (h || 112) + "px");
    }
    setHdr();
    window.addEventListener("resize", setHdr);
    window.addEventListener("load", setHdr);
    if (reduce || (!par.length && !hs.length && !drift.length)) return;
    function vw() { return document.documentElement.clientWidth || window.innerWidth; }
    function sizeH() {
      hs.forEach(function (sec) {
        var track = sec.querySelector(".hs-track");
        var pin = sec.querySelector(".hs-pin");
        if (!track || !pin) return;
        var dist = Math.max(0, track.scrollWidth - vw());
        sec.style.height = "calc(100vh + " + dist + "px)";
        if (window.CSS && CSS.supports && CSS.supports("height", "100svh")) sec.style.height = "calc(100svh + " + dist + "px)";
        sec._dist = dist;
        sec._cards = $all(".hs-card, .hs-end", track);
        if (!sec._count) {
          var c = document.createElement("div"); c.className = "hs-count"; c.setAttribute("aria-hidden", "true");
          pin.appendChild(c); sec._count = c;
        }
      });
    }
    var ticking = false;
    function frame() {
      ticking = false;
      var vh = window.innerHeight, W = vw();
      par.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var k = parseFloat(el.getAttribute("data-parallax")) || 0.1;
        el.style.setProperty("--py", ((r.top + r.height / 2 - vh / 2) * -k).toFixed(1) + "px");
      });
      drift.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        var d = (r.top + r.height / 2 - vh / 2) / vh;
        el.style.setProperty("--dy", (Math.max(-1, Math.min(1, d)) * -28).toFixed(1) + "px");
      });
      hs.forEach(function (sec) {
        if (sec._dist == null) return;
        var r = sec.getBoundingClientRect();
        if (r.bottom < -50 || r.top > vh + 50) return;
        var track = sec.querySelector(".hs-track"), bar = sec.querySelector(".hs-bar i");
        var span = Math.max(1, sec.offsetHeight - vh);
        var p = Math.min(1, Math.max(0, -r.top / span));
        var x = -p * sec._dist;
        track.style.transform = "translate3d(" + x.toFixed(1) + "px,0,0)";
        if (bar) bar.style.transform = "scaleX(" + p.toFixed(3) + ")";
        var cards = sec._cards || [], idx = 0;
        cards.forEach(function (c, i) {
          var cr = c.getBoundingClientRect();
          var n = (cr.left + cr.width / 2 - W / 2) / W;
          n = Math.max(-1.2, Math.min(1.2, n));
          c.style.setProperty("--hx", (n * -5).toFixed(2) + "%");
          c.style.setProperty("--cx", (n * 90).toFixed(1) + "px");
          c.style.setProperty("--co", (1 - Math.min(1, Math.abs(n)) * 0.85).toFixed(2));
          if (Math.abs(n) < 0.5) idx = i;
        });
        if (sec._count) sec._count.textContent = (idx + 1) + " / " + cards.length;
      });
    }
    function req() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
    window.addEventListener("scroll", req, { passive: true });
    window.addEventListener("resize", function () { sizeH(); req(); });
    window.addEventListener("orientationchange", function () { setTimeout(function () { sizeH(); req(); }, 250); });
    window.addEventListener("load", function () { sizeH(); req(); });
    sizeH(); req();
  }
  function initSignalScenes() {
    $all("[data-sg]").forEach(function (sc) {
      var btn = sc.querySelector(".sg-open");
      if (!btn) return;
      btn.addEventListener("click", function () {
        var on = !sc.classList.contains("open");
        sc.classList.toggle("open", on);
        btn.setAttribute("aria-expanded", on ? "true" : "false");
        if (on) {
          var tgt = sc.querySelector(".sg-arcs");
          setTimeout(function () { if (tgt && tgt.scrollIntoView) tgt.scrollIntoView({ behavior: "smooth", block: "center" }); }, 420);
        }
      });
    });
  }
  function initFounderReel() {
    var reels = $all("[data-fn-reel]");
    var tick = $all("[data-ticker]");
    if (!reels.length && !tick.length) return;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var lastY = window.scrollY, vel = 0, off = tick.map(function () { return 0; });
    var base = 0.5;
    function frame() {
      var y = window.scrollY; vel = vel * 0.9 + (y - lastY) * 0.1; lastY = y;
      reels.forEach(function (rl) {
        var steps = $all(".fn-step", rl), n = steps.length;
        var r = rl.getBoundingClientRect();
        var span = Math.max(1, rl.offsetHeight - window.innerHeight);
        var p = Math.min(0.999, Math.max(0, -r.top / span));
        var idx = Math.floor(p * n);
        steps.forEach(function (s, i) { s.classList.toggle("on", i === idx); s.classList.toggle("past", i < idx); });
        var bar = rl.querySelector(".fn-progress i");
        if (bar) bar.style.transform = "scaleX(" + p.toFixed(3) + ")";
      });
      if (!reduce) tick.forEach(function (tr, i) {
        var dir = parseFloat(tr.getAttribute("data-ticker")) || -1;
        var w = tr.scrollWidth / 2;
        if (!w) return;
        off[i] += dir * (base + Math.min(14, Math.abs(vel)) * 0.35);
        if (off[i] <= -w) off[i] += w; if (off[i] > 0) off[i] -= w;
        tr.style.transform = "translate3d(" + off[i].toFixed(1) + "px,0,0)";
      });
      requestAnimationFrame(frame);
    }
    tick.forEach(function (tr) { tr.style.animation = "none"; });
    requestAnimationFrame(frame);
  }
  function initMinistries() {
    $all(".mini").forEach(function (b) {
      b.addEventListener("click", function () {
        var open = b.classList.toggle("on");
        b.setAttribute("aria-expanded", open ? "true" : "false");
      });
    });
  }
  function initHeroSlides() {
    var root = document.querySelector("[data-hero-ed]");
    if (!root) return;
    var slides = $all(".he-slide", root);
    if (slides.length < 2) return;
    var i = 0, timer = null, count = root.querySelector(".he-count b");
    function go(n) {
      slides[i].classList.remove("on");
      i = (n + slides.length) % slides.length;
      slides[i].classList.add("on");
      if (count) count.textContent = i + 1;
    }
    function play() { stop(); timer = setInterval(function () { go(i + 1); }, 8000); }
    function stop() { if (timer) clearInterval(timer); timer = null; }
    var prev = root.querySelector(".he-prev"), next = root.querySelector(".he-next");
    if (prev) prev.addEventListener("click", function () { go(i - 1); play(); });
    if (next) next.addEventListener("click", function () { go(i + 1); play(); });
    root.addEventListener("focusin", stop);
    root.addEventListener("focusout", play);
    document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else play(); });
    play();
  }
  function initCursor() {
    var fine = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine) return;
    var root = document.documentElement, body = document.body;
    var dot = document.createElement("div"); dot.className = "cur-dot";
    var ring = document.createElement("div"); ring.className = "cur-ring";
    var label = document.createElement("div"); label.className = "cur-label";
    var cv = document.createElement("canvas"); cv.className = "cur-trail";
    body.appendChild(cv); body.appendChild(ring); body.appendChild(dot); body.appendChild(label);
    var g = cv.getContext("2d");
    function size() { cv.width = innerWidth; cv.height = innerHeight; }
    size(); window.addEventListener("resize", size);
    var SPARK = "#2fa8ff";
    var mx = -100, my = -100, rx = -100, ry = -100, parts = [], on = false, lastSpawn = 0;
    root.classList.add("has-cursor");
    document.addEventListener("mousemove", function (e) {
      mx = e.clientX; my = e.clientY;
      if (!on) { on = true; rx = mx; ry = my; body.classList.add("cur-on"); }
      var now = performance.now();
      if (!reduce && now - lastSpawn > 38) {
        lastSpawn = now;
        parts.push({ x: mx + (Math.random() - 0.5) * 18, y: my + (Math.random() - 0.5) * 18, vx: (Math.random() - 0.5) * 0.5, vy: 0.25 + Math.random() * 0.4, s: 4 + Math.random() * 6, born: now, life: 650 + Math.random() * 350, ph: Math.random() * 6 });
      }
      var t = e.target;
      var media = t.closest && t.closest(".card, .gallery .ph");
      var link = t.closest && t.closest("a, button, summary, label, [role=button], .tile, .pill, .opt");
      var text = t.closest && t.closest("input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]), textarea");
      body.classList.toggle("cur-media", !!media && !text);
      body.classList.toggle("cur-link", !!link && !media && !text);
      body.classList.toggle("cur-text", !!text);
      label.textContent = media ? (media.classList.contains("card") ? "View" : "Zoom") : "";
    });
    document.addEventListener("mouseleave", function () { on = false; body.classList.remove("cur-on"); });
    document.addEventListener("mousedown", function () { body.classList.add("cur-down"); });
    document.addEventListener("mouseup", function () { body.classList.remove("cur-down"); });
    function star(x, y, r) {
      g.beginPath();
      for (var k = 0; k < 8; k++) {
        var ang = k * Math.PI / 4 - Math.PI / 2, rad = k % 2 === 0 ? r : r * 0.28;
        g.lineTo(x + Math.cos(ang) * rad, y + Math.sin(ang) * rad);
      }
      g.closePath(); g.fill();
    }
    (function loop(now) {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      dot.style.transform = "translate(" + mx + "px," + my + "px)";
      ring.style.transform = "translate(" + rx + "px," + ry + "px)";
      label.style.transform = "translate(" + rx + "px," + ry + "px)";
      g.clearRect(0, 0, cv.width, cv.height);
      if (!reduce) {
        var t = performance.now();
        parts = parts.filter(function (p) { return t - p.born < p.life; });
        g.fillStyle = SPARK;
        parts.forEach(function (p) {
          var age = (t - p.born) / p.life;
          p.x += p.vx; p.y += p.vy;
          var tw = 0.6 + 0.4 * Math.sin(t / 70 + p.ph);
          g.globalAlpha = (1 - age) * tw;
          star(p.x, p.y, p.s * (1 - age * 0.5));
        });
        g.globalAlpha = 1;
      }
      requestAnimationFrame(loop);
    })();
  }
  function initUx() {
    initCursor();
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var fine = window.matchMedia && window.matchMedia("(hover: hover)").matches;
    var body = document.body, burger = document.getElementById("burger");
    function menu(open) { body.classList.toggle("menu-open", open); if (burger) { burger.setAttribute("aria-expanded", open); burger.setAttribute("aria-label", open ? "Close menu" : "Open menu"); } var d = document.getElementById("drawer"); if (d) d.setAttribute("aria-hidden", !open); }
    if (burger) burger.addEventListener("click", function () { menu(!body.classList.contains("menu-open")); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") menu(false); });
    window.addEventListener("resize", function () { if (innerWidth > 1000) menu(false); });
    $all("#drawer a").forEach(function (l) { l.addEventListener("click", function () { menu(false); }); });
    $all(".d-cur button").forEach(function (b) { b.addEventListener("click", function () { var s = document.getElementById("currency"); s.value = b.getAttribute("data-cur"); s.dispatchEvent(new Event("change")); syncCur(); }); });
    var sel = document.getElementById("currency"); if (sel) sel.addEventListener("change", syncCur);
    var tt = document.getElementById("to-top"); if (tt) tt.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); });
    // Scroll progress
    var bar = document.createElement("div"); bar.className = "progress"; body.appendChild(bar);
    var track = $(".ticker .track"), lastY = window.scrollY, skew = 0;
    function onScroll() {
      var h = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = "scaleX(" + (h > 0 ? Math.min(1, window.scrollY / h) : 0) + ")";
    }
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
    if (track && !reduce) {
      (function loop() {
        var y = window.scrollY, v = y - lastY; lastY = y;
        skew += (Math.max(-12, Math.min(12, v)) - skew) * 0.12;
        track.style.transform = "skewX(" + (-skew * 0.6) + "deg)";
        requestAnimationFrame(loop);
      })();
    }
    if (fine && !reduce) {
      // Magnetic buttons
      document.addEventListener("mousemove", function (e) {
        var b = e.target.closest && e.target.closest(".btn");
        $all(".btn.mag").forEach(function (x) { if (x !== b) { x.style.transform = ""; x.classList.remove("mag"); } });
        if (!b || b.disabled) return;
        var r = b.getBoundingClientRect();
        b.classList.add("mag");
        b.style.transform = "translate(" + ((e.clientX - r.left - r.width / 2) * 0.18) + "px," + ((e.clientY - r.top - r.height / 2) * 0.28) + "px)";
      });
      // Card tilt and gallery zoom origin
      document.addEventListener("mousemove", function (e) {
        var plate = e.target.closest && e.target.closest(".card .plate");
        $all(".card .plate.tilt").forEach(function (x) { if (x !== plate) { x.style.transform = ""; x.classList.remove("tilt"); } });
        if (plate) {
          var r = plate.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
          plate.classList.add("tilt");
          plate.style.transform = "perspective(800px) rotateY(" + (px * 10) + "deg) rotateX(" + (-py * 10) + "deg) translateZ(0)";
        }
        var ph = e.target.closest && e.target.closest(".gallery .ph");
        if (ph) { var q = ph.getBoundingClientRect(); ph.style.setProperty("--zx", ((e.clientX - q.left) / q.width * 100) + "%"); ph.style.setProperty("--zy", ((e.clientY - q.top) / q.height * 100) + "%"); }
        var hp = document.querySelector("[data-tilt-photo]");
        if (hp) { var h = hp.getBoundingClientRect(); var hx = (e.clientX - (h.left + h.width / 2)) / innerWidth, hy = (e.clientY - (h.top + h.height / 2)) / innerHeight; hp.style.transform = "rotateY(" + (hx * 14) + "deg) rotateX(" + (-hy * 10) + "deg)"; }
      });
    }
  }

  function bySlug(slug) {
    for (var i = 0; i < catalog.length; i++) if (catalog[i].slug === slug) return catalog[i];
    return null;
  }

  function applyPrices() {
    if (!catalog) return;
    $all("[data-price-for]").forEach(function (el) {
      var p = bySlug(el.getAttribute("data-price-for"));
      if (p) el.textContent = money(p.prices[currency]);
    });
  }

  function cardHtml(p) {
    return '<a class="card" href="/product/' + esc(p.slug) + '/">' +
      '<div class="plate">' + (p.photos && p.photos[0] ? '<img src="' + esc(p.photos[0]) + '" alt="' + esc(p.name) + '" loading="lazy">' : '') + (p.photos && p.photos[1] ? '<span class="alt"><img src="' + esc(p.photos[1]) + '" alt=""></span>' : '') + '</div>' +
      '<div class="info"><span class="nm">' + esc(p.name) + '</span>' +
      '<span class="price" data-price-for="' + esc(p.slug) + '"></span>' +
      '<span class="cat">' + esc(p.type) + '</span>' +
      '<span class="rate" data-rating-for="' + esc(p.slug) + '"></span></div></a>';
  }

  /* Ratings shown on cards and product pages */
  var ratings = {};
  function starsHtml(avg) {
    return '<span class="stars" style="--p:' + Math.round((avg / 5) * 100) + '%" aria-hidden="true">★★★★★</span>';
  }
  function paintRatings() {
    $all("[data-rating-for]").forEach(function (el) {
      var r = ratings[el.getAttribute("data-rating-for")];
      var long = el.getAttribute("data-long");
      if (r && r.count > 0) {
        var txt = r.avg.toFixed(1) + " (" + r.count + ")";
        if (long) txt = r.avg.toFixed(1) + " out of 5, " + r.count + (r.count === 1 ? " review" : " reviews");
        el.innerHTML = starsHtml(r.avg) + "<span>" + txt + "</span>";
      } else {
        el.innerHTML = long ? "<span>Be the first to review</span>" : "";
      }
    });
  }
  function loadRatings() {
    if (!$("[data-rating-for]") && document.body.getAttribute("data-page") !== "shop") return Promise.resolve();
    return fetch("/api/ratings").then(function (r) { return r.json(); }).then(function (d) { ratings = d || {}; paintRatings(); }).catch(function () {});
  }

  var SIZE_ORDER = ["XS", "S", "M", "L", "XL", "One size"];
  function sizeRank(s) {
    var i = SIZE_ORDER.indexOf(s);
    if (i !== -1) return i;
    var n = parseFloat(s);
    return isNaN(n) ? 99 : 20 + n;
  }
  function uniq(list) { return list.filter(function (v, i) { return list.indexOf(v) === i; }); }

  /* Shop page */
  function initShop(tax, colorMap) {
    var grid = $("#grid");
    var facets = $("#facets");
    var chips = $("#chips");
    var count = $("#count");
    var sortSel = $("#sort");
    var pane = $("#filters-pane");

    var st = { audience: "", category: "", type: "", collection: "", capsule: "", materials: [], stock: false, fresh: false, colors: [], sizes: [], min: "", max: "", sort: "new", q: "" };
    var params = new URLSearchParams(location.search);
    st.audience = params.get("audience") || "";
    st.category = params.get("category") || "";
    st.type = params.get("type") || "";
    st.collection = params.get("collection") || "";
    st.capsule = params.get("capsule") || "";
    st.materials = (params.get("material") || "").split(",").filter(Boolean);
    st.stock = params.get("stock") === "1";
    st.fresh = params.get("new") === "1";
    st.colors = (params.get("color") || "").split(",").filter(Boolean);
    st.sizes = (params.get("size") || "").split(",").filter(Boolean);
    st.min = params.get("min") || "";
    st.max = params.get("max") || "";
    st.sort = params.get("sort") || "new";
    st.q = params.get("q") || "";
    sortSel.value = st.sort;

    var allColors = uniq([].concat.apply([], catalog.map(function (p) { return p.colors; }))).filter(function (c) { return colorMap[c]; });
    var allMaterials = uniq(catalog.map(function (p) { return p.material; }).filter(Boolean)).sort();
    var allCollections = uniq(catalog.map(function (p) { return p.collection; }).filter(Boolean));
    var allCapsules = uniq(catalog.map(function (p) { return p.capsule; }).filter(Boolean));
    function sizesFor(category) {
      var list = catalog.filter(function (p) { return p.category === category; });
      return uniq([].concat.apply([], list.map(function (p) { return p.sizes; }))).sort(function (a, b) { return sizeRank(a) - sizeRank(b); });
    }

    function sync() {
      var q = new URLSearchParams();
      if (st.audience) q.set("audience", st.audience);
      if (st.category) q.set("category", st.category);
      if (st.type) q.set("type", st.type);
      if (st.collection) q.set("collection", st.collection);
      if (st.capsule) q.set("capsule", st.capsule);
      if (st.materials.length) q.set("material", st.materials.join(","));
      if (st.stock) q.set("stock", "1");
      if (st.fresh) q.set("new", "1");
      if (st.colors.length) q.set("color", st.colors.join(","));
      if (st.sizes.length) q.set("size", st.sizes.join(","));
      if (st.min) q.set("min", st.min);
      if (st.max) q.set("max", st.max);
      if (st.sort !== "new") q.set("sort", st.sort);
      if (st.q) q.set("q", st.q);
      var s = q.toString();
      try { history.replaceState(null, "", location.pathname + (s ? "?" + s : "")); } catch (e) {}
    }

    function matches(p) {
      if (st.audience && p.audience.indexOf(st.audience) === -1) return false;
      if (st.collection && p.collection !== st.collection) return false;
      if (st.capsule && p.capsule !== st.capsule) return false;
      if (st.materials.length && st.materials.indexOf(p.material) === -1) return false;
      if (st.stock && !p.inStock) return false;
      if (st.fresh && !p.isNew) return false;
      if (st.category && p.category !== st.category) return false;
      if (st.type && p.type !== st.type) return false;
      if (st.colors.length && !p.colors.some(function (c) { return st.colors.indexOf(c) !== -1; })) return false;
      if (st.sizes.length && !p.sizes.some(function (s) { return st.sizes.indexOf(s) !== -1; })) return false;
      var price = p.prices[currency];
      if (st.min !== "" && price < parseFloat(st.min)) return false;
      if (st.max !== "" && price > parseFloat(st.max)) return false;
      if (st.q) {
        var hay = (p.name + " " + p.category + " " + p.type + " " + p.audience.join(" ") + " " + (p.material || "") + " " + p.colors.join(" ") + " " + p.description).toLowerCase();
        if (hay.indexOf(st.q.toLowerCase()) === -1) return false;
      }
      return true;
    }

    function sorted(list) {
      var l = list.slice();
      if (st.sort === "low") l.sort(function (a, b) { return a.prices[currency] - b.prices[currency]; });
      if (st.sort === "high") l.sort(function (a, b) { return b.prices[currency] - a.prices[currency]; });
      if (st.sort === "az") l.sort(function (a, b) { return a.name.localeCompare(b.name); });
      if (st.sort === "rated") l.sort(function (a, b) {
        var ra = ratings[a.slug] ? ratings[a.slug].avg : 0, rb = ratings[b.slug] ? ratings[b.slug].avg : 0;
        return rb - ra;
      });
      return l;
    }

    function toggle(arr, v) { var i = arr.indexOf(v); if (i === -1) arr.push(v); else arr.splice(i, 1); }

    function facetOpen(key, title, val) {
      return '<details class="facet" data-f="' + key + '"' + (openNow[key] ? " open" : "") + "><summary><span>" + esc(title) + "</span>" + (val ? "<em>" + esc(val) + "</em>" : "") + "</summary>";
    }
    var openNow = {};
    function renderFacets() {
      var openSet = {};
      Array.prototype.forEach.call(facets.querySelectorAll("details.facet[open]"), function (d) { openSet[d.getAttribute("data-f")] = 1; });
      openNow = openSet;
      var h = "";
      h += '<div class="facet"><div class="search"><input type="search" id="f-q" placeholder="Search products" value="' + esc(st.q) + '" aria-label="Search products"></div></div>';
      h += facetOpen("aud", "Shop for", st.audience);
      ["", "Women", "Men"].forEach(function (a) {
        h += '<button type="button" class="opt' + (st.audience === a ? " on" : "") + '" data-aud="' + a + '">' + (a || "All") + "</button>";
      });
      h += "</details>";
      h += facetOpen("cat", "Category", st.category ? (st.type || st.category) : "");
      h += '<button type="button" class="opt' + (!st.category ? " on" : "") + '" data-cat="">All categories</button>';
      tax.forEach(function (c) {
        var on = st.category === c.name;
        h += '<button type="button" class="opt' + (on ? " on" : "") + '" data-cat="' + esc(c.name) + '">' + esc(c.name) + "</button>";
        h += '<div class="sub">';
        c.types.forEach(function (t) {
          h += '<button type="button" class="opt' + (on && st.type === t.name ? " on" : "") + '" data-cat="' + esc(c.name) + '" data-type="' + esc(t.name) + '" title="' + esc(t.blurb) + '">' + esc(t.name) + "</button>";
        });
        h += "</div>";
      });
      h += "</details>";
      h += facetOpen("col", "Colour", st.colors.length ? st.colors.length + " chosen" : "") + '<div class="row">';
      allColors.forEach(function (c) {
        h += '<button type="button" class="sw' + (st.colors.indexOf(c) !== -1 ? " on" : "") + '" data-color="' + esc(c) + '" style="background:' + colorMap[c] + '" title="' + esc(c) + '" aria-label="' + esc(c) + '" aria-pressed="' + (st.colors.indexOf(c) !== -1) + '"></button>';
      });
      h += "</div></details>";
      var sizeCats = tax.filter(function (c) { return (!st.category || st.category === c.name) && c.sizes && c.sizes.length; });
      h += facetOpen("size", "Size", st.sizes.length ? st.sizes.length + " chosen" : "");
      sizeCats.forEach(function (c) {
        if (sizeCats.length > 1) h += '<p class="size-h">' + esc(c.name) + "</p>";
        c.sizes.forEach(function (g) {
          if (c.sizes.length > 1) h += '<p class="size-g">' + esc(g.label) + "</p>";
          h += '<div class="row">';
          g.values.forEach(function (s) {
            h += '<button type="button" class="pill' + (st.sizes.indexOf(s) !== -1 ? " on" : "") + '" data-size="' + esc(s) + '" aria-pressed="' + (st.sizes.indexOf(s) !== -1) + '">' + esc(s) + "</button>";
          });
          h += "</div>";
        });
      });
      h += "</details>";
      h += facetOpen("sig", "Collection", st.collection) + '<div class="row">';
      allCollections.forEach(function (s) { h += '<button type="button" class="pill' + (st.collection === s ? " on" : "") + '" data-collection="' + esc(s) + '">' + esc(s) + "</button>"; });
      h += "</div></details>";
      h += facetOpen("arc", "Capsule", st.capsule) + '<div class="row">';
      allCapsules.forEach(function (s) { h += '<button type="button" class="pill' + (st.capsule === s ? " on" : "") + '" data-capsule="' + esc(s) + '">' + esc(s) + "</button>"; });
      h += "</div></details>";
      h += facetOpen("mat", "Material", st.materials.length ? st.materials.length + " chosen" : "") + '<div class="row">';
      allMaterials.forEach(function (s) { h += '<button type="button" class="pill' + (st.materials.indexOf(s) !== -1 ? " on" : "") + '" data-material="' + esc(s) + '">' + esc(s) + "</button>"; });
      h += "</div></details>";
      h += facetOpen("show", "Show", (st.stock ? 1 : 0) + (st.fresh ? 1 : 0) ? "On" : "") + '<div class="row">';
      h += '<button type="button" class="pill' + (st.stock ? " on" : "") + '" data-flag="stock">In stock</button>';
      h += '<button type="button" class="pill' + (st.fresh ? " on" : "") + '" data-flag="fresh">New</button>';
      h += "</div></details>";
      h += facetOpen("price", "Price (" + currency + ")", st.min || st.max ? "Set" : "") + '<div class="price-row"><input type="number" min="0" inputmode="numeric" id="f-min" placeholder="Min" value="' + esc(st.min) + '" aria-label="Minimum price"><span>to</span><input type="number" min="0" inputmode="numeric" id="f-max" placeholder="Max" value="' + esc(st.max) + '" aria-label="Maximum price"></div></details>';
      facets.innerHTML = h;
    }

    function renderChips() {
      var h = "";
      function chip(label, key, val) { h += '<button type="button" class="chip" data-clear="' + key + '" data-val="' + esc(val || "") + '">' + esc(label) + "</button>"; }
      if (st.audience) chip(st.audience, "audience");
      if (st.category) chip(st.category, "category");
      if (st.type) chip(st.type, "type");
      st.colors.forEach(function (c) { chip(c, "color", c); });
      st.sizes.forEach(function (s) { chip("Size " + s, "size", s); });
      if (st.collection) chip(st.collection, "collection");
      if (st.capsule) chip(st.capsule, "capsule");
      st.materials.forEach(function (m) { chip(m, "material", m); });
      if (st.stock) chip("In stock", "stock");
      if (st.fresh) chip("New", "fresh");
      if (st.min || st.max) chip((st.min || "0") + " to " + (st.max || "any") + " " + currency, "price");
      if (st.q) chip("“" + st.q + "”", "q");
      if (h) h += '<button type="button" class="chip clear" data-clear="all">Clear all</button>';
      chips.innerHTML = h;
    }

    function render() {
      var list = sorted(catalog.filter(matches));
      count.textContent = list.length + (list.length === 1 ? " product" : " products");
      grid.innerHTML = list.length ? list.map(cardHtml).join("") : '<p class="grid-empty">No results for these filters. Try a different word or browse the collection at /shop/.</p>';
      applyPrices();
      paintRatings();
      renderChips();
      sync();
    }

    function refresh() { renderFacets(); render(); }

    facets.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      if (b.hasAttribute("data-aud")) st.audience = b.getAttribute("data-aud");
      else if (b.hasAttribute("data-cat")) { st.category = b.getAttribute("data-cat"); st.type = b.getAttribute("data-type") || ""; }
      else if (b.hasAttribute("data-color")) toggle(st.colors, b.getAttribute("data-color"));
      else if (b.hasAttribute("data-collection")) st.collection = st.collection === b.getAttribute("data-collection") ? "" : b.getAttribute("data-collection");
      else if (b.hasAttribute("data-capsule")) st.capsule = st.capsule === b.getAttribute("data-capsule") ? "" : b.getAttribute("data-capsule");
      else if (b.hasAttribute("data-material")) toggle(st.materials, b.getAttribute("data-material"));
      else if (b.hasAttribute("data-flag")) { var f = b.getAttribute("data-flag"); st[f] = !st[f]; }
      else if (b.hasAttribute("data-size")) toggle(st.sizes, b.getAttribute("data-size"));
      else return;
      refresh();
    });
    facets.addEventListener("input", function (e) {
      if (e.target.id === "f-q") { st.q = e.target.value.trim(); render(); }
      if (e.target.id === "f-min") { st.min = e.target.value; render(); }
      if (e.target.id === "f-max") { st.max = e.target.value; render(); }
    });
    chips.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      var k = b.getAttribute("data-clear"), v = b.getAttribute("data-val");
      if (k === "all") { st.audience = st.category = st.type = st.min = st.max = st.q = st.collection = st.capsule = ""; st.colors = []; st.sizes = []; st.materials = []; st.stock = st.fresh = false; }
      if (k === "collection") st.collection = "";
      if (k === "capsule") st.capsule = "";
      if (k === "material") toggle(st.materials, v);
      if (k === "stock") st.stock = false;
      if (k === "fresh") st.fresh = false;
      if (k === "audience") st.audience = "";
      if (k === "category") { st.category = ""; st.type = ""; }
      if (k === "type") st.type = "";
      if (k === "color") toggle(st.colors, v);
      if (k === "size") toggle(st.sizes, v);
      if (k === "price") { st.min = ""; st.max = ""; }
      if (k === "q") st.q = "";
      refresh();
    });
    sortSel.addEventListener("change", function () { st.sort = sortSel.value; render(); });
    $("#open-filters").addEventListener("click", function () { pane.classList.add("open"); });
    $("#close-filters").addEventListener("click", function () { pane.classList.remove("open"); });
    $("#apply-filters").addEventListener("click", function () { pane.classList.remove("open"); });

    shopRefresh = refresh;
    refresh();
  }
  var shopRefresh = null;

  /* Product page */
  function initSaveButton() {
    var btn = document.getElementById("save-btn");
    if (!btn) return;
    var slug = btn.getAttribute("data-slug"), signed = false, saved = false;
    function paint() { btn.textContent = saved ? "Saved" : "Save"; btn.setAttribute("aria-pressed", saved); }
    api("/api/account").then(function (d) { if (d.user) { signed = true; saved = d.saved.indexOf(slug) !== -1; paint(); } }).catch(function () {});
    btn.addEventListener("click", function () {
      if (!signed) { location.href = "/account/"; return; }
      api("/api/saved", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug: slug }) }).then(function (d) { if (d.ok) { saved = d.saved; paint(); } });
    });
  }
  function initPiece() {
    initSaveButton();
    var main = $("[data-slug]");
    var slug = main.getAttribute("data-slug");
    var form = $("#add-form");
    var msg = $("#msg");
    var colorName = $("#color-name");
    form.addEventListener("change", function (e) {
      if (e.target.name === "color" && colorName) colorName.textContent = e.target.value;
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var color = form.elements.color.value;
      var size = form.elements.size ? form.elements.size.value : "";
      if (!color || (form.elements.size && !size)) { msg.textContent = "Choose a colour and a size."; return; }
      var cart = getCart();
      var found = false;
      cart.forEach(function (l) {
        if (l.slug === slug && l.color === color && l.size === size) { l.qty = Math.min(l.qty + 1, 10); found = true; }
      });
      if (!found) cart.push({ slug: slug, color: color, size: size, qty: 1 });
      setCart(cart);
      msg.innerHTML = 'In your cart. <a href="/cart/">View cart</a>';
      flyToCart(document.querySelector(".gallery .ph img") || document.querySelector(".gallery img"));
      toast('Added to your cart. <a href="/cart/">View cart</a>');
    });
    initReviews(slug);
  }

  function initReviews(slug) {
    var summary = $("#rev-summary");
    var list = $("#rev-list");
    var rform = $("#review-form");
    var rmsg = $("#rv-msg");

    function date(s) {
      try { return new Date(s).toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric" }); } catch (e) { return ""; }
    }
    function load() {
      fetch("/api/reviews?slug=" + encodeURIComponent(slug))
        .then(function (r) { return r.json(); })
        .then(function (d) {
          ratings[slug] = { count: d.count, avg: d.avg };
          paintRatings();
          if (!d.count) {
            summary.innerHTML = '<p class="of">No reviews yet. Yours could be the first.</p>';
            list.innerHTML = "";
            return;
          }
          var bars = "";
          for (var n = 5; n >= 1; n--) {
            var c = d.dist[n - 1];
            bars += "<div><span>" + n + "★</span><i><b style=\"width:" + Math.round((c / d.count) * 100) + '%"></b></i><span>' + c + "</span></div>";
          }
          summary.innerHTML = '<div class="big-num">' + d.avg.toFixed(1) + "</div>" + starsHtml(d.avg) +
            '<p class="of">' + d.count + (d.count === 1 ? " review" : " reviews") + '</p><div class="bars">' + bars + "</div>";
          list.innerHTML = d.reviews.map(function (r) {
            return '<article class="rev">' + starsHtml(r.rating) + "<h3>" + esc(r.title) + "</h3><p>" + esc(r.body) + '</p><p class="who">' + esc(r.name) + ", " + esc(date(r.created_at)) + "</p></article>";
          }).join("");
        })
        .catch(function () {});
    }
    load();

    rform.addEventListener("submit", function (e) {
      e.preventDefault();
      var checked = rform.querySelector("input[name=rating]:checked");
      var data = {
        slug: slug,
        rating: checked ? checked.value : "",
        name: rform.elements.name.value,
        title: rform.elements.title.value,
        body: rform.elements.body.value,
        website: rform.elements.website.value
      };
      var btn = $("button[type=submit]", rform);
      btn.disabled = true;
      rmsg.textContent = "Posting.";
      fetch("/api/reviews", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d.ok) { rform.reset(); rmsg.textContent = "Received. Your review is live."; load(); }
          else { rmsg.textContent = d.error || "Something went wrong on our side. Try again in a moment."; }
          btn.disabled = false;
        })
        .catch(function () { rmsg.textContent = "Something went wrong on our side. Try again in a moment."; btn.disabled = false; });
    });
  }

  /* Cart page */
  function initCart() {
    var box = $("#cart");
    var msg = $("#cart-msg");

    function render() {
      var cart = getCart().filter(function (l) { return bySlug(l.slug); });
      if (!cart.length) {
        box.innerHTML = '<p class="empty">Your cart is empty. The Republic has plenty to show you. <a href="/shop/">Explore the collection</a>.</p>';
        return;
      }
      var total = 0;
      var html = cart.map(function (l, i) {
        var p = bySlug(l.slug);
        var line = p.prices[currency] * l.qty;
        total += line;
        var img = p.photos && p.photos[0] ? '<img src="' + esc(p.photos[0]) + '" alt="' + esc(p.name) + '">' : "";
        var meta = [p.type, p.material].filter(Boolean).map(esc).join(", ");
        return '<div class="cart-line">' +
          '<a class="thumb" href="/product/' + esc(p.slug) + '/">' + img + '</a>' +
          '<div class="info"><a class="nm" href="/product/' + esc(p.slug) + '/">' + esc(p.name) + '</a>' +
          (meta ? '<div class="meta">' + meta + '</div>' : "") +
          '<div class="opt">' + esc(l.color) + (l.size ? ', Size ' + esc(l.size) : '') + '</div>' +
          '<div class="opt">' + money(p.prices[currency]) + ' each</div>' +
          '<div class="qty">' +
          '<button type="button" class="step" data-act="dec" data-i="' + i + '" aria-label="Fewer">-</button>' +
          '<span class="num">' + l.qty + '</span>' +
          '<button type="button" class="step" data-act="inc" data-i="' + i + '" aria-label="More">+</button>' +
          '<button type="button" class="remove" data-act="rm" data-i="' + i + '">Remove</button></div></div>' +
          '<div class="amount">' + money(line) + '</div></div>';
      }).join("");
      html += '<div class="cart-total"><span>Subtotal</span><strong>' + money(total) + '</strong></div>' +
        '<button type="button" class="btn" id="checkout">Check out</button>' +
        '<p class="fine">Payment is handled on a secure Stripe page.</p>';
      box.innerHTML = html;
    }

    box.addEventListener("click", function (e) {
      var t = e.target;
      var act = t.getAttribute && t.getAttribute("data-act");
      if (act) {
        var cart = getCart();
        var i = parseInt(t.getAttribute("data-i"), 10);
        if (act === "inc") cart[i].qty = Math.min(cart[i].qty + 1, 10);
        if (act === "dec") cart[i].qty = Math.max(cart[i].qty - 1, 1);
        if (act === "rm") cart.splice(i, 1);
        setCart(cart);
        render();
        return;
      }
      if (t.id === "checkout") {
        t.disabled = true;
        msg.textContent = "Sending you to the secure payment page.";
        fetch("/api/checkout", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ items: getCart(), currency: currency })
        })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            if (d.url) { window.location = d.url; return; }
            msg.textContent = d.error || "Checkout could not start.";
            t.disabled = false;
          })
          .catch(function () {
            msg.textContent = "Something went wrong on our side. Try again in a moment.";
            t.disabled = false;
          });
      }
    });

    render();
    return render;
  }

  function initWaitlist() {
    $all(".waitlist-form").forEach(function (form) {
      var msg = $(".wl-msg", form);
      var steps = $all(".wl-step", form), cur = 0;
      var back = $(".wl-back", form), next = $(".wl-next", form), sub = $(".wl-submit", form);
      var label = $(".wl-count", form), fill = $(".wl-track i", form);
      function showStep(n) {
        cur = n;
        steps.forEach(function (st, k) { st.classList.toggle("on", k === n); });
        back.hidden = n === 0;
        next.hidden = n === steps.length - 1;
        sub.hidden = n !== steps.length - 1;
        label.textContent = "Step " + (n + 1) + " of " + steps.length;
        fill.style.width = ((n + 1) / steps.length * 100) + "%";
        msg.textContent = "";
      }
      function stepOk() {
        var bad = null;
        $all("input[required], select[required]", steps[cur]).forEach(function (el) {
          var ok = el.type === "checkbox" ? el.checked : !!el.value.trim() && (el.type !== "email" || /^\S+@\S+\.\S+$/.test(el.value.trim()));
          el.classList.toggle("bad", !ok);
          if (!ok && !bad) bad = el;
        });
        if (bad) { msg.textContent = bad.type === "email" ? "Enter a valid email address." : "This field is required."; bad.focus(); return false; }
        return true;
      }
      next.addEventListener("click", function () { if (stepOk()) showStep(cur + 1); });
      back.addEventListener("click", function () { showStep(cur - 1); });
      showStep(0);
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (cur < steps.length - 1) { if (stepOk()) showStep(cur + 1); return; }
        if (!stepOk()) return;
        var data = {
          first: form.elements.first.value,
          last: form.elements.last.value,
          email: form.elements.email.value,
          country: form.elements.country.value,
          city: form.elements.city.value,
          birth_day: form.elements.birth_day.value,
          birth_month: form.elements.birth_month.value,
          phone: form.elements.phone.value,
          email_consent: form.elements.email_consent.checked,
          sms_consent: form.elements.sms_consent.checked,
          province: (function () { try { return localStorage.getItem("zibura_province") || ""; } catch (x) { return ""; } })(),
          website: form.elements.website.value
        };
        var btn = $("button[type=submit]", form);
        btn.disabled = true;
        msg.textContent = "Sending.";
        fetch("/api/waitlist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            if (d.ok) {
              form.reset();
              showStep(0);
              try { localStorage.setItem("zibura_joined", "1"); } catch (x) {}
              msg.textContent = "Received. A confirmation is on its way to your inbox.";
              btn.disabled = false;
            } else {
              msg.textContent = d.error || "Something went wrong on our side. Try again in a moment.";
              btn.disabled = false;
            }
          })
          .catch(function () { msg.textContent = "Something went wrong on our side. Try again in a moment."; btn.disabled = false; });
      });
    });
  }

  var openWaitlistLinks = function () {};
  function initSubscribe() {
    $all(".subscribe-form").forEach(function (form) {
      var msg = $(".sub-msg", form);
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var data = {
          first: form.elements.first.value,
          email: form.elements.email.value,
          email_consent: form.elements.email_consent.checked,
          province: (function () { try { return localStorage.getItem("zibura_province") || ""; } catch (x) { return ""; } })(),
          website: form.elements.website.value
        };
        var btn = $("button[type=submit]", form);
        btn.disabled = true; msg.textContent = "Sending.";
        fetch("/api/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            if (d.ok) {
              form.reset();
              try { localStorage.setItem("zibura_joined", "1"); } catch (x) {}
              msg.textContent = "Received. A confirmation is on its way to your inbox.";
            } else { msg.textContent = d.error || "Something went wrong on our side. Try again in a moment."; btn.disabled = false; }
          })
          .catch(function () { msg.textContent = "Something went wrong on our side. Try again in a moment."; btn.disabled = false; });
      });
    });
  }

  function initModal() {
    var modal = $("#wl-modal");
    if (!modal || !modal.showModal) return;
    function open() { if (!modal.open) modal.showModal(); }
    function close() { modal.close(); try { sessionStorage.setItem("zibura_wl_seen", "1"); } catch (x) {} }
    openWaitlistLinks = function () {
      $all("[data-open-waitlist]").forEach(function (a) {
        if (a.getAttribute("data-bound")) return;
        a.setAttribute("data-bound", "1");
        a.addEventListener("click", function (e) { e.preventDefault(); open(); });
      });
    };
    openWaitlistLinks();
    $all("[data-close-waitlist]").forEach(function (b) { b.addEventListener("click", close); });
    modal.addEventListener("click", function (e) { if (e.target === modal) close(); });
    if (document.body.getAttribute("data-page") === "home") {
      var seen = false;
      try { seen = sessionStorage.getItem("zibura_wl_seen") === "1" || localStorage.getItem("zibura_joined") === "1"; } catch (x) {}
      if (!seen) setTimeout(open, 1800);
    }
  }

  /* Interaction: motion that answers the visitor */
  function fitSignature() {
    var s = document.getElementById("sig");
    if (!s) return;
    var wrap = s.parentNode;
    s.style.fontSize = "100px";
    s.style.display = "inline-block";
    var w = s.getBoundingClientRect().width || 1;
    var target = Math.min(wrap.clientWidth * 0.5, 320);
    s.style.fontSize = Math.max(60, Math.floor(100 * target / w)) + "px";
  }
  function initFx() {
    fitSignature();
    window.addEventListener("resize", fitSignature);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitSignature);
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Scroll reveal
    var items = $all("[data-reveal]");
    if ("IntersectionObserver" in window && !reduce) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          var t = en.target;
          if (en.isIntersecting) { t.classList.add("in"); }
          else if (en.boundingClientRect.top < 0) { t.setAttribute("data-from", "top"); t.classList.remove("in"); }
          else { t.removeAttribute("data-from"); t.classList.remove("in"); }
        });
      }, { threshold: [0, 0.12] });
      items.forEach(function (el) { io.observe(el); });
    } else {
      items.forEach(function (el) { el.classList.add("in"); });
    }

    // Header slides away on scroll down, returns on scroll up
    var header = $(".site-header");
    var lastY = window.scrollY;
    window.addEventListener("scroll", function () {
      var y = window.scrollY;
      if (header) header.classList.toggle("away", y > lastY && y > 240);
      lastY = y;
      lit();
    }, { passive: true });

    // Hero shapes drift with the pointer
    var hero = $("[data-hero]");
    if (hero && !reduce) {
      var zs = $all(".z", hero);
      hero.addEventListener("mousemove", function (e) {
        var r = hero.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        zs.forEach(function (z, i) {
          var d = parseFloat(z.getAttribute("data-depth")) || 20;
          var base = i === 0 ? "rotate(-12deg)" : "rotate(14deg)";
          z.style.transform = "translate(" + (x * d * 2) + "px," + (y * d * 2) + "px) " + base;
        });
      });
    }

    // Scroll-lit statement
    var swEls = $all("[data-scrollwords]").map(function (el) {
      var txt = el.textContent.trim().split(/\s+/);
      el.innerHTML = txt.map(function (w) { return '<span class="sw">' + esc(w) + "</span>"; }).join(" ");
      return { el: el, words: $all(".sw", el) };
    });
    function lit() {
      var vh = window.innerHeight;
      swEls.forEach(function (o) {
        var r = o.el.getBoundingClientRect();
        var p = (vh * 0.85 - r.top) / (r.height + vh * 0.35);
        p = Math.max(0, Math.min(1, p));
        var n = Math.round(p * o.words.length);
        o.words.forEach(function (s, i) { s.classList.toggle("on", i < n); });
      });
    }
    lit();

    // Piece rail: arrows and drag
    var rail = $("[data-rail-track]");
    if (rail) {
      $all("[data-rail]").forEach(function (b) {
        b.addEventListener("click", function () {
          var dir = parseInt(b.getAttribute("data-rail"), 10);
          rail.scrollBy({ left: dir * rail.clientWidth * 0.7, behavior: "smooth" });
        });
      });
      var down = false, sx = 0, sl = 0, moved = false;
      rail.addEventListener("mousedown", function (e) { down = true; moved = false; sx = e.pageX; sl = rail.scrollLeft; });
      window.addEventListener("mouseup", function () { down = false; rail.classList.remove("drag"); });
      rail.addEventListener("mousemove", function (e) {
        if (!down) return;
        var dx = e.pageX - sx;
        if (Math.abs(dx) > 5) { moved = true; rail.classList.add("drag"); }
        rail.scrollLeft = sl - dx;
      });
      rail.addEventListener("click", function (e) { if (moved) { e.preventDefault(); moved = false; } }, true);
    }

    // Cursor follower on the category list
    var cats = $("[data-cats]");
    if (cats && window.matchMedia("(hover: hover)").matches) {
      var f = document.createElement("div");
      f.className = "follower";
      document.body.appendChild(f);
      $all("a", cats).forEach(function (a) {
        a.addEventListener("mouseenter", function () { f.innerHTML = esc(a.getAttribute("data-count")) + "<br>Explore"; f.classList.add("on"); });
        a.addEventListener("mouseleave", function () { f.classList.remove("on"); });
      });
      window.addEventListener("mousemove", function (e) { f.style.transform = "translate(" + e.clientX + "px," + e.clientY + "px) scale(" + (f.classList.contains("on") ? 1 : 0.4) + ")"; });
    }

    // Zi Card: tilts with the pointer, turns over on click
    $all("[data-flip]").forEach(function (fl) {
      var inner = $(".inner", fl);
      function turn() { fl.classList.toggle("turned"); }
      fl.addEventListener("click", turn);
      fl.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); turn(); } });
      if (reduce) return;
      fl.addEventListener("mousemove", function (e) {
        var r = fl.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        fl.classList.add("moving");
        fl.style.setProperty("--ry", (x * 14) + "deg");
        fl.style.setProperty("--rx", (-y * 12) + "deg");
      });
      fl.addEventListener("mouseleave", function () {
        fl.classList.remove("moving");
        fl.style.setProperty("--ry", "0deg");
        fl.style.setProperty("--rx", "0deg");
      });
    });
  }

  // ---------- Account, application, and Zi Card ----------
  function api(path, opts) {
    opts = opts || {};
    opts.credentials = "same-origin";
    return fetch(path, opts).then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._ok = r.ok; return d; }); });
  }
  function show(ids, on) {
    ["v-auth", "v-apply", "v-pending", "v-declined", "v-card"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.hidden = id !== on;
    });
  }

  function loadImg(src) {
    return new Promise(function (res, rej) {
      var im = new Image();
      im.onload = function () { res(im); };
      im.onerror = rej;
      im.src = src;
    });
  }
  function cover(ctx, im, x, y, w, h) {
    var s = Math.max(w / im.width, h / im.height);
    var dw = im.width * s, dh = im.height * s;
    ctx.drawImage(im, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Draws the Zi Card front on a canvas. Positions follow the master card (1011 x 637).
  function drawCard(canvas, card, sample) {
    var NAVY = "#111c44";
    var SANS = '"Lexend", "Public Sans", sans-serif';
    var WIDE = '"Lexend Zetta", "Lexend Exa", "Lexend", sans-serif';
    return Promise.all([
      document.fonts.load('700 40px "Lexend Zetta"'),
      document.fonts.load('400 20px "Lexend"'),
      document.fonts.load('600 14px "Lexend"'),
      document.fonts.load('40px "Yellowtail"')
    ]).catch(function () {}).then(function () {
      return Promise.all([
        loadImg("/assets/zi-card-bg.png"),
        loadImg("/assets/logo-icon-navy.png"),
        loadImg("/assets/zi-card-seal.png"),
        sample ? null : loadImg("/api/photo?t=" + Date.now()).catch(function () { return null; })
      ]);
    }).then(function (im) {
      var ctx = canvas.getContext("2d");
      var k = canvas.width / 1011;
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.clearRect(0, 0, 1011, 637);
      ctx.save();
      rrect(ctx, 0, 0, 1011, 637, 44);
      ctx.clip();
      cover(ctx, im[0], 0, 0, 1011, 637);
      ctx.fillStyle = NAVY;
      ctx.textBaseline = "alphabetic";

      // Text of a set cap height, letter spaced so it fills an exact width.
      function spaced(t, x, base, family, weight, cap, width) {
        var size = cap / 0.7;
        ctx.font = weight + " " + size + "px " + family;
        if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
        var natural = ctx.measureText(t).width;
        var gap = t.length > 1 ? (width - natural) / (t.length - 1) : 0;
        if ("letterSpacing" in ctx) { ctx.letterSpacing = gap + "px"; ctx.fillText(t, x, base); ctx.letterSpacing = "0px"; }
        else { ctx.fillText(t, x, base); }
      }

      spaced("ZI CARD", 58, 107, WIDE, "700", 33, 289);
      spaced("YOUR EXPRESSION, YOUR WORLD.", 56, 132, SANS, "400", 10, 291);
      ctx.drawImage(im[1], 616, 76, 47, 47 * im[1].height / im[1].width);
      spaced("ISSUED BY ZI REPUBLIC", 682, 95, SANS, "400", 11, 279);
      spaced("MINISTRY OF REPUBLIC ADMINISTRATION", 682, 121, SANS, "400", 11, 279);

      // Portrait
      ctx.save();
      rrect(ctx, 55, 187, 281, 362, 24);
      ctx.clip();
      ctx.fillStyle = "#d2eaff";
      ctx.fillRect(55, 187, 281, 362);
      if (im[3]) cover(ctx, im[3], 55, 187, 281, 362);
      ctx.restore();
      if (sample && !im[3]) {
        ctx.fillStyle = NAVY; ctx.globalAlpha = 0.45;
        ctx.font = "500 14px " + SANS; ctx.textAlign = "center";
        if ("letterSpacing" in ctx) ctx.letterSpacing = "2px";
        ctx.fillText("YOUR PORTRAIT", 195.5, 540);
        ctx.textAlign = "left"; ctx.globalAlpha = 1;
        if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
      }
      ctx.fillStyle = NAVY;

      // Script title under the portrait
      if (card.title) {
        ctx.save();
        ctx.textAlign = "center";
        var ts = 52;
        ctx.font = ts + 'px "Yellowtail", cursive';
        while (ctx.measureText(card.title).width > 190 && ts > 16) { ts -= 1; ctx.font = ts + 'px "Yellowtail", cursive'; }
        ctx.fillText(card.title, 196, 604);
        ctx.restore();
      }

      // Fields
      var fields = [
        ["NAME", card.name, 190, 214, 394, 482, 45],
        ["ID NUMBER", card.id, 304, 328, 394, 482, 87],
        ["STATUS", card.status, 417, 442, 394, 482, 57],
        ["ISSUED", card.issued, 531, 556, 390, 219, 55],
        ["VALIDITY", card.validity, 532, 556, 661, 220, 67]
      ];
      fields.forEach(function (f) {
        var lx = f[0] === "VALIDITY" ? 662 : 391;
        ctx.fillStyle = NAVY;
        spaced(f[0], lx, f[2] + 10, SANS, "600", 9.5, f[6]);
        ctx.save();
        if (f[0] !== "ISSUED" && f[0] !== "VALIDITY") { ctx.shadowColor = "rgba(17,28,68,0.14)"; ctx.shadowBlur = 5; ctx.shadowOffsetY = 1.5; }
        ctx.fillStyle = "rgba(244,247,255,0.94)";
        rrect(ctx, f[4], f[3], f[5], 56, 8);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = NAVY;
        var size = 21;
        ctx.font = "400 " + size + "px " + SANS;
        if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
        while (ctx.measureText(f[1]).width > f[5] - 22 && size > 11) { size -= 1; ctx.font = "400 " + size + "px " + SANS; }
        ctx.fillText(f[1], f[4] + (f[0] === "ISSUED" ? 10 : f[0] === "VALIDITY" ? 12 : 8), f[3] + 33);
      });

      // Side rule, star, and vertical name of the republic
      ctx.fillStyle = NAVY; ctx.strokeStyle = NAVY; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(949.5, 198); ctx.lineTo(949.5, 268); ctx.moveTo(949.5, 286); ctx.lineTo(949.5, 355); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(949.5, 270); ctx.quadraticCurveTo(949.5, 277, 956, 277);
      ctx.quadraticCurveTo(949.5, 277, 949.5, 284); ctx.quadraticCurveTo(949.5, 277, 943, 277);
      ctx.quadraticCurveTo(949.5, 277, 949.5, 270); ctx.fill();
      // "ZI REPUBLIC" runs top to bottom, centred on the same axis as the rule above and the seal below
      ctx.save();
      ctx.font = "500 15px " + SANS;
      if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
      var cap = ctx.measureText("Z").actualBoundingBoxAscent || 10.5;
      ctx.translate(949.5 - cap / 2, 380);
      ctx.rotate(Math.PI / 2);
      spaced("ZI REPUBLIC", 0, 0, SANS, "500", 10.5, 133);
      ctx.restore();
      ctx.drawImage(im[2], 912, 543, 76, 75);
      ctx.restore();
    });
  }

  var SAMPLE_CARD = { name: "YOUR NAME", id: "ZIYYMM000000", status: "ZI RESIDENT", issued: "MONTH YEAR", validity: "MONTH YEAR", title: "Your own title" };
  function initSampleCards() {
    $all("canvas[data-sample]").forEach(function (c) { drawCard(c, SAMPLE_CARD, true); });
  }

  // Resize and centre-crop the chosen photo to the card's portrait frame.
  function prepPhoto(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file);
      var im = new Image();
      im.onload = function () {
        var c = document.createElement("canvas");
        c.width = 562; c.height = 724;
        cover(c.getContext("2d"), im, 0, 0, 562, 724);
        URL.revokeObjectURL(url);
        c.toBlob(function (blob) { blob ? res(blob) : rej(); }, "image/jpeg", 0.9);
      };
      im.onerror = function () { rej(); };
      im.src = url;
    });
  }

  function initAccount() {
    var heading = document.getElementById("acct-h");
    var sub = document.getElementById("acct-sub");
    var out = document.getElementById("acct-out");
    var currentCard = null;

    function render() {
      return api("/api/me").then(function (d) {
        document.getElementById("acct-loading").hidden = true;
        if (d.error) { sub.textContent = d.error; return; }
        var dash = document.getElementById("dash");
        if (!d.user) {
          out.hidden = true; dash.hidden = true;
          show(null, "v-auth");
          return;
        }
        dash.hidden = false;
        out.hidden = false;
        loadDash(d);
        document.getElementById("acct-who").textContent = d.user.first + " " + d.user.last + ", " + d.user.email + ".";
        var nm = document.getElementById("a-name");
        if (nm && !nm.value) nm.value = (d.user.first + " " + d.user.last).toUpperCase();
        var a = d.application;
        if (d.card) {
          sub.textContent = "Welcome, Zi Resident. Your card is ready.";
          show(null, "v-card");
          currentCard = d.card;
          drawCard(document.getElementById("card-canvas"), d.card);
        } else if (a && a.status === "pending") {
          sub.textContent = "Application received. Check back in a few days.";
          show(null, "v-pending");
        } else if (a && a.status === "declined") {
          sub.textContent = "A decision has been made.";
          show(null, "v-declined");
        } else if (d.open === false) {
          sub.textContent = "Applications are paused right now. Your account is saved.";
          show(null, "none");
        } else {
          sub.textContent = "Upload your portrait and apply for your Zi Card.";
          show(null, "v-apply");
        }
      });
    }

    var acct = null, taxCache = null;
    var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    function fmtMoney(cents, cur) {
      try { return new Intl.NumberFormat("en", { style: "currency", currencyDisplay: "code", currency: cur || "USD" }).format((cents || 0) / 100); } catch (e) { return (cur || "") + " " + ((cents || 0) / 100).toFixed(2); }
    }
    function fmtDate(s) { try { return new Date(s).toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric" }); } catch (e) { return ""; } }
    function panel(name) { return document.querySelector('[data-panel="' + name + '"]'); }
    function openSec(name) {
      if (!panel(name)) name = "overview";
      $all("[data-panel]").forEach(function (p) { p.hidden = p.getAttribute("data-panel") !== name; });
      $all("#dash-nav button").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-sec") === name); });
      try { history.replaceState(null, "", "#" + name); } catch (e) {}
    }
    function loadDash(me) {
      Promise.all([api("/api/account"), taxCache ? Promise.resolve(taxCache) : fetch("/taxonomy.json").then(function (r) { return r.json(); }).catch(function () { return []; })]).then(function (r) {
        acct = r[0]; taxCache = r[1];
        if (!acct.user) return;
        // A quiz taken before signing in is kept and saved to the account.
        var localStyle = null;
        try { localStyle = JSON.parse(localStorage.getItem("zibura_style") || "null"); } catch (e) {}
        if (localStyle && (!acct.profile.style || acct.profile.style.at !== localStyle.at)) {
          acct.profile.style = localStyle; acct.profile.province = localStyle.province;
          api("/api/profile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ province: localStyle.province, style: localStyle }) });
        }
        drawDash(me);
        openSec((location.hash || "").slice(1) || "overview");
      });
    }
    function field(id, label, val, extra) { return '<div' + (extra && extra.full ? ' class="full"' : "") + '><label for="' + id + '">' + label + '</label><input id="' + id + '" value="' + esc(val || "") + '"' + (extra && extra.attrs ? " " + extra.attrs : "") + "></div>"; }
    function empty(t, href, label) { return '<div class="empty"><p>' + t + "</p>" + (href ? '<a class="btn" href="' + href + '">' + label + "</a>" : "") + "</div>"; }
    var LEG = { Ripple: "Composed", Glow: "Warm", Blaze: "Bold", Bloom: "Grounded", Dash: "Playful", Swirl: "Layered" };
    function legName(n) { return LEG[n] || n; }
    function piece(slug) { return bySlug(slug); }
    function drawDash(me) {
      var u = acct.user, pf = acct.profile, st = pf.style, prov = pf.province || (st && st.province) || "";
      var av = document.getElementById("d-avatar");
      av.innerHTML = pf.avatar ? '<img src="/api/avatar?v=' + Date.now() + '" alt="Your photo">' : "<span>" + esc((u.first[0] || "") + (u.last[0] || "")) + "</span>";
      document.getElementById("d-name").textContent = u.first + " " + u.last;
      var meta = [];
      if (prov) meta.push("Style Compass: " + legName(prov));
      if (me.card) meta.push(me.card.id);
      meta.push("Zi Resident since " + fmtDate(u.since));
      document.getElementById("d-meta").textContent = meta.join(", ");
      document.getElementById("acct-who").textContent = u.email;
      document.getElementById("acct-sub").textContent = "Your orders, Zi Card, Style Compass and saved details.";

      // Overview
      var cardState = me.card ? "Issued" : (me.application ? (me.application.status === "pending" ? "In review" : me.application.status === "declined" ? "Declined" : "In review") : "Not applied");
      var last = acct.orders[0];
      var ov = '<div class="tiles">' +
        '<button type="button" class="tile" data-go="card"><b>' + cardState + '</b><span>Zi Card</span></button>' +
        '<button type="button" class="tile" data-go="orders"><b>' + acct.orders.length + '</b><span>' + (acct.orders.length === 1 ? "Order" : "Orders") + '</span></button>' +
        '<button type="button" class="tile" data-go="saved"><b>' + acct.saved.length + '</b><span>Saved products</span></button>' +
        '<button type="button" class="tile" data-go="style"><b>' + esc(prov ? legName(prov) : "Not set") + '</b><span>Style Compass</span></button></div>';
      var todo = [];
      if (!me.card && !me.application) todo.push(['Apply for Zi Residency', "card"]);
      if (!st) todo.push(['Take the Style Compass', "style"]);
      if (!pf.avatar) todo.push(['Add your photo', "profile"]);
      if (!acct.addresses.length) todo.push(['Add a shipping address', "addresses"]);
      if (!pf.prefs || !Object.keys(pf.prefs).length) todo.push(['Save your sizes', "prefs"]);
      if (todo.length) ov += '<div class="box"><h3>Finish your account</h3><ul class="todo">' + todo.map(function (t) { return '<li><button type="button" class="linkbtn" data-go="' + t[1] + '">' + t[0] + "</button></li>"; }).join("") + "</ul></div>";
      if (last) ov += '<div class="box"><h3>Latest order</h3><p><b>' + last.number + "</b>, " + fmtDate(last.at) + ", " + (last.status === "paid" ? "Paid" : "Awaiting payment") + ", " + fmtMoney(last.total, last.currency) + '. <button type="button" class="linkbtn" data-go="orders">View all orders</button></p></div>';
      if (st) ov += '<div class="box"><h3>Your Style Compass</h3><p><b>' + esc(st.style) + "</b>, close to " + esc(legName(st.second)) + '. <button type="button" class="linkbtn" data-go="style">See your Style Compass</button></p></div>';
      if (u.birth_month && u.birth_day) ov += '<div class="box"><h3>Birthday on file</h3><p>' + MONTHS[u.birth_month - 1] + " " + u.birth_day + ".</p></div>";
      panel("overview").innerHTML = '<h2 class="display h2">Welcome back, ' + esc(u.first) + ".</h2>" + ov;

      // Orders
      var ord = acct.orders.length ? acct.orders.map(function (o) {
        var rows = o.items.map(function (it) {
          var p = piece(it.slug);
          return '<li><a href="/product/' + esc(it.slug) + '/" class="thumb">' + (p && p.photos && p.photos[0] ? '<img src="' + esc(p.photos[0]) + '" alt="">' : "") + '</a><div><b>' + esc(it.name) + '</b><span>' + esc(it.color) + (it.size ? ", " + esc(it.size) : "") + ", quantity " + it.qty + '</span></div><em>' + fmtMoney(Math.round(it.unit * 100) * it.qty, o.currency) + "</em></li>";
        }).join("");
        var ship = o.ship && o.ship.address ? '<p class="small">Ships to ' + esc(o.ship.name || "") + ", " + [o.ship.address.line1, o.ship.address.city, o.ship.address.postal_code, o.ship.address.country].filter(Boolean).map(esc).join(", ") + ".</p>" : "";
        return '<details class="order"><summary><span><b>' + o.number + "</b> " + fmtDate(o.at) + '</span><span class="badge ' + o.status + '">' + (o.status === "paid" ? "Paid" : "Awaiting payment") + "</span><em>" + fmtMoney(o.total, o.currency) + "</em></summary><ul>" + rows + "</ul>" + ship + '<p class="small">' + (o.status === "paid" ? "The Ministry of Commerce and Trade is preparing your order. Tracking appears here when it is available." : "This order has not been paid. Return to your cart to complete it.") + "</p></details>";
      }).join("") : empty("No orders yet. Orders appear here once placed.", "/shop/", "Shop the collection");
      panel("orders").innerHTML = '<h2 class="display h2">Orders</h2>' + ord;

      // Style
      var quizHtml = '<div id="quiz" class="quiz" data-quiz hidden><div class="q-bar"><span id="q-step"></span><div class="q-track"><i id="q-fill"></i></div></div><h2 class="display q-title" id="q-title" tabindex="-1"></h2><div class="q-opts" id="q-opts"></div></div><div id="result" class="result" hidden></div>';
      if (st) {
        var bars = (st.shares || []).map(function (s) { return '<div class="r-bar"><span>' + esc(legName(s.n)) + '</span><div><i style="width:' + Math.max(s.pct, 2) + '%"></i></div><b>' + s.pct + "%</b></div>"; }).join("");
        panel("style").innerHTML = '<h2 class="display h2">Your Style Compass</h2><div id="sty-sum"><div class="box"><p class="r-big">' + esc(st.style) + '.</p><p class="prose">Taken ' + fmtDate(st.at) + '. A Style Compass describes your preferences. It does not affect your Zi Residency or Zitizenship.</p><div class="r-bars">' + bars + '</div></div><p><button type="button" class="btn line" id="start-quiz">Retake the Style Compass</button></p></div>' + quizHtml;
      } else panel("style").innerHTML = '<h2 class="display h2">Your Style Compass</h2><div id="sty-sum">' + empty("Eighteen questions match you to one of ten style leanings.", "", "") + '<p><button type="button" class="btn" id="start-quiz">Take the Style Compass</button></p></div>' + quizHtml;
      var sq = document.getElementById("start-quiz");
      if (sq) sq.addEventListener("click", function () { document.getElementById("sty-sum").hidden = true; initQuiz(); });

      // Saved
      drawSaved();

      // Addresses
      drawAddresses();

      // Profile
      var mOpts = '<option value="">Month</option>' + MONTHS.map(function (m, i) { return '<option value="' + (i + 1) + '"' + (u.birth_month === i + 1 ? " selected" : "") + ">" + m + "</option>"; }).join("");
      var dOpts = '<option value="">Day</option>' + Array.apply(null, Array(31)).map(function (_, i) { return '<option value="' + (i + 1) + '"' + (u.birth_day === i + 1 ? " selected" : "") + ">" + (i + 1) + "</option>"; }).join("");
      panel("profile").innerHTML = '<h2 class="display h2">Profile</h2><div class="box"><div class="av-row"><div class="dash-avatar big" id="p-av">' + (pf.avatar ? '<img src="/api/avatar?v=' + Date.now() + '" alt="">' : "<span>" + esc(u.first[0] + u.last[0]) + "</span>") + '</div><div><label class="btn line" for="p-file">Change photo</label><input id="p-file" type="file" accept="image/jpeg,image/png,image/webp" hidden><p class="small">This is your account picture. Your Zi Card portrait is set when you apply.</p><div class="msg" id="p-fmsg" role="status"></div></div></div></div>' +
        '<form id="f-profile" class="box"><div class="form-grid">' + field("pr-first", "First name", u.first, { attrs: 'name="first" required' }) + field("pr-last", "Last name", u.last, { attrs: 'name="last" required' }) +
        '<div><label for="pr-bm">Birthday month</label><select id="pr-bm" name="birth_month">' + mOpts + '</select></div><div><label for="pr-bd">Birthday day</label><select id="pr-bd" name="birth_day">' + dOpts + "</select></div>" +
        field("pr-phone", "Phone", pf.phone, { attrs: 'name="phone" autocomplete="tel"' }) + field("pr-city", "City", pf.city, { attrs: 'name="city"' }) + field("pr-country", "Country", pf.country, { attrs: 'name="country"', full: true }) +
        '<div class="full"><label for="pr-bio">About you (280 characters)</label><textarea id="pr-bio" name="bio" maxlength="280" rows="3">' + esc(pf.bio) + '</textarea></div></div><p class="small">Your email is ' + esc(u.email) + '.</p><button class="btn" type="submit">Save profile</button><div class="msg" role="status"></div></form>';

      // Sizes
      var P2 = pf.prefs || {};
      function sel(id, label, group, cur) {
        var vals = [];
        (taxCache || []).forEach(function (c) { if (c.name === group[0]) (c.sizes || []).forEach(function (g) { if (!group[1] || g.label === group[1]) vals = vals.concat(g.values); }); });
        return '<div><label for="' + id + '">' + label + '</label><select id="' + id + '" name="' + id + '"><option value="">Not set</option>' + vals.map(function (v) { return '<option' + (cur === v ? " selected" : "") + ">" + esc(v) + "</option>"; }).join("") + "</select></div>";
      }
      var colorsList = ["Zibura Blue", "Sky Blue", "Cobalt", "Aqua", "Mint", "Green", "Lime", "Yellow", "Orange", "Coral", "Red", "Hot Pink", "Purple", "Lilac", "Black", "White", "Cream", "Tan"];
      var favs = P2.colors || [];
      panel("prefs").innerHTML = '<h2 class="display h2">Your sizes and tastes</h2><form id="f-prefs" class="box"><div class="form-grid">' +
        sel("tops", "Tops and dresses", ["Clothing", "Letter sizes"], P2.tops) + sel("bottoms", "Bottoms (numeric)", ["Clothing", "Numeric (US)"], P2.bottoms) +
        sel("shoe", "Shoe size (EU)", ["Footwear"], P2.shoe) + sel("ring", "Ring size (US)", ["Accessories", "Ring size (US)"], P2.ring) +
        sel("scent", "Fragrance size", ["Fragrance", "Volume"], P2.scent) + sel("device", "Your phone or device", ["Lifestyle", "Device"], P2.device) +
        '<div class="full"><label>Colours you like</label><div class="row">' + colorsList.map(function (c) { return '<button type="button" class="pill' + (favs.indexOf(c) !== -1 ? " on" : "") + '" data-fav="' + esc(c) + '" aria-pressed="' + (favs.indexOf(c) !== -1) + '">' + esc(c) + "</button>"; }).join("") + "</div></div>" +
        '<div class="full"><label for="notes">Notes for the stylists</label><textarea id="notes" rows="3" maxlength="280">' + esc(P2.notes || "") + '</textarea></div></div><button class="btn" type="submit">Save sizes</button><div class="msg" role="status"></div></form>';

      // Security
      panel("security").innerHTML = '<h2 class="display h2">Security</h2><form id="f-pass" class="box"><h3>Change password</h3><div class="form-grid"><div class="full"><label for="pw-cur">Current password</label><input id="pw-cur" type="password" autocomplete="current-password" required></div><div class="full"><label for="pw-new">New password (8 characters or more)</label><input id="pw-new" type="password" minlength="8" autocomplete="new-password" required></div></div><button class="btn" type="submit">Update password</button><div class="msg" role="status"></div></form>' +
        '<form id="f-del" class="box"><h3>Delete account</h3><p class="small">This deletes your account, order list, saved products, addresses and Zi Card. It cannot be undone.</p><div class="form-grid"><div class="full"><label for="del-pw">Confirm with your password</label><input id="del-pw" type="password" autocomplete="current-password" required></div></div><button class="btn line" type="submit">Delete account</button><div class="msg" role="status"></div></form>';
    }
    function drawSaved() {
      var list = acct.saved.map(piece).filter(Boolean);
      panel("saved").innerHTML = '<h2 class="display h2">Saved products</h2>' + (list.length ? '<div class="r-picks">' + list.map(function (p) { return '<div class="saved-it">' + cardHtml(p) + '<button type="button" class="linkbtn" data-unsave="' + esc(p.slug) + '">Remove</button></div>'; }).join("") + "</div>" : empty("Select Save on any product page and it appears here.", "/shop/", "Shop the collection"));
      applyPrices();
    }
    function drawAddresses(editId) {
      var cur = editId ? acct.addresses.filter(function (x) { return x.id === editId; })[0] : null;
      var list = acct.addresses.map(function (x) {
        return '<div class="box addr"><h3>' + esc(x.label) + (x.is_default ? ' <span class="badge paid">Default</span>' : "") + "</h3><p>" + esc(x.name) + "<br>" + esc(x.line1) + (x.line2 ? "<br>" + esc(x.line2) : "") + "<br>" + esc(x.city) + (x.region ? ", " + esc(x.region) : "") + " " + esc(x.postal) + "<br>" + esc(x.country) + (x.phone ? "<br>" + esc(x.phone) : "") + '</p><p><button type="button" class="linkbtn" data-aedit="' + x.id + '">Edit</button> ' + (x.is_default ? "" : '<button type="button" class="linkbtn" data-adef="' + x.id + '">Make default</button> ') + '<button type="button" class="linkbtn" data-adel="' + x.id + '">Delete</button></p></div>';
      }).join("");
      var c = cur || { label: "Home", name: acct.user.first + " " + acct.user.last };
      panel("addresses").innerHTML = '<h2 class="display h2">Addresses</h2>' + (list || empty("No addresses yet. Add one and checkout gets faster.")) +
        '<form id="f-addr" class="box"><h3>' + (cur ? "Edit address" : "Add an address") + '</h3><div class="form-grid">' + field("ad-label", "Label", c.label, { attrs: 'name="label"' }) + field("ad-name", "Full name", c.name, { attrs: 'name="name" required' }) + field("ad-l1", "Street address", c.line1, { attrs: 'name="line1" required', full: true }) + field("ad-l2", "Apartment, suite, unit", c.line2, { attrs: 'name="line2"', full: true }) + field("ad-city", "City", c.city, { attrs: 'name="city" required' }) + field("ad-region", "Province or state", c.region, { attrs: 'name="region"' }) + field("ad-postal", "Postal code", c.postal, { attrs: 'name="postal" required' }) + field("ad-country", "Country", c.country, { attrs: 'name="country" required' }) + field("ad-phone", "Phone", c.phone, { attrs: 'name="phone"', full: true }) + '</div><input type="hidden" name="id" value="' + (cur ? cur.id : "") + '"><button class="btn" type="submit">' + (cur ? "Save address" : "Add address") + "</button>" + (cur ? ' <button type="button" class="btn line" data-acancel="1">Cancel</button>' : "") + '<div class="msg" role="status"></div></form>';
    }
    function post(path, body) { return api(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); }
    function refresh() { return api("/api/me").then(function (me) { return loadDash(me); }); }
    var dashEl = document.getElementById("dash");
    dashEl.addEventListener("click", function (e) {
      var t = e.target.closest("button"); if (!t) return;
      if (t.hasAttribute("data-sec")) openSec(t.getAttribute("data-sec"));
      else if (t.hasAttribute("data-go")) openSec(t.getAttribute("data-go"));
      else if (t.hasAttribute("data-unsave")) post("/api/saved", { slug: t.getAttribute("data-unsave") }).then(function () { acct.saved = acct.saved.filter(function (s) { return s !== t.getAttribute("data-unsave"); }); drawSaved(); });
      else if (t.hasAttribute("data-aedit")) drawAddresses(parseInt(t.getAttribute("data-aedit"), 10));
      else if (t.hasAttribute("data-acancel")) drawAddresses();
      else if (t.hasAttribute("data-adef")) post("/api/address", { action: "default", id: t.getAttribute("data-adef") }).then(refresh);
      else if (t.hasAttribute("data-adel")) post("/api/address", { action: "delete", id: t.getAttribute("data-adel") }).then(refresh);
      else if (t.hasAttribute("data-fav")) { var on = !t.classList.contains("on"); t.classList.toggle("on", on); t.setAttribute("aria-pressed", on); }
    });
    dashEl.addEventListener("change", function (e) {
      if (e.target.id !== "p-file" || !e.target.files[0]) return;
      var msg = document.getElementById("p-fmsg"); msg.textContent = "Uploading.";
      var fd = new FormData(); fd.append("photo", e.target.files[0]);
      api("/api/avatar", { method: "POST", body: fd }).then(function (d) { if (d.ok) { msg.textContent = "Photo saved."; refresh(); } else msg.textContent = d.error || "The photo could not be saved."; });
    });
    dashEl.addEventListener("submit", function (e) {
      var f = e.target; if (f.id === "f-apply") return;
      var msg = $(".msg", f), body;
      if (f.id === "f-profile") {
        e.preventDefault(); body = {};
        Array.prototype.forEach.call(f.elements, function (el) { if (el.name) body[el.name] = el.value; });
        post("/api/profile", body).then(function (d) { msg.textContent = d.ok ? "Profile saved." : (d.error || "Could not save."); if (d.ok) refresh(); });
      } else if (f.id === "f-prefs") {
        e.preventDefault();
        var prefs = { notes: f.elements.notes.value, colors: $all("[data-fav].on", f).map(function (b) { return b.getAttribute("data-fav"); }) };
        ["tops", "bottoms", "shoe", "ring", "scent", "device"].forEach(function (k) { if (f.elements[k].value) prefs[k] = f.elements[k].value; });
        post("/api/profile", { prefs: prefs }).then(function (d) { msg.textContent = d.ok ? "Sizes saved." : (d.error || "Could not save."); });
      } else if (f.id === "f-addr") {
        e.preventDefault(); body = {};
        Array.prototype.forEach.call(f.elements, function (el) { if (el.name) body[el.name] = el.value; });
        post("/api/address", body).then(function (d) { if (d.ok) refresh().then(function () { openSec("addresses"); }); else msg.textContent = d.error || "Could not save."; });
      } else if (f.id === "f-pass") {
        e.preventDefault();
        post("/api/password", { current: f.elements["pw-cur"].value, next: f.elements["pw-new"].value }).then(function (d) { msg.textContent = d.ok ? "Password updated." : (d.error || "Could not update."); if (d.ok) f.reset(); });
      } else if (f.id === "f-del") {
        e.preventDefault();
        post("/api/account/delete", { password: f.elements["del-pw"].value }).then(function (d) { if (d.ok) { updateAcctLink(); render(); } else msg.textContent = d.error || "Could not delete."; });
      }
    });
    window.addEventListener("hashchange", function () { if (acct) openSec((location.hash || "").slice(1)); });

    $all(".tab[data-tab]").forEach(function (t) {
      t.addEventListener("click", function () {
        $all(".tab[data-tab]").forEach(function (x) { x.classList.toggle("on", x === t); });
        document.getElementById("f-signup").hidden = t.getAttribute("data-tab") !== "signup";
        document.getElementById("f-login").hidden = t.getAttribute("data-tab") !== "login";
      });
    });

    function authForm(id, path) {
      var f = document.getElementById(id);
      f.addEventListener("submit", function (e) {
        e.preventDefault();
        var msg = $(".msg", f), btn = $("button[type=submit]", f);
        var body = {};
        Array.prototype.forEach.call(f.elements, function (el) { if (el.name) body[el.name] = el.value; });
        btn.disabled = true; msg.textContent = "One moment.";
        api(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(function (d) {
          btn.disabled = false;
          if (d.ok) { msg.textContent = ""; f.reset(); updateAcctLink(); render(); }
          else msg.textContent = d.error || "Something went wrong on our side. Try again in a moment.";
        }).catch(function () { btn.disabled = false; msg.textContent = "Something went wrong on our side. Try again in a moment."; });
      });
    }
    var fLogin = document.getElementById("f-login"), fForgot = document.getElementById("f-forgot");
    document.getElementById("show-forgot").addEventListener("click", function () { fLogin.hidden = true; fForgot.hidden = false; });
    document.getElementById("back-login").addEventListener("click", function () { fForgot.hidden = true; fLogin.hidden = false; });
    fForgot.addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = $(".msg", fForgot);
      msg.textContent = "One moment.";
      api("/api/auth/forgot", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: fForgot.elements.email.value }) }).then(function () {
        msg.textContent = "If that email is on file, a reset link is on its way. It works for one hour.";
      }).catch(function () { msg.textContent = "Something went wrong on our side. Try again in a moment."; });
    });
    authForm("f-signup", "/api/auth/signup");
    authForm("f-login", "/api/auth/login");

    // Portrait cropper: drag to position, slide to zoom. The frame matches the card's photo window.
    var photo = document.getElementById("a-photo");
    var crop = document.getElementById("a-crop");
    var cv = document.getElementById("a-canvas");
    var zoom = document.getElementById("a-zoom");
    var cimg = null, cs = { base: 1, z: 1, ox: 0, oy: 0 }, haveCrop = false;
    function clampCrop() {
      var s = cs.base * cs.z, w = cimg.width * s, h = cimg.height * s;
      cs.ox = Math.min(0, Math.max(cv.width - w, cs.ox));
      cs.oy = Math.min(0, Math.max(cv.height - h, cs.oy));
    }
    function drawCrop() {
      var ctx = cv.getContext("2d");
      ctx.fillStyle = "#d2eaff"; ctx.fillRect(0, 0, cv.width, cv.height);
      var s = cs.base * cs.z;
      ctx.drawImage(cimg, cs.ox, cs.oy, cimg.width * s, cimg.height * s);
    }
    photo.addEventListener("change", function () {
      haveCrop = false;
      var f = photo.files[0];
      if (!f) { crop.hidden = true; return; }
      var url = URL.createObjectURL(f);
      loadImg(url).then(function (im) {
        cimg = im;
        cs.base = Math.max(cv.width / im.width, cv.height / im.height);
        cs.z = 1; zoom.value = 1;
        cs.ox = (cv.width - im.width * cs.base) / 2;
        cs.oy = (cv.height - im.height * cs.base) / 4;
        clampCrop(); drawCrop();
        crop.hidden = false; haveCrop = true;
      }).catch(function () { crop.hidden = true; $(".msg", document.getElementById("f-apply")).textContent = "That photo could not be read. Please choose a JPG, PNG, or WebP image."; });
    });
    zoom.addEventListener("input", function () {
      if (!cimg) return;
      var cx = cv.width / 2, cy = cv.height / 2;
      var oldS = cs.base * cs.z;
      var px = (cx - cs.ox) / oldS, py = (cy - cs.oy) / oldS;
      cs.z = parseFloat(zoom.value);
      var newS = cs.base * cs.z;
      cs.ox = cx - px * newS; cs.oy = cy - py * newS;
      clampCrop(); drawCrop();
    });
    var drag = null;
    cv.addEventListener("pointerdown", function (e) { if (!cimg) return; drag = { x: e.clientX, y: e.clientY, ox: cs.ox, oy: cs.oy }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener("pointermove", function (e) {
      if (!drag) return;
      var k = cv.width / cv.getBoundingClientRect().width;
      cs.ox = drag.ox + (e.clientX - drag.x) * k;
      cs.oy = drag.oy + (e.clientY - drag.y) * k;
      clampCrop(); drawCrop();
    });
    cv.addEventListener("pointerup", function () { drag = null; });
    cv.addEventListener("pointercancel", function () { drag = null; });
    var fa = document.getElementById("f-apply");
    fa.addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = $(".msg", fa), btn = $("button[type=submit]", fa);
      if (!haveCrop) { msg.textContent = "Please choose a portrait photo."; return; }
      btn.disabled = true; msg.textContent = "Sending your application.";
      cv.toBlob(function (blob) {
      var fd = new FormData();
      fd.append("name", fa.elements.name.value);
      fd.append("photo", blob, "portrait.jpg");
      api("/api/apply", { method: "POST", body: fd }).then(function (d) {
        btn.disabled = false;
        if (d.ok) { msg.textContent = ""; render(); }
        else msg.textContent = d.error || "Something went wrong on our side. Try again in a moment.";
      }).catch(function () { btn.disabled = false; msg.textContent = "Something went wrong on our side. Try again in a moment."; });
      }, "image/jpeg", 0.92);
    });

    document.getElementById("reapply").addEventListener("click", function () { show(null, "v-apply"); sub.textContent = "Upload a new portrait to apply again."; });
    document.getElementById("signout").addEventListener("click", function () {
      api("/api/auth/logout", { method: "POST" }).then(function () { updateAcctLink(); render(); });
    });
    document.getElementById("dl-card").addEventListener("click", function () {
      var c = document.getElementById("card-canvas");
      c.toBlob(function (b) {
        var a = document.createElement("a");
        a.href = URL.createObjectURL(b);
        a.download = (currentCard ? currentCard.id : "zi-card") + ".png";
        document.body.appendChild(a); a.click(); a.remove();
      }, "image/png");
    });
    render();
  }

  function confirmThanks() {
    var id = new URLSearchParams(location.search).get("session_id");
    if (!id) return;
    fetch("/api/orders/confirm", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ session_id: id }) }).then(function (r) { return r.json(); }).then(function (d) {
      var el = document.getElementById("order-no");
      if (el && d.ok && d.number) { el.textContent = "Your order number is " + d.number + ". It is filed in your account."; el.hidden = false; }
    }).catch(function () {});
  }

  function initReset() {
    var f = document.getElementById("f-reset"), msg = $(".msg", f);
    var token = new URLSearchParams(location.search).get("token") || "";
    if (!token) msg.textContent = "This page needs the link from your reset email.";
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      api("/api/auth/reset", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: token, password: f.elements[0].value }) }).then(function (d) {
        if (d.ok) { msg.innerHTML = 'Password saved. <a href="/account/">Sign in</a>.'; f.reset(); }
        else msg.textContent = d.error || "Something went wrong on our side. Try again in a moment.";
      });
    });
  }

  function updateAcctLink() {
    var link = document.getElementById("acct-link");
    if (!link) return;
    api("/api/me").then(function (d) { var on = !!d.user; var tip = on ? "My account, " + (d.user.first || "") : "Sign in"; tip = tip.replace(/, $/, ""); link.setAttribute("aria-label", tip); link.setAttribute("data-tip", tip); link.classList.toggle("signed", on); var m = document.getElementById("acct-link-m"); if (m) m.textContent = on ? "My passport" : "Sign in"; }).catch(function () {});
  }

  function initAdmin() {
    var keyForm = document.getElementById("adm-key");
    var desk = document.getElementById("adm-desk");
    var list = document.getElementById("adm-list");
    var key = "";
    try { key = sessionStorage.getItem("zibura_adm") || ""; } catch (x) {}
    var status = "pending";
    function h() { return { "x-admin-key": key }; }
    function load() {
      fetch("/api/admin/applications?status=" + status, { headers: h() }).then(function (r) {
        if (r.status === 401) { desk.hidden = true; keyForm.hidden = false; $(".msg", keyForm).textContent = "That key was not accepted."; return null; }
        return r.json();
      }).then(function (d) {
        if (!d) return;
        keyForm.hidden = true; desk.hidden = false;
        list.innerHTML = "";
        if (!d.applications.length) { list.innerHTML = '<p class="small">Nothing here.</p>'; return; }
        d.applications.forEach(function (a) {
          var row = document.createElement("div");
          row.className = "adm-row";
          row.innerHTML = '<img alt="" width="140" height="180"><div><b></b><span class="small"></span><span class="small card-id"></span></div><div class="adm-act"></div>';
          $("b", row).textContent = a.name;
          $("span", row).textContent = a.first + " " + a.last + ", " + a.email + ", submitted " + a.submitted_at.slice(0, 10);
          $(".card-id", row).textContent = a.card_id ? "Card " + a.card_id : "";
          fetch("/api/admin/photo?id=" + a.id, { headers: h() }).then(function (r) { return r.blob(); }).then(function (b) { $("img", row).src = URL.createObjectURL(b); });
          var act = $(".adm-act", row);
          if (a.status !== "approved") {
            var ok = document.createElement("button"); ok.className = "btn"; ok.textContent = "Approve";
            ok.onclick = function () { decide(a.id, "approve"); };
            act.appendChild(ok);
          }
          if (a.status === "pending") {
            var no = document.createElement("button"); no.className = "btn line"; no.textContent = "Decline";
            no.onclick = function () { decide(a.id, "decline"); };
            act.appendChild(no);
          }
          list.appendChild(row);
        });
      });
    }
    function decide(id, decision) {
      fetch("/api/admin/decide", { method: "POST", headers: { "content-type": "application/json", "x-admin-key": key }, body: JSON.stringify({ id: id, decision: decision }) })
        .then(function (r) { return r.json(); }).then(function () { load(); });
    }
    keyForm.addEventListener("submit", function (e) {
      e.preventDefault();
      key = document.getElementById("adm-k").value;
      try { sessionStorage.setItem("zibura_adm", key); } catch (x) {}
      load();
    });
    $all(".tab[data-st]").forEach(function (t) {
      t.addEventListener("click", function () {
        status = t.getAttribute("data-st");
        $all(".tab[data-st]").forEach(function (x) { x.classList.toggle("on", x === t); });
        load();
      });
    });
    var rf = document.getElementById("adm-reset");
    rf.addEventListener("submit", function (e) {
      e.preventDefault();
      var m = $(".msg", rf);
      fetch("/api/admin/reset", { method: "POST", headers: { "content-type": "application/json", "x-admin-key": key }, body: JSON.stringify({ email: rf.elements.email.value, password: rf.elements.password.value }) })
        .then(function (r) { return r.json(); }).then(function (d) {
          m.textContent = d.ok ? "Password updated. Share it with the member privately." : (d.error || "Something went wrong.");
          if (d.ok) rf.reset();
        });
    });
    if (key) load();
  }

  /* The Style Compass quiz */
  function initQuiz() {
    var data = JSON.parse($("#quiz-data").textContent);
    var AX = data.axes, Q = data.questions, P = data.profiles;
    var axMax = AX.map(function () { return 0; });
    Q.forEach(function (q) { for (var a = 0; a < AX.length; a++) axMax[a] += Math.max.apply(null, q[1].map(function (x) { return Math.abs(x[1][a]); })); });
    var sums, step, answers;
    var box = $("#quiz"), res = $("#result"), title = $("#q-title"), opts = $("#q-opts");
    function start() {
      sums = AX.map(function () { return 0; }); answers = []; step = 0;
      res.hidden = true; box.hidden = false;
      show();
    }
    function show() {
      $("#q-step").textContent = "Question " + (step + 1) + " of " + Q.length;
      $("#q-fill").style.width = (step / Q.length * 100) + "%";
      title.textContent = Q[step][0];
      opts.innerHTML = "";
      Q[step][1].forEach(function (ans, i) {
        var b = document.createElement("button");
        b.type = "button"; b.textContent = ans[0];
        b.addEventListener("click", function () {
          ans[1].forEach(function (v, a) { sums[a] += v; });
          answers.push(i); step += 1;
          if (step < Q.length) { show(); title.focus(); } else finish();
        });
        opts.appendChild(b);
      });
    }
    function finish() {
      var z = sums.map(function (v, a) { return Math.max(-1, Math.min(1, v / (0.5 * axMax[a]))); });
      var ranked = P.map(function (p, i) {
        var d = Math.sqrt(p.v.reduce(function (t, x, a) { return t + Math.pow(x - z[a], 2); }, 0));
        return { i: i, d: d, pct: Math.max(1, Math.min(99, Math.round(100 * (1 - d / 3.0)))) };
      }).sort(function (x, y) { return x.d - y.d; });
      var best = P[ranked[0].i], second = P[ranked[1].i];
      var profile = {
        province: best.n, second: second.n, style: best.n,
        shares: ranked.slice(0, 3).map(function (r) { return { n: P[r.i].n, pct: r.pct }; }),
        axes: z.map(function (x) { return Math.round(x * 100) / 100; }),
        answers: answers.slice(), at: new Date().toISOString().slice(0, 10)
      };
      try { localStorage.setItem("zibura_province", best.n); localStorage.setItem("zibura_style", JSON.stringify(profile)); } catch (x) {}
      fetch("/api/profile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ province: best.n, style: profile }) }).catch(function () {});
      var swatches = best.palette.map(function (c) { return '<span class="r-sw" data-c="' + esc(c) + '"><i></i>' + esc(c) + "</span>"; }).join("");
      var meters = AX.map(function (a, i) {
        var pos = Math.round((z[i] + 1) / 2 * 100);
        return '<div class="r-bi"><span class="l">' + esc(a[1]) + '</span><div class="t"><i style="left:' + pos + '%"></i></div><span class="r">' + esc(a[2]) + "</span></div>";
      }).join("");
      var notes = [];
      AX.forEach(function (a, i) { if (Math.abs(z[i]) >= 0.3) notes.push({ w: Math.abs(z[i]), t: z[i] < 0 ? a[3] : a[4] }); });
      notes.sort(function (x, y) { return y.w - x.w; });
      notes = notes.slice(0, 4).map(function (n) { return n.t; });
      var picks = best.picks.map(function (slug) { return catalog.filter(function (c) { return c.slug === slug; })[0]; }).filter(Boolean);
      var sPick = catalog.filter(function (c) { return c.slug === second.picks[0] && best.picks.indexOf(c.slug) === -1; })[0] || catalog.filter(function (c) { return c.slug === second.picks[1]; })[0];
      box.hidden = true; res.hidden = false;
      res.innerHTML =
        '<div class="r-head"><p class="small">Your Style Compass</p><h2 class="display">' + esc(best.n) + '.</h2><p class="r-line">' + esc(best.line) + " " + esc(best.define) + '</p><p class="small">Match: ' + ranked[0].pct + "%. Also close to " + esc(second.n) + " (" + ranked[1].pct + "%).</p></div>" +
        '<div class="r-cols"><section><h3>Your eight dimensions</h3><div class="r-bis">' + meters + '</div></section>' +
        '<section><h3>What we noticed</h3><ul class="r-list">' + (notes.length ? notes : ["Your answers sit near the middle on every dimension, so your style moves easily between profiles."]).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + '</ul></section></div>' +
        '<div class="r-cols"><section><h3>Silhouette and fabric</h3><p class="prose"><b>Silhouette.</b> ' + esc(best.silhouette) + '</p><p class="prose"><b>Fabrics.</b> ' + esc(best.fabrics) + '</p></section>' +
        '<section><h3>Where and how</h3><p class="prose"><b>Moments.</b> ' + esc(best.moments) + '</p><p class="prose"><b>Shopping.</b> ' + esc(best.shopper) + "</p></section></div>" +
        '<div class="r-cols"><section><h3>Your palette</h3><div class="r-sws">' + swatches + '</div></section><section><h3>You probably love</h3><ul class="r-list">' + best.loves.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + '</ul></section></div>' +
        '<section class="r-stretch"><h3>Try something different</h3><p class="prose">' + esc(best.stretch) + "</p></section>" +
        '<section><h3>Matching products</h3><div class="r-picks" id="r-picks">' + picks.concat(sPick ? [sPick] : []).map(cardHtml).join("") + '</div></section>' +
        '<p class="small">A Style Compass describes your preferences. It does not affect your Zi Residency or Zitizenship, and you can retake it at any time.</p>' +
        '<div class="r-actions"><a class="btn" href="/shop/">Shop the collection</a><a class="btn line" href="/account/#style">Save to my account</a><button type="button" class="btn line" id="retake">Retake the Style Compass</button></div>';
      function paint() { Array.prototype.forEach.call(res.querySelectorAll(".r-sw"), function (el) { var c = window.__colors && window.__colors[el.getAttribute("data-c")]; if (c) el.firstChild.style.background = c; }); }
      if (window.__colors) paint(); else fetch("/colors.json").then(function (r) { return r.json(); }).then(function (m) { window.__colors = m; paint(); });
      $("#retake").addEventListener("click", start);
      applyPrices();
      openWaitlistLinks();
      res.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    start();
  }

  function init() {
    var page = document.body.getAttribute("data-page");
    initModal();
    initFx();
    initUx(); initMinistries(); initHeroSlides(); initScrollFx(); initSignalScenes(); initFounderReel();
    initSampleCards();
    var select = $("#currency");

    Promise.all([detectCurrency(), loadCatalog()]).then(function (res) {
      currency = res[0];
      if (select) select.value = currency;
      syncCur();
      updateCount();

      var rerender = null;
      if (page === "shop") {
        Promise.all([fetch("/taxonomy.json").then(function (r) { return r.json(); }), fetch("/colors.json").then(function (r) { return r.json(); })]).then(function (m) {
          initShop(m[0], m[1]);
          loadRatings();
        });
      }
      if (page === "piece") initPiece();
      if (page === "account") initAccount(); updateAcctLink();
      if (page === "admin") initAdmin();
      if (page === "reset") initReset();
      if (page === "placement") initQuiz();
      if (page !== "shop") loadRatings();
      if (page === "cart") rerender = initCart();
      if (page === "thanks") { setCart([]); confirmThanks(); }
      initWaitlist();
      initSubscribe();
      applyPrices();

      if (select) {
        select.addEventListener("change", function () {
          currency = select.value;
          save(CUR_KEY, currency);
          applyPrices();
          if (rerender) rerender();
          if (shopRefresh) shopRefresh();
        });
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
