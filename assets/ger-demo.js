/* Demo do gerador infinitesimal.  Depende de ger-core.js.
 * Esquerda: a função de teste f e a média do futuro E[f(X_t)|x] — o processo agindo
 *           sobre a função, que é o semigrupo.
 * Direita:  o quociente (E[f(X_t)|x] − f(x))/t contra a f' + D f'' — a derivada em
 *           zero, que é o gerador. Encolhendo t, as duas curvas viram uma só.
 * A frase que a demo prova: o operador diferencial da EDP É a derivada da esperança. */
(function () {
  "use strict";
  var G = window.GerCore, root = document.getElementById("demo-ger");
  if (!G || !root) return;
  var $ = function (id) { return document.getElementById(id); };
  var selP = $("ger-proc"), selF = $("ger-func"), rT = $("ger-t"), oT = $("ger-tv"),
      btn = $("ger-play"), read = $("ger-readout"), cE = $("ger-media"), cD = $("ger-quoc");
  var N = 140, tocando = false, raf = 0, ultimo = 0;

  Object.keys(G.PROCESSOS).forEach(function (k) {
    var o = document.createElement("option"); o.value = k; o.textContent = G.PROCESSOS[k].label; selP.appendChild(o);
  });
  Object.keys(G.FUNCOES).forEach(function (k) {
    var o = document.createElement("option"); o.value = k; o.textContent = G.FUNCOES[k].label; selF.appendChild(o);
  });
  selP.value = "ou"; selF.value = "sino";

  function proc() { return G.PROCESSOS[selP.value]; }
  function func() { return G.FUNCOES[selF.value]; }
  function tempo() { return Math.pow(10, parseFloat(rT.value)); }
  function fmt(n, d) { return (Math.abs(n) < 5e-7 ? 0 : n).toFixed(d == null ? 2 : d).replace(".", ",").replace("-", "−"); }
  function fmtT(t) { return t >= 0.1 ? fmt(t, 3) : t.toExponential(1).replace(".", ",").replace("-", "−"); }
  function css(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function cores() { return { ink: css("--ink"), soft: css("--ink-soft"), rule: css("--rule"), carac: css("--carac"), choque: css("--choque") }; }
  function alpha(hex, a) {
    hex = (hex || "").replace("#", ""); if (hex.length === 3) hex = hex.replace(/./g, "$&$&");
    var n = [0, 2, 4].map(function (i) { return parseInt(hex.substr(i, 2), 16); });
    return n.some(isNaN) ? hex : "rgba(" + n.join(",") + "," + a + ")";
  }
  function prep(cv) {
    var dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    var ctx = cv.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    ctx.font = "12px sans-serif";
    return { ctx: ctx, w: w, h: h };
  }

  /* tudo o que os dois painéis precisam, calculado uma vez por quadro */
  function dados() {
    var P = proc(), F = func(), t = tempo(), vi = P.vista, i, x;
    var xs = [], fx = [], ex = [], qu = [], ge = [];
    for (i = 0; i <= N; i++) {
      x = vi.lo + (vi.hi - vi.lo) * i / N;
      xs.push(x); fx.push(F.f(x));
      var e = G.esperanca(P, F, x, t);
      ex.push(e); qu.push((e - F.f(x)) / t); ge.push(G.gerador(P, F, x));
    }
    return { xs: xs, fx: fx, ex: ex, qu: qu, ge: ge, t: t, vi: vi };
  }

  function eixos(S, cx, col, lo, hi, vlo, vhi, rotX, rotY) {
    var ctx = S.ctx;
    var X = function (v) { return cx.l + (v - lo) / (hi - lo) * cx.w; };
    var Y = function (v) { return cx.tp + (1 - (v - vlo) / (vhi - vlo)) * cx.h; };
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.fillStyle = col.soft;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    var passoX = (hi - lo) > 4 ? 1 : 0.5;
    for (var v = Math.ceil(lo / passoX) * passoX; v <= hi + 1e-9; v += passoX) {
      var px = Math.round(X(v)) + .5;
      ctx.beginPath(); ctx.moveTo(px, cx.tp); ctx.lineTo(px, cx.tp + cx.h); ctx.stroke();
      ctx.fillText(fmt(v, passoX < 1 ? 1 : 0), px, cx.tp + cx.h + 6);
    }
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    var span = vhi - vlo, passoY = span > 8 ? 2 : span > 4 ? 1 : span > 1.6 ? 0.5 : 0.2;
    for (var u = Math.ceil(vlo / passoY) * passoY; u <= vhi + 1e-9; u += passoY) {
      var py = Math.round(Y(u)) + .5;
      ctx.strokeStyle = Math.abs(u) < 1e-9 ? alpha(col.soft, .45) : col.rule;
      ctx.beginPath(); ctx.moveTo(cx.l, py); ctx.lineTo(cx.l + cx.w, py); ctx.stroke();
      ctx.fillText(fmt(u, passoY < 1 ? 1 : 0), cx.l - 6, py);
    }
    ctx.fillStyle = col.ink; ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillText(rotY, cx.l + 6, 0);
    /* o rótulo do eixo horizontal vai para a esquerda: colado na direita ele bate na
       última marca, que fica centrada bem na borda da área de desenho */
    ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.fillStyle = col.soft;
    ctx.fillText(rotX, 4, S.h - 2);
    return { X: X, Y: Y };
  }
  function curva(ctx, xs, vs, M, estilo, lw, cor) {
    ctx.strokeStyle = cor; ctx.lineWidth = lw;
    ctx.setLineDash(estilo === "tracejada" ? [6, 4] : []);
    ctx.beginPath();
    for (var i = 0; i < xs.length; i++) { var p = M.Y(vs[i]); if (i) ctx.lineTo(M.X(xs[i]), p); else ctx.moveTo(M.X(xs[i]), p); }
    ctx.stroke(); ctx.setLineDash([]);
  }
  function faixa(vs, outros) {
    var lo = Infinity, hi = -Infinity, i;
    for (i = 0; i < vs.length; i++) { lo = Math.min(lo, vs[i]); hi = Math.max(hi, vs[i]); }
    if (outros) for (i = 0; i < outros.length; i++) { lo = Math.min(lo, outros[i]); hi = Math.max(hi, outros[i]); }
    var m = (hi - lo) * 0.12 || 0.5;
    return { lo: lo - m, hi: hi + m };
  }

  function painelMedia(d, col) {
    var S = prep(cE), cx = { l: 40, tp: 14, w: S.w - 40 - 10, h: S.h - 14 - 26 };
    var r = faixa(d.fx, d.ex);
    var M = eixos(S, cx, col, d.vi.lo, d.vi.hi, r.lo, r.hi, "x", "f");
    S.ctx.save(); S.ctx.beginPath(); S.ctx.rect(cx.l, cx.tp - 2, cx.w, cx.h + 4); S.ctx.clip();
    curva(S.ctx, d.xs, d.fx, M, "tracejada", 1.6, alpha(col.soft, .9));
    curva(S.ctx, d.xs, d.ex, M, "cheia", 2.4, col.ink);
    S.ctx.restore();
  }

  function painelQuociente(d, col) {
    var S = prep(cD), cx = { l: 40, tp: 14, w: S.w - 40 - 10, h: S.h - 14 - 26 };
    var r = faixa(d.ge, d.qu);
    var M = eixos(S, cx, col, d.vi.lo, d.vi.hi, r.lo, r.hi, "x", "𝓛f");
    S.ctx.save(); S.ctx.beginPath(); S.ctx.rect(cx.l, cx.tp - 2, cx.w, cx.h + 4); S.ctx.clip();
    /* a diferença entre os dois, sombreada: é ela que morre com t */
    S.ctx.fillStyle = alpha(col.choque, .25); S.ctx.beginPath();
    S.ctx.moveTo(M.X(d.xs[0]), M.Y(d.ge[0]));
    for (var i = 1; i < d.xs.length; i++) S.ctx.lineTo(M.X(d.xs[i]), M.Y(d.ge[i]));
    for (var j = d.xs.length - 1; j >= 0; j--) S.ctx.lineTo(M.X(d.xs[j]), M.Y(d.qu[j]));
    S.ctx.closePath(); S.ctx.fill();
    curva(S.ctx, d.xs, d.ge, M, "tracejada", 1.8, alpha(col.carac, .95));
    curva(S.ctx, d.xs, d.qu, M, "cheia", 2.4, col.ink);
    S.ctx.restore();
  }

  function desenha() {
    var d = dados(), col = cores(), i, pior = 0, escala = 0;
    for (i = 0; i < d.xs.length; i++) {
      pior = Math.max(pior, Math.abs(d.qu[i] - d.ge[i]));
      escala = Math.max(escala, Math.abs(d.ge[i]));
    }
    oT.textContent = fmtT(d.t);
    painelMedia(d, col); painelQuociente(d, col);
    var P = proc();
    var txt = "<span>t = <b>" + fmtT(d.t) + "</b></span>"
            + "<span>o gerador: <b>" + P.desc + "</b></span>"
            + "<span>maior diferença: <b>" + fmt(pior, 4) + "</b></span>"
            + "<span>isto é <b>" + fmt(100 * pior / (escala || 1), 1) + "%</b> do tamanho de 𝓛f</span>"
            + "<span>dividir t por 10 divide a diferença por 10</span>";
    read.innerHTML = txt;
  }
  function agenda() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; desenha(); }); }
  [selP, selF, rT].forEach(function (el) { el.addEventListener("input", agenda); });
  btn.addEventListener("click", function () {
    tocando = !tocando; btn.textContent = tocando ? "⏸ Pausar" : "▶ Encolher t";
    if (tocando) { ultimo = 0; rT.value = rT.max; requestAnimationFrame(passo); }
  });
  /* animar = encolher t, do maior ao menor, para ver as duas curvas virarem uma */
  function passo(ts) {
    if (!tocando) return;
    if (ultimo) {
      var v = parseFloat(rT.value) - (ts - ultimo) / 1000 * 0.75;
      if (v <= parseFloat(rT.min)) { v = parseFloat(rT.min); tocando = false; btn.textContent = "▶ Encolher t"; }
      rT.value = v; desenha();
    }
    ultimo = ts; if (tocando) requestAnimationFrame(passo);
  }
  window.addEventListener("resize", agenda);
  if ("ResizeObserver" in window) new ResizeObserver(agenda).observe(root);
  document.addEventListener("themechange", agenda);
  desenha();
})();
