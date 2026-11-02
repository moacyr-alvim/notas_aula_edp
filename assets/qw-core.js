/* Núcleo da página do poço infinito.  Unidades com ħ = 1 e 2m = 1, poço em [0, π]:
 *
 *   autofunções  φ_n(x) = √(2/π) sen(nx),   energias  E_n = n²,
 *   solução      ψ(x,t) = Σ c_n φ_n(x) e^{−i n² t}.
 *
 * Com E_n inteiro, todas as fases voltam ao início em t = 2π (ressurgimento) e viram (−1)^n
 * em t = π (espelho).  Sem DOM: roda no navegador e no Node (testes).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.QWCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var PI = Math.PI, NMODOS = 80, RESSURG = 2 * PI, ESPELHO = PI;
  function phi(n, x) { return Math.sqrt(2 / PI) * Math.sin(n * x); }

  /* dados iniciais: ou coeficientes exatos, ou uma função a ser projetada na base */
  var ESTADOS = {
    fundamental: {
      label: "Estado fundamental (n = 1)",
      coef: function () { var c = [{ re: 1, im: 0 }]; return c; }
    },
    dois: {
      label: "Superposição n = 1 e n = 2",
      coef: function () { var s = Math.SQRT1_2; return [{ re: s, im: 0 }, { re: s, im: 0 }]; }
    },
    pacote: {
      label: "Pacote parado no meio",
      f: function (x) { var d = x - PI / 2; return { re: Math.exp(-d * d / (2 * 0.09)), im: 0 }; }
    },
    impulso: {
      label: "Pacote com impulso (k = 6)",
      f: function (x) {
        var d = x - PI / 2, g = Math.exp(-d * d / (2 * 0.09));
        return { re: g * Math.cos(6 * x), im: g * Math.sin(6 * x) };
      }
    },
    caixa: {
      label: "Partícula na metade esquerda",
      f: function (x) { return { re: x > 0.15 && x < PI / 2 ? 1 : 0, im: 0 } ; }
    }
  };

  /* projeta f na base e normaliza: c_n = <φ_n, f> (integração pelo ponto médio) */
  function coeficientes(e, nmodos, M) {
    nmodos = nmodos || NMODOS; M = M || 4000;
    if (e.coef) {
      var c0 = e.coef(), out = [];
      for (var i = 0; i < nmodos; i++) out.push(c0[i] || { re: 0, im: 0 });
      return normaliza(out);
    }
    var c = [], n, i2, h = PI / M;
    for (n = 1; n <= nmodos; n++) {
      var re = 0, im = 0;
      for (i2 = 0; i2 < M; i2++) {
        var x = (i2 + 0.5) * h, v = e.f(x), p = phi(n, x);
        re += v.re * p; im += v.im * p;
      }
      c.push({ re: re * h, im: im * h });
    }
    return normaliza(c);
  }
  function normaliza(c) {
    var s = 0, i;
    for (i = 0; i < c.length; i++) s += c[i].re * c[i].re + c[i].im * c[i].im;
    s = Math.sqrt(s);
    return c.map(function (z) { return { re: z.re / s, im: z.im / s }; });
  }

  /* ψ(x,t) = Σ c_n φ_n(x) e^{−i n² t} */
  function psi(c, x, t) {
    var re = 0, im = 0;
    for (var n = 1; n <= c.length; n++) {
      var z = c[n - 1]; if (!z.re && !z.im) continue;
      var p = phi(n, x), a = -n * n * t, co = Math.cos(a), si = Math.sin(a);
      re += p * (z.re * co - z.im * si);
      im += p * (z.re * si + z.im * co);
    }
    return { re: re, im: im };
  }
  function densidade(c, xs, t) {
    return xs.map(function (x) { var z = psi(c, x, t); return z.re * z.re + z.im * z.im; });
  }

  /* observáveis */
  function norma(c) { var s = 0; for (var i = 0; i < c.length; i++) s += c[i].re * c[i].re + c[i].im * c[i].im; return s; }
  function energiaMedia(c) {
    var s = 0; for (var i = 0; i < c.length; i++) { var n = i + 1; s += (c[i].re * c[i].re + c[i].im * c[i].im) * n * n; }
    return s;
  }
  function posicaoMedia(c, t, M) {
    M = M || 2000; var h = PI / M, s = 0, m = 0;
    for (var i = 0; i < M; i++) {
      var x = (i + 0.5) * h, z = psi(c, x, t), d = (z.re * z.re + z.im * z.im) * h;
      s += x * d; m += d;
    }
    return s / m;
  }
  function ocupacao(c) { return c.map(function (z) { return z.re * z.re + z.im * z.im; }); }

  return { ESTADOS: ESTADOS, phi: phi, coeficientes: coeficientes, psi: psi, densidade: densidade,
           norma: norma, energiaMedia: energiaMedia, posicaoMedia: posicaoMedia, ocupacao: ocupacao,
           RESSURG: RESSURG, ESPELHO: ESPELHO, NMODOS: NMODOS };
});
