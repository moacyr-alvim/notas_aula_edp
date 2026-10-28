/* Núcleo da página da equação de transporte  u_t + c u_x = 0.  Sem DOM: roda no navegador e no Node (testes).
 *
 *   reta toda:    u(x,t) = f(x − ct)
 *   semirreta x ≥ 0 com dado de entrada u(0,t) = h(t) e c > 0:
 *                 u(x,t) = f(x − ct)  se x ≥ ct,   h(t − x/c)  se x < ct
 *   semirreta com c < 0: a informação sai; vale f(x − ct) e nenhum dado em x = 0 é permitido.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.TranspCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* perfis com suporte [−1, 1] em torno do centro 0 */
  function pulso(x) { return Math.abs(x) >= 1 ? 0 : Math.pow(Math.cos(Math.PI * x / 2), 2); }
  function caixa(x) { return Math.abs(x) <= 1 ? 1 : 0; }
  function dente(x) { return Math.max(0, 1 - Math.abs(x)); }
  var PERFIS = {
    pulso: { label: "Pulso suave", f: pulso, suave: true },
    caixa: { label: "Caixa (descontínua)", f: caixa, suave: false },
    dente: { label: "Triângulo (com quinas)", f: dente, suave: false }
  };

  /* dado de entrada na semirreta: h(t) = 0,6 sin²(2t) (h(0) = 0 = f(0): compatível) */
  function h(t) { var s = Math.sin(2 * t); return 0.6 * s * s; }

  /* modo "reta": centro do perfil em 0.  modo "semi": centro em 2 e x ≥ 0 */
  var CENTRO = { reta: 0, semi: 2 };

  function u(P, modo, c, x, t) {
    var f = function (y) { return P.f(y - CENTRO[modo]); };
    if (modo === "semi" && c > 0 && x < c * t) return h(t - x / c);
    return f(x - c * t);
  }
  /* de onde vem o valor: pé da característica no eixo (x0 = x − ct) ou ponto de entrada (0, t0) */
  function origem(modo, c, x, t) {
    if (modo === "semi" && c > 0 && x < c * t) return { tipo: "contorno", t0: t - x / c };
    return { tipo: "inicial", x0: x - c * t };
  }
  return { PERFIS: PERFIS, h: h, CENTRO: CENTRO, u: u, origem: origem };
});
