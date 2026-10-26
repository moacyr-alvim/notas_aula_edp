/* Demo interativa: Burgers, características, quebra e choque.  Depende de burgers-core.js. */
(function () {
  "use strict";
  var B = window.BurgersCore;
  var root = document.getElementById("demo-burgers");
  if (!B || !root) return;

  var $ = function (id) { return document.getElementById(id); };
  var selIC = $("b-ic"), rng = $("b-t"), outT = $("b-tv"), btnPlay = $("b-play"), readout = $("b-readout");
  var cProf = $("b-prof"), cXT = $("b-xt");

  var solvers = {}, cache = {}, current = null, t = 0, playing = false, lastTs = 0;

  function fmt(n, d) { return (d == null ? n.toFixed(2) : n.toFixed(d)).replace(".", ","); }
  function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

  /* ---------- seleção da condição inicial ---------- */
  Object.keys(B.ICS).forEach(function (k) {
    var o = document.createElement("option"); o.value = k; o.textContent = B.ICS[k].label; selIC.appendChild(o);
  });

  function load(key) {
    if (!solvers[key]) {
      var s = B.createSolver(B.ICS[key]);
      solvers[key] = s;
      cache[key] = { path: s.shockPath(), chars: s.charLines() };
    }
    current = key;
  }

  /* ---------- painéis ---------- */
  function setup(canvas) {
    var dpr = window.devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    }
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx: ctx, w: w, h: h, l: 42, r: 12, t: 14, b: 30 };
  }
  function mapper(P, xr, yr) {
    return {
      X: function (x) { return P.l + (x - xr[0]) / (xr[1] - xr[0]) * (P.w - P.l - P.r); },
      Y: function (y) { return P.h - P.b - (y - yr[0]) / (yr[1] - yr[0]) * (P.h - P.t - P.b); }
    };
  }
  function axes(P, M, xr, yr, xstep, ystep, xl, yl, C) {
    var ctx = P.ctx; ctx.save();
    ctx.font = "12px sans-serif";
    ctx.fillStyle = C.soft; ctx.strokeStyle = C.rule; ctx.lineWidth = 1;
    var v;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (v = Math.ceil(xr[0] / xstep) * xstep; v <= xr[1] + 1e-9; v += xstep) {
      var px = Math.round(M.X(v)) + 0.5;
      ctx.beginPath(); ctx.moveTo(px, P.t); ctx.lineTo(px, P.h - P.b); ctx.stroke();
      ctx.fillText(String(Math.round(v * 100) / 100).replace(".", ","), px, P.h - P.b + 6);
    }
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (v = Math.ceil(yr[0] / ystep) * ystep; v <= yr[1] + 1e-9; v += ystep) {
      var py = Math.round(M.Y(v)) + 0.5;
      ctx.beginPath(); ctx.moveTo(P.l, py); ctx.lineTo(P.w - P.r, py); ctx.stroke();
      ctx.fillText(String(Math.round(v * 100) / 100).replace(".", ","), P.l - 6, py);
    }
    ctx.fillStyle = C.ink; ctx.textAlign = "right"; ctx.textBaseline = "bottom";
    ctx.fillText(xl, P.w - P.r, P.h - 2);
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillText(yl, P.l + 6, 2);
    ctx.restore();
  }

  function colors() {
    return { ink: css("--ink"), soft: css("--ink-soft"), rule: css("--rule"), carac: css("--carac"), choque: css("--choque") };
  }

  function draw() {
    if (!current) return;
    var S = solvers[current], ic = S.ic, C = colors(), data = cache[current];
    var s = S.shockAt(t, 200);

    /* ---- painel 1: perfil u(x,t) ---- */
    var P = setup(cProf), xr = [ic.xmin, ic.xmax], yr = [ic.umin, ic.umax];
    var M = mapper(P, xr, yr), ctx = P.ctx;
    axes(P, M, xr, yr, (xr[1] - xr[0]) > 8 ? 2 : 1, 0.5, "x", "u", C);
    ctx.save(); ctx.beginPath(); ctx.rect(P.l, P.t, P.w - P.l - P.r, P.h - P.t - P.b); ctx.clip();

    // dado inicial (referência)
    ctx.strokeStyle = C.soft; ctx.globalAlpha = 0.55; ctx.lineWidth = 1.2; ctx.setLineDash([3, 4]);
    ctx.beginPath(); var first = true, i;
    for (i = 0; i <= 400; i++) {
      var xx = xr[0] + (xr[1] - xr[0]) * i / 400, uu = ic.f(xx);
      var jump = i > 0 && Math.abs(uu - ic.f(xr[0] + (xr[1] - xr[0]) * (i - 1) / 400)) > 0.25;
      if (first || jump) { ctx.moveTo(M.X(xx), M.Y(uu)); first = false; } else ctx.lineTo(M.X(xx), M.Y(uu));
    }
    ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;

    // solução clássica por características (fica multivalorada depois de t*)
    ctx.strokeStyle = C.carac; ctx.lineWidth = 2; ctx.setLineDash([7, 5]); ctx.globalAlpha = 0.85;
    S.classical(t).forEach(function (seg) {
      ctx.beginPath();
      seg.forEach(function (p, k) { if (k === 0) ctx.moveTo(M.X(p[0]), M.Y(p[1])); else ctx.lineTo(M.X(p[0]), M.Y(p[1])); });
      ctx.stroke();
    });
    ctx.setLineDash([]); ctx.globalAlpha = 1;

    // solução admissível (Hopf–Lax), com o salto desenhado em vermilion
    var n = 520, xs = new Float64Array(n);
    for (i = 0; i < n; i++) xs[i] = xr[0] + (xr[1] - xr[0]) * i / (n - 1);
    var us = S.profile(xs, t);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2.6; ctx.lineJoin = "round";
    ctx.beginPath(); var started = false, drewJump = false;
    for (i = 0; i < n; i++) {
      if (s && !drewJump && xs[i] > s.x) {
        ctx.lineTo(M.X(s.x), M.Y(s.uL)); ctx.stroke();
        ctx.strokeStyle = C.choque; ctx.lineWidth = 3.2;
        ctx.beginPath(); ctx.moveTo(M.X(s.x), M.Y(s.uL)); ctx.lineTo(M.X(s.x), M.Y(s.uR)); ctx.stroke();
        ctx.strokeStyle = C.ink; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.moveTo(M.X(s.x), M.Y(s.uR)); started = true; drewJump = true;
      }
      var px = M.X(xs[i]), py = M.Y(us[i]);
      if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();

    /* ---- painel 2: plano (x,t) com características e choque ---- */
    var Q = setup(cXT), tr = [0, B.TMAX], M2 = mapper(Q, xr, tr), c2 = Q.ctx;
    axes(Q, M2, xr, tr, (xr[1] - xr[0]) > 8 ? 2 : 1, 1, "x", "t", C);
    c2.save(); c2.beginPath(); c2.rect(Q.l, Q.t, Q.w - Q.l - Q.r, Q.h - Q.t - Q.b); c2.clip();

    c2.strokeStyle = C.carac; c2.lineWidth = 1.1; c2.globalAlpha = 0.6;
    data.chars.forEach(function (ch) {
      var te = Math.min(t, ch.tEnd); if (te <= 0) return;
      c2.beginPath(); c2.moveTo(M2.X(ch.x0), M2.Y(0)); c2.lineTo(M2.X(ch.x0 + ch.f * te), M2.Y(te)); c2.stroke();
    });
    ic.fan.forEach(function (v) {   // leque de rarefação: características que nascem na descontinuidade
      if (t <= 0) return;
      c2.beginPath(); c2.moveTo(M2.X(0), M2.Y(0)); c2.lineTo(M2.X(v * t), M2.Y(t)); c2.stroke();
    });
    c2.globalAlpha = 1;

    // trajetória do choque até o instante atual
    var pts = data.path.filter(function (p) { return p.t <= t; });
    if (s) pts = pts.concat([{ t: t, x: s.x }]);
    if (pts.length > 1) {
      c2.strokeStyle = C.choque; c2.lineWidth = 3.2; c2.beginPath();
      pts.forEach(function (p, k) { if (k === 0) c2.moveTo(M2.X(p.x), M2.Y(p.t)); else c2.lineTo(M2.X(p.x), M2.Y(p.t)); });
      c2.stroke();
    }
    // ponto de quebra
    if (data.path.length && S.tBreak > 0 && t >= S.tBreak) {
      var bp = data.path[0]; c2.fillStyle = C.choque; c2.beginPath(); c2.arc(M2.X(bp.x), M2.Y(bp.t), 4.5, 0, 6.2832); c2.fill();
    }
    // instante atual
    c2.strokeStyle = C.ink; c2.lineWidth = 1.2; c2.setLineDash([5, 4]);
    c2.beginPath(); c2.moveTo(P.l, M2.Y(t)); c2.lineTo(Q.w - Q.r, M2.Y(t)); c2.stroke(); c2.setLineDash([]);
    c2.restore();

    /* ---- números ---- */
    var tb = S.tBreak, tbTxt = !isFinite(tb) ? "não há quebra" : (tb < 0.01 ? "0 (descontinuidade)" : fmt(tb));
    var html = "<span>t = <b>" + fmt(t) + "</b></span><span>t* (quebra) = <b>" + tbTxt + "</b></span>";
    if (s) {
      var s2 = S.shockAt(t + 0.02, 200), rh = (s.uL + s.uR) / 2;
      html += "<span>choque em x = <b>" + fmt(s.x) + "</b></span><span>u₋ = <b>" + fmt(s.uL) + "</b>, u₊ = <b>" + fmt(s.uR) + "</b></span>";
      html += "<span>(u₋+u₊)/2 = <b>" + fmt(rh) + "</b>";
      if (s2) html += " &nbsp;·&nbsp; velocidade medida do choque = <b>" + fmt((s2.x - s.x) / 0.02) + "</b>";
      html += "</span>";
    } else if (isFinite(tb) && t > tb) {
      html += "<span>choque acabou de se formar</span>";
    } else if (!isFinite(tb) && ic.fan.length) {
      html += "<span>leque de rarefação: u = x/t para 0 &lt; x &lt; t</span>";
    } else if (t > 0) {
      html += "<span>solução ainda suave: o perfil tracejado e o contínuo coincidem</span>";
    }
    readout.innerHTML = html;
    outT.textContent = fmt(t);
    rng.setAttribute("aria-valuetext", "t = " + fmt(t));
  }

  /* ---------- eventos ---------- */
  var raf = 0;
  function schedule() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; draw(); }); }

  rng.addEventListener("input", function () { t = parseFloat(rng.value); schedule(); });
  selIC.addEventListener("change", function () { load(selIC.value); schedule(); });
  btnPlay.addEventListener("click", function () {
    playing = !playing;
    btnPlay.textContent = playing ? "⏸ Pausar" : "▶ Animar";
    if (playing) { if (t >= B.TMAX - 1e-6) t = 0; lastTs = 0; requestAnimationFrame(tick); }
  });
  function tick(ts) {
    if (!playing) return;
    if (lastTs) t = Math.min(B.TMAX, t + (ts - lastTs) / 1000 * 0.55);
    lastTs = ts; rng.value = t; draw();
    if (t >= B.TMAX - 1e-6) { playing = false; btnPlay.textContent = "▶ Animar"; return; }
    requestAnimationFrame(tick);
  }
  window.addEventListener("resize", schedule);
  if ("ResizeObserver" in window) new ResizeObserver(schedule).observe(root);
  var mq = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
  if (mq && mq.addEventListener) mq.addEventListener("change", schedule);
  document.addEventListener("themechange", schedule);

  load("rampa"); selIC.value = "rampa"; t = 1; rng.value = t; schedule();
})();
