/* Núcleo da página do calor na reta.
 *
 *   u_t = D u_xx  em toda a reta,  u(x,0) = f(x),
 *   u(x,t) = (G_t * f)(x),   G_t(x) = e^{-x²/4Dt} / √(4πDt).
 *
 * Com D = 1/4 fica 4Dt = t, e todas as fórmulas aparecem com √t limpo.
 * Para os dados iniciais usados aqui a convolução sai em forma fechada, com a função erro.
 *
 * Sem DOM: roda no navegador e no Node (testes).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CRCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var PI = Math.PI, D0 = 0.25, PERIODO = 2 * PI;

  /* função erro pela série de termos positivos (sem cancelamento, precisa até o último dígito):
   *   erf(z) = (2/√π) e^{-z²} Σ_{n≥0} 2^n z^{2n+1} / (1·3·5···(2n+1))
   * Para |z| > 6 ela já vale ±1 a menos de 2e-17. */
  function erf(x) {
    var s = x < 0 ? -1 : 1, z = Math.abs(x);
    if (z > 6) return s;
    var soma = z, termo = z, n = 0;
    while (termo > 1e-18 * soma && n < 400) { n++; termo *= 2 * z * z / (2 * n + 1); soma += termo; }
    return s * 2 / Math.sqrt(PI) * Math.exp(-z * z) * soma;
  }
  function nucleo(x, t, D) {
    D = D || D0;
    return Math.exp(-x * x / (4 * D * t)) / Math.sqrt(4 * PI * D * t);
  }
  /* o degrau suavizado: ∫_{-∞}^{b} G_t = (1 + erf(b/√(4Dt)))/2 */
  function passo(b, t, D) { return 0.5 * (1 + erf(b / Math.sqrt(4 * (D || D0) * t))); }
  /* uma caixa de altura 1 entre c-a e c+a, difundida */
  function caixaDif(x, t, c, a, D) { return passo(x - c + a, t, D) - passo(x - c - a, t, D); }

  var DADOS = {
    caixa: {
      label: "Uma caixa",
      f: function (x) { return Math.abs(x) < 1 ? 1 : 0; },
      u: function (x, t, D) { return caixaDif(x, t, 0, 1, D); },
      F: function (k) { return Math.abs(k) < 1e-9 ? 2 : 2 * Math.sin(k) / k; },
      massa: 2, periodico: true
    },
    dois: {
      label: "Dois pulsos separados",
      f: function (x) { return Math.abs(Math.abs(x) - 2) < 0.6 ? 1 : 0; },
      u: function (x, t, D) { return caixaDif(x, t, -2, 0.6, D) + caixaDif(x, t, 2, 0.6, D); },
      F: function (k) { return 2 * Math.cos(2 * k) * (Math.abs(k) < 1e-9 ? 1.2 : 2 * Math.sin(0.6 * k) / k); },
      massa: 2.4, periodico: true
    },
    ponto: {
      label: "Tudo concentrado num ponto",
      f: null,                                        /* é a delta: só existe para t > 0 */
      u: function (x, t, D) { return nucleo(x, t, D); },
      F: function () { return 1; },
      massa: 1, periodico: true
    },
    degrau: {
      label: "Um degrau (quente de um lado)",
      f: function (x) { return x < 0 ? 1 : 0; },
      u: function (x, t, D) { return passo(-x, t, D); },
      F: null,                                        /* não é integrável: sem espectro honesto */
      massa: Infinity, periodico: false
    }
  };

  /* a mesma solução vista no círculo de período 2π: é a da reta somada sobre as voltas */
  function noCirculo(d, x, t, D, voltas) {
    voltas = voltas || 8;
    var s = 0, m;
    for (m = -voltas; m <= voltas; m++) s += d.u(x + m * PERIODO, t, D);
    return s;
  }

  /* |û(k,t)| = e^{-Dk²t} |û₀(k)| */
  function espectro(d, k, t, D) {
    return d.F ? Math.exp(-(D || D0) * k * k * t) * Math.abs(d.F(k)) : null;
  }

  /* o perfil reescalado: √(4Dt)·u(ξ√(4Dt), t).  Para a delta ele não depende de t. */
  function colapso(d, xi, t, D) {
    var e = Math.sqrt(4 * (D || D0) * t);
    return e * d.u(xi * e, t, D);
  }

  return { D0: D0, PERIODO: PERIODO, erf: erf, nucleo: nucleo, passo: passo, DADOS: DADOS,
           noCirculo: noCirculo, espectro: espectro, colapso: colapso };
});
