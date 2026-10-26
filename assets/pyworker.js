/* Web Worker que roda Python (Pyodide) fora da thread da página.
 * Assim, um laço infinito não trava a página: o botão "Parar" simplesmente encerra o worker.
 *
 * Para trocar a versão do Pyodide, altere só a constante abaixo
 * (versões disponíveis: https://pyodide.org/en/stable/project/changelog.html).
 */
const PYODIDE_VERSION = "0.27.7";
const PYODIDE_BASE = "https://cdn.jsdelivr.net/pyodide/v" + PYODIDE_VERSION + "/full/";

importScripts(PYODIDE_BASE + "pyodide.js");

// Preparação do matplotlib: backend sem tela (Agg) e plt.show() devolvendo PNGs para a página.
const PRELUDE = `
import io, base64
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

_figs = []

def _emit_open():
    for n in plt.get_fignums():
        fig = plt.figure(n)
        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=90, bbox_inches="tight", facecolor="white")
        _figs.append(base64.b64encode(buf.getvalue()).decode("ascii"))
    plt.close("all")

def _show(*args, **kwargs):
    _emit_open()

plt.show = _show

def _take_figs():
    _emit_open()
    out = list(_figs)
    _figs.clear()
    return out
`;

let pyodide = null;
let currentId = null;

async function init() {
  postMessage({ type: "status", text: "Baixando o Python (primeira vez leva alguns segundos)…" });
  pyodide = await loadPyodide({ indexURL: PYODIDE_BASE });
  postMessage({ type: "status", text: "Carregando numpy e matplotlib…" });
  await pyodide.loadPackage(["numpy", "matplotlib"]);
  pyodide.runPython(PRELUDE);
  pyodide.setStdout({ batched: (s) => postMessage({ type: "stdout", id: currentId, text: s }) });
  pyodide.setStderr({ batched: (s) => postMessage({ type: "stderr", id: currentId, text: s }) });
  postMessage({ type: "ready" });
}

// Deixa só a parte útil do traceback (a partir do código do aluno).
function cleanTraceback(msg) {
  const i = msg.indexOf('File "<exec>"');
  if (i < 0) return msg.trim();
  // "<exec>" é o seu código; o número depois de "line" é a linha mostrada na margem do editor.
  return ("Traceback (most recent call last):\n  " + msg.slice(i)).trim();
}

const ready = init().catch((e) => {
  postMessage({ type: "fatal", text: "Não foi possível carregar o Python: " + (e && e.message ? e.message : e) });
});

onmessage = async (ev) => {
  const msg = ev.data;
  if (msg.type !== "run") return;
  await ready;
  if (!pyodide) return;
  currentId = msg.id;
  const t0 = performance.now();
  let ns = null;
  try {
    ns = pyodide.runPython("{'__name__': '__main__'}");
    await pyodide.runPythonAsync(msg.code, { globals: ns });
    const figs = pyodide.runPython("_take_figs()").toJs();
    postMessage({ type: "done", id: msg.id, figs: figs, ms: Math.round(performance.now() - t0) });
  } catch (e) {
    try { pyodide.runPython("plt.close('all'); _figs.clear()"); } catch (_) {}
    postMessage({ type: "error", id: msg.id, text: cleanTraceback(String(e && e.message ? e.message : e)) });
  } finally {
    if (ns && ns.destroy) ns.destroy();
  }
};
