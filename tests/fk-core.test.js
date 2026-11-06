/* Testes do núcleo de Feynman–Kac.  Rodar:  node tests/fk-core.test.js
 *
 * O que se confere:
 *  - os quatro prêmios: a fórmula fechada devolve o próprio prêmio em s = 0;
 *  - a EDP (equação para trás com desconto) bate com a fórmula fechada, com e sem desconto;
 *  - com r constante o desconto é um fator e^{−rs} puro, e nada mais;
 *  - na zona de perigo, onde não há fórmula, a EDP e o Monte Carlo se conferem um ao outro;
 *  - peso e morte dão a mesma média (é o mesmo termo −rv);
 *  - o peso médio É a probabilidade de sobreviver;
 *  - adjunção: levar a densidade para a frente = levar o prêmio para trás;
 *  - o erro do Monte Carlo cai como 1/√N.
 */
const FK = require("../assets/fk-core.js");
let fails = 0;
const check = (n, ok, i) => { console.log(ok ? "ok   " : "FALHA", n, i === undefined ? "" : i); if (!ok) fails++; };
const nomes = Object.keys(FK.PREMIOS);

/* 1. a fórmula fechada em s = 0 é o próprio prêmio */
for (const nome of nomes) {
  const P = FK.PREMIOS[nome];
  let pior = 0;
  for (let x = -3; x <= 3; x += 0.25) pior = Math.max(pior, Math.abs(P.exato(x, 0, 0.5) - P.premio(x)));
  check(`${nome}: fórmula fechada em s=0 é o prêmio`, pior === 0, `pior=${pior}`);
}

/* 2. EDP contra fórmula fechada, sem e com desconto constante */
for (const nome of nomes) {
  for (const r of [0, 0.6]) {
    const P = FK.PREMIOS[nome];
    const sol = FK.resolveEDP(P, { r: r, zona: false }, 1, { dx: 0.02 });
    let pior = 0, ondePior = 0;
    for (let x = -3; x <= 3; x += 0.1) {
      const e = Math.abs(sol.em(x) - P.exato(x, 1, r));
      if (e > pior) { pior = e; ondePior = x; }
    }
    check(`${nome}: EDP = fórmula fechada (r=${r})`, pior < 3e-4,
          `erro máx ${pior.toExponential(2)} em x=${ondePior.toFixed(1)}`);
  }
}

/* 3. com r constante o desconto é um fator puro */
{
  const P = FK.PREMIOS.caixa, r = 0.8;
  const a = FK.resolveEDP(P, null, 1, { dx: 0.02 });
  const b = FK.resolveEDP(P, { r: r, zona: false }, 1, { dx: 0.02 });
  let pior = 0;
  for (let x = -3; x <= 3; x += 0.1) pior = Math.max(pior, Math.abs(b.em(x) - Math.exp(-r) * a.em(x)));
  check("desconto constante é só o fator e^{-rs}", pior < 1e-12, `dif máx ${pior.toExponential(2)}`);
}

/* 4. zona de perigo: EDP contra Monte Carlo (não há fórmula fechada) */
{
  const P = FK.PREMIOS.degrau, desc = { r: 1.5, zona: true };
  const sol = FK.resolveEDP(P, desc, 1, { dx: 0.02 });
  let piorSigmas = 0, detalhe = "";
  for (const x of [-1, -0.5, 0, 0.5, 1]) {
    const mc = FK.monteCarlo(P, desc, x, 1, 40000, 1234567 + 1000 * x, "peso");
    const edp = sol.em(x);
    const sigmas = Math.abs(mc.media - edp) / Math.max(mc.erro, 1e-12);
    if (sigmas > piorSigmas) { piorSigmas = sigmas; detalhe = `x=${x}: EDP ${edp.toFixed(4)} vs MC ${mc.media.toFixed(4)}±${mc.erro.toFixed(4)}`; }
  }
  check("zona de perigo: EDP e Monte Carlo concordam (< 3σ)", piorSigmas < 3, `pior ${piorSigmas.toFixed(1)}σ — ${detalhe}`);
}

