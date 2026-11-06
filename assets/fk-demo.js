/* Demo de Feynman–Kac.  Depende de fk-core.js.
 * Esquerda: caminhos saindo de (t, x) até o vencimento T, com o prêmio g desenhado na borda
 *           direita, deitado; quem morre na zona de perigo para com um ×.
 * Direita:  v(·,t) resolvido pela EDP, com X na MESMA vertical, o prêmio tracejado por trás,
 *           e o ponto do Monte Carlo com a barra de erro na altura do x escolhido.
 * A frase que a demo prova: a média dos caminhos É a solução da EDP. */
(function () {
  "use strict";
  var F = window.FKCore, root = document.getElementById("demo-fk");
  if (!F || !root) return;
  var $ = function (id) { return document.getElementById(id); };
  var sel = $("fk-premio"), selD = $("fk-desc"), rX = $("fk-x"), oX = $("fk-xv"),
      rT = $("fk-t"), oT = $("fk-tv"), btn = $("fk-play"), read = $("fk-readout"),
      cP = $("fk-paths"), cV = $("fk-valor");
  var T = 1, LO = -3, HI = 3, NDESENHA = 12, NMC = 4000, SEM = 20240713;
  var tocando = false, ultimo = 0, raf = 0, cacheEDP = {}, cacheMC = {};

  var DESCONTOS = {
    sem:       { label: "Nenhum", r: 0, zona: false, texto: "sem desconto: r = 0" },
    constante: { label: "Em todo lugar", r: 0.5, zona: false, texto: "r = 0,5 em toda a reta" },
    zona:      { label: "Zona de perigo", r: 1.5, zona: true, texto: "r = 1,5 só onde x < 0" }
  };
  Object.keys(F.PREMIOS).forEach(function (k) {
    var o = document.createElement("option"); o.value = k; o.textContent = F.PREMIOS[k].label; sel.appendChild(o);
  });
  Object.keys(DESCONTOS).forEach(function (k) {
    var o = document.createElement("option"); o.value = k; o.textContent = DESCONTOS[k].label; selD.appendChild(o);
  });
  sel.value = "degrau"; selD.value = "zona";

  function premio() { return F.PREMIOS[sel.value]; }
  function desconto() { return DESCONTOS[selD.value]; }
  function fmt(n, d) { return (Math.abs(n) < 5e-4 ? 0 : n).toFixed(d == null ? 3 : d).replace(".", ",").replace("-", "−"); }
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

  /* a EDP é cara: resolve uma vez por (prêmio, desconto) guardando retratos, e o
     controle do tempo só escolhe o retrato mais próximo */
  function edp() {
    var ch = sel.value + "|" + selD.value;
    if (!cacheEDP[ch]) cacheEDP[ch] = F.resolveEDP(premio(), desconto(), T, { dx: 0.02, retratos: 48 });
    return cacheEDP[ch];
  }
  function retrato(s) {
    var R = edp().retratos, melhor = R[0], i;
    for (i = 1; i < R.length; i++) if (Math.abs(R[i].s - s) < Math.abs(melhor.s - s)) melhor = R[i];
    return melhor;
  }
  function mc(x, s) {
    var ch = sel.value + "|" + selD.value + "|" + x.toFixed(2) + "|" + s.toFixed(2);
    if (Object.keys(cacheMC).length > 400) cacheMC = {};          /* arrastar não pode vazar memória */
    if (!cacheMC[ch]) cacheMC[ch] = s <= 0
      ? { media: premio().premio(x), erro: 0, mortos: 0, n: NMC }
      : F.monteCarlo(premio(), desconto(), x, s, NMC, SEM + Math.round(1000 * x) + Math.round(100 * s), "peso");
    return cacheMC[ch];
  }
  function desenhados(x, s) {
    var ch = "d|" + selD.value + "|" + x.toFixed(2) + "|" + s.toFixed(2);
    if (!cacheMC[ch]) cacheMC[ch] = s <= 0 ? { caminhos: [], passos: 1, dt: 1 }
      : F.caminhos(desconto(), x, s, 240, NDESENHA, SEM);
    return cacheMC[ch];
  }

  /* ---------- painel dos caminhos ---------- */
  function painelCaminhos(t, x, col) {
    var S = prep(cP), ctx = S.ctx, faixa = 54;                    /* a faixa do prêmio, à direita */
    var cx = { l: 30, tp: 14, w: S.w - 30 - 10 - faixa, h: S.h - 14 - 26 };
    var P = premio(), s = T - t, i, k;
    var X = function (u) { return cx.l + u / T * cx.w; };
    var Y = function (v) { return cx.tp + (1 - (v - LO) / (HI - LO)) * cx.h; };

    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.fillStyle = col.soft;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    [0, 0.25, 0.5, 0.75, 1].forEach(function (u) {
      var px = Math.round(X(u)) + .5;
      ctx.beginPath(); ctx.moveTo(px, cx.tp); ctx.lineTo(px, cx.tp + cx.h); ctx.stroke();
      ctx.fillText(fmt(u, 2), px, cx.tp + cx.h + 6);
    });
    if (desconto().zona) {                                        /* a zona de perigo, sombreada */
      ctx.fillStyle = alpha(col.choque, .08);
      ctx.fillRect(cx.l, Y(0), cx.w, cx.tp + cx.h - Y(0));
      ctx.fillStyle = alpha(col.choque, .75); ctx.textAlign = "left"; ctx.textBaseline = "bottom";
      ctx.fillText("zona de perigo", cx.l + 6, cx.tp + cx.h - 4);
    }

    ctx.save(); ctx.beginPath(); ctx.rect(cx.l, cx.tp - 2, cx.w, cx.h + 4); ctx.clip();
    var Ca = desenhados(x, s);
    for (k = 0; k < Ca.caminhos.length; k++) {
      var c = Ca.caminhos[k], fim = c.morte < 0 ? Ca.passos : c.morte;
      ctx.strokeStyle = alpha(c.morte < 0 ? col.ink : col.choque, c.morte < 0 ? .55 : .45);
      ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(X(t), Y(c.cam[0]));
      for (i = 1; i <= fim; i++) ctx.lineTo(X(t + i * Ca.dt), Y(c.cam[i]));
      ctx.stroke();
      if (c.morte >= 0) {                                         /* o × de quem morreu */
        var mx = X(t + fim * Ca.dt), my = Y(c.cam[fim]), d = 3.5;
        ctx.strokeStyle = col.choque; ctx.lineWidth = 1.6; ctx.beginPath();
        ctx.moveTo(mx - d, my - d); ctx.lineTo(mx + d, my + d);
        ctx.moveTo(mx - d, my + d); ctx.lineTo(mx + d, my - d); ctx.stroke();
      }
    }
    ctx.restore();

    ctx.strokeStyle = col.carac; ctx.lineWidth = 1.8;             /* o instante de agora */
    var pt = Math.round(X(t)) + .5;
    ctx.beginPath(); ctx.moveTo(pt, cx.tp); ctx.lineTo(pt, cx.tp + cx.h); ctx.stroke();
    ctx.fillStyle = col.carac; ctx.beginPath();                   /* e o ponto de partida */
    ctx.arc(X(t), Y(x), 4, 0, 2 * Math.PI); ctx.fill();

    /* o prêmio, deitado na borda do vencimento */
    var gmax = 0, ys = [], gs = [];
    for (i = 0; i <= 200; i++) { var yy = LO + (HI - LO) * i / 200; ys.push(yy); var gg = P.premio(yy); gs.push(gg); gmax = Math.max(gmax, gg); }
    var x0f = cx.l + cx.w;
    ctx.strokeStyle = col.rule; ctx.beginPath();
    ctx.moveTo(x0f + .5, cx.tp); ctx.lineTo(x0f + .5, cx.tp + cx.h); ctx.stroke();
    ctx.fillStyle = alpha(col.ink, .18); ctx.beginPath(); ctx.moveTo(x0f, Y(LO));
    for (i = 0; i < ys.length; i++) ctx.lineTo(x0f + (gs[i] / gmax) * (faixa - 12), Y(ys[i]));
    ctx.lineTo(x0f, Y(HI)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = alpha(col.ink, .8); ctx.lineWidth = 1.6; ctx.beginPath();
    for (i = 0; i < ys.length; i++) {
      var px2 = x0f + (gs[i] / gmax) * (faixa - 12);
      if (i) ctx.lineTo(px2, Y(ys[i])); else ctx.moveTo(px2, Y(ys[i]));
    }
    ctx.stroke();
    ctx.fillStyle = col.soft; ctx.textAlign = "right"; ctx.textBaseline = "top";
    ctx.fillText("g", S.w - 4, cx.tp - 2);

    ctx.fillStyle = col.ink; ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillText("X", cx.l + 6, 0);
    /* o "t" vai para a direita de tudo, embaixo da faixa do prêmio: no meio ele bate na
       marca de 0,50 e, colado em cx.w, na de 1,00 */
    ctx.textAlign = "right"; ctx.textBaseline = "bottom";
    ctx.fillText("t", S.w - 4, S.h - 2);
  }

  /* ---------- painel do valor ---------- */
  function painelValor(t, x, col) {
    var S = prep(cV), ctx = S.ctx, cx = { l: 10, tp: 14, w: S.w - 10 - 34, h: S.h - 14 - 26 };
    var P = premio(), s = T - t, R = retrato(s), E = edp(), i;
    var vi = P.vista;
    var X = function (v) { return cx.l + (v - vi.lo) / (vi.hi - vi.lo) * cx.w; };
    var Y = function (u) { return cx.tp + (1 - (u - LO) / (HI - LO)) * cx.h; };

    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.fillStyle = col.soft;
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    for (var u = -3; u <= 3; u += 1) {
      var py = Math.round(Y(u)) + .5;
      ctx.beginPath(); ctx.moveTo(cx.l, py); ctx.lineTo(cx.l + cx.w, py); ctx.stroke();
      ctx.fillText(fmt(u, 0), cx.l + cx.w + 6, py);
    }
    if (desconto().zona) {
      ctx.fillStyle = alpha(col.choque, .08);
      ctx.fillRect(cx.l, Y(0), cx.w, cx.tp + cx.h - Y(0));
    }

    ctx.save(); ctx.beginPath(); ctx.rect(cx.l - 2, cx.tp - 2, cx.w + 4, cx.h + 4); ctx.clip();
    ctx.strokeStyle = alpha(col.soft, .85); ctx.lineWidth = 1.4;   /* o prêmio, por trás */
    ctx.setLineDash([5, 4]); ctx.beginPath();
    for (i = 0; i <= 300; i++) {
      var yy = LO + (HI - LO) * i / 300, px = X(P.premio(yy));
      if (i) ctx.lineTo(px, Y(yy)); else ctx.moveTo(px, Y(yy));
    }
    ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = col.ink; ctx.lineWidth = 2.4; ctx.beginPath();  /* v(·,t) pela EDP */
    var iniciou = false;
    for (i = 0; i < E.xs.length; i++) {
      if (E.xs[i] < LO - 0.1 || E.xs[i] > HI + 0.1) continue;
      var p2 = X(R.v[i]);
      if (iniciou) ctx.lineTo(p2, Y(E.xs[i])); else { ctx.moveTo(p2, Y(E.xs[i])); iniciou = true; }
    }
    ctx.stroke();
    ctx.restore();

    /* o Monte Carlo no x escolhido, com a barra de erro */
    var m = mc(x, s), py2 = Y(x), e2 = Math.max(m.erro * 2, 0);
    ctx.strokeStyle = col.carac; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx.l, py2 + .5); ctx.lineTo(cx.l + cx.w, py2 + .5); ctx.stroke();
    /* a barra de dois erros padrão, com pontinhas: com quatro mil caminhos ela costuma ser
       menor que o próprio ponto, e é esse o recado */
    ctx.strokeStyle = col.carac; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(X(m.media - e2), py2); ctx.lineTo(X(m.media + e2), py2);
    ctx.moveTo(X(m.media - e2), py2 - 5); ctx.lineTo(X(m.media - e2), py2 + 5);
    ctx.moveTo(X(m.media + e2), py2 - 5); ctx.lineTo(X(m.media + e2), py2 + 5);
    ctx.stroke();
    ctx.fillStyle = col.carac; ctx.beginPath(); ctx.arc(X(m.media), py2, 3.5, 0, 2 * Math.PI); ctx.fill();

    ctx.fillStyle = col.ink; ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillText("v", cx.l + 4, 0);
  }

  function desenha() {
    var t = parseFloat(rT.value), x = parseFloat(rX.value), col = cores(), s = T - t;
    oT.textContent = fmt(t, 2); oX.textContent = fmt(x, 2);
    painelCaminhos(t, x, col); painelValor(t, x, col);
    var P = premio(), d = desconto(), m = mc(x, s), vEdp = F.interp(edp().xs, retrato(s).v, x);
    var txt = "<span>o prêmio <b>" + P.label.toLowerCase() + "</b> " + P.desc + "</span>"
            + "<span>t = <b>" + fmt(t, 2) + "</b>, falta <b>" + fmt(s, 2) + "</b></span>"
            + "<span>EDP: v(x,t) = <b>" + fmt(vEdp) + "</b></span>"
            + "<span>Monte Carlo (" + m.n + " caminhos): <b>" + fmt(m.media) + "</b> ± " + fmt(2 * m.erro) + "</span>";
    if (!d.zona) txt += "<span>fórmula fechada: <b>" + fmt(P.exato(x, s, d.r)) + "</b></span>";
    else txt += "<span>sem fórmula fechada: a EDP e os caminhos se conferem</span>";
    txt += "<span>" + d.texto + "</span>";
    read.innerHTML = txt;
  }
  function agenda() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; desenha(); }); }
  [sel, selD, rX, rT].forEach(function (el) { el.addEventListener("input", agenda); });
  btn.addEventListener("click", function () {
    tocando = !tocando; btn.textContent = tocando ? "⏸ Pausar" : "▶ Animar";
    if (tocando) { ultimo = 0; requestAnimationFrame(passo); }
  });
  /* animar anda de trás para a frente: o prêmio em T virando valor em 0 */
  function passo(ts) {
    if (!tocando) return;
    if (ultimo) {
      var t = parseFloat(rT.value) - (ts - ultimo) / 1000 * 0.35;
      rT.value = t <= 0 ? T : t;
      desenha();
    }
    ultimo = ts; requestAnimationFrame(passo);
  }
  window.addEventListener("resize", agenda);
  if ("ResizeObserver" in window) new ResizeObserver(agenda).observe(root);
  document.addEventListener("themechange", agenda);
  desenha();
})();
