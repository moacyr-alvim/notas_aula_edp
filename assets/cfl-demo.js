/* Demo: cone de dependência do esquema versus cone da equação (condição CFL).
 * Eixo horizontal em unidades de Δx; eixo vertical em passos de tempo.
 * O valor em P depende, no esquema, dos pontos a até N células de distância (N = número de passos);
 * na equação, depende do intervalo [-cT, cT] = [-λN, λN] células.
 */
(function () {
  "use strict";
  var cv = document.getElementById("cfl-canvas"), rng = document.getElementById("cfl-lam"),
      outL = document.getElementById("cfl-lamv"), read = document.getElementById("cfl-read");
  if (!cv) return;
  var N = 6, XM = 11;   // passos de tempo; meia-largura exibida (em células)

  function css(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function fmt(v) { return v.toFixed(2).replace(".", ","); }

  function draw() {
    var lam = parseFloat(rng.value), dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    var ctx = cv.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    var ink = css("--ink"), soft = css("--ink-soft"), rule = css("--rule"), carac = css("--carac"), bad = css("--choque");
    var l = 14, r = 14, t = 24, b = 34;
    var X = function (x) { return l + (x + XM) / (2 * XM) * (w - l - r); };
    var Y = function (j) { return h - b - j / N * (h - t - b); };

    // malha
    ctx.strokeStyle = rule; ctx.lineWidth = 1; ctx.fillStyle = soft; ctx.font = "12px sans-serif"; ctx.textAlign = "center";
    for (var j = 0; j <= N; j++) { ctx.beginPath(); ctx.moveTo(l, Math.round(Y(j)) + .5); ctx.lineTo(w - r, Math.round(Y(j)) + .5); ctx.stroke(); }
    for (var i = -XM; i <= XM; i++) { ctx.beginPath(); ctx.arc(X(i), Y(0), 2.2, 0, 6.2832); ctx.fill(); }
    ctx.fillStyle = ink; ctx.textAlign = "left"; ctx.fillText("passo j = 0", l + 2, Y(0) + 20);
    ctx.textAlign = "right"; ctx.fillText("passo " + N + "   (ponto P)", w - r, t - 8);

    // cone do esquema (cada passo alcança 1 célula para cada lado)
    ctx.fillStyle = carac; ctx.globalAlpha = 0.16;
    ctx.beginPath(); ctx.moveTo(X(0), Y(N)); ctx.lineTo(X(-N), Y(0)); ctx.lineTo(X(N), Y(0)); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = carac; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(X(-N), Y(0)); ctx.lineTo(X(0), Y(N)); ctx.lineTo(X(N), Y(0)); ctx.stroke();

    // cone da equação: características por P, a λ células por passo
    var edge = lam * N, ok = lam <= 1 + 1e-9, col = ok ? ink : bad;
    ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.setLineDash([7, 4]);
    ctx.beginPath(); ctx.moveTo(X(-edge), Y(0)); ctx.lineTo(X(0), Y(N)); ctx.lineTo(X(edge), Y(0)); ctx.stroke(); ctx.setLineDash([]);

    // trechos de dados que o esquema nunca vê
    if (!ok) {
      ctx.strokeStyle = bad; ctx.lineWidth = 6;
      [[-edge, -N], [N, edge]].forEach(function (s) { ctx.beginPath(); ctx.moveTo(X(Math.max(s[0], -XM)), Y(0)); ctx.lineTo(X(Math.min(s[1], XM)), Y(0)); ctx.stroke(); });
    }
    ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(X(0), Y(N), 4.5, 0, 6.2832); ctx.fill();

    rng.setAttribute("aria-valuetext", "lambda " + fmt(lam));
    outL.textContent = fmt(lam);
    read.innerHTML = ok
      ? "A equação usa os dados em [−" + fmt(edge) + "; " + fmt(edge) + "] células; o esquema enxerga [−" + N + "; " + N + "]. <b>O cone do esquema contém o da equação: a condição CFL vale.</b>"
      : "A equação usa os dados em [−" + fmt(edge) + "; " + fmt(edge) + "] células, mas o esquema só enxerga [−" + N + "; " + N + "]. <b style=\"color:var(--choque)\">Os trechos em vermilion influenciam a solução verdadeira e o esquema nunca os lê: CFL violada.</b>";
  }

  rng.addEventListener("input", draw);
  window.addEventListener("resize", draw);
  document.addEventListener("themechange", draw);
  if ("ResizeObserver" in window) new ResizeObserver(draw).observe(cv);
  draw();
})();
