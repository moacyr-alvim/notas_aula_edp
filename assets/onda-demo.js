/* Demo da equação da onda.  Depende de onda-core.js.
 * Esquerda: diagrama x–t (t para cima) com o ponto P, as duas características por P e o domínio de dependência no eixo t = 0.
 * Direita: o perfil u(x, t) no instante escolhido, com as partes que andam para a direita (azul) e para a esquerda (vermelho). */
(function () {
  "use strict";
  var O = window.OndaCore, root = document.getElementById("demo-onda");
  if (!O || !root) return;

  var $ = function (id) { return document.getElementById(id); };
  var sel = $("w-preset"), rC = $("w-c"), oC = $("w-cv"), rT = $("w-t"), oT = $("w-tv"), rX = $("w-x"), oX = $("w-xv"),
      btn = $("w-play"), read = $("w-readout"), cD = $("w-diag-canvas"), cP = $("w-perfil-canvas");
  var XM = 8, TMAX = 4, t = 1.2, playing = false, lastTs = 0, raf = 0;

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

  function drawDiagram(P, c, xp, col) {
    var S = setup(cD), ctx = S.ctx, l = 40, r = 12, tp = 14, b = 32, w = S.w - l - r, h = S.h - tp - b;
    var X = function (x) { return l + (x + XM) / (2 * XM) * w; }, Y = function (tt) { return tp + (1 - tt / TMAX) * h; };
    ctx.font = "12px sans-serif"; ctx.strokeStyle = col.rule; ctx.fillStyle = col.soft; ctx.lineWidth = 1;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (var v = -8; v <= 8; v += 4) { var px = Math.round(X(v)) + 0.5; ctx.beginPath(); ctx.moveTo(px, tp); ctx.lineTo(px, tp + h); ctx.stroke(); ctx.fillText(String(v).replace("-", "−"), px, tp + h + 6); }
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (var s = 0; s <= TMAX; s += 1) { var py = Math.round(Y(s)) + 0.5; ctx.beginPath(); ctx.moveTo(l, py); ctx.lineTo(l + w, py); ctx.stroke(); ctx.fillText(String(s), l - 6, py); }
    ctx.fillStyle = col.ink; ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText("x", S.w - r, S.h - 2);
    ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText("t", l + 6, 0);
    ctx.save(); ctx.beginPath(); ctx.rect(l, tp - 2, w, h + 4); ctx.clip();
    // região que o dado inicial consegue atingir (velocidade finita): trapézio
    var a0 = P.support[0], a1 = P.support[1];
    ctx.fillStyle = alpha(col.choque, 0.10); ctx.beginPath();
    ctx.moveTo(X(a0), Y(0)); ctx.lineTo(X(a0 - c * TMAX), Y(TMAX)); ctx.lineTo(X(a1 + c * TMAX), Y(TMAX)); ctx.lineTo(X(a1), Y(0)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = alpha(col.choque, 0.5); ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(X(a0), Y(0)); ctx.lineTo(X(a0 - c * TMAX), Y(TMAX)); ctx.moveTo(X(a1), Y(0)); ctx.lineTo(X(a1 + c * TMAX), Y(TMAX)); ctx.stroke(); ctx.setLineDash([]);
    // instante atual
    ctx.strokeStyle = col.soft; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(l, Y(t)); ctx.lineTo(l + w, Y(t)); ctx.stroke(); ctx.setLineDash([]);
    // cone de dependência de P e as duas características
    var d = O.dependencia(c, xp, t);
    ctx.fillStyle = alpha(col.carac, 0.14); ctx.beginPath(); ctx.moveTo(X(xp), Y(t)); ctx.lineTo(X(d[0]), Y(0)); ctx.lineTo(X(d[1]), Y(0)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = col.carac; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(d[0]), Y(0)); ctx.lineTo(X(xp), Y(t)); ctx.lineTo(X(d[1]), Y(0)); ctx.stroke();
    ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(X(d[0]), Y(0)); ctx.lineTo(X(d[1]), Y(0)); ctx.stroke();
    // onde o dado inicial é não nulo
    ctx.strokeStyle = col.choque; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(X(a0), Y(0) + 5); ctx.lineTo(X(a1), Y(0) + 5); ctx.stroke();
    ctx.fillStyle = col.ink; ctx.strokeStyle = col.paper; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(X(xp), Y(t), 5, 0, 6.2832); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = col.ink; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.fillText("P", X(xp) + 8, Y(t) - 4);
  }

  function drawProfile(P, c, xp, col) {
    var S = setup(cP), ctx = S.ctx, l = 44, r = 12, tp = 14, b = 32, w = S.w - l - r, h = S.h - tp - b;
    var top = P === O.PRESETS.martelada ? 1 / c + 0.1 : 1.1, bot = -0.15 * top;
    var X = function (x) { return l + (x + XM) / (2 * XM) * w; }, Y = function (v) { return tp + (1 - (v - bot) / (top - bot)) * h; };
    ctx.font = "12px sans-serif"; ctx.strokeStyle = col.rule; ctx.fillStyle = col.soft; ctx.lineWidth = 1; ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (var v = -8; v <= 8; v += 4) { var px = Math.round(X(v)) + 0.5; ctx.beginPath(); ctx.moveTo(px, tp); ctx.lineTo(px, tp + h); ctx.stroke(); ctx.fillText(String(v).replace("-", "−"), px, tp + h + 6); }
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    var ticks = P === O.PRESETS.martelada ? [0, 0.5, 1, 1.5, 2] : [0, 0.5, 1];
    ticks.forEach(function (y) { if (y > top) return; var py = Math.round(Y(y)) + 0.5; ctx.beginPath(); ctx.moveTo(l, py); ctx.lineTo(l + w, py); ctx.stroke(); ctx.fillText(fmt(y, 1), l - 6, py); });
    ctx.fillStyle = col.ink; ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText("x", S.w - r, S.h - 2);
    ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText("u", l + 6, 0);
    ctx.save(); ctx.beginPath(); ctx.rect(l, tp - 2, w, h + 4); ctx.clip();
    function curve(fn, style, lw, dash) {
      ctx.strokeStyle = style; ctx.lineWidth = lw; ctx.setLineDash(dash || []); ctx.beginPath();
      for (var i = 0; i <= 400; i++) { var x = -XM + 2 * XM * i / 400, y = Y(fn(x)); if (i) ctx.lineTo(X(x), y); else ctx.moveTo(X(x), y); }
      ctx.stroke(); ctx.setLineDash([]);
    }
    curve(function (x) { return P.f(x); }, col.soft, 1.2, [3, 4]);
    if (P.pieces) {
      curve(function (x) { return O.right(P, c, x, t); }, alpha(col.carac, 0.85), 1.6, [6, 3]);
      curve(function (x) { return O.left(P, c, x, t); }, alpha(col.choque, 0.85), 1.6, [6, 3]);
    }
    curve(function (x) { return O.u(P, c, x, t); }, col.ink, 2.8);
    ctx.fillStyle = col.ink; ctx.strokeStyle = col.paper; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(X(xp), Y(O.u(P, c, xp, t)), 5, 0, 6.2832); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function draw() {
    var P = O.PRESETS[sel.value], c = parseFloat(rC.value), xp = parseFloat(rX.value), col = colors();
    oC.textContent = fmt(c); oT.textContent = fmt(t); oX.textContent = fmt(xp, 1);
    drawDiagram(P, c, xp, col); drawProfile(P, c, xp, col);
    var d = O.dependencia(c, xp, t);
    read.innerHTML = "<span>P = (<b>" + fmt(xp, 1) + "</b>; <b>" + fmt(t) + "</b>)</span>" +
      "<span>depende dos dados em [x−ct, x+ct] = [<b>" + fmt(d[0]) + "</b>; <b>" + fmt(d[1]) + "</b>]</span>" +
      "<span>u(P) = <b>" + fmt(O.u(P, c, xp, t), 3) + "</b></span>";
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; draw(); }); }

  [sel, rC, rX].forEach(function (el) { el.addEventListener("input", schedule); });
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
