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
  const byId = {}; ids.forEach((i) => (byId[i] = new El(i.startsWith("b-prof") || i.endsWith("canvas") || i === "b-xt" ? "canvas" : "div")));
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
  /* ---- mapa ---- */
  {
    const env = makeEnv(["mapa", "chips", "info", "trail-list"], []);
    let err = null; try { run(env, "mapa.js"); vm.runInContext('Mapa.mount({map:"mapa",chips:"chips",info:"info",list:"trail-list"})', env.sandbox); } catch (e) { err = e; }
    check("mapa: monta sem erro", !err, err && err.stack.split("\n")[0]);
    check("mapa: SVG gerado com os 17 nós", (env.byId["mapa"].innerHTML.match(/class="node /g) || []).length === 17);
    check("mapa: botões de trilha criados", env.byId["chips"].children.length === 6);
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
