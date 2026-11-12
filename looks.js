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
  var tx = 0, ty = 0, cx = 0, cy = 0; // pointer position (-1 to 1) and its eased copy
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
    var W = stage.clientWidth || 1;
    rows.forEach(function (r) {
      if (!r.p) return;
      var t = (x * r.f) % r.p; if (t > 0) t -= r.p;
      // Depth: pointer forward (up) brings the near rows toward you and sends the far rows back. Pointer back (down) does the reverse.
      var depth = (r.f - 0.95) * -cy * 0.16;
      var sc = reduce ? 1 : 1 + depth;
      var rot = reduce ? 0 : cx * (r.f - 0.9) * 2.2;
      r.el.style.transformOrigin = (W / 2 - t).toFixed(0) + "px 50%";
      r.el.style.transform = "translate3d(" + t.toFixed(1) + "px," + (y * r.f * 0.6).toFixed(1) + "px,0) rotateY(" + rot.toFixed(2) + "deg) scale(" + sc.toFixed(4) + ")";
    });
  }
  function loop() {
    if (!dragging && openIdx < 0) {
      x += vx; vx *= 0.94;
      if (Math.abs(vx) < 0.05) vx = 0;
      if (!reduce) x -= 0.22;
      y *= 0.9;
    }
    cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
    // Hovering drifts the wall toward the side the pointer is on.
    if (fine && openIdx < 0 && !dragging && !reduce) x -= cx * 2.4;
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
    if (fine || (d && e.pointerId === d.id)) {
      var bb = stage.getBoundingClientRect();
      tx = Math.max(-1, Math.min(1, ((e.clientX - bb.left) / bb.width - 0.5) * 2));
      ty = Math.max(-1, Math.min(1, ((e.clientY - bb.top) / bb.height - 0.5) * 2));
    }
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
  stage.addEventListener("pointerleave", function () { if (!d) { tx = 0; ty = 0; } });
  stage.addEventListener("pointerup", function () { if (!fine) { tx = 0; ty = 0; } });
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
    details.forEach(function (d) { var sm = d.querySelector(".lk-sum"); if (sm) { sm.hidden = true; d.classList.remove("sum-open"); } });
    paintTotals();
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
    if (e.key === "Escape") { var os = details[openIdx].querySelector(".lk-sum:not([hidden])"); if (os) closeSummary(details[openIdx]); else closeLook(); } else if (e.key === "ArrowLeft" && !/^(SELECT|INPUT)$/.test(e.target.tagName)) step(-1); else if (e.key === "ArrowRight" && !/^(SELECT|INPUT)$/.test(e.target.tagName)) step(1);
    else if (e.key === "Tab") {
      var q = Array.prototype.slice.call(view.querySelectorAll("a[href], button, select")).filter(function (n) { return n.offsetParent !== null; });
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
  // Buying inside a look: add a single piece, or review and add the whole look.
  function Z() { return window.ZiCart; }
  function rowInfo(li) {
    var col = li.querySelector(".lk-col"), size = li.querySelector(".lk-size");
    return { li: li, slug: li.getAttribute("data-piece"), name: li.querySelector(".lk-meta b").textContent, color: col ? col.value : "", size: size ? size.value : "", colSel: col, sizeSel: size };
  }
  function totalFor(sec) {
    var z = Z(); if (!z || !z.ready()) return "";
    var sum = 0; Array.prototype.forEach.call(sec.querySelectorAll(".lk-pieces li"), function (li) { sum += z.price(li.getAttribute("data-piece")) || 0; });
    return z.money(sum);
  }
  function paintTotals() {
    details.forEach(function (sec) { var t = sec.querySelector("[data-lk-total]"); if (t) t.textContent = totalFor(sec); });
    var open = openIdx >= 0 && details[openIdx].querySelector(".lk-sum:not([hidden])");
    if (open) paintSummary(details[openIdx]);
  }
  document.addEventListener("zibura:prices", paintTotals);
  window.addEventListener("load", paintTotals);
  setTimeout(paintTotals, 600);
  function flash(li, text, bad) {
    var m = li.querySelector(".lk-msg"); if (!m) return;
    m.textContent = text; m.classList.toggle("bad", !!bad);
    clearTimeout(m._t); if (!bad) m._t = setTimeout(function () { m.textContent = ""; }, 4000);
  }
  details.forEach(function (sec) {
    Array.prototype.forEach.call(sec.querySelectorAll(".lk-pieces li"), function (li) {
      li.querySelector(".lk-add").addEventListener("click", function () {
        var z = Z(), r = rowInfo(li);
        if (!z) return;
        if (r.sizeSel && !r.size) { flash(li, "Choose a size for " + r.name + ".", true); r.sizeSel.classList.add("bad"); r.sizeSel.focus(); return; }
        if (r.sizeSel) r.sizeSel.classList.remove("bad");
        z.add([{ slug: r.slug, color: r.color, size: r.size, qty: 1 }]);
        z.fly(li.querySelector(".lk-th img"));
        var btn = this; btn.textContent = "Added"; btn.classList.add("ok");
        setTimeout(function () { btn.textContent = btn.getAttribute("data-label") || "Add to cart"; btn.classList.remove("ok"); }, 1800);
        flash(li, r.name + ", " + r.color + (r.size ? ", " + r.size : "") + " is in your cart.");
      });
      li.querySelector(".lk-add").setAttribute("data-label", li.querySelector(".lk-add").textContent);
      var ss = li.querySelector(".lk-size"); if (ss) ss.addEventListener("change", function () { this.classList.remove("bad"); flash(li, ""); });
    });
    var sum = sec.querySelector(".lk-sum"), list = sec.querySelector("[data-lk-sumlist]"), msg = sec.querySelector("[data-lk-summsg]");
    var done = sec.querySelector(".lk-sumdone"), btns = sec.querySelector(".lk-sumbtns");
    sec.querySelector("[data-lk-sum-open]").addEventListener("click", function () {
      done.hidden = true; btns.hidden = false; msg.textContent = "";
      sum.hidden = false; sec.classList.add("sum-open"); paintSummary(sec);
      var f = sum.querySelector("select, button"); if (f) f.focus({ preventScroll: true });
      sum.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
    });
    Array.prototype.forEach.call(sec.querySelectorAll("[data-lk-sum-back]"), function (b) { b.addEventListener("click", function () { closeSummary(sec); }); });
    sec.querySelector("[data-lk-sum-add]").addEventListener("click", function () {
      var z = Z(); if (!z) return;
      var rows = Array.prototype.map.call(sec.querySelectorAll(".lk-pieces li"), rowInfo);
      var missing = rows.filter(function (r) { return r.sizeSel && !r.size; });
      if (missing.length) {
        msg.textContent = "Choose a size for " + missing.map(function (r) { return r.name; }).join(", ") + ".";
        msg.classList.add("bad"); paintSummary(sec);
        var bad = list.querySelector("select.bad"); if (bad) bad.focus();
        return;
      }
      z.add(rows.map(function (r) { return { slug: r.slug, color: r.color, size: r.size, qty: 1 }; }));
      z.fly(sec.querySelector(".lk-fig img"));
      msg.textContent = ""; btns.hidden = true; done.hidden = false;
      var a = done.querySelector("a"); if (a) a.focus({ preventScroll: true });
    });
  });
  function closeSummary(sec) {
    var sum = sec.querySelector(".lk-sum"); sum.hidden = true; sec.classList.remove("sum-open");
    var o = sec.querySelector("[data-lk-sum-open]"); if (o) o.focus({ preventScroll: true });
  }
  function paintSummary(sec) {
    var z = Z(), list = sec.querySelector("[data-lk-sumlist]"), msg = sec.querySelector("[data-lk-summsg]"), tot = sec.querySelector("[data-lk-sumtotal]");
    var rows = Array.prototype.map.call(sec.querySelectorAll(".lk-pieces li"), rowInfo);
    var keepFocus = document.activeElement && list.contains(document.activeElement) ? document.activeElement.getAttribute("data-k") : null;
    list.innerHTML = "";
    rows.forEach(function (r, k) {
      var li = document.createElement("li");
      var th = r.li.querySelector(".lk-th"); var thumb = document.createElement("span"); thumb.className = "lk-th"; thumb.innerHTML = th ? th.innerHTML : "";
      var info = document.createElement("span"); info.className = "lk-sumi";
      var nm = document.createElement("b"); nm.textContent = r.name; info.appendChild(nm);
      var pr = document.createElement("em"); pr.textContent = z && z.ready() ? z.money(z.price(r.slug)) : ""; info.appendChild(pr);
      var sels = document.createElement("span"); sels.className = "lk-sumsel";
      [["colSel", "col"], ["sizeSel", "size"]].forEach(function (pair) {
        var src = r[pair[0]]; if (!src) return;
        var c = src.cloneNode(true); c.value = src.value; c.className = src.className.replace(/\bbad\b/, "").trim(); c.setAttribute("data-k", k + pair[1]);
        if (pair[1] === "size" && !src.value && msg.classList.contains("bad")) c.classList.add("bad");
        c.addEventListener("change", function () { src.value = c.value; c.classList.remove("bad"); msg.textContent = ""; msg.classList.remove("bad"); });
        sels.appendChild(c);
      });
      li.appendChild(thumb); li.appendChild(info); li.appendChild(sels); list.appendChild(li);
    });
    tot.textContent = totalFor(sec);
    if (keepFocus) { var f = list.querySelector('[data-k="' + keepFocus + '"]'); if (f) f.focus({ preventScroll: true }); }
  }

  // A link such as /looks/#look-4 opens that look.
  function fromHash() { var m = /^#look-(\d+)$/.exec(location.hash); if (m && Number(m[1]) >= 1 && Number(m[1]) <= N) openLook(Number(m[1]) - 1, null); }
  measure(); fromHash(); raf = requestAnimationFrame(loop);
})();
