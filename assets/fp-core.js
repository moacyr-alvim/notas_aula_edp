/* Núcleo da página do passeio aleatório e de Fokker–Planck.
 *
 * O caminhante vive na grade x_j = j h e anda a cada τ:
 *   para a direita com probabilidade p,  para a esquerda com q,  fica parado com 1 − p − q.
 * Escrevendo s = p + q (a "agilidade") e fixando a deriva a e a difusão D,
 *   τ = h² s / (2D),      p − q = a τ / h,
 * de modo que  a = (h/τ)(p − q)  e  D = (h²/2τ) s, como no texto.
 * No limite h → 0 a distribuição resolve  ρ_t = −(aρ)_x + (Dρ)_xx.
 *
 * Sem DOM: roda no navegador e no Node (testes).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.FPCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var D0 = 0.25;                       /* a difusão fica fixa na demo: o que muda é h */

  /* passo do tempo e probabilidades de salto compatíveis com (a, D) */
  function parametros(h, a, s, D) {
    D = D || D0; s = s || 1;
    var tau = h * h * s / (2 * D), dif = a * tau / h;
    return { tau: tau, p: (s + dif) / 2, q: (s - dif) / 2, fica: 1 - s, s: s, D: D };
  }

  /* distribuição exata depois de n passos (itera a equação mestra; nada de sorteio) */
  function distribuicao(h, t, a, s, D) {
    var P = parametros(h, a, s, D), n = Math.max(1, Math.round(t / P.tau)), m = 2 * n + 1;
    var u = new Float64Array(m), v = new Float64Array(m), i, k;
    u[n] = 1;
    for (k = 0; k < n; k++) {
      for (i = 0; i < m; i++) v[i] = 0;
      for (i = 0; i < m; i++) {
        var w = u[i]; if (!w) continue;
        if (i + 1 < m) v[i + 1] += P.p * w;          /* chegou vindo da esquerda */
        if (i - 1 >= 0) v[i - 1] += P.q * w;         /* chegou vindo da direita  */
        v[i] += P.fica * w;
      }
      u.set(v);
    }
    var xs = new Float64Array(m);
    for (i = 0; i < m; i++) xs[i] = (i - n) * h;
    return { xs: xs, P: u, n: n, tau: P.tau, t: n * P.tau, p: P.p, q: P.q, fica: P.fica, h: h };
  }

  /* a solução contínua: gaussiana de média a t e variância 2 D t */
  function gaussiana(x, t, a, D) {
    D = D || D0;
    var d = x - a * t;
    return Math.exp(-d * d / (4 * D * t)) / Math.sqrt(4 * Math.PI * D * t);
  }

  /* média e variância da distribuição discreta */
  function momentos(d) {
    var m = 0, v = 0, i;
    for (i = 0; i < d.xs.length; i++) m += d.xs[i] * d.P[i];
    for (i = 0; i < d.xs.length; i++) v += (d.xs[i] - m) * (d.xs[i] - m) * d.P[i];
    return { massa: d.P.reduce(function (s, w) { return s + w; }, 0), media: m, var: v };
  }

  /* maior diferença entre a densidade discreta P_j/h e a gaussiana, no instante n τ */
  function erroDensidade(d, a, D) {
    var e = 0, i;
    for (i = 0; i < d.xs.length; i++) e = Math.max(e, Math.abs(d.P[i] / d.h - gaussiana(d.xs[i], d.t, a, D)));
    return e;
  }

  /* gerador simples e reprodutível (mulberry32) */
  function rng(semente) {
    var x = semente >>> 0;
    return function () {
      x = (x + 0x6D2B79F5) >>> 0;
      var r = Math.imul(x ^ (x >>> 15), 1 | x);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* trajetórias do caminhante: cada uma é a lista das posições nos instantes 0, τ, 2τ, … */
  function trajetorias(h, T, a, s, quantas, semente, D) {
    var P = parametros(h, a, s, D), n = Math.max(1, Math.round(T / P.tau)), fora = [], j, k;
    for (j = 0; j < quantas; j++) {
      var r = rng(semente + 7919 * j), x = 0, cam = new Float64Array(n + 1);
      for (k = 1; k <= n; k++) {
        var z = r();
        if (z < P.p) x += h; else if (z < P.p + P.q) x -= h;
        cam[k] = x;
      }
      fora.push(cam);
    }
    return { caminhos: fora, n: n, tau: P.tau };
  }

  return { D0: D0, parametros: parametros, distribuicao: distribuicao, gaussiana: gaussiana,
           momentos: momentos, erroDensidade: erroDensidade, trajetorias: trajetorias, rng: rng };
});
