/* Núcleo da página da transformada de Fourier na reta.
 *
 * Convenção:  û(k) = ∫ f(x) e^{-ikx} dx,   f(x) = (1/2π) ∫ û(k) e^{ikx} dk.
 *
 * Quatro formas, todas com uma largura w, e todas com transformada conhecida na mão.
 * As larguras Δx e Δk são as do desvio padrão de |f|² e de |û|², e valem
 *   Δx² = ∫x²|f|² / ∫|f|²,      Δk² = ∫|f'|² / ∫|f|²   (por Parseval),
 * de modo que um salto em f (derivada com energia infinita) dá Δk = ∞.
 *
 * Sem DOM: roda no navegador e no Node (testes).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.TFCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var PI = Math.PI, R2 = Math.sqrt(2), R3 = Math.sqrt(3);

  var FORMAS = {
    caixa: {
      label: "Caixa (vale 1 num intervalo)",
      f: function (x, w) { return Math.abs(x) < w ? 1 : (Math.abs(x) === w ? 0.5 : 0); },
      F: function (k, w) { return Math.abs(k) < 1e-9 ? 2 * w : 2 * Math.sin(w * k) / k; },
      dx: function (w) { return w / R3; },
      dk: function () { return Infinity; },           /* o salto custa uma cauda 1/k */
      formula: "2\\,\\frac{\\operatorname{sen}(wk)}{k}",
      decai: "1/k"
    },
    triangulo: {
      label: "Triângulo (bico)",
      f: function (x, w) { var a = Math.abs(x); return a < w ? 1 - a / w : 0; },
      F: function (k, w) { return Math.abs(k) < 1e-6 ? w - w * w * w * k * k / 12 : 4 * Math.pow(Math.sin(w * k / 2), 2) / (w * k * k); },
      dx: function (w) { return w / Math.sqrt(10); },
      dk: function (w) { return R3 / w; },
      formula: "\\frac4{w}\\,\\frac{\\operatorname{sen}^2(wk/2)}{k^2}",
      decai: "1/k^2"
    },
    exponencial: {
      label: "Exponencial (bico em 0)",
      f: function (x, w) { return Math.exp(-Math.abs(x) / w); },
      F: function (k, w) { return 2 * w / (1 + w * w * k * k); },
      dx: function (w) { return w / R2; },
      dk: function (w) { return 1 / w; },
      formula: "\\frac{2w}{1+w^2k^2}",
      decai: "1/k^2"
    },
    gaussiana: {
      label: "Gaussiana (lisa)",
      f: function (x, w) { return Math.exp(-x * x / (2 * w * w)); },
      F: function (k, w) { return w * Math.sqrt(2 * PI) * Math.exp(-w * w * k * k / 2); },
      dx: function (w) { return w / R2; },
      dk: function (w) { return 1 / (w * R2); },
      formula: "w\\sqrt{2\\pi}\\;e^{-w^2k^2/2}",
      decai: "e^{-w^2k^2/2}"
    }
  };

  /* transformada por integração numérica (ponto médio), para conferir as fórmulas */
  function numerica(f, k, L, M) {
    L = L || 60; M = M || 240000;
    var re = 0, im = 0, hh = 2 * L / M, i;
    for (i = 0; i < M; i++) {
      var x = -L + (i + 0.5) * hh, v = f(x);
      re += v * Math.cos(k * x) * hh;
      im -= v * Math.sin(k * x) * hh;
    }
    return { re: re, im: im };
  }

  /* momentos de |g|² numa grade: massa, e o desvio padrão em torno de zero */
  function larguraNum(g, L, M) {
    var m0 = 0, m2 = 0, hh = 2 * L / M, i;
    for (i = 0; i < M; i++) {
      var x = -L + (i + 0.5) * hh, v = g(x), p = v * v * hh;
      m0 += p; m2 += x * x * p;
    }
    return { massa: m0, largura: Math.sqrt(m2 / m0) };
  }

  function produto(nome, w) {
    var d = FORMAS[nome];
    return d.dx(w) * d.dk(w);                        /* ≥ 1/2, com igualdade só na gaussiana */
  }

  function amostra(nome, w, xs, ks) {
    var d = FORMAS[nome];
    return { fs: xs.map(function (x) { return d.f(x, w); }),
             Fs: ks.map(function (k) { return d.F(k, w); }) };
  }

  return { FORMAS: FORMAS, numerica: numerica, larguraNum: larguraNum, produto: produto, amostra: amostra };
});
