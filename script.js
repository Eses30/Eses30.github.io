(function () {
  "use strict";
  var root = document.documentElement;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Email: assembled in the browser so it is not plain text in the HTML */
  var mail = document.getElementById("mail");
  var addr = ["shreyash.singh25", "imperial.ac.uk"].join("@");
  mail.href = "mailto:" + addr;
  mail.textContent = addr;
  document.getElementById("year").textContent = new Date().getFullYear();

  /* Theme toggle: follows the system until the visitor chooses */
  function currentTheme() {
    return root.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }
  document.getElementById("theme").addEventListener("click", function () {
    var next = currentTheme() === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch (e) {}
  });

  /* Filter chips. Items can belong to several areas (data-cat is a space-separated list). */
  var chips = document.querySelectorAll(".chip");
  var count = document.getElementById("count");
  /* No ranking: each list is shuffled on every visit, so nothing reads as first or most important */
  document.querySelectorAll(".items").forEach(function (list) {
    var order = Array.prototype.slice.call(list.children);
    for (var n = order.length - 1; n > 0; n--) {
      var k = Math.floor(Math.random() * (n + 1)), tmp = order[n]; order[n] = order[k]; order[k] = tmp;
    }
    order.forEach(function (el) { list.appendChild(el); });
  });
  var items = document.querySelectorAll(".item");
  var groups = document.querySelectorAll(".group");
  function apply(filter) {
    var shown = 0;
    items.forEach(function (el) {
      var show = filter === "all" || el.dataset.cat.split(" ").indexOf(filter) !== -1;
      el.hidden = !show;
      if (show) shown++;
    });
    groups.forEach(function (g) { g.hidden = !g.querySelector(".item:not([hidden])"); });
    chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c.dataset.filter === filter)); });
    count.textContent = shown + (shown === 1 ? " thing" : " things") + " planned" + (filter === "all" ? "" : " in this area");
  }
  chips.forEach(function (c) { c.addEventListener("click", function () { apply(c.dataset.filter); }); });
  apply("all");

  /* Fade list items in on scroll */
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.1 });
    items.forEach(function (el) { el.classList.add("reveal"); io.observe(el); });
  }

  /* ---------- Name: each letter reshapes with the pointer (variable font axes) ---------- */
  var h1 = document.getElementById("name");
  var text = h1.textContent;
  h1.textContent = "";
  var letters = [];
  text.split("").forEach(function (ch) {
    var s = document.createElement("span");
    s.setAttribute("aria-hidden", "true");
    if (ch === " ") { s.className = "sp"; } else { s.className = "ch"; s.textContent = ch; letters.push(s); }
    h1.appendChild(s);
  });
  var px = -9999, py = -9999, t0 = performance.now();
  function setAxes(el, k) {              /* k in 0..1: 0 = rest, 1 = strongest */
    var w = Math.round(380 + 420 * k), soft = Math.round(100 - 60 * k), wonk = k > 0.45 ? 1 : 0;
    el.style.fontVariationSettings = '"opsz" 144, "wght" ' + w + ', "SOFT" ' + soft + ', "WONK" ' + wonk;
    el.style.fontStyle = k > 0.7 ? "italic" : "normal";
  }
  function paintName(now) {
    letters.forEach(function (el, i) {
      var r = el.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var d = Math.hypot(px - cx, py - cy);
      var k = Math.max(0, 1 - d / 260);
      if (k === 0) k = 0.18 + 0.12 * Math.sin(now / 1400 + i * 0.7);   /* idle breathing */
      setAxes(el, k);
    });
  }
  if (!reduce) {
    addEventListener("pointermove", function (e) { px = e.clientX; py = e.clientY; }, { passive: true });
    addEventListener("pointerleave", function () { px = py = -9999; });
  } else {
    letters.forEach(function (el) { setAxes(el, 0.2); });
  }

  /* ---------- Hero background: layered sine waves (a nod to signals) ---------- */
  var cv = document.getElementById("waves"), ctx = cv.getContext("2d");
  var hero = document.getElementById("top"), W = 0, H = 0, dpr = 1, running = true;
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = hero.clientWidth; H = hero.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  var LINES = 9;
  function draw(now) {
    var t = now / 1000;
    ctx.clearRect(0, 0, W, H);
    var my = py > -9000 ? (py - hero.getBoundingClientRect().top) / H : 0.5;
    my = Math.max(0, Math.min(1, my));
    for (var i = 0; i < LINES; i++) {
      var f = i / (LINES - 1);
      var base = H * (0.2 + 0.7 * f);
      var amp = 14 + 46 * f + 40 * my;
      var freq = 0.0026 + 0.0016 * (1 - f);
      ctx.beginPath();
      for (var x = 0; x <= W; x += 8) {
        var y = base + Math.sin(x * freq + t * (0.35 + f * 0.5) + i) * amp
                     + Math.sin(x * freq * 2.3 - t * 0.4) * amp * 0.28;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(255,255,255," + (0.07 + 0.2 * f) + ")";
      ctx.lineWidth = 1 + f * 0.8;
      ctx.stroke();
    }
  }
  resize();
  addEventListener("resize", resize);
  function frame(now) {
    if (running && !document.hidden) { draw(now); paintName(now); }
    if (!reduce) requestAnimationFrame(frame);
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (e) { running = e[0].isIntersecting; }).observe(hero);
  }
  if (reduce) { draw(0); } else { requestAnimationFrame(frame); }
})();
