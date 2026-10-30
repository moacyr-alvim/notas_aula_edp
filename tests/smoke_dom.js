// Teste de fumaça com um DOM simulado (sem navegador): executa os scripts de tela e o executor de Python
// com Worker/fetch/canvas falsos e confere que nada lança erro e que o fluxo básico funciona.
// Rodar:  node tests/smoke_dom.js
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.resolve(__dirname, "..");
let fails = 0;
const check = (n, ok, i) => { console.log(ok ? "ok   " : "FALHA", n, i || ""); if (!ok) fails++; };

/* ---------- DOM mínimo ---------- */
class El {
  constructor(tag) {
    this.tagName = tag; this.children = []; this.dataset = {}; this.style = {}; this.listeners = {}; this.attrs = {};
    this._text = ""; this.className = ""; this.value = ""; this.disabled = false; this.open = false; this.parent = null;
    this.classList = { add: (c) => { this.className += " " + c; }, remove: () => {}, contains: () => false };
    this.clientWidth = 600; this.clientHeight = 280; this.width = 0; this.height = 0; this.scrollTop = 0; this.scrollHeight = 100;
  }
  set textContent(v) { this._text = String(v); if (v === "") this.children = []; }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(""); }
  set innerHTML(v) { this._html = v; this.children = []; }
  get innerHTML() { return this._html || ""; }
  appendChild(c) { c.parent = this; this.children.push(c); return c; }
  setAttribute(k, v) { this.attrs[k] = v; }
  getAttribute(k) { return this.attrs[k]; }
  addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }
  fire(t, ev) { (this.listeners[t] || []).forEach((f) => f(ev || { key: "", preventDefault() {} })); }
  click() { this.fire("click"); }
  querySelectorAll() { return []; }
  closest() { return null; }
  remove() {}
  select() {} focus() {}
  getContext() { return ctx; }
  find(pred, out = []) { if (pred(this)) out.push(this); this.children.forEach((c) => c.find(pred, out)); return out; }
}
const calls = {};
const ctx = new Proxy({}, { get: (t, k) => (k === "measureText" ? () => ({ width: 10 }) : (...a) => { calls[k] = (calls[k] || 0) + 1; }), set: () => true });

