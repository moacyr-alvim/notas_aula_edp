// Testes do núcleo de difusão em grafos.  Rodar:  node tests/grafo-core.test.js
const G = require("../assets/grafo-core.js");
let fails = 0;
const check = (n, ok, i) => { console.log(ok ? "ok   " : "FALHA", n, i || ""); if (!ok) fails++; };
const near = (a, b, t) => Math.abs(a - b) <= t;
const maxAbs = (A, B) => Math.max(...A.map((x, i) => Math.abs(x - B[i])));
const matmulT = (B) => { const n = B[0].length, L = []; for (let i = 0; i < n; i++) { L.push([]); for (let j = 0; j < n; j++) { let s = 0; for (const r of B) s += r[i] * r[j]; L[i].push(s); } } return L; };

// ---- L = BᵀB, D − A, linhas somando zero
const path = [[0, 1], [1, 2]], B = G.incidence(3, path), L = G.laplacian(3, path), BtB = matmulT(B);
check("caminho de 3: L = [[1,−1,0],[−1,2,−1],[0,−1,1]]", JSON.stringify(L) === JSON.stringify([[1, -1, 0], [-1, 2, -1], [0, -1, 1]]));
check("L = BᵀB (matriz de incidência)", JSON.stringify(BtB) === JSON.stringify(L));
check("linhas de L somam zero", L.every((r) => near(r.reduce((a, b) => a + b, 0), 0, 1e-12)));
const Brev = G.incidence(3, [[1, 0], [2, 1]]);
check("a orientação das arestas não muda L", JSON.stringify(matmulT(Brev)) === JSON.stringify(L));

// ---- autovalores: caminho de 3 tem 0, 1, 3
let eg = G.eigSym(L);
check("caminho de 3: autovalores 0, 1, 3", near(eg.values[0], 0, 1e-10) && near(eg.values[1], 1, 1e-10) && near(eg.values[2], 3, 1e-10), eg.values.join(" "));
check("autovetor de λ=3 é ∝ (1,−2,1)", near(Math.abs(eg.vectors[2][0] * Math.sqrt(6)), 1, 1e-8) && near(Math.abs(eg.vectors[2][1] * Math.sqrt(6)), 2, 1e-8));

// reconstrução A = Q Λ Qᵀ para um grafo aleatório ponderado
{
  const n = 9, edges = []; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (Math.random() < 0.4) edges.push([i, j, 0.2 + Math.random()]);
  const A = G.laplacian(n, edges), e = G.eigSym(A); let err = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { let s = 0; e.vectors.forEach((q, k) => { s += e.values[k] * q[i] * q[j]; }); err = Math.max(err, Math.abs(s - A[i][j])); }
  check("reconstrução Q Λ Qᵀ = L (grafo aleatório)", err < 1e-10, "erro=" + err.toExponential(1));
  check("L é semidefinida positiva (autovalores ≥ 0)", e.values.every((v) => v >= -1e-10));
  const comp = G.components(n, edges), zeros = e.values.filter((v) => v < 1e-9).length;
  check("nº de autovalores nulos = nº de componentes conexas", comp === zeros, comp + " vs " + zeros);
}

// ---- evolução: autodecomposição contra Runge–Kutta, conservação e energia
{
  const n = 7, edges = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [1, 5, 0.5]], Lm = G.laplacian(n, edges), e = G.eigSym(Lm), c = 0.8;
  let u0 = [1, 0, 0, 0, 0.5, 0, 0], T = 2.5, u = u0.slice(), N = 5000, dt = T / N;
  const f = (v) => Lm.map((r) => -c * r.reduce((s, x, j) => s + x * v[j], 0));
  for (let s = 0; s < N; s++) {
    const k1 = f(u), k2 = f(u.map((x, i) => x + dt / 2 * k1[i])), k3 = f(u.map((x, i) => x + dt / 2 * k2[i])), k4 = f(u.map((x, i) => x + dt * k3[i]));
    u = u.map((x, i) => x + dt / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
  }
  const ue = G.evolve(e, u0, c, T);
  check("evolve (autodecomposição) = Runge–Kutta", maxAbs(u, ue) < 1e-9, "erro=" + maxAbs(u, ue).toExponential(1));
  const sum0 = u0.reduce((a, b) => a + b), sumT = ue.reduce((a, b) => a + b);
  check("Σu se conserva", near(sum0, sumT, 1e-10));
  const E = (v) => v.reduce((a, x) => a + x * x, 0);
  check("energia ½|u|² decresce", E(G.evolve(e, u0, c, 1)) < E(u0) && E(G.evolve(e, u0, c, 2)) < E(G.evolve(e, u0, c, 1)));
  const ul = G.evolve(e, u0, c, 200);
  check("t grande: u → média (grafo conexo)", near(Math.max(...ul), sum0 / n, 1e-9) && near(Math.min(...ul), sum0 / n, 1e-9));
}

