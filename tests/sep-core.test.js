// Testes do núcleo da separação de variáveis.  Rodar:  node tests/sep-core.test.js
const S = require("../assets/sep-core.js");
let fails = 0;
const check = (n, ok, i) => { console.log(ok ? "ok   " : "FALHA", n, i || ""); if (!ok) fails++; };

// coeficientes de Fourier em forma fechada = integral numérica (regra do ponto médio, 20000 pontos)
for (const [nome, P] of Object.entries(S.PERFIS)) {
  let w = 0; const M = 20000;
  for (const n of [1, 2, 3, 4, 5, 8, 11]) {
    let I = 0; for (let i = 0; i < M; i++) { const x = (i + 0.5) * Math.PI / M; I += P.f(x) * Math.sin(n * x); }
    I *= (Math.PI / M) * 2 / Math.PI; w = Math.max(w, Math.abs(I - P.b(n)));
  }
  check(`${nome}: b_n fechado = (2/π)∫f sin(nx)`, w < 1e-3, w.toExponential(1));
}

// a soma parcial em t = 0 reproduz f nos pontos de suavidade (N grande)
{
  const e = (nome, x, tol) => { const P = S.PERFIS[nome]; const d = Math.abs(S.u(P, 400, x, 0) - P.f(x)); check(`${nome}: série em t=0 ≈ f(${x.toFixed(2)})`, d < tol, d.toExponential(1)); };
  e("parabola", 1.0, 1e-6); e("triangulo", 0.7, 1e-3); e("constante", Math.PI / 2, 5e-3); e("caixa", Math.PI / 2, 5e-3); e("caixa", 0.3, 5e-3);
}

// condições de contorno e EDP (diferenças finitas), u_t = k u_xx
for (const k of [1, 0.4]) {
  const P = S.PERFIS.caixa, N = 30, h = 1e-3; let worst = 0;
  for (const [x, t] of [[0.5, 0.3], [1.3, 0.2], [2.2, 0.6], [1.0, 1.0]]) {
    const U = (xx, tt) => S.u(P, N, xx, tt, k);
    const ut = (U(x, t + h) - U(x, t - h)) / (2 * h), uxx = (U(x + h, t) - 2 * U(x, t) + U(x - h, t)) / (h * h);
    worst = Math.max(worst, Math.abs(ut - k * uxx));
  }
  check(`k=${k}: u_t = k u_xx`, worst < 1e-4, worst.toExponential(1));
  check(`k=${k}: u(0,t) = u(π,t) = 0`, Math.abs(S.u(P, N, 0, 0.3, k)) < 1e-12 && Math.abs(S.u(P, N, Math.PI, 0.3, k)) < 1e-12);
}

// energia decresce e bate com a integral de u²
{
  const P = S.PERFIS.triangulo; let prev = Infinity, ok = true;
  for (const t of [0, 0.05, 0.2, 0.5, 1, 2]) { const E = S.energia(P, 200, t); if (!(E < prev)) ok = false; prev = E; }
  check("energia estritamente decrescente", ok);
  const M = 4000, t = 0.1; let I = 0; for (let i = 0; i < M; i++) { const x = (i + 0.5) * Math.PI / M; I += Math.pow(S.u(P, 200, x, t), 2); }
  I *= (Math.PI / M) / Math.PI;
  check("Parseval: (1/π)∫u² = ½Σ a_n²", Math.abs(I - S.energia(P, 200, t)) < 1e-6, Math.abs(I - S.energia(P, 200, t)).toExponential(1));
}

// para t grande só o primeiro modo sobrevive
{
  const P = S.PERFIS.caixa, t = 3; const r = S.u(P, 50, 1.1, t) / (S.amp(P, 1, t) * Math.sin(1.1));
  check("t grande: u ≈ b₁ e^{−t} sin x", Math.abs(r - 1) < 1e-4, r.toFixed(6));
}
// modo n decai na taxa n²
{
  const P = S.PERFIS.constante; const r = Math.log(S.amp(P, 3, 0.5) / S.amp(P, 3, 0.2)) / 0.3;
  check("modo 3 decai como e^{−9t}", Math.abs(r + 9) < 1e-12, r);
}
console.log(fails ? "\n" + fails + " falha(s)" : "\ntodos os testes passaram");
process.exit(fails ? 1 : 0);