function makeEnv(ids, pycells) {
  const byId = {}; ids.forEach((i) => (byId[i] = new El(["b-prof", "b-xt", "l-flux", "l-prof", "l-xt"].includes(i) || i.endsWith("canvas") ? "canvas" : "div")));
  const doc = {
    readyState: "complete", currentScript: { src: "http://x/assets/pyrunner.js" }, body: new El("body"), documentElement: new El("html"),
    getElementById: (i) => byId[i] || null, querySelectorAll: (s) => (s === ".pycell" ? pycells : []),
    createElement: (t) => new El(t), addEventListener() {}, dispatchEvent() {}, execCommand() {},
  };
  const posted = [];
  class FakeWorker {
    constructor(url) { this.url = url; FakeWorker.last = this; setTimeout(() => this.onmessage({ data: { type: "status", text: "Carregando numpy…" } }), 0); setTimeout(() => this.onmessage({ data: { type: "ready" } }), 5); }
    postMessage(m) {
      posted.push(m);
      setTimeout(() => {
        if (m.code.includes("boom")) this.onmessage({ data: { type: "error", id: m.id, text: "Traceback...\nNameError" } });
        else { this.onmessage({ data: { type: "stdout", id: m.id, text: "olá" } }); this.onmessage({ data: { type: "done", id: m.id, figs: ["QUJD"], ms: 1234 } }); }
      }, 2);
    }
    terminate() { FakeWorker.terminated = true; }
  }
  const files = { "../py/a.py": "print('oi')\n", "../py/b.py": "boom()\n" };
  const win = {
    BurgersCore: null, devicePixelRatio: 1, innerHeight: 800, addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }),
    requestAnimationFrame: (f) => setTimeout(() => f(Date.now()), 0), localStorage: { getItem() { return null; }, setItem() {} },
  };
  const sandbox = {
    window: win, document: doc, Worker: FakeWorker, URL: Object.assign(URL, { createObjectURL: () => "blob:x", revokeObjectURL() {} }), Blob: class {},
    fetch: (u) => Promise.resolve({ ok: u in files, status: u in files ? 200 : 404, text: () => Promise.resolve(files[u]) }),
    getComputedStyle: () => ({ getPropertyValue: (n) => "#123456", fontFamily: "sans-serif" }),
    requestAnimationFrame: win.requestAnimationFrame, setTimeout, clearTimeout, performance, console, navigator: {},
    Event: class {}, Math, Float64Array, Array, Object, String, JSON, Date, isFinite, parseFloat, Infinity,
  };
  sandbox.self = sandbox; win.window = win; Object.assign(win, sandbox, { window: win }); sandbox.window = win;
  return { sandbox: vm.createContext(sandbox), doc, byId, FakeWorker, posted, win };
}
const run = (env, file) => vm.runInContext(fs.readFileSync(path.join(root, "assets", file), "utf8"), env.sandbox, { filename: file });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  /* ---- Burgers ---- */
  {
    const env = makeEnv(["demo-burgers", "b-ic", "b-t", "b-tv", "b-play", "b-readout", "b-prof", "b-xt"], []);
    run(env, "burgers-core.js"); env.sandbox.window.BurgersCore = env.sandbox.BurgersCore || vm.runInContext("BurgersCore", env.sandbox);
    let err = null;
    try { run(env, "burgers-demo.js"); await wait(30); } catch (e) { err = e; }
    check("burgers-demo: carrega e desenha sem erro", !err, err && err.stack.split("\n")[0]);
    check("burgers-demo: leitura numérica preenchida", env.byId["b-readout"].innerHTML.includes("t* (quebra)"), env.byId["b-readout"].innerHTML.slice(0, 80));
    check("burgers-demo: desenhou nos dois canvas", (calls.stroke || 0) > 50);
    // mudar o tempo e a condição inicial
    env.byId["b-t"].value = "3"; env.byId["b-t"].fire("input"); await wait(30);
    check("burgers-demo: t=3 na rampa mostra choque", env.byId["b-readout"].innerHTML.includes("choque em x"), env.byId["b-readout"].innerHTML.replace(/<[^>]+>/g, "").slice(0, 120));
    env.byId["b-ic"].value = "rarefacao"; env.byId["b-ic"].fire("change"); await wait(30);
    check("burgers-demo: rarefação não mostra choque", !env.byId["b-readout"].innerHTML.includes("choque em x"));
  }
  /* ---- CFL ---- */
  {
    const env = makeEnv(["cfl-canvas", "cfl-lam", "cfl-lamv", "cfl-read"], []);
    env.byId["cfl-lam"].value = "0.5";
    let err = null; try { run(env, "cfl-demo.js"); } catch (e) { err = e; }
    check("cfl-demo: desenha sem erro", !err, err && err.stack.split("\n")[0]);
    check("cfl-demo: λ=0,5 → CFL vale", env.byId["cfl-read"].innerHTML.includes("a condição CFL vale"));
    env.byId["cfl-lam"].value = "1.2"; env.byId["cfl-lam"].fire("input");
    check("cfl-demo: λ=1,2 → CFL violada", env.byId["cfl-read"].innerHTML.includes("CFL violada"));
  }
  /* ---- leis de conservação ---- */
  {
    const env = makeEnv(["demo-lei", "l-fluxo", "l-uL", "l-uR", "l-uLv", "l-uRv", "l-t", "l-tv", "l-play", "l-alt", "l-readout", "l-flux", "l-prof", "l-xt"], []);
    run(env, "lei-core.js"); env.sandbox.window.LeiCore = env.sandbox.LeiCore || vm.runInContext("LeiCore", env.sandbox);
    let err = null; try { run(env, "lei-demo.js"); await wait(30); } catch (e) { err = e; }
    check("lei-demo: carrega e desenha sem erro", !err, err && err.stack.split("\n")[0]);
    const rd = () => env.byId["l-readout"].innerHTML.replace(/<[^>]+>/g, "");
    check("lei-demo: Burgers 1→0 é choque admissível", rd().includes("Choque admissível"), rd().slice(0, 90));
    env.byId["l-uL"].value = "0"; env.byId["l-uR"].value = "1"; env.byId["l-uL"].fire("input"); await wait(30);
    check("lei-demo: Burgers 0→1 é leque (Lax violada)", rd().includes("leque de rarefação") && rd().includes("viola Lax"));
    check("lei-demo: caixa do salto não admissível liberada no leque", env.byId["l-alt"].disabled === false);
    env.byId["l-alt"].checked = true; env.byId["l-alt"].fire("change"); await wait(30);
    check("lei-demo: desenha o salto não admissível sem erro", rd().includes("leque"));
    env.byId["l-fluxo"].value = "transito"; env.byId["l-fluxo"].fire("change"); await wait(30);
    check("lei-demo: trânsito traz uL=0,5 e uR=0,8 e σ = −0,30", env.byId["l-uL"].value === 0.5 && rd().includes("σ (corda de F) = −0,30"), rd().slice(0, 90));
    env.byId["l-t"].value = "3"; env.byId["l-t"].fire("input"); await wait(30);
    check("lei-demo: muda t sem erro", rd().includes("t = 3,00"));
    env.byId["l-fluxo"].value = "transporte"; env.byId["l-fluxo"].fire("change"); await wait(30);
    check("lei-demo: transporte é contato", rd().includes("só é transportado"));
  }
  /* ---- calor em grafos: dois blocos ---- */
  {
    const env = makeEnv(["demo-grafo", "g-eps", "g-epsv", "g-t", "g-tv", "g-play", "g-readout", "g-grafo-canvas", "g-curvas-canvas"], []);
    run(env, "grafo-core.js"); env.sandbox.window.GrafoCore = env.sandbox.GrafoCore || vm.runInContext("GrafoCore", env.sandbox);
    let err = null; try { run(env, "grafo-demo.js"); await wait(30); } catch (e) { err = e; }
    check("grafo-demo: carrega e desenha sem erro", !err, err && err.stack.split("\n")[0]);
    const rd = () => env.byId["g-readout"].innerHTML.replace(/<[^>]+>/g, "");
    check("grafo-demo: leitura traz λ₂ e o tempo 1/(cλ₂)", rd().includes("λ₂ =") && rd().includes("1/(cλ₂)"), rd().slice(0, 90));
    const l2a = parseFloat(rd().match(/λ₂ = (\d+,\d+)/)[1].replace(",", "."));
    env.byId["g-eps"].value = "-2.5"; env.byId["g-eps"].fire("input"); await wait(30);
    const l2b = parseFloat(rd().match(/λ₂ = (\d+,\d+)/)[1].replace(",", "."));
    check("grafo-demo: porta mais estreita → λ₂ menor", l2b < l2a, l2a + " → " + l2b);
    env.byId["g-t"].value = "2"; env.byId["g-t"].fire("input"); await wait(30);
    check("grafo-demo: muda t sem erro", rd().includes("t = 100"), rd().slice(0, 40));
    env.byId["g-play"].click(); env.byId["g-play"].click();
    check("grafo-demo: botão animar alterna", env.byId["g-play"].textContent.includes("Animar"));
  }
  /* ---- calor: grafo em anel e limite contínuo ---- */
  {
    const env = makeEnv(["demo-anel", "a-N", "a-Nv", "a-t", "a-tv", "a-play", "a-readout", "a-anel-canvas", "a-perfil-canvas"], []);
    run(env, "grafo-core.js"); env.sandbox.window.GrafoCore = env.sandbox.GrafoCore || vm.runInContext("GrafoCore", env.sandbox);
    let err = null; try { run(env, "anel-demo.js"); await wait(30); } catch (e) { err = e; }
    check("anel-demo (grafo em anel): carrega e desenha sem erro", !err, err && err.stack.split("\n")[0]);
    const rd = () => env.byId["a-readout"].innerHTML.replace(/<[^>]+>/g, "");
    const errOf = () => parseFloat(rd().match(/contínuo: ([\d,e−-]+)/)[1].replace(",", ".").replace("−", "-"));
    check("anel-demo (grafo em anel): N = 8 na leitura", rd().includes("N = 8"), rd().slice(0, 80));
    const e8 = errOf();
    env.byId["a-N"].value = "64"; env.byId["a-N"].fire("input"); await wait(30);
    check("anel-demo (grafo em anel): mais vértices → mais perto do contínuo", errOf() < e8 / 10, e8 + " → " + errOf());
  }
  /* ---- onda: d'Alembert ---- */
  {
    const env = makeEnv(["demo-onda", "w-preset", "w-c", "w-cv", "w-t", "w-tv", "w-x", "w-xv", "w-play", "w-readout", "w-diag-canvas", "w-perfil-canvas"], []);
    run(env, "onda-core.js"); env.sandbox.window.OndaCore = env.sandbox.OndaCore || vm.runInContext("OndaCore", env.sandbox);
    env.byId["w-preset"].value = "parado"; env.byId["w-c"].value = "1"; env.byId["w-x"].value = "0.6";
    let err = null; try { run(env, "onda-demo.js"); await wait(30); } catch (e) { err = e; }
    check("onda-demo: carrega e desenha sem erro", !err, err && err.stack.split("\n")[0]);
    const rd = () => env.byId["w-readout"].innerHTML.replace(/<[^>]+>/g, "");
    check("onda-demo: leitura traz o domínio de dependência [−0,60; 1,80] em t = 1,2", rd().includes("−0,60") && rd().includes("1,80"), rd().slice(0, 120));
    env.byId["w-preset"].value = "martelada"; env.byId["w-preset"].fire("input"); env.byId["w-x"].value = "0"; env.byId["w-x"].fire("input"); await wait(30);
    check("onda-demo: martelada em x = 0 e t = 1,2 dá u = 1,000 (patamar 1/c)", rd().includes("u(P) = 1,000"), rd().slice(0, 120));
  }
  /* ---- transporte ---- */
  {
    const env = makeEnv(["demo-transp", "tr-preset", "tr-modo", "tr-c", "tr-cv", "tr-t", "tr-tv", "tr-x", "tr-xv", "tr-play", "tr-readout", "tr-diag-canvas", "tr-perfil-canvas"], []);
    run(env, "transp-core.js"); env.sandbox.window.TranspCore = env.sandbox.TranspCore || vm.runInContext("TranspCore", env.sandbox);
    env.byId["tr-preset"].value = "pulso"; env.byId["tr-modo"].value = "reta"; env.byId["tr-c"].value = "1"; env.byId["tr-x"].value = "1.5";
    let err = null; try { run(env, "transp-demo.js"); await wait(30); } catch (e) { err = e; }
    check("transp-demo: carrega e desenha sem erro", !err, err && err.stack.split("\n")[0]);
    const rd = () => env.byId["tr-readout"].innerHTML.replace(/<[^>]+>/g, "");
    check("transp-demo: pé da característica x − ct = 0,00 em P = (1,5; 1,5), u = 1,000", rd().includes("0,00") && rd().includes("u(P) = 1,000"), rd().slice(0, 140));
    env.byId["tr-modo"].value = "semi"; env.byId["tr-modo"].fire("input"); env.byId["tr-x"].value = "0.5"; env.byId["tr-x"].fire("input"); await wait(30);
    check("transp-demo: semirreta, x < ct vem do contorno", rd().includes("contorno"), rd().slice(0, 140));
  }
  /* ---- separação de variáveis ---- */
  {
    const env = makeEnv(["demo-sep", "sv-preset", "sv-n", "sv-nv", "sv-t", "sv-tv", "sv-play", "sv-readout", "sv-u-canvas", "sv-a-canvas"], []);
    run(env, "sep-core.js"); env.sandbox.window.SepCore = env.sandbox.SepCore || vm.runInContext("SepCore", env.sandbox);
    env.byId["sv-preset"].value = "parabola"; env.byId["sv-n"].value = "16";
    let err = null; try { run(env, "sep-demo.js"); await wait(30); } catch (e) { err = e; }
    check("sep-demo: carrega e desenha sem erro", !err, err && err.stack.split("\n")[0]);
    const rd = () => env.byId["sv-readout"].innerHTML.replace(/<[^>]+>/g, "");
    check("sep-demo: parábola em t = 0,05: u(π/2) ≈ 0,9 e energia restante < 100%", /u\(π\/2, t\) = 0,9/.test(rd()) && /energia restante: \d+,\d%/.test(rd()), rd().slice(0, 140));
    env.byId["sv-preset"].value = "caixa"; env.byId["sv-preset"].fire("input"); await wait(30);
    check("sep-demo: troca de dado inicial redesenha", rd().length > 20, rd().slice(0, 100));
  }
  /* ---- série de Fourier ---- */
  {
    const env = makeEnv(["demo-sf", "sf-dado", "sf-n", "sf-nv", "sf-play", "sf-readout", "sf-perfil", "sf-espectro"], []);
    run(env, "sf-core.js"); env.sandbox.window.SFCore = env.sandbox.SFCore || vm.runInContext("SFCore", env.sandbox);
    env.byId["sf-n"].value = "7";
    let err = null; try { run(env, "sf-demo.js"); await wait(30); } catch (e) { err = e; }
    check("sf-demo: carrega e desenha sem erro", !err, err && err.stack.split("\n")[0]);
    const rd = () => env.byId["sf-readout"].innerHTML.replace(/<[^>]+>/g, "");
    check("sf-demo: quadrada com N = 7 captura mais de 95% da energia e avisa Gibbs", /9\d,\d\d%/.test(rd()) && rd().includes("Gibbs"), rd().slice(0, 160));
    env.byId["sf-dado"].value = "triangulo"; env.byId["sf-dado"].fire("input"); await wait(30);
    check("sf-demo: no triângulo mostra erro máximo e decaimento 1/n²", rd().includes("1/n²") && rd().includes("erro máximo"), rd().slice(0, 160));
  }
  /* ---- Hopf–Lax ---- */
  {
    const env = makeEnv(["demo-hl", "hl-dado", "hl-t", "hl-tv", "hl-x", "hl-xv", "hl-play", "hl-readout", "hl-g", "hl-perfil"], []);
    run(env, "hl-core.js"); env.sandbox.window.HLCore = env.sandbox.HLCore || vm.runInContext("HLCore", env.sandbox);
    env.byId["hl-t"].value = "3"; env.byId["hl-x"].value = "1.6";
    let err = null; try { run(env, "hl-demo.js"); await wait(30); } catch (e) { err = e; }
    check("hl-demo: carrega e desenha sem erro", !err, err && err.stack.split("\n")[0]);
    const rd = () => env.byId["hl-readout"].innerHTML.replace(/<[^>]+>/g, "");
    check("hl-demo: rampa em t = 3, x = 1,6: choque em x ≈ 2,50", rd().includes("choque em x ≈ 2,50"), rd().slice(0, 200));
    env.byId["hl-x"].value = "2.5"; env.byId["hl-x"].fire("input"); await wait(30);
    check("hl-demo: em cima do choque, avisa que os dois mínimos empatam", rd().includes("empatados"), rd().slice(0, 200));
    env.byId["hl-dado"].value = "leque"; env.byId["hl-dado"].fire("input"); await wait(30);
    check("hl-demo: no leque não há choque", rd().includes("sem choque"), rd().slice(0, 200));
  }
  /* ---- Monge–Ampère ---- */
  {
    const env = makeEnv(["demo-ma", "m-curva", "m-s1", "m-s1v", "m-s2", "m-s2v", "m-readout", "m-canvas"], []);
    run(env, "ma-core.js"); env.sandbox.window.MACore = env.sandbox.MACore || vm.runInContext("MACore", env.sandbox);
    env.byId["m-curva"].value = "parabola";
    let err = null; try { run(env, "ma-demo.js"); await wait(30); } catch (e) { err = e; }
    check("ma-demo: carrega e desenha sem erro", !err, err && err.stack.split("\n")[0]);
    const rd = () => env.byId["m-readout"].innerHTML.replace(/<[^>]+>/g, "");
    check("ma-demo: parábola com P1=(−1,1), P2=(1,1): u = −0,667 e fórmula fechada igual", rd().includes("u(P) = −área/2 = −0,667") && rd().includes("fórmula fechada: −0,667"), rd().slice(0, 200));
    env.byId["m-curva"].value = "circulo"; env.byId["m-curva"].fire("change"); await wait(30);
    env.byId["m-s2"].value = String(parseFloat(env.byId["m-s2"].max)); env.byId["m-s2"].fire("input"); await wait(30);
    check("ma-demo: círculo com P2 no extremo do controle (diâmetro) avisa ponto não regular", rd().includes("Ponto não regular"), rd().slice(0, 200));
    env.byId["m-curva"].value = "elipse"; env.byId["m-curva"].fire("change"); await wait(30);
    check("ma-demo: elipse tem fórmula fechada na leitura", rd().includes("fórmula fechada"), rd().slice(0, 200));
  }
  /* ---- convolução: zeros x periódico ---- */
  {
    const env = makeEnv(["demo-conv", "c-sinal", "c-nucleo", "c-modo", "c-j", "c-jv", "c-play", "c-readout", "c-conv-canvas"], []);
    run(env, "conv-core.js"); env.sandbox.window.ConvCore = env.sandbox.ConvCore || vm.runInContext("ConvCore", env.sandbox);
    let err = null; try { run(env, "conv-demo.js"); await wait(30); } catch (e) { err = e; }
    check("conv-demo: carrega e desenha sem erro", !err, err && err.stack.split("\n")[0]);
    const rd = () => env.byId["c-readout"].innerHTML.replace(/<[^>]+>/g, "");
    check("conv-demo: modo zeros tem 10 saídas (N+M−1)", rd().includes("10") && rd().includes("N + M − 1"), rd().slice(0, 100));
    env.byId["c-modo"].value = "periodico"; env.byId["c-modo"].fire("change"); await wait(30);
    check("conv-demo: modo periódico tem 8 saídas (N)", rd().includes("8") && rd().includes("dão a volta"), rd().slice(0, 100));
    check("conv-demo: o controle j fica limitado a N−1", String(env.byId["c-j"].max) === "7", String(env.byId["c-j"].max));
    env.byId["c-j"].value = "0"; env.byId["c-j"].fire("input"); await wait(30);
    check("conv-demo: z0 circular da rampa com média de 3 mistura o fim e o começo ((1+8+7)/3)", rd().includes("z0 = Σ") && rd().includes("5,33"), rd().slice(0, 60));
  }
  /* ---- mapa ---- */
  {
    const env = makeEnv(["mapa", "chips", "info", "trail-list"], []);
    let err = null; try { run(env, "mapa.js"); vm.runInContext('Mapa.mount({map:"mapa",chips:"chips",info:"info",list:"trail-list"})', env.sandbox); } catch (e) { err = e; }
    check("mapa: monta sem erro", !err, err && err.stack.split("\n")[0]);
    check("mapa: SVG gerado com os 29 nós", (env.byId["mapa"].innerHTML.match(/class="node /g) || []).length === 29);
    check("mapa: botões de trilha criados", env.byId["chips"].children.length === 8);
  }
  /* ---- executor de Python ---- */
  {
    const mk = (starter, sol) => { const c = new El("div"); c.dataset = { starter, title: "t", ...(sol ? { solution: sol } : {}) }; return c; };
    const c1 = mk("../py/a.py", "../py/a.py"), c2 = mk("../py/b.py");
    const env = makeEnv([], [c1, c2]);
    let err = null; try { run(env, "pyrunner.js"); await wait(20); } catch (e) { err = e; }
    check("pyrunner: inicializa as células", !err, err && err.stack.split("\n")[0]);
    const ta = (c) => c.find((e) => e.tagName === "textarea")[0];
    check("pyrunner: carrega o código inicial por fetch", ta(c1).value === "print('oi')\n", JSON.stringify(ta(c1).value));
    const btn = (c, label) => c.find((e) => e.tagName === "button" && e.textContent === label)[0];
    btn(c1, "Rodar").click(); await wait(40);
    const out = (c) => c.find((e) => e.className === "out")[0];
    check("pyrunner: mostra saída de texto", out(c1).textContent.includes("olá"));
    check("pyrunner: mostra a figura", out(c1).find((e) => e.tagName === "img")[0].src.startsWith("data:image/png;base64,QUJD"));
    check("pyrunner: manda código ao worker", env.posted.length === 1 && env.posted[0].code.includes("print"));
    // erro
    btn(c2, "Rodar").click(); await wait(40);
    check("pyrunner: mostra erro do Python", out(c2).find((e) => e.className === "err").length === 1);
    // parar: encerra o worker
    env.FakeWorker.prototype.postMessage = function () {};   // simula um código que nunca termina
    ta(c1).value = "while True: pass"; btn(c1, "Rodar").click();
    await wait(5);
    btn(c1, "Parar").click();
    check("pyrunner: Parar encerra o worker", env.FakeWorker.terminated === true);
    check("pyrunner: Parar avisa na saída", out(c1).textContent.includes("interrompida"));
  }
  console.log(fails ? `\n${fails} falha(s)` : "\ntodos os testes de fumaça passaram");
  process.exit(fails ? 1 : 0);
})();
