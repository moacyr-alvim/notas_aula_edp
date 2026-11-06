/* Demo do calor na reta.  Depende de cr-core.js.
 * Esquerda: u(x,t) na reta, com o dado inicial tracejado e, se pedido, a mesma conta no círculo.
 * Direita: o espectro |û(k,t)| = |û₀(k)| e^{-Dk²t}, em escala logarítmica, com o multiplicador. */
(function () {
  "use strict";
  var C = window.CRCore, root = document.getElementById("demo-cr");
  if (!C || !root) return;
  var $ = function (id) { return document.getElementById(id); };
  var sel = $("cr-dado"), rT = $("cr-t"), oT = $("cr-tv"), sC = $("cr-circulo"),
      btn = $("cr-play"), read = $("cr-readout"), cU = $("cr-u"), cK = $("cr-k");
  var XMAX = 8, KMAX = 14, TMAX = 8, D = C.D0, PI = Math.PI;
  var tocando = false, ultimo = 0, raf = 0;
  var xs = [], ks = [], i;
  for (i = 0; i <= 700; i++) xs.push(-XMAX + 2 * XMAX * i / 700);
  for (i = 0; i <= 500; i++) ks.push(-KMAX + 2 * KMAX * i / 500);

  Object.keys(C.DADOS).forEach(function (k) {
    var o = document.createElement("option"); o.value = k; o.textContent = C.DADOS[k].label; sel.appendChild(o);
  });
  sel.value = "caixa";

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
  function curva(ctx, X, Y, pts, vals, larg, cor, tracos) {
    ctx.strokeStyle = cor; ctx.lineWidth = larg;
    ctx.setLineDash(tracos || []);
    ctx.beginPath();
    for (var j = 0; j < pts.length; j++) {
      var v = vals[j]; if (v === null || !isFinite(v)) continue;
      var py = Y(v); if (j) ctx.lineTo(X(pts[j]), py); else ctx.moveTo(X(pts[j]), py);
    }
    ctx.stroke(); ctx.setLineDash([]);
  }

  function painelU(d, t, circ, col) {
    var S = prep(cU), ctx = S.ctx, cx = { l: 34, tp: 14, w: S.w - 34 - 14, h: S.h - 14 - 26 }, j;
    var us = xs.map(function (x) { return d.u(x, t); });
    var alto = Math.max.apply(null, us.map(Math.abs));                /* a altura da solução, que vai ao mostrador */
    var topo = Math.min(d.f ? Math.max(alto, 1) : alto, 2.2) * 1.2;   /* a escala, que precisa caber o dado inicial */
    var X = function (x) { return cx.l + (x + XMAX) / (2 * XMAX) * cx.w; };
    var Y = function (y) { return cx.tp + (1 - y / topo) * cx.h; };
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.fillStyle = col.soft;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    [-8, -4, 0, 4, 8].forEach(function (x) {
      var px = Math.round(X(x)) + .5;
      ctx.beginPath(); ctx.moveTo(px, cx.tp); ctx.lineTo(px, cx.tp + cx.h); ctx.stroke();
      ctx.fillText(fmt(x, 0), px, cx.tp + cx.h + 6);
    });
    ctx.save(); ctx.beginPath(); ctx.rect(cx.l, cx.tp - 2, cx.w, cx.h + 4); ctx.clip();
    if (circ) {                                                       // as paredes de uma volta
      ctx.strokeStyle = alpha(col.soft, .5); ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
      [-PI, PI].forEach(function (x) { var p = Math.round(X(x)) + .5; ctx.beginPath(); ctx.moveTo(p, cx.tp); ctx.lineTo(p, cx.tp + cx.h); ctx.stroke(); });
      ctx.setLineDash([]);
    }
    ctx.strokeStyle = alpha(col.soft, .6); ctx.lineWidth = 1;          // o zero
    ctx.beginPath(); ctx.moveTo(cx.l, Math.round(Y(0)) + .5); ctx.lineTo(cx.l + cx.w, Math.round(Y(0)) + .5); ctx.stroke();
    if (d.f) curva(ctx, X, Y, xs, xs.map(d.f), 1.3, alpha(col.soft, .85), [4, 4]);   // o dado inicial
    if (circ && d.periodico) curva(ctx, X, Y, xs, xs.map(function (x) { return C.noCirculo(d, x, t); }), 2.2, col.choque);
    curva(ctx, X, Y, xs, us, 2.6, col.ink);                            // a solução na reta
    ctx.restore();
    ctx.fillStyle = col.ink; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText("u", cx.l + 6, 0);
    ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText("x", S.w - 4, S.h - 2);
    return alto;
  }

  function painelK(d, t, col) {
    var S = prep(cK), ctx = S.ctx, cx = { l: 34, tp: 14, w: S.w - 34 - 14, h: S.h - 14 - 26 };
    var LO = Math.log(1e-6), HI = Math.log(3);
    var X = function (k) { return cx.l + (k + KMAX) / (2 * KMAX) * cx.w; };
    var Y = function (v) { return cx.tp + (1 - (Math.log(Math.max(v, 1e-12)) - LO) / (HI - LO)) * cx.h; };
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.fillStyle = col.soft;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    [-12, -6, 0, 6, 12].forEach(function (k) {
      var px = Math.round(X(k)) + .5;
      ctx.beginPath(); ctx.moveTo(px, cx.tp); ctx.lineTo(px, cx.tp + cx.h); ctx.stroke();
      ctx.fillText(fmt(k, 0), px, cx.tp + cx.h + 6);
    });
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    [1, 1e-2, 1e-4, 1e-6].forEach(function (v) {                        // décadas
      var py = Math.round(Y(v)) + .5;
      ctx.strokeStyle = alpha(col.rule, .8); ctx.beginPath(); ctx.moveTo(cx.l, py); ctx.lineTo(cx.l + cx.w, py); ctx.stroke();
    });
    ctx.save(); ctx.beginPath(); ctx.rect(cx.l, cx.tp - 2, cx.w, cx.h + 4); ctx.clip();
    curva(ctx, X, Y, ks, ks.map(function (k) { return Math.exp(-D * k * k * t); }), 1.6, alpha(col.carac, .9), [5, 4]);
    if (d.F) curva(ctx, X, Y, ks, ks.map(function (k) { return C.espectro(d, k, t); }), 2.4, col.ink);
    ctx.restore();
    ctx.fillStyle = col.ink; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText("|û|", cx.l + 6, 0);
    ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText("k", S.w - 4, S.h - 2);
  }

  function desenha() {
    var d = C.DADOS[sel.value], t = parseFloat(rT.value), circ = sC && sC.value === "sim", col = cores();
    oT.textContent = fmt(t);
    var alto = painelU(d, t, circ, col);
    painelK(d, t, col);
    var larg = Math.sqrt(4 * D * t);
    var txt = "<span>t = <b>" + fmt(t) + "</b></span>"
            + "<span>largura √(4Dt) = <b>" + fmt(larg, 3) + "</b></span>"
            + "<span>altura máxima <b>" + fmt(alto, 3) + "</b></span>";
    if (circ && d.periodico) {
      var med = d.massa / C.PERIODO, dsv = 0;
      for (var x = -PI; x <= PI; x += 0.05) dsv = Math.max(dsv, Math.abs(C.noCirculo(d, x, t) - med));
      txt += "<span>no círculo: média <b>" + fmt(med, 3) + "</b>, maior desvio <b>" + fmt(dsv, 4) + "</b></span>";
    } else if (circ) {
      txt += "<span>o degrau não cabe num círculo: ele não é periódico nem integrável</span>";
    }
    if (!d.F) txt += "<span>o degrau não é integrável: sem espectro na reta, e à direita fica só o multiplicador e^(−Dk²t)</span>";
    read.innerHTML = txt;
  }
  function agenda() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; desenha(); }); }
  [sel, rT, sC].forEach(function (el) { if (el) el.addEventListener("input", agenda); });
  btn.addEventListener("click", function () {
    tocando = !tocando; btn.textContent = tocando ? "⏸ Pausar" : "▶ Animar";
    if (tocando) { ultimo = 0; requestAnimationFrame(passo); }
  });
  function passo(ts) {
    if (!tocando) return;
    if (ultimo) {
      var t = parseFloat(rT.value) * Math.exp((ts - ultimo) / 1000 * 0.7);   /* o tempo anda em escala multiplicativa */
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
