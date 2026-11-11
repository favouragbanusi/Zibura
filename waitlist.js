// Waitlist page: scroll-driven zoom gallery, email capture and the stepped form dialog.
(function () {
  var zoom = document.querySelector("[data-mu-zoom]");
  if (!zoom) return;
  var root = document.querySelector(".mu");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var target = 0, cur = 0, raf = 0;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function measure() {
    var r = zoom.getBoundingClientRect();
    var span = zoom.offsetHeight - window.innerHeight;
    target = span > 0 ? clamp(-r.top / span, 0, 1) : 1;
  }
  function paint() {
    root.style.setProperty("--p", cur.toFixed(4));
    var tag = clamp((cur - 0.5) / 0.25, 0, 1), form = clamp((cur - 0.78) / 0.2, 0, 1);
    root.style.setProperty("--tag", tag.toFixed(3));
    root.style.setProperty("--form", form.toFixed(3));
    zoom.classList.toggle("is-end", form > 0.6);
  }
  function loop() {
    cur += (target - cur) * (reduce ? 1 : 0.14);
    if (Math.abs(target - cur) < 0.0004) cur = target;
    paint();
    raf = Math.abs(target - cur) > 0 ? requestAnimationFrame(loop) : 0;
  }
  function onScroll() { measure(); if (!raf) raf = requestAnimationFrame(loop); }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  window.addEventListener("load", onScroll);
  onScroll();

  // The two Join buttons and the arrow glide to the end of the zoom, where the email field waits.
  function endTop() { return zoom.getBoundingClientRect().top + window.pageYOffset + zoom.offsetHeight - window.innerHeight; }
  Array.prototype.forEach.call(document.querySelectorAll("[data-mu-go]"), function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      window.scrollTo({ top: endTop(), behavior: reduce ? "auto" : "smooth" });
      try { history.replaceState(null, "", "#waitlist"); } catch (x) {}
    });
  });
  if (location.hash === "#waitlist") { window.scrollTo(0, endTop()); onScroll(); }

  // Email first, then the rest of the form in a dialog.
  var mail = document.querySelector("[data-mu-mail]"), dlg = document.getElementById("mu-dialog");
  var formBox = document.querySelector("[data-mu-form]"), doneBox = document.querySelector("[data-mu-done]"), nameEl = document.querySelector("[data-mu-name]");
  var baseName = nameEl ? nameEl.textContent : "";
  function openDlg() {
    if (typeof dlg.showModal === "function") { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute("open", "");
    document.documentElement.classList.add("mu-lock");
  }
  function closeDlg() {
    if (typeof dlg.close === "function") dlg.close(); else dlg.removeAttribute("open");
    document.documentElement.classList.remove("mu-lock");
  }
  if (mail && dlg) {
    var input = mail.querySelector("input"), err = mail.querySelector(".mu-err");
    mail.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = input.value.trim();
      if (!/^\S+@\S+\.\S+$/.test(v)) { err.textContent = "Enter a valid email address."; input.classList.add("bad"); input.focus(); return; }
      err.textContent = ""; input.classList.remove("bad");
      var wEmail = document.getElementById("w-email"); if (wEmail) wEmail.value = v;
      openDlg();
      var first = document.getElementById("w-first"); if (first) setTimeout(function () { first.focus(); }, 60);
    });
    input.addEventListener("input", function () { err.textContent = ""; input.classList.remove("bad"); });
    Array.prototype.forEach.call(dlg.querySelectorAll("[data-mu-close]"), function (b) { b.addEventListener("click", closeDlg); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) closeDlg(); });
    dlg.addEventListener("close", function () { document.documentElement.classList.remove("mu-lock"); });
    document.addEventListener("zibura:joined", function (e) {
      var f = e.detail && e.detail.first ? String(e.detail.first).trim() : "";
      if (nameEl && f) nameEl.textContent = f + ", " + baseName.charAt(0).toLowerCase() + baseName.slice(1);
      formBox.hidden = true; doneBox.hidden = false; doneBox.focus({ preventScroll: true });
    });
  }
})();
