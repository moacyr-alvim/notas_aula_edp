/* Núcleo da página da fórmula de Hopf–Lax, para H(p) = p²/2 e L(v) = v²/2:
 *
 *     u(x,t) = min_y { f(y) + (x − y)² / (2t) },     v = u_x = (x − y*) / t
 *
 * O mínimo é procurado por varredura fina seguida de refinamento parabólico; como os dados
 * desta página são lineares ou quadráticos por partes, G é quadrática perto de cada mínimo
 * e o refinamento é exato. Sem DOM: roda no navegador e no Node (testes).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.HLCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* Dados iniciais de Hamilton–Jacobi.  v0 = f' é o dado da equação de Burgers correspondente. */
  var DADOS = {
    rampa: {
      label: "Rampa: o choque nasce em t* = 2",
      f: function (y) { return y <= 0 ? y : (y >= 2 ? 1 : y - y * y / 4); },
      v0: function (y) { return y <= 0 ? 1 : (y >= 2 ? 0 : 1 - y / 2); },
      tq: 2,                     /* instante da quebra */
      xq: 2,                     /* onde as características se encontram */
      choque: function (t) { return t < 2 ? null : 2 + (t - 2) / 2; }
    },
    degrau: {
      label: "Degrau para baixo: choque desde t = 0",
      f: function (y) { return y <= 0 ? y : 0; },
      v0: function (y) { return y < 0 ? 1 : 0; },
      tq: 0, xq: 0,
      choque: function (t) { return t / 2; },
      exata: function (x, t) { return x < t / 2 ? x - t / 2 : 0; }
    },
    leque: {
      label: "Degrau para cima: leque, sem choque",
      f: function (y) { return y <= 0 ? 0 : y; },
      v0: function (y) { return y < 0 ? 0 : 1; },
      tq: Infinity, xq: 0,
      choque: function () { return null; },
      exata: function (x, t) { return x <= 0 ? 0 : (x >= t ? x - t / 2 : x * x / (2 * t)); }
    }
  };

  /* a função que é minimizada */
  function G(d, x, t, y) { return d.f(y) + (x - y) * (x - y) / (2 * t); }

  /* mínimo de G em [a,b] pela seção áurea: não supõe suavidade, e os dados aqui têm quinas */
  var PHI = (Math.sqrt(5) - 1) / 2;
  function secaoAurea(d, x, t, a, b) {
    var c = b - PHI * (b - a), e = a + PHI * (b - a), gc = G(d, x, t, c), ge = G(d, x, t, e), k;
    for (k = 0; k < 42 && b - a > 1e-12; k++) {
      if (gc <= ge) { b = e; e = c; ge = gc; c = b - PHI * (b - a); gc = G(d, x, t, c); }
      else { a = c; c = e; gc = ge; e = a + PHI * (b - a); ge = G(d, x, t, e); }
    }
    return (a + b) / 2;
  }

  /* todos os mínimos locais de y ↦ G(y), em ordem crescente de valor.
     O minimizante vive em [x − t·max v0, x − t·min v0]; aqui v0 ∈ [0,1], com folga. */
  function minimos(d, x, t, n) {
    n = n || 1600;
    var a = x - t - 1, b = x + 1, h = (b - a) / n, g = new Array(n + 1), i;
    for (i = 0; i <= n; i++) g[i] = G(d, x, t, a + i * h);
    var out = [];
    for (i = 1; i < n; i++) {
      if (g[i] < g[i - 1] && g[i] <= g[i + 1]) {
        var y = secaoAurea(d, x, t, a + (i - 1) * h, a + (i + 1) * h);
        out.push({ y: y, G: G(d, x, t, y) });
      }
    }
    if (!out.length) {                                   /* mínimo numa ponta: raro, mas não falhe */
      var k = 0; for (i = 1; i <= n; i++) if (g[i] < g[k]) k = i;
      out.push({ y: a + k * h, G: g[k] });
    }
    out.sort(function (p, q) { return p.G - q.G; });
    return out;
  }

  /* resolve em um ponto: valor, ponto de partida ótimo e os candidatos que perderam */
  function resolve(d, x, t, n) {
    var m = minimos(d, x, t, n), best = m[0];
    return {
      y: best.y, u: best.G, v: (x - best.y) / t,
      candidatos: m,
      /* diferença de custo para o segundo colocado: perto de zero significa "em cima do choque" */
      folga: m.length > 1 ? m[1].G - best.G : Infinity
    };
  }

  function u(d, x, t, n) { return resolve(d, x, t, n).u; }
  function v(d, x, t, n) { return resolve(d, x, t, n).v; }

  /* perfil em um instante: arrays e as posições dos choques (onde y* salta) */
  function perfil(d, t, x0, x1, nx, ny) {
    nx = nx || 240;
    var xs = [], us = [], vs = [], ys = [], choques = [], i;
    for (i = 0; i <= nx; i++) {
      var x = x0 + (x1 - x0) * i / nx, r = resolve(d, x, t, ny);
      xs.push(x); us.push(r.u); vs.push(r.v); ys.push(r.y);
    }
    var passo = (x1 - x0) / nx;
    for (i = 1; i <= nx; i++) if (ys[i] - ys[i - 1] > 10 * passo + 0.05) choques.push((xs[i] + xs[i - 1]) / 2);
    return { xs: xs, us: us, vs: vs, ys: ys, choques: choques };
  }

  return { DADOS: DADOS, G: G, minimos: minimos, resolve: resolve, u: u, v: v, perfil: perfil };
});
