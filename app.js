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

  function drawCard(canvas, card) {
    var NAVY = "#111c44";
    return Promise.all([
      document.fonts.load('600 52px "Lexend Exa"'),
      document.fonts.load('400 17px "Lexend Exa"'),
      document.fonts.load('700 17px "Public Sans"'),
      document.fonts.load('400 26px "Public Sans"'),
      document.fonts.load('34px "Caveat"')
    ]).catch(function () {}).then(function () {
      return Promise.all([
        loadImg("/assets/zi-card-bg.png"),
        loadImg("/assets/logo-icon-navy.png"),
        loadImg("/assets/zi-card-seal.png"),
        loadImg("/api/photo?t=" + Date.now()).catch(function () { return null; })
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
      ctx.textBaseline = "top";
      function text(t, x, y, font, spacing) {
        ctx.font = font;
        if ("letterSpacing" in ctx) ctx.letterSpacing = spacing || "0px";
        ctx.fillText(t, x, y);
      }
      text("ZI CARD", 56, 66, '600 52px "Lexend Exa", sans-serif', "1px");
      text("YOUR EXPRESSION, YOUR WORLD.", 56, 120, '400 13.5px "Lexend Exa", sans-serif', "1.4px");
      ctx.drawImage(im[1], 614, 74, 52, 52 * im[1].height / im[1].width);
      text("ISSUED BY ZI REPUBLIC", 681, 80, '400 17px "Lexend Exa", sans-serif', "2px");
      text("MINISTRY OF ZI INTERIOR", 681, 107, '400 17px "Lexend Exa", sans-serif', "2px");
      ctx.save();
      rrect(ctx, 55, 187, 281, 362, 24);
      ctx.clip();
      ctx.fillStyle = "#d2eaff";
      ctx.fillRect(55, 187, 281, 362);
      if (im[3]) cover(ctx, im[3], 55, 187, 281, 362);
      ctx.restore();
      ctx.fillStyle = NAVY;
      var rows = [
        ["NAME", card.name, 187, 394, 482],
        ["ID NUMBER", card.id, 301, 394, 482],
        ["STATUS", card.status, 414, 394, 482],
        ["ISSUED", card.issued, 529, 394, 214],
        ["VALIDITY", card.validity, 529, 661, 219]
      ];
      rows.forEach(function (r) {
        var labX = r[3] - 4, labY = r[2];
        text(r[0], labX, labY, '700 17px "Public Sans", sans-serif');
        var boxY = r[2] + 26;
        ctx.save();
        ctx.fillStyle = "rgba(255,255,255,0.62)";
        rrect(ctx, r[3], boxY, r[4], 56, 10);
        ctx.fill();
        ctx.restore();
        var size = 26;
        ctx.font = size + 'px "Public Sans", sans-serif';
        while (ctx.measureText(r[1]).width > r[4] - 20 && size > 12) { size -= 1; ctx.font = size + 'px "Public Sans", sans-serif'; }
        ctx.textBaseline = "middle";
        ctx.fillText(r[1], r[3] + 7, boxY + 29);
        ctx.textBaseline = "top";
      });
      ctx.fillRect(951, 196, 1, 320);
      ctx.save();
      ctx.translate(951, 372);
      ctx.rotate(Math.PI / 2);
      ctx.textBaseline = "middle";
      text("ZI REPUBLIC", 0, 0, '400 17px "Lexend Exa", sans-serif', "2.4px");
      ctx.restore();
      if (card.title) {
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        var ts = 34;
        ctx.font = ts + 'px "Caveat", cursive';
        while (ctx.measureText(card.title).width > 270 && ts > 14) { ts -= 1; ctx.font = ts + 'px "Caveat", cursive'; }
        ctx.fillText(card.title, 195.5, 580);
        ctx.restore();
      }
      ctx.drawImage(im[2], 912, 540, 76, 76 * im[2].height / im[2].width);
      ctx.restore();
    });
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
        if (!d.user) {
          out.hidden = true;
          show(null, "v-auth");
          return;
        }
        out.hidden = false;
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
          sub.textContent = "Application received.";
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
          else msg.textContent = d.error || "Something went wrong. Please try again.";
        }).catch(function () { btn.disabled = false; msg.textContent = "Something went wrong. Please try again."; });
      });
    }
    authForm("f-signup", "/api/auth/signup");
    authForm("f-login", "/api/auth/login");

    var photo = document.getElementById("a-photo");
    var prev = document.getElementById("a-prev");
    var blob = null;
    photo.addEventListener("change", function () {
      blob = null;
      if (!photo.files[0]) { prev.hidden = true; return; }
      prepPhoto(photo.files[0]).then(function (b) {
        blob = b;
        $("img", prev).src = URL.createObjectURL(b);
        prev.hidden = false;
      }).catch(function () { prev.hidden = true; $(".msg", document.getElementById("f-apply")).textContent = "That photo could not be read. Please choose a JPG, PNG, or WebP image."; });
    });
    var fa = document.getElementById("f-apply");
    fa.addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = $(".msg", fa), btn = $("button[type=submit]", fa);
      if (!blob) { msg.textContent = "Please choose a portrait photo."; return; }
      var fd = new FormData();
      fd.append("name", fa.elements.name.value);
      fd.append("photo", blob, "portrait.jpg");
      btn.disabled = true; msg.textContent = "Sending your application.";
      api("/api/apply", { method: "POST", body: fd }).then(function (d) {
        btn.disabled = false;
        if (d.ok) { msg.textContent = ""; render(); }
        else msg.textContent = d.error || "Something went wrong. Please try again.";
      }).catch(function () { btn.disabled = false; msg.textContent = "Something went wrong. Please try again."; });
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

  function updateAcctLink() {
    var link = document.getElementById("acct-link");
    if (!link) return;
    api("/api/me").then(function (d) { link.textContent = d.user ? "My account" : "Sign in"; }).catch(function () {});
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
      if (page === "account") initAccount(); else updateAcctLink();
      if (page === "admin") initAdmin();
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
