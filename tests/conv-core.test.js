// Testes do núcleo de convolução e das identidades usadas na página de DFT.  Rodar:  node tests/conv-core.test.js
const C = require("../assets/conv-core.js");
let fails = 0;
const check = (n, ok, i) => { console.log(ok ? "ok   " : "FALHA", n, i || ""); if (!ok) fails++; };
const maxAbs = (A, B) => Math.max(...A.map((x, i) => Math.abs(x - B[i])), A.length === B.length ? 0 : Infinity);
const rnd = (n) => Array.from({ length: n }, () => Math.round((Math.random() * 2 - 1) * 8) / 2);

// ---- exemplos da página
check("polinômios: (1+2x+3x²)(4+5x) = 4+13x+22x²+15x³", JSON.stringify(C.linear([1, 2, 3], [4, 5])) === JSON.stringify([4, 13, 22, 15]));
const d6 = Array(6).fill(1 / 6), soma2 = C.linear(d6, d6);
check("dois dados: P(soma = 7) = 6/36 e as probabilidades somam 1", Math.abs(soma2[5] - 6 / 36) < 1e-12 && Math.abs(soma2.reduce((a, b) => a + b) - 1) < 1e-12 && soma2.length === 11);
check("tamanhos: linear N+M−1, circular N", C.linear(rnd(8), rnd(3)).length === 10 && C.circular(rnd(8), rnd(3)).length === 8);

// ---- as duas formas de calcular coincidem
for (let it = 0; it < 50; it++) {
  const N = 4 + Math.floor(Math.random() * 6), M = 1 + Math.floor(Math.random() * Math.min(N, 5)), u = rnd(N), v = rnd(M);
  if (maxAbs(C.linear(u, v), C.porSoma(u, v)) > 1e-12) { check("linear = regra dos índices que somam", false, JSON.stringify([u, v])); break; }
  if (maxAbs(C.circular(u, v), C.porSoma(u, v, N)) > 1e-12) { check("circular = regra dos índices que somam (mod N)", false, JSON.stringify([u, v])); break; }
  if (it === 49) check("linear e circular = regra dos índices que somam (50 sorteios)", true);
}

// ---- circular = linear dobrada (wrap-around): z_circ[k] = Σ_j z_lin[k + jN]
{
  const u = rnd(8), v = rnd(5), zl = C.linear(u, v), zc = C.circular(u, v), dob = new Array(8).fill(0);
  zl.forEach((x, k) => { dob[k % 8] += x; });
  check("circular = linear dobrada módulo N", maxAbs(zc, dob) < 1e-12);
  // com zero padding suficiente (N' ≥ N+M−1) circular e linear coincidem
  const up = u.concat(new Array(4).fill(0)), vp = v.concat(new Array(12 - 5).fill(0));
  check("circular com padding N' ≥ N+M−1 = linear", maxAbs(C.circular(up, vp).slice(0, zl.length), zl) < 1e-12);
}

// ---- propriedades
{
  const u = rnd(8), v = rnd(8), w = rnd(8), e0 = [1, 0, 0, 0, 0, 0, 0, 0];
  check("circular: comutativa", maxAbs(C.circular(u, v), C.circular(v, u)) < 1e-12);
  check("circular: o impulso é a identidade", maxAbs(C.circular(u, e0), u) < 1e-12);
  check("circular: associativa", maxAbs(C.circular(C.circular(u, v), w), C.circular(u, C.circular(v, w))) < 1e-9);
  check("circular: deslocar u desloca z (invariância a translação)", maxAbs(C.circular(u.slice(1).concat(u[0]), v), C.circular(u, v).slice(1).concat(C.circular(u, v)[0])) < 1e-12);
}

// ---- matriz circulante: U v = u ⊛ v, com u na primeira coluna (U_{j,m} = u_{(j−m) mod N})
{
  const N = 7, u = rnd(N), v = rnd(N), U = []; for (let j = 0; j < N; j++) { U.push([]); for (let m = 0; m < N; m++) U[j].push(u[((j - m) % N + N) % N]); }
  const Uv = U.map((r) => r.reduce((s, x, m) => s + x * v[m], 0));
  check("U v = u ⊛ v (U circulante, u na primeira coluna)", maxAbs(Uv, C.circular(u, v)) < 1e-12);
  check("primeira linha de U = u invertido (u0, u_{N−1}, …, u1)", JSON.stringify(U[0]) === JSON.stringify([u[0]].concat(u.slice(1).reverse())));
  // U = Σ u_l S^l, com S o shift (S_{j,m} = 1 se j − m ≡ 1)
  const S = []; for (let j = 0; j < N; j++) { S.push([]); for (let m = 0; m < N; m++) S[j].push(((j - m) % N + N) % N === 1 ? 1 : 0); }
  const mm = (A, B) => A.map((r) => B[0].map((_, c) => r.reduce((s, x, k) => s + x * B[k][c], 0)));
  let P = Array.from({ length: N }, (_, i) => Array.from({ length: N }, (_, j) => (i === j ? 1 : 0))), Us = Array.from({ length: N }, () => new Array(N).fill(0));
  for (let l = 0; l < N; l++) { Us = Us.map((r, i) => r.map((x, j) => x + u[l] * P[i][j])); P = mm(P, S); }
  check("U = Σ u_l S^l", Us.every((r, i) => r.every((x, j) => Math.abs(x - U[i][j]) < 1e-12)));
  check("S^N = I", P.every((r, i) => r.every((x, j) => x === (i === j ? 1 : 0))));
}

