// Testes do núcleo do poço infinito.  Rodar:  node tests/qw-core.test.js
const Q = require("../assets/qw-core.js");
let fails = 0;
const check = (n, ok, i) => { console.log(ok ? "ok   " : "FALHA", n, i || ""); if (!ok) fails++; };
const PI = Math.PI;
const grade = (M) => Array.from({ length: M + 1 }, (_, i) => PI * i / M);

// 1. as autofunções são ortonormais no poço
{
  let pior = 0;
  const M = 20000, h = PI / M;
  for (const [a, b] of [[1, 1], [2, 2], [1, 2], [3, 7], [5, 5]]) {
    let I = 0;
    for (let i = 0; i < M; i++) { const x = (i + 0.5) * h; I += Q.phi(a, x) * Q.phi(b, x) * h; }
    pior = Math.max(pior, Math.abs(I - (a === b ? 1 : 0)));
  }
  check("φ_n ortonormais em [0, π]", pior < 1e-6, pior.toExponential(1));
}

// 2. todo estado tem norma 1, e ela não muda com o tempo
for (const nome of Object.keys(Q.ESTADOS)) {
  const c = Q.coeficientes(Q.ESTADOS[nome]);
  check(`${nome}: Σ|c_n|² = 1`, Math.abs(Q.norma(c) - 1) < 1e-6, Q.norma(c).toFixed(8));
  const xs = grade(400), h = PI / 400;
  const massa = (t) => Q.densidade(c, xs, t).reduce((s, v) => s + v, 0) * h;
  const m0 = massa(0), m1 = massa(1.37);
  check(`${nome}: ∫|ψ|² não muda com t`, Math.abs(m1 - m0) < 2e-3, `${m0.toFixed(5)} → ${m1.toFixed(5)}`);
}

// 3. estado estacionário: |ψ|² não depende do tempo
{
  const c = Q.coeficientes(Q.ESTADOS.fundamental), xs = grade(200);
  const d0 = Q.densidade(c, xs, 0), d1 = Q.densidade(c, xs, 0.9);
  let pior = 0; for (let i = 0; i < xs.length; i++) pior = Math.max(pior, Math.abs(d0[i] - d1[i]));
  check("fundamental: |ψ|² é estático", pior < 1e-12, pior.toExponential(1));
}

// 4. ressurgimento exato em t = 2π, para todos os estados
for (const nome of Object.keys(Q.ESTADOS)) {
  const c = Q.coeficientes(Q.ESTADOS[nome]), xs = grade(300);
  let pior = 0;
  for (const x of xs) {
    const a = Q.psi(c, x, 0), b = Q.psi(c, x, Q.RESSURG);
    pior = Math.max(pior, Math.hypot(a.re - b.re, a.im - b.im));
  }
  check(`${nome}: ψ(·, 2π) = ψ(·, 0)`, pior < 1e-9, pior.toExponential(1));
}

// 5. espelho em t = π: |ψ(x, π)|² = |ψ(π − x, 0)|²
for (const nome of ["pacote", "impulso", "caixa"]) {
  const c = Q.coeficientes(Q.ESTADOS[nome]), xs = grade(300);
  const d = Q.densidade(c, xs, Q.ESPELHO), d0 = Q.densidade(c, xs.map((x) => PI - x), 0);
  let pior = 0; for (let i = 0; i < xs.length; i++) pior = Math.max(pior, Math.abs(d[i] - d0[i]));
  check(`${nome}: em t = π o perfil é o espelhado`, pior < 1e-9, pior.toExponential(1));
}

// 6. a energia média não muda, e a ocupação dos níveis também não
{
  const c = Q.coeficientes(Q.ESTADOS.dois);
  check("dois níveis: ⟨E⟩ = (1 + 4)/2 = 2,5", Math.abs(Q.energiaMedia(c) - 2.5) < 1e-9, Q.energiaMedia(c).toFixed(6));
  const oc = Q.ocupacao(c);
  check("dois níveis: ocupações 1/2 e 1/2", Math.abs(oc[0] - 0.5) < 1e-9 && Math.abs(oc[1] - 0.5) < 1e-9);
}

// 7. a superposição de dois níveis bate com período 2π/(E₂ − E₁) = 2π/3
{
  const c = Q.coeficientes(Q.ESTADOS.dois), T = 2 * PI / 3;
  const x0 = Q.posicaoMedia(c, 0), xq = Q.posicaoMedia(c, T / 2), xT = Q.posicaoMedia(c, T);
  check("dois níveis: ⟨x⟩ tem período 2π/3", Math.abs(xT - x0) < 1e-4 && Math.abs(xq - x0) > 0.3,
        `x(0)=${x0.toFixed(4)}  x(T/2)=${xq.toFixed(4)}  x(T)=${xT.toFixed(4)}`);
}

// 8. o pacote com impulso k anda com velocidade de grupo 2k (dE/dk = 2k, com 2m = 1)
{
  const c = Q.coeficientes(Q.ESTADOS.impulso), dt = 0.004;
  const v = (Q.posicaoMedia(c, dt) - Q.posicaoMedia(c, 0)) / dt;
  check("pacote com k = 6: ⟨x⟩ anda a ≈ 12", Math.abs(v - 12) < 1.5, v.toFixed(3));
}

// 9. o pacote parado espalha: a largura cresce
{
  const c = Q.coeficientes(Q.ESTADOS.pacote), M = 2000, h = PI / M;
  const larg = (t) => {
    let m = 0, s1 = 0, s2 = 0;
    for (let i = 0; i < M; i++) {
      const x = (i + 0.5) * h, z = Q.psi(c, x, t), d = (z.re * z.re + z.im * z.im) * h;
      m += d; s1 += x * d; s2 += x * x * d;
    }
    return Math.sqrt(s2 / m - (s1 / m) ** 2);
  };
  const l0 = larg(0), l1 = larg(0.25);
  check("pacote parado: a largura cresce (dispersão)", l1 > l0 * 1.2, `${l0.toFixed(4)} → ${l1.toFixed(4)}`);
}

console.log(fails ? `\n${fails} falha(s)` : "\ntodos os testes passaram");
process.exit(fails ? 1 : 0);
