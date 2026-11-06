// Testes do núcleo do calor na reta.  Rodar:  node tests/cr-core.test.js
const C = require("../assets/cr-core.js");
let fails = 0;
const check = (n, ok, i) => { console.log(ok ? "ok   " : "FALHA", n, i || ""); if (!ok) fails++; };
const PI = Math.PI, D = C.D0;

// 1. a função erro bate com a integral
{
  let pior = 0;
  for (const x of [0.2, 0.7, 1.5, 2.5, -1.1]) {
    const M = 200000, h = Math.abs(x) / M;
    let s = 0;
    for (let i = 0; i < M; i++) { const u = (i + 0.5) * h; s += Math.exp(-u * u) * h; }
    pior = Math.max(pior, Math.abs(C.erf(x) - Math.sign(x) * 2 / Math.sqrt(PI) * s));
  }
  check("erf bate com a integral", pior < 1e-12, pior.toExponential(1));
}

// 2. o núcleo tem massa 1 e variância 2Dt
for (const t of [0.1, 1, 3]) {
  const L = 12 * Math.sqrt(2 * D * t), M = 200000, h = 2 * L / M;
  let m0 = 0, m2 = 0;
  for (let i = 0; i < M; i++) { const x = -L + (i + 0.5) * h, g = C.nucleo(x, t) * h; m0 += g; m2 += x * x * g; }
  check(`núcleo em t = ${t}: massa 1`, Math.abs(m0 - 1) < 1e-9, m0.toFixed(12));
  check(`núcleo em t = ${t}: variância 2Dt = ${(2 * D * t).toFixed(3)}`, Math.abs(m2 - 2 * D * t) < 1e-9, m2.toFixed(8));
}

// 3. cada solução resolve mesmo u_t = D u_xx (diferenças finitas em x e no tempo)
for (const nome of Object.keys(C.DADOS)) {
  const d = C.DADOS[nome], t = 0.8, dx = 1e-3, dt = 1e-5;
  let pior = 0;
  for (const x of [-2.3, -0.7, 0, 0.5, 1.9, 3.1]) {
    const uxx = (d.u(x + dx, t) - 2 * d.u(x, t) + d.u(x - dx, t)) / (dx * dx);
    const ut = (d.u(x, t + dt) - d.u(x, t - dt)) / (2 * dt);
    pior = Math.max(pior, Math.abs(ut - D * uxx));
  }
  check(`${nome}: resolve u_t = D u_xx`, pior < 2e-4, pior.toExponential(1));
}

// 4. quando t → 0 a solução volta ao dado inicial (longe dos saltos)
for (const nome of ["caixa", "dois", "degrau"]) {
  const d = C.DADOS[nome];
  let pior = 0;
  for (const x of [-3, -1.9, -0.5, 0.4, 2.1, 3.4]) pior = Math.max(pior, Math.abs(d.u(x, 1e-5) - d.f(x)));
  check(`${nome}: u(·, 0⁺) = f`, pior < 1e-6, pior.toExponential(1));
}

// 5. a massa se conserva (para os dados integráveis)
for (const nome of ["caixa", "dois", "ponto"]) {
  const d = C.DADOS[nome];
  for (const t of [0.2, 2]) {
    const L = 30, M = 300000, h = 2 * L / M;
    let m = 0;
    for (let i = 0; i < M; i++) m += d.u(-L + (i + 0.5) * h, t) * h;
    check(`${nome}: massa ${d.massa} em t = ${t}`, Math.abs(m - d.massa) < 1e-5, m.toFixed(8));
  }
}

// 6. o pico do núcleo cai como 1/√t, e o perfil reescalado não muda
{
  const r = C.nucleo(0, 1) / C.nucleo(0, 4);
  check("núcleo: o pico cai como 1/√t", Math.abs(r - 2) < 1e-12, r.toFixed(10));
  let pior = 0;
  for (const xi of [-2, -0.5, 0, 0.8, 1.7]) {
    const a = C.colapso(C.DADOS.ponto, xi, 0.3), b = C.colapso(C.DADOS.ponto, xi, 7.5);
    pior = Math.max(pior, Math.abs(a - b));
  }
  check("núcleo: o perfil reescalado não depende de t (autossemelhança)", pior < 1e-12, pior.toExponential(1));
}

// 7. o círculo é a reta enrolada: para t pequeno coincidem, para t grande tende à média
{
  let pior = 0;
  for (const x of [-2, 0, 1.5, 3]) pior = Math.max(pior, Math.abs(C.noCirculo(C.DADOS.caixa, x, 0.02) - C.DADOS.caixa.u(x, 0.02)));
  check("círculo e reta coincidem em t pequeno", pior < 1e-9, pior.toExponential(1));
  const med = C.DADOS.caixa.massa / C.PERIODO;
  const desvio = (t) => Math.max(...[-3, -1, 0, 2, 3].map((x) => Math.abs(C.noCirculo(C.DADOS.caixa, x, t) - med)));
  check("no círculo, t grande tende à média 2/2π", desvio(40) < 1e-4, `média ${med.toFixed(6)}, erro ${desvio(40).toExponential(1)}`);
  // e tende a ela na taxa do primeiro harmônico, e^{-Dt}: dez unidades de tempo valem e^{2,5}
  const taxa = desvio(40) / desvio(50);
  check("no círculo, a aproximação da média é exponencial (e^{Dt})", Math.abs(taxa - Math.exp(2.5)) / Math.exp(2.5) < 0.02, `${taxa.toFixed(3)} vs ${Math.exp(2.5).toFixed(3)}`);
  // na reta não há média para onde convergir: o perfil achata como massa/√(4πDt)
  const naReta = C.DADOS.caixa.u(0, 400), prev = 2 / Math.sqrt(4 * PI * D * 400);
  check("na reta, t grande achata como massa/√(4πDt)", Math.abs(naReta - prev) / prev < 2e-3, `${naReta.toFixed(6)} vs ${prev.toFixed(6)}`);
  check("na reta, u(0,t) → 0 (devagar, como 1/√t)", C.DADOS.caixa.u(0, 4000) < 0.02, C.DADOS.caixa.u(0, 4000).toFixed(6));
}

// 8. a solução no círculo é periódica
{
  let pior = 0;
  for (const x of [-1.3, 0.4, 2.2]) pior = Math.max(pior, Math.abs(C.noCirculo(C.DADOS.dois, x, 0.7) - C.noCirculo(C.DADOS.dois, x + C.PERIODO, 0.7)));
  check("a solução no círculo tem período 2π", pior < 1e-9, pior.toExponential(1));
}

// 9. o espectro é o inicial vezes e^{-Dk²t}
{
  const d = C.DADOS.caixa;
  let pior = 0;
  for (const k of [0.5, 2, 5]) pior = Math.max(pior, Math.abs(C.espectro(d, k, 1.3) - Math.exp(-D * k * k * 1.3) * Math.abs(d.F(k))));
  check("espectro = |û₀| e^{-Dk²t}", pior < 1e-14);
  check("o degrau não tem espectro (não é integrável)", C.espectro(C.DADOS.degrau, 1, 1) === null);
}

console.log(fails ? `\n${fails} falha(s)` : "\ntodos os testes passaram");
process.exit(fails ? 1 : 0);