// ---- dois grafos desconectados: o estado final é a média de cada componente
{
  const edges = [[0, 1], [1, 2], [3, 4]], e = G.eigSym(G.laplacian(5, edges));
  check("2 componentes → 2 autovalores nulos", G.components(5, edges) === 2 && e.values.filter((v) => v < 1e-9).length === 2);
  const u = G.evolve(e, [3, 0, 0, 2, 0], 1, 200);
  check("estado final = média de cada componente", near(u[0], 1, 1e-8) && near(u[2], 1, 1e-8) && near(u[3], 1, 1e-8) && near(u[4], 1, 1e-8));
}

// ---- dois blocos: λ2 ≈ 2ε/k pequeno; vetor de Fiedler separa os blocos
{
  const k = 6; let prev = Infinity;
  for (const eps of [1, 0.3, 0.1, 0.03, 0.01]) {
    const g = G.doisBlocos(k, eps), e = G.eigSym(G.laplacian(g.n, g.edges)), l2 = e.values[1];
    check(`dois blocos ε=${eps}: λ2 decresce com ε`, l2 < prev && l2 > 0, "λ2=" + l2.toFixed(5)); prev = l2;
    if (eps <= 0.1) check(`dois blocos ε=${eps}: λ2 ≈ 2ε/k (±15%)`, Math.abs(l2 - 2 * eps / k) < 0.15 * 2 * eps / k, "λ2=" + l2.toFixed(5) + " 2ε/k=" + (2 * eps / k).toFixed(5));
    const q = e.vectors[1], s0 = Math.sign(q[0]);
    check(`dois blocos ε=${eps}: Fiedler separa os blocos`, g.grupo.every((gr, i) => Math.sign(q[i]) === (gr === 0 ? s0 : -s0)));
  }
}

// ---- grafo em anel
{
  for (const N of [5, 8, 12]) {
    const e = G.eigSym(G.laplacian(N, G.ringEdges(N))), teo = []; for (let m = 0; m < N; m++) teo.push(G.ringLambda(N, m));
    teo.sort((a, b) => a - b);
    check(`grafo em anel N=${N}: autovalores 4 sin²(πm/N)`, maxAbs(e.values, teo) < 1e-9);
  }
  const N = 10, u0 = Array.from({ length: N }, (_, j) => Math.exp(-((j - 5) ** 2) / 3)), c = 0.7, t = 1.3;
  const e = G.eigSym(G.laplacian(N, G.ringEdges(N)));
  check("grafo em anel: ringSolve (DFT) = autodecomposição", maxAbs(G.ringSolve(u0, c, t), G.evolve(e, u0, c, t)) < 1e-9);
  check("grafo em anel: modo m tem multiplicidade 2 (λ_m = λ_{N−m})", near(G.ringLambda(N, 3), G.ringLambda(N, N - 3), 1e-12));
  check("grafo em anel: λ_max = 4 (N par)", near(G.ringLambda(12, 6), 4, 1e-12));

  // limite contínuo: c = k/h², erro máximo → 0
  const ell = 2 * Math.PI, k = 0.2, s = 0.5, T = 1.0, errs = [];
  for (const n of [8, 16, 32, 64, 128]) {
    const h = ell / n, c2 = k / (h * h), u0n = Array.from({ length: n }, (_, j) => G.gauss(j * h, ell, s)), un = G.ringSolve(u0n, c2, T);
    errs.push(Math.max(...un.map((v, j) => Math.abs(v - G.contU(j * h, T, k, ell, s)))));
  }
  check("limite: erro decresce com N", errs.every((x, i) => i === 0 || x < errs[i - 1]), errs.map((x) => x.toExponential(1)).join(" "));
  check("limite: erro ≈ O(h²) (razão ~4 ao dobrar N)", errs[4] > 0 && near(errs[3] / errs[4], 4, 1.2), (errs[3] / errs[4]).toFixed(2));
  check("limite: erro com N=128 é < 5e-4", errs[4] < 5e-4);
  // contU: dado inicial e conservação
  check("contU(x,0) = gaussiana inicial", near(G.contU(2.0, 0, k, ell, s), G.gauss(2.0, ell, s), 1e-9));
  let mass = 0, M = 2000; for (let i = 0; i < M; i++) mass += G.contU((i + 0.5) * ell / M, 1.7, k, ell, s) * ell / M;
  check("contU conserva a massa (= s√2π)", near(mass, s * Math.sqrt(2 * Math.PI), 1e-6), mass.toFixed(6));
  // autovalores: c λ_m → k (2π m/ℓ)²
  for (const m of [1, 2, 3]) {
    const n = 400, h = ell / n, v = (k / (h * h)) * G.ringLambda(n, m), teo = k * (2 * Math.PI * m / ell) ** 2;
    check(`autovalor m=${m}: c·λ_m → k(2πm/ℓ)² com N=400`, near(v / teo, 1, 1e-3), "razão=" + (v / teo).toFixed(5));
  }
}

console.log(fails ? "\n" + fails + " falha(s)" : "\ntodos os testes passaram");
process.exit(fails ? 1 : 0);
