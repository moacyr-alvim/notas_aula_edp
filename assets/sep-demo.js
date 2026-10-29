/* Demo da separação de variáveis (calor numa barra [0, π], pontas a 0, k = 1).  Depende de sep-core.js.
 * Esquerda: u(x,t) como soma dos N primeiros modos (cheio) e o dado inicial (tracejado).
 * Direita: as amplitudes a_n(t) = b_n e^{−n²t} de cada modo (barras) e as iniciais b_n (contorno). */
(function () {
  "use strict";
  var S = window.SepCore, root = document.getElementById("demo-sep");
  if (!S || !root) return;
  var $ = function (id) { return document.getElementById(id); };
  var sel = $("sv-preset"), rN = $("sv-n"), oN = $("sv-nv"), rT = $("sv-t"), oT = $("sv-tv"), btn = $("sv-play"),
      read = $("sv-readout"), cU = $("sv-u-canvas"), cA = $("sv-a-canvas");
  var TMAX = 2, NMAX = 16, t = 0.05, playing = false, lastTs = 0, raf = 0;

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

  function drawU(P, N, col) {
    var S0 = setup(cU), ctx = S0.ctx, l = 44, r = 12, tp = 14, b = 32, w = S0.w - l - r, h = S0.h - tp - b, top = 1.3, bot = -0.3;
    var Xf = function (x) { return l + x / Math.PI * w; }, Yf = function (v) { return tp + (1 - (v - bot) / (top - bot)) * h; };
    ctx.font = "12px sans-serif"; ctx.strokeStyle = col.rule; ctx.fillStyle = col.soft; ctx.lineWidth = 1; ctx.textAlign = "center"; ctx.textBaseline = "top";
    [[0, "0"], [Math.PI / 2, "π/2"], [Math.PI, "π"]].forEach(function (q) { var px = Math.round(Xf(q[0])) + 0.5; ctx.beginPath(); ctx.moveTo(px, tp); ctx.lineTo(px, tp + h); ctx.stroke(); ctx.fillText(q[1], px, tp + h + 6); });
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    [0, 0.5, 1].forEach(function (y) { var py = Math.round(Yf(y)) + 0.5; ctx.beginPath(); ctx.moveTo(l, py); ctx.lineTo(l + w, py); ctx.stroke(); ctx.fillText(fmt(y, 1), l - 6, py); });
    ctx.fillStyle = col.ink; ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText("x", S0.w - r, S0.h - 2);
    ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText("u", l + 6, 0);
    ctx.save(); ctx.beginPath(); ctx.rect(l, tp - 2, w, h + 4); ctx.clip();
    function curve(fn, style, lw, dash) {
      ctx.strokeStyle = style; ctx.lineWidth = lw; ctx.setLineDash(dash || []); ctx.beginPath();
      for (var i = 0; i <= 400; i++) { var x = Math.PI * i / 400, y = Yf(fn(x)); if (i) ctx.lineTo(Xf(x), y); else ctx.moveTo(Xf(x), y); }
      ctx.stroke(); ctx.setLineDash([]);
    }
    curve(P.f, col.soft, 1.2, [3, 4]);
    curve(function (x) { return S.u(P, 1, x, t); }, alpha(col.carac, 0.8), 1.5, [6, 3]);
    curve(function (x) { return S.u(P, N, x, t); }, col.ink, 2.8);
    ctx.restore();
  }

  function drawA(P, N, col) {
    var S0 = setup(cA), ctx = S0.ctx, l = 44, r = 12, tp = 14, b = 32, w = S0.w - l - r, h = S0.h - tp - b, top = 1.4, bot = -0.5;
    var Xf = function (n) { return l + (n - 0.5) / NMAX * w; }, Yf = function (v) { return tp + (1 - (v - bot) / (top - bot)) * h; };
    ctx.font = "12px sans-serif"; ctx.strokeStyle = col.rule; ctx.fillStyle = col.soft; ctx.lineWidth = 1; ctx.textAlign = "right"; ctx.textBaseline = "middle";
    [-0.5, 0, 0.5, 1].forEach(function (y) { var py = Math.round(Yf(y)) + 0.5; ctx.beginPath(); ctx.moveTo(l, py); ctx.lineTo(l + w, py); ctx.stroke(); ctx.fillText(fmt(y, 1), l - 6, py); });
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (var n = 1; n <= NMAX; n++) if (n === 1 || n % 5 === 0) ctx.fillText(String(n), Xf(n), tp + h + 6);
    ctx.fillStyle = col.ink; ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText("n", S0.w - r, S0.h - 2);
    ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText("amplitude do modo n", l + 6, 0);
    var bw = w / NMAX * 0.6;
    for (n = 1; n <= NMAX; n++) {
      var b0 = P.b(n), a = S.amp(P, n, t), x0 = Xf(n) - bw / 2;
      ctx.strokeStyle = col.soft; ctx.lineWidth = 1; ctx.setLineDash([2, 3]); ctx.strokeRect(x0 + 0.5, Math.min(Yf(0), Yf(b0)) + 0.5, bw, Math.abs(Yf(b0) - Yf(0)));
      ctx.setLineDash([]);
      ctx.fillStyle = n <= N ? (a >= 0 ? col.carac : col.choque) : alpha(col.soft, 0.35);
      ctx.fillRect(x0, Math.min(Yf(0), Yf(a)), bw, Math.max(1, Math.abs(Yf(a) - Yf(0))));
    }
  }

  function draw() {
    var P = S.PERFIS[sel.value], N = parseInt(rN.value, 10), col = colors();
    oN.textContent = String(N); oT.textContent = fmt(t);
    drawU(P, N, col); drawA(P, N, col);
    var E0 = S.energia(P, 400, 0), E = S.energia(P, 400, t);
    read.innerHTML = "<span>t = <b>" + fmt(t) + "</b></span><span>u(π/2, t) = <b>" + fmt(S.u(P, N, Math.PI / 2, t), 3) + "</b></span>" +
      "<span>energia restante: <b>" + fmt(100 * E / E0, 1) + "%</b></span><span>modo 1 vale <b>" + fmt(S.amp(P, 1, t), 3) + "</b>; modo 3 vale <b>" + fmt(S.amp(P, 3, t), 4) + "</b></span>";
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; draw(); }); }
  [sel, rN].forEach(function (el) { el.addEventListener("input", schedule); });
  rT.addEventListener("input", function () { t = parseFloat(rT.value); schedule(); });
  btn.addEventListener("click", function () {
    playing = !playing; btn.textContent = playing ? "⏸ Pausar" : "▶ Animar";
    if (playing) { if (t >= TMAX - 1e-6) t = 0; lastTs = 0; requestAnimationFrame(tick); }
  });
  function tick(ts) {
    if (!playing) return;
    if (lastTs) t = Math.min(TMAX, t + (ts - lastTs) / 1000 * 0.25);
    lastTs = ts; rT.value = t; draw();
    if (t >= TMAX - 1e-6) { playing = false; btn.textContent = "▶ Animar"; return; }
    requestAnimationFrame(tick);
  }
  window.addEventListener("resize", schedule);
  if ("ResizeObserver" in window) new ResizeObserver(schedule).observe(root);
  document.addEventListener("themechange", schedule);
  rT.value = t; schedule();
})();
