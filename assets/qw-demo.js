/* Demo do poço infinito.  Depende de qw-core.js.
 * Esquerda: |ψ(x,t)|², com o perfil inicial tracejado.
 * Direita: os níveis de energia E_n = n², com barras de ocupação |c_n|² (que não mudam com t). */
(function () {
  "use strict";
  var Q = window.QWCore, root = document.getElementById("demo-qw");
  if (!Q || !root) return;
  var $ = function (id) { return document.getElementById(id); };
  var sel = $("qw-estado"), rT = $("qw-t"), oT = $("qw-tv"), btn = $("qw-play"),
      bE = $("qw-espelho"), bR = $("qw-ressurg"), read = $("qw-readout"),
      cD = $("qw-dens"), cN = $("qw-niveis");
  var PI = Math.PI, TMAX = Q.RESSURG, tocando = false, ultimo = 0, raf = 0;
  var cache = {}, xs = [], i;
  for (i = 0; i <= 400; i++) xs.push(PI * i / 400);

  Object.keys(Q.ESTADOS).forEach(function (k) {
    var o = document.createElement("option"); o.value = k; o.textContent = Q.ESTADOS[k].label; sel.appendChild(o);
  });
  sel.value = "pacote";

  function coef() {
    var k = sel.value;
    if (!cache[k]) cache[k] = Q.coeficientes(Q.ESTADOS[k], 60, 1200);
    return cache[k];
  }
  function fmt(n, d) { return (Math.abs(n) < 5e-4 ? 0 : n).toFixed(d == null ? 2 : d).replace(".", ",").replace("-", "−"); }
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

  function densidade(c, t, col) {
    var S = prep(cD), ctx = S.ctx, cx = { l: 30, tp: 14, w: S.w - 30 - 16, h: S.h - 14 - 26 };
    var d0 = Q.densidade(c, xs, 0), d = Q.densidade(c, xs, t);
    var topo = Math.max.apply(null, d0) * 1.45;
    var Xf = function (x) { return cx.l + x / PI * cx.w; }, Yf = function (v) { return cx.tp + (1 - v / topo) * cx.h; };
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.fillStyle = col.soft;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    [[0, "0"], [PI / 2, "π/2"], [PI, "π"]].forEach(function (p) {
      var px = Math.round(Xf(p[0])) + .5;
      ctx.beginPath(); ctx.moveTo(px, cx.tp); ctx.lineTo(px, cx.tp + cx.h); ctx.stroke();
      ctx.fillText(p[1], px, cx.tp + cx.h + 6);
    });
    ctx.fillStyle = alpha(col.ink, .10); ctx.fillRect(cx.l, cx.tp, cx.w, cx.h);   // o poço
    ctx.strokeStyle = col.ink; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(Xf(0), cx.tp); ctx.lineTo(Xf(0), cx.tp + cx.h);
    ctx.moveTo(Xf(PI), cx.tp); ctx.lineTo(Xf(PI), cx.tp + cx.h); ctx.stroke();    // paredes
    ctx.save(); ctx.beginPath(); ctx.rect(cx.l, cx.tp - 2, cx.w, cx.h + 4); ctx.clip();
    ctx.strokeStyle = alpha(col.soft, .9); ctx.lineWidth = 1.4; ctx.setLineDash([3, 4]); ctx.beginPath();
    for (i = 0; i < xs.length; i++) { var y0 = Yf(d0[i]); if (i) ctx.lineTo(Xf(xs[i]), y0); else ctx.moveTo(Xf(xs[i]), y0); }
    ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(Xf(0), Yf(0));
    for (i = 0; i < xs.length; i++) ctx.lineTo(Xf(xs[i]), Yf(d[i]));
    ctx.lineTo(Xf(PI), Yf(0)); ctx.closePath();
    ctx.fillStyle = alpha(col.carac, .22); ctx.fill();
    ctx.strokeStyle = col.carac; ctx.lineWidth = 2.6; ctx.stroke();
    ctx.restore();
    ctx.fillStyle = col.ink; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText("|ψ|²", cx.l + 6, 0);
    ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText("x", S.w - 4, S.h - 2);
  }

  function niveis(c, col) {
    var S = prep(cN), ctx = S.ctx, cx = { l: 44, tp: 14, w: S.w - 44 - 16, h: S.h - 14 - 26 };
    var oc = Q.ocupacao(c), nmax = 4;
    for (i = 0; i < oc.length; i++) if (oc[i] > 0.004) nmax = Math.max(nmax, i + 3);
    nmax = Math.min(nmax, 14);
    var Emax = nmax * nmax * 1.05, omax = Math.max.apply(null, oc) * 1.05;
    var Yf = function (E) { return cx.tp + (1 - E / Emax) * cx.h; };
    var Xf = function (o) { return cx.l + (o / omax) * cx.w * 0.92; };
    ctx.fillStyle = col.soft; ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (var n = 1; n <= nmax; n++) {
      var py = Math.round(Yf(n * n)) + .5, o = oc[n - 1] || 0;
      ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx.l, py); ctx.lineTo(cx.l + cx.w, py); ctx.stroke();
      if (o > 1e-4) {
        ctx.strokeStyle = col.carac; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.moveTo(cx.l, py); ctx.lineTo(Xf(o), py); ctx.stroke();
      }
      if (nmax <= 10 || n % 2 === 0) { ctx.fillStyle = col.soft; ctx.fillText("n=" + n, cx.l - 6, py); }
    }
    ctx.fillStyle = col.ink; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText("E = n²", cx.l + 6, 0);
    ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText("ocupação |c_n|²", S.w - 4, S.h - 2);
  }

  function desenha() {
    var c = coef(), t = parseFloat(rT.value), col = cores();
    oT.textContent = fmt(t);
    densidade(c, t, col); niveis(c, col);
    var perto = function (a) { return Math.abs(t - a) < 0.02; };
    var txt = "<span>t = <b>" + fmt(t) + "</b></span>"
            + "<span>⟨E⟩ = <b>" + fmt(Q.energiaMedia(c), 2) + "</b></span>"
            + "<span>⟨x⟩ = <b>" + fmt(Q.posicaoMedia(c, t, 600), 3) + "</b></span>"
            + "<span>∫|ψ|² = <b>" + fmt(Q.norma(c), 3) + "</b></span>";
    if (perto(Q.RESSURG) || perto(0)) txt += "<span><b>ressurgimento</b>: ψ voltou a ser o estado inicial</span>";
    else if (perto(Q.ESPELHO)) txt += "<span><b>espelho</b>: o perfil é o inicial refletido em x = π/2</span>";
    read.innerHTML = txt;
  }
  function agenda() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; desenha(); }); }
  [sel, rT].forEach(function (el) { el.addEventListener("input", agenda); });
  bE.addEventListener("click", function () { rT.value = Q.ESPELHO; desenha(); });
  bR.addEventListener("click", function () { rT.value = Q.RESSURG; desenha(); });
  btn.addEventListener("click", function () {
    tocando = !tocando; btn.textContent = tocando ? "⏸ Pausar" : "▶ Animar";
    if (tocando) { ultimo = 0; requestAnimationFrame(passo); }
  });
  function passo(ts) {
    if (!tocando) return;
    if (ultimo) {
      var t = parseFloat(rT.value) + (ts - ultimo) / 1000 * 0.55;
      rT.value = t >= TMAX ? t - TMAX : t;                 /* o movimento é periódico: volta sozinho */
      desenha();
    }
    ultimo = ts; requestAnimationFrame(passo);
  }
  window.addEventListener("resize", agenda);
  if ("ResizeObserver" in window) new ResizeObserver(agenda).observe(root);
  document.addEventListener("themechange", agenda);
  desenha();
})();
