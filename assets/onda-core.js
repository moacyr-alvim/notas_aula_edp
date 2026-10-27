/* Núcleo da página da equação da onda: fórmula de d'Alembert para u_tt = c² u_xx,
 * u(x,0) = f(x), u_t(x,0) = g(x).  Sem DOM: roda no navegador e no Node (testes).
 *
 *   u(x,t) = ½[f(x−ct) + f(x+ct)] + (1/2c)[G(x+ct) − G(x−ct)],   G′ = g
 *
 * Cada preset dá f, f′, g e uma primitiva G de g (em forma fechada, para não integrar numericamente).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.OndaCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* pulso suave de suporte [−1, 1]: cos²(πx/2) */
  function bump(x) { return Math.abs(x) >= 1 ? 0 : Math.pow(Math.cos(Math.PI * x / 2), 2); }
  function bumpP(x) { return Math.abs(x) >= 1 ? 0 : -(Math.PI / 2) * Math.sin(Math.PI * x); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  /* presets: c é escolhido na hora; g e G podem depender de c (caso "só para a direita": g = −c f′) */
  var PRESETS = {
    parado: {
      label: "Pulso parado (g = 0)", pieces: true, support: [-1, 1],
      f: bump, g: function () { return 0; }, G: function () { return 0; }
    },
    martelada: {
      label: "Martelada (f = 0, g = caixa)", pieces: false, support: [-1, 1],
      f: function () { return 0; },
      g: function (x) { return Math.abs(x) <= 1 ? 1 : 0; },
      G: function (w) { return clamp(w + 1, 0, 2); }          // ∫_{−∞}^w g
    },
    direita: {
      label: "Só para a direita (g = −c f′)", pieces: true, support: [-1, 1],
      f: bump,
      g: function (x, c) { return -c * bumpP(x); },
      G: function (w, c) { return -c * bump(w); }
    }
  };

  function u(P, c, x, t) {
    var a = x - c * t, b = x + c * t;
    return 0.5 * (P.f(a) + P.f(b)) + (P.G(b, c) - P.G(a, c)) / (2 * c);
  }
  /* parte que anda para a direita e parte que anda para a esquerda: u = R + L */
  function right(P, c, x, t) { var a = x - c * t; return 0.5 * P.f(a) - P.G(a, c) / (2 * c); }
  function left(P, c, x, t) { var b = x + c * t; return 0.5 * P.f(b) + P.G(b, c) / (2 * c); }

  /* o domínio de dependência de (x,t) é o intervalo [x−ct, x+ct] do eixo t = 0 */
  function dependencia(c, x, t) { return [x - c * t, x + c * t]; }

  /* o dado inicial vive em P.support, então u(x,t) = 0 fora de [a − ct, b + ct] */
  function regiaoAtingida(P, c, t) { return [P.support[0] - c * t, P.support[1] + c * t]; }

  return { PRESETS: PRESETS, u: u, right: right, left: left, dependencia: dependencia, regiaoAtingida: regiaoAtingida, bump: bump, bumpP: bumpP };
});
