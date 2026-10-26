/* Comportamentos comuns a todas as páginas: tema claro/escuro, índice lateral e fórmulas (KaTeX). */
(function () {
  "use strict";
  var KEY = "caract-tema", root = document.documentElement;

  // aplica o tema salvo antes de a página aparecer (evita "piscar")
  try { var saved = localStorage.getItem(KEY); if (saved === "dark" || saved === "light") root.setAttribute("data-theme", saved); } catch (e) {}

  function isDark() {
    var t = root.getAttribute("data-theme");
    return t ? t === "dark" : !!(window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
  }

  function ready() {
    // botão de tema
    var b = document.getElementById("tema");
    if (b) {
      var label = function () { b.textContent = isDark() ? "Tema claro" : "Tema escuro"; };
      label();
      b.addEventListener("click", function () {
        var next = isDark() ? "light" : "dark";
        root.setAttribute("data-theme", next);
        try { localStorage.setItem(KEY, next); } catch (e) {}
        label();
        document.dispatchEvent(new Event("themechange"));
      });
    }

    // índice lateral a partir dos <h2 id>
    var toc = document.getElementById("toc");
    var heads = document.querySelectorAll("main h2[id]");
    if (toc && heads.length) {
      var ol = document.createElement("ol"), links = {};
      heads.forEach(function (h) {
        var li = document.createElement("li"), a = document.createElement("a");
        a.href = "#" + h.id; a.textContent = h.dataset.toc || h.textContent;
        li.appendChild(a); ol.appendChild(li); links[h.id] = a;
      });
      toc.appendChild(ol);
      if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) {
              Object.keys(links).forEach(function (k) { links[k].classList.remove("on"); });
              links[e.target.id].classList.add("on");
            }
          });
        }, { rootMargin: "-10% 0px -80% 0px" });
        heads.forEach(function (h) { io.observe(h); });
      }
    }

    // fórmulas
    if (window.renderMathInElement) {
      renderMathInElement(document.body, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "\\(", right: "\\)", display: false },
          { left: "$", right: "$", display: false }
        ],
        throwOnError: false
      });
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready); else ready();
})();
