// Testes do núcleo de Burgers.  Rodar:  node tests/burgers-core.test.js
const { ICS, createSolver } = require("../assets/burgers-core.js");
let fails = 0;
function check(name, ok, info) { console.log((ok ? "ok   " : "FALHA"), name, info || ""); if (!ok) fails++; }
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// ---- rampa: fórmulas exatas deduzidas à mão
const R = createSolver(ICS.rampa);
check("rampa: t* = 2", near(R.tBreak, 2, 1e-6), "t*=" + R.tBreak);
for (const t of [0.5, 1, 1.5, 1.9]) {
  let maxErr = 0;
  for (let x = -2; x <= 8; x += 0.05) {
    const exact = x <= 2 * t ? 2 : (x < 2 + t ? (4 - x) / (2 - t) : 1);
    maxErr = Math.max(maxErr, Math.abs(R.u(x, t) - exact));
  }
  check(`rampa: perfil exato em t=${t}`, maxErr < 0.03, "erro máx=" + maxErr.toExponential(2));
}
for (const t of [2.5, 3, 4]) {
  const s = R.shockAt(t), xs = 4 + 1.5 * (t - 2);
  check(`rampa: choque em t=${t} (x=${xs}, uL=2, uR=1)`,
    s && near(s.x, xs, 0.02) && near(s.uL, 2, 0.03) && near(s.uR, 1, 0.03), s ? `x=${s.x.toFixed(4)} uL=${s.uL.toFixed(3)} uR=${s.uR.toFixed(3)}` : "sem choque");
  check(`rampa: Rankine–Hugoniot (uL+uR)/2 = dx/dt em t=${t}`, s && near((s.uL + s.uR) / 2, 1.5, 0.03));
}
check("rampa: sem choque antes de t*", R.shockAt(1.9) === null);

// ---- gaussiana: t* = sqrt(e)
const G = createSolver(ICS.gauss);
check("gauss: t* = sqrt(e)", near(G.tBreak, Math.sqrt(Math.E), 2e-3), "t*=" + G.tBreak);

// ---- degrau para baixo: choque em x = t/2
const D = createSolver(ICS.choque);
for (const t of [1, 3]) { const s = D.shockAt(t); check(`degrau↓: x=t/2 em t=${t}`, s && near(s.x, t / 2, 0.02), s ? "x=" + s.x.toFixed(4) : "sem choque"); }

// ---- degrau para cima: leque u = x/t em 0<x<t
const U = createSolver(ICS.rarefacao);
check("degrau↑: nunca há choque", U.shockAt(2) === null && U.shockAt(4) === null);
let eR = 0; for (const x of [-1, 0.25, 0.5, 1, 1.5, 2.5]) { const t = 2; const ex = x <= 0 ? 0 : (x >= t ? 1 : x / t); eR = Math.max(eR, Math.abs(U.u(x, t) - ex)); }
check("degrau↑: leque de rarefação u=x/t", eR < 0.03, "erro máx=" + eR.toExponential(2));

// ---- comparação independente: método de Godunov (volumes finitos) para a gaussiana
function godunov(f, a, b, n, T) {
  const dx = (b - a) / n, u = new Float64Array(n);
  for (let i = 0; i < n; i++) u[i] = f(a + (i + 0.5) * dx);
  const flux = (ul, ur) => { // fluxo de Godunov para F=u^2/2
    if (ul <= ur) { if (ul >= 0) return ul * ul / 2; if (ur <= 0) return ur * ur / 2; return 0; }
    return (ul + ur) / 2 >= 0 ? ul * ul / 2 : ur * ur / 2;
  };
  let t = 0;
  while (t < T) {
    let m = 0; for (const v of u) m = Math.max(m, Math.abs(v));
    let dt = 0.4 * dx / Math.max(m, 1e-6); if (t + dt > T) dt = T - t;
    const F = new Float64Array(n + 1);
    for (let i = 0; i <= n; i++) F[i] = flux(u[Math.max(i - 1, 0)], u[Math.min(i, n - 1)]);
    for (let i = 0; i < n; i++) u[i] -= dt / dx * (F[i + 1] - F[i]);
    t += dt;
  }
  return { dx, u };
}
for (const [nome, S, T] of [["gauss", G, 3], ["gauss", G, 4], ["rampa", R, 3.5]]) {
  const ic = S.ic, ref = godunov(ic.f, ic.xmin - 8, ic.xmax + 8, 6000, T);
  let l1 = 0, cnt = 0;
  for (let x = ic.xmin; x <= ic.xmax; x += 0.05) {
    const i = Math.floor((x - (ic.xmin - 8)) / ref.dx);
    l1 += Math.abs(S.u(x, T) - ref.u[i]) * 0.05; cnt++;
  }
  check(`${nome}: erro L1 vs Godunov em t=${T}`, l1 < 0.02, "L1=" + l1.toFixed(5));
}
// absorção das características: a da rampa em x0=1 deve morrer em t=2 (todas convergem a (4,2))
const lines = R.charLines(), c1 = lines.find(c => Math.abs(c.x0 - 1) < 1e-9);
check("rampa: característica x0=1 termina em t≈2", c1 && near(c1.tEnd, 2, 0.06), c1 ? "tEnd=" + c1.tEnd.toFixed(3) : "não achou");
const cL = lines.find(c => Math.abs(c.x0 - (-1)) < 1e-9);  // vem da esquerda, u=2: engolida quando 2t-1 = 4+1.5(t-2) -> t=6 > 4: vive
check("rampa: característica x0=-1 vive até tmax", cL && cL.tEnd === 4, cL ? "tEnd=" + cL.tEnd : "");

// ---- tempo de execução (para a interface)
let t0 = Date.now(); G.shockPath(); const tp = Date.now() - t0;
t0 = Date.now(); G.charLines(); const tc = Date.now() - t0;
t0 = Date.now(); const xs = Array.from({ length: 400 }, (_, i) => -4 + i * 0.025); G.profile(xs, 2.5); const tf = Date.now() - t0;
console.log(`tempos: shockPath=${tp}ms charLines=${tc}ms perfil(400 pts)=${tf}ms`);
console.log(fails ? `\n${fails} teste(s) falharam` : "\ntodos os testes passaram");
process.exit(fails ? 1 : 0);
