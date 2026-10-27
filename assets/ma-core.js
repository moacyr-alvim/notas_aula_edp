/* Núcleo da página de Monge–Ampère:  det D²u = −1,  u = 0 e Du = 0 sobre uma curva Γ.
 * Sem DOM: roda no navegador e no Node (testes).
 *
 *   P = (P1 + P2)/2          ∇u(P) = ½ R (P2 − P1),   R(w) = (w_y, −w_x)
 *   u(P) = −½ · (área com sinal, anti-horária, entre o arco P1→P2 de Γ e a corda)
 *
 * Cada curva traz  pt(s)  (parametrização) e, quando existe, a fórmula fechada  uClosed(x, y).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.MACore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* V(r) = −∫_r^ρ √(ρ²−s²) ds   (u radial para o círculo de raio ρ) */
  function V(r, rho) {
    var q = Math.min(1, r / rho);
    return -(Math.PI * rho * rho / 4 - (r * Math.sqrt(Math.max(0, rho * rho - r * r)) + rho * rho * Math.asin(q)) / 2);
  }

  var A_E = 1.5, B_E = 0.6;           // semieixos da elipse
  var CURVES = {
    parabola: {
      label: "Parábola y = x²", lo: -1.4, hi: 1.4, span: 2.8, periodic: false,
      view: [-1.7, 1.7, -0.25, 2.25], def: [-1, 1],
      pt: function (s) { return [s, s * s]; },
      uClosed: function (x, y) { var w = y - x * x; return w < 0 ? NaN : -(2 / 3) * Math.pow(w, 1.5); }
    },
    circulo: {
      label: "Círculo de raio 1", lo: 0, hi: 2 * Math.PI, span: Math.PI, periodic: true,
      view: [-1.45, 1.45, -1.2, 1.2], def: [2.2, 4.4],
      pt: function (s) { return [Math.cos(s), Math.sin(s)]; },
      uClosed: function (x, y) { return V(Math.sqrt(x * x + y * y), 1); }
    },
    elipse: {
      label: "Elipse de semieixos 1,5 e 0,6", lo: 0, hi: 2 * Math.PI, span: Math.PI, periodic: true,
      view: [-1.95, 1.95, -0.9, 0.9], def: [2.2, 4.4],
      pt: function (s) { return [A_E * Math.cos(s), B_E * Math.sin(s)]; },
      /* a elipse vem do círculo de raio ρ = √(ab) pela aplicação linear de det 1 diag(√(b/a), √(a/b)) */
      uClosed: function (x, y) { var r = Math.sqrt((B_E / A_E) * x * x + (A_E / B_E) * y * y); return V(r, Math.sqrt(A_E * B_E)); }
    }
  };

  function midpoint(P1, P2) { return [(P1[0] + P2[0]) / 2, (P1[1] + P2[1]) / 2]; }
  function gradient(P1, P2) { var wx = P2[0] - P1[0], wy = P2[1] - P1[1]; return [wy / 2, -wx / 2]; }

  /* área com sinal (anti-horária positiva) do arco s1→s2 fechado pela corda: Green/shoelace */
  function signedArea(curve, s1, s2, n) {
    n = n || 800; var pts = [], i, A = 0;
    for (i = 0; i <= n; i++) pts.push(curve.pt(s1 + (s2 - s1) * i / n));
    for (i = 0; i < pts.length; i++) { var a = pts[i], b = pts[(i + 1) % pts.length]; A += a[0] * b[1] - b[0] * a[1]; }
    return A / 2;
  }
  function uFromArea(curve, s1, s2) { return -signedArea(curve, s1, s2) / 2; }

  /* as duas características que chegam em P: ψ1(s) = (P1+γ(s))/2 e ψ2(s) = (P2+γ(s))/2, s ∈ [s1, s2] */
  function characteristics(curve, s1, s2, n) {
    n = n || 120; var P1 = curve.pt(s1), P2 = curve.pt(s2), a = [], b = [], i;
    for (i = 0; i <= n; i++) { var g = curve.pt(s1 + (s2 - s1) * i / n); a.push(midpoint(P1, g)); b.push(midpoint(P2, g)); }
    return { psi1: a, psi2: b };
  }

  return { CURVES: CURVES, V: V, midpoint: midpoint, gradient: gradient, signedArea: signedArea, uFromArea: uFromArea, characteristics: characteristics };
});
