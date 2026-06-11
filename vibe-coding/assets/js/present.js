(function () {
  function initCcaDomainBars() {
    var root = document.getElementById("cca-domain-bars");
    var fills = document.querySelectorAll(".present-cca-bar-fill");
    if (!fills.length) return;
    function reveal() {
      fills.forEach(function (el, i) {
        var pct = el.getAttribute("data-pct");
        window.setTimeout(function () {
          if (pct) el.style.width = pct + "%";
        }, i * 70);
      });
    }
    if (!root || !("IntersectionObserver" in window)) {
      reveal();
      return;
    }
    var obs = new IntersectionObserver(
      function (ents) {
        if (ents[0] && ents[0].isIntersecting) {
          obs.disconnect();
          reveal();
        }
      },
      { threshold: 0.12, rootMargin: "0px" }
    );
    obs.observe(root);
  }

  function initPresentScrollSpy() {
    var nav = document.querySelector(".present-section-nav");
    if (!nav) return;
    var links = [].slice.call(nav.querySelectorAll("a[data-present-scroll]"));
    if (!links.length) return;
    var sections = links
      .map(function (a) {
        var href = a.getAttribute("href");
        return href ? document.querySelector(href) : null;
      })
      .filter(Boolean);

    function tick() {
      var mid = window.innerHeight * 0.32;
      var bestIdx = 0;
      var bestDist = Infinity;
      sections.forEach(function (sec, i) {
        var r = sec.getBoundingClientRect();
        var dist = Math.abs(r.top - mid);
        if (r.top <= mid + 80 && dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      });
      links.forEach(function (a, i) {
        a.classList.toggle("is-active", i === bestIdx);
      });
    }

    window.addEventListener("scroll", tick, { passive: true });
    window.addEventListener("resize", tick, { passive: true });
    tick();
  }

  initPresentScrollSpy();
  initCcaDomainBars();

  document.querySelectorAll("a[data-present-scroll]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      var id = this.getAttribute("href");
      var el = id ? document.querySelector(id) : null;
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
})();
