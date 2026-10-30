/* Demo das séries de Fourier.  Depende de sf-core.js.
 * Esquerda: f (tracejada) e a soma parcial S_N (cheia), com o excesso de Gibbs à vista nos saltos.
 * Direita: o espectro |c_n| em escala log-log, com as retas de referência 1/n e 1/n². */
(function () {
  "use strict";
  var S = window.SFCore, root = document.getElementById("demo-sf");
  if (!S || !root) return;
  var $ = function (id) { return document.getElementById(id); };
  var sel = $("sf-dado"), rN = $("sf-n"), oN = $("sf-nv"), btn = $("sf-play"),
      read = $("sf-readout"), cP = $("sf-perfil"), cE = $("sf-espectro");
  var PI = Math.PI, NMAX = 120, tocando = false, ultimo = 0, raf = 0;

  Object.keys(S.DADOS).forEach(function (k) {
    var o = document.createElement("option"); o.value = k; o.textContent = S.DADOS[k].label; sel.appendChild(o);
  });
  sel.value = "quadrada";

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
  function moldura(S2, cx, col, xt, yt, Xf, Yf, xl, yl, rotx, roty) {
    var ctx = S2.ctx;
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.fillStyle = col.soft;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    xt.forEach(function (v, i) { var px = Math.round(Xf(v)) + .5; ctx.beginPath(); ctx.moveTo(px, cx.tp); ctx.lineTo(px, cx.tp + cx.h); ctx.stroke(); ctx.fillText(rotx ? rotx[i] : fmt(v, 0), px, cx.tp + cx.h + 6); });
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    yt.forEach(function (v, i) { var py = Math.round(Yf(v)) + .5; ctx.beginPath(); ctx.moveTo(cx.l, py); ctx.lineTo(cx.l + cx.w, py); ctx.stroke(); ctx.fillText(roty ? roty[i] : fmt(v, 0), cx.l - 6, py); });
    ctx.fillStyle = col.ink; ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText(xl, S2.w - 4, S2.h - 2);
    ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(yl, cx.l + 4, 0);
  }

  function perfil(d, N, col) {
    var S2 = prep(cP), ctx = S2.ctx, cx = { l: 40, tp: 14, w: S2.w - 40 - 20, h: S2.h - 14 - 26 };
    var baixo = d.vista.lo, alto = d.vista.hi;
    var Xf = function (x) { return cx.l + (x + PI) / (2 * PI) * cx.w; }, Yf = function (u) { return cx.tp + (1 - (u - baixo) / (alto - baixo)) * cx.h; };
    moldura(S2, cx, col, [-PI, -PI / 2, 0, PI / 2, PI], d.vista.ticks, Xf, Yf, "x", "u", ["−π", "−π/2", "0", "π/2", "π"]);
    ctx.save(); ctx.beginPath(); ctx.rect(cx.l, cx.tp - 2, cx.w, cx.h + 4); ctx.clip();
    var M = 1400, i, x;
    ctx.strokeStyle = col.soft; ctx.lineWidth = 1.4; ctx.setLineDash([3, 4]); ctx.beginPath();  // f
    for (i = 0; i <= M; i++) {
      x = -PI + 2 * PI * i / M;
      if (d.salto && Math.abs(x) < 1e-9) { ctx.stroke(); ctx.beginPath(); continue; }
      var py = Yf(d.f(x));
      if (i === 0 || (d.salto && Math.abs(x - 2 * PI / M) < 1e-9)) ctx.moveTo(Xf(x), py); else ctx.lineTo(Xf(x), py);
    }
    ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = col.ink; ctx.lineWidth = 2.6; ctx.beginPath();                            // S_N
    for (i = 0; i <= M; i++) { x = -PI + 2 * PI * i / M; var q = Yf(d.S(x, N)); if (i) ctx.lineTo(Xf(x), q); else ctx.moveTo(Xf(x), q); }
    ctx.stroke();
    if (d.salto) {                                                                              // onde Gibbs mora
      ctx.strokeStyle = alpha(col.choque, .45); ctx.lineWidth = 1.2; ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.moveTo(Xf(0), cx.tp); ctx.lineTo(Xf(0), cx.tp + cx.h); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
  }

  function espectro(d, N, col) {
    var S2 = prep(cE), ctx = S2.ctx, cx = { l: 44, tp: 14, w: S2.w - 44 - 20, h: S2.h - 14 - 26 };
    var cmax = 1.6, cmin = 1e-4, lg = Math.log10;
    var Xf = function (n) { return cx.l + lg(n) / lg(NMAX) * cx.w; };
    var Yf = function (c) { return cx.tp + (lg(cmax) - lg(Math.max(c, cmin))) / (lg(cmax) - lg(cmin)) * cx.h; };
    moldura(S2, cx, col, [1, 10, 100], [1, 0.1, 0.01, 0.001, 0.0001], Xf, Yf, "n", "|cₙ|",
            ["1", "10", "100"], ["1", "10⁻¹", "10⁻²", "10⁻³", "10⁻⁴"]);
    ctx.save(); ctx.beginPath(); ctx.rect(cx.l, cx.tp - 2, cx.w, cx.h + 4); ctx.clip();
    [[1, "1/n"], [2, "1/n²"]].forEach(function (par) {                                          // referências
      ctx.strokeStyle = alpha(col.soft, .75); ctx.lineWidth = 1.2; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(Xf(1), Yf(1)); ctx.lineTo(Xf(NMAX), Yf(Math.pow(NMAX, -par[0]))); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = col.soft; ctx.textAlign = "right"; ctx.textBaseline = "bottom";
      ctx.fillText(par[1], Xf(NMAX) - 2, Yf(Math.pow(NMAX, -par[0])) - 3);
    });
    for (var n = 1; n <= NMAX; n++) {
      var c = d.cn(n); if (!c) continue;
      var dentro = n <= N;
      ctx.strokeStyle = dentro ? col.carac : alpha(col.soft, .45);
      ctx.lineWidth = dentro ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(Xf(n), Yf(cmin)); ctx.lineTo(Xf(n), Yf(c)); ctx.stroke();
      if (dentro && n <= 40) { ctx.fillStyle = col.carac; ctx.beginPath(); ctx.arc(Xf(n), Yf(c), 2.2, 0, 6.2832); ctx.fill(); }
    }
    ctx.restore();
  }

  function desenha() {
    var d = S.DADOS[sel.value], N = parseInt(rN.value, 10), col = cores();
    oN.textContent = String(N);
    perfil(d, N, col); espectro(d, N, col);
    var m = S.medidas(d, N, 3000), e = S.energia(d, N);
    var txt = "<span>termos até n = <b>" + N + "</b></span>"
            + "<span>energia capturada: <b>" + fmt(100 * e, 2) + "%</b></span>"
            + "<span>|cₙ| decai como <b>" + d.decai + "</b></span>";
    if (d.salto) txt += "<span>maior valor de S<sub>N</sub>: <b>" + fmt(m.maxS, 3) + "</b> (Gibbs)</span>";
    else txt += "<span>erro máximo: <b>" + fmt(m.erroMax, 4) + "</b></span>";
    read.innerHTML = txt;
  }
  function agenda() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; desenha(); }); }
  [sel, rN].forEach(function (el) { el.addEventListener("input", agenda); });
  btn.addEventListener("click", function () {
    tocando = !tocando; btn.textContent = tocando ? "⏸ Pausar" : "▶ Animar";
    if (tocando) { if (parseInt(rN.value, 10) >= NMAX) rN.value = 1; ultimo = 0; requestAnimationFrame(passo); }
  });
  function passo(ts) {
    if (!tocando) return;
    if (ultimo && ts - ultimo > 60) { rN.value = Math.min(NMAX, parseInt(rN.value, 10) + 1); ultimo = ts; desenha(); }
    if (!ultimo) ultimo = ts;
    if (parseInt(rN.value, 10) >= NMAX) { tocando = false; btn.textContent = "▶ Animar"; return; }
    requestAnimationFrame(passo);
  }
  window.addEventListener("resize", agenda);
  if ("ResizeObserver" in window) new ResizeObserver(agenda).observe(root);
  document.addEventListener("themechange", agenda);
  desenha();
})();
