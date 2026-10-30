// Testes do núcleo da fórmula de Hopf–Lax.  Rodar:  node tests/hl-core.test.js
const H = require("../assets/hl-core.js");
let fails = 0;
const check = (n, ok, i) => { console.log(ok ? "ok   " : "FALHA", n, i || ""); if (!ok) fails++; };

const D = H.DADOS;

// 1. casos com solução exata conhecida (exercício 1 da página)
for (const nome of ["degrau", "leque"]) {
  const d = D[nome];
  let w = 0;
  for (const t of [0.4, 1, 2.5, 4]) {
    for (let k = 0; k <= 40; k++) {
      const x = -1 + 6 * k / 40;
      w = Math.max(w, Math.abs(H.u(d, x, t) - d.exata(x, t)));
    }
  }
  check(`${nome}: a fórmula bate com a solução exata`, w < 1e-6, w.toExponential(1));
}

// 2. antes da quebra, y* é o pé da característica: x = y* + t v0(y*)
{
  const d = D.rampa;
  let w = 0;
  for (const t of [0.5, 1, 1.9]) {
    for (let k = 0; k <= 30; k++) {
      const x = -1 + 6 * k / 30, r = H.resolve(d, x, t);
      w = Math.max(w, Math.abs(r.y + t * d.v0(r.y) - x));
    }
  }
  check("rampa (t < t*): x = y* + t·v0(y*), a característica", w < 1e-6, w.toExponential(1));
}

// 3. antes da quebra o mínimo é único; depois, há dois candidatos perto do choque
{
  const d = D.rampa;
  let maxCand = 0;
  for (let k = 0; k <= 60; k++) maxCand = Math.max(maxCand, H.resolve(d, -1 + 6 * k / 60, 1.5).candidatos.length);
  check("rampa (t < t*): mínimo único em toda parte", maxCand === 1, `máx de candidatos = ${maxCand}`);

  const xs = d.choque(3);                       // choque em x = 2 + (3−2)/2 = 2,5
  const dentro = H.resolve(d, xs, 3).candidatos.length;
  check("rampa (t > t*): dois candidatos em cima do choque", dentro === 2, `candidatos = ${dentro}`);
  const empate = Math.abs(H.resolve(d, xs, 3).folga);
  check("rampa: no choque os dois custos empatam", empate < 1e-3, `folga = ${empate.toExponential(1)}`);
}

// 4. posição do choque pelo salto de y*, contra a fórmula de Rankine–Hugoniot
for (const [nome, t, esperado] of [["rampa", 3, 2.5], ["rampa", 4, 3], ["degrau", 2, 1], ["degrau", 3, 1.5]]) {
  const p = H.perfil(D[nome], t, -1, 5, 600);
  const ok = p.choques.length === 1 && Math.abs(p.choques[0] - esperado) < 0.02;
  check(`${nome} (t = ${t}): choque em x = ${esperado}`, ok, JSON.stringify(p.choques.map(c => +c.toFixed(3))));
}

// 5. no leque nunca há salto: v é contínua
{
  const p = H.perfil(D.leque, 2.5, -1, 5, 600);
  let salto = 0;
  for (let i = 1; i < p.vs.length; i++) salto = Math.max(salto, Math.abs(p.vs[i] - p.vs[i - 1]));
  check("leque: nenhum choque e v contínua", p.choques.length === 0 && salto < 0.05, `maior salto de v = ${salto.toExponential(1)}`);
}

// 6. y* é não decrescente em x (é isso que proíbe o salto para cima)
for (const nome of ["rampa", "degrau", "leque"]) {
  for (const t of [1, 3]) {
    const p = H.perfil(D[nome], t, -1, 5, 400);
    let pior = 0;
    for (let i = 1; i < p.ys.length; i++) pior = Math.min(pior, p.ys[i] - p.ys[i - 1]);
    check(`${nome} (t = ${t}): y* não decresce`, pior > -1e-9, `menor incremento = ${pior.toExponential(1)}`);
  }
}

// 7. condição de Lax: no choque, v salta para baixo
for (const [nome, t] of [["rampa", 3], ["degrau", 2]]) {
  const p = H.perfil(D[nome], t, -1, 5, 600);
  let ok = true;
  for (let i = 1; i < p.vs.length; i++) if (p.vs[i] - p.vs[i - 1] > 0.05) ok = false;
  check(`${nome} (t = ${t}): v só salta para baixo (Lax)`, ok);
}

// 8. a velocidade do choque é a média (Rankine–Hugoniot para F = u²/2)
{
  const d = D.rampa, t1 = 3, t2 = 3.5;
  const c1 = H.perfil(d, t1, -1, 5, 1200).choques[0], c2 = H.perfil(d, t2, -1, 5, 1200).choques[0];
  const sigma = (c2 - c1) / (t2 - t1);
  check("rampa: velocidade do choque ≈ (1 + 0)/2", Math.abs(sigma - 0.5) < 0.02, `σ = ${sigma.toFixed(3)}`);
}

// 9. u é contínua mesmo onde v salta (o bico de u)
{
  const d = D.rampa, t = 3, xs = d.choque(t), e = 1e-3;
  const salto = Math.abs(H.u(d, xs + e, t) - H.u(d, xs - e, t));
  check("rampa: u é contínua no choque (só ganha um bico)", salto < 1e-2, salto.toExponential(1));
}

console.log(fails ? `\n${fails} falha(s)` : "\ntodos os testes passaram");
process.exit(fails ? 1 : 0);
