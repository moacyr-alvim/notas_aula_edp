/* Núcleo da página de separação de variáveis.  Sem DOM: roda no navegador e no Node (testes).
 *
 * Barra [0, π] com as pontas a 0:   u_t = k u_xx,  u(0,t) = u(π,t) = 0,  u(x,0) = f(x).
 * Separando variáveis:  u(x,t) = Σ_{n≥1} b_n e^{−k n² t} sin(n x),   b_n = (2/π) ∫₀^π f(x) sin(n x) dx.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SepCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var PI = Math.PI;

  /* perfis com coeficientes de Fourier em forma fechada */
  var PERFIS = {
    constante: { label: "Constante (f = 1)",
      f: function (x) { return 1; },
      b: function (n) { return n % 2 ? 4 / (n * PI) : 0; } },
    triangulo: { label: "Triângulo (pico em π/2)",
      f: function (x) { return x < PI / 2 ? 2 * x / PI : 2 * (PI - x) / PI; },
      b: function (n) { return 8 * Math.sin(n * PI / 2) / (n * n * PI * PI); } },
    parabola: { label: "Parábola 4x(π−x)/π²",
      f: function (x) { return 4 * x * (PI - x) / (PI * PI); },
      b: function (n) { return n % 2 ? 32 / Math.pow(n * PI, 3) : 0; } },
    caixa: { label: "Caixa central [π/4, 3π/4]",
      f: function (x) { return x >= PI / 4 && x <= 3 * PI / 4 ? 1 : 0; },
      b: function (n) { return 2 / (n * PI) * (Math.cos(n * PI / 4) - Math.cos(3 * n * PI / 4)); } }
  };

  /* amplitude do modo n no instante t */
  function amp(P, n, t, k) { return P.b(n) * Math.exp(-(k == null ? 1 : k) * n * n * t); }

  /* soma parcial com N modos */
  function u(P, N, x, t, k) {
    var s = 0;
    for (var n = 1; n <= N; n++) s += amp(P, n, t, k) * Math.sin(n * x);
    return s;
  }

  /* energia (1/π)∫u² = (1/2) Σ a_n²   (Parseval) */
  function energia(P, N, t, k) {
    var s = 0;
    for (var n = 1; n <= N; n++) { var a = amp(P, n, t, k); s += a * a / 2; }
    return s;
  }

  return { PERFIS: PERFIS, amp: amp, u: u, energia: energia };
});
