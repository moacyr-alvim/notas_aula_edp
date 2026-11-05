/* Demo do passeio aleatório.  Depende de fp-core.js.
 * Esquerda: a distribuição exata do passeio (barras) contra a gaussiana de Fokker–Planck (curva).
 * Direita: algumas trajetórias sorteadas, a faixa a t ± √(2Dt) e o instante mostrado à esquerda. */
(function () {
  "use strict";
  var F = window.FPCore, root = document.getElementById("demo-fp");
  if (!F || !root) return;
  var $ = function (id) { return document.getElementById(id); };
  var sH = $("fp-h"), rA = $("fp-a"), oA = $("fp-av"), sS = $("fp-s"),
      rT = $("fp-t"), oT = $("fp-tv"), btn = $("fp-play"), read = $("fp-readout"),
      cD = $("fp-dist"), cT = $("fp-traj");
  var TMAX = 2, D = F.D0;
  /* a janela acompanha o viés, para a nuvem não fugir nem sobrar margem vazia */
  function janela(a) { return { lo: a - 3.2, hi: a + 3.2 }; }
  function marcas(j) {
    var out = [], k;
    for (k = Math.ceil(j.lo); k <= Math.floor(j.hi); k++) out.push(k);
    return out;
  }
  var tocando = false, ultimo = 0, raf = 0, cache = {}, cacheTr = {};

  function val() {
    return { h: parseFloat(sH.value), a: parseFloat(rA.value), s: parseFloat(sS.value), t: parseFloat(rT.value) };
  }
  function dist(v) {
    var k = v.h + "|" + v.a + "|" + v.s + "|" + Math.round(v.t / (v.h * v.h * v.s / (2 * D)));
    if (!cache[k]) cache[k] = F.distribuicao(v.h, v.t, v.a, v.s);
    return cache[k];
  }
  function tr(v) {
    var k = v.h + "|" + v.a + "|" + v.s;
    if (!cacheTr[k]) cacheTr[k] = F.trajetorias(v.h, TMAX, v.a, v.s, 7, 20240501);
    return cacheTr[k];
  }
  function fmt(n, d) { return (Math.abs(n) < 5e-5 ? 0 : n).toFixed(d == null ? 2 : d).replace(".", ",").replace("-", "−"); }
  function css(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function cores() { return { ink: css("--ink"), soft: css("--ink-soft"), rule: css("--rule"), carac: css("--carac"), choque: css("--choque"), paper: css("--paper") }; }
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
  function eixoX(ctx, cx, Xf, marcas, col) {
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.fillStyle = col.soft;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    marcas.forEach(function (x) {
      var px = Math.round(Xf(x)) + .5;
      ctx.beginPath(); ctx.moveTo(px, cx.tp); ctx.lineTo(px, cx.tp + cx.h); ctx.stroke();
      ctx.fillText(fmt(x, 0), px, cx.tp + cx.h + 6);
    });
  }

  function painelDist(v, d, col) {
    var S = prep(cD), ctx = S.ctx, cx = { l: 34, tp: 14, w: S.w - 34 - 14, h: S.h - 14 - 26 };
    var i, topo = 0, j = janela(v.a);
    for (i = 0; i < d.xs.length; i++) if (d.xs[i] >= j.lo && d.xs[i] <= j.hi) topo = Math.max(topo, d.P[i] / v.h);
    topo = Math.max(topo, F.gaussiana(v.a * d.t, d.t, v.a)) * 1.25;
    var Xf = function (x) { return cx.l + (x - j.lo) / (j.hi - j.lo) * cx.w; };
    var Yf = function (y) { return cx.tp + (1 - y / topo) * cx.h; };
    eixoX(ctx, cx, Xf, marcas(j), col);
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;                                  // linha de base
    ctx.beginPath(); ctx.moveTo(cx.l, Yf(0) + .5); ctx.lineTo(cx.l + cx.w, Yf(0) + .5); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.rect(cx.l, cx.tp - 2, cx.w, cx.h + 4); ctx.clip();
    var larg = Math.max(1.2, Xf(j.lo + v.h) - Xf(j.lo) - 1.2);                      // barras: a distribuição exata
    ctx.fillStyle = alpha(col.carac, .45); ctx.strokeStyle = alpha(col.carac, .9); ctx.lineWidth = 1;
    for (i = 0; i < d.xs.length; i++) {
      var y = d.P[i] / v.h; if (!y || d.xs[i] < j.lo - v.h || d.xs[i] > j.hi + v.h) continue;
      ctx.fillRect(Xf(d.xs[i]) - larg / 2, Yf(y), larg, Yf(0) - Yf(y));
    }
    ctx.strokeStyle = col.ink; ctx.lineWidth = 2.4; ctx.beginPath();                 // a gaussiana
    for (i = 0; i <= 300; i++) {
      var x = j.lo + (j.hi - j.lo) * i / 300, py = Yf(F.gaussiana(x, d.t, v.a));
      if (i) ctx.lineTo(Xf(x), py); else ctx.moveTo(Xf(x), py);
    }
    ctx.stroke(); ctx.restore();
    ctx.fillStyle = col.ink; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText("ρ", cx.l + 6, 0);
    ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText("x", S.w - 4, S.h - 2);
  }

  function painelTraj(v, d, col) {
    var S = prep(cT), ctx = S.ctx, cx = { l: 34, tp: 14, w: S.w - 34 - 14, h: S.h - 14 - 26 };
    var T = tr(v), i, k, j = janela(v.a);
    var Xf = function (t) { return cx.l + t / TMAX * cx.w; };
    var Yf = function (x) { return cx.tp + (1 - (x - j.lo) / (j.hi - j.lo)) * cx.h; };
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.fillStyle = col.soft;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    [0, 0.5, 1, 1.5, 2].forEach(function (t) {
      var px = Math.round(Xf(t)) + .5;
      ctx.beginPath(); ctx.moveTo(px, cx.tp); ctx.lineTo(px, cx.tp + cx.h); ctx.stroke();
      ctx.fillText(fmt(t, 1), px, cx.tp + cx.h + 6);
    });
    ctx.save(); ctx.beginPath(); ctx.rect(cx.l, cx.tp - 2, cx.w, cx.h + 4); ctx.clip();
    ctx.beginPath();                                                                 // faixa a t ± √(2Dt)
    for (i = 0; i <= 200; i++) { var t1 = TMAX * i / 200; ctx.lineTo(Xf(t1), Yf(v.a * t1 + Math.sqrt(2 * D * t1))); }
    for (i = 200; i >= 0; i--) { var t2 = TMAX * i / 200; ctx.lineTo(Xf(t2), Yf(v.a * t2 - Math.sqrt(2 * D * t2))); }
    ctx.closePath(); ctx.fillStyle = alpha(col.carac, .15); ctx.fill();
    ctx.strokeStyle = alpha(col.carac, .8); ctx.lineWidth = 1.4; ctx.setLineDash([5, 4]);
    ctx.beginPath();                                                                 // a média a t
    ctx.moveTo(Xf(0), Yf(0)); ctx.lineTo(Xf(TMAX), Yf(v.a * TMAX)); ctx.stroke(); ctx.setLineDash([]);
    var nAte = Math.min(T.n, Math.max(1, Math.round(d.t / T.tau)));
    for (k = 0; k < T.caminhos.length; k++) {                                        // as trajetórias
      var c = T.caminhos[k];
      ctx.strokeStyle = alpha(col.soft, .35); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(Xf(0), Yf(0));
      for (i = 1; i <= T.n; i++) ctx.lineTo(Xf(i * T.tau), Yf(c[i]));
      ctx.stroke();
      ctx.strokeStyle = alpha(col.ink, .8); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(Xf(0), Yf(0));
      for (i = 1; i <= nAte; i++) ctx.lineTo(Xf(i * T.tau), Yf(c[i]));
      ctx.stroke();
    }
    ctx.strokeStyle = col.choque; ctx.lineWidth = 1.8;                               // o instante mostrado ao lado
    var pt = Math.round(Xf(d.t)) + .5;
    ctx.beginPath(); ctx.moveTo(pt, cx.tp); ctx.lineTo(pt, cx.tp + cx.h); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = col.ink; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText("x", cx.l + 6, 0);
    ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText("t", S.w - 4, S.h - 2);
  }

  function desenha() {
    var v = val(), col = cores(), d = dist(v), m = F.momentos(d), err = F.erroDensidade(d, v.a);
    oT.textContent = fmt(v.t); oA.textContent = fmt(v.a, 2);
    painelDist(v, d, col); painelTraj(v, d, col);
    var txt = "<span>n = <b>" + d.n + "</b> passos de τ = " + fmt(d.tau, 4) + "</span>"
            + "<span>t = nτ = <b>" + fmt(d.t, 3) + "</b></span>"
            + "<span>média <b>" + fmt(m.media, 3) + "</b> (a t = " + fmt(v.a * d.t, 3) + ")</span>"
            + "<span>variância <b>" + fmt(m.var, 3) + "</b> (2Dt = " + fmt(2 * D * d.t, 3) + ")</span>"
            + "<span>erro máx. na densidade <b>" + err.toExponential(1).replace(".", ",") + "</b></span>";
    if (v.s === 1) txt += "<span><b>sem preguiça</b>: a paridade deixa metade dos sítios vazia, e refinar não adianta</span>";
    read.innerHTML = txt;
  }
  function agenda() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; desenha(); }); }
  [sH, rA, sS, rT].forEach(function (el) { el.addEventListener("input", agenda); });
  btn.addEventListener("click", function () {
    tocando = !tocando; btn.textContent = tocando ? "⏸ Pausar" : "▶ Animar";
    if (tocando) { ultimo = 0; requestAnimationFrame(passo); }
  });
  function passo(ts) {
    if (!tocando) return;
    if (ultimo) {
      var t = parseFloat(rT.value) + (ts - ultimo) / 1000 * 0.45;
      rT.value = t >= TMAX ? 0.05 : t;
      desenha();
    }
    ultimo = ts; requestAnimationFrame(passo);
  }
  window.addEventListener("resize", agenda);
  if ("ResizeObserver" in window) new ResizeObserver(agenda).observe(root);
  document.addEventListener("themechange", agenda);
  desenha();
})();
