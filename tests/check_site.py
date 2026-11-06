"""Checagens estáticas do site (sem navegador).

Uso:  python3 tests/check_site.py
Confere: arquivos referenciados existem, âncoras do mapa existem, ids usados pelos scripts estão no HTML,
tags HTML balanceadas, e delimitadores de fórmula ($) em número par em cada página.
"""
import json, pathlib, re, subprocess, sys
from html.parser import HTMLParser

root = pathlib.Path(__file__).resolve().parent.parent

# O KaTeX mora DENTRO do repositório, em vendor/katex/. Antes vinha de um CDN, e a versão
# pedida lá (0.16.11) não era a instalada aqui (0.16.47): conferir fórmula localmente não valia
# como conferência, e foi assim que um apóstrofo sem base (\widehat g\,') passou batido —
# renderizava aqui e falhava no ar. Agora é um arquivo só, o mesmo nos dois lados.
KATEX = "0.16.47"
KATEX_ARQUIVOS = ("katex.min.css", "katex.min.js", "auto-render.min.js")

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
    "paginas/rankine-hugoniot.html": ["tema", "toc"],
    "paginas/hopf-lax.html": ["demo-hl", "hl-dado", "hl-t", "hl-tv", "hl-x", "hl-xv", "hl-play", "hl-readout", "hl-g", "hl-perfil", "tema", "toc"],
    "paginas/euler-lagrange.html": ["tema", "toc"],
    "paginas/acao-discreta.html": ["tema", "toc"],
    "paginas/difusao-grafos.html": ["tema", "toc"],
    "paginas/autovalores-redes.html": ["demo-grafo", "g-eps", "g-epsv", "g-t", "g-tv", "g-play", "g-readout", "g-grafo-canvas", "g-curvas-canvas", "tema", "toc"],
    "paginas/calor-grafo-anel.html": ["demo-anel", "a-N", "a-Nv", "a-t", "a-tv", "a-play", "a-readout", "a-anel-canvas", "a-perfil-canvas", "tema", "toc"],
    "paginas/convolucao.html": ["demo-conv", "c-sinal", "c-nucleo", "c-modo", "c-j", "c-jv", "c-play", "c-readout", "c-conv-canvas", "tema", "toc"],
    "paginas/dft.html": ["tema", "toc"],
    "paginas/calor-fourier.html": ["tema", "toc"],
    "paginas/cfl.html": ["cfl-canvas", "cfl-lam", "cfl-lamv", "cfl-read", "tema", "toc"],
    "paginas/upwind.html": ["tema", "toc"],
    "paginas/caracteristicas-1a-ordem.html": ["tema", "toc"],
    "paginas/modelo-lwr.html": ["tema", "toc"],
    "paginas/monge-ampere.html": ["demo-ma", "m-curva", "m-s1", "m-s1v", "m-s2", "m-s2v", "m-readout", "m-canvas", "tema", "toc"],
    "paginas/caracteristicas-2a-ordem.html": ["tema", "toc"],
    "paginas/classificacao.html": ["tema", "toc"],
    "paginas/hamilton-jacobi.html": ["demo-lei", "l-fluxo", "l-uL", "l-uR", "l-t", "l-play", "l-alt", "l-readout", "l-flux", "l-prof", "l-xt", "tema", "toc"],
    "paginas/calor-circulo.html": ["tema", "toc"],
    "paginas/edps-fourier.html": ["tema", "toc"],
    "paginas/poco-infinito.html": ["demo-qw", "qw-estado", "qw-t", "qw-tv", "qw-play", "qw-espelho", "qw-ressurg", "qw-readout", "qw-dens", "qw-niveis", "tema", "toc"],
    "paginas/principio-maximo.html": ["tema", "toc"],
    "paginas/transformada-fourier.html": ["demo-tf", "tf-forma", "tf-w", "tf-wv", "tf-readout", "tf-f", "tf-k", "tema", "toc"],
    "paginas/eds-fokker-planck.html": ["demo-eds", "eds-ex", "eds-t", "eds-tv", "eds-play", "eds-readout", "eds-paths", "eds-dens", "tema", "toc"],
    "paginas/calor-reta.html": ["demo-cr", "cr-dado", "cr-t", "cr-tv", "cr-circulo", "cr-play", "cr-readout", "cr-u", "cr-k", "tema", "toc"],
    "paginas/feynman-kac.html": ["demo-fk", "fk-premio", "fk-desc", "fk-x", "fk-xv", "fk-t", "fk-tv", "fk-play", "fk-readout", "fk-paths", "fk-valor", "tema", "toc"],
    "paginas/passeio-aleatorio.html": ["demo-fp", "fp-h", "fp-s", "fp-zoom", "fp-t", "fp-tv", "fp-play", "fp-readout", "fp-dist", "fp-traj", "tema", "toc"],
    "paginas/fokker-planck.html": ["demo-fp", "fp-h", "fp-a", "fp-av", "fp-t", "fp-tv", "fp-play", "fp-readout", "fp-dist", "fp-traj", "tema", "toc"],
    "paginas/serie-fourier.html": ["demo-sf", "sf-dado", "sf-n", "sf-nv", "sf-play", "sf-readout", "sf-perfil", "sf-espectro", "tema", "toc"],
    "paginas/separacao-variaveis.html": ["demo-sep", "sv-preset", "sv-n", "sv-nv", "sv-t", "sv-tv", "sv-play", "sv-readout", "sv-u-canvas", "sv-a-canvas", "tema", "toc"],
    "paginas/equacao-transporte.html": ["demo-transp", "tr-preset", "tr-modo", "tr-c", "tr-cv", "tr-t", "tr-tv", "tr-x", "tr-xv", "tr-play", "tr-readout", "tr-diag-canvas", "tr-perfil-canvas", "tema", "toc"],
    "paginas/onda-dalembert.html": ["demo-onda", "w-preset", "w-c", "w-cv", "w-t", "w-tv", "w-x", "w-xv", "w-play", "w-readout", "w-diag-canvas", "w-perfil-canvas", "tema", "toc"],
    "index.html": ["mapa", "chips", "info", "trail-list", "tema"],
}
for f in sorted(root.rglob("*.html")):
    if ".git" in f.parts or "rascunhos" in f.parts: continue
    check(f"{f.relative_to(root)}: começa com <!doctype html> (senão o KaTeX não funciona)", f.read_text(encoding="utf-8").lstrip().lower().startswith("<!doctype html>"))
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

