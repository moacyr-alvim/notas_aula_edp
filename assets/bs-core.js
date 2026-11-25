/* Núcleo da página de Black–Scholes.
 *
 * A ação segue o browniano geométrico  dS = mu S dt + sigma S dB, e a opção de compra paga
 * max(S_T - K, 0) no vencimento. O que o modelo diz é que o preço NÃO depende de mu, porque a
 * opção pode ser REPLICADA por uma receita de ações mais dinheiro — e o custo da receita é o
 * preço, sob pena de existir almoço grátis.
 *
 * Aqui estão as quatro contas que a página usa, e que se conferem umas às outras:
 *   1. a fórmula fechada e suas derivadas (as gregas);
 *   2. a árvore binomial, onde a réplica é aritmética de duas equações e duas incógnitas,
 *      e onde se vê a probabilidade real p sumir da resposta;
 *   3. o hedge dinâmico simulado sobre caminhos sorteados, que é a réplica de verdade,
 *      com erro caindo como 1/raiz(nRebal);
 *   4. o resíduo da EDP, para verificar que a fórmula resolve mesmo a equação.
 *
 * Sem DOM: roda no navegador e no Node (testes).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.BSCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var PI = Math.PI;

  /* função erro por série de termos positivos (a mesma de cr-core.js e fk-core.js) */
  function erf(x) {
    var s = x < 0 ? -1 : 1, z = Math.abs(x);
    if (z > 6) return s;
    var soma = z, termo = z, n = 0;
    while (termo > 1e-18 * soma && n < 400) { n++; termo *= 2 * z * z / (2 * n + 1); soma += termo; }
    return s * 2 / Math.sqrt(PI) * Math.exp(-z * z) * soma;
  }
  function Phi(z) { return 0.5 * (1 + erf(z / Math.SQRT2)); }
  function phi(z) { return Math.exp(-z * z / 2) / Math.sqrt(2 * PI); }

  /* ------------------------------------------------------------ a fórmula fechada */
  function ds(S, K, r, sig, T) {
    var v = sig * Math.sqrt(T);
    var d1 = (Math.log(S / K) + (r + sig * sig / 2) * T) / v;
    return { d1: d1, d2: d1 - v, v: v };
  }

  /* Opção de compra. Os dois casos degenerados são contínuos com o caso geral:
     sem tempo, o preço é o próprio pagamento; sem volatilidade, a ação é uma conta
     que rende r, e a opção só vale o que ela passar do strike descontado. */
  function call(S, K, r, sig, T) {
    if (T <= 0) return Math.max(S - K, 0);
    if (sig <= 0) return Math.max(S - K * Math.exp(-r * T), 0);
    var d = ds(S, K, r, sig, T);
    return S * Phi(d.d1) - K * Math.exp(-r * T) * Phi(d.d2);
  }
  /* paridade put-call: C - P = S - K e^{-rT}, que é pura ausência de arbitragem */
  function put(S, K, r, sig, T) { return call(S, K, r, sig, T) - S + K * Math.exp(-r * T); }

  function gregas(S, K, r, sig, T) {
    if (T <= 0 || sig <= 0) {
      return { delta: S > K ? 1 : 0, gamma: 0, vega: 0, theta: 0, rho: 0 };
    }
    var d = ds(S, K, r, sig, T), eK = K * Math.exp(-r * T);
    return {
      delta: Phi(d.d1),
      gamma: phi(d.d1) / (S * d.v),
      vega: S * phi(d.d1) * Math.sqrt(T),
      theta: -S * phi(d.d1) * sig / (2 * Math.sqrt(T)) - r * eK * Phi(d.d2),
      rho: T * eK * Phi(d.d2)
    };
  }

  /* --------------------------------------------------------- a árvore de um passo */
  /* Duas equações, duas incógnitas: ache (delta, caixa) que pague igual à opção nos dois
     estados. O preço é o custo dessa carteira. A probabilidade real NÃO entra. */
  function umPasso(S, K, r, u, d, dt) {
    var Su = S * u, Sd = S * d, Cu = Math.max(Su - K, 0), Cd = Math.max(Sd - K, 0);
    var delta = (Cu - Cd) / (Su - Sd);
    var caixa = Math.exp(-r * dt) * (Cu - delta * Su);     /* o que sobra, trazido a valor de hoje */
    var q = (Math.exp(r * dt) - d) / (u - d);              /* a probabilidade "neutra ao risco" */
    return {
      delta: delta, caixa: caixa, preco: delta * S + caixa,
      q: q, Su: Su, Sd: Sd, Cu: Cu, Cd: Cd,
      precoPorEsperanca: Math.exp(-r * dt) * (q * Cu + (1 - q) * Cd)
    };
  }

  /* árvore de n passos (Cox–Ross–Rubinstein), para ver a convergência à fórmula */
  function binomial(S, K, r, sig, T, n, tipo) {
    var dt = T / n, u = Math.exp(sig * Math.sqrt(dt)), d = 1 / u;
    var q = (Math.exp(r * dt) - d) / (u - d), desc = Math.exp(-r * dt);
    var v = new Float64Array(n + 1), i, j;
    for (i = 0; i <= n; i++) {
      var ST = S * Math.pow(u, n - i) * Math.pow(d, i);
      v[i] = tipo === "put" ? Math.max(K - ST, 0) : Math.max(ST - K, 0);
    }
    for (j = n - 1; j >= 0; j--) {
      for (i = 0; i <= j; i++) v[i] = desc * (q * v[i] + (1 - q) * v[i + 1]);
    }
    return v[0];
  }

  /* ------------------------------------------------------------------- resíduo da EDP */
  /* C_t + r S C_S + (sigma^2 S^2 / 2) C_SS - r C = 0.  Aqui t é o tempo corrido, e a
     fórmula está escrita no tempo que FALTA, então C_t = -d/dT. */
  function residuoEDP(S, K, r, sig, T, h) {
    h = h || 1e-4;
    var hS = S * h;
    var C = call(S, K, r, sig, T);
    var C_T = (call(S, K, r, sig, T + h) - call(S, K, r, sig, T - h)) / (2 * h);
    var C_S = (call(S + hS, K, r, sig, T) - call(S - hS, K, r, sig, T)) / (2 * hS);
    var C_SS = (call(S + hS, K, r, sig, T) - 2 * C + call(S - hS, K, r, sig, T)) / (hS * hS);
    return -C_T + r * S * C_S + 0.5 * sig * sig * S * S * C_SS - r * C;
  }

  /* --------------------------------------------------------------------- sorteio */
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

  /* browniano geométrico EXATO (não é Euler): S_{k+1} = S_k exp((mu - sig^2/2)dt + sig raiz(dt) Z) */
  function caminho(S0, mu, sig, T, passos, r) {
    var dt = T / passos, a = (mu - sig * sig / 2) * dt, b = sig * Math.sqrt(dt);
    var S = new Float64Array(passos + 1), k;
    S[0] = S0;
    for (k = 1; k <= passos; k++) S[k] = S[k - 1] * Math.exp(a + b * normal(r));
    return S;
  }

  /* ------------------------------------------------------- o hedge dinâmico (a réplica) */
  /* Vende a opção por C0, compra delta ações e financia o resto em caixa; rebalanceia
     nRebal vezes. No fim compara a carteira com o que a opção tinha que pagar.
     `passos` é a grade fina do desenho e tem que ser múltiplo de nRebal. */
  function hedge(op, nRebal, passos, semente) {
    var S0 = op.S, K = op.K, r = op.r, sig = op.sig, T = op.T, mu = op.mu;
    passos = passos - (passos % nRebal);
    var ger = rng(semente), S = caminho(S0, mu, sig, T, passos, ger);
    var dt = T / passos, aCada = passos / nRebal, k;
    var C0 = call(S0, K, r, sig, T);
    var delta = gregas(S0, K, r, sig, T).delta, caixa = C0 - delta * S0;
    var carteira = new Float64Array(passos + 1), opcao = new Float64Array(passos + 1);
    var deltas = new Float64Array(passos + 1);
    carteira[0] = C0; opcao[0] = C0; deltas[0] = delta;
    for (k = 1; k <= passos; k++) {
      caixa *= Math.exp(r * dt);                        /* o caixa rende a taxa livre de risco */
      if (k % aCada === 0 && k < passos) {              /* hora de rebalancear */
        var novo = gregas(S[k], K, r, sig, T - k * dt).delta;
        caixa -= (novo - delta) * S[k];                 /* comprar mais ações sai do caixa */
        delta = novo;
      }
      carteira[k] = delta * S[k] + caixa;
      opcao[k] = call(S[k], K, r, sig, T - k * dt);
      deltas[k] = delta;
    }
    var pagamento = Math.max(S[passos] - K, 0);
    return { S: S, carteira: carteira, opcao: opcao, deltas: deltas, dt: dt, passos: passos,
             C0: C0, pagamento: pagamento, erro: carteira[passos] - pagamento,
             semCobertura: C0 * Math.exp(r * T) - pagamento };
  }

  /* erro típico (raiz do erro quadrático médio) sobre muitos caminhos.
     `passos` é a grade fina; deixando-a FIXA enquanto nRebal varia, o caminho sorteado é
     sempre o mesmo e a comparação entre números de rebalanceamento fica honesta. */
  function erroHedge(op, nRebal, quantos, semente, passos) {
    var soma = 0, soma2 = 0, j, e;
    for (j = 0; j < quantos; j++) {
      e = hedge(op, nRebal, passos || nRebal, semente + 7919 * j).erro;
      soma += e; soma2 += e * e;
    }
    return { rms: Math.sqrt(soma2 / quantos), media: soma / quantos, n: quantos };
  }

  /* preço por Monte Carlo sob a medida neutra ao risco (deriva r, e não mu) */
  function monteCarlo(op, quantos, semente) {
    var ger = rng(semente), soma = 0, soma2 = 0, j;
    var a = (op.r - op.sig * op.sig / 2) * op.T, b = op.sig * Math.sqrt(op.T);
    for (j = 0; j < quantos; j++) {
      var ST = op.S * Math.exp(a + b * normal(ger)), pg = Math.exp(-op.r * op.T) * Math.max(ST - op.K, 0);
      soma += pg; soma2 += pg * pg;
    }
    var m = soma / quantos, va = Math.max(soma2 / quantos - m * m, 0);
    return { media: m, erro: Math.sqrt(va / quantos) };
  }

  var PADRAO = { S: 100, K: 100, r: 0.05, sig: 0.2, T: 1, mu: 0.10 };

  return { PADRAO: PADRAO, erf: erf, Phi: Phi, phi: phi, ds: ds,
           call: call, put: put, gregas: gregas, umPasso: umPasso, binomial: binomial,
           residuoEDP: residuoEDP, rng: rng, normal: normal, caminho: caminho,
           hedge: hedge, erroHedge: erroHedge, monteCarlo: monteCarlo };
});
