/* Núcleo das páginas de calor e difusão: difusão em grafos  u' = −c L u,  L = Bᵀ C B,
 * e o grafo em anel de N vértices (que, quando N → ∞, vira u_t = k u_xx).  Sem DOM: roda no navegador e no Node (testes).
 *
 *   arestas: [i, j] ou [i, j, w]  (w = condutância relativa da aresta, 1 por padrão); índices a partir de 0
 *   B (m × n):  linha da aresta i→j tem −1 na coluna i e +1 na coluna j,  então (B u)_e = u_j − u_i
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.GrafoCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function zeros(n, m) { var A = [], i; for (i = 0; i < n; i++) A.push(new Array(m == null ? n : m).fill(0)); return A; }

  function incidence(n, edges) {
    var B = zeros(edges.length, n);
    edges.forEach(function (e, k) { B[k][e[0]] = -1; B[k][e[1]] = 1; });
    return B;
  }

  /* L = Bᵀ C B  (C = diag das condutâncias) = D − A ponderada */
  function laplacian(n, edges) {
    var L = zeros(n);
    edges.forEach(function (e) {
      var i = e[0], j = e[1], w = e.length > 2 ? e[2] : 1;
      L[i][i] += w; L[j][j] += w; L[i][j] -= w; L[j][i] -= w;
    });
    return L;
  }

  /* autovalores e autovetores de uma matriz simétrica pelo método de Jacobi (n pequeno).
   * values em ordem crescente; vectors[k] é o autovetor (comprimento n, norma 1) de values[k]. */
  function eigSym(A0) {
    var n = A0.length, A = A0.map(function (r) { return r.slice(); }), V = zeros(n), i, j, k, sweep;
    for (i = 0; i < n; i++) V[i][i] = 1;
    for (sweep = 0; sweep < 100; sweep++) {
      var off = 0; for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) off += A[i][j] * A[i][j];
      if (off < 1e-26) break;
      for (var p = 0; p < n - 1; p++) for (var q = p + 1; q < n; q++) {
        if (Math.abs(A[p][q]) < 1e-300) continue;
        var th = (A[q][q] - A[p][p]) / (2 * A[p][q]), t = (th >= 0 ? 1 : -1) / (Math.abs(th) + Math.sqrt(th * th + 1)),
            c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (k = 0; k < n; k++) { var akp = A[k][p], akq = A[k][q]; A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq; }
        for (k = 0; k < n; k++) { var apk = A[p][k], aqk = A[q][k]; A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk; }
        for (k = 0; k < n; k++) { var vkp = V[k][p], vkq = V[k][q]; V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq; }
      }
    }
    var idx = []; for (i = 0; i < n; i++) idx.push(i);
    idx.sort(function (a, b) { return A[a][a] - A[b][b]; });
    var values = idx.map(function (i) { return Math.max(0, A[i][i]) < 1e-13 ? 0 : A[i][i]; });
    var vectors = idx.map(function (c) { var v = []; for (var r = 0; r < n; r++) v.push(V[r][c]); return v; });
    return { values: values, vectors: vectors };
  }

  /* u(t) = Σ_k e^{−c λ_k t} (q_kᵀ u0) q_k */
  function evolve(eig, u0, c, t) {
    var n = u0.length, u = new Array(n).fill(0);
    eig.values.forEach(function (lam, k) {
      var q = eig.vectors[k], a = 0, i;
      for (i = 0; i < n; i++) a += q[i] * u0[i];
      a *= Math.exp(-c * lam * t);
      for (i = 0; i < n; i++) u[i] += a * q[i];
    });
    return u;
  }

  /* número de componentes conexas (união-busca) */
  function components(n, edges) {
    var p = []; for (var i = 0; i < n; i++) p.push(i);
    var f = function (x) { while (p[x] !== x) { p[x] = p[p[x]]; x = p[x]; } return x; };
    edges.forEach(function (e) { p[f(e[0])] = f(e[1]); });
    var seen = {}, cnt = 0; for (i = 0; i < n; i++) { var r = f(i); if (!seen[r]) { seen[r] = 1; cnt++; } }
    return cnt;
  }

  /* dois blocos completos de k vértices cada, ligados por uma única aresta de condutância eps.
   * pos: posições (0..1) para desenhar; grupo: 0 ou 1 */
  function doisBlocos(k, eps) {
    var n = 2 * k, edges = [], pos = [], grupo = [], g, i, j;
    for (g = 0; g < 2; g++) {
      for (i = 0; i < k; i++) {
        for (j = i + 1; j < k; j++) edges.push([g * k + i, g * k + j, 1]);
        var ang = 2 * Math.PI * i / k + Math.PI / 2;
        pos.push([0.25 + 0.5 * g + 0.17 * Math.cos(ang), 0.5 - 0.36 * Math.sin(ang)]); grupo.push(g);
      }
    }
    edges.push([k - 1, k, eps]);           // a "porta" entre os blocos
    return { n: n, edges: edges, pos: pos, grupo: grupo, ponte: [k - 1, k] };
  }

  /* ---------- o grafo em anel de N vértices ---------- */
  function ringEdges(N) { var e = [], i; for (i = 0; i < N; i++) e.push([i, (i + 1) % N, 1]); return e; }
  function ringLambda(N, m) { var s = Math.sin(Math.PI * m / N); return 4 * s * s; }   // autovalores de L do grafo em anel

  /* solução exata do grafo em anel: u0 amostrado em N pontos, taxa c;  u_j(t) = Σ_m ĉ_m e^{−c λ_m t} e^{2πi m j/N} */
  function ringSolve(u0, c, t) {
    var N = u0.length, out = new Array(N).fill(0), m, j, a, b, th, e;
    for (m = 0; m < N; m++) {
      a = 0; b = 0;
      for (j = 0; j < N; j++) { th = 2 * Math.PI * m * j / N; a += u0[j] * Math.cos(th); b -= u0[j] * Math.sin(th); }
      a /= N; b /= N; e = Math.exp(-c * ringLambda(N, m) * t);
      for (j = 0; j < N; j++) { th = 2 * Math.PI * m * j / N; out[j] += e * (a * Math.cos(th) - b * Math.sin(th)); }
    }
    return out;
  }

  /* dado inicial do limite contínuo: gaussiana periódica de largura s centrada em ℓ/2, e sua evolução exata
   * por Fourier:  u(x,t) = Σ_m (s√2π/ℓ) e^{−(s²/2 + k t) κ_m²} e^{iκ_m (x − ℓ/2)},  κ_m = 2π m/ℓ */
  function gauss(x, ell, s) {
    var v = 0, r; for (r = -3; r <= 3; r++) { var d = x - ell / 2 + r * ell; v += Math.exp(-d * d / (2 * s * s)); }
    return v;
  }
  function contU(x, t, k, ell, s) {
    var v = s * Math.sqrt(2 * Math.PI) / ell, m, kap;
    for (m = 1; m <= 80; m++) {
      kap = 2 * Math.PI * m / ell;
      v += 2 * s * Math.sqrt(2 * Math.PI) / ell * Math.exp(-(s * s / 2 + k * t) * kap * kap) * Math.cos(kap * (x - ell / 2));
    }
    return v;
  }

  return { incidence: incidence, laplacian: laplacian, eigSym: eigSym, evolve: evolve, components: components, doisBlocos: doisBlocos,
           ringEdges: ringEdges, ringLambda: ringLambda, ringSolve: ringSolve, gauss: gauss, contU: contU };
});
