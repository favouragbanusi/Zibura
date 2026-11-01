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
      '<div class="ph">' + esc(p.name) + '</div>' +
      '<p class="name">' + esc(p.name) + '</p>' +
      '<span class="meta">' + esc(p.category) + '</span>' +
      '<span class="meta price" data-price-for="' + esc(p.slug) + '"></span>' +
      '</a>';
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

    function render() {
      var q = search.value.trim().toLowerCase();
      var list = catalog.filter(function (p) {
        var okCat = active === "All" || p.category === active;
        var okQ = !q || (p.name + " " + p.category + " " + p.arc).toLowerCase().indexOf(q) !== -1;
        return okCat && okQ;
      });
      grid.innerHTML = list.length ? list.map(cardHtml).join("") : '<p class="empty">No Pieces match that search.</p>';
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
      msg.innerHTML = 'Added to your cart. <a href="/cart/">View cart</a>';
    });
  }

  /* Cart page */
  function initCart() {
    var box = $("#cart");
    var msg = $("#cart-msg");

    function render() {
      var cart = getCart().filter(function (l) { return bySlug(l.slug); });
      if (!cart.length) {
        box.innerHTML = '<p class="empty">Your cart is empty. <a href="/shop/">Browse the Pieces</a>.</p>';
        return;
      }
      var total = 0;
      var html = cart.map(function (l, i) {
        var p = bySlug(l.slug);
        var line = p.prices[currency] * l.qty;
        total += line;
        return '<div class="cart-line">' +
          '<div><a href="/piece/' + esc(p.slug) + '/">' + esc(p.name) + '</a>' +
          '<div class="meta">' + esc(l.color) + ', ' + esc(l.size) + '</div>' +
          '<div class="qty"><button type="button" data-act="dec" data-i="' + i + '" aria-label="Fewer">-</button>' +
          '<span>' + l.qty + '</span>' +
          '<button type="button" data-act="inc" data-i="' + i + '" aria-label="More">+</button>' +
          '<button type="button" class="remove" data-act="rm" data-i="' + i + '">Remove</button></div></div>' +
          '<div>' + money(line) + '</div></div>';
      }).join("");
      html += '<div class="cart-total"><span>Subtotal</span><span>' + money(total) + '</span></div>' +
        '<button type="button" class="btn" id="checkout">Checkout</button>';
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

    box.rerender = render;
    render();
    return render;
  }

  function init() {
    var page = document.body.getAttribute("data-page");
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
