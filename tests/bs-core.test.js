/* Testes do núcleo de Black–Scholes.  Rodar:  node tests/bs-core.test.js
 *
 * As quatro contas da página têm que fechar entre si:
 *   fórmula fechada, árvore binomial, Monte Carlo neutro ao risco e hedge simulado.
 * Mais: a paridade put-call, os casos degenerados, as gregas como derivadas de verdade,
 * o resíduo da EDP, e as duas afirmações econômicas — a réplica paga igual nos dois estados,
 * e o resultado do hedge não depende da deriva real mu (enquanto o da posição nua depende).
 */
const BS = require("../assets/bs-core.js");
let fails = 0;
const check = (n, ok, i) => { console.log(ok ? "ok   " : "FALHA", n, i === undefined ? "" : i); if (!ok) fails++; };
const P = BS.PADRAO;

/* 1. o valor canônico de manual */
{
  const c = BS.call(100, 100, 0.05, 0.2, 1);
  check("call(100,100,5%,20%,1 ano) = 10,4506", Math.abs(c - 10.450583572185565) < 1e-9, c.toFixed(10));
}

/* 2. paridade put-call */
{
  let pior = 0;
  for (const S of [60, 90, 100, 110, 160]) for (const T of [0.1, 1, 3]) {
    const d = BS.call(S, 100, 0.05, 0.2, T) - BS.put(S, 100, 0.05, 0.2, T) - (S - 100 * Math.exp(-0.05 * T));
    pior = Math.max(pior, Math.abs(d));
  }
  check("paridade put-call C - P = S - K e^{-rT}", pior < 1e-12, `erro máx ${pior.toExponential(2)}`);
}

/* 3. limites e casos degenerados */
{
  const perto = (a, b, tol) => Math.abs(a - b) < tol;
  check("T -> 0 devolve o pagamento", perto(BS.call(120, 100, 0.05, 0.2, 1e-9), 20, 1e-5)
        && perto(BS.call(80, 100, 0.05, 0.2, 1e-9), 0, 1e-5));
  check("sigma -> 0 devolve max(S - K e^{-rT}, 0)",
        perto(BS.call(100, 100, 0.05, 0.2 * 1e-7, 1), Math.max(100 - 100 * Math.exp(-0.05), 0), 1e-6));
  let ok = true, info = "";
  for (const S of [50, 80, 100, 130, 200]) {
    const c = BS.call(S, 100, 0.05, 0.2, 1), lo = Math.max(S - 100 * Math.exp(-0.05), 0);
    if (!(c >= lo - 1e-12 && c <= S + 1e-12)) { ok = false; info = `S=${S}: ${c}`; }
  }
  check("max(S - K e^{-rT},0) <= C <= S", ok, info);
}

/* 4. a árvore binomial converge para a fórmula */
{
  const exato = BS.call(P.S, P.K, P.r, P.sig, P.T);
  const linhas = [50, 200, 800, 3200].map((n) => ({ n, v: BS.binomial(P.S, P.K, P.r, P.sig, P.T, n) }));
  linhas.forEach((l) => { l.erro = Math.abs(l.v - exato); });
  check("árvore binomial -> fórmula (n = 3200 erra menos de 0,005)",
        linhas[3].erro < 5e-3, linhas.map((l) => `n=${l.n}:${l.erro.toExponential(1)}`).join(" "));
  check("o erro da árvore encolhe com n", linhas[3].erro < linhas[0].erro / 10,
        `${linhas[0].erro.toExponential(1)} -> ${linhas[3].erro.toExponential(1)}`);
  const vp = BS.binomial(P.S, P.K, P.r, P.sig, P.T, 3200, "put");
  check("a árvore também acerta a put", Math.abs(vp - BS.put(P.S, P.K, P.r, P.sig, P.T)) < 5e-3, vp.toFixed(5));
}

