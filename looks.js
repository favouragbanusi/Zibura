// Zi Looks: a wall of outfits in four depth rows. Drag to wander. Select a look to step closer.
(function () {
  var root = document.querySelector("[data-looks]");
  if (!root) return;
  var stage = root.querySelector("[data-lk-stage]"), rowsEl = root.querySelector("[data-lk-rows]"), mark = root.querySelector("[data-lk-mark]");
  var view = root.querySelector("[data-lk-view]"), label = root.querySelector("[data-lk-label]"), pos = root.querySelector("[data-lk-pos]");
  var cursor = root.querySelector("[data-lk-cursor]");
  var details = Array.prototype.slice.call(view.querySelectorAll(".lk-detail"));
  var names = window.LOOK_NAMES || [], N = details.length;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(pointer: fine)").matches;
  var FACTOR = { far: 0.35, back: 0.6, mid: 1, near: 1.7 };
  var rows = [], x = 0, y = 0, vx = 0, raf = 0, openIdx = -1, lastFocus = null, moved = false, dragging = false;

  // Each row is repeated three times so it loops without an edge.
  Array.prototype.forEach.call(rowsEl.querySelectorAll(".lk-row"), function (el) {
    var one = el.innerHTML;
    el.insertAdjacentHTML("beforeend", one.replace(/ tabindex="-1"/g, "").replace(/<button /g, '<button tabindex="-1" aria-hidden="true" ') + one.replace(/ tabindex="-1"/g, "").replace(/<button /g, '<button tabindex="-1" aria-hidden="true" '));
    rows.push({ el: el, f: FACTOR[el.getAttribute("data-lk-row")] || 1, p: 0 });
  });
  function measure() {
    rows.forEach(function (r) { r.p = r.el.scrollWidth / 3; });
    paint();
  }
  function paint() {
    rows.forEach(function (r) {
      if (!r.p) return;
      var t = (x * r.f) % r.p; if (t > 0) t -= r.p;
      r.el.style.transform = "translate3d(" + t.toFixed(1) + "px," + (y * r.f * 0.6).toFixed(1) + "px,0)";
    });
  }
  function loop() {
    if (!dragging && openIdx < 0) {
      x += vx; vx *= 0.94;
      if (Math.abs(vx) < 0.05) vx = 0;
      if (!reduce) x -= 0.22;
      y *= 0.9;
    }
    paint();
    raf = requestAnimationFrame(loop);
  }
  window.addEventListener("resize", measure);
  window.addEventListener("load", measure);

  // Drag with a mouse, a finger or a pen. Rows move at different speeds, which gives depth.
  var d = null, travel = 0;
  stage.addEventListener("pointerdown", function (e) {
    if (e.button > 0 || openIdx >= 0) return;
    d = { id: e.pointerId, x: e.clientX, y: e.clientY }; travel = 0; vx = 0; dragging = true; moved = false;
    stage.classList.add("grab");
  });
  stage.addEventListener("pointermove", function (e) {
    if (fine && cursor) { cursor.style.transform = "translate3d(" + e.clientX + "px," + e.clientY + "px,0)"; }
    if (!d || e.pointerId !== d.id) return;
    var dx = e.clientX - d.x, dy = e.clientY - d.y;
    travel += Math.abs(dx) + Math.abs(dy);
    if (travel > 6) { moved = true; stage.classList.add("moved"); if (!stage.hasPointerCapture(e.pointerId)) stage.setPointerCapture(e.pointerId); }
    x += dx; y = Math.max(-60, Math.min(60, y + dy * 0.4)); vx = dx;
    d.x = e.clientX; d.y = e.clientY;
  });
  function end(e) {
    if (!d || (e && e.pointerId !== d.id)) return;
    var wasClick = !moved;
    d = null; dragging = false; stage.classList.remove("grab");
    if (wasClick && e) {
      var f = document.elementFromPoint(e.clientX, e.clientY);
      f = f && f.closest && f.closest(".lk-f");
      if (f) openLook(Number(f.getAttribute("data-look")), f);
    }
  }
  stage.addEventListener("pointerup", end); stage.addEventListener("pointercancel", end);
  stage.addEventListener("wheel", function (e) { if (openIdx >= 0) return; e.preventDefault(); x -= (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY); stage.classList.add("moved"); }, { passive: false });
  stage.addEventListener("keydown", function (e) {
    var k = { ArrowLeft: 16, ArrowRight: -16 }[e.key];
    if (k) { e.preventDefault(); vx = k; stage.classList.add("moved"); }
  });
  stage.addEventListener("click", function (e) { var f = e.target.closest && e.target.closest(".lk-f"); if (f && e.detail === 0) openLook(Number(f.getAttribute("data-look")), f); });
  // The look name and a ring follow the pointer over a figure.
  var idle = label.textContent;
  stage.addEventListener("pointerover", function (e) {
    var f = e.target.closest && e.target.closest(".lk-f");
    if (f) { label.textContent = f.getAttribute("aria-label"); stage.classList.add("on-fig"); }
  });
  stage.addEventListener("pointerout", function (e) {
    var to = e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(".lk-f");
    if (!to) { label.textContent = idle; stage.classList.remove("on-fig"); }
  });

  // Step closer: the figure grows to the centre, the wall softens, the pieces slide in.
  function fig(i) { return details[i].querySelector(".lk-fig"); }
  function show(i) {
    details.forEach(function (el, k) { el.hidden = k !== i; });
    pos.textContent = (i + 1 < 10 ? "0" : "") + (i + 1) + " / " + N;
    view.querySelector("[data-lk-prev-name]").textContent = names[(i - 1 + N) % N] || "";
    view.querySelector("[data-lk-next-name]").textContent = names[(i + 1) % N] || "";
    pick(i, null);
    try { history.replaceState(null, "", "#look-" + (i + 1)); } catch (e) {}
  }
  function openLook(i, from) {
    lastFocus = from || document.activeElement;
    view.hidden = false; document.documentElement.classList.add("lk-lock"); root.classList.add("is-open");
    show(i); openIdx = i;
    requestAnimationFrame(function () {
      view.classList.add("on");
      var f = fig(i);
      if (from && !reduce && f.animate) {
        var a = from.getBoundingClientRect(), b = f.getBoundingClientRect();
        f.animate([{ transformOrigin: "0 0", transform: "translate(" + (a.left - b.left) + "px," + (a.top - b.top) + "px) scale(" + (a.width / b.width) + "," + (a.height / b.height) + ")", filter: "blur(2px)" }, { transformOrigin: "0 0", transform: "none", filter: "blur(0)" }], { duration: 800, easing: "cubic-bezier(.2,.8,.2,1)" });
      }
      var x1 = view.querySelector(".lk-x"); if (x1) x1.focus({ preventScroll: true });
    });
  }
  function closeLook() {
    if (openIdx < 0) return;
    var f = fig(openIdx);
    var done = function () {
      view.classList.remove("on", "closing"); view.hidden = true; document.documentElement.classList.remove("lk-lock"); root.classList.remove("is-open"); openIdx = -1;
      try { history.replaceState(null, "", location.pathname); } catch (e) {}
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    };
    view.classList.add("closing"); view.classList.remove("on");
    if (!reduce && f.animate) {
      var cx = innerWidth / 2, cy = innerHeight / 2, best = null, bd = 1e9;
      Array.prototype.forEach.call(rowsEl.querySelectorAll('.lk-f[data-look="' + openIdx + '"]'), function (n) { var r = n.getBoundingClientRect(), dd = Math.hypot(r.left + r.width / 2 - cx, r.top + r.height / 2 - cy); if (dd < bd && r.height > 40) { bd = dd; best = r; } });
      var b = f.getBoundingClientRect();
      if (best) {
        var an = f.animate([{ transformOrigin: "0 0", transform: "none" }, { transformOrigin: "0 0", transform: "translate(" + (best.left - b.left) + "px," + (best.top - b.top) + "px) scale(" + (best.width / b.width) + "," + (best.height / b.height) + ")" }], { duration: 520, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" });
        an.onfinish = function () { an.cancel(); done(); };
        return;
      }
    }
    setTimeout(done, reduce ? 0 : 300);
  }
  function step(dir) {
    var i = (openIdx + dir + N) % N; openIdx = i; show(i);
    var f = fig(i);
    if (f.animate && !reduce) f.animate([{ opacity: 0, transform: "translateX(" + (dir * 40) + "px)" }, { opacity: 1, transform: "none" }], { duration: 520, easing: "cubic-bezier(.2,.8,.2,1)" });
  }
  Array.prototype.forEach.call(view.querySelectorAll("[data-lk-close]"), function (b) { b.addEventListener("click", closeLook); });
  view.querySelector("[data-lk-prev]").addEventListener("click", function () { step(-1); });
  view.querySelector("[data-lk-next]").addEventListener("click", function () { step(1); });
  document.addEventListener("keydown", function (e) {
    if (openIdx < 0) return;
    if (e.key === "Escape") closeLook(); else if (e.key === "ArrowLeft") step(-1); else if (e.key === "ArrowRight") step(1);
    else if (e.key === "Tab") {
      var q = Array.prototype.slice.call(view.querySelectorAll("a[href], button")).filter(function (n) { return n.offsetParent !== null; });
      if (!q.length) return; var a = q[0], z = q[q.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  });
  // The piece list drives the large piece photo.
  function pick(i, slug) {
    var sec = details[i];
    var items = sec.querySelectorAll(".lk-pieces li"), want = slug || (items[0] && items[0].getAttribute("data-piece"));
    Array.prototype.forEach.call(items, function (n) { n.classList.toggle("on", n.getAttribute("data-piece") === want); });
    Array.prototype.forEach.call(sec.querySelectorAll(".lk-bigimg"), function (n) { n.classList.toggle("on", n.getAttribute("data-piece") === want); });
  }
  details.forEach(function (sec, i) {
    Array.prototype.forEach.call(sec.querySelectorAll(".lk-pieces li"), function (li) {
      var s = li.getAttribute("data-piece");
      li.addEventListener("mouseenter", function () { pick(i, s); }); li.addEventListener("focusin", function () { pick(i, s); });
    });
  });
  // A link such as /looks/#look-4 opens that look.
  function fromHash() { var m = /^#look-(\d+)$/.exec(location.hash); if (m && Number(m[1]) >= 1 && Number(m[1]) <= N) openLook(Number(m[1]) - 1, null); }
  measure(); fromHash(); raf = requestAnimationFrame(loop);
})();
