/* Demo: anel de N vértices contra a equação do calor u_t = k u_xx (limite contínuo).  Depende de grafo-core.js.
 * Esquerda: o anel (cor = u). Direita: u_j (pontos) e a solução exata do limite contínuo (curva). */
(function () {
  "use strict";
  var K = window.GrafoCore, root = document.getElementById("demo-anel");
  if (!K || !root) return;

  var $ = function (id) { return document.getElementById(id); };
  var rN = $("a-N"), oN = $("a-Nv"), rT = $("a-t"), oT = $("a-tv"), btn = $("a-play"), read = $("a-readout"), cR = $("a-anel-canvas"), cP = $("a-perfil-canvas");
  var ELL = 2 * Math.PI, KD = 0.2, S = 0.5, TMAX = 3, t = 0.6, playing = false, lastTs = 0, raf = 0;

  function fmt(n, d) { return n.toFixed(d == null ? 2 : d).replace(".", ",").replace("-", "−"); }
  function css(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function colors() { return { ink: css("--ink"), soft: css("--ink-soft"), rule: css("--rule"), carac: css("--carac"), choque: css("--choque"), paper: css("--paper") }; }
  function setup(canvas) {
    var dpr = window.devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    var ctx = canvas.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    return { ctx: ctx, w: w, h: h };
  }
  function mix(a, b, f) {
    function p(h) { h = h.replace("#", ""); if (h.length === 3) h = h.replace(/./g, "$&$&"); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
    var A = p(a), B = p(b); if (A.some(isNaN) || B.some(isNaN)) return b;
    return "rgb(" + A.map(function (x, i) { return Math.round(x + (B[i] - x) * f); }).join(",") + ")";
  }

  function solve(N) {
    var h = ELL / N, c = KD / (h * h), x = [], u0 = [], j;
    for (j = 0; j < N; j++) { x.push(j * h); u0.push(K.gauss(j * h, ELL, S)); }
    return { N: N, h: h, c: c, x: x, u0: u0, u: K.ringSolve(u0, c, t) };
  }

  function drawRing(R, col) {
    var P = setup(cR), ctx = P.ctx, cx = P.w / 2, cy = P.h / 2, rad = Math.min(P.w, P.h) * 0.36, j;
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, 6.2832); ctx.stroke();
    var dot = Math.max(3, Math.min(14, 2 * Math.PI * rad / R.N * 0.42));
    for (j = 0; j < R.N; j++) {
      var a = 2 * Math.PI * j / R.N - Math.PI / 2 + Math.PI, px = cx + rad * Math.cos(a), py = cy + rad * Math.sin(a), f = Math.pow(Math.min(1, Math.max(0, R.u[j])), 0.7);
      ctx.fillStyle = mix(col.paper, col.choque, f); ctx.strokeStyle = col.ink; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(px, py, dot, 0, 6.2832); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = col.soft; ctx.font = "12px sans-serif"; ctx.textAlign = "center"; ctx.fillText("anel com N = " + R.N + " vértices", cx, P.h - 6);
  }

  function drawProfile(R, col) {
    var P = setup(cP), ctx = P.ctx, l = 44, r = 12, tp = 12, b = 30, w = P.w - l - r, h = P.h - tp - b;
    var X = function (x) { return l + x / ELL * w; }, Y = function (v) { return tp + (1 - (v + 0.05) / 1.1) * h; };
    ctx.font = "12px sans-serif"; ctx.strokeStyle = col.rule; ctx.fillStyle = col.soft; ctx.lineWidth = 1; ctx.textAlign = "center"; ctx.textBaseline = "top";
    [0, 1, 2, 3, 4, 5, 6].forEach(function (v) { var px = Math.round(X(v)) + 0.5; ctx.beginPath(); ctx.moveTo(px, tp); ctx.lineTo(px, tp + h); ctx.stroke(); ctx.fillText(String(v), px, tp + h + 6); });
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    [0, 0.25, 0.5, 0.75, 1].forEach(function (v) { var py = Math.round(Y(v)) + 0.5; ctx.beginPath(); ctx.moveTo(l, py); ctx.lineTo(l + w, py); ctx.stroke(); ctx.fillText(fmt(v), l - 6, py); });
    ctx.fillStyle = col.ink; ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText("x", P.w - r, P.h - 2);
    ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText("u", l + 6, 0);
    ctx.save(); ctx.beginPath(); ctx.rect(l, tp - 2, w, h + 4); ctx.clip();
    // dado inicial (tracejado) e solução exata do contínuo
    ctx.strokeStyle = col.soft; ctx.lineWidth = 1.2; ctx.setLineDash([3, 4]); ctx.beginPath();
    for (var i = 0; i <= 200; i++) { var x = ELL * i / 200, y = Y(K.gauss(x, ELL, S)); if (i) ctx.lineTo(X(x), y); else ctx.moveTo(X(x), y); } ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = col.ink; ctx.lineWidth = 2.8; ctx.beginPath();
    for (i = 0; i <= 200; i++) { x = ELL * i / 200; y = Y(K.contU(x, t, KD, ELL, S)); if (i) ctx.lineTo(X(x), y); else ctx.moveTo(X(x), y); } ctx.stroke();
    ctx.fillStyle = col.choque; ctx.strokeStyle = col.paper; ctx.lineWidth = 1;
    var rad = Math.max(2.5, Math.min(5, w / R.N / 2.2));
    for (var j = 0; j < R.N; j++) { ctx.beginPath(); ctx.arc(X(R.x[j]), Y(R.u[j]), rad, 0, 6.2832); ctx.fill(); ctx.stroke(); }
    ctx.restore();
  }

  function draw() {
    var N = Math.round(parseFloat(rN.value)), R = solve(N), col = colors(), err = 0, j;
    oN.textContent = String(N); oT.textContent = fmt(t);
    for (j = 0; j < N; j++) err = Math.max(err, Math.abs(R.u[j] - K.contU(R.x[j], t, KD, ELL, S)));
    drawRing(R, col); drawProfile(R, col);
    read.innerHTML = "<span>N = <b>" + N + "</b>, h = <b>" + fmt(R.h, 3) + "</b></span><span>c = k/h² = <b>" + fmt(R.c, 1) + "</b></span>" +
      "<span>maior diferença para o contínuo: <b>" + (err < 1e-3 ? err.toExponential(1).replace(".", ",") : fmt(err, 3)) + "</b></span>" +
      "<span>λ<sub>max</sub> de cL = 4c = <b>" + fmt(4 * R.c, 1) + "</b></span>";
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; draw(); }); }

  rN.addEventListener("input", schedule);
  rT.addEventListener("input", function () { t = parseFloat(rT.value); schedule(); });
  btn.addEventListener("click", function () {
    playing = !playing; btn.textContent = playing ? "⏸ Pausar" : "▶ Animar";
    if (playing) { if (t >= TMAX - 1e-6) t = 0; lastTs = 0; requestAnimationFrame(tick); }
  });
  function tick(ts) {
    if (!playing) return;
    if (lastTs) t = Math.min(TMAX, t + (ts - lastTs) / 1000 * 0.4);
    lastTs = ts; rT.value = t; draw();
    if (t >= TMAX - 1e-6) { playing = false; btn.textContent = "▶ Animar"; return; }
    requestAnimationFrame(tick);
  }
  window.addEventListener("resize", schedule);
  if ("ResizeObserver" in window) new ResizeObserver(schedule).observe(root);
  document.addEventListener("themechange", schedule);

  rN.value = 8; rT.value = t; schedule();
})();
