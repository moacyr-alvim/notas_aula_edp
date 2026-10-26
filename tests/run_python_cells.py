"""Roda todos os arquivos de py/ do jeito que o worker faz (mesmo PRELUDE do pyworker.js).

Uso:  python3 tests/run_python_cells.py
Verifica: cada arquivo executa sem erro, gera figuras PNG válidas e (nas soluções) os números esperados.
"""
import base64, contextlib, io, pathlib, re, sys

import numpy as np

root = pathlib.Path(__file__).resolve().parent.parent
js = (root / "assets" / "pyworker.js").read_text(encoding="utf-8")
prelude = re.search(r"const PRELUDE = `(.*?)`;", js, re.S).group(1)

pre_ns = {}
exec(prelude, pre_ns)                      # igual ao pyodide.runPython(PRELUDE)

fails = 0
def check(name, ok, info=""):
    global fails
    print(("ok   " if ok else "FALHA"), name, info)
    fails += (not ok)

def rodar(nome):
    code = (root / "py" / nome).read_text(encoding="utf-8")
    ns = {"__name__": "__main__"}          # espaço de nomes limpo a cada execução
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        exec(compile(code, "<exec>", "exec"), ns)
    figs = pre_ns["_take_figs"]()
    return buf.getvalue(), figs

def numeros(saida, rotulo):
    m = re.search(rotulo + r".*?max\|?u?\|? = ([-+0-9.eE]+)", saida)
    return float(m.group(1)) if m else None

for nome in sorted(p.name for p in (root / "py").glob("*.py")):
    saida, figs = rodar(nome)
    png_ok = bool(figs) and all(base64.b64decode(f)[:8] == b"\x89PNG\r\n\x1a\n" for f in figs)
    check(f"{nome}: executa e gera figura PNG", png_ok, f"({len(figs)} fig)")
    if nome in ("transporte_solucao.py", "transporte_lambda.py", "cfl_solucao.py"):
        print("     " + saida.strip().replace("\n", "\n     "))

# valores esperados das soluções
s, _ = rodar("transporte_solucao.py")
mx = {k: float(v) for k, v in re.findall(r"(central|esquerda|direita)\s*: min = [-+0-9.eE]+\s+max = ([-+0-9.eE]+)", s)}
check("upwind (esquerda) fica em [0,1]", "esquerda" in mx and mx["esquerda"] <= 1.0 + 1e-9, f"max={mx.get('esquerda')}")
check("central explode (> 1e6)", mx.get("central", 0) > 1e6, f"max={mx.get('central'):.3g}")
check("downwind explode (> 1e6)", mx.get("direita", 0) > 1e6, f"max={mx.get('direita'):.3g}")

s, _ = rodar("cfl_solucao.py")
ok_ = float(re.search(r"satisfeita.*?= ([0-9.eE+-]+)\n", s).group(1))
bad = float(re.search(r"violada.*?= ([0-9.eE+-]+)\n", s).group(1))
check("CFL satisfeita: max|u| ≈ 0,5 (onda se divide em duas)", abs(ok_ - 0.5) < 0.01, f"max={ok_:.3f}")
check("CFL violada: max|u| >> 1", bad > 5, f"max={bad:.3g}")

s, _ = rodar("transporte_lambda.py")
m = {float(a): float(b) for a, b in re.findall(r"lambda = ([0-9.]+)\s.*?max = ([-+0-9.eE]+)", s)}
check("λ=0,5 e λ=1 estáveis (max ≤ 1); λ=1,2 instável", m[0.5] <= 1 + 1e-9 and m[1.0] <= 1 + 1e-9 and m[1.2] > 10, str(m))

# versões com lacunas: devem rodar (sem explodir erro) mesmo incompletas
s, _ = rodar("cfl_lacunas.py")
check("cfl_lacunas roda com o código incompleto", True)

print("\nfalhas:", fails)
sys.exit(1 if fails else 0)
