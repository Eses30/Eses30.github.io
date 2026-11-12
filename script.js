(function () {
  "use strict";
  var root = document.documentElement;

  /* Email: assembled in the browser so it is not sitting in the HTML as plain text for scrapers */
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

  /* Filter chips */
  var chips = document.querySelectorAll(".chip");
  var items = document.querySelectorAll(".item");
  var count = document.getElementById("count");
  function apply(filter) {
    var shown = 0;
    items.forEach(function (el) {
      var show = filter === "all" || el.dataset.cat === filter;
      el.hidden = !show;
      if (show) shown++;
    });
    chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c.dataset.filter === filter)); });
    count.textContent = shown + (shown === 1 ? " thing" : " things") + " planned" + (filter === "all" ? "" : " in this area");
  }
  chips.forEach(function (c) { c.addEventListener("click", function () { apply(c.dataset.filter); }); });
  apply("all");

  /* Fade items in as they scroll into view */
  if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.1 });
    items.forEach(function (el, i) {
      el.classList.add("reveal");
      el.style.transitionDelay = Math.min(i, 6) * 40 + "ms";
      io.observe(el);
    });
  }
})();
