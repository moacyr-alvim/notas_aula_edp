// Testes do núcleo das séries de Fourier.  Rodar:  node tests/sf-core.test.js
const S = require("../assets/sf-core.js");
let fails = 0;
const check = (n, ok, i) => { console.log(ok ? "ok   " : "FALHA", n, i || ""); if (!ok) fails++; };
const PI = Math.PI;

// 1. as fórmulas fechadas dos coeficientes conferem com a integral numérica
for (const [nome, d] of Object.entries(S.DADOS)) {
  let pior = 0;
  for (const k of [1, 2, 3, 4, 5, 7, 8]) {
    const c = S.coefNumerico(d, k);
    pior = Math.max(pior, Math.abs(Math.hypot(c.re, c.im) - d.cn(k)));
  }
  const c0 = S.coefNumerico(d, 0);
  pior = Math.max(pior, Math.abs(c0.re - d.c0));
  check(`${nome}: |c_k| fechado = integral numérica`, pior < 2e-3, pior.toExponential(1));
}

// 2. ‖f‖² declarado = (1/2π)∫|f|²
for (const [nome, d] of Object.entries(S.DADOS)) {
  let I = 0; const M = 200000;
  for (let i = 0; i < M; i++) { const x = -PI + (i + 0.5) * 2 * PI / M, v = d.f(x); I += v * v; }
  I /= M;
  check(`${nome}: ‖f‖² = ${d.norma2.toFixed(4)}`, Math.abs(I - d.norma2) < 1e-4, I.toFixed(6));
}

// 3. Parseval: a energia capturada tende a 1
for (const [nome, d] of Object.entries(S.DADOS)) {
  const e = S.energia(d, 4000);
  check(`${nome}: energia capturada → 1 (N = 4000)`, e > 0.999 && e <= 1 + 1e-12, e.toFixed(6));
}

// 4. a soma parcial converge nos pontos de suavidade
{
  const casos = [["quadrada", 1.0, 1], ["quadrada", -2.0, -1], ["dente", 1.0, 1.0], ["triangulo", 1.0, 1.0], ["triangulo", -2.0, 2.0]];
  for (const [nome, x, esperado] of casos) {
    const d = S.DADOS[nome], v = d.S(x, 3000);
    check(`${nome}: S_N(${x}) ≈ f(${x}) = ${esperado}`, Math.abs(v - esperado) < 5e-3, v.toFixed(5));
  }
}

// 5. periodicidade: S_N(x + 2π) = S_N(x) e f(x + 2π) = f(x)
{
  const d = S.DADOS.dente;
  check("dente: f é 2π-periódica", Math.abs(d.f(1.3 + 2 * PI) - d.f(1.3)) < 1e-12);
  check("dente: S_N é 2π-periódica", Math.abs(d.S(1.3 + 2 * PI, 40) - d.S(1.3, 40)) < 1e-9);
}

// 6. Gibbs: nos saltos o excesso teima em ~8,95% do salto; no bico, não há excesso
{
  const q = S.medidas(S.DADOS.quadrada, 400).maxS;          // salto de 2, limite 1 + 0,1790
  check("quadrada: excesso de Gibbs ≈ 1,1790", Math.abs(q - 1.17898) < 5e-3, q.toFixed(5));
  const d = S.medidas(S.DADOS.dente, 400).maxS;             // salto de 2π, limite π(1 + 0,1790)
  check("dente: excesso de Gibbs ≈ π·1,1790", Math.abs(d - PI * 1.17898) < 2e-2, d.toFixed(5));
  const t = S.medidas(S.DADOS.triangulo, 400);
  check("triângulo: sem excesso (erro máximo pequeno)", t.erroMax < 1e-2 && t.maxS < PI + 1e-3, t.erroMax.toExponential(1));
}

// 7. decaimento: salto dá 1/n, bico dá 1/n²
{
  const r = (nome, n) => S.DADOS[nome].cn(n) ? S.DADOS[nome].cn(n) : S.DADOS[nome].cn(n + 1);
  const q = S.DADOS.quadrada, t = S.DADOS.triangulo;
  check("quadrada: c_n cai como 1/n (dobrar n divide por 2)", Math.abs(q.cn(11) / q.cn(21) - 21 / 11) < 1e-9);
  check("triângulo: c_n cai como 1/n² (dobrar n divide por 4)", Math.abs(t.cn(11) / t.cn(21) - (21 * 21) / (11 * 11)) < 1e-9);
}

// 8. o erro máximo fora dos saltos encolhe quando N cresce
for (const nome of ["dente", "triangulo"]) {
  const d = S.DADOS[nome];
  const e1 = S.medidas(d, 20).erroMax, e2 = S.medidas(d, 200).erroMax;
  check(`${nome}: erro máximo cai de N = 20 para N = 200`, e2 < e1, `${e1.toFixed(4)} → ${e2.toFixed(4)}`);
}

// 9. aliasing: amostrando f em N pontos, û_k/√N = Σ_r c_{k+rN}  (dente, c_m = i(−1)^m/m)
for (const [N, k] of [[7, 1], [7, 2], [9, 1]]) {
  const d = S.DADOS.dente;
  let re = 0, im = 0;                                        // û_k/√N = (1/N) Σ_j e^{-2πijk/N} f(x_j), x_j = 2πj/N
  for (let j = 0; j < N; j++) {
    const x = 2 * PI * j / N, v = d.f(x), a = -2 * PI * j * k / N;
    re += v * Math.cos(a); im += v * Math.sin(a);
  }
  re /= N; im /= N;
  let soma = 0;                                              // Σ_r c_{k+rN}, parte imaginária (a real é zero)
  for (let r = -200000; r <= 200000; r++) {
    const m = k + r * N; if (m === 0) continue;
    soma += (m % 2 ? -1 : 1) / m;
  }
  const erro = Math.max(Math.abs(re), Math.abs(im - soma));
  check(`aliasing: û_k/√N = Σ_r c_{k+rN} (dente, N = ${N}, k = ${k})`, erro < 1e-4, erro.toExponential(1));
}

console.log(fails ? `\n${fails} falha(s)` : "\ntodos os testes passaram");
process.exit(fails ? 1 : 0);
