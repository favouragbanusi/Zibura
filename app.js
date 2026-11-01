(function () {
  var CURRENCIES = ["CAD", "USD", "GBP", "NGN"];
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
        currency: currency,
        minimumFractionDigits: amount % 1 === 0 ? 0 : 2
      }).format(amount);
    } catch (e) {
      return currency + " " + amount;
    }
  }

  function getCart() { return load(CART_KEY, []); }
  function setCart(cart) { save(CART_KEY, cart); updateCount(); }
  function updateCount() {
    var n = getCart().reduce(function (sum, l) { return sum + l.qty; }, 0);
    var el = $("#cart-count");
    if (el) el.textContent = n;
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
    return '<a class="card" href="/piece/' + esc(p.slug) + '/">' +
      '<div class="plate"></div>' +
      '<div class="info"><span class="nm">' + esc(p.name) + '</span>' +
      '<span class="price" data-price-for="' + esc(p.slug) + '"></span>' +
      '<span class="cat">' + esc(p.type) + '</span>' +
      '<span class="rate" data-rating-for="' + esc(p.slug) + '"></span></div></a>';
  }

  /* Ratings shown on cards and Piece pages */
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

    var st = { audience: "", category: "", type: "", colors: [], sizes: [], min: "", max: "", sort: "new", q: "" };
    var params = new URLSearchParams(location.search);
    st.audience = params.get("audience") || "";
    st.category = params.get("category") || "";
    st.type = params.get("type") || "";
    st.colors = (params.get("color") || "").split(",").filter(Boolean);
    st.sizes = (params.get("size") || "").split(",").filter(Boolean);
    st.min = params.get("min") || "";
    st.max = params.get("max") || "";
    st.sort = params.get("sort") || "new";
    st.q = params.get("q") || "";
    sortSel.value = st.sort;

    var allColors = uniq([].concat.apply([], catalog.map(function (p) { return p.colors; }))).filter(function (c) { return colorMap[c]; });
    var allSizes = uniq([].concat.apply([], catalog.map(function (p) { return p.sizes; }))).sort(function (a, b) { return sizeRank(a) - sizeRank(b); });

    function sync() {
      var q = new URLSearchParams();
      if (st.audience) q.set("audience", st.audience);
      if (st.category) q.set("category", st.category);
      if (st.type) q.set("type", st.type);
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
      if (st.audience && p.audience !== st.audience && p.audience !== "Everyone") return false;
      if (st.category && p.category !== st.category) return false;
      if (st.type && p.type !== st.type) return false;
      if (st.colors.length && !p.colors.some(function (c) { return st.colors.indexOf(c) !== -1; })) return false;
      if (st.sizes.length && !p.sizes.some(function (s) { return st.sizes.indexOf(s) !== -1; })) return false;
      var price = p.prices[currency];
      if (st.min !== "" && price < parseFloat(st.min)) return false;
      if (st.max !== "" && price > parseFloat(st.max)) return false;
      if (st.q) {
        var hay = (p.name + " " + p.category + " " + p.type + " " + p.audience + " " + p.colors.join(" ") + " " + p.description).toLowerCase();
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

    function renderFacets() {
      var h = "";
      h += '<div class="facet"><div class="search"><input type="search" id="f-q" placeholder="Search Pieces" value="' + esc(st.q) + '" aria-label="Search Pieces"></div></div>';
      h += '<div class="facet"><h3>Shop for</h3>';
      ["", "Women", "Men", "Everyone"].forEach(function (a) {
        h += '<button type="button" class="opt' + (st.audience === a ? " on" : "") + '" data-aud="' + a + '">' + (a || "All") + "</button>";
      });
      h += "</div>";
      h += '<div class="facet"><h3>Category</h3>';
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
      h += "</div>";
      h += '<div class="facet"><h3>Color</h3><div class="row">';
      allColors.forEach(function (c) {
        h += '<button type="button" class="sw' + (st.colors.indexOf(c) !== -1 ? " on" : "") + '" data-color="' + esc(c) + '" style="background:' + colorMap[c] + '" title="' + esc(c) + '" aria-label="' + esc(c) + '" aria-pressed="' + (st.colors.indexOf(c) !== -1) + '"></button>';
      });
      h += "</div></div>";
      h += '<div class="facet"><h3>Size</h3><div class="row">';
      allSizes.forEach(function (s) {
        h += '<button type="button" class="pill' + (st.sizes.indexOf(s) !== -1 ? " on" : "") + '" data-size="' + esc(s) + '" aria-pressed="' + (st.sizes.indexOf(s) !== -1) + '">' + esc(s) + "</button>";
      });
      h += "</div></div>";
      h += '<div class="facet"><h3>Price <span>' + esc(currency) + '</span></h3><div class="price-row"><input type="number" min="0" inputmode="numeric" id="f-min" placeholder="Min" value="' + esc(st.min) + '" aria-label="Minimum price"><span>to</span><input type="number" min="0" inputmode="numeric" id="f-max" placeholder="Max" value="' + esc(st.max) + '" aria-label="Maximum price"></div></div>';
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
      if (st.min || st.max) chip((st.min || "0") + " to " + (st.max || "any") + " " + currency, "price");
      if (st.q) chip("“" + st.q + "”", "q");
      if (h) h += '<button type="button" class="chip clear" data-clear="all">Clear all</button>';
      chips.innerHTML = h;
    }

    function render() {
      var list = sorted(catalog.filter(matches));
      count.textContent = list.length + (list.length === 1 ? " Piece" : " Pieces");
      grid.innerHTML = list.length ? list.map(cardHtml).join("") : '<p class="grid-empty">Nothing matches those filters yet. Loosen one, or clear them all.</p>';
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
      if (k === "all") { st.audience = st.category = st.type = st.min = st.max = st.q = ""; st.colors = []; st.sizes = []; }
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

  /* Piece page */
  function initPiece() {
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
      var size = form.elements.size.value;
      if (!color || !size) { msg.textContent = "Choose a color and a size."; return; }
      var cart = getCart();
      var found = false;
      cart.forEach(function (l) {
        if (l.slug === slug && l.color === color && l.size === size) { l.qty = Math.min(l.qty + 1, 10); found = true; }
      });
      if (!found) cart.push({ slug: slug, color: color, size: size, qty: 1 });
      setCart(cart);
      msg.innerHTML = 'In your cart. <a href="/cart/">View cart</a>';
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
          if (d.ok) { rform.reset(); rmsg.textContent = "Thank you. Your review is live."; load(); }
          else { rmsg.textContent = d.error || "Something went wrong. Please try again."; }
          btn.disabled = false;
        })
        .catch(function () { rmsg.textContent = "Something went wrong. Please try again."; btn.disabled = false; });
    });
  }

  /* Cart page */
  function initCart() {
    var box = $("#cart");
    var msg = $("#cart-msg");

    function render() {
      var cart = getCart().filter(function (l) { return bySlug(l.slug); });
      if (!cart.length) {
        box.innerHTML = '<p class="empty">Your cart is waiting for its first Piece. <a href="/shop/">Start in the shop</a>.</p>';
        return;
      }
      var total = 0;
      var html = cart.map(function (l, i) {
        var p = bySlug(l.slug);
        var line = p.prices[currency] * l.qty;
        total += line;
        return '<div class="cart-line">' +
          '<div><a class="nm" href="/piece/' + esc(p.slug) + '/">' + esc(p.name) + '</a>' +
          '<div class="opt">' + esc(l.color) + ', ' + esc(l.size) + '</div>' +
          '<div class="qty">' +
          '<button type="button" class="step" data-act="dec" data-i="' + i + '" aria-label="Fewer">-</button>' +
          '<span class="num">' + l.qty + '</span>' +
          '<button type="button" class="step" data-act="inc" data-i="' + i + '" aria-label="More">+</button>' +
          '<button type="button" class="remove" data-act="rm" data-i="' + i + '">Remove</button></div></div>' +
          '<div class="amount">' + money(line) + '</div></div>';
      }).join("");
      html += '<div class="cart-total"><span>Subtotal</span><strong>' + money(total) + '</strong></div>' +
        '<button type="button" class="btn" id="checkout">Checkout</button>' +
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
        msg.textContent = "Opening secure checkout.";
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
            msg.textContent = "Checkout could not start. Please try again.";
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
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var data = {
          first: form.elements.first.value,
          last: form.elements.last.value,
          email: form.elements.email.value,
          country: form.elements.country.value,
          city: form.elements.city.value,
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
              try { localStorage.setItem("zibura_joined", "1"); } catch (x) {}
              msg.textContent = "You are on the list. Signal I will find you first.";
            } else {
              msg.textContent = d.error || "Something went wrong. Please try again.";
              btn.disabled = false;
            }
          })
          .catch(function () { msg.textContent = "Something went wrong. Please try again."; btn.disabled = false; });
      });
    });
  }

  function initModal() {
    var modal = $("#wl-modal");
    if (!modal || !modal.showModal) return;
    function open() { if (!modal.open) modal.showModal(); }
    function close() { modal.close(); try { sessionStorage.setItem("zibura_wl_seen", "1"); } catch (x) {} }
    $all("[data-open-waitlist]").forEach(function (a) {
      a.addEventListener("click", function (e) { e.preventDefault(); open(); });
    });
    $all("[data-close-waitlist]").forEach(function (b) { b.addEventListener("click", close); });
    modal.addEventListener("click", function (e) { if (e.target === modal) close(); });
    if (document.body.getAttribute("data-page") === "home") {
      var seen = false;
      try { seen = sessionStorage.getItem("zibura_wl_seen") === "1" || localStorage.getItem("zibura_joined") === "1"; } catch (x) {}
      if (!seen) setTimeout(open, 1800);
    }
  }

  /* Interaction: motion that answers the visitor */
  function initFx() {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Scroll reveal
    var items = $all("[data-reveal]");
    if ("IntersectionObserver" in window && !reduce) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
      }, { threshold: 0.12 });
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
    var sw = $("[data-scrollwords]");
    var swords = [];
    if (sw) {
      var txt = sw.textContent.trim().split(/\s+/);
      sw.innerHTML = txt.map(function (w) { return '<span class="sw">' + esc(w) + "</span>"; }).join(" ");
      swords = $all(".sw", sw);
    }
    function lit() {
      if (!swords.length) return;
      var r = sw.getBoundingClientRect();
      var vh = window.innerHeight;
      var p = (vh * 0.85 - r.top) / (r.height + vh * 0.35);
      p = Math.max(0, Math.min(1, p));
      var n = Math.round(p * swords.length);
      swords.forEach(function (s, i) { s.classList.toggle("on", i < n); });
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

  function init() {
    var page = document.body.getAttribute("data-page");
    initModal();
    initFx();
    var select = $("#currency");

    Promise.all([detectCurrency(), loadCatalog()]).then(function (res) {
      currency = res[0];
      if (select) select.value = currency;
      updateCount();

      var rerender = null;
      if (page === "shop") {
        Promise.all([fetch("/taxonomy.json").then(function (r) { return r.json(); }), fetch("/colors.json").then(function (r) { return r.json(); })]).then(function (m) {
          initShop(m[0], m[1]);
          loadRatings();
        });
      }
      if (page === "piece") initPiece();
      if (page !== "shop") loadRatings();
      if (page === "cart") rerender = initCart();
      if (page === "thanks") setCart([]);
      initWaitlist();
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
