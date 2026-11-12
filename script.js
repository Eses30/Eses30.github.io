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

  /* ---------- Connected topics: a network with no ranking ---------- */
  var cloud = document.getElementById("cloud");
  var svg = document.getElementById("links");
  var detail = document.getElementById("detail");
  var chips = document.querySelectorAll(".chip");
  var hint = detail.innerHTML;
  var SVGNS = "http://www.w3.org/2000/svg";
  var byId = {}, nodes = [], edges = [], filter = "all", pinned = null, built = false;

  document.querySelectorAll("#nodes .item").forEach(function (el) {
    var title = el.querySelector("h3").textContent, desc = el.querySelector("p").textContent;
    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "node"; btn.textContent = title;
    el.textContent = ""; el.appendChild(btn);
    var n = { id: el.id, el: el, title: title, desc: desc, cats: el.dataset.cat.split(" "), links: el.dataset.links.split(" "), x: 0, y: 0, vx: 0, vy: 0, w: 0, h: 0 };
    byId[n.id] = n; nodes.push(n);
    btn.addEventListener("mouseenter", function () { if (!pinned) focusNode(n); });
    btn.addEventListener("mouseleave", function () { if (!pinned) clearFocus(); });
    btn.addEventListener("focus", function () { if (!pinned) focusNode(n); });
    btn.addEventListener("blur", function () { if (!pinned) clearFocus(); });
    btn.addEventListener("click", function () {
      if (pinned === n) { pinned = null; clearFocus(); } else { pinned = n; focusNode(n); }
    });
  });
  var seen = {};
  nodes.forEach(function (a) {
    a.links.forEach(function (id) {
      var b = byId[id]; if (!b) return;
      var key = [a.id, b.id].sort().join("|");
      if (!seen[key]) { seen[key] = 1; edges.push({ a: a, b: b }); }
    });
  });
  function neighbours(n) { return edges.filter(function (e) { return e.a === n || e.b === n; }).map(function (e) { return e.a === n ? e.b : e.a; }); }

  function focusNode(n) {
    var near = neighbours(n);
    nodes.forEach(function (m) {
      m.el.classList.toggle("is-on", m === n);
      m.el.classList.toggle("is-near", near.indexOf(m) !== -1);
      m.el.classList.toggle("is-dim", m !== n && near.indexOf(m) === -1);
    });
    edges.forEach(function (e) {
      var on = e.a === n || e.b === n;
      e.line.classList.toggle("is-on", on); e.line.classList.toggle("is-dim", !on);
    });
    detail.textContent = "";
    var h = document.createElement("h3"); h.textContent = n.title;
    var p = document.createElement("p"); p.textContent = n.desc;
    var r = document.createElement("p"); r.className = "rel";
    r.appendChild(document.createTextNode("Connects to: "));
    near.forEach(function (m, i) {
      var b = document.createElement("b"); b.textContent = m.title; r.appendChild(b);
      if (i < near.length - 1) r.appendChild(document.createTextNode(", "));
    });
    detail.appendChild(h); detail.appendChild(p); detail.appendChild(r);
  }
  function clearFocus() {
    nodes.forEach(function (m) { m.el.classList.remove("is-on", "is-near", "is-dim"); });
    edges.forEach(function (e) { e.line.classList.remove("is-on", "is-dim"); });
    detail.innerHTML = hint;
  }
  function applyFilter() {
    nodes.forEach(function (m) { m.el.classList.toggle("is-off", filter !== "all" && m.cats.indexOf(filter) === -1); });
    chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c.dataset.filter === filter)); });
  }
  chips.forEach(function (c) { c.addEventListener("click", function () { filter = c.dataset.filter; applyFilter(); }); });
  addEventListener("keydown", function (e) { if (e.key === "Escape" && pinned) { pinned = null; clearFocus(); } });

  /* Layout: a small force simulation (repulsion, springs on links, gentle gravity), then box-overlap clean-up.
     Starts from random positions every visit, so there is no fixed first or centre. */
  function layout() {
    var W = cloud.clientWidth, H = cloud.clientHeight;
    nodes.forEach(function (n) { n.w = n.el.offsetWidth; n.h = n.el.offsetHeight; n.x = W * (0.15 + 0.7 * Math.random()); n.y = H * (0.15 + 0.7 * Math.random()); n.vx = n.vy = 0; });
    var rest = Math.min(W, H * 1.6) * 0.17, i, j, a, b, dx, dy, d, f;
    for (var it = 0; it < 420; it++) {
      for (i = 0; i < nodes.length; i++) for (j = i + 1; j < nodes.length; j++) {
        a = nodes[i]; b = nodes[j]; dx = b.x - a.x; dy = b.y - a.y; d = Math.max(Math.hypot(dx, dy), 12);
        f = 5200 / (d * d); a.vx -= f * dx / d; a.vy -= f * dy / d; b.vx += f * dx / d; b.vy += f * dy / d;
      }
      edges.forEach(function (e) {
        var ddx = e.b.x - e.a.x, ddy = e.b.y - e.a.y, dd = Math.max(Math.hypot(ddx, ddy), 1), ff = 0.02 * (dd - rest);
        e.a.vx += ff * ddx / dd; e.a.vy += ff * ddy / dd; e.b.vx -= ff * ddx / dd; e.b.vy -= ff * ddy / dd;
      });
      nodes.forEach(function (n) {
        n.vx += (W / 2 - n.x) * 0.004; n.vy += (H / 2 - n.y) * 0.004;
        n.vx *= 0.82; n.vy *= 0.82; n.x += n.vx; n.y += n.vy;
        n.x = Math.max(n.w / 2 + 6, Math.min(W - n.w / 2 - 6, n.x));
        n.y = Math.max(n.h / 2 + 6, Math.min(H - n.h / 2 - 6, n.y));
      });
    }
    /* Stretch the settled layout to fill the whole area so links are easy to read */
    var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    nodes.forEach(function (n) { x0 = Math.min(x0, n.x); x1 = Math.max(x1, n.x); y0 = Math.min(y0, n.y); y1 = Math.max(y1, n.y); });
    var sx = (W - 190) / Math.max(x1 - x0, 1), sy = (H - 70) / Math.max(y1 - y0, 1);
    nodes.forEach(function (n) { n.x = 95 + (n.x - x0) * sx; n.y = 35 + (n.y - y0) * sy; });
    for (var p = 0; p < 80; p++) for (i = 0; i < nodes.length; i++) for (j = i + 1; j < nodes.length; j++) {
      a = nodes[i]; b = nodes[j];
      var ox = (a.w + b.w) / 2 + 14 - Math.abs(a.x - b.x), oy = (a.h + b.h) / 2 + 10 - Math.abs(a.y - b.y);
      if (ox > 0 && oy > 0) {
        if (ox < oy) { var sx = (a.x < b.x ? -1 : 1) * ox / 2; a.x += sx; b.x -= sx; }
        else { var sy = (a.y < b.y ? -1 : 1) * oy / 2; a.y += sy; b.y -= sy; }
      }
    }
    nodes.forEach(function (n) {
      n.x = Math.max(n.w / 2 + 6, Math.min(W - n.w / 2 - 6, n.x)); n.y = Math.max(n.h / 2 + 6, Math.min(H - n.h / 2 - 6, n.y));
      n.el.style.left = n.x + "px"; n.el.style.top = n.y + "px";
    });
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    edges.forEach(function (e) {
      if (!e.line) { e.line = document.createElementNS(SVGNS, "line"); e.line.setAttribute("class", "link"); svg.appendChild(e.line); }
      e.line.setAttribute("x1", e.a.x); e.line.setAttribute("y1", e.a.y); e.line.setAttribute("x2", e.b.x); e.line.setAttribute("y2", e.b.y);
    });
    built = true;
  }
  var narrow = matchMedia("(max-width: 43.75rem)"), lastW = 0;
  function setup() {
    cloud.classList.add("on");
    if (narrow.matches) { nodes.forEach(function (n) { n.el.style.left = n.el.style.top = ""; });
      edges.forEach(function (e) { if (!e.line) { e.line = document.createElementNS(SVGNS, "line"); e.line.setAttribute("class", "link"); svg.appendChild(e.line); } });
      return; }
    layout(); lastW = cloud.clientWidth;
  }
  setup();
  applyFilter();
  var rt; addEventListener("resize", function () {
    clearTimeout(rt); rt = setTimeout(function () { if (!narrow.matches && Math.abs(cloud.clientWidth - lastW) > 40) { pinned = null; clearFocus(); setup(); } else if (narrow.matches) setup(); }, 180);
  });

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
