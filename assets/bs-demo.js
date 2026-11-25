/* Demo de Black–Scholes: a réplica.  Depende de bs-core.js.
 * Esquerda: o caminho da ação, com o strike K tracejado — o lado do mercado.
 * Direita: o valor da opção e o da carteira replicante, um em cima do outro; o que sobra
 *          entre eles é o erro do hedge, sombreado — o lado da teoria.
 * A frase que a demo prova: o preço é o custo de uma receita, e a receita funciona mesmo
 * quando a ação faz o que quer — inclusive quando a deriva real mu muda. */
(function () {
  "use strict";
  var B = window.BSCore, root = document.getElementById("demo-bs");
  if (!B || !root) return;
  var $ = function (id) { return document.getElementById(id); };
  var rN = $("bs-n"), oN = $("bs-nv"), rMu = $("bs-mu"), oMu = $("bs-muv"),
      btnS = $("bs-sortear"), btn = $("bs-play"), read = $("bs-readout"),
      cA = $("bs-acao"), cC = $("bs-carteira");
  /* divisores de 480: a grade fina não muda quando o número de rebalanceamentos muda,
     então o caminho sorteado continua exatamente o mesmo e a comparação é honesta */
  var PASSOS = 480, REBAL = [1, 2, 4, 6, 12, 24, 48, 120, 240, 480];
  var semente = 20261125, tocando = false, ultimo = 0, raf = 0, tCursor = 1, cacheH = {}, cacheR = {};

  function op() {
    return { S: B.PADRAO.S, K: B.PADRAO.K, r: B.PADRAO.r, sig: B.PADRAO.sig,
             T: B.PADRAO.T, mu: parseFloat(rMu.value) };
  }
  function nRebal() { return REBAL[parseInt(rN.value, 10)]; }
  function fmt(n, d) { return (Math.abs(n) < 5e-7 ? 0 : n).toFixed(d == null ? 2 : d).replace(".", ",").replace("-", "−"); }
  function pct(n) { return fmt(100 * n, 0) + "%"; }
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

  function sim() {
    var ch = semente + "|" + nRebal() + "|" + rMu.value;
    if (!cacheH[ch]) cacheH[ch] = B.hedge(op(), nRebal(), PASSOS, semente);
    return cacheH[ch];
  }
  function rms() {
    var ch = nRebal() + "|" + rMu.value;
    if (!cacheR[ch]) cacheR[ch] = B.erroHedge(op(), nRebal(), 300, 98765, PASSOS).rms;
    return cacheR[ch];
  }

  /* ------------------------------------------------------- painel da ação */
  function painelAcao(H, ate, col) {
    var S = prep(cA), ctx = S.ctx, cx = { l: 36, tp: 14, w: S.w - 36 - 10, h: S.h - 14 - 26 }, i;
    var lo = Infinity, hi = -Infinity;
    for (i = 0; i <= H.passos; i++) { lo = Math.min(lo, H.S[i]); hi = Math.max(hi, H.S[i]); }
    lo = Math.min(lo, op().K) - 4; hi = Math.max(hi, op().K) + 4;
    var X = function (k) { return cx.l + k / H.passos * cx.w; };
    var Y = function (v) { return cx.tp + (1 - (v - lo) / (hi - lo)) * cx.h; };

    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.fillStyle = col.soft;
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    var passo = (hi - lo) > 90 ? 40 : (hi - lo) > 45 ? 20 : 10;
    for (var v = Math.ceil(lo / passo) * passo; v <= hi; v += passo) {
      var py = Math.round(Y(v)) + .5;
      ctx.beginPath(); ctx.moveTo(cx.l, py); ctx.lineTo(cx.l + cx.w, py); ctx.stroke();
      ctx.fillText(fmt(v, 0), cx.l - 6, py);
    }
    ctx.strokeStyle = alpha(col.choque, .9); ctx.lineWidth = 1.4;    /* o strike */
    ctx.setLineDash([5, 4]); ctx.beginPath();
    ctx.moveTo(cx.l, Math.round(Y(op().K)) + .5); ctx.lineTo(cx.l + cx.w, Math.round(Y(op().K)) + .5);
    ctx.stroke(); ctx.setLineDash([]);
    /* o rótulo do strike leva um fundo opaco, senão a linha tracejada passa por dentro dele */
    var rot = "K = " + op().K, larg = ctx.measureText(rot).width;
    ctx.textAlign = "right"; ctx.textBaseline = "bottom";
    ctx.fillStyle = css("--box-bg") || css("--paper") || "#fff";
    ctx.fillRect(cx.l + cx.w - 6 - larg, Y(op().K) - 17, larg + 6, 15);
    ctx.fillStyle = alpha(col.choque, .95);
    ctx.fillText(rot, cx.l + cx.w - 4, Y(op().K) - 4);

    ctx.save(); ctx.beginPath(); ctx.rect(cx.l, cx.tp - 2, cx.w, cx.h + 4); ctx.clip();
    ctx.strokeStyle = alpha(col.soft, .35); ctx.lineWidth = 1.2;     /* o futuro, apagado */
    ctx.beginPath(); for (i = 0; i <= H.passos; i++) { var p = Y(H.S[i]); if (i) ctx.lineTo(X(i), p); else ctx.moveTo(X(i), p); }
    ctx.stroke();
    ctx.strokeStyle = col.ink; ctx.lineWidth = 1.8;                  /* o passado, firme */
    ctx.beginPath(); for (i = 0; i <= ate; i++) { var p2 = Y(H.S[i]); if (i) ctx.lineTo(X(i), p2); else ctx.moveTo(X(i), p2); }
    ctx.stroke();
    /* as marcas de rebalanceamento */
    var aCada = H.passos / nRebal();
    if (nRebal() <= 48) {
      ctx.fillStyle = alpha(col.carac, .8);
      for (i = 0; i <= H.passos; i += aCada) if (i <= ate) { ctx.beginPath(); ctx.arc(X(i), Y(H.S[i]), 2.6, 0, 2 * Math.PI); ctx.fill(); }
    }
    ctx.restore();
    ctx.fillStyle = col.ink; ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillText("S", cx.l + 6, 0);
    ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillStyle = col.soft;
    ctx.fillText("tempo até o vencimento →", S.w - 4, S.h - 2);
  }

  /* --------------------------------------------- painel da opção e da carteira */
  /* As duas curvas coincidem quase sempre — que é a graça — e por isso viram um borrão só.
     A faixa de baixo mostra a DIFERENÇA, com escala própria: é lá que dá para ver o hedge
     funcionando (fio fino) ou falhando (montanha). */
  function painelCarteira(H, ate, col) {
    var S = prep(cC), ctx = S.ctx, i;
    var alturaDif = 54, vao = 16;
    var cx = { l: 36, tp: 14, w: S.w - 36 - 10, h: S.h - 14 - 26 - alturaDif - vao };
    var cd = { l: cx.l, tp: cx.tp + cx.h + vao, w: cx.w, h: alturaDif };
    var lo = 0, hi = 1;
    for (i = 0; i <= H.passos; i++) { hi = Math.max(hi, H.opcao[i], H.carteira[i]); lo = Math.min(lo, H.carteira[i]); }
    hi += 3; lo -= 2;
    var X = function (k) { return cx.l + k / H.passos * cx.w; };
    var Y = function (v) { return cx.tp + (1 - (v - lo) / (hi - lo)) * cx.h; };

    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.fillStyle = col.soft;
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    var passo = (hi - lo) > 60 ? 20 : (hi - lo) > 25 ? 10 : 5;
    for (var v = Math.ceil(lo / passo) * passo; v <= hi; v += passo) {
      var py = Math.round(Y(v)) + .5;
      ctx.beginPath(); ctx.moveTo(cx.l, py); ctx.lineTo(cx.l + cx.w, py); ctx.stroke();
      ctx.fillText(fmt(v, 0), cx.l - 6, py);
    }

    ctx.save(); ctx.beginPath(); ctx.rect(cx.l, cx.tp - 2, cx.w, cx.h + 4); ctx.clip();
    ctx.strokeStyle = alpha(col.soft, .3); ctx.lineWidth = 1.2;      /* o futuro, apagado */
    ctx.beginPath(); for (i = 0; i <= H.passos; i++) { var p = Y(H.opcao[i]); if (i) ctx.lineTo(X(i), p); else ctx.moveTo(X(i), p); }
    ctx.stroke();
    /* a opção é uma faixa larga e clara; a carteira, um fio fino por cima. Enquanto o fio
       estiver dentro da faixa, a réplica está funcionando. */
    ctx.strokeStyle = alpha(col.ink, .3); ctx.lineWidth = 7; ctx.lineJoin = "round";
    ctx.beginPath(); for (i = 0; i <= ate; i++) { var p2 = Y(H.opcao[i]); if (i) ctx.lineTo(X(i), p2); else ctx.moveTo(X(i), p2); }
    ctx.stroke();
    ctx.strokeStyle = col.carac; ctx.lineWidth = 1.5;                /* a carteira */
    ctx.beginPath();
    for (i = 0; i <= ate; i++) { var p3 = Y(H.carteira[i]); if (i) ctx.lineTo(X(i), p3); else ctx.moveTo(X(i), p3); }
    ctx.stroke();
    ctx.restore();

    /* ---- a faixa da diferença, com escala própria ---- */
    /* escala FIXA em ±2, que só cresce se o erro estourar: assim, aumentar os
       rebalanceamentos achata a tirinha de verdade, em vez de só reescalá-la */
    var maior = 0;
    for (i = 0; i <= ate; i++) maior = Math.max(maior, Math.abs(H.carteira[i] - H.opcao[i]));
    maior = Math.max(2, Math.ceil(maior));
    var Yd = function (v) { return cd.tp + cd.h / 2 - (v / maior) * (cd.h / 2 - 4); };
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cd.l, Math.round(Yd(0)) + .5); ctx.lineTo(cd.l + cd.w, Math.round(Yd(0)) + .5); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.rect(cd.l, cd.tp, cd.w, cd.h); ctx.clip();
    ctx.fillStyle = alpha(col.choque, .3); ctx.beginPath(); ctx.moveTo(X(0), Yd(0));
    for (i = 0; i <= ate; i++) ctx.lineTo(X(i), Yd(H.carteira[i] - H.opcao[i]));
    ctx.lineTo(X(ate), Yd(0)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = col.choque; ctx.lineWidth = 1.2; ctx.beginPath();
    for (i = 0; i <= ate; i++) { var p4 = Yd(H.carteira[i] - H.opcao[i]); if (i) ctx.lineTo(X(i), p4); else ctx.moveTo(X(i), p4); }
    ctx.stroke(); ctx.restore();
    ctx.fillStyle = col.soft; ctx.textAlign = "left"; ctx.textBaseline = "bottom";
    ctx.fillText("diferença, de −" + fmt(maior, 0) + " a +" + fmt(maior, 0), cd.l + 4, cd.tp - 3);

    ctx.fillStyle = col.ink; ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillText("valor", cx.l + 6, 0);
    ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillStyle = col.soft;
    ctx.fillText("tempo até o vencimento →", S.w - 4, S.h - 2);
  }

  function desenha() {
    var H = sim(), col = cores(), ate = Math.max(1, Math.round(tCursor * H.passos));
    oN.textContent = nRebal(); oMu.textContent = pct(parseFloat(rMu.value));
    painelAcao(H, ate, col); painelCarteira(H, ate, col);
    var fim = ate >= H.passos;
    var txt = "<span>prêmio cobrado: <b>" + fmt(H.C0) + "</b></span>"
            + "<span>ação agora: <b>" + fmt(H.S[ate]) + "</b></span>"
            + "<span>opção vale: <b>" + fmt(H.opcao[ate]) + "</b></span>"
            + "<span>carteira vale: <b>" + fmt(H.carteira[ate]) + "</b></span>";
    if (fim) {
      txt += "<span>a opção pagou <b>" + fmt(H.pagamento) + "</b>, e a carteira tinha <b>"
           + fmt(H.carteira[H.passos]) + "</b>: sobra de <b>" + fmt(H.erro) + "</b></span>";
    } else {
      txt += "<span>diferença: <b>" + fmt(H.carteira[ate] - H.opcao[ate]) + "</b></span>";
    }
    txt += "<span>com " + nRebal() + " rebalanceamento" + (nRebal() > 1 ? "s" : "")
         + ", a sobra típica é <b>" + fmt(rms()) + "</b> em 300 caminhos</span>";
    read.innerHTML = txt;
  }
  function agenda() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; desenha(); }); }
  [rN, rMu].forEach(function (el) { el.addEventListener("input", agenda); });
  btnS.addEventListener("click", function () { semente = (semente * 1103515245 + 12345) >>> 0; cacheH = {}; agenda(); });
  btn.addEventListener("click", function () {
    tocando = !tocando; btn.textContent = tocando ? "⏸ Pausar" : "▶ Animar";
    if (tocando) { ultimo = 0; tCursor = 0; requestAnimationFrame(passo); }
  });
  function passo(ts) {
    if (!tocando) return;
    if (ultimo) {
      tCursor += (ts - ultimo) / 1000 * 0.4;
      if (tCursor >= 1) { tCursor = 1; tocando = false; btn.textContent = "▶ Animar"; }
      desenha();
    }
    ultimo = ts; if (tocando) requestAnimationFrame(passo);
  }
  window.addEventListener("resize", agenda);
  if ("ResizeObserver" in window) new ResizeObserver(agenda).observe(root);
  document.addEventListener("themechange", agenda);
  desenha();
})();
