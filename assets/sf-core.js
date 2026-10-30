/* Núcleo da página de séries de Fourier.  Sem DOM: roda no navegador e no Node (testes).
 *
 * Três dados periódicos de período 2π, com coeficientes em forma fechada:
 *   quadrada  f = sign(x)       S_N = (4/π) Σ_{n ímpar ≤ N} sen(nx)/n
 *   dente     f = x             S_N = 2 Σ_{n ≤ N} (−1)^{n+1} sen(nx)/n
 *   triangulo f = |x|           S_N = π/2 − (4/π) Σ_{n ímpar ≤ N} cos(nx)/n²
 *
 * Em todos, |c_n| é o módulo do coeficiente complexo (n ≥ 1), e ‖f‖² = (1/2π)∫|f|².
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SFCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var PI = Math.PI;
  function env(x) {                                   /* traz x para (−π, π] */
    var y = (x + PI) % (2 * PI);
    return (y < 0 ? y + 2 * PI : y) - PI;
  }

  var DADOS = {
    quadrada: {
      label: "Onda quadrada (salto)",
      f: function (x) { x = env(x); return x === 0 || Math.abs(x) === PI ? 0 : (x > 0 ? 1 : -1); },
      S: function (x, N) { var s = 0; for (var n = 1; n <= N; n += 2) s += Math.sin(n * x) / n; return 4 / PI * s; },
      cn: function (n) { return n % 2 ? 2 / (PI * n) : 0; },     /* |c_n| = |b_n|/2 */
      c0: 0,
      norma2: 1,                                                  /* (1/2π)∫ 1 dx = 1 */
      vista: { lo: -1.35, hi: 1.35, ticks: [-1, 0, 1] },
      decai: "1/n", salto: true
    },
    dente: {
      label: "Dente de serra (salto)",
      f: function (x) { return env(x); },
      S: function (x, N) { var s = 0; for (var n = 1; n <= N; n++) s += (n % 2 ? 1 : -1) * Math.sin(n * x) / n; return 2 * s; },
      cn: function (n) { return 1 / n; },
      c0: 0,
      norma2: PI * PI / 3,                                        /* (1/2π)∫ x² dx */
      vista: { lo: -4, hi: 4, ticks: [-3, -2, -1, 0, 1, 2, 3] },
      decai: "1/n", salto: true
    },
    triangulo: {
      label: "Triângulo (bico)",
      f: function (x) { return Math.abs(env(x)); },
      S: function (x, N) { var s = 0; for (var n = 1; n <= N; n += 2) s += Math.cos(n * x) / (n * n); return PI / 2 - 4 / PI * s; },
      cn: function (n) { return n % 2 ? 2 / (PI * n * n) : 0; },
      c0: PI / 2,
      norma2: PI * PI / 3,
      vista: { lo: -0.5, hi: 4, ticks: [0, 1, 2, 3] },
      decai: "1/n²", salto: false
    }
  };

  /* energia capturada por S_N: |c_0|² + 2 Σ_{n≤N} |c_n|², sobre ‖f‖² (Parseval) */
  function energia(d, N) {
    var s = d.c0 * d.c0;
    for (var n = 1; n <= N; n++) s += 2 * d.cn(n) * d.cn(n);
    return s / d.norma2;
  }

  /* erro máximo e maior valor de S_N num pente de pontos (o excesso de Gibbs aparece aqui) */
  function medidas(d, N, M) {
    M = M || 4000;
    var errMax = 0, sMax = -Infinity, i;
    for (i = 0; i <= M; i++) {
      var x = -PI + 2 * PI * i / M, s = d.S(x, N);
      if (s > sMax) sMax = s;
      if (Math.abs(x) > 1e-9 && Math.abs(Math.abs(x) - PI) > 1e-9) errMax = Math.max(errMax, Math.abs(s - d.f(x)));
    }
    return { erroMax: errMax, maxS: sMax };
  }

  /* coeficiente por integração numérica (ponto médio): confere a fórmula fechada */
  function coefNumerico(d, k, M) {
    M = M || 20000;
    var re = 0, im = 0;
    for (var i = 0; i < M; i++) {
      var x = -PI + (i + 0.5) * 2 * PI / M, v = d.f(x);
      re += v * Math.cos(k * x); im += -v * Math.sin(k * x);
    }
    return { re: re / M, im: im / M };                            /* já dividido por 2π */
  }

  return { DADOS: DADOS, env: env, energia: energia, medidas: medidas, coefNumerico: coefNumerico };
});
