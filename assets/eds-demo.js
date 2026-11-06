/* Demo de equações diferenciais estocásticas.  Depende de eds-core.js.
 * Esquerda: caminhos sorteados (o tempo na horizontal, X na vertical) — o lado da EDS.
 * Direita: a densidade exata, com X na MESMA vertical, e o histograma dos 400 caminhos
 *          no instante marcado — o lado da EDP. Um é o fio, o outro é a nuvem. */
(function () {
  "use strict";
  var E = window.EDSCore, root = document.getElementById("demo-eds");
  if (!E || !root) return;
  var $ = function (id) { return document.getElementById(id); };
  var sel = $("eds-ex"), rT = $("eds-t"), oT = $("eds-tv"), btn = $("eds-play"),
      read = $("eds-readout"), cP = $("eds-paths"), cD = $("eds-dens");
  var TMAX = 2, PASSOS = 600, NCAM = 400, NDESENHA = 9, SEM = 20240607;
  var tocando = false, ultimo = 0, raf = 0, cache = {};

  Object.keys(E.EXEMPLOS).forEach(function (k) {
    var o = document.createElement("option"); o.value = k; o.textContent = E.EXEMPLOS[k].label; sel.appendChild(o);
  });
  sel.value = "transporte";

  function cam(nome) {
    if (!cache[nome]) cache[nome] = E.caminhos(E.EXEMPLOS[nome], TMAX, PASSOS, NCAM, SEM);
    return cache[nome];
  }
  function fmt(n, d) { return (Math.abs(n) < 5e-4 ? 0 : n).toFixed(d == null ? 2 : d).replace(".", ",").replace("-", "−"); }
  function css(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function cores() { return { ink: css("--ink"), soft: css("--ink-soft"), rule: css("--rule"), carac: css("--carac"), choque: css("--choque") }; }
  function prep(cv) {
    var dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    var ctx = cv.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    ctx.font = "12px sans-serif";
    return { ctx: ctx, w: w, h: h };
  }
  function alpha(hex, a) {
    hex = (hex || "").replace("#", ""); if (hex.length === 3) hex = hex.replace(/./g, "$&$&");
    var n = [0, 2, 4].map(function (i) { return parseInt(hex.substr(i, 2), 16); });
    return n.some(isNaN) ? hex : "rgba(" + n.join(",") + "," + a + ")";
  }

  function painelCaminhos(e, t, col) {
    var S = prep(cP), ctx = S.ctx, cx = { l: 34, tp: 14, w: S.w - 34 - 10, h: S.h - 14 - 26 };
    var T = cam(sel.value), i, k, vi = e.vista;
    var X = function (s) { return cx.l + s / TMAX * cx.w; };
    var Y = function (v) { return cx.tp + (1 - (v - vi.lo) / (vi.hi - vi.lo)) * cx.h; };
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.fillStyle = col.soft;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    [0, 0.5, 1, 1.5, 2].forEach(function (s) {
      var px = Math.round(X(s)) + .5;
      ctx.beginPath(); ctx.moveTo(px, cx.tp); ctx.lineTo(px, cx.tp + cx.h); ctx.stroke();
      ctx.fillText(fmt(s, 1), px, cx.tp + cx.h + 6);
    });
    ctx.save(); ctx.beginPath(); ctx.rect(cx.l, cx.tp - 2, cx.w, cx.h + 4); ctx.clip();
    ctx.beginPath();                                                     // faixa média ± desvio
    for (i = 0; i <= 120; i++) { var t1 = TMAX * i / 120; ctx.lineTo(X(t1), Y(E.media(e, t1) + Math.sqrt(E.variancia(e, t1)))); }
    for (i = 120; i >= 0; i--) { var t2 = TMAX * i / 120; ctx.lineTo(X(t2), Y(E.media(e, t2) - Math.sqrt(E.variancia(e, t2)))); }
    ctx.closePath(); ctx.fillStyle = alpha(col.carac, .15); ctx.fill();
    ctx.strokeStyle = alpha(col.carac, .9); ctx.lineWidth = 1.6; ctx.setLineDash([5, 4]);
    ctx.beginPath();                                                     // a média
    for (i = 0; i <= 120; i++) { var t3 = TMAX * i / 120; var p = Y(E.media(e, t3)); if (i) ctx.lineTo(X(t3), p); else ctx.moveTo(X(t3), p); }
    ctx.stroke(); ctx.setLineDash([]);
    var ate = Math.max(1, Math.round(t / T.dt));
    for (k = 0; k < NDESENHA; k++) {                                     // os caminhos
      var c = T.caminhos[k];
      ctx.strokeStyle = alpha(col.soft, .3); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(X(0), Y(c[0]));
      for (i = 1; i <= T.passos; i++) ctx.lineTo(X(i * T.dt), Y(c[i]));
      ctx.stroke();
      ctx.strokeStyle = alpha(col.ink, .85); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(X(0), Y(c[0]));
      for (i = 1; i <= ate; i++) ctx.lineTo(X(i * T.dt), Y(c[i]));
      ctx.stroke();
    }
    ctx.strokeStyle = col.choque; ctx.lineWidth = 1.8;                   // o instante mostrado
    var pt = Math.round(X(t)) + .5;
    ctx.beginPath(); ctx.moveTo(pt, cx.tp); ctx.lineTo(pt, cx.tp + cx.h); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = col.ink; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText("X", cx.l + 6, 0);
    ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText("t", S.w - 4, S.h - 2);
  }

  function painelDensidade(e, t, col) {
    var S = prep(cD), ctx = S.ctx, cx = { l: 10, tp: 14, w: S.w - 10 - 34, h: S.h - 14 - 26 };
    var vi = e.vista, i, T = cam(sel.value);
    var xs = [], ds = [], topo = 0;
    for (i = 0; i <= 400; i++) {
      var x = vi.lo + (vi.hi - vi.lo) * i / 400, d = E.densidade(e, x, t);
      xs.push(x); ds.push(d); topo = Math.max(topo, d);
    }
    var NB = 42, bins = new Float64Array(NB), ate = Math.max(1, Math.round(t / T.dt)), larg = (vi.hi - vi.lo) / NB;
    for (i = 0; i < T.caminhos.length; i++) {
      var b = Math.floor((T.caminhos[i][ate] - vi.lo) / larg);
      if (b >= 0 && b < NB) bins[b]++;
    }
    for (i = 0; i < NB; i++) bins[i] /= T.caminhos.length * larg;        // histograma como densidade
    topo = Math.max(topo, Math.max.apply(null, bins)) * 1.1;
    var X = function (d) { return cx.l + (d / topo) * cx.w; };
    var Y = function (v) { return cx.tp + (1 - (v - vi.lo) / (vi.hi - vi.lo)) * cx.h; };
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.fillStyle = col.soft;
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    var passo = (vi.hi - vi.lo) > 6 ? 2 : 1;
    for (var v = Math.ceil(vi.lo / passo) * passo; v <= vi.hi; v += passo) {
      var py = Math.round(Y(v)) + .5;
      ctx.beginPath(); ctx.moveTo(cx.l, py); ctx.lineTo(cx.l + cx.w, py); ctx.stroke();
      ctx.fillText(fmt(v, 0), cx.l + cx.w + 6, py);
    }
    ctx.save(); ctx.beginPath(); ctx.rect(cx.l - 2, cx.tp - 2, cx.w + 4, cx.h + 4); ctx.clip();
    ctx.fillStyle = alpha(col.soft, .4);                                 // o histograma dos caminhos
    for (i = 0; i < NB; i++) {
      if (!bins[i]) continue;
      var y0 = Y(vi.lo + (i + 1) * larg), y1 = Y(vi.lo + i * larg);
      ctx.fillRect(cx.l, y0, X(bins[i]) - cx.l, y1 - y0 - 1);
    }
    ctx.strokeStyle = col.ink; ctx.lineWidth = 2.4; ctx.beginPath();     // a densidade exata
    for (i = 0; i < xs.length; i++) { var px = X(ds[i]); if (i) ctx.lineTo(px, Y(xs[i])); else ctx.moveTo(px, Y(xs[i])); }
    ctx.stroke(); ctx.restore();
    ctx.fillStyle = col.ink; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText("ρ", cx.l + 4, 0);
  }

  function desenha() {
    var e = E.EXEMPLOS[sel.value], t = parseFloat(rT.value), col = cores();
    oT.textContent = fmt(t);
    painelCaminhos(e, t, col); painelDensidade(e, t, col);
    var est = E.estacionaria(e);
    var txt = "<span>t = <b>" + fmt(t) + "</b></span>"
            + "<span>média <b>" + fmt(E.media(e, t), 3) + "</b></span>"
            + "<span>desvio padrão <b>" + fmt(Math.sqrt(E.variancia(e, t)), 3) + "</b></span>";
    if (e.sigma === 0) txt += "<span>sem ruído: a nuvem só é <b>carregada</b>, e a largura encolhe com o fluxo</span>";
    else if (est !== null) txt += "<span>desvio de equilíbrio √(σ²/2γ) = <b>" + fmt(Math.sqrt(est), 3) + "</b></span>";
    else if (e.log) txt += "<span>a <b>mediana</b> é só " + fmt(Math.exp((e.mu - e.sigma * e.sigma / 2) * t), 3)
      + ": o caminho típico cresce com μ − σ²/2, e não com μ</span>";
    else txt += "<span>sem equilíbrio: a largura cresce como √t para sempre</span>";
    read.innerHTML = txt;
  }
  function agenda() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; desenha(); }); }
  [sel, rT].forEach(function (el) { el.addEventListener("input", agenda); });
  btn.addEventListener("click", function () {
    tocando = !tocando; btn.textContent = tocando ? "⏸ Pausar" : "▶ Animar";
    if (tocando) { ultimo = 0; requestAnimationFrame(passo); }
  });
  function passo(ts) {
    if (!tocando) return;
    if (ultimo) {
      var t = parseFloat(rT.value) + (ts - ultimo) / 1000 * 0.4;
      rT.value = t >= TMAX ? 0.02 : t;
      desenha();
    }
    ultimo = ts; requestAnimationFrame(passo);
  }
  window.addEventListener("resize", agenda);
  if ("ResizeObserver" in window) new ResizeObserver(agenda).observe(root);
  document.addEventListener("themechange", agenda);
  desenha();
})();
