/* Núcleo da página de convolução: convolução linear (padding com zeros) e circular (extensão periódica).
 * Sem DOM: roda no navegador e no Node (testes).
 *
 * Um sinal u tem índices 0..N−1. Um núcleo (filtro) v tem índices 0..M−1, com M ≤ N.
 *   z_j = Σ_l v_l · ũ_{j−l},   onde ũ é o sinal "chutado" para fora da janela:
 *     "zeros"     ũ_i = 0 fora de [0, N−1]       →  convolução linear,   N+M−1 valores (j = 0 … N+M−2)
 *     "periodico" ũ_i = u_{i mod N}              →  convolução circular, N valores      (j = 0 … N−1)
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ConvCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* valor do sinal estendido no índice i */
  function ext(u, i, modo) {
    var N = u.length;
    if (modo === "periodico") return u[((i % N) + N) % N];
    return (i >= 0 && i < N) ? u[i] : 0;
  }

  function nSaida(N, M, modo) { return modo === "periodico" ? N : N + M - 1; }

  /* termos de z_j: [{l, i, vl, ui}] com i = j − l, e a soma */
  function termos(u, v, j, modo) {
    var t = [], s = 0;
    for (var l = 0; l < v.length; l++) { var ui = ext(u, j - l, modo); t.push({ l: l, i: j - l, vl: v[l], ui: ui }); s += v[l] * ui; }
    return { termos: t, soma: s };
  }

  function conv(u, v, modo) {
    var n = nSaida(u.length, v.length, modo), z = [];
    for (var j = 0; j < n; j++) z.push(termos(u, v, j, modo).soma);
    return z;
  }
  function linear(u, v) { return conv(u, v, "zeros"); }
  function circular(u, v) { return conv(u, v, "periodico"); }   // v mais curto que u: equivale a completar v com zeros

  /* o mesmo cálculo pela regra "índices somam k" (produto de polinômios, módulo x^N − 1 no caso circular) */
  function porSoma(u, v, N) {
    var z = new Array(N == null ? u.length + v.length - 1 : N).fill(0);
    for (var m = 0; m < u.length; m++) for (var l = 0; l < v.length; l++) { var k = m + l; if (N != null) k %= N; z[k] += u[m] * v[l]; }
    return z;
  }

  return { ext: ext, nSaida: nSaida, termos: termos, conv: conv, linear: linear, circular: circular, porSoma: porSoma };
});
