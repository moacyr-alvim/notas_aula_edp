// Testes do núcleo das equações diferenciais estocásticas.  Rodar:  node tests/eds-core.test.js
const E = require("../assets/eds-core.js");
let fails = 0;
const check = (n, ok, i) => { console.log(ok ? "ok   " : "FALHA", n, i || ""); if (!ok) fails++; };

// 1. a densidade exata resolve mesmo Fokker–Planck (é o dicionário sendo conferido)
for (const nome of Object.keys(E.EXEMPLOS)) {
  const e = E.EXEMPLOS[nome], t = 0.7;
  const pts = e.log ? [0.6, 1.0, 1.7, 2.6] : [e.m0 - 0.5, e.m0, e.m0 + 0.8, e.m0 + 1.6];
  let pior = 0, esc = 0;
  for (const x of pts) {
    pior = Math.max(pior, Math.abs(E.residuoFP(e, x, t)));
    esc = Math.max(esc, Math.abs(E.densidade(e, x, t)));
  }
  check(`${nome}: a densidade resolve ρ_t = −∂(bρ) + ½∂²(σ²ρ)`, pior / esc < 2e-3, `resíduo ${(pior / esc).toExponential(1)}`);
}

// 2. a densidade tem massa 1 em vários instantes
for (const nome of Object.keys(E.EXEMPLOS)) {
  const e = E.EXEMPLOS[nome];
  for (const t of [0.3, 1.5]) {
    const a = e.log ? 1e-6 : -25, b = e.log ? 60 : 25, M = 400000, h = (b - a) / M;
    let m = 0;
    for (let i = 0; i < M; i++) m += E.densidade(e, a + (i + 0.5) * h, t) * h;
    check(`${nome}: massa 1 em t = ${t}`, Math.abs(m - 1) < 2e-5, m.toFixed(8));
  }
}

// 3. só deriva: a nuvem contrai e a altura cresce, mas a massa não muda
{
  const e = E.EXEMPLOS.transporte;
  const v0 = E.variancia(e, 0), v2 = E.variancia(e, 2);
  check("só deriva: a variância encolhe como e^{−2γt}", Math.abs(v2 / v0 - Math.exp(-2 * e.gama * 2)) < 1e-12,
        `${(v2 / v0).toExponential(3)} vs ${Math.exp(-2 * e.gama * 2).toExponential(3)}`);
  const p0 = E.densidade(e, E.media(e, 0), 0), p2 = E.densidade(e, E.media(e, 2), 2);
  check("só deriva: o pico cresce como e^{γt}", Math.abs(p2 / p0 - Math.exp(e.gama * 2)) < 1e-9, (p2 / p0).toFixed(5));
  check("só deriva: nunca espalha (a trajetória é determinística)", E.estacionaria(e) === 0 || E.variancia(e, 10) < 1e-6, E.variancia(e, 10).toExponential(1));
}

// 4. Ornstein–Uhlenbeck: a variância satura em σ²/2γ
{
  const e = E.EXEMPLOS.ou;
  check("OU: variância de equilíbrio σ²/2γ", Math.abs(E.variancia(e, 60) - E.estacionaria(e)) < 1e-9,
        `${E.variancia(e, 60).toFixed(8)} vs ${E.estacionaria(e).toFixed(8)}`);
  check("OU: a média volta a zero como e^{−γt}", Math.abs(E.media(e, 3) - e.m0 * Math.exp(-e.gama * 3)) < 1e-12);
}

// 5. browniano com deriva: média μt e variância σ²t
{
  const e = E.EXEMPLOS.browniano, t = 1.9;
  check("browniano: média m₀ + μt", Math.abs(E.media(e, t) - (e.m0 + e.mu * t)) < 1e-12);
  check("browniano: variância v₀ + σ²t", Math.abs(E.variancia(e, t) - (e.v0 + e.sigma * e.sigma * t)) < 1e-12);
}

// 6. o limite γ → 0 da fórmula bate com o caso γ = 0
{
  const base = { mu: 0.7, sigma: 0.75, m0: -1.6, v0: 0.09 };
  const zero = E.momentos(Object.assign({ gama: 0 }, base), 1.3);
  const quase = E.momentos(Object.assign({ gama: 1e-7 }, base), 1.3);
  check("o caso γ = 0 é o limite contínuo da fórmula", Math.abs(zero.m - quase.m) < 1e-6 && Math.abs(zero.v - quase.v) < 1e-6,
        `${zero.m.toFixed(8)}/${quase.m.toFixed(8)}`);
}

// 7. browniano geométrico: E[S] = S₀e^{μt}, e o logaritmo anda com μ − σ²/2
{
  const e = E.EXEMPLOS.gbm, t = 1.4, S0 = Math.exp(e.m0);
  check("GBM: E[S] = S₀ e^{μt}", Math.abs(E.media(e, t) - S0 * Math.exp(e.mu * t)) / (S0 * Math.exp(e.mu * t)) < 2e-4,
        `${E.media(e, t).toFixed(6)} vs ${(S0 * Math.exp(e.mu * t)).toFixed(6)}`);
  const lp = E.logParam(e);
  check("GBM: E[ln S] = ln S₀ + (μ − σ²/2)t", Math.abs(E.momentos(lp, t).m - (e.m0 + (e.mu - e.sigma * e.sigma / 2) * t)) < 1e-12);
  check("GBM: a deriva do logaritmo é menor que μ", lp.mu < e.mu, `${lp.mu} < ${e.mu}`);
}

// 8. Euler–Maruyama reproduz média e variância das fórmulas
for (const nome of Object.keys(E.EXEMPLOS)) {
  const e = E.EXEMPLOS[nome], T = 1.0;
  const c = E.caminhos(e, T, 2000, 6000, 20240607);
  const fim = c.caminhos.map((p) => p[c.passos]);
  const m = fim.reduce((a, b) => a + b, 0) / fim.length;
  const v = fim.reduce((a, b) => a + (b - m) ** 2, 0) / fim.length;
  const mT = E.media(e, T), vT = E.variancia(e, T);
  const tol = Math.max(0.05, 4 * Math.sqrt(vT / fim.length) + 0.02 * Math.abs(mT));
  check(`${nome}: Euler–Maruyama dá a média certa`, Math.abs(m - mT) < tol, `${m.toFixed(4)} vs ${mT.toFixed(4)}`);
  check(`${nome}: Euler–Maruyama dá a variância certa`, vT < 1e-8 ? v < 1e-3 : Math.abs(v / vT - 1) < 0.1,
        `${v.toFixed(5)} vs ${vT.toFixed(5)}`);
}

console.log(fails ? `\n${fails} falha(s)` : "\ntodos os testes passaram");
process.exit(fails ? 1 : 0);
