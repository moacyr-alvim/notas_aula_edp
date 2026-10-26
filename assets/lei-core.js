/* Núcleo da demo "leis de conservação": problema de Riemann para u_t + F(u)_x = 0
 * com fluxos quadráticos F(u) = a u² + b u  (cobrem transporte, Burgers e o fluxo do trânsito LWR).
 * Sem DOM: roda no navegador e no Node (testes).
 *
 *   velocidade característica  λ(u) = F'(u) = 2a u + b
 *   velocidade de Rankine–Hugoniot (corda de F)  σ = (F(uL) − F(uR)) / (uL − uR) = a (uL + uR) + b
 *   condição de Lax:  λ(uL) > σ > λ(uR)   (as características entram no choque)
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.LeiCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var FLUXES = {
    burgers:    { label: "Burgers: F(u) = u²/2",          a: 0.5,  b: 0, def: [1, 0] },
    transito:   { label: "Trânsito (LWR): F(u) = u(1 − u)", a: -1,   b: 1, def: [0.5, 0.8] },
    transporte: { label: "Transporte: F(u) = u",          a: 0,    b: 1, def: [1, 0] }
  };

  function F(fl, u) { return fl.a * u * u + fl.b * u; }
  function lam(fl, u) { return 2 * fl.a * u + fl.b; }

  // classificação do problema de Riemann (uL, uR)
  function riemann(fl, uL, uR) {
    var eps = 1e-12;
    if (Math.abs(uL - uR) < eps) return { type: "none", lamL: lam(fl, uL), lamR: lam(fl, uR), sigma: lam(fl, uL) };
    var sigma = fl.a * (uL + uR) + fl.b, lL = lam(fl, uL), lR = lam(fl, uR);
    if (Math.abs(fl.a) < eps) return { type: "contact", sigma: sigma, lamL: lL, lamR: lR };
    if (lL > lR) return { type: "shock", sigma: sigma, lamL: lL, lamR: lR };      // Lax satisfeita
    return { type: "fan", sigma: sigma, lamL: lL, lamR: lR };                      // leque de rarefação
  }

  // solução admissível (de entropia) em (x,t), t > 0
  function u(fl, uL, uR, x, t) {
    var r = riemann(fl, uL, uR), xi = x / t;
    if (r.type === "none") return uL;
    if (r.type === "shock" || r.type === "contact") return xi < r.sigma ? uL : uR;
    if (xi <= r.lamL) return uL;
    if (xi >= r.lamR) return uR;
    return (xi - fl.b) / (2 * fl.a);                                                // λ(u) = x/t
  }

  // solução fraca NÃO admissível: o salto de Rankine–Hugoniot onde deveria haver leque
  function uNaoAdmissivel(fl, uL, uR, x, t) {
    var r = riemann(fl, uL, uR);
    return (x / t) < r.sigma ? uL : uR;
  }

  // máximo/mínimo de F no intervalo [lo, hi] (F quadrática)
  function extremoF(fl, lo, hi, tipo) {
    var c = [F(fl, lo), F(fl, hi)];
    if (Math.abs(fl.a) > 1e-12) { var v = -fl.b / (2 * fl.a); if (v > lo && v < hi) c.push(F(fl, v)); }
    return tipo === "min" ? Math.min.apply(null, c) : Math.max.apply(null, c);
  }
  // fluxo numérico de Godunov (para testar o solver exato de forma independente)
  function fluxoGodunov(fl, ul, ur) {
    return ul <= ur ? extremoF(fl, ul, ur, "min") : extremoF(fl, ur, ul, "max");
  }
  function godunov(fl, uL, uR, xmin, xmax, n, T) {
    var dx = (xmax - xmin) / n, v = new Float64Array(n), i;
    for (i = 0; i < n; i++) v[i] = (xmin + (i + 0.5) * dx) < 0 ? uL : uR;
    var t = 0;
    while (t < T - 1e-12) {
      var m = 1e-9; for (i = 0; i < n; i++) m = Math.max(m, Math.abs(lam(fl, v[i])));
      var dt = Math.min(0.4 * dx / m, T - t), Fl = new Float64Array(n + 1);
      for (i = 0; i <= n; i++) Fl[i] = fluxoGodunov(fl, v[Math.max(i - 1, 0)], v[Math.min(i, n - 1)]);
      for (i = 0; i < n; i++) v[i] -= dt / dx * (Fl[i + 1] - Fl[i]);
      t += dt;
    }
    return { dx: dx, xmin: xmin, u: v };
  }

  return { FLUXES: FLUXES, F: F, lam: lam, riemann: riemann, u: u, uNaoAdmissivel: uNaoAdmissivel, godunov: godunov };
});
