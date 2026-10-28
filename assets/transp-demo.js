/* Demo da equação de transporte.  Depende de transp-core.js.
 * Esquerda: diagrama x–t com a família de características (retas de inclinação 1/c), o ponto P e o pé da característica de P.
 * Direita: o perfil u(x,t) (cheio) e o dado inicial (tracejado): o desenho só desliza. */
(function () {
  "use strict";
  var T = window.TranspCore, root = document.getElementById("demo-transp");
  if (!T || !root) return;
  var $ = function (id) { return document.getElementById(id); };
  var sel = $("tr-preset"), selM = $("tr-modo"), rC = $("tr-c"), oC = $("tr-cv"), rT = $("tr-t"), oT = $("tr-tv"), rX = $("tr-x"), oX = $("tr-xv"),
      btn = $("tr-play"), read = $("tr-readout"), cD = $("tr-diag-canvas"), cP = $("tr-perfil-canvas");
  var X0 = -3, X1 = 9, TMAX = 4, t = 1.5, playing = false, lastTs = 0, raf = 0;

  function fmt(n, d) { return n.toFixed(d == null ? 2 : d).replace(".", ",").replace("-", "−"); }
  function css(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function colors() { return { ink: css("--ink"), soft: css("--ink-soft"), rule: css("--rule"), carac: css("--carac"), choque: css("--choque"), paper: css("--paper") }; }
  function setup(canvas) {
    var dpr = window.devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    var ctx = canvas.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    return { ctx: ctx, w: w, h: h };
  }
  function alpha(hex, a) {
    hex = hex.replace("#", ""); if (hex.length === 3) hex = hex.replace(/./g, "$&$&");
    var n = [0, 2, 4].map(function (i) { return parseInt(hex.substr(i, 2), 16); });
    return n.some(isNaN) ? hex : "rgba(" + n.join(",") + "," + a + ")";
  }
  function axes(ctx, S, l, tp, w, h, col, xl, yl, yticks, Xf, Yf) {
    ctx.font = "12px sans-serif"; ctx.strokeStyle = col.rule; ctx.fillStyle = col.soft; ctx.lineWidth = 1; ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (var v = 0; v <= 8; v += 4) { var px = Math.round(Xf(v)) + 0.5; ctx.beginPath(); ctx.moveTo(px, tp); ctx.lineTo(px, tp + h); ctx.stroke(); ctx.fillText(String(v), px, tp + h + 6); }
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    yticks.forEach(function (y) { var py = Math.round(Yf(y)) + 0.5; ctx.beginPath(); ctx.moveTo(l, py); ctx.lineTo(l + w, py); ctx.stroke(); ctx.fillText(fmt(y, y % 1 ? 1 : 0), l - 6, py); });
    ctx.fillStyle = col.ink; ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText(xl, S.w - 12, S.h - 2);
    ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(yl, l + 6, 0);
  }

  function drawDiagram(P, modo, c, xp, col) {
    var S = setup(cD), ctx = S.ctx, l = 40, r = 12, tp = 14, b = 32, w = S.w - l - r, h = S.h - tp - b;
    var Xf = function (x) { return l + (x - X0) / (X1 - X0) * w; }, Yf = function (s) { return tp + (1 - s / TMAX) * h; };
    axes(ctx, S, l, tp, w, h, col, "x", "t", [0, 1, 2, 3, 4], Xf, Yf);
    ctx.save(); ctx.beginPath(); ctx.rect(l, tp - 2, w, h + 4); ctx.clip();
    if (modo === "semi") { ctx.fillStyle = alpha(col.soft, 0.18); ctx.fillRect(l, tp, Xf(0) - l, h); }
    var cen = T.CENTRO[modo];
    // onde o dado inicial é não nulo e a faixa que ele varre
    ctx.fillStyle = alpha(col.choque, 0.10); ctx.beginPath();
    ctx.moveTo(Xf(cen - 1), Yf(0)); ctx.lineTo(Xf(cen - 1 + c * TMAX), Yf(TMAX)); ctx.lineTo(Xf(cen + 1 + c * TMAX), Yf(TMAX)); ctx.lineTo(Xf(cen + 1), Yf(0)); ctx.closePath(); ctx.fill();
    // família de características: x = x0 + ct
    ctx.strokeStyle = alpha(col.carac, 0.45); ctx.lineWidth = 1;
    for (var x0 = -12; x0 <= 10; x0 += 0.75) { ctx.beginPath(); ctx.moveTo(Xf(x0), Yf(0)); ctx.lineTo(Xf(x0 + c * TMAX), Yf(TMAX)); ctx.stroke(); }
    if (modo === "semi" && c > 0) {   // as que entram pelo contorno x = 0
      ctx.strokeStyle = alpha(col.choque, 0.55);
      for (var t0 = 0; t0 <= TMAX; t0 += 0.5) { ctx.beginPath(); ctx.moveTo(Xf(0), Yf(t0)); ctx.lineTo(Xf(c * (TMAX - t0)), Yf(TMAX)); ctx.stroke(); }
    }
    ctx.strokeStyle = col.soft; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(l, Yf(t)); ctx.lineTo(l + w, Yf(t)); ctx.stroke(); ctx.setLineDash([]);
    // característica de P, voltando até a origem do valor
    var o = T.origem(modo, c, xp, t);
    ctx.strokeStyle = col.carac; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(Xf(xp), Yf(t));
    if (o.tipo === "inicial") ctx.lineTo(Xf(o.x0), Yf(0)); else ctx.lineTo(Xf(0), Yf(o.t0));
    ctx.stroke();
    ctx.fillStyle = col.carac; ctx.beginPath();
    if (o.tipo === "inicial") ctx.arc(Xf(o.x0), Yf(0), 4.5, 0, 6.2832); else ctx.arc(Xf(0), Yf(o.t0), 4.5, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = col.choque; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(Xf(Math.max(cen - 1, modo === "semi" ? 0 : -99)), Yf(0) + 5); ctx.lineTo(Xf(cen + 1), Yf(0) + 5); ctx.stroke();
    ctx.fillStyle = col.ink; ctx.strokeStyle = col.paper; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(Xf(xp), Yf(t), 5, 0, 6.2832); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = col.ink; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.fillText("P", Xf(xp) + 8, Yf(t) - 4);
  }

  function drawProfile(P, modo, c, xp, col) {
    var S = setup(cP), ctx = S.ctx, l = 44, r = 12, tp = 14, b = 32, w = S.w - l - r, h = S.h - tp - b, top = 1.15, bot = -0.15;
    var Xf = function (x) { return l + (x - X0) / (X1 - X0) * w; }, Yf = function (v) { return tp + (1 - (v - bot) / (top - bot)) * h; };
    axes(ctx, S, l, tp, w, h, col, "x", "u", [0, 0.5, 1], Xf, Yf);
    ctx.save(); ctx.beginPath(); ctx.rect(l, tp - 2, w, h + 4); ctx.clip();
    var xmin = modo === "semi" ? 0 : X0;
    if (modo === "semi") { ctx.fillStyle = alpha(col.soft, 0.18); ctx.fillRect(l, tp, Xf(0) - l, h); }
    function curve(fn, style, lw, dash) {
      ctx.strokeStyle = style; ctx.lineWidth = lw; ctx.setLineDash(dash || []); ctx.beginPath();
      for (var i = 0; i <= 600; i++) { var x = xmin + (X1 - xmin) * i / 600, y = Yf(fn(x)); if (i) ctx.lineTo(Xf(x), y); else ctx.moveTo(Xf(x), y); }
      ctx.stroke(); ctx.setLineDash([]);
    }
    curve(function (x) { return P.f(x - T.CENTRO[modo]); }, col.soft, 1.2, [3, 4]);
    curve(function (x) { return T.u(P, modo, c, x, t); }, col.ink, 2.8);
    ctx.fillStyle = col.ink; ctx.strokeStyle = col.paper; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(Xf(xp), Yf(T.u(P, modo, c, xp, t)), 5, 0, 6.2832); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function draw() {
    var P = T.PERFIS[sel.value], modo = selM.value, c = parseFloat(rC.value), xp = parseFloat(rX.value), col = colors();
    if (modo === "semi" && xp < 0) { xp = 0; rX.value = 0; }
    rX.min = modo === "semi" ? 0 : -2;
    oC.textContent = fmt(c); oT.textContent = fmt(t); oX.textContent = fmt(xp, 1);
    drawDiagram(P, modo, c, xp, col); drawProfile(P, modo, c, xp, col);
    var o = T.origem(modo, c, xp, t), val = T.u(P, modo, c, xp, t);
    var de = o.tipo === "inicial" ? "pé da característica: x − ct = <b>" + fmt(o.x0) + "</b> (dado inicial)" : "vem do contorno: (0; <b>" + fmt(o.t0) + "</b>), u = h(<b>" + fmt(o.t0) + "</b>)";
    read.innerHTML = "<span>P = (<b>" + fmt(xp, 1) + "</b>; <b>" + fmt(t) + "</b>)</span><span>" + de + "</span><span>u(P) = <b>" + fmt(val, 3) + "</b></span>";
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; draw(); }); }
  [sel, selM, rC, rX].forEach(function (el) { el.addEventListener("input", schedule); });
  rT.addEventListener("input", function () { t = parseFloat(rT.value); schedule(); });
  btn.addEventListener("click", function () {
    playing = !playing; btn.textContent = playing ? "⏸ Pausar" : "▶ Animar";
    if (playing) { if (t >= TMAX - 1e-6) t = 0; lastTs = 0; requestAnimationFrame(tick); }
  });
  function tick(ts) {
    if (!playing) return;
    if (lastTs) t = Math.min(TMAX, t + (ts - lastTs) / 1000 * 0.6);
    lastTs = ts; rT.value = t; draw();
    if (t >= TMAX - 1e-6) { playing = false; btn.textContent = "▶ Animar"; return; }
    requestAnimationFrame(tick);
  }
  window.addEventListener("resize", schedule);
  if ("ResizeObserver" in window) new ResizeObserver(schedule).observe(root);
  document.addEventListener("themechange", schedule);
  rT.value = t; schedule();
})();