// ---- DFT: autovetores de U, convolução vira produto, produto interno
{
  const N = 8, w = (k) => [Math.cos(2 * Math.PI * k / N), Math.sin(2 * Math.PI * k / N)];
  const cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  const dft = (x) => Array.from({ length: N }, (_, k) => { let re = 0, im = 0; x.forEach((xl, l) => { re += xl * Math.cos(2 * Math.PI * l * k / N); im -= xl * Math.sin(2 * Math.PI * l * k / N); }); return [re, im]; });
  const idftRe = (X) => Array.from({ length: N }, (_, j) => { let s = 0; X.forEach((Xk, k) => { s += Xk[0] * Math.cos(2 * Math.PI * j * k / N) - Xk[1] * Math.sin(2 * Math.PI * j * k / N); }); return s / N; });
  const u = rnd(N), v = rnd(N), U = dft(u), V = dft(v), z = C.circular(u, v);
  check("teorema da convolução: DFT(u ⊛ v) = DFT(u) · DFT(v) (DFT sem normalização)", maxAbs(dft(z).map((c) => c[0]), U.map((c, k) => cmul(c, V[k])[0])) < 1e-9 && maxAbs(dft(z).map((c) => c[1]), U.map((c, k) => cmul(c, V[k])[1])) < 1e-9);
  check("z = IDFT(DFT(u) · DFT(v))", maxAbs(idftRe(U.map((c, k) => cmul(c, V[k]))), z) < 1e-9);
  // f_k(j) = ω^{jk}/√N: ortonormais, e a DFT sem normalização é √N <f_k, u>
  const f = (k) => Array.from({ length: N }, (_, j) => [Math.cos(2 * Math.PI * j * k / N) / Math.sqrt(N), Math.sin(2 * Math.PI * j * k / N) / Math.sqrt(N)]);
  const ip = (a, b) => a.reduce((s, x, j) => [s[0] + x[0] * b[j][0] + x[1] * b[j][1], s[1] + x[0] * b[j][1] - x[1] * b[j][0]], [0, 0]); // <a,b> = Σ conj(a) b
  let ok = true; for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) { const p = ip(f(a), f(b)); if (Math.abs(p[0] - (a === b ? 1 : 0)) > 1e-12 || Math.abs(p[1]) > 1e-12) ok = false; }
  check("f_k ortonormais: <f_a, f_b> = δ_ab", ok);
  const uc = u.map((x) => [x, 0]); let ok2 = true;
  for (let k = 0; k < N; k++) { const p = ip(f(k), uc); if (Math.abs(Math.sqrt(N) * p[0] - U[k][0]) > 1e-9 || Math.abs(Math.sqrt(N) * p[1] - U[k][1]) > 1e-9) ok2 = false; }
  check("<f_k, u> = DFT(u)_k / √N", ok2);
  // autovalor de U em f_k = DFT(u)_k;  S f_k = ω^{−k} f_k
  const Uf = (k) => Array.from({ length: N }, (_, j) => { let s = [0, 0]; for (let m = 0; m < N; m++) { const x = f(k)[m], c = u[((j - m) % N + N) % N]; s = [s[0] + c * x[0], s[1] + c * x[1]]; } return s; });
  let ok3 = true; for (let k = 0; k < N; k++) { const Fk = f(k), UF = Uf(k); for (let j = 0; j < N; j++) { const e = cmul(U[k], Fk[j]); if (Math.abs(e[0] - UF[j][0]) > 1e-9 || Math.abs(e[1] - UF[j][1]) > 1e-9) ok3 = false; } }
  check("U f_k = DFT(u)_k f_k (todo circulante é diagonalizado por F)", ok3);
  // DFT = avaliação do polinômio u(x) = Σ u_l x^l em x = ω^{−k}
  let ok4 = true; for (let k = 0; k < N; k++) { let re = 0, im = 0; u.forEach((c, l) => { re += c * Math.cos(-2 * Math.PI * l * k / N); im += c * Math.sin(-2 * Math.PI * l * k / N); }); if (Math.abs(re - U[k][0]) > 1e-9 || Math.abs(im - U[k][1]) > 1e-9) ok4 = false; }
  check("DFT(u)_k = u(ω^{−k}) (polinômio avaliado nas raízes de x^N − 1)", ok4);
  // laplaciano do anel: primeira coluna (2, −1, 0, …, 0, −1), autovalores 2 − 2cos(2πk/N)
  const l0 = [2, -1].concat(new Array(N - 3).fill(0), [-1]), Lh = dft(l0);
  check("L do anel é circulante: autovalores = DFT(2,−1,0,…,−1) = 2 − 2cos(2πk/N)", Lh.every((c, k) => Math.abs(c[0] - (2 - 2 * Math.cos(2 * Math.PI * k / N))) < 1e-9 && Math.abs(c[1]) < 1e-9));
}

console.log(fails ? "\n" + fails + " falha(s)" : "\ntodos os testes passaram");
process.exit(fails ? 1 : 0);
