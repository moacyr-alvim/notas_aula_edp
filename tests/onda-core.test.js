// Testes do núcleo da página da onda.  Rodar:  node tests/onda-core.test.js
const O = require("../assets/onda-core.js");
let fails = 0;
const check = (n, ok, i) => { console.log(ok ? "ok   " : "FALHA", n, i || ""); if (!ok) fails++; };

// resíduo u_tt − c² u_xx por diferenças finitas (nos pontos onde o dado é suave)
function residuo(P, c, x, t, h = 1e-3) {
  const U = (xx, tt) => O.u(P, c, xx, tt);
  const utt = (U(x, t + h) - 2 * U(x, t) + U(x, t - h)) / (h * h);
  const uxx = (U(x + h, t) - 2 * U(x, t) + U(x - h, t)) / (h * h);
  return utt - c * c * uxx;
}
for (const c of [0.5, 1, 1.5]) {
  for (const k of ["parado", "direita"]) {
    const P = O.PRESETS[k]; let worst = 0;
    // f = cos²(πx/2) é C¹ nas bordas ±1 (f″ salta): evita-se a vizinhança das características que saem delas
    for (const [x, t] of [[0.3, 0.2], [-0.4, 0.35], [2.2, 0.9], [0.1, 1.2], [-3.1, 1.7]]) {
      const bordas = [-1, 1].some((b) => Math.abs(x - c * t - b) < 0.01 || Math.abs(x + c * t - b) < 0.01);
      if (!bordas) worst = Math.max(worst, Math.abs(residuo(P, c, x, t)));
    }
    check(`c=${c} ${k}: u_tt = c² u_xx (diferenças finitas)`, worst < 1e-3, "resíduo=" + worst.toExponential(1));
  }
}

// dados iniciais
for (const k of Object.keys(O.PRESETS)) {
  const P = O.PRESETS[k], c = 1.3; let e0 = 0, e1 = 0, h = 1e-5;
  for (const x of [-2, -0.6, 0.2, 0.9, 1.7]) {
    e0 = Math.max(e0, Math.abs(O.u(P, c, x, 0) - P.f(x)));
    e1 = Math.max(e1, Math.abs((O.u(P, c, x, h) - O.u(P, c, x, -h)) / (2 * h) - P.g(x, c)));
  }
  check(`${k}: u(x,0) = f`, e0 < 1e-12, e0); check(`${k}: u_t(x,0) = g`, e1 < 1e-3, e1.toExponential(1));
}

// u = R + L; "só para a direita" é f(x − ct)
{
  const P = O.PRESETS.direita, c = 1.2;
  let e = 0, e2 = 0; for (const [x, t] of [[0.5, 1], [2, 0.7], [-1, 2.3]]) {
    e = Math.max(e, Math.abs(O.u(P, c, x, t) - (O.right(P, c, x, t) + O.left(P, c, x, t))));
    e2 = Math.max(e2, Math.abs(O.u(P, c, x, t) - P.f(x - c * t)));
  }
  check("u = R + L", e < 1e-12); check("g = −c f′ dá u = f(x − ct)", e2 < 1e-12, e2);
}

// martelada: u(0,t) = min(2ct,2)/(2c) e fica no patamar 1/c; domínio de dependência; velocidade finita
{
  const P = O.PRESETS.martelada, c = 2;
  check("martelada: u(0,t) = min(2ct, 2)/(2c)", [0.1, 0.25, 0.5, 1, 3].every((t) => Math.abs(O.u(P, c, 0, t) - Math.min(2 * c * t, 2) / (2 * c)) < 1e-12));
  check("martelada: no x = 0 o patamar é 1/c e não volta a zero", Math.abs(O.u(P, c, 0, 50) - 1 / c) < 1e-12);
  const d = O.dependencia(c, 3, 0.5);
  check("dependência de (3, 0.5) com c=2 é [2, 4]", d[0] === 2 && d[1] === 4);
  const Q = O.PRESETS.parado, r = O.regiaoAtingida(Q, 1.5, 2);
  check("pulso: u = 0 fora de [−1−ct, 1+ct]", O.u(Q, 1.5, r[1] + 0.01, 2) === 0 && O.u(Q, 1.5, r[0] - 0.01, 2) === 0 && O.u(Q, 1.5, 0, 2) !== undefined);
}
console.log(fails ? "\n" + fails + " falha(s)" : "\ntodos os testes passaram");
process.exit(fails ? 1 : 0);
