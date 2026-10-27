/* Demo: convolução com o sinal "chutado" fora da janela — zeros (linear) ou periódico (circular).  Depende de conv-core.js.
 * Uma única área de desenho: o sinal estendido com a janela em destaque, o núcleo invertido, e a saída construída até j. */
(function () {
  "use strict";
  var K = window.ConvCore, root = document.getElementById("demo-conv");
  if (!K || !root) return;

  var $ = function (id) { return document.getElementById(id); };
  var selU = $("c-sinal"), selV = $("c-nucleo"), selM = $("c-modo"), rJ = $("c-j"), oJ = $("c-jv"), btn = $("c-play"), read = $("c-readout"), cv = $("c-conv-canvas");

  var SINAIS = {
    rampa:  { label: "rampa", u: [1, 2, 3, 4, 5, 6, 7, 8] },
    degrau: { label: "degrau", u: [0, 0, 0, 0, 4, 4, 4, 4] },
    pulso:  { label: "pulso (impulso)", u: [0, 0, 0, 4, 0, 0, 0, 0] }
  };
  var NUCLEOS = {
    media:  { label: "média de 3 (suaviza)", v: [1 / 3, 1 / 3, 1 / 3] },
    dif:    { label: "diferença (realça mudanças)", v: [1, -1] },
    eco:    { label: "eco", v: [1, 0, 0, 0.6] }
  };
  var j = 3, playing = false, lastTs = 0, raf = 0, acc = 0;

  function fmt(n, d) { return n.toFixed(d == null ? 2 : d).replace(".", ",").replace("-", "−"); }
  function css(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function colors() { return { ink: css("--ink"), soft: css("--ink-soft"), rule: css("--rule"), carac: css("--carac"), choque: css("--choque"), paper: css("--paper") }; }
  function setup(canvas) {
    var dpr = window.devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    var ctx = canvas.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    return { ctx: ctx, w: w, h: h };
  }
  Object.keys(SINAIS).forEach(function (k) { var o = document.createElement("option"); o.value = k; o.textContent = SINAIS[k].label; selU.appendChild(o); });
  Object.keys(NUCLEOS).forEach(function (k) { var o = document.createElement("option"); o.value = k; o.textContent = NUCLEOS[k].label; selV.appendChild(o); });
  [["zeros", "zeros fora da janela → convolução linear"], ["periodico", "cópias periódicas → convolução circular"]].forEach(function (p) {
    var o = document.createElement("option"); o.value = p[0]; o.textContent = p[1]; selM.appendChild(o);
  });

  function state() {
    var u = SINAIS[selU.value].u, v = NUCLEOS[selV.value].v, modo = selM.value, n = K.nSaida(u.length, v.length, modo);
    if (j > n - 1) j = n - 1;
    return { u: u, v: v, modo: modo, n: n, z: K.conv(u, v, modo), t: K.termos(u, v, j, modo) };
  }

  function draw() {
    var S = state(), C = colors(), P = setup(cv), ctx = P.ctx, N = S.u.length, M = S.v.length;
    rJ.max = S.n - 1; rJ.value = j; oJ.textContent = String(j);
    var lo = -(M - 1), hi = N + M - 2, cnt = hi - lo + 1, padL = 40, padR = 12, W = P.w - padL - padR, cw = W / cnt;
    var X = function (i) { return padL + (i - lo) * cw; };
    var vmax = 0; S.u.forEach(function (x) { vmax = Math.max(vmax, Math.abs(x)); }); S.z.forEach(function (x) { vmax = Math.max(vmax, Math.abs(x)); }); vmax = vmax || 1;
    var vk = 0; S.v.forEach(function (x) { vk = Math.max(vk, Math.abs(x)); }); vk = vk || 1;
    var blockH = (P.h - 8) / 3, rowH = blockH - 16 - 18, rows = [4 + 16, 4 + blockH + 16, 4 + 2 * blockH + 16];
    ctx.font = "12px sans-serif"; ctx.textBaseline = "middle";

    function baseline(r, label) {
      var y = rows[r] + rowH / 2; ctx.strokeStyle = C.rule; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + W, y); ctx.stroke();
      ctx.fillStyle = C.soft; ctx.textAlign = "left"; ctx.fillText(label, padL, rows[r] - 10);
      return y;
    }
    function bar(i, val, y0, fill, alpha, outline, escala) {
      var h = val / (escala || vmax) * (rowH / 2 - 2), x = X(i) + cw * 0.18, w = cw * 0.64;
      ctx.globalAlpha = alpha; ctx.fillStyle = fill; ctx.fillRect(x, h >= 0 ? y0 - h : y0, w, Math.abs(h) || 1.5); ctx.globalAlpha = 1;
      if (outline) { ctx.strokeStyle = outline; ctx.lineWidth = 1.2; ctx.strokeRect(x, h >= 0 ? y0 - h : y0, w, Math.abs(h) || 1.5); }
    }
    function ticks(y0) {
      ctx.fillStyle = C.soft; ctx.textAlign = "center"; ctx.textBaseline = "top";
      for (var i = lo; i <= hi; i++) ctx.fillText(String(i), X(i) + cw / 2, y0 + rowH / 2 + 2);
      ctx.textBaseline = "middle";
    }

    // linha 1: sinal estendido
    var y1 = baseline(0, "sinal estendido ũ");
    // faixa da janela atual: índices j−M+1 … j
    var wl = j - M + 1;
    ctx.fillStyle = C.choque; ctx.globalAlpha = 0.13; ctx.fillRect(X(wl), rows[0] - 4, M * cw, rowH + 8); ctx.globalAlpha = 1;
    for (var i = lo; i <= hi; i++) {
      var dentro = i >= 0 && i < N, val = K.ext(S.u, i, S.modo);
      if (dentro) bar(i, val, y1, C.carac, 1);
      else if (S.modo === "periodico") bar(i, val, y1, C.carac, 0.28);
      else { ctx.fillStyle = C.soft; ctx.textAlign = "center"; ctx.fillText("0", X(i) + cw / 2, y1 - 8); }
    }
    ticks(y1);
    // marca da janela original [0, N−1]
    ctx.strokeStyle = C.ink; ctx.setLineDash([4, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(X(0), rows[0] - 4); ctx.lineTo(X(0), rows[0] + rowH + 4); ctx.moveTo(X(N), rows[0] - 4); ctx.lineTo(X(N), rows[0] + rowH + 4); ctx.stroke(); ctx.setLineDash([]);

    // linha 2: núcleo invertido sobre a janela
    var y2 = baseline(1, "núcleo invertido (escala própria)");
    for (var l = 0; l < M; l++) {
      var xi = j - l, vv = S.v[l]; bar(xi, vv, y2, C.choque, 0.9, null, vk);
      ctx.fillStyle = C.ink; ctx.textAlign = "center"; ctx.fillText("v" + l + "=" + fmt(vv), X(xi) + cw / 2, rows[1] + rowH + 6);
    }

    // linha 3: saída
    var y3 = baseline(2, "saída z");
    for (var k = 0; k < S.n; k++) {
      var on = k <= j;
      bar(k, S.z[k], y3, on ? C.ink : C.rule, on ? 0.9 : 0.5, k === j ? C.choque : null);
    }
    ticks(y3);
    ctx.strokeStyle = C.choque; ctx.lineWidth = 1.5; ctx.globalAlpha = .6; ctx.beginPath(); ctx.moveTo(X(j) + cw / 2, rows[1] + rowH + 16); ctx.lineTo(X(j) + cw / 2, rows[2] - 4); ctx.stroke(); ctx.globalAlpha = 1;

    // leitura
    var parts = S.t.termos.map(function (t) { return "v" + t.l + "·ũ" + t.i + " = " + fmt(t.vl) + "·" + fmt(t.ui); });
    read.innerHTML = "<span>z<sub>" + j + "</sub> = Σ v<sub>l</sub> ũ<sub>j−l</sub> = <b>" + fmt(S.t.soma) + "</b></span>" +
      "<span>termos: " + parts.join(" + ") + "</span>" +
      "<span>" + (S.modo === "zeros" ? "saída com <b>" + S.n + "</b> valores (N + M − 1)" : "saída com <b>" + S.n + "</b> valores (N): os índices dão a volta") + "</span>";
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; draw(); }); }

  [selU, selV, selM].forEach(function (e) { e.addEventListener("change", function () { acc = 0; schedule(); }); });
  rJ.addEventListener("input", function () { j = Math.round(parseFloat(rJ.value)); schedule(); });
  btn.addEventListener("click", function () {
    playing = !playing; btn.textContent = playing ? "⏸ Pausar" : "▶ Animar";
    if (playing) { var S = state(); if (j >= S.n - 1) j = 0; lastTs = 0; acc = 0; requestAnimationFrame(tick); }
  });
  function tick(ts) {
    if (!playing) return;
    if (lastTs) acc += (ts - lastTs) / 1000 * 1.6; lastTs = ts;
    var S = state();
    while (acc >= 1) { acc -= 1; j = Math.min(S.n - 1, j + 1); }
    draw();
    if (j >= S.n - 1) { playing = false; btn.textContent = "▶ Animar"; return; }
    requestAnimationFrame(tick);
  }
  window.addEventListener("resize", schedule);
  if ("ResizeObserver" in window) new ResizeObserver(schedule).observe(root);
  document.addEventListener("themechange", schedule);

  selU.value = "rampa"; selV.value = "media"; selM.value = "zeros"; schedule();
})();
