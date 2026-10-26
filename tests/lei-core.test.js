// Testes do núcleo de leis de conservação.  Rodar:  node tests/lei-core.test.js
const L = require("../assets/lei-core.js");
let fails = 0;
const check = (n, ok, i) => { console.log(ok ? "ok   " : "FALHA", n, i || ""); if (!ok) fails++; };
const near = (a, b, t) => Math.abs(a - b) <= t;

// ---- classificação e fórmulas
let r = L.riemann(L.FLUXES.burgers, 1, 0);
check("Burgers (1→0): choque com σ = 1/2", r.type === "shock" && near(r.sigma, 0.5, 1e-12));
r = L.riemann(L.FLUXES.burgers, 0, 1);
check("Burgers (0→1): leque (Lax violada pelo salto)", r.type === "fan" && near(r.sigma, 0.5, 1e-12));
r = L.riemann(L.FLUXES.transito, 0.5, 0.8);
check("Trânsito (0,5→0,8): choque com σ = 1 − (uL+uR) = −0,3 (para trás)", r.type === "shock" && near(r.sigma, -0.3, 1e-12), "σ=" + r.sigma);
r = L.riemann(L.FLUXES.transito, 1, 0);
check("Trânsito (1→0): leque (sinal verde)", r.type === "fan");
r = L.riemann(L.FLUXES.transporte, 1, 0);
check("Transporte: contato com σ = 1", r.type === "contact" && near(r.sigma, 1, 1e-12));

// Lax ⇔ λ(uL) > σ > λ(uR) para o choque; e a fórmula σ = corda de F
for (const k of ["burgers", "transito"]) {
  const fl = L.FLUXES[k]; let bad = 0;
  for (let i = 0; i < 400; i++) {
    const a = Math.random(), b = Math.random(); if (Math.abs(a - b) < 1e-3) continue;
    const rr = L.riemann(fl, a, b), corda = (L.F(fl, a) - L.F(fl, b)) / (a - b);
    const lax = rr.lamL > corda && corda > rr.lamR;
    if (!near(rr.sigma, corda, 1e-9) || (rr.type === "shock") !== lax) bad++;
  }
  check(`${k}: σ = corda de F e (choque ⇔ Lax) em 400 sorteios`, bad === 0, "violações=" + bad);
}

// ---- solver exato versus Godunov (independente), vários casos
function l1(fl, uL, uR, T) {
  const g = L.godunov(fl, uL, uR, -6, 6, 6000, T); let e = 0;
  for (let i = 0; i < 6000; i++) { const x = g.xmin + (i + 0.5) * g.dx; e += Math.abs(g.u[i] - L.u(fl, uL, uR, x, T)) * g.dx; }
  return e;
}
const casos = [["burgers", 1, 0], ["burgers", 0, 1], ["burgers", 0.2, 0.9], ["burgers", 0.9, 0.3],
  ["transito", 0.5, 0.8], ["transito", 0.8, 0.5], ["transito", 1, 0], ["transito", 0, 1], ["transito", 0.1, 0.3],
  ["transporte", 1, 0], ["transporte", 0.3, 0.9]];
for (const [k, a, b] of casos) {
  const e = l1(L.FLUXES[k], a, b, 3);
  // no transporte linear o Godunov (upwind) borra o salto por difusão numérica: tolerância maior
  check(`${k} (${a}→${b}): erro L1 vs Godunov em t=3`, e < (k === "transporte" ? 0.08 : 0.02), "L1=" + e.toFixed(5));
}

// ---- transporte: o salto apenas viaja com velocidade c = 1 (exato)
const tr = L.FLUXES.transporte;
check("transporte: u(x,t) = f(x − ct) exato", L.u(tr, 1, 0, 2.9, 3) === 1 && L.u(tr, 1, 0, 3.1, 3) === 0);

// ---- a solução não admissível satisfaz Rankine–Hugoniot (é fraca) mas tem a mesma corda
const fl = L.FLUXES.burgers, na = L.uNaoAdmissivel(fl, 0, 1, 0.2, 1), na2 = L.uNaoAdmissivel(fl, 0, 1, 0.8, 1);
check("não admissível (Burgers 0→1): salto em x = t/2", na === 0 && na2 === 1);

// ---- leque: u = (x/t − b)/(2a), contínua nas bordas
check("leque do trânsito (1→0): u = (1 − x/t)/2 e contínua", near(L.u(L.FLUXES.transito, 1, 0, 0, 1), 0.5, 1e-12) &&
  near(L.u(L.FLUXES.transito, 1, 0, -1 + 1e-9, 1), 1, 1e-6) && near(L.u(L.FLUXES.transito, 1, 0, 1 - 1e-9, 1), 0, 1e-6));

console.log(fails ? `\n${fails} falha(s)` : "\ntodos os testes passaram");
process.exit(fails ? 1 : 0);
