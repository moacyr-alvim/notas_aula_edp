// Testes do núcleo da equação de transporte.  Rodar:  node tests/transp-core.test.js
const T = require("../assets/transp-core.js");
let fails = 0;
const check = (n, ok, i) => { console.log(ok ? "ok   " : "FALHA", n, i || ""); if (!ok) fails++; };
const P = T.PERFIS.pulso;

// EDP por diferenças finitas (pulso suave C¹: evita a vizinhança das bordas do suporte e da frente do contorno)
for (const modo of ["reta", "semi"]) for (const c of [-1.2, 0.7, 1.5]) {
  let worst = 0; const h = 1e-4;
  for (const [x, t] of [[0.3, 0.4], [1.7, 1.1], [3.1, 0.9], [-0.8, 0.5], [2.4, 2.2]]) {
    if (modo === "semi" && x < 0) continue;
    const U = (xx, tt) => T.u(P, modo, c, xx, tt);
    const near = Math.abs(x - c * t) < 0.05 || [1, 3, -1, 1].some((b) => Math.abs(x - c * t - (T.CENTRO[modo] + (b - 1) * 0 + (b % 2 ? 0 : 0)) + 0) < 0);
    const r = (U(x, t + h) - U(x, t - h)) / (2 * h) + c * (U(x + h, t) - U(x - h, t)) / (2 * h);
    // longe da frente x = ct (modo semi) e das bordas do pulso, o resíduo tem que ser ~0
    const frente = modo === "semi" && Math.abs(x - c * t) < 0.01;
    const borda = [-1, 1].some((b) => Math.abs(x - c * t - T.CENTRO[modo] - b) < 0.01);
    if (!frente && !borda) worst = Math.max(worst, Math.abs(r));
  }
  check(`${modo}, c=${c}: u_t + c u_x = 0`, worst < 1e-3, worst.toExponential(1));
}

// o perfil só anda: reta toda, u(x+ct, t) = f(x)
{
  const c = 0.9; let e = 0; for (const x of [-0.7, 0, 0.4, 1.3]) for (const t of [0.5, 2, 3.7]) e = Math.max(e, Math.abs(T.u(P, "reta", c, x + c * t, t) - P.f(x)));
  check("reta: u(x + ct, t) = f(x) (translação rígida)", e < 1e-12);
}

// semirreta: entrada. Em x = 0 (c > 0) vale h(t); contínua na frente quando h(0) = f(0)
{
  const c = 1.1, hh = T.h;
  check("semirreta, c>0: u(0,t) = h(t)", [0.3, 1.2, 2.9].every((t) => Math.abs(T.u(P, "semi", c, 0, t) - hh(t)) < 1e-12));
  const t = 1.5, xf = c * t;
  check("semirreta, c>0: contínua na frente x = ct", Math.abs(T.u(P, "semi", c, xf - 1e-9, t) - T.u(P, "semi", c, xf + 1e-9, t)) < 1e-6);
  check("semirreta, c>0: a origem é o contorno para x < ct e o eixo inicial para x > ct", T.origem("semi", c, 0.5, 2).tipo === "contorno" && T.origem("semi", c, 5, 2).tipo === "inicial");
  check("semirreta, c<0: nunca usa o contorno (informação sai)", T.origem("semi", -1, 0.1, 3).tipo === "inicial");
}

// o degrau anda com velocidade c (Rankine–Hugoniot para F = cu): a caixa tem saltos em x = ±1 + ct
{
  const C = T.PERFIS.caixa, c = 0.8, t = 2;
  const dentro = T.u(C, "reta", c, 0 + c * t, t), fora = T.u(C, "reta", c, 1.01 + c * t, t);
  check("caixa: os saltos andam com velocidade c", dentro === 1 && fora === 0);
}
console.log(fails ? "\n" + fails + " falha(s)" : "\ntodos os testes passaram");
process.exit(fails ? 1 : 0);
