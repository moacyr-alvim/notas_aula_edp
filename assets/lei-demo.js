/* Demo: problema de Riemann para leis de conservação.  Depende de lei-core.js.
 * Três painéis: o fluxo F(u) (corda = σ, tangentes = λ), o perfil u(x,t) e o plano (x,t). */
(function () {
  "use strict";
  var K = window.LeiCore, root = document.getElementById("demo-lei");
  if (!K || !root) return;

  var $ = function (id) { return document.getElementById(id); };
  var selF = $("l-fluxo"), rUL = $("l-uL"), rUR = $("l-uR"), rT = $("l-t"), oUL = $("l-uLv"), oUR = $("l-uRv"), oT = $("l-tv"),
      btnPlay = $("l-play"), chkAlt = $("l-alt"), read = $("l-readout"), cFlux = $("l-flux"), cProf = $("l-prof"), cXT = $("l-xt");

  var XR = [-4, 4], TMAX = 4, t = 1.5, playing = false, lastTs = 0, raf = 0;

  function fmt(n, d) { return (d == null ? n.toFixed(2) : n.toFixed(d)).replace(".", ",").replace("-", "−"); }
  function css(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function colors() { return { ink: css("--ink"), soft: css("--ink-soft"), rule: css("--rule"), carac: css("--carac"), choque: css("--choque") }; }

  var only = (root.getAttribute("data-fluxes") || "").split(",").filter(Boolean);
  Object.keys(K.FLUXES).filter(function (k) { return !only.length || only.indexOf(k) >= 0; }).forEach(function (k) {
    var o = document.createElement("option"); o.value = k; o.textContent = K.FLUXES[k].label; selF.appendChild(o);
  });

  /* ---------- utilidades de desenho ---------- */
  function setup(canvas) {
    var dpr = window.devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    var ctx = canvas.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    return { ctx: ctx, w: w, h: h, l: 44, r: 12, t: 14, b: 30 };
  }
  function mapper(P, xr, yr) {
    return { X: function (x) { return P.l + (x - xr[0]) / (xr[1] - xr[0]) * (P.w - P.l - P.r); },
             Y: function (y) { return P.h - P.b - (y - yr[0]) / (yr[1] - yr[0]) * (P.h - P.t - P.b); } };
  }
  function axes(P, M, xr, yr, xs, ys, xl, yl, C) {
    var ctx = P.ctx, v; ctx.save(); ctx.font = "12px sans-serif"; ctx.strokeStyle = C.rule; ctx.fillStyle = C.soft; ctx.lineWidth = 1;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (v = Math.ceil(xr[0] / xs - 1e-9) * xs; v <= xr[1] + 1e-9; v += xs) {
      var px = Math.round(M.X(v)) + 0.5; ctx.beginPath(); ctx.moveTo(px, P.t); ctx.lineTo(px, P.h - P.b); ctx.stroke();
      ctx.fillText(String(Math.round(v * 100) / 100).replace(".", ",").replace("-", "−"), px, P.h - P.b + 6);
    }
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (v = Math.ceil(yr[0] / ys - 1e-9) * ys; v <= yr[1] + 1e-9; v += ys) {
      var py = Math.round(M.Y(v)) + 0.5; ctx.beginPath(); ctx.moveTo(P.l, py); ctx.lineTo(P.w - P.r, py); ctx.stroke();
      ctx.fillText(String(Math.round(v * 100) / 100).replace(".", ",").replace("-", "−"), P.l - 6, py);
    }
    ctx.fillStyle = C.ink; ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText(xl, P.w - P.r, P.h - 2);
    ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(yl, P.l + 6, 2); ctx.restore();
  }
  function clip(P) { P.ctx.save(); P.ctx.beginPath(); P.ctx.rect(P.l, P.t, P.w - P.l - P.r, P.h - P.t - P.b); P.ctx.clip(); }
  function poly(ctx, M, pts) { ctx.beginPath(); pts.forEach(function (p, i) { if (i) ctx.lineTo(M.X(p[0]), M.Y(p[1])); else ctx.moveTo(M.X(p[0]), M.Y(p[1])); }); ctx.stroke(); }

  /* ---------- painéis ---------- */
  function drawFlux(fl, uL, uR, r, C) {
    var P = setup(cFlux), lo = Infinity, hi = -Infinity, u;
    for (u = 0; u <= 1.0001; u += 0.01) { var f = K.F(fl, u); lo = Math.min(lo, f); hi = Math.max(hi, f); }
    var pad = (hi - lo) * 0.18 || 0.1, yr = [Math.min(lo, 0) - pad * 0.2, hi + pad], range = yr[1] - yr[0];
    var M = mapper(P, [0, 1], yr), ctx = P.ctx;
    axes(P, M, [0, 1], yr, 0.25, range > 0.8 ? 0.25 : (range > 0.4 ? 0.1 : 0.05), "u", "F(u)", C);
    clip(P);
    // curva do fluxo
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2.6; ctx.lineJoin = "round";
    var pts = []; for (u = 0; u <= 1.0001; u += 0.01) pts.push([u, K.F(fl, u)]); poly(ctx, M, pts);
    if (r.type !== "none") {
      // tangentes em uL e uR (inclinação = λ) e corda (inclinação = σ)
      ctx.lineWidth = 1.6; ctx.strokeStyle = C.carac; ctx.setLineDash([6, 4]);
      [uL, uR].forEach(function (u0) { var s = K.lam(fl, u0), f0 = K.F(fl, u0); poly(ctx, M, [[0, f0 - s * u0], [1, f0 + s * (1 - u0)]]); });
      ctx.setLineDash([]); ctx.strokeStyle = C.choque; ctx.lineWidth = 3;
      poly(ctx, M, [[Math.min(uL, uR), K.F(fl, Math.min(uL, uR))], [Math.max(uL, uR), K.F(fl, Math.max(uL, uR))]]);
    }
    [[uL, "uL"], [uR, "uR"]].forEach(function (q) {
      ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(M.X(q[0]), M.Y(K.F(fl, q[0])), 4.5, 0, 6.2832); ctx.fill();
    });
    P.ctx.restore();
    ctx.save(); ctx.font = "12px sans-serif"; ctx.fillStyle = C.ink;
    [[uL, "uL"], [uR, "uR"]].forEach(function (q, i) {
      ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText(q[1], M.X(q[0]) + (i ? 8 : -8), M.Y(K.F(fl, q[0])) - 8);
    }); ctx.restore();
  }

  function profilePoints(fl, uL, uR, r, tt) {
    var pts = [], i;
    if (tt < 1e-9) return [[XR[0], uL], [0, uL], [0, uR], [XR[1], uR]];
    if (r.type === "fan") {
      pts.push([XR[0], uL], [r.lamL * tt, uL]);
      for (i = 1; i < 60; i++) { var x = r.lamL * tt + (r.lamR - r.lamL) * tt * i / 60; pts.push([x, K.u(fl, uL, uR, x, tt)]); }
      pts.push([r.lamR * tt, uR], [XR[1], uR]);
    } else if (r.type === "none") pts = [[XR[0], uL], [XR[1], uL]];
    else pts = [[XR[0], uL], [r.sigma * tt, uL], [r.sigma * tt, uR], [XR[1], uR]];
    return pts;
  }

  function drawProfile(fl, uL, uR, r, C) {
    var P = setup(cProf), yr = [-0.1, 1.1], M = mapper(P, XR, yr), ctx = P.ctx;
    axes(P, M, XR, yr, 2, 0.25, "x", "u", C); clip(P);
    // dado inicial
    ctx.strokeStyle = C.soft; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.6; ctx.setLineDash([3, 4]);
    poly(ctx, M, [[XR[0], uL], [0, uL], [0, uR], [XR[1], uR]]); ctx.setLineDash([]); ctx.globalAlpha = 1;
    // solução fraca não admissível (só faz sentido quando a admissível é um leque)
    if (chkAlt.checked && r.type === "fan" && t > 0) {
      ctx.strokeStyle = C.choque; ctx.lineWidth = 2.4; ctx.setLineDash([7, 5]);
      poly(ctx, M, [[XR[0], uL], [r.sigma * t, uL], [r.sigma * t, uR], [XR[1], uR]]); ctx.setLineDash([]);
    }
    // solução admissível
    var pts = profilePoints(fl, uL, uR, r, t);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2.8; ctx.lineJoin = "round";
    if (r.type === "shock" && t > 0) {
      poly(ctx, M, pts.slice(0, 2)); poly(ctx, M, pts.slice(2));
      ctx.strokeStyle = C.choque; ctx.lineWidth = 3.4; poly(ctx, M, pts.slice(1, 3));
    } else poly(ctx, M, pts);
    ctx.restore();
  }

  function drawXT(fl, uL, uR, r, C) {
    var P = setup(cXT), tr = [0, TMAX], M = mapper(P, XR, tr), ctx = P.ctx;
    axes(P, M, XR, tr, 1, 1, "x", "t", C); clip(P);
    ctx.lineWidth = 1.1; ctx.strokeStyle = C.carac; ctx.globalAlpha = 0.6;
    for (var k = 0; k < 20; k++) {
      var x0 = -3.8 + 0.4 * k, left = x0 < 0, s = left ? r.lamL : r.lamR, te = t;
      if (r.type === "shock") te = Math.min(t, left ? -x0 / (r.lamL - r.sigma) : x0 / (r.sigma - r.lamR));
      if (te > 0) { ctx.beginPath(); ctx.moveTo(M.X(x0), M.Y(0)); ctx.lineTo(M.X(x0 + s * te), M.Y(te)); ctx.stroke(); }
    }
    if (r.type === "fan" && t > 0) {
      for (var j = 0; j <= 10; j++) { var sp = r.lamL + (r.lamR - r.lamL) * j / 10; ctx.beginPath(); ctx.moveTo(M.X(0), M.Y(0)); ctx.lineTo(M.X(sp * t), M.Y(t)); ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
    if ((r.type === "shock" || r.type === "contact") && t > 0) {
      ctx.strokeStyle = r.type === "shock" ? C.choque : C.ink; ctx.lineWidth = 3.4; ctx.setLineDash(r.type === "shock" ? [] : [7, 5]);
      ctx.beginPath(); ctx.moveTo(M.X(0), M.Y(0)); ctx.lineTo(M.X(r.sigma * t), M.Y(t)); ctx.stroke(); ctx.setLineDash([]);
    }
    if (chkAlt.checked && r.type === "fan" && t > 0) {
      ctx.strokeStyle = C.choque; ctx.lineWidth = 2.4; ctx.setLineDash([7, 5]);
      ctx.beginPath(); ctx.moveTo(M.X(0), M.Y(0)); ctx.lineTo(M.X(r.sigma * t), M.Y(t)); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(P.l, M.Y(t)); ctx.lineTo(P.w - P.r, M.Y(t)); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }

  function readout(fl, uL, uR, r) {
    var h = "<span>t = <b>" + fmt(t) + "</b></span>";
    if (r.type === "none") h += "<span>estados iguais: nada acontece</span>";
    else {
      h += "<span>λ(uL) = <b>" + fmt(r.lamL) + "</b></span><span>λ(uR) = <b>" + fmt(r.lamR) + "</b></span><span>σ (corda de F) = <b>" + fmt(r.sigma) + "</b></span>";
      if (r.type === "shock") h += "<span><b>λ(uL) &gt; σ &gt; λ(uR)</b>: as características entram no choque. Choque admissível.</span>";
      else if (r.type === "contact") h += "<span>fluxo linear: o salto só é transportado, com velocidade σ = λ.</span>";
      else h += "<span><b>λ(uL) &lt; λ(uR)</b>: as características se afastam. A solução admissível é um leque de rarefação; o salto com σ = " + fmt(r.sigma) + " é fraco, mas viola Lax.</span>";
    }
    read.innerHTML = h;
  }

  function draw() {
    var fl = K.FLUXES[selF.value], uL = parseFloat(rUL.value), uR = parseFloat(rUR.value), C = colors(), r = K.riemann(fl, uL, uR);
    oUL.textContent = fmt(uL); oUR.textContent = fmt(uR); oT.textContent = fmt(t);
    drawFlux(fl, uL, uR, r, C); drawProfile(fl, uL, uR, r, C); drawXT(fl, uL, uR, r, C); readout(fl, uL, uR, r);
    chkAlt.disabled = r.type !== "fan";
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; draw(); }); }

  /* ---------- eventos ---------- */
  selF.addEventListener("change", function () { var d = K.FLUXES[selF.value].def; rUL.value = d[0]; rUR.value = d[1]; schedule(); });
  [rUL, rUR].forEach(function (e) { e.addEventListener("input", schedule); });
  rT.addEventListener("input", function () { t = parseFloat(rT.value); schedule(); });
  chkAlt.addEventListener("change", schedule);
  btnPlay.addEventListener("click", function () {
    playing = !playing; btnPlay.textContent = playing ? "⏸ Pausar" : "▶ Animar";
    if (playing) { if (t >= TMAX - 1e-6) t = 0; lastTs = 0; requestAnimationFrame(tick); }
  });
  function tick(ts) {
    if (!playing) return;
    if (lastTs) t = Math.min(TMAX, t + (ts - lastTs) / 1000 * 0.6);
    lastTs = ts; rT.value = t; draw();
    if (t >= TMAX - 1e-6) { playing = false; btnPlay.textContent = "▶ Animar"; return; }
    requestAnimationFrame(tick);
  }
  window.addEventListener("resize", schedule);
  if ("ResizeObserver" in window) new ResizeObserver(schedule).observe(root);
  document.addEventListener("themechange", schedule);

  if (only.length === 1 && selF.parentNode) selF.parentNode.style.display = "none";
  selF.value = "burgers"; rUL.value = 1; rUR.value = 0; rT.value = t; schedule();
})();
