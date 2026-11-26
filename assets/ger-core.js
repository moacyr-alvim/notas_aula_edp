/* Núcleo da página do gerador infinitesimal.
 *
 * O gerador de um processo de Markov é a derivada da esperança no instante zero:
 *
 *   (L f)(x) = lim_{t->0}  ( E[ f(X_t) | X_0 = x ] - f(x) ) / t,
 *
 * e para uma difusão dX = a dt + sigma dB isso dá  L f = a f' + D f'',  com D = sigma^2/2.
 * Aqui estão os dois lados dessa igualdade, para poder compará-los:
 *   - esperanca(): E[f(X_t)|x] por quadratura, com a densidade de transição EXATA
 *     (os quatro processos têm transição gaussiana em x ou em ln x, então não há
 *     erro de simulação nenhum: o único erro é o do próprio quociente, que é O(t));
 *   - gerador(): a f' + D f'', o operador diferencial.
 *
 * E a versão de espaço finito, em que tudo vira matriz e nada é aproximado: a matriz
 * geradora tem LINHAS SOMANDO ZERO (probabilidade se conserva), enquanto exp(tL) tem
 * linhas somando um. É a mesma frase dita nas duas pontas do limite.
 *
 * Sem DOM: roda no navegador e no Node (testes).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.GerCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var PI = Math.PI;

  /* ------------------------------------------------------------- os processos */
  /* Cada um sabe: a(x) e D(x) (para o operador diferencial) e a lei exata de X_t
     dado X_0 = x (para a esperança). `log: true` quer dizer gaussiana em ln x. */
  var PROCESSOS = {
    browniano: {
      label: "Browniano", sigla: "\\tfrac12 f''",
      desc: "sem deriva, só tremor: a = 0 e D = 1/2",
      vista: { lo: -3, hi: 3 },
      a: function () { return 0; },
      D: function () { return 0.5; },
      lei: function (x, t) { return { m: x, v: t, log: false }; }
    },
    deriva: {
      label: "Com deriva", sigla: "0{,}6\\,f'+\\tfrac12 f''",
      desc: "o mesmo tremor, empurrado: a = 0,6 e D = 1/2",
      vista: { lo: -3, hi: 3 },
      mu: 0.6,
      a: function () { return 0.6; },
      D: function () { return 0.5; },
      lei: function (x, t) { return { m: x + 0.6 * t, v: t, log: false }; }
    },
    ou: {
      label: "Ornstein–Uhlenbeck", sigla: "-1{,}2\\,x\\,f'+\\tfrac12 f''",
      desc: "puxado de volta para a origem: a = −1,2 x e D = 1/2",
      vista: { lo: -3, hi: 3 },
      gama: 1.2, sig: 1,
      a: function (x) { return -1.2 * x; },
      D: function () { return 0.5; },
      lei: function (x, t) {
        var g = 1.2, s2 = 1;
        return { m: x * Math.exp(-g * t), v: s2 * (1 - Math.exp(-2 * g * t)) / (2 * g), log: false };
      }
    },
    gbm: {
      label: "Browniano geométrico", sigla: "0{,}3\\,x\\,f'+0{,}08\\,x^2f''",
      desc: "o da ação: a = 0,3 x e D = 0,08 x²",
      vista: { lo: 0.15, hi: 3 },
      mu: 0.3, sig: 0.4,
      a: function (x) { return 0.3 * x; },
      D: function (x) { return 0.5 * 0.16 * x * x; },
      lei: function (x, t) {
        var mu = 0.3, s = 0.4;
        return { m: Math.log(x) + (mu - s * s / 2) * t, v: s * s * t, log: true };
      }
    }
  };

  /* ------------------------------------------------- as funções de teste */
  var FUNCOES = {
    quadrado: {
      label: "f(x) = x²", tex: "x^2",
      f: function (x) { return x * x; },
      d1: function (x) { return 2 * x; },
      d2: function () { return 2; }
    },
    seno: {
      label: "f(x) = sen x", tex: "\\operatorname{sen} x",
      f: function (x) { return Math.sin(x); },
      d1: function (x) { return Math.cos(x); },
      d2: function (x) { return -Math.sin(x); }
    },
    sino: {
      label: "f(x) = e^(−x²/2)", tex: "e^{-x^2/2}",
      f: function (x) { return Math.exp(-x * x / 2); },
      d1: function (x) { return -x * Math.exp(-x * x / 2); },
      d2: function (x) { return (x * x - 1) * Math.exp(-x * x / 2); }
    },
    degrau: {
      label: "f(x) = tgh(2x)", tex: "\\operatorname{tgh}(2x)",
      f: function (x) { return Math.tanh(2 * x); },
      d1: function (x) { var s = 1 / Math.cosh(2 * x); return 2 * s * s; },
      d2: function (x) { var s = 1 / Math.cosh(2 * x); return -8 * Math.tanh(2 * x) * s * s; }
    }
  };

  /* -------------------------------------- o lado direito: o operador diferencial */
  function gerador(proc, fun, x) {
    return proc.a(x) * fun.d1(x) + proc.D(x) * fun.d2(x);
  }

  /* ---------------------------------------- o lado esquerdo: a média do futuro */
  /* E[f(X_t)|x] = integral de f contra a densidade de transição. Como a densidade é
     gaussiana (em x ou em ln x), a regra do trapézio num intervalo de 9 desvios
     converge espetacularmente rápido — o integrando é analítico e morre nas pontas. */
  /* Os nós e pesos são os MESMOS para todo x e todo t: só a média e o desvio mudam.
     Então se calculam uma vez só, e os pesos vão normalizados para somar exatamente 1
     (o que elimina o viés do truncamento nas pontas). */
  var NQ = 1200, LARG = 9, Z = new Float64Array(NQ + 1), W = new Float64Array(NQ + 1);
  (function () {
    var i, soma = 0;
    for (i = 0; i <= NQ; i++) {
      Z[i] = -LARG + 2 * LARG * i / NQ;
      W[i] = Math.exp(-Z[i] * Z[i] / 2) * (i === 0 || i === NQ ? 0.5 : 1);
      soma += W[i];
    }
    for (i = 0; i <= NQ; i++) W[i] /= soma;
  })();

  function esperanca(proc, fun, x, t) {
    if (t <= 0) return fun.f(x);
    var L = proc.lei(x, t), dp = Math.sqrt(L.v);
    if (!(dp > 0)) return fun.f(x);
    var soma = 0, i;
    if (L.log) for (i = 0; i <= NQ; i++) soma += W[i] * fun.f(Math.exp(L.m + dp * Z[i]));
    else for (i = 0; i <= NQ; i++) soma += W[i] * fun.f(L.m + dp * Z[i]);
    return soma;
  }

  /* o quociente de diferenças: é ELE que tende ao gerador */
  function quociente(proc, fun, x, t) {
    return (esperanca(proc, fun, x, t) - fun.f(x)) / t;
  }

  /* erro máximo do quociente contra o gerador, numa janela de x */
  function erroMax(proc, fun, t, lo, hi, n) {
    n = n || 60;
    var pior = 0, i, x;
    for (i = 0; i <= n; i++) {
      x = lo + (hi - lo) * i / n;
      pior = Math.max(pior, Math.abs(quociente(proc, fun, x, t) - gerador(proc, fun, x)));
    }
    return pior;
  }

  /* ===================== espaço finito: tudo vira matriz ===================== */

  /* Monta a matriz geradora a partir das TAXAS de salto (fora da diagonal).
     A diagonal é menos a soma da linha — é isso que faz a linha somar zero, e é isso
     que diz que a probabilidade não vaza. */
  function geradorCadeia(taxas) {
    var n = taxas.length, L = [], i, j, s;
    for (i = 0; i < n; i++) {
      L.push(taxas[i].slice()); L[i][i] = 0;
      s = 0; for (j = 0; j < n; j++) s += L[i][j];
      L[i][i] = -s;
    }
    return L;
  }
  function somaLinhas(A) {
    return A.map(function (lin) { return lin.reduce(function (a, b) { return a + b; }, 0); });
  }
  function mult(A, B) {
    var n = A.length, m = B[0].length, k = B.length, C = [], i, j, p, s;
    for (i = 0; i < n; i++) {
      C.push(new Array(m));
      for (j = 0; j < m; j++) { s = 0; for (p = 0; p < k; p++) s += A[i][p] * B[p][j]; C[i][j] = s; }
    }
    return C;
  }
  function identidade(n) {
    var I = [], i, j;
    for (i = 0; i < n; i++) { I.push(new Array(n)); for (j = 0; j < n; j++) I[i][j] = i === j ? 1 : 0; }
    return I;
  }
  /* exponencial de matriz por escalonamento e quadratura da série */
  function expm(L, t) {
    var n = L.length, norma = 0, i, j, k;
    for (i = 0; i < n; i++) { var s = 0; for (j = 0; j < n; j++) s += Math.abs(L[i][j] * t); norma = Math.max(norma, s); }
    var e = Math.max(0, Math.ceil(Math.log2(norma + 1)) + 1), fator = Math.pow(2, e);
    var A = L.map(function (lin) { return lin.map(function (v) { return v * t / fator; }); });
    var E = identidade(n), termo = identidade(n);
    for (k = 1; k <= 20; k++) {
      termo = mult(termo, A).map(function (lin) { return lin.map(function (v) { return v / k; }); });
      for (i = 0; i < n; i++) for (j = 0; j < n; j++) E[i][j] += termo[i][j];
    }
    for (k = 0; k < e; k++) E = mult(E, E);
    return E;
  }
  /* a distribuição estacionária: o vetor à ESQUERDA com pi L = 0, por iteração */
  function estacionaria(L, passos) {
    var n = L.length, P = expm(L, 1), pi = new Array(n).fill(1 / n), i, j, k, novo;
    for (k = 0; k < (passos || 400); k++) {
      novo = new Array(n).fill(0);
      for (j = 0; j < n; j++) for (i = 0; i < n; i++) novo[j] += pi[i] * P[i][j];
      pi = novo;
    }
    return pi;
  }
  function vezesMatriz(v, A) {                       /* linha vezes matriz: densidade para a frente */
    var n = A.length, m = A[0].length, out = new Array(m).fill(0), i, j;
    for (j = 0; j < m; j++) for (i = 0; i < n; i++) out[j] += v[i] * A[i][j];
    return out;
  }
  function matrizVezes(A, v) {                       /* matriz vezes coluna: prêmio para trás */
    var n = A.length, out = new Array(n).fill(0), i, j;
    for (i = 0; i < n; i++) for (j = 0; j < A[i].length; j++) out[i] += A[i][j] * v[j];
    return out;
  }

  return { PROCESSOS: PROCESSOS, FUNCOES: FUNCOES,
           gerador: gerador, esperanca: esperanca, quociente: quociente, erroMax: erroMax,
           geradorCadeia: geradorCadeia, somaLinhas: somaLinhas, expm: expm, mult: mult,
           identidade: identidade, estacionaria: estacionaria,
           vezesMatriz: vezesMatriz, matrizVezes: matrizVezes };
});
