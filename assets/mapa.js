/* Mapa de conceitos (estilo "mapa de metrô"): raias = temas, setas = "ajuda a ler antes".
 * Para acrescentar uma página: troque `href: null` do nó correspondente pelo caminho da página.
 * A função renderSVG é pura (devolve texto) — roda também no Node, para testes.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Mapa = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var LANES = [
    { id: "carac",   label: "Características\nclássicas" },
    { id: "choques", label: "Choques\ne tráfego" },
    { id: "var",     label: "Variacional e\nviscosidade" },
    { id: "num",     label: "Métodos\nnuméricos" },
    { id: "calor",   label: "Calor e\ndifusão" },
    { id: "disc",    label: "Fourier\ndiscreto" },
    { id: "seg",     label: "Segunda\nordem" },
    { id: "listas",  label: "Listas de\nexercícios" }
  ];

  var TRAILS = [
    { id: "basico",      label: "Primeiro contato" },
    { id: "choques",     label: "Choques e tráfego" },
    { id: "variacional", label: "Variacional e viscosidade" },
    { id: "calor",       label: "Calor e difusão" },
    { id: "fdiscreto",   label: "Convolução e Fourier discreto" },
    { id: "numerico",    label: "Numérico" },
    { id: "segunda",     label: "Segunda ordem" }
  ];

  // href: null  =>  "em breve"
  var NODES = [
    { id: "carac1", lane: "carac", col: 0, label: "Características\nde 1ª ordem", href: "paginas/caracteristicas-1a-ordem.html", trails: ["basico", "choques", "variacional"],
      desc: "O sistema de EDOs ao longo de curvas: x, z e p caminham juntos. Com exercícios: quase linear, Evans, Hamilton–Jacobi, eikonal e a prova de existência local." },
    { id: "transp", lane: "carac", col: 1, label: "Equação de\ntransporte", href: "paginas/equacao-transporte.html", trails: ["basico", "numerico"],
      desc: "O caso mais simples: retas paralelas e u(x,t) = f(x − ct). Semirreta, termos extras e demo." },
    { id: "burgers", lane: "choques", col: 1, label: "Burgers, quebra\ne choques", href: "paginas/burgers.html", trails: ["basico", "choques", "variacional"],
      desc: "Características que se cruzam, tempo de quebra e o choque. Com demo interativa." },
    { id: "lc", lane: "choques", col: 2, label: "Leis de\nconservação", href: "paginas/leis-conservacao.html", trails: ["basico", "choques"],
      desc: "u_t + F(u)_x = 0 como balanço de fluxo, características e o tempo de quebra conforme o sinal de F″." },
    { id: "weak", lane: "choques", col: 3, label: "Solução fraca", href: "paginas/solucao-fraca.html", trails: ["choques"],
      desc: "Usar só o balanço em intervalos para admitir saltos; dele sai Rankine–Hugoniot." },
    { id: "rh", lane: "choques", col: 4, label: "Rankine–Hugoniot", href: "paginas/burgers.html#rankine-hugoniot", trails: ["choques"],
      desc: "A velocidade do choque a partir da conservação. Está dentro da página de Burgers." },
    { id: "lwr", lane: "choques", col: 5, label: "Modelo LWR\n(trânsito)", href: "paginas/modelo-lwr.html", trails: ["choques"],
      desc: "Engarrafamentos como choques que andam para trás e o sinal verde como rarefação. Com os exercícios e o carro que acompanha a onda." },
    { id: "hj", lane: "var", col: 1, label: "Hamilton–Jacobi", href: null, trails: ["variacional"],
      desc: "u_t + H(Du,x) = 0, as equações de Hamilton como características e a escolha da solução física entre as fracas (condição de Lax)." },
    { id: "el", lane: "var", col: 2, label: "Euler–Lagrange\ne Legendre", href: null, trails: ["variacional"],
      desc: "Cálculo das variações e a transformada de Legendre entre H e L." },
    { id: "hl", lane: "var", col: 3, label: "Fórmula de\nHopf–Lax", href: "paginas/burgers.html#hopf-lax", trails: ["variacional"],
      desc: "A solução como mínimo; é ela que a demo de Burgers usa depois do choque." },
    { id: "visc", lane: "var", col: 4, label: "Soluções de\nviscosidade", href: null, trails: ["variacional"],
      desc: "Sub e supersoluções testadas com funções suaves que tocam u." },
    { id: "grafo", lane: "calor", col: 1, label: "Difusão em\ngrafos", href: "paginas/difusao-grafos.html", trails: ["calor"],
      desc: "Tanques ligados por canos: u' = −cLu com L = BᵀB. Com Python editável." },
    { id: "spec", lane: "calor", col: 2, label: "Autovalores nulos\ne pequenos", href: "paginas/autovalores-redes.html", trails: ["calor"],
      desc: "Componentes conexas, gargalos e o vetor de Fiedler. Com demo interativa e Python." },
    { id: "anel", lane: "calor", col: 3, label: "O grafo em anel\ne o limite contínuo", href: "paginas/calor-grafo-anel.html", trails: ["calor", "numerico"],
      desc: "Modos de Fourier no grafo em anel e o limite N → ∞ (o círculo), que dá u_t = k u_xx. Com demo e Python." },
    { id: "fourier", lane: "calor", col: 4, label: "Calor na reta:\nFourier e núcleo", href: null, trails: ["calor"],
      desc: "A equação do calor em ℝ: transformada de Fourier, núcleo gaussiano e propagação com velocidade infinita." },
    { id: "sep", lane: "calor", col: 4, row: 1, label: "Separação de\nvariáveis", href: "paginas/separacao-variaveis.html", trails: ["calor"],
      desc: "O calor numa barra: u = X(x)T(t), autovalores (nπ/ℓ)², soma dos modos e coeficientes por ortogonalidade. Com demo e Python." },
    { id: "conv", lane: "disc", col: 2, label: "Convolução", href: "paginas/convolucao.html", trails: ["fdiscreto"],
      desc: "Polinômios, probabilidade e áudio; o que supor fora da janela: zeros (linear) ou periódico (circular). Com demo e Python." },
    { id: "dft", lane: "disc", col: 3, label: "Transformada de\nFourier discreta", href: "paginas/dft.html", trails: ["fdiscreto"],
      desc: "O shift S, a base de Fourier e a convolução circular virando produto ponto a ponto. Com Python editável." },
    { id: "calorf", lane: "disc", col: 4, label: "O calor no grafo\nem anel, com Fourier", href: "paginas/calor-fourier.html", trails: ["fdiscreto", "calor"],
      desc: "O laplaciano do grafo em anel é circulante: Fourier desacopla as EDOs e a solução é uma convolução. Com Python editável." },
    { id: "upwind", lane: "num", col: 2, label: "Upwind", href: "paginas/upwind.html", trails: ["numerico"],
      desc: "Diferenças finitas que olham para o lado de onde a informação vem. Com Python editável." },
    { id: "cfl", lane: "num", col: 3, label: "Condição CFL", href: "paginas/cfl.html", trails: ["numerico", "segunda"],
      desc: "O cone de dependência do esquema precisa conter o da equação. Com Python editável." },
    { id: "char2", lane: "seg", col: 1, row: 0, label: "Características\nde 2ª ordem", href: "paginas/caracteristicas-2a-ordem.html", trails: ["segunda"],
      desc: "Quando o sistema para as derivadas de segunda ordem fica singular, e o recado que anda pela curva." },
    { id: "class", lane: "seg", col: 2, row: 0, label: "Hiperbólica,\nparabólica, elíptica", href: "paginas/classificacao.html", trails: ["segunda"],
      desc: "O discriminante B² − AC, invariante por mudança de coordenadas, e por que o calor e Laplace não rendem como a onda." },
    { id: "wave2", lane: "seg", col: 2, row: 1, label: "Onda e\nd'Alembert", href: "paginas/onda-dalembert.html", trails: ["segunda", "numerico"],
      desc: "A fórmula de d'Alembert deduzida fatorando o operador e seguindo as características. Com demo e Python." },
    { id: "newton", lane: "seg", col: 1, row: 1, label: "De onde vem a\nequação da onda", href: "paginas/equacao-onda-fisica.html", trails: ["segunda"],
      desc: "Newton em um colar de bolinhas e molas, o limite do contínuo e a velocidade c. Também a corda esticada." },
    { id: "listafc", lane: "listas", col: 5, label: "Fourier, calor\ne ondas", href: "paginas/lista-fourier-calor.html", trails: ["calor", "fdiscreto"],
      desc: "Papel e lápis (grid e calor, Fourier, transporte, onda) e computacional (calor no grid, afinador, suavização de curva)." },
    { id: "ma", lane: "seg", col: 3, row: 0, label: "Monge–Ampère", href: "paginas/monge-ampere.html", trails: ["segunda"],
      desc: "Leitura opcional: det D²u = −1, características por homotetia de razão 1/2 e u como área. Com a parábola e o círculo." }
  ];

  var EDGES = [
    ["carac1", "transp"], ["carac1", "burgers"], ["carac1", "hj"], ["carac1", "char2"],
    ["transp", "upwind"],
    ["burgers", "lc"], ["lc", "weak"], ["weak", "rh"], ["rh", "lwr"],
    ["hj", "el"], ["el", "hl"], ["hl", "visc"],
    ["char2", "class"], ["char2", "wave2"], ["char2", "ma"], ["newton", "wave2"],
    ["grafo", "spec"], ["spec", "anel"], ["anel", "fourier"], ["anel", "sep"], ["sep", "fourier"], ["sep", "listafc"], ["calorf", "listafc"],
    ["conv", "dft"], ["dft", "calorf"], ["anel", "calorf"],
    ["upwind", "cfl"], ["wave2", "cfl"]
  ];

  // geometria
  var G = { nodeW: 158, nodeH: 44, colStep: 208, laneH: 88, rowStep: 56, padLeft: 150, padTop: 14, padRight: 14, padBottom: 14 };

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

  function layout() {
    var y = G.padTop, lanes = {}, cols = 0;
    LANES.forEach(function (l) {
      var rows = 1;
      NODES.forEach(function (n) { if (n.lane === l.id) rows = Math.max(rows, (n.row || 0) + 1); });
      var h = G.laneH + (rows - 1) * G.rowStep;
      lanes[l.id] = { y: y, h: h, rows: rows, label: l.label };
      y += h;
    });
    NODES.forEach(function (n) { cols = Math.max(cols, n.col + 1); });
    var pos = {};
    NODES.forEach(function (n) {
      var L = lanes[n.lane];
      var cy = L.y + G.laneH / 2 + (n.row || 0) * G.rowStep;
      pos[n.id] = { x: G.padLeft + n.col * G.colStep, y: cy - G.nodeH / 2, cy: cy };
    });
    return { lanes: lanes, pos: pos, width: G.padLeft + (cols - 1) * G.colStep + G.nodeW + G.padRight, height: y + G.padBottom };
  }

  function byId(id) { for (var i = 0; i < NODES.length; i++) if (NODES[i].id === id) return NODES[i]; return null; }

  /* trilha: "all" ou id; devolve SVG como texto */
  function renderSVG(trail) {
    var L = layout(), out = [];
    var inTrail = function (n) { return trail === "all" || n.trails.indexOf(trail) >= 0; };
    out.push('<svg class="map" viewBox="0 0 ' + L.width + " " + L.height + '" width="' + L.width + '" height="' + L.height + '" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="Mapa de conceitos">');
    out.push('<defs><marker id="seta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,1 L9,5 L0,9 z" class="seta"/></marker></defs>');

    // raias
    LANES.forEach(function (l, i) {
      var a = L.lanes[l.id];
      out.push('<rect class="lane' + (i % 2 ? " alt" : "") + '" x="0" y="' + a.y + '" width="' + L.width + '" height="' + a.h + '"/>');
      var lines = l.label.split("\n");
      lines.forEach(function (t, k) {
        out.push('<text class="lane-label" x="14" y="' + (a.y + G.laneH / 2 + (k - (lines.length - 1) / 2) * 17 + 5) + '">' + esc(t) + "</text>");
      });
    });

    // setas
    EDGES.forEach(function (e) {
      var A = L.pos[e[0]], B = L.pos[e[1]], na = byId(e[0]), nb = byId(e[1]);
      var x1 = A.x + G.nodeW, y1 = A.cy, x2 = B.x - 2, y2 = B.cy, dx = (x2 - x1) / 2;
      var on = inTrail(na) && inTrail(nb);
      out.push('<path class="edge' + (on ? "" : " dim") + '" d="M' + x1 + "," + y1 + " C" + (x1 + dx) + "," + y1 + " " + (x2 - dx) + "," + y2 + " " + x2 + "," + y2 + '" marker-end="url(#seta)"/>');
    });

    // nós
    NODES.forEach(function (n) {
      var p = L.pos[n.id], ok = !!n.href, lines = n.label.split("\n");
      var cls = "node " + (ok ? "ok" : "soon") + (inTrail(n) ? "" : " dim");
      var inner = '<rect x="' + p.x + '" y="' + p.y + '" width="' + G.nodeW + '" height="' + G.nodeH + '" rx="6"/>';
      lines.forEach(function (t, k) {
        inner += '<text x="' + (p.x + G.nodeW / 2) + '" y="' + (p.cy + (k - (lines.length - 1) / 2) * 16 + 5) + '" text-anchor="middle">' + esc(t) + "</text>";
      });
      var label = lines.join(" ") + (ok ? "" : " (em breve)");
      if (ok) out.push('<a class="' + cls + '" href="' + esc(n.href) + '" data-id="' + n.id + '" aria-label="' + esc(label) + '">' + inner + "</a>");
      else out.push('<g class="' + cls + '" data-id="' + n.id + '" tabindex="0" role="img" aria-label="' + esc(label) + '">' + inner + "</g>");
    });
    out.push("</svg>");
    return out.join("");
  }

  /* ---------- parte que mexe na página (só no navegador) ---------- */
  function mount(opts) {
    var host = document.getElementById(opts.map), chips = document.getElementById(opts.chips),
        info = document.getElementById(opts.info), list = document.getElementById(opts.list);
    var trail = "all";

    function nodesOfTrail(t) {   // ordem topológica simples: por coluna e raia
      return NODES.filter(function (n) { return t === "all" || n.trails.indexOf(t) >= 0; });
    }

    function draw() {
      host.innerHTML = renderSVG(trail);
      chips.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.trail === trail)); });
      // lista textual do percurso (também serve de alternativa ao desenho)
      list.textContent = "";
      var t = TRAILS.filter(function (x) { return x.id === trail; })[0];
      if (t) {
        var h = document.createElement("p"); h.className = "trail-title"; h.textContent = "Percurso: " + t.label; list.appendChild(h);
        var ol = document.createElement("ol");
        nodesOfTrail(trail).slice().sort(function (a, b) { return a.col - b.col; }).forEach(function (n) {
          var li = document.createElement("li"), name = n.label.replace(/\n/g, " ");
          if (n.href) { var a = document.createElement("a"); a.href = n.href; a.textContent = name; li.appendChild(a); }
          else { li.textContent = name + " "; var s = document.createElement("span"); s.className = "soon"; s.textContent = "(em breve)"; li.appendChild(s); }
          ol.appendChild(li);
        });
        list.appendChild(ol);
      }
    }

    function describe(el) {
      var g = el && el.closest && el.closest("[data-id]");
      if (!g) return;
      var n = byId(g.getAttribute("data-id"));
      info.textContent = n.label.replace(/\n/g, " ") + " — " + n.desc + (n.href ? "" : " (página em breve)");
    }
    host.addEventListener("mouseover", function (e) { describe(e.target); });
    host.addEventListener("focusin", function (e) { describe(e.target); });

    var bAll = document.createElement("button");
    bAll.type = "button"; bAll.dataset.trail = "all"; bAll.textContent = "Tudo";
    chips.appendChild(bAll);
    TRAILS.forEach(function (t) {
      var b = document.createElement("button"); b.type = "button"; b.dataset.trail = t.id; b.textContent = t.label; chips.appendChild(b);
    });
    chips.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      trail = b.dataset.trail; draw();
    });
    draw();
  }

  return { LANES: LANES, TRAILS: TRAILS, NODES: NODES, EDGES: EDGES, G: G, layout: layout, renderSVG: renderSVG, mount: mount };
});
