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
      '<div class="plate"><img class="mark" src="/assets/logo-icon-navy.png" alt="" width="434" height="436"></div>' +
      '<div class="info"><span class="nm">' + esc(p.name) + '</span>' +
      '<span class="price" data-price-for="' + esc(p.slug) + '"></span>' +
      '<span class="cat">' + esc(p.category) + '</span></div></a>';
  }

  /* Shop page */
  function initShop() {
    var grid = $("#grid");
    var filters = $("#filters");
    var search = $("#search");
    var params = new URLSearchParams(location.search);
    var active = params.get("category") || "All";
    var cats = ["All"];
    catalog.forEach(function (p) { if (cats.indexOf(p.category) === -1) cats.push(p.category); });
    if (cats.indexOf(active) === -1) active = "All";

    function render() {
      var q = search.value.trim().toLowerCase();
      var list = catalog.filter(function (p) {
        var okCat = active === "All" || p.category === active;
        var okQ = !q || (p.name + " " + p.category + " " + p.arc).toLowerCase().indexOf(q) !== -1;
        return okCat && okQ;
      });
      grid.innerHTML = list.length
        ? list.map(cardHtml).join("")
        : '<p class="empty">Nothing matches that search yet. Try another word, or choose All.</p>';
      applyPrices();
    }

    function renderFilters() {
      $all("button", filters).forEach(function (b) { b.remove(); });
      cats.forEach(function (c) {
        var b = document.createElement("button");
        b.type = "button";
        b.textContent = c;
        b.setAttribute("aria-pressed", c === active ? "true" : "false");
        b.addEventListener("click", function () { active = c; renderFilters(); render(); });
        filters.insertBefore(b, search);
      });
    }

    search.addEventListener("input", render);
    renderFilters();
    render();
  }

  /* Piece page */
  function initPiece() {
    var main = $("[data-slug]");
    var slug = main.getAttribute("data-slug");
    var form = $("#add-form");
    var msg = $("#msg");
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
      if (page === "shop") initShop();
      if (page === "piece") initPiece();
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
        });
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
