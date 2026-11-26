/* Testes do núcleo do gerador infinitesimal.  Rodar:  node tests/ger-core.test.js
 *
 * O que se confere:
 *  - a quadratura acerta casos de esperança que se sabem na mão;
 *  - o quociente de diferenças tende ao operador a f' + D f'', e o erro cai como O(t);
 *  - o caso exato: para f = x² e o browniano, o quociente vale 2D para TODO t;
 *  - em espaço finito, a matriz geradora tem linhas somando zero e exp(tL) linhas somando um;
 *  - exp(tL) é não negativa, satisfaz P(t+s) = P(t)P(s), e pi L = 0 na estacionária;
 *  - adjunção: levar a densidade para a frente ou o prêmio para trás dá o mesmo número.
 */
const G = require("../assets/ger-core.js");
let fails = 0;
const check = (n, ok, i) => { console.log(ok ? "ok   " : "FALHA", n, i === undefined ? "" : i); if (!ok) fails++; };

/* 1. a quadratura contra esperanças conhecidas */
{
  const B = G.PROCESSOS.browniano, q = G.FUNCOES.quadrado;
  let pior = 0;
  for (const x of [-2, -0.5, 0, 1, 2.5]) for (const t of [0.01, 0.3, 1.5]) {
    /* E[X_t²] = x² + 2Dt = x² + t */
    pior = Math.max(pior, Math.abs(G.esperanca(B, q, x, t) - (x * x + t)));
  }
  check("quadratura: E[X_t²] = x² + 2Dt no browniano", pior < 1e-11, `erro máx ${pior.toExponential(2)}`);

  /* no OU, E[X_t] = x e^{-gt}: usa f(x) = x via a derivada do quadrado? melhor, direto */
  const ident = { f: (x) => x, d1: () => 1, d2: () => 0 };
  const OU = G.PROCESSOS.ou;
  let p2 = 0;
  for (const x of [-2, 0.7, 2]) for (const t of [0.05, 0.5, 2]) {
    p2 = Math.max(p2, Math.abs(G.esperanca(OU, ident, x, t) - x * Math.exp(-1.2 * t)));
  }
  check("quadratura: E[X_t] = x e^{-γt} no Ornstein–Uhlenbeck", p2 < 1e-11, `erro máx ${p2.toExponential(2)}`);

  /* no browniano geométrico, E[X_t] = x e^{mu t} */
  const GBM = G.PROCESSOS.gbm;
  let p3 = 0;
  for (const x of [0.3, 1, 2.5]) for (const t of [0.05, 0.5, 2]) {
    p3 = Math.max(p3, Math.abs(G.esperanca(GBM, ident, x, t) - x * Math.exp(0.3 * t)) / x);
  }
  check("quadratura: E[X_t] = x e^{μt} no browniano geométrico", p3 < 1e-11, `erro relativo máx ${p3.toExponential(2)}`);
}

/* 2. o caso exato: f = x² no browniano dá o gerador para QUALQUER t */
{
  const B = G.PROCESSOS.browniano, q = G.FUNCOES.quadrado;
  let pior = 0;
  for (const t of [1e-4, 0.01, 1, 5]) for (const x of [-2, 0, 1.5]) {
    pior = Math.max(pior, Math.abs(G.quociente(B, q, x, t) - G.gerador(B, q, x)));
  }
  check("f = x² no browniano: o quociente é o gerador para todo t", pior < 1e-7,
        `erro máx ${pior.toExponential(2)} (Lf = 2D = 1)`);
  check("e esse gerador vale 1", Math.abs(G.gerador(B, q, 0.4) - 1) < 1e-15);
}

