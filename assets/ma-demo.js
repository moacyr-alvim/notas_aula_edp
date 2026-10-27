/* Demo de Monge–Ampère: P1 e P2 em Γ; aparecem P (ponto médio), as duas características, ∇u(P) e a área.  Depende de ma-core.js.
 * P2 se arrasta sobre a curva (mouse, toque) ou pelos controles deslizantes. */
(function () {
  "use strict";
  var M = window.MACore, root = document.getElementById("demo-ma");
  if (!M || !root) return;

  var $ = function (id) { return document.getElementById(id); };
  var sel = $("m-curva"), r1 = $("m-s1"), r2 = $("m-s2"), o1 = $("m-s1v"), o2 = $("m-s2v"), read = $("m-readout"), cv = $("m-canvas");
  var s1 = 0, s2 = 0, curve, dragging = false, raf = 0, EPS = 0.03;

  Object.keys(M.CURVES).forEach(function (k) {
    var o = document.createElement("option"); o.value = k; o.textContent = M.CURVES[k].label; sel.appendChild(o);
  });

  function fmt(n, d) { return n.toFixed(d == null ? 2 : d).replace(".", ",").replace("-", "−"); }
  function css(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function alpha(hex, a) {
    hex = hex.replace("#", ""); if (hex.length === 3) hex = hex.replace(/./g, "$&$&");
    var n = [0, 2, 4].map(function (i) { return parseInt(hex.substr(i, 2), 16); });
    return n.some(isNaN) ? hex : "rgba(" + n.join(",") + "," + a + ")";
  }

  /* limites de s2 dado s1: s1 + EPS ≤ s2 ≤ s1 + span (parábola: dentro de [lo, hi]) */
  function s2range() { return curve.periodic ? [s1 + EPS, s1 + curve.span] : [s1 + EPS, curve.hi]; }
  function clampS2() { var r = s2range(); s2 = Math.min(r[1], Math.max(r[0], s2)); }

  function setCurve(k, keepS) {
    curve = M.CURVES[k];
    r1.min = curve.lo; r1.max = curve.periodic ? curve.hi : curve.hi - EPS * 2; r1.step = 0.01;
    if (!keepS) { s1 = curve.def[0]; s2 = curve.def[1]; }
    syncControls();
  }
  function syncControls() {
    clampS2();
    var r = s2range();
    r1.value = s1; r2.min = r[0]; r2.max = r[1]; r2.step = 0.01; r2.value = s2;
    o1.textContent = fmt(s1); o2.textContent = fmt(s2);
  }

  function setup() {
    var dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    var ctx = cv.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    var v = curve.view, sx = (w - 20) / (v[1] - v[0]), sy = (h - 20) / (v[3] - v[2]), sc = Math.min(sx, sy);
    var cx = w / 2 - sc * (v[0] + v[1]) / 2, cy = h / 2 + sc * (v[2] + v[3]) / 2;
    return { ctx: ctx, w: w, h: h, X: function (x) { return cx + sc * x; }, Y: function (y) { return cy - sc * y; }, sc: sc,
             inv: function (px, py) { return [(px - cx) / sc, (cy - py) / sc]; } };
  }

  function path(S, pts, close) {
    var ctx = S.ctx; ctx.beginPath();
    pts.forEach(function (p, i) { if (i) ctx.lineTo(S.X(p[0]), S.Y(p[1])); else ctx.moveTo(S.X(p[0]), S.Y(p[1])); });
    if (close) ctx.closePath();
  }

  function draw() {
    var S = setup(), ctx = S.ctx, i, n = 240;
    var ink = css("--ink"), soft = css("--ink-soft"), carac = css("--carac"), choque = css("--choque"), rule = css("--rule"), paper = css("--paper");
    var P1 = curve.pt(s1), P2 = curve.pt(s2), P = M.midpoint(P1, P2), g = M.gradient(P1, P2), ch = M.characteristics(curve, s1, s2);
    var A = M.signedArea(curve, s1, s2), u = -A / 2;
    // eixos discretos
    ctx.strokeStyle = rule; ctx.lineWidth = 1; ctx.beginPath();
    ctx.moveTo(0, Math.round(S.Y(0)) + 0.5); ctx.lineTo(S.w, Math.round(S.Y(0)) + 0.5); ctx.moveTo(Math.round(S.X(0)) + 0.5, 0); ctx.lineTo(Math.round(S.X(0)) + 0.5, S.h); ctx.stroke();
    // região sombreada: entre Γ e as duas características
    var arc = [], k;
    for (i = 0; i <= 120; i++) arc.push(curve.pt(s1 + (s2 - s1) * i / 120));
    var shade = arc.concat(ch.psi2.slice().reverse(), ch.psi1.slice().reverse());
    ctx.fillStyle = alpha(choque, 0.2); path(S, shade, true); ctx.fill();
    // Γ inteira
    var full = [], lo = curve.lo, hi = curve.hi;
    for (i = 0; i <= n; i++) full.push(curve.pt(lo + (hi - lo) * i / n));
    ctx.strokeStyle = soft; ctx.lineWidth = 1.6; path(S, full, curve.periodic); ctx.stroke();
    // arco de P1 a P2, em destaque
    ctx.strokeStyle = ink; ctx.lineWidth = 3; path(S, arc, false); ctx.stroke();
    // corda
    ctx.strokeStyle = soft; ctx.lineWidth = 1.4; ctx.setLineDash([5, 4]); path(S, [P1, P2], false); ctx.stroke(); ctx.setLineDash([]);
    // características
    ctx.strokeStyle = carac; ctx.lineWidth = 2.4; path(S, ch.psi1, false); ctx.stroke(); path(S, ch.psi2, false); ctx.stroke();
    // gradiente em P
    var L = 0.5, tip = [P[0] + L * g[0], P[1] + L * g[1]], gl = Math.hypot(g[0], g[1]);
    if (gl > 1e-3) {
      ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineWidth = 2.2; path(S, [P, tip], false); ctx.stroke();
      var ang = Math.atan2(S.Y(tip[1]) - S.Y(P[1]), S.X(tip[0]) - S.X(P[0])), ax = S.X(tip[0]), ay = S.Y(tip[1]);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax - 9 * Math.cos(ang - 0.4), ay - 9 * Math.sin(ang - 0.4)); ctx.lineTo(ax - 9 * Math.cos(ang + 0.4), ay - 9 * Math.sin(ang + 0.4)); ctx.closePath(); ctx.fill();
    }
    // pontos
    function dot(p, r, fill) { ctx.fillStyle = fill; ctx.strokeStyle = paper; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(S.X(p[0]), S.Y(p[1]), r, 0, 6.2832); ctx.fill(); ctx.stroke(); }
    dot(P1, 5, ink); dot(P, 5, ink); dot(P2, 8, choque);
    ctx.fillStyle = ink; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "bottom";
    ctx.fillText("P₁", S.X(P1[0]) + 8, S.Y(P1[1]) - 6); ctx.fillText("P₂", S.X(P2[0]) + 11, S.Y(P2[1]) - 8); ctx.fillText("P", S.X(P[0]) + 8, S.Y(P[1]) - 6);
    ctx.fillStyle = soft; ctx.font = "12px sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillText("arraste P₂ sobre a curva", 10, 8);
    // leitura
    var closed = curve.uClosed ? curve.uClosed(P[0], P[1]) : NaN, centro = curve.periodic && s2 - s1 > curve.span - 0.02;
    var h = "<span>P = (<b>" + fmt(P[0]) + "</b>; <b>" + fmt(P[1]) + "</b>)</span>" +
      "<span>∇u(P) = ½R(P₂−P₁) = (<b>" + fmt(g[0]) + "</b>; <b>" + fmt(g[1]) + "</b>), |∇u| = <b>" + fmt(gl) + "</b></span>" +
      "<span>área entre Γ e a corda: <b>" + fmt(Math.abs(A), 3) + "</b></span>" +
      "<span>u(P) = −área/2 = <b>" + fmt(u, 3) + "</b></span>";
    if (!isNaN(closed) && !centro) h += "<span>fórmula fechada: <b>" + fmt(closed, 3) + "</b></span>";
    if (centro) h += "<span><b>Ponto não regular:</b> P é o centro, onde todas as características se encontram; o gradiente depende do diâmetro escolhido.</span>";
    read.innerHTML = h;
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; draw(); }); }

  /* arrastar P2: escolhe o s2 permitido mais próximo do ponteiro */
  function pick(ev) {
    var rc = cv.getBoundingClientRect(), S = setup(), w = S.inv(ev.clientX - rc.left, ev.clientY - rc.top), r = s2range(), best = s2, bd = Infinity, i;
    for (i = 0; i <= 400; i++) {
      var s = r[0] + (r[1] - r[0]) * i / 400, p = curve.pt(s), d = (p[0] - w[0]) * (p[0] - w[0]) + (p[1] - w[1]) * (p[1] - w[1]);
      if (d < bd) { bd = d; best = s; }
    }
    s2 = best; syncControls(); schedule();
  }
  cv.style.touchAction = "none"; cv.style.cursor = "grab";
  cv.addEventListener("pointerdown", function (e) { dragging = true; if (cv.setPointerCapture) { try { cv.setPointerCapture(e.pointerId); } catch (x) {} } cv.style.cursor = "grabbing"; pick(e); });
  cv.addEventListener("pointermove", function (e) { if (dragging) pick(e); });
  function stop() { dragging = false; cv.style.cursor = "grab"; }
  cv.addEventListener("pointerup", stop); cv.addEventListener("pointercancel", stop);

  sel.addEventListener("change", function () { setCurve(sel.value, false); schedule(); });
  r1.addEventListener("input", function () { s1 = parseFloat(r1.value); syncControls(); schedule(); });
  r2.addEventListener("input", function () { s2 = parseFloat(r2.value); syncControls(); schedule(); });
  window.addEventListener("resize", schedule);
  if ("ResizeObserver" in window) new ResizeObserver(schedule).observe(root);
  document.addEventListener("themechange", schedule);

  setCurve(sel.value || "parabola", false); schedule();
})();