/* 5. Monte Carlo neutro ao risco */
{
  const exato = BS.call(P.S, P.K, P.r, P.sig, P.T);
  const mc = BS.monteCarlo(P, 400000, 20261125);
  const sig = Math.abs(mc.media - exato) / mc.erro;
  check("Monte Carlo com deriva r bate com a fórmula (< 3 sigma)", sig < 3,
        `${mc.media.toFixed(4)} ± ${mc.erro.toFixed(4)} contra ${exato.toFixed(4)} (${sig.toFixed(1)} sigma)`);
}

/* 6. a fórmula resolve a EDP */
{
  let pior = 0, onde = "";
  for (const S of [70, 90, 100, 115, 140]) for (const T of [0.25, 1, 2]) {
    const res = Math.abs(BS.residuoEDP(S, 100, 0.05, 0.2, T));
    if (res > pior) { pior = res; onde = `S=${S}, T=${T}`; }
  }
  check("C_t + rS C_S + (sigma^2 S^2/2) C_SS - rC = 0", pior < 1e-5, `resíduo máx ${pior.toExponential(2)} em ${onde}`);
}

/* 7. as gregas são as derivadas mesmo */
{
  const S = 103, K = 100, r = 0.05, sig = 0.2, T = 0.8, h = 1e-5;
  const g = BS.gregas(S, K, r, sig, T);
  const dS = (BS.call(S + h, K, r, sig, T) - BS.call(S - h, K, r, sig, T)) / (2 * h);
  /* a segunda diferença sofre cancelamento: com h = 1e-5 sobram só 4 dígitos, então
     para o gama se usa um passo maior */
  const hg = 1e-2;
  const dSS = (BS.call(S + hg, K, r, sig, T) - 2 * BS.call(S, K, r, sig, T) + BS.call(S - hg, K, r, sig, T)) / (hg * hg);
  const dsig = (BS.call(S, K, r, sig + h, T) - BS.call(S, K, r, sig - h, T)) / (2 * h);
  const dT = (BS.call(S, K, r, sig, T + h) - BS.call(S, K, r, sig, T - h)) / (2 * h);
  const dr = (BS.call(S, K, r + h, sig, T) - BS.call(S, K, r - h, sig, T)) / (2 * h);
  check("delta = dC/dS", Math.abs(g.delta - dS) < 1e-7, `${g.delta.toFixed(8)} vs ${dS.toFixed(8)}`);
  check("gamma = d2C/dS2", Math.abs(g.gamma - dSS) < 1e-7, `${g.gamma.toFixed(8)} vs ${dSS.toFixed(8)}`);
  check("vega = dC/dsigma", Math.abs(g.vega - dsig) < 1e-5, `${g.vega.toFixed(6)} vs ${dsig.toFixed(6)}`);
  check("theta = -dC/dT", Math.abs(g.theta + dT) < 1e-5, `${g.theta.toFixed(6)} vs ${(-dT).toFixed(6)}`);
  check("rho = dC/dr", Math.abs(g.rho - dr) < 1e-5, `${g.rho.toFixed(6)} vs ${dr.toFixed(6)}`);
}

