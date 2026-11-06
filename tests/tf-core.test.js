// Testes do núcleo da transformada de Fourier na reta.  Rodar:  node tests/tf-core.test.js
const T = require("../assets/tf-core.js");
let fails = 0;
const check = (n, ok, i) => { console.log(ok ? "ok   " : "FALHA", n, i || ""); if (!ok) fails++; };
const PI = Math.PI;

// 1. as fórmulas fechadas batem com a integral ∫f(x)e^{-ikx}dx
for (const nome of Object.keys(T.FORMAS)) {
  const d = T.FORMAS[nome], w = 1.3;
  let pior = 0;
  for (const k of [0, 0.4, 1, 2.5, 5]) {
    const num = T.numerica((x) => d.f(x, w), k, nome === "caixa" || nome === "triangulo" ? 4 : 60, 400000);
    pior = Math.max(pior, Math.abs(num.re - d.F(k, w)), Math.abs(num.im));   // tudo par: parte imaginária nula
  }
  check(`${nome}: a fórmula de û bate com a integral`, pior < 2e-4, pior.toExponential(1));
}

// 2. Parseval: ∫|f|² = (1/2π)∫|û|²
for (const nome of Object.keys(T.FORMAS)) {
  const d = T.FORMAS[nome], w = 0.9;
  const L = nome === "caixa" || nome === "triangulo" ? 3 : 40;
  const ef = T.larguraNum((x) => d.f(x, w), L, 300000).massa;
  const eF = T.larguraNum((k) => d.F(k, w), 4000, 2000000).massa / (2 * PI);
  check(`${nome}: Parseval`, Math.abs(ef - eF) / ef < 3e-3, `${ef.toFixed(6)} vs ${eF.toFixed(6)}`);
}

// 3. as larguras analíticas batem com as numéricas (menos Δk da caixa, que é infinito)
for (const nome of Object.keys(T.FORMAS)) {
  const d = T.FORMAS[nome], w = 1.1;
  const L = nome === "caixa" || nome === "triangulo" ? 3 : 40;
  const dxn = T.larguraNum((x) => d.f(x, w), L, 300000).largura;
  check(`${nome}: Δx analítico = numérico`, Math.abs(dxn - d.dx(w)) / d.dx(w) < 2e-3, `${dxn.toFixed(6)} vs ${d.dx(w).toFixed(6)}`);
  if (isFinite(d.dk(w))) {
    const dkn = T.larguraNum((k) => d.F(k, w), 3000, 1500000).largura;
    check(`${nome}: Δk analítico = numérico`, Math.abs(dkn - d.dk(w)) / d.dk(w) < 1e-2, `${dkn.toFixed(6)} vs ${d.dk(w).toFixed(6)}`);
  }
}

// 4. a caixa tem Δk infinito: a integral ∫k²|û|² não converge, cresce com o corte
{
  const d = T.FORMAS.caixa, w = 1;
  const peso = (K) => { let s = 0, h = K / 400000; for (let i = 0; i < 400000; i++) { const k = (i + 0.5) * h, v = d.F(k, w); s += k * k * v * v * h; } return s; };
  const a = peso(200), b = peso(400);
  check("caixa: ∫k²|û|² diverge (dobra com o corte)", b / a > 1.8 && b / a < 2.2, (b / a).toFixed(3));
}

// 5. a gangorra: Δx Δk ≥ 1/2, com igualdade só na gaussiana
for (const nome of Object.keys(T.FORMAS)) {
  const p = T.produto(nome, 2.0);
  check(`${nome}: Δx·Δk ≥ 1/2`, p >= 0.5 - 1e-12, isFinite(p) ? p.toFixed(6) : "∞");
}
check("gaussiana: Δx·Δk = 1/2 exatamente", Math.abs(T.produto("gaussiana", 0.7) - 0.5) < 1e-12);
check("triângulo: Δx·Δk = √(3/10)", Math.abs(T.produto("triangulo", 1.7) - Math.sqrt(0.3)) < 1e-12, T.produto("triangulo", 1.7).toFixed(6));
check("exponencial: Δx·Δk = 1/√2", Math.abs(T.produto("exponencial", 1.7) - Math.SQRT1_2) < 1e-12, T.produto("exponencial", 1.7).toFixed(6));

// 6. o produto não depende da largura: apertar em x alarga em k na mesma medida
for (const nome of Object.keys(T.FORMAS)) {
  if (nome === "caixa") continue;
  const a = T.produto(nome, 0.4), b = T.produto(nome, 3.7);
  check(`${nome}: o produto não depende de w`, Math.abs(a - b) < 1e-12, `${a.toFixed(8)} e ${b.toFixed(8)}`);
}

// 7. a gaussiana é a sua própria transformada: com w = 1, û(k) = √(2π) f(k)
{
  const d = T.FORMAS.gaussiana;
  let pior = 0;
  for (const k of [0, 0.5, 1, 2, 3]) pior = Math.max(pior, Math.abs(d.F(k, 1) - Math.sqrt(2 * PI) * d.f(k, 1)));
  check("gaussiana: û = √(2π) f quando w = 1", pior < 1e-12, pior.toExponential(1));
}

// 8. valores em k = 0: û(0) = ∫f
{
  const w = 1.4;
  check("caixa: û(0) = 2w", Math.abs(T.FORMAS.caixa.F(0, w) - 2 * w) < 1e-12);
  check("triângulo: û(0) = w", Math.abs(T.FORMAS.triangulo.F(0, w) - w) < 1e-9, T.FORMAS.triangulo.F(0, w).toFixed(9));
  check("exponencial: û(0) = 2w", Math.abs(T.FORMAS.exponencial.F(0, w) - 2 * w) < 1e-12);
  check("gaussiana: û(0) = w√(2π)", Math.abs(T.FORMAS.gaussiana.F(0, w) - w * Math.sqrt(2 * PI)) < 1e-12);
}

console.log(fails ? `\n${fails} falha(s)` : "\ntodos os testes passaram");
process.exit(fails ? 1 : 0);
