/* Núcleo da página de equações diferenciais estocásticas e Fokker–Planck.
 *
 * A família linear  dX = (μ − γX) dt + σ dB  tem solução gaussiana para dado inicial gaussiano:
 *
 *   m(t) = m₀ e^{−γt} + (μ/γ)(1 − e^{−γt}),      v(t) = v₀ e^{−2γt} + (σ²/2γ)(1 − e^{−2γt}),
 *
 * com o limite γ → 0 dando m = m₀ + μt e v = v₀ + σ²t.  Dentro dela moram os três primeiros
 * exemplos da página:
 *   σ = 0           → só deriva: a EDP é transporte, e as características são as trajetórias;
 *   γ = 0           → browniano com deriva: a EDP é o calor transladado;
 *   μ = 0, γ > 0    → Ornstein–Uhlenbeck: deriva de volta ao zero, e variância que satura.
 * O quarto, o browniano geométrico, é o caso γ = 0 visto por exp.
 *
 * Sem DOM: roda no navegador e no Node (testes).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.EDSCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var PI = Math.PI;

  /* média e variância da família linear, com o caso γ = 0 tratado à parte */
  function momentos(e, t) {
    var g = e.gama, mu = e.mu, s2 = e.sigma * e.sigma;
    if (Math.abs(g) < 1e-12) return { m: e.m0 + mu * t, v: e.v0 + s2 * t };
    var d = Math.exp(-g * t);
    return { m: e.m0 * d + (mu / g) * (1 - d),
             v: e.v0 * d * d + (s2 / (2 * g)) * (1 - d * d) };
  }
  function gauss(x, m, v) { return Math.exp(-(x - m) * (x - m) / (2 * v)) / Math.sqrt(2 * PI * v); }

  var EXEMPLOS = {
    transporte: {
      label: "Só deriva, sem ruído",
      eds: "dX = -\\gamma X\\,dt",
      edp: "\\rho_t+\\partial_x(-\\gamma x\\rho)=0",
      gama: 0.8, mu: 0, sigma: 0, m0: 2.2, v0: 0.09, vista: { lo: -1.2, hi: 3.4 },
      nota: "a trajetória é a solução da EDO, e a nuvem é carregada por ela"
    },
    browniano: {
      label: "Browniano com deriva",
      eds: "dX = \\mu\\,dt+\\sigma\\,dB",
      edp: "\\rho_t=-\\mu\\rho_x+\\tfrac{\\sigma^2}2\\rho_{xx}",
      gama: 0, mu: 0.7, sigma: 0.75, m0: -1.6, v0: 0.09, vista: { lo: -4.6, hi: 3.8 },
      nota: "a nuvem anda com velocidade μ e espalha com √t"
    },
    ou: {
      label: "Ornstein–Uhlenbeck",
      eds: "dX = -\\gamma X\\,dt+\\sigma\\,dB",
      edp: "\\rho_t=\\gamma\\partial_x(x\\rho)+\\tfrac{\\sigma^2}2\\rho_{xx}",
      gama: 0.8, mu: 0, sigma: 0.75, m0: 2.2, v0: 0.09, vista: { lo: -2.4, hi: 3.4 },
      nota: "a mesma deriva de cima, agora com ruído: a variância satura em σ²/2γ"
    },
    gbm: {
      label: "Browniano geométrico",
      eds: "dS = \\mu S\\,dt+\\sigma S\\,dB",
      edp: "\\rho_t=-\\partial_S(\\mu S\\rho)+\\tfrac12\\partial_{SS}(\\sigma^2S^2\\rho)",
      gama: 0, mu: 0.45, sigma: 0.5, m0: 0, v0: 1e-4, log: true, vista: { lo: 0, hi: 5.2 },
      nota: "o logaritmo é browniano com deriva μ − σ²/2, e a densidade é lognormal"
    }
  };

  /* densidade exata: gaussiana, ou lognormal quando o exemplo mora no logaritmo */
  function densidade(e, x, t) {
    var mo = momentos(logParam(e), t);
    if (!e.log) return gauss(x, mo.m, mo.v);
    return x <= 0 ? 0 : gauss(Math.log(x), mo.m, mo.v) / x;
  }
  /* para o browniano geométrico, quem é linear é ln S: a deriva vira μ − σ²/2 */
  function logParam(e) {
    if (!e.log) return e;
    return { gama: 0, mu: e.mu - e.sigma * e.sigma / 2, sigma: e.sigma, m0: e.m0, v0: e.v0 };
  }
  function media(e, t) {
    var mo = momentos(logParam(e), t);
    return e.log ? Math.exp(mo.m + mo.v / 2) : mo.m;      /* E[S] = e^{m+v/2} */
  }
  function variancia(e, t) {
    var mo = momentos(logParam(e), t);
    if (!e.log) return mo.v;
    return (Math.exp(mo.v) - 1) * Math.exp(2 * mo.m + mo.v);
  }
  function estacionaria(e) {                                /* variância de equilíbrio, se houver */
    if (e.log || Math.abs(e.gama) < 1e-12) return null;
    return e.sigma * e.sigma / (2 * e.gama);
  }

  /* gerador reprodutível e normais por Box–Muller */
  function rng(semente) {
    var x = semente >>> 0;
    return function () {
      x = (x + 0x6D2B79F5) >>> 0;
      var r = Math.imul(x ^ (x >>> 15), 1 | x);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }
  function normais(r) {
    var u = Math.max(r(), 1e-12), v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * PI * v);
  }

  /* caminhos por Euler–Maruyama: X ← X + b(X)dt + σ(X)√dt·Z  (σ avaliado ANTES do passo: Itô) */
  function caminhos(e, T, passos, quantos, semente) {
    var dt = T / passos, raiz = Math.sqrt(dt), fora = [], j, k;
    for (j = 0; j < quantos; j++) {
      var r = rng(semente + 7919 * j), cam = new Float64Array(passos + 1);
      /* o ponto de partida é sorteado do próprio dado inicial, para o feixe de caminhos
         começar tão espalhado quanto a nuvem do outro painel */
      var x0 = e.m0 + Math.sqrt(e.v0) * normais(r);
      var x = e.log ? Math.exp(x0) : x0;
      cam[0] = x;
      for (k = 1; k <= passos; k++) {
        var z = normais(r);
        var b = e.log ? e.mu * x : (e.mu - e.gama * x);
        var s = e.log ? e.sigma * x : e.sigma;
        x = x + b * dt + s * raiz * z;
        if (e.log && x < 1e-9) x = 1e-9;                    /* o GBM não cruza o zero */
        cam[k] = x;
      }
      fora.push(cam);
    }
    return { caminhos: fora, dt: dt, passos: passos };
  }

  /* resíduo de Fokker–Planck na densidade exata: tem que dar zero */
  function residuoFP(e, x, t, hx, ht) {
    hx = hx || 1e-4; ht = ht || 1e-5;
    var b = function (z) { return e.log ? e.mu * z : (e.mu - e.gama * z); };
    var s2 = function (z) { return e.log ? e.sigma * e.sigma * z * z : e.sigma * e.sigma; };
    var rt = (densidade(e, x, t + ht) - densidade(e, x, t - ht)) / (2 * ht);
    var fx = function (z) { return b(z) * densidade(e, z, t); };
    var gx = function (z) { return s2(z) * densidade(e, z, t); };
    var dfx = (fx(x + hx) - fx(x - hx)) / (2 * hx);
    var d2gx = (gx(x + hx) - 2 * gx(x) + gx(x - hx)) / (hx * hx);
    return rt + dfx - 0.5 * d2gx;
  }

  return { EXEMPLOS: EXEMPLOS, momentos: momentos, logParam: logParam, gauss: gauss,
           densidade: densidade, media: media, variancia: variancia, estacionaria: estacionaria,
           caminhos: caminhos, residuoFP: residuoFP, rng: rng, normais: normais };
});