/* 3. o quociente tende ao gerador, e o erro cai como O(t) */
for (const nomeP of Object.keys(G.PROCESSOS)) {
  const P = G.PROCESSOS[nomeP];
  for (const nomeF of ["seno", "sino", "degrau"]) {
    const F = G.FUNCOES[nomeF];
    const lo = P.vista.lo + 0.3, hi = P.vista.hi - 0.3;
    const e1 = G.erroMax(P, F, 1e-2, lo, hi);
    const e2 = G.erroMax(P, F, 5e-3, lo, hi);
    const razao = e1 / e2;
    /* o erro se compara com o TAMANHO de Lf, não com um número absoluto: tgh(2x) no
       Ornstein–Uhlenbeck tem Lf grande, e um limiar fixo reprovaria uma convergência boa */
    let escala = 0;
    for (let i = 0; i <= 60; i++) escala = Math.max(escala, Math.abs(G.gerador(P, F, lo + (hi - lo) * i / 60)));
    check(`${nomeP}/${nomeF}: o quociente converge ao gerador`, e2 < 0.05 * escala,
          `erro em t=0,005: ${e2.toExponential(2)} = ${(100 * e2 / escala).toFixed(1)}% de max|Lf| = ${escala.toFixed(2)}`);
    check(`${nomeP}/${nomeF}: e o erro cai como O(t)`, razao > 1.7 && razao < 2.3,
          `razão ao dobrar t: ${razao.toFixed(2)} (esperado 2)`);
  }
}

/* 4. espaço finito: as linhas do gerador somam ZERO */
{
  /* uma cadeia de 4 estados, taxas assimétricas de propósito */
  const taxas = [
    [0, 1.0, 0.0, 0.3],
    [0.5, 0, 1.2, 0.0],
    [0.0, 0.4, 0, 0.9],
    [0.7, 0.0, 0.6, 0]
  ];
  const L = G.geradorCadeia(taxas);
  const sl = G.somaLinhas(L);
  check("gerador em espaço finito: linhas somam zero", Math.max(...sl.map(Math.abs)) < 1e-15,
        `[${sl.map((v) => v.toFixed(1)).join(", ")}]`);
  check("a diagonal é negativa e o resto não", L.every((lin, i) => lin.every((v, j) => (i === j ? v < 0 : v >= 0))));

  for (const t of [0.05, 1, 7]) {
    const P = G.expm(L, t), sp = G.somaLinhas(P);
    check(`exp(${t}L): linhas somam um`, Math.max(...sp.map((v) => Math.abs(v - 1))) < 1e-12,
          `[${sp.map((v) => v.toFixed(12)).join(", ")}]`);
    check(`exp(${t}L): nenhuma entrada negativa`, P.every((lin) => lin.every((v) => v > -1e-14)));
  }

  /* semigrupo: P(t+s) = P(t)P(s) — é a propriedade de Markov em forma de matriz */
  const Pa = G.expm(L, 0.7), Pb = G.expm(L, 1.3), Pab = G.expm(L, 2.0), Pc = G.mult(Pa, Pb);
  let pior = 0;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) pior = Math.max(pior, Math.abs(Pab[i][j] - Pc[i][j]));
  check("semigrupo: P(0,7)·P(1,3) = P(2,0)", pior < 1e-12, `erro máx ${pior.toExponential(2)}`);

  /* o gerador como derivada da própria matriz em t = 0 */
  const h = 1e-6, Ph = G.expm(L, h), I = G.identidade(4);
  let pd = 0;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) pd = Math.max(pd, Math.abs((Ph[i][j] - I[i][j]) / h - L[i][j]));
  check("L = lim (P(t) − I)/t, medido", pd < 1e-5, `erro máx ${pd.toExponential(2)}`);

  /* estacionária: pi L = 0 */
  const pi = G.estacionaria(L);
  const piL = G.vezesMatriz(pi, L);
  check("a estacionária satisfaz πL = 0", Math.max(...piL.map(Math.abs)) < 1e-12,
        `π = [${pi.map((v) => v.toFixed(4)).join(", ")}]`);
  check("e π é uma distribuição", Math.abs(pi.reduce((a, b) => a + b) - 1) < 1e-12);

  /* adjunção: <rho P(t), f> = <rho, P(t) f> — para a frente ou para trás, dá o mesmo */
  const rho = [0.5, 0.2, 0.3, 0.0], f = [1, -2, 0.5, 3], P = G.expm(L, 1.1);
  const frente = G.vezesMatriz(rho, P).reduce((s, v, i) => s + v * f[i], 0);
  const tras = G.matrizVezes(P, f).reduce((s, v, i) => s + rho[i] * v, 0);
  check("adjunção: densidade para a frente = prêmio para trás", Math.abs(frente - tras) < 1e-13,
        `${frente.toFixed(12)} vs ${tras.toFixed(12)}`);
}

console.log("\nfalhas:", fails);
process.exit(fails ? 1 : 0);