/* 8. a árvore de um passo: a réplica paga igual nos dois estados, e p sumiu */
{
  const S = 100, K = 100, r = 0.05, u = 1.2, d = 0.9, dt = 1;
  const a = BS.umPasso(S, K, r, u, d, dt);
  const subiu = a.delta * a.Su + a.caixa * Math.exp(r * dt);
  const caiu = a.delta * a.Sd + a.caixa * Math.exp(r * dt);
  check("a carteira paga o mesmo que a opção se subir", Math.abs(subiu - a.Cu) < 1e-12, `${subiu.toFixed(10)} = ${a.Cu}`);
  check("a carteira paga o mesmo que a opção se cair", Math.abs(caiu - a.Cd) < 1e-12, `${caiu.toFixed(10)} = ${a.Cd}`);
  check("custo da réplica = esperança descontada com q", Math.abs(a.preco - a.precoPorEsperanca) < 1e-12,
        `${a.preco.toFixed(10)} (delta=${a.delta.toFixed(4)}, caixa=${a.caixa.toFixed(4)}, q=${a.q.toFixed(4)})`);
  check("q está entre 0 e 1 (sem arbitragem na própria árvore)", a.q > 0 && a.q < 1, a.q.toFixed(6));
  /* A conta ingênua — esperança descontada com a probabilidade REAL — dá outro número,
     e um número diferente para cada crença. É por isso que ela não pode ser o preço:
     dois otimistas diferentes nunca fechariam negócio. O q = 0,5042 é o único p que
     devolve o preço certo, e ele não é crença de ninguém: é o que a réplica custa. */
  let espalha = [];
  for (const p of [0.3, 0.5, 0.7]) espalha.push(Math.exp(-r * dt) * (p * a.Cu + (1 - p) * a.Cd));
  check("a esperança com a probabilidade REAL muda com a crença e não é o preço",
        Math.abs(espalha[2] - espalha[0]) > 7 && Math.abs(espalha[1] - a.preco) > 0.05,
        `p=0,3: ${espalha[0].toFixed(3)} | p=0,5: ${espalha[1].toFixed(3)} | p=0,7: ${espalha[2].toFixed(3)} | réplica: ${a.preco.toFixed(3)}`);
}

/* 9. o erro do hedge cai como 1/raiz(nRebal) */
{
  const op = Object.assign({}, P);
  const ns = [10, 40, 160, 640], erros = [];
  for (const n of ns) erros.push(BS.erroHedge(op, n, 600, 4242 + n).rms);
  const lx = ns.map(Math.log), ly = erros.map(Math.log);
  const m = lx.length, mx = lx.reduce((a, b) => a + b) / m, my = ly.reduce((a, b) => a + b) / m;
  let num = 0, den = 0;
  for (let i = 0; i < m; i++) { num += (lx[i] - mx) * (ly[i] - my); den += (lx[i] - mx) ** 2; }
  const incl = num / den;
  check("erro do hedge ~ nRebal^(-1/2)", Math.abs(incl + 0.5) < 0.1,
        `inclinação ${incl.toFixed(3)} (rms ${erros.map((e) => e.toFixed(3)).join(", ")})`);
  check("com 640 rebalanceamentos o erro é pequeno perto do prêmio",
        erros[3] < 0.1 * BS.call(P.S, P.K, P.r, P.sig, P.T), `${erros[3].toFixed(4)} contra prêmio 10,45`);
}

/* 10. o coração da coisa: coberto, mu não importa; nu, importa muito */
{
  const resultado = (mu) => {
    const op = Object.assign({}, P, { mu: mu });
    let somaH = 0, somaN = 0;
    for (let j = 0; j < 4000; j++) {
      const h = BS.hedge(op, 250, 250, 31337 + 7919 * j);
      somaH += h.erro; somaN += h.semCobertura;
    }
    return { coberto: somaH / 4000, nu: somaN / 4000 };
  };
  const a = resultado(-0.10), b = resultado(0.10), c = resultado(0.30);
  const espalhaCoberto = Math.max(Math.abs(a.coberto - b.coberto), Math.abs(b.coberto - c.coberto));
  const espalhaNu = Math.max(Math.abs(a.nu - b.nu), Math.abs(b.nu - c.nu));
  check("coberto: o resultado médio quase não muda com mu", espalhaCoberto < 0.05,
        `mu=-10%: ${a.coberto.toFixed(4)}, mu=10%: ${b.coberto.toFixed(4)}, mu=30%: ${c.coberto.toFixed(4)}`);
  check("nu: o resultado médio muda MUITO com mu", espalhaNu > 20 * espalhaCoberto,
        `mu=-10%: ${a.nu.toFixed(2)}, mu=10%: ${b.nu.toFixed(2)}, mu=30%: ${c.nu.toFixed(2)}`);
  check("coberto: o resultado médio é perto de zero", Math.abs(b.coberto) < 0.05, b.coberto.toFixed(4));
}

console.log("\nfalhas:", fails);
process.exit(fails ? 1 : 0);