/* 5. peso e morte dão a mesma média */
{
  const P = FK.PREMIOS.sino, desc = { r: 1.2, zona: true };
  const a = FK.monteCarlo(P, desc, -0.3, 1, 40000, 777, "peso");
  const b = FK.monteCarlo(P, desc, -0.3, 1, 40000, 99991, "morte");
  const sig = Math.abs(a.media - b.media) / Math.sqrt(a.erro * a.erro + b.erro * b.erro);
  check("peso e morte têm a mesma média (< 3σ)", sig < 3,
        `${a.media.toFixed(4)}±${a.erro.toFixed(4)} vs ${b.media.toFixed(4)}±${b.erro.toFixed(4)} (${sig.toFixed(1)}σ)`);
  check("o modo peso tem variância menor", a.erro < b.erro, `${a.erro.toFixed(4)} < ${b.erro.toFixed(4)}`);
}

/* 6. o peso médio é a probabilidade de sobreviver */
{
  const um = { premio: () => 1 }, desc = { r: 1.2, zona: true };
  const peso = FK.monteCarlo(um, desc, -0.3, 1, 40000, 24680, "peso");
  const morte = FK.monteCarlo(um, desc, -0.3, 1, 40000, 13579, "morte");
  const sobrevive = 1 - morte.mortos;
  const sig = Math.abs(peso.media - sobrevive) / Math.max(peso.erro, 1e-12);
  check("E[exp(-∫r)] = probabilidade de sobreviver", sig < 4,
        `peso ${peso.media.toFixed(4)}±${peso.erro.toFixed(4)} vs sobrevida ${sobrevive.toFixed(4)} (${sig.toFixed(1)}σ)`);
  check("a morte foi conferida pela média do prêmio 1", Math.abs(morte.media - sobrevive) < 1e-12);
}

/* 7. adjunção: densidade para a frente = prêmio para trás */
for (const nome of nomes) {
  const p = FK.parAdjunto(FK.PREMIOS[nome], 0.4, 1, { dx: 0.02 });
  const dif = Math.abs(p.densidadeContraPremio - p.premioParaTras);
  check(`${nome}: ∫ρg = v(x₀) (adjunção)`, dif < 5e-4,
        `${p.densidadeContraPremio.toFixed(6)} vs ${p.premioParaTras.toFixed(6)}`);
}

/* 8. o erro do Monte Carlo cai como 1/√N */
{
  const P = FK.PREMIOS.call, desc = { r: 0.4, zona: false }, x = 0.2;
  const alvo = P.exato(x, 1, 0.4);
  const Ns = [1000, 4000, 16000, 64000], erros = [];
  for (const N of Ns) {
    let s2 = 0;
    for (let rep = 0; rep < 12; rep++) {                     /* média de 12 repetições */
      const mc = FK.monteCarlo(P, desc, x, 1, N, 5000 + 7919 * rep + N, "peso");
      s2 += (mc.media - alvo) * (mc.media - alvo);
    }
    erros.push(Math.sqrt(s2 / 12));
  }
  const lx = Ns.map(Math.log), ly = erros.map(Math.log);
  const n = Ns.length, mx = lx.reduce((a, b) => a + b) / n, my = ly.reduce((a, b) => a + b) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (lx[i] - mx) * (ly[i] - my); den += (lx[i] - mx) ** 2; }
  const incl = num / den;
  check("erro do Monte Carlo ~ N^(-1/2)", Math.abs(incl + 0.5) < 0.12,
        `inclinação ${incl.toFixed(3)} (erros ${erros.map((e) => e.toExponential(1)).join(", ")})`);
}

/* 9. sanidade do solver: sem desconto, o valor fica entre o mínimo e o máximo do prêmio */
for (const nome of nomes) {
  const P = FK.PREMIOS[nome], sol = FK.resolveEDP(P, null, 1, { dx: 0.02 });
  let lo = Infinity, hi = -Infinity, vlo = Infinity, vhi = -Infinity;
  for (let i = 0; i < sol.xs.length; i++) {
    const g = P.premio(sol.xs[i]);
    lo = Math.min(lo, g); hi = Math.max(hi, g);
    vlo = Math.min(vlo, sol.v[i]); vhi = Math.max(vhi, sol.v[i]);
  }
  check(`${nome}: o valor respeita o princípio do máximo`, vlo >= lo - 1e-12 && vhi <= hi + 1e-12,
        `prêmio [${lo}, ${hi}] → valor [${vlo.toFixed(4)}, ${vhi.toFixed(4)}]`);
}

console.log("\nfalhas:", fails);
process.exit(fails ? 1 : 0);
