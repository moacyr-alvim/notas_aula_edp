/* Demo da transformada de Fourier na reta.  Depende de tf-core.js.
 * Esquerda: f(x), com a faixa ±Δx.   Direita: û(k), com a faixa ±Δk.
 * Mexer na largura é uma gangorra: o que aperta de um lado alarga do outro. */
(function () {
  "use strict";
  var T = window.TFCore, root = document.getElementById("demo-tf");
  if (!T || !root) return;
  var $ = function (id) { return document.getElementById(id); };
  var sel = $("tf-forma"), rW = $("tf-w"), oW = $("tf-wv"), read = $("tf-readout"),
      cF = $("tf-f"), cK = $("tf-k");
  var XMAX = 6, KMAX = 12, raf = 0;
  var xs = [], ks = [], i;
  for (i = 0; i <= 600; i++) xs.push(-XMAX + 2 * XMAX * i / 600);
  for (i = 0; i <= 600; i++) ks.push(-KMAX + 2 * KMAX * i / 600);

  Object.keys(T.FORMAS).forEach(function (k) {
    var o = document.createElement("option"); o.value = k; o.textContent = T.FORMAS[k].label; sel.appendChild(o);
  });
  sel.value = "gaussiana";

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

  /* um painel: a curva, a faixa de largura, o eixo e o rótulo */
  function painel(cv, pts, lim, vals, larg, rotulo, eixo, col) {
    var S = prep(cv), ctx = S.ctx, cx = { l: 34, tp: 14, w: S.w - 34 - 14, h: S.h - 14 - 26 }, j;
    var alto = 0;
    for (j = 0; j < vals.length; j++) alto = Math.max(alto, Math.abs(vals[j]));
    var topo = alto * 1.18, base = -alto * 0.32;
    var X = function (x) { return cx.l + (x + lim) / (2 * lim) * cx.w; };
    var Y = function (y) { return cx.tp + (1 - (y - base) / (topo - base)) * cx.h; };
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.fillStyle = col.soft;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    var passo = lim > 8 ? 4 : lim > 3 ? 2 : 1;
    for (var x = -Math.floor(lim / passo) * passo; x <= lim; x += passo) {
      var px = Math.round(X(x)) + .5;
      ctx.beginPath(); ctx.moveTo(px, cx.tp); ctx.lineTo(px, cx.tp + cx.h); ctx.stroke();
      ctx.fillText(fmt(x, 0), px, cx.tp + cx.h + 6);
    }
    ctx.save(); ctx.beginPath(); ctx.rect(cx.l, cx.tp - 2, cx.w, cx.h + 4); ctx.clip();
    if (isFinite(larg)) {                                            // a faixa de largura
      ctx.fillStyle = alpha(col.carac, .15);
      ctx.fillRect(X(-larg), cx.tp, X(larg) - X(-larg), cx.h);
      ctx.strokeStyle = alpha(col.carac, .85); ctx.lineWidth = 1.4; ctx.setLineDash([5, 4]);
      [-larg, larg].forEach(function (v) {
        var p = Math.round(X(v)) + .5;
        ctx.beginPath(); ctx.moveTo(p, cx.tp); ctx.lineTo(p, cx.tp + cx.h); ctx.stroke();
      });
      ctx.setLineDash([]);
    }
    ctx.strokeStyle = alpha(col.soft, .7); ctx.lineWidth = 1;         // a linha do zero
    ctx.beginPath(); ctx.moveTo(cx.l, Math.round(Y(0)) + .5); ctx.lineTo(cx.l + cx.w, Math.round(Y(0)) + .5); ctx.stroke();
    ctx.strokeStyle = col.ink; ctx.lineWidth = 2.4; ctx.beginPath();  // a curva
    for (j = 0; j < pts.length; j++) { var py = Y(vals[j]); if (j) ctx.lineTo(X(pts[j]), py); else ctx.moveTo(X(pts[j]), py); }
    ctx.stroke(); ctx.restore();
    ctx.fillStyle = col.ink; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(rotulo, cx.l + 6, 0);
    ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText(eixo, S.w - 4, S.h - 2);
  }

  function desenha() {
    var nome = sel.value, w = parseFloat(rW.value), col = cores(), d = T.FORMAS[nome];
    oW.textContent = fmt(w, 2);
    var am = T.amostra(nome, w, xs, ks);
    painel(cF, xs, XMAX, am.fs, d.dx(w), "f", "x", col);
    painel(cK, ks, KMAX, am.Fs, d.dk(w), "û", "k", col);
    var dk = d.dk(w), prod = d.dx(w) * dk;
    read.innerHTML = "<span>Δx = <b>" + fmt(d.dx(w), 3) + "</b></span>"
      + "<span>Δk = <b>" + (isFinite(dk) ? fmt(dk, 3) : "∞") + "</b></span>"
      + "<span>Δx·Δk = <b>" + (isFinite(prod) ? fmt(prod, 4) : "∞") + "</b> (mínimo possível: 0,5)</span>"
      + (isFinite(dk) ? "" : "<span>o salto deixa uma cauda de ordem 1/k, gorda demais para a largura em k existir</span>");
  }
  function agenda() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; desenha(); }); }
  [sel, rW].forEach(function (el) { el.addEventListener("input", agenda); });
  window.addEventListener("resize", agenda);
  if ("ResizeObserver" in window) new ResizeObserver(agenda).observe(root);
  document.addEventListener("themechange", agenda);
  desenha();
})();
