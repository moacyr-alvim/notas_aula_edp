/* Demo: dois blocos ligados por uma porta de condutância ε.  Depende de grafo-core.js.
 * Esquerda: o grafo (cor = u; contorno = sinal do vetor de Fiedler). Direita: u_i(t) em escala log de tempo. */
(function () {
  "use strict";
  var K = window.GrafoCore, root = document.getElementById("demo-grafo");
  if (!K || !root) return;

  var $ = function (id) { return document.getElementById(id); };
  var rEps = $("g-eps"), oEps = $("g-epsv"), rT = $("g-t"), oT = $("g-tv"), btn = $("g-play"), read = $("g-readout"),
      cG = $("g-grafo-canvas"), cC = $("g-curvas-canvas");

  var KB = 5, C = 1, SMIN = -1.5, SMAX = 3, s = 0, playing = false, lastTs = 0, raf = 0;
  var cache = { eps: null, g: null, eig: null, sig: null, curves: null };

  function fmt(n, d) { return n.toFixed(d == null ? 2 : d).replace(".", ",").replace("-", "−"); }
  function fmtG(x) { return (x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x >= 0.1 ? x.toFixed(2) : x.toExponential(1)).replace(".", ","); }
  function css(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function colors() { return { ink: css("--ink"), soft: css("--ink-soft"), rule: css("--rule"), carac: css("--carac"), choque: css("--choque"), paper: css("--paper") }; }
  function setup(canvas) {
    var dpr = window.devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    var ctx = canvas.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    return { ctx: ctx, w: w, h: h };
  }
  function mix(a, b, f) { // cores #rrggbb
    function p(h) { h = h.replace("#", ""); if (h.length === 3) h = h.replace(/./g, "$&$&"); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
    var A = p(a), B = p(b); if (A.some(isNaN) || B.some(isNaN)) return b;
    return "rgb(" + A.map(function (x, i) { return Math.round(x + (B[i] - x) * f); }).join(",") + ")";
  }

  function model() {
    var eps = Math.pow(10, parseFloat(rEps.value));
    if (cache.eps !== eps) {
      var g = K.doisBlocos(KB, eps), eig = K.eigSym(K.laplacian(g.n, g.edges)), q = eig.vectors[1], sg = Math.sign(q[0]) || 1;
      var u0 = new Array(g.n).fill(0); u0[0] = 1;
      var curves = [], i, j, NS = 140;
      for (j = 0; j <= NS; j++) { var tt = Math.pow(10, SMIN + (SMAX - SMIN) * j / NS); curves.push(K.evolve(eig, u0, C, tt)); }
      cache = { eps: eps, g: g, eig: eig, sig: sg, u0: u0, curves: curves, fied: q.map(function (v) { return v * sg; }) };
    }
    return cache;
  }

  function drawGraph(M, u, col) {
    var P = setup(cG), ctx = P.ctx, g = M.g;
    var X = function (p) { return p[0] * P.w; }, Y = function (p) { return p[1] * P.h; };
    ctx.lineCap = "round";
    g.edges.forEach(function (e) {
      var a = g.pos[e[0]], b = g.pos[e[1]], ponte = e[2] !== 1;
      ctx.strokeStyle = ponte ? col.ink : col.rule; ctx.lineWidth = ponte ? 1 + 5 * Math.min(1, e[2]) : 1.2;
      ctx.beginPath(); ctx.moveTo(X(a), Y(a)); ctx.lineTo(X(b), Y(b)); ctx.stroke();
    });
    var r = Math.max(9, Math.min(15, P.w / 38));
    g.pos.forEach(function (p, i) {
      var f = Math.pow(Math.min(1, Math.max(0, u[i]) / 0.7), 0.6);
      ctx.fillStyle = mix(col.paper, col.choque, f); ctx.beginPath(); ctx.arc(X(p), Y(p), r, 0, 6.2832); ctx.fill();
      ctx.lineWidth = 2.6; ctx.strokeStyle = M.fied[i] > 0 ? col.carac : col.soft; if (M.fied[i] <= 0) ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.arc(X(p), Y(p), r, 0, 6.2832); ctx.stroke(); ctx.setLineDash([]);
    });
    ctx.fillStyle = col.soft; ctx.font = "12px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("bloco A", 0.25 * P.w, P.h - 6); ctx.fillText("bloco B", 0.75 * P.w, P.h - 6);
  }

  function drawCurves(M, col) {
    var P = setup(cC), ctx = P.ctx, l = 44, r = 12, t = 12, b = 30, w = P.w - l - r, h = P.h - t - b, g = M.g, NS = M.curves.length - 1;
    var X = function (sv) { return l + (sv - SMIN) / (SMAX - SMIN) * w; }, Y = function (v) { return t + (1 - v) * h; };
    ctx.font = "12px sans-serif"; ctx.strokeStyle = col.rule; ctx.fillStyle = col.soft; ctx.lineWidth = 1; ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (var e = -1; e <= 3; e++) { var px = Math.round(X(e)) + 0.5; ctx.beginPath(); ctx.moveTo(px, t); ctx.lineTo(px, t + h); ctx.stroke(); ctx.fillText(e === 0 ? "1" : "10" + (e < 0 ? "⁻¹" : e === 1 ? "" : e === 2 ? "²" : "³"), px, t + h + 6); }
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (var v = 0; v <= 1.0001; v += 0.25) { var py = Math.round(Y(v)) + 0.5; ctx.beginPath(); ctx.moveTo(l, py); ctx.lineTo(l + w, py); ctx.stroke(); ctx.fillText(fmt(v), l - 6, py); }
    ctx.fillStyle = col.ink; ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText("t (escala log)", P.w - r, P.h - 2);
    ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText("u", l + 6, 0);
    ctx.save(); ctx.beginPath(); ctx.rect(l, t, w, h); ctx.clip(); ctx.lineJoin = "round";
    for (var i = 0; i < g.n; i++) {
      ctx.strokeStyle = g.grupo[i] === 0 ? col.carac : col.choque; ctx.globalAlpha = i === 0 ? 1 : 0.65; ctx.lineWidth = i === 0 ? 3 : 1.6;
      ctx.beginPath(); for (var j = 0; j <= NS; j++) { var sv = SMIN + (SMAX - SMIN) * j / NS, x = X(sv), y = Y(M.curves[j][i]); if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.strokeStyle = col.ink; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.2;
    var xs = X(s); ctx.beginPath(); ctx.moveTo(xs, t); ctx.lineTo(xs, t + h); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }

  function draw() {
    var M = model(), col = colors(), tt = Math.pow(10, s), u = K.evolve(M.eig, M.u0, C, tt), g = M.g, l2 = M.eig.values[1];
    oEps.textContent = fmt(M.eps, M.eps < 0.1 ? 3 : 2); oT.textContent = fmtG(tt);
    drawGraph(M, u, col); drawCurves(M, col);
    var mA = 0, mB = 0, i; for (i = 0; i < g.n; i++) { if (g.grupo[i] === 0) mA += u[i] / KB; else mB += u[i] / KB; }
    read.innerHTML = "<span>t = <b>" + fmtG(tt) + "</b></span><span>λ₂ = <b>" + fmt(l2, 4) + "</b> (≈ 2ε/k = " + fmt(2 * M.eps / KB, 4) + ")</span>" +
      "<span>tempo de equilíbrio ≈ 1/(cλ₂) = <b>" + fmtG(1 / (C * l2)) + "</b></span>" +
      "<span>média no bloco A: <b>" + fmt(mA, 3) + "</b> · no bloco B: <b>" + fmt(mB, 3) + "</b></span>";
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; draw(); }); }

  function setS(v) { s = Math.min(SMAX, Math.max(SMIN, v)); rT.value = s; }
  rEps.addEventListener("input", schedule);
  rT.addEventListener("input", function () { s = parseFloat(rT.value); schedule(); });
  btn.addEventListener("click", function () {
    playing = !playing; btn.textContent = playing ? "⏸ Pausar" : "▶ Animar";
    if (playing) { if (s >= SMAX - 1e-6) setS(SMIN); lastTs = 0; requestAnimationFrame(tick); }
  });
  function tick(ts) {
    if (!playing) return;
    if (lastTs) setS(s + (ts - lastTs) / 1000 * 0.5);
    lastTs = ts; draw();
    if (s >= SMAX - 1e-6) { playing = false; btn.textContent = "▶ Animar"; return; }
    requestAnimationFrame(tick);
  }
  window.addEventListener("resize", schedule);
  if ("ResizeObserver" in window) new ResizeObserver(schedule).observe(root);
  document.addEventListener("themechange", schedule);

  rEps.value = -1.5; setS(-0.5); schedule();
})();