# o cifrão do real abre matemática no KaTeX e engole a frase: não usar "R$", e conferir
# que o número de cifrões é par (um ímpar denuncia um delimitador solto)
for path in sorted(parsed):
    txt = path.read_text(encoding="utf-8")
    corpo = txt[txt.find("<main"):txt.find("</main>")] if "<main" in txt else txt
    moeda = re.search(r"R\$\s*[0-9]", corpo)   # \mathbb R$ seguido de espaço é outra coisa
    check(f"{path.relative_to(root)}: sem cifrão de moeda (usar 'reais')", not moeda, moeda.group(0) if moeda else "")
    check(f"{path.relative_to(root)}: número par de cifrões", corpo.count("$") % 2 == 0, f"{corpo.count('$')} cifrões")

# KaTeX: a cópia no repositório é a versão declarada, tem as fontes que o CSS pede, e
# nenhuma página volta a buscar KaTeX em CDN (senão a versão conferida aqui não é a do ar)
vend = root / "vendor" / "katex"
check("vendor/katex: versão bate com a declarada",
      (vend / "VERSAO.txt").read_text(encoding="utf-8").strip() == KATEX,
      (vend / "VERSAO.txt").read_text(encoding="utf-8").strip())
for nome in KATEX_ARQUIVOS:
    check(f"vendor/katex/{nome} existe", (vend / nome).exists())
css = (vend / "katex.min.css").read_text(encoding="utf-8")
faltam = [f for f in sorted(set(re.findall(r"fonts/[A-Za-z_-]+\.woff2", css))) if not (vend / f).exists()]
check("vendor/katex: todas as fontes woff2 do CSS estão no repositório", not faltam, str(faltam))
for path in sorted(parsed):
    txt = path.read_text(encoding="utf-8")
    pre = "../" if path.parent.name == "paginas" else ""
    usa = [n for n in KATEX_ARQUIVOS if f'"{pre}vendor/katex/{n}"' in txt]
    check(f"{path.relative_to(root)}: usa o KaTeX do repositório", len(usa) == len(KATEX_ARQUIVOS),
          f"só achei {usa}")
    check(f"{path.relative_to(root)}: sem KaTeX de CDN", "jsdelivr" not in txt and "cdnjs" not in txt)

print("\nfalhas:", fails)
sys.exit(1 if fails else 0)
