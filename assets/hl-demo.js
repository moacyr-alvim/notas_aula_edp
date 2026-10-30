/* Demo da fórmula de Hopf–Lax.  Depende de hl-core.js.
 * Esquerda: a função y ↦ G(y) = f(y) + (x−y)²/(2t) que está sendo minimizada, com as duas parcelas
 *           e os mínimos locais (o vencedor cheio, o perdedor vazado).
 * Direita: o perfil u(·,t) e a derivada v = u_x, com o x atual marcado e o choque em vermelho. */
(function () {
  "use strict";
  var H = window.HLCore, root = document.getElementById("demo-hl");
  if (!H || !root) return;
  var $ = function (id) { return document.getElementById(id); };
  var sel = $("hl-dado"), rT = $("hl-t"), oT = $("hl-tv"), rX = $("hl-x"), oX = $("hl-xv"),
      btn = $("hl-play"), read = $("hl-readout"), cG = $("hl-g"), cP = $("hl-perfil");
  var X0 = -1, X1 = 5, Y0 = -5, Y1 = 5.5, TMAX = 4, playing = false, lastTs = 0, raf = 0;

  Object.keys(H.DADOS).forEach(function (k) {
    var o = document.createElement("option"); o.value = k; o.textContent = H.DADOS[k].label; sel.appendChild(o);
  });
  sel.value = "rampa";

  function fmt(n, d) { return (Math.abs(n) < 5e-4 ? 0 : n).toFixed(d == null ? 2 : d).replace(".", ",").replace("-", "−"); }
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
  function eixos(ctx, S, l, tp, w, h, col, xl, yl, xt, yt, Xf, Yf) {
    ctx.font = "12px sans-serif"; ctx.strokeStyle = col.rule; ctx.fillStyle = col.soft; ctx.lineWidth = 1;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    xt.forEach(function (x) { var px = Math.round(Xf(x)) + 0.5; ctx.beginPath(); ctx.moveTo(px, tp); ctx.lineTo(px, tp + h); ctx.stroke(); ctx.fillText(fmt(x, 0), px, tp + h + 6); });
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    yt.forEach(function (y) { var py = Math.round(Yf(y)) + 0.5; ctx.beginPath(); ctx.moveTo(l, py); ctx.lineTo(l + w, py); ctx.stroke(); ctx.fillText(fmt(y, Math.abs(y % 1) > 1e-9 ? 1 : 0), l - 6, py); });
    ctx.fillStyle = col.ink; ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText(xl, S.w - 12, S.h - 2);
    ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(yl, l + 6, 0);
  }
  function ticks(a, b, passo) { var out = [], v = Math.ceil(a / passo) * passo; for (; v <= b + 1e-9; v += passo) out.push(Math.abs(v) < 1e-9 ? 0 : v); return out; }

  function desenhaG(d, x, t, r, col) {
    var S = setup(cG), ctx = S.ctx, l = 46, rr = 12, tp = 14, b = 32, w = S.w - l - rr, h = S.h - tp - b;
    var N = 400, ys = [], gs = [], i, lo = Infinity;
    for (i = 0; i <= N; i++) { var y = Y0 + (Y1 - Y0) * i / N; ys.push(y); var g = H.G(d, x, t, y); gs.push(g); if (g < lo) lo = g; }
    var bot = lo - 0.45, top = lo + 2.6;
    var Xf = function (y) { return l + (y - Y0) / (Y1 - Y0) * w; }, Yf = function (g) { return tp + (1 - (g - bot) / (top - bot)) * h; };
    eixos(ctx, S, l, tp, w, h, col, "y", "custo", ticks(Y0, Y1, 2), ticks(bot, top, 1), Xf, Yf);
    ctx.save(); ctx.beginPath(); ctx.rect(l, tp - 2, w, h + 4); ctx.clip();
    function curva(fn, style, lw, dash) {
      ctx.strokeStyle = style; ctx.lineWidth = lw; ctx.setLineDash(dash || []); ctx.beginPath();
      for (var i = 0; i <= N; i++) { var py = Yf(fn(ys[i])); if (i) ctx.lineTo(Xf(ys[i]), py); else ctx.moveTo(Xf(ys[i]), py); }
      ctx.stroke(); ctx.setLineDash([]);
    }
    curva(function (y) { return d.f(y); }, col.soft, 1.6, [3, 4]);                               // f(y)
    curva(function (y) { return (x - y) * (x - y) / (2 * t); }, col.carac, 1.6, [6, 4]);         // custo da viagem
    curva(function (y) { return H.G(d, x, t, y); }, col.ink, 2.8);                               // a soma
    r.candidatos.forEach(function (c, k) {                                                       // mínimos locais
      var vencedor = k === 0;
      ctx.beginPath(); ctx.arc(Xf(c.y), Yf(c.G), 5.5, 0, 6.2832);
      if (vencedor) { ctx.fillStyle = col.choque; ctx.fill(); ctx.strokeStyle = col.paper; ctx.lineWidth = 1.5; ctx.stroke(); }
      else { ctx.fillStyle = col.paper; ctx.fill(); ctx.strokeStyle = col.choque; ctx.lineWidth = 2; ctx.stroke(); }
    });
    ctx.strokeStyle = alpha(col.choque, 0.5); ctx.lineWidth = 1.4; ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(Xf(r.y), Yf(r.u)); ctx.lineTo(Xf(r.y), tp + h); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    ctx.fillStyle = col.choque; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText("y*", Xf(r.y), tp + h + 6);
  }

  function desenhaPerfil(d, x, t, r, p, col) {
    var S = setup(cP), ctx = S.ctx, l = 46, rr = 12, tp = 14, b = 32, w = S.w - l - rr, h = S.h - tp - b;
    var lo = Math.min(-0.3, Math.min.apply(null, p.us) - 0.3), hi = Math.max(1.4, Math.max.apply(null, p.us) + 0.3);
    var Xf = function (x) { return l + (x - X0) / (X1 - X0) * w; }, Yf = function (u) { return tp + (1 - (u - lo) / (hi - lo)) * h; };
    eixos(ctx, S, l, tp, w, h, col, "x", "u, v", ticks(X0, X1, 1), ticks(lo, hi, 1), Xf, Yf);
    ctx.save(); ctx.beginPath(); ctx.rect(l, tp - 2, w, h + 4); ctx.clip();
    p.choques.forEach(function (xc) {                                                            // o choque
      ctx.strokeStyle = alpha(col.choque, 0.85); ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(Xf(xc), tp); ctx.lineTo(Xf(xc), tp + h); ctx.stroke();
    });
    function serie(arr, style, lw, dash) {
      ctx.strokeStyle = style; ctx.lineWidth = lw; ctx.setLineDash(dash || []); ctx.beginPath();
      var corte = 0;
      for (var i = 0; i < arr.length; i++) {
        var py = Yf(arr[i]), px = Xf(p.xs[i]);
        var salto = i && Math.abs(arr[i] - arr[i - 1]) > 0.25;                                   // não ligue os dois lados do choque
        if (!i || salto) { ctx.moveTo(px, py); corte++; } else ctx.lineTo(px, py);
      }
      ctx.stroke(); ctx.setLineDash([]);
      return corte;
    }
    serie(p.vs, col.carac, 2, [5, 4]);                                                           // v = u_x
    serie(p.us, col.ink, 2.8);                                                                   // u
    ctx.strokeStyle = alpha(col.soft, 0.8); ctx.lineWidth = 1.2; ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(Xf(x), tp); ctx.lineTo(Xf(x), tp + h); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = col.ink; ctx.strokeStyle = col.paper; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(Xf(x), Yf(r.u), 5, 0, 6.2832); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  var chave = "", perfilGuardado = null;           /* o perfil só muda quando mudam o dado e t */
  function perfilCache(d, t) {
    var k = sel.value + "|" + t.toFixed(3);
    if (k !== chave) { perfilGuardado = H.perfil(d, t, X0, X1, 220, 500); chave = k; }
    return perfilGuardado;
  }

  function draw() {
    var d = H.DADOS[sel.value], t = parseFloat(rT.value), x = parseFloat(rX.value), col = colors();
    oT.textContent = fmt(t); oX.textContent = fmt(x);
    var r = H.resolve(d, x, t, 900), p = perfilCache(d, t);
    desenhaG(d, x, t, r, col); desenhaPerfil(d, x, t, r, p, col);
    var xc = p.choques.length ? p.choques[0] : null;
    var sobre = r.candidatos.length > 1 && r.folga < 0.02;
    var txt = "<span>y* = <b>" + fmt(r.y) + "</b></span>"
            + "<span>u(x,t) = <b>" + fmt(r.u) + "</b></span>"
            + "<span>v = (x − y*)/t = <b>" + fmt(r.v) + "</b></span>"
            + "<span>" + (xc === null ? "sem choque neste instante" : "choque em x ≈ <b>" + fmt(xc) + "</b>") + "</span>";
    if (r.candidatos.length > 1) {
      txt += "<span>" + (sobre
        ? "<b>dois mínimos empatados</b>: é exatamente aqui que y* salta"
        : "há um segundo mínimo, " + fmt(r.folga) + " mais caro") + "</span>";
    }
    read.innerHTML = txt;
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; draw(); }); }
  [sel, rT, rX].forEach(function (el) { el.addEventListener("input", schedule); });
  btn.addEventListener("click", function () {
    playing = !playing; btn.textContent = playing ? "⏸ Pausar" : "▶ Animar";
    if (playing) { if (parseFloat(rT.value) >= TMAX - 1e-6) rT.value = 0.1; lastTs = 0; requestAnimationFrame(tick); }
  });
  function tick(ts) {
    if (!playing) return;
    if (lastTs) rT.value = Math.min(TMAX, parseFloat(rT.value) + (ts - lastTs) / 1000 * 0.5);
    lastTs = ts; draw();
    if (parseFloat(rT.value) >= TMAX - 1e-6) { playing = false; btn.textContent = "▶ Animar"; return; }
    requestAnimationFrame(tick);
  }
  window.addEventListener("resize", schedule);
  if ("ResizeObserver" in window) new ResizeObserver(schedule).observe(root);
  document.addEventListener("themechange", schedule);
  schedule();
})();
