/* Renderização de verdade, num navegador, servindo o próprio repositório.
 *
 * Rodar:  node tests/render_navegador.js            (todas as páginas)
 *         node tests/render_navegador.js feynman-kac   (só as que casam com o texto)
 *
 * Precisa de Playwright com Chromium (`npx playwright install chromium`), por isso NÃO roda
 * no GitHub Actions junto com os outros testes — é a conferência que se faz à mão antes de
 * publicar. Vale a pena porque é a única que pega:
 *   - fórmula que o KaTeX não conseguiu renderizar (.katex-error) ou cifrão solto na tela;
 *   - a versão de KaTeX que o navegador de fato carregou (tem que ser a de vendor/katex);
 *   - erro de JavaScript e arquivo faltando (404);
 *   - âncora do índice lateral apontando para um id que não existe;
 *   - e, o mais escorregadio, a página transbordando a largura de um telefone — foi assim que
 *     apareceram um <select> largo demais e uma fórmula em linha gigante dentro de uma frase.
 *
 * Nada aqui desvia requisição nenhuma: o KaTeX carregado é exatamente o que vai para o ar.
 */
const http = require("http"), fs = require("fs"), path = require("path");
const root = path.resolve(__dirname, "..");
const KATEX = "0.16.47";                     /* a mesma constante de tests/check_site.py */
const PORTA = 8099;
const TIPOS = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2",
  ".woff": "font/woff", ".ttf": "font/ttf", ".json": "application/json", ".py": "text/plain",
  ".svg": "image/svg+xml", ".png": "image/png", ".md": "text/plain"
};

let chromium;
try { ({ chromium } = require("playwright")); }
catch (e) {
  console.error("Playwright não encontrado. Instale com:  npm i -D playwright && npx playwright install chromium");
  process.exit(2);
}

let fails = 0;
const check = (n, ok, i) => { console.log(ok ? "ok   " : "FALHA", n, i === undefined ? "" : i); if (!ok) fails++; };

const servidor = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split("?")[0]);
  const f = path.join(root, u === "/" ? "index.html" : u);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end("não achei"); }
  res.writeHead(200, { "content-type": TIPOS[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});

/* o que se mede dentro da página */
function medir() {
  const main = document.querySelector("main") || document.body;
  const toc = [...document.querySelectorAll("#toc a")].map((a) => a.getAttribute("href"));
  return {
    katexErro: document.querySelectorAll(".katex-error").length,
    formulas: document.querySelectorAll(".katex").length,
    cifroes: (main.innerText.match(/\$/g) || []).length,
    tocRuins: toc.filter((h) => h && h.startsWith("#") && !document.getElementById(h.slice(1))),
    versao: window.katex && window.katex.version,
    larguraRolagem: document.documentElement.scrollWidth,
    janela: window.innerWidth
  };
}

(async () => {
  const filtro = process.argv[2];
  let paginas = ["index.html", ...fs.readdirSync(path.join(root, "paginas")).sort().map((f) => "paginas/" + f).filter((f) => f.endsWith(".html"))];
  if (filtro) paginas = paginas.filter((p) => p.includes(filtro));
  if (!paginas.length) { console.error("nenhuma página casa com", filtro); process.exit(2); }

  await new Promise((r) => servidor.listen(PORTA, r));
  const nav = await chromium.launch();
  const pedidos = [];

  for (const pag of paginas) {
    for (const vista of [{ nome: "1100px", w: 1100, h: 1000 }, { nome: "400px", w: 400, h: 800 }]) {
      const pg = await nav.newPage({ viewport: { width: vista.w, height: vista.h } });
      const erros = [], faltas = [];
      pg.on("pageerror", (e) => erros.push(String(e).slice(0, 140)));
      pg.on("console", (m) => { if (m.type() === "error") erros.push("console: " + m.text().slice(0, 140)); });
      pg.on("request", (r) => pedidos.push(r.url()));
      pg.on("response", (r) => { if (r.status() >= 400) faltas.push(r.status() + " " + r.url().replace(`http://localhost:${PORTA}`, "")); });
      await pg.goto(`http://localhost:${PORTA}/` + pag, { waitUntil: "networkidle" });
      await pg.waitForTimeout(250);
      const m = await pg.evaluate(medir);
      const rotulo = `${pag} @ ${vista.nome}`;
      /* index.html é o mapa de conceitos e não tem fórmula nenhuma — zero ali é o certo */
      const precisaFormula = pag !== "index.html";
      const ok = m.katexErro === 0 && m.cifroes === 0 && m.tocRuins.length === 0
                 && erros.length === 0 && faltas.length === 0
                 && (!precisaFormula || (m.formulas > 0 && m.versao === KATEX))
                 && m.larguraRolagem <= m.janela + 1;
      check(rotulo, ok,
        `fórmulas=${String(m.formulas).padStart(3)} erroKatex=${m.katexErro} cifrões=${m.cifroes} `
        + `largura=${m.larguraRolagem}/${m.janela} katex=${m.versao || "-"}`
        + (m.tocRuins.length ? ` ÍNDICE:${m.tocRuins}` : "")
        + (erros.length ? ` JS:${erros[0]}` : "")
        + (faltas.length ? ` HTTP:${faltas.join(" ")}` : ""));
      await pg.close();
    }
  }
  await nav.close(); servidor.close();

  /* Pyodide vem do CDN de propósito (são dezenas de megabytes); fora ele, nada mais deve sair
     daqui — em especial o KaTeX, que agora mora em vendor/katex/. */
  const fora = [...new Set(pedidos.filter((u) => !u.startsWith(`http://localhost:${PORTA}`)
                                              && !/cdn\.jsdelivr\.net\/pyodide\//.test(u)))];
  check("só o Pyodide vem de fora (o KaTeX é do repositório)", fora.length === 0, fora.slice(0, 3).join(" "));

  console.log("\nfalhas:", fails);
  process.exit(fails ? 1 : 0);
})();
