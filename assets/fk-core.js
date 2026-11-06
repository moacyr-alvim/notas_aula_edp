/* Núcleo da página de Feynman–Kac.
 *
 * O processo é o browniano puro  dX = σ dB  com σ = 1, ou seja D = σ²/2 = 1/2.
 * O que se calcula é o valor esperado de um prêmio pago no instante final T, descontado:
 *
 *   v(x,t) = E[ exp(−∫_t^T r(X_u) du) · g(X_T) | X_t = x ],
 *
 * que resolve a equação para trás com desconto
 *
 *   −v_t = D v_xx − r(x) v,     v(·,T) = g,
 *
 * e aqui é resolvida no tempo até o vencimento  s = T − t, em que ela fica para a frente:
 * v_s = D v_xx − r v, com dado inicial g. Para r constante a solução fechada é o prêmio
 * convolvido com o núcleo do calor vezes e^{−rs}; para r variável (a "zona de perigo")
 * não há fórmula, e os dois lados — EDP e Monte Carlo — se conferem um ao outro.
 *
 * O desconto tem duas leituras, e as duas estão implementadas em monteCarlo():
 *   modo "peso"  — cada caminho carrega o peso exp(−∫r dt)   (variância baixa);
 *   modo "morte" — cada caminho morre com taxa r(x) e paga 0 se morrer.
 * Elas têm a mesma média: é o mesmo termo −rv visto de dois jeitos.
 *
 * Sem DOM: roda no navegador e no Node (testes).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.FKCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var PI = Math.PI, D = 0.5, SIGMA = 1, T = 1;

  /* função erro por série de termos positivos (a mesma de cr-core.js: a aproximação
     clássica de A&S tem erro 1,5e-7, que aparece quando se compara com a EDP) */
  function erf(x) {
    var s = x < 0 ? -1 : 1, z = Math.abs(x);
    if (z > 6) return s;
    var soma = z, termo = z, n = 0;
    while (termo > 1e-18 * soma && n < 400) { n++; termo *= 2 * z * z / (2 * n + 1); soma += termo; }
    return s * 2 / Math.sqrt(PI) * Math.exp(-z * z) * soma;
  }
  function Phi(z) { return 0.5 * (1 + erf(z / Math.SQRT2)); }     /* normal acumulada */
  function phi(z) { return Math.exp(-z * z / 2) / Math.sqrt(2 * PI); }

  /* Os prêmios.  "exato" é o valor com desconto CONSTANTE r, a tempo s do vencimento;
     com s = 0 tem que devolver o próprio prêmio. */
  var PREMIOS = {
    degrau: {
      label: "Degrau", desc: "paga 1 se terminar à direita de 0",
      g: "g(x)=\\mathbf 1_{\\{x>0\\}}",
      fechada: "e^{-rs}\\,\\Phi\\!\\left(x/\\sqrt s\\right)",
      vista: { lo: -0.05, hi: 1.15 },
      premio: function (x) { return x > 0 ? 1 : 0; },
      exato: function (x, s, r) { return s <= 0 ? (x > 0 ? 1 : 0) : Math.exp(-r * s) * Phi(x / Math.sqrt(s)); }
    },
    call: {
      label: "Rampa", desc: "paga o quanto passar de 0",
      g: "g(x)=\\max(x,0)",
      fechada: "e^{-rs}\\left[x\\,\\Phi\\!\\left(x/\\sqrt s\\right)+\\sqrt s\\,\\varphi\\!\\left(x/\\sqrt s\\right)\\right]",
      vista: { lo: -0.1, hi: 2.6 },
      premio: function (x) { return Math.max(x, 0); },
      exato: function (x, s, r) {
        if (s <= 0) return Math.max(x, 0);
        var z = x / Math.sqrt(s);
        return Math.exp(-r * s) * (x * Phi(z) + Math.sqrt(s) * phi(z));
      }
    },
    caixa: {
      label: "Caixa", desc: "paga 1 se terminar entre −1 e 1",
      g: "g(x)=\\mathbf 1_{\\{|x|<1\\}}",
      vista: { lo: -0.05, hi: 1.15 },
      fechada: "e^{-rs}\\left[\\Phi\\!\\left(\\tfrac{1-x}{\\sqrt s}\\right)-\\Phi\\!\\left(\\tfrac{-1-x}{\\sqrt s}\\right)\\right]",
      premio: function (x) { return Math.abs(x) < 1 ? 1 : 0; },
      exato: function (x, s, r) {
        if (s <= 0) return Math.abs(x) < 1 ? 1 : 0;
        var q = Math.sqrt(s);
        return Math.exp(-r * s) * (Phi((1 - x) / q) - Phi((-1 - x) / q));
      }
    },
    sino: {
      label: "Sino", desc: "paga mais quanto mais perto de 0",
      g: "g(x)=e^{-x^2/2}",
      fechada: "\\dfrac{e^{-rs}}{\\sqrt{1+s}}\\,e^{-x^2/2(1+s)}",
      vista: { lo: -0.05, hi: 1.15 },
      premio: function (x) { return Math.exp(-x * x / 2); },
      exato: function (x, s, r) {
        if (s <= 0) return Math.exp(-x * x / 2);
        return Math.exp(-r * s) / Math.sqrt(1 + s) * Math.exp(-x * x / (2 * (1 + s)));
      }
    }
  };

  /* O desconto.  "zona" é a taxa ligada só à esquerda de 0: lá não há fórmula fechada,
     e é justamente aí que a EDP e o Monte Carlo passam a se conferir um ao outro. */
  function taxa(desc, x) {
    if (!desc || !desc.r) return 0;
    return desc.zona ? (x < 0 ? desc.r : 0) : desc.r;
  }

  /* ---------- o lado da EDP: v_s = D v_xx − r(x) v, explícito ---------- */
  /* A grade é deslocada de meio passo para que nenhum ponto caia exatamente em 0,
     onde o degrau e a caixa saltam. */
  function grade(XL, dx) {
    var m = Math.round(2 * XL / dx), xs = new Float64Array(m), i;
    for (i = 0; i < m; i++) xs[i] = -XL + (i + 0.5) * dx;
    return xs;
  }

  function resolveEDP(premio, desc, sMax, opts) {
    opts = opts || {};
    var XL = opts.XL || 8, dx = opts.dx || 0.02;
    var xs = grade(XL, dx), m = xs.length, i, n;
    var lam = opts.lam || 0.4;                       /* D·ds/dx² ≤ 1/2 para estabilidade */
    var ds = lam * dx * dx / D, passos = Math.max(1, Math.ceil(sMax / ds));
    ds = sMax / passos;  lam = D * ds / (dx * dx);
    var v = new Float64Array(m), w = new Float64Array(m), rs = new Float64Array(m);
    for (i = 0; i < m; i++) { v[i] = premio.premio(xs[i]); rs[i] = taxa(desc, xs[i]); }
    var guardar = opts.retratos || 0, retratos = guardar ? [{ s: 0, v: v.slice() }] : null;
    var quando = guardar ? Math.max(1, Math.floor(passos / guardar)) : 0;
    /* o desconto entra MULTIPLICANDO, exp(−r ds), e não como −r·ds·v: é o que o caminho
       faz (sobreviver o passo e seguir), nunca fica negativo, e com r constante devolve
       e^{−rs} exato em vez de (1−r ds)^n */
    var fat = new Float64Array(m);
    for (i = 0; i < m; i++) fat[i] = Math.exp(-rs[i] * ds);
    for (n = 1; n <= passos; n++) {
      for (i = 1; i < m - 1; i++) {
        w[i] = (v[i] + lam * (v[i + 1] - 2 * v[i] + v[i - 1])) * fat[i];
      }
      /* nas bordas, a 8 desvios de distância, o prêmio só sofre o desconto */
      w[0] = premio.premio(xs[0]) * Math.exp(-rs[0] * n * ds);
      w[m - 1] = premio.premio(xs[m - 1]) * Math.exp(-rs[m - 1] * n * ds);
      var tmp = v; v = w; w = tmp;
      if (guardar && (n % quando === 0 || n === passos)) retratos.push({ s: n * ds, v: v.slice() });
    }
    return { xs: xs, v: v, ds: ds, passos: passos, retratos: retratos,
             em: function (x) { return interp(xs, v, x); } };
  }

  function interp(xs, v, x) {
    var dx = xs[1] - xs[0], t = (x - xs[0]) / dx, i = Math.floor(t);
    if (i < 0) return v[0];
    if (i >= xs.length - 1) return v[xs.length - 1];
    return v[i] + (t - i) * (v[i + 1] - v[i]);
  }

  /* ---------- sorteio ---------- */
  function rng(semente) {
    var x = semente >>> 0;
    return function () {
      x = (x + 0x6D2B79F5) >>> 0;
      var r = Math.imul(x ^ (x >>> 15), 1 | x);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }
  function normal(r) {
    var u = Math.max(r(), 1e-12), w = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * PI * w);
  }

  /* ---------- o lado dos caminhos ---------- */
  /* modo "peso": o caminho carrega exp(−∫r dt).  modo "morte": ele morre com taxa r(x). */
  function monteCarlo(premio, desc, x0, s, quantos, semente, modo) {
    var passos = Math.max(10, Math.round(s * 200)), dt = s / passos, raiz = SIGMA * Math.sqrt(dt);
    var r = rng(semente), soma = 0, soma2 = 0, mortos = 0, j, k;
    for (j = 0; j < quantos; j++) {
      var x = x0, peso = 1, vivo = true;
      for (k = 0; k < passos; k++) {
        var rx = taxa(desc, x);
        if (modo === "morte") {
          if (rx > 0 && r() > Math.exp(-rx * dt)) { vivo = false; mortos++; break; }
        } else {
          peso *= Math.exp(-rx * dt);
        }
        x = x + raiz * normal(r);
      }
      var paga = vivo ? peso * premio.premio(x) : 0;
      soma += paga; soma2 += paga * paga;
    }
    var media = soma / quantos, va = Math.max(soma2 / quantos - media * media, 0);
    return { media: media, erro: Math.sqrt(va / quantos), mortos: mortos / quantos, n: quantos };
  }

  /* caminhos para desenhar, com o instante da morte quando ela acontece */
  function caminhos(desc, x0, s, passos, quantos, semente) {
    var dt = s / passos, raiz = SIGMA * Math.sqrt(dt), saida = [], j, k;
    for (j = 0; j < quantos; j++) {
      var r = rng(semente + 7919 * j), cam = new Float64Array(passos + 1), x = x0, morte = -1;
      cam[0] = x;
      for (k = 1; k <= passos; k++) {
        var rx = taxa(desc, x);
        if (morte < 0 && rx > 0 && r() > Math.exp(-rx * dt)) morte = k;
        x = x + raiz * normal(r);
        cam[k] = x;
      }
      saida.push({ cam: cam, morte: morte });
    }
    return { caminhos: saida, dt: dt, passos: passos };
  }

  /* ---------- conferências ---------- */
  /* adjunção: d/dt ∫ρv = 0, isto é, dá no mesmo levar a densidade para a frente
     ou o prêmio para trás (o exercício 5 da página de Fokker–Planck) */
  function parAdjunto(premio, x0, s, opts) {
    var sol = resolveEDP(premio, null, s, opts);
    /* ρ(·,s) é o núcleo do calor saindo de x0; ∫ρ(·,s)g = ∫ρ(·,0)v(·,s) = v(x0,s) */
    var xs = sol.xs, dx = xs[1] - xs[0], soma = 0, i;
    for (i = 0; i < xs.length; i++) {
      var d = Math.exp(-(xs[i] - x0) * (xs[i] - x0) / (4 * D * s)) / Math.sqrt(4 * PI * D * s);
      soma += d * premio.premio(xs[i]) * dx;
    }
    return { densidadeContraPremio: soma, premioParaTras: sol.em(x0) };
  }

  return { D: D, SIGMA: SIGMA, T: T, PREMIOS: PREMIOS, taxa: taxa,
           erf: erf, Phi: Phi, phi: phi, grade: grade, interp: interp,
           resolveEDP: resolveEDP, monteCarlo: monteCarlo, caminhos: caminhos,
           parAdjunto: parAdjunto, rng: rng, normal: normal };
});
