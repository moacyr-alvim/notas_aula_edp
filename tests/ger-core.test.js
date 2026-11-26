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

/* 5. qual laplaciano? os dois relógios, e a família que os interpola */
{
  /* grafo propositalmente IRREGULAR, graus 1,3,2,2,3,1 */
  const A = [
    [0, 1, 0, 0, 0, 0],
    [1, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 0],
    [0, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 1],
    [0, 0, 0, 0, 1, 0]
  ];
  const { L, d } = G.laplaciano(A);
  check("laplaciano: diagonal é o grau e fora dela é −1 onde há aresta",
        d.join(",") === "1,3,2,2,3,1" && L[1][0] === -1 && L[1][1] === 3, `graus ${d}`);

  const norm = (v) => { const s = v.reduce((a, b) => a + b, 0); return v.map((x) => x / s); };
  const perto = (u, v, tol) => u.every((x, i) => Math.abs(x - v[i]) < tol);

  for (const th of [0, 0.5, 1, 1.5, 2]) {
    const pi = G.estacionaria(G.geradorGrafo(A, th), 900);
    const prev = norm(d.map((x) => Math.pow(x, 1 - th)));
    check(`θ=${th}: a estacionária é ∝ d^(1−θ)`, perto(pi, prev, 1e-9),
          `π = [${pi.map((v) => v.toFixed(4)).join(", ")}]  previsto [${prev.map((v) => v.toFixed(4)).join(", ")}]`);
  }

  /* os dois casos com nome, no CAMINHO de 7 nós que o livro já usa */
  const n = 7, P = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n - 1; i++) { P[i][i + 1] = 1; P[i + 1][i] = 1; }
  const piAresta = G.estacionaria(G.geradorGrafo(P, 1), 900);     /* relógio na aresta: −L */
  const piNo = G.estacionaria(G.geradorGrafo(P, 0), 900);         /* relógio no nó: −D^{-1}L */
  check("caminho de 7: com relógio na aresta (calor) a estacionária é uniforme",
        piAresta.every((v) => Math.abs(v - 1 / 7) < 1e-9), `[${piAresta.map((v) => v.toFixed(4)).join(", ")}]`);
  check("caminho de 7: com relógio no nó (bêbado) as pontas valem 1/12 e o miolo 1/6",
        Math.abs(piNo[0] - 1 / 12) < 1e-9 && Math.abs(piNo[3] - 1 / 6) < 1e-9,
        `[${piNo.map((v) => v.toFixed(4)).join(", ")}]`);
  check("e as pontas recebem metade do miolo", Math.abs(piNo[0] / piNo[3] - 0.5) < 1e-9);

  /* Lsym = D^{1/2} Lrw D^{-1/2}: a semelhança que dá o MESMO espectro aos dois */
  const Lrw = G.geradorGrafo(A, 0).map((lin) => lin.map((v) => -v));        /* = D^{-1} L */
  const raiz = d.map(Math.sqrt), inv = d.map((x) => 1 / Math.sqrt(x));
  const Lsym = G.conjuga(L, inv, inv);                                      /* D^{-1/2} L D^{-1/2} */
  const semelhante = G.conjuga(Lrw, raiz, inv);                             /* D^{1/2} Lrw D^{-1/2} */
  let pior = 0;
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) pior = Math.max(pior, Math.abs(Lsym[i][j] - semelhante[i][j]));
  check("Lsym = D^{1/2} Lrw D^{-1/2} (logo têm o mesmo espectro)", pior < 1e-14, `erro máx ${pior.toExponential(2)}`);
  check("Lsym é simétrica", Lsym.every((lin, i) => lin.every((v, j) => Math.abs(v - Lsym[j][i]) < 1e-14)));
  check("Lrw NÃO é simétrica (num grafo irregular)", Math.abs(Lrw[0][1] - Lrw[1][0]) > 0.1,
        `${Lrw[0][1].toFixed(4)} vs ${Lrw[1][0].toFixed(4)}`);

  /* mas Lrw é autoadjunta no produto interno pesado pelo grau: <Lrw f, g>_d = <f, Lrw g>_d */
  const f = [1, -2, 0.5, 3, -1, 2], g2 = [0, 1, -1, 2, 0.5, -3];
  const prodD = (u, v) => u.reduce((s, x, i) => s + d[i] * x * v[i], 0);
  const esq = prodD(G.matrizVezes(Lrw, f), g2), dir = prodD(f, G.matrizVezes(Lrw, g2));
  check("Lrw é autoadjunta no produto interno pesado pelo grau (reversibilidade)",
        Math.abs(esq - dir) < 1e-12, `${esq.toFixed(10)} vs ${dir.toFixed(10)}`);
  const esq0 = G.matrizVezes(Lrw, f).reduce((s, x, i) => s + x * g2[i], 0);
  const dir0 = f.reduce((s, x, i) => s + x * G.matrizVezes(Lrw, g2)[i], 0);
  check("e NÃO é autoadjunta no produto interno simples", Math.abs(esq0 - dir0) > 0.1,
        `${esq0.toFixed(4)} vs ${dir0.toFixed(4)}`);

  /* em grafo REGULAR a distinção some: é por isso que o anel do livro nunca precisou escolher */
  const m = 6, R = Array.from({ length: m }, () => new Array(m).fill(0));
  for (let i = 0; i < m; i++) { R[i][(i + 1) % m] = 1; R[(i + 1) % m][i] = 1; }   /* anel NÃO orientado */
  const Ga = G.geradorGrafo(R, 1), Gn = G.geradorGrafo(R, 0);
  let piorR = 0;
  for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) piorR = Math.max(piorR, Math.abs(Ga[i][j] - 2 * Gn[i][j]));
  check("no anel (regular, grau 2) os dois geradores diferem só pelo fator 2", piorR < 1e-14,
        `erro máx ${piorR.toExponential(2)}`);
}

console.log("\nfalhas:", fails);
process.exit(fails ? 1 : 0);
