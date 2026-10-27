"""Checagens estáticas do site (sem navegador).

Uso:  python3 tests/check_site.py
Confere: arquivos referenciados existem, âncoras do mapa existem, ids usados pelos scripts estão no HTML,
tags HTML balanceadas, e delimitadores de fórmula ($) em número par em cada página.
"""
import json, pathlib, re, subprocess, sys
from html.parser import HTMLParser

root = pathlib.Path(__file__).resolve().parent.parent
fails = 0
def check(name, ok, info=""):
    global fails
    print(("ok   " if ok else "FALHA"), name, info)
    fails += (not ok)

VOID = {"meta", "link", "br", "img", "input", "hr", "source", "area", "base", "col", "embed", "param", "track", "wbr"}

class P(HTMLParser):
    def __init__(self):
        super().__init__(); self.stack = []; self.errors = []; self.ids = set(); self.refs = []; self.pycells = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a: self.ids.add(a["id"])
        for k in ("src", "href"):
            if k in a: self.refs.append(a[k])
        if "data-starter" in a: self.pycells.append(a["data-starter"])
        if "data-solution" in a: self.pycells.append(a["data-solution"])
        if tag not in VOID: self.stack.append(tag)
    def handle_endtag(self, tag):
        if tag in VOID: return
        if not self.stack or self.stack[-1] != tag:
            self.errors.append(f"</{tag}> inesperado (aberta: {self.stack[-1] if self.stack else None}) em {self.getpos()}")
            if tag in self.stack:
                while self.stack and self.stack.pop() != tag: pass
        else:
            self.stack.pop()

pages = sorted(root.glob("*.html")) + sorted((root / "paginas").glob("*.html"))
parsed = {}
for p in pages:
    html = p.read_text(encoding="utf-8")
    ps = P(); ps.feed(html); parsed[p] = ps
    rel = p.relative_to(root)
    check(f"{rel}: tags balanceadas", not ps.errors and not ps.stack, "; ".join(ps.errors[:2]) or (f"abertas: {ps.stack}" if ps.stack else ""))
    # fórmulas: remove blocos $$...$$ e confere se sobram $ em número par (ignora <code>/<script>)
    body = re.sub(r"<(script|style)\b.*?</\1>", "", html, flags=re.S)
    body = re.sub(r"<code>.*?</code>", "", body, flags=re.S)
    n = len(re.findall(r"(?<!\\)\$\$", body)); body2 = re.sub(r"(?<!\\)\$\$", "", body)
    m = len(re.findall(r"(?<!\\)\$", body2))
    check(f"{rel}: delimitadores $$ e $ pareados", n % 2 == 0 and m % 2 == 0, f"($$:{n}, $:{m})")
    for ref in ps.refs:
        if re.match(r"(https?:|mailto:|#|data:)", ref): continue
        path = (p.parent / ref.split("#")[0]).resolve()
        check(f"{rel}: referência {ref}", path.exists())
        if "#" in ref and ref.endswith(tuple("abcdefghijklmnopqrstuvwxyz0123456789-")) and ref.split("#")[0].endswith(".html"):
            tgt = parsed.get(path) or (lambda q: (q.feed(path.read_text(encoding="utf-8")), q)[1])(P())
            check(f"{rel}: âncora {ref}", ref.split('#')[1] in tgt.ids)
    for c in ps.pycells:
        check(f"{rel}: célula Python {c}", (p.parent / c).resolve().exists())

# ids exigidos pelos scripts
need = {
    "paginas/burgers.html": ["demo-burgers", "b-ic", "b-t", "b-tv", "b-play", "b-readout", "b-prof", "b-xt", "tema", "toc"],
    "paginas/leis-conservacao.html": ["tema", "toc"],
    "paginas/solucao-fraca.html": ["tema", "toc"],
    "paginas/difusao-grafos.html": ["tema", "toc"],
    "paginas/autovalores-redes.html": ["demo-grafo", "g-eps", "g-epsv", "g-t", "g-tv", "g-play", "g-readout", "g-grafo-canvas", "g-curvas-canvas", "tema", "toc"],
    "paginas/calor-anel.html": ["demo-anel", "a-N", "a-Nv", "a-t", "a-tv", "a-play", "a-readout", "a-anel-canvas", "a-perfil-canvas", "tema", "toc"],
    "paginas/cfl.html": ["cfl-canvas", "cfl-lam", "cfl-lamv", "cfl-read", "tema", "toc"],
    "paginas/upwind.html": ["tema", "toc"],
    "index.html": ["mapa", "chips", "info", "trail-list", "tema"],
}
for f, ids in need.items():
    miss = [i for i in ids if i not in parsed[root / f].ids]
    check(f"{f}: ids exigidos pelos scripts", not miss, f"faltam {miss}" if miss else "")

# links do mapa
out = subprocess.run(["node", "-e", "const M=require('./assets/mapa.js');console.log(JSON.stringify(M.NODES.map(n=>n.href).filter(Boolean)))"],
                     cwd=root, capture_output=True, text=True).stdout
for href in json.loads(out):
    path = root / href.split("#")[0]
    ok = path.exists() and (("#" not in href) or href.split("#")[1] in parsed[path].ids)
    check(f"mapa: link {href}", ok)

print("\nfalhas:", fails)
sys.exit(1 if fails else 0)
