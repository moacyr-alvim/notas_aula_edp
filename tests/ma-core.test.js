// Testes do núcleo de Monge–Ampère.  Rodar:  node tests/ma-core.test.js
const M = require("../assets/ma-core.js");
let fails = 0;
const check = (n, ok, i) => { console.log(ok ? "ok   " : "FALHA", n, i || ""); if (!ok) fails++; };

// fórmulas fechadas resolvem det D²u = −1 (diferenças finitas), em pontos regulares
function detHess(f, x, y, h = 1e-4) {
  const uxx = (f(x + h, y) - 2 * f(x, y) + f(x - h, y)) / (h * h), uyy = (f(x, y + h) - 2 * f(x, y) + f(x, y - h)) / (h * h);
  const uxy = (f(x + h, y + h) - f(x + h, y - h) - f(x - h, y + h) + f(x - h, y - h)) / (4 * h * h);
  return uxx * uyy - uxy * uxy;
}
const pts = { parabola: [[0.3, 0.8], [-0.5, 1.2], [0.1, 0.5]], circulo: [[0.3, 0.2], [-0.5, 0.4], [0.1, -0.6]], elipse: [[0.5, 0.2], [-0.8, 0.1], [0.2, -0.3]] };
for (const k of Object.keys(M.CURVES)) {
  const f = M.CURVES[k].uClosed;
  check(`${k}: det D²u = −1 na fórmula fechada`, pts[k].every(([x, y]) => Math.abs(detHess(f, x, y) + 1) < 1e-3), pts[k].map(([x, y]) => detHess(f, x, y).toFixed(4)).join(" "));
}

// construção por pontos médios e áreas = fórmula fechada
for (const k of Object.keys(M.CURVES)) {
  const C = M.CURVES[k]; let worst = 0, worstG = 0, cnt = 0;
  const S = C.periodic ? [[0.3, 1.0], [1.0, 2.9], [2.0, 4.5], [5.0, 5.9], [0.0, 3.0]] : [[-1, 1], [-1.3, 0.4], [0.2, 1.1], [-0.6, 0.3]];
  for (const [s1, s2] of S) {
    if (C.periodic && s2 - s1 > Math.PI + 1e-9) continue;
    const P1 = C.pt(s1), P2 = C.pt(s2), P = M.midpoint(P1, P2);
    if (C.periodic && s2 - s1 > Math.PI - 1e-6) continue;           // centro: ponto não regular
    worst = Math.max(worst, Math.abs(M.uFromArea(C, s1, s2) - C.uClosed(P[0], P[1])));
    // gradiente por diferenças finitas da fórmula fechada = ½ R (P2 − P1)
    const h = 1e-6, g = M.gradient(P1, P2), f = C.uClosed;
    const num = [(f(P[0] + h, P[1]) - f(P[0] - h, P[1])) / (2 * h), (f(P[0], P[1] + h) - f(P[0], P[1] - h)) / (2 * h)];
    worstG = Math.max(worstG, Math.hypot(num[0] - g[0], num[1] - g[1])); cnt++;
  }
  check(`${k}: u(P) = −área/2 coincide com a fórmula fechada (${cnt} pares)`, worst < 1e-4, worst.toExponential(1));
  check(`${k}: ∇u = ½R(P2−P1) coincide com o gradiente da fórmula`, worstG < 1e-5, worstG.toExponential(1));
}

// área da parábola: (b−a)³/6;  u(0,1) = −2/3
check("parábola: área entre a=−1, b=1 vale 4/3 e u = −2/3", Math.abs(M.signedArea(M.CURVES.parabola, -1, 1) - 4 / 3) < 1e-5 && Math.abs(M.uFromArea(M.CURVES.parabola, -1, 1) + 2 / 3) < 1e-5);

// característica: ψ1 termina no ponto médio P; as duas se encontram em P
{
  const C = M.CURVES.parabola, ch = M.characteristics(C, -1, 1), P = M.midpoint(C.pt(-1), C.pt(1));
  const e1 = ch.psi1[ch.psi1.length - 1], e2 = ch.psi2[0];
  check("ψ1 e ψ2 se encontram no ponto médio de P1P2", Math.hypot(e1[0] - P[0], e1[1] - P[1]) < 1e-12 && Math.hypot(e2[0] - P[0], e2[1] - P[1]) < 1e-12);
}

// elipse = círculo transformado: u_elipse(x,y) = u_círculo(√(b/a) x, √(a/b) y) quando ab = 1; em geral ρ² = ab
{
  const E = M.CURVES.elipse, a = 1.5, b = 0.6, rho = Math.sqrt(a * b); let err = 0;
  for (const [x, y] of [[0.5, 0.2], [-0.8, 0.1], [0.2, -0.3]]) err = Math.max(err, Math.abs(E.uClosed(x, y) - M.V(Math.hypot(Math.sqrt(b / a) * x, Math.sqrt(a / b) * y), rho)));
  check("elipse: mesma fórmula do círculo de raio √(ab) depois da aplicação de det 1", err < 1e-12);
  // e a curva: a elipse é levada ao círculo de raio √(ab)
  const q = E.pt(1.1), r = Math.hypot(Math.sqrt(b / a) * q[0], Math.sqrt(a / b) * q[1]);
  check("a aplicação leva a elipse ao círculo de raio √(ab)", Math.abs(r - rho) < 1e-12);
}

// o centro: diâmetro dá |∇u| = ρ
{
  const C = M.CURVES.circulo, g = M.gradient(C.pt(0.5), C.pt(0.5 + Math.PI));
  check("círculo: no centro |∇u| = ρ = 1 (e a direção depende do diâmetro)", Math.abs(Math.hypot(g[0], g[1]) - 1) < 1e-12);
}
console.log(fails ? "\n" + fails + " falha(s)" : "\ntodos os testes passaram");
process.exit(fails ? 1 : 0);
