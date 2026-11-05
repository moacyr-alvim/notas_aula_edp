// Testes do núcleo do passeio aleatório.  Rodar:  node tests/fp-core.test.js
const F = require("../assets/fp-core.js");
let fails = 0;
const check = (n, ok, i) => { console.log(ok ? "ok   " : "FALHA", n, i || ""); if (!ok) fails++; };
const D = F.D0;

// 1. a equação mestra conserva a massa (é uma matriz estocástica em colunas)
for (const [h, a, s] of [[0.4, 0, 1], [0.2, 0.5, 0.5], [0.1, -1, 0.5], [0.05, 1, 0.25]]) {
  const d = F.distribuicao(h, 1, a, s), m = F.momentos(d);
  check(`massa = 1 (h=${h}, a=${a}, s=${s})`, Math.abs(m.massa - 1) < 1e-12, m.massa.toFixed(14));
}

// 2. a média é exatamente a t, e a variância é 2Dt − a²τt
for (const [h, a, s] of [[0.2, 0.5, 0.5], [0.1, -0.8, 0.5], [0.05, 0.3, 1]]) {
  const d = F.distribuicao(h, 1, a, s), m = F.momentos(d);
  const vTeor = 2 * D * d.t - a * a * d.tau * d.t;
  check(`média = a·t  (h=${h}, a=${a})`, Math.abs(m.media - a * d.t) < 1e-9, `${m.media.toFixed(8)} vs ${(a * d.t).toFixed(8)}`);
  check(`variância = 2Dt − a²τt  (h=${h}, a=${a})`, Math.abs(m.var - vTeor) < 1e-9, `${m.var.toFixed(8)} vs ${vTeor.toFixed(8)}`);
}

// 3. com preguiça, a densidade converge para a gaussiana — e é de segunda ordem em h
{
  const err = [0.4, 0.2, 0.1, 0.05].map((h) => F.erroDensidade(F.distribuicao(h, 1, 0.5, 0.5), 0.5));
  const razoes = err.slice(0, -1).map((e, i) => e / err[i + 1]);
  check("erro da densidade cai com h", err.every((e, i) => i === 0 || e < err[i - 1]), err.map((e) => e.toExponential(1)).join(" → "));
  check("a convergência é de segunda ordem (razão ≈ 4)", razoes.every((r) => r > 3.4 && r < 4.6), razoes.map((r) => r.toFixed(2)).join(", "));
}

// 4. sem preguiça (s = 1) a paridade estraga tudo: metade dos sítios fica vazia
{
  const d = F.distribuicao(0.1, 1, 0.5, 1);
  let vazios = 0, dentro = 0;
  for (let i = 0; i < d.xs.length; i++) if (Math.abs(d.xs[i]) < 1) { dentro++; if (d.P[i] === 0) vazios++; }
  check("sem preguiça, metade dos sítios tem probabilidade zero", Math.abs(vazios / dentro - 0.5) < 0.06, `${vazios}/${dentro}`);
  const e1 = F.erroDensidade(F.distribuicao(0.1, 1, 0.5, 1), 0.5), e2 = F.erroDensidade(F.distribuicao(0.05, 1, 0.5, 1), 0.5);
  check("sem preguiça, refinar não melhora a densidade", e2 > 0.5 * e1, `${e1.toFixed(4)} → ${e2.toFixed(4)}`);
}

// 5. a gaussiana tem massa 1 e variância 2Dt
{
  const t = 1.3, a = 0.4, dx = 0.002;
  let m0 = 0, m1 = 0, m2 = 0;
  for (let x = -8; x <= 8; x += dx) { const g = F.gaussiana(x, t, a) * dx; m0 += g; m1 += x * g; m2 += x * x * g; }
  check("gaussiana: massa 1", Math.abs(m0 - 1) < 1e-6, m0.toFixed(8));
  check("gaussiana: média a·t", Math.abs(m1 - a * t) < 1e-6, m1.toFixed(6));
  check("gaussiana: variância 2Dt", Math.abs(m2 - m1 * m1 - 2 * D * t) < 1e-5, (m2 - m1 * m1).toFixed(6));
}

// 6. as trajetórias sorteadas reproduzem a mesma estatística
{
  const h = 0.1, T = 1, a = 0.5, s = 0.5;
  const tr = F.trajetorias(h, T, a, s, 4000, 12345);
  const fim = tr.caminhos.map((c) => c[tr.n]);
  const med = fim.reduce((x, y) => x + y, 0) / fim.length;
  const vr = fim.reduce((x, y) => x + (y - med) ** 2, 0) / fim.length;
  const t = tr.n * tr.tau;
  check("trajetórias: média ≈ a·t", Math.abs(med - a * t) < 0.04, `${med.toFixed(4)} vs ${(a * t).toFixed(4)}`);
  check("trajetórias: variância ≈ 2Dt", Math.abs(vr - 2 * D * t) < 0.05, `${vr.toFixed(4)} vs ${(2 * D * t).toFixed(4)}`);
}

// 7. o sorteio é reprodutível (mesma semente, mesmo caminho)
{
  const a = F.trajetorias(0.2, 1, 0, 0.5, 2, 7).caminhos, b = F.trajetorias(0.2, 1, 0, 0.5, 2, 7).caminhos;
  check("trajetórias reprodutíveis", a[0].every((v, i) => v === b[0][i]) && a[1][5] !== a[0][5]);
}

// 8. τ e as probabilidades batem com as fórmulas do texto
{
  const P = F.parametros(0.2, 0.5, 0.5);
  check("τ = h²s/(2D)", Math.abs(P.tau - 0.2 * 0.2 * 0.5 / (2 * D)) < 1e-15, P.tau.toFixed(6));
  check("a = (h/τ)(p−q)", Math.abs((0.2 / P.tau) * (P.p - P.q) - 0.5) < 1e-12);
  check("D = (h²/2τ)(p+q)", Math.abs((0.04 / (2 * P.tau)) * (P.p + P.q) - D) < 1e-12);
  check("probabilidades em [0,1] e somando ≤ 1", P.p >= 0 && P.q >= 0 && P.p + P.q <= 1, `p=${P.p}, q=${P.q}`);
}

console.log(fails ? `\n${fails} falha(s)` : "\ntodos os testes passaram");
process.exit(fails ? 1 : 0);
