# -*- coding: utf-8 -*-
"""O esqueleto comum das páginas: cabeçalho, barra de tema, índice lateral, rodapé de navegação.

Cada página tem um gerador `gen/pXX.py` que chama `page(...)` com o corpo. Rodar:

    cd gen && python3 pBS.py        # escreve ../paginas/black-scholes.html

Esse gerador morava num diretório temporário e se perdeu quando o ambiente reiniciou; agora
mora aqui, junto com o resto, que é o lugar durável.

ATENÇÃO — páginas editadas à mão, que NÃO podem ser regeradas (perderiam as edições):
burgers, dft, solucao-fraca, leis-conservacao, convolucao, difusao-grafos, upwind,
caracteristicas-1a-ordem. Para essas, edite o HTML diretamente.

A armadilha do "menor que": no corpo, `<` seguido de letra é tratado como abertura de tag.
Então `$a<b$` vira `$a` mais uma tag `<b>` e some da tela. Escreva `&lt;` à mão em
matemática: `$a &lt; b$`. O escape automático abaixo só cobre `<` seguido de não-letra
(`$x<0$`, que é o caso comum).
"""
import pathlib
import re

RAIZ = pathlib.Path(__file__).resolve().parent.parent
SUFIXO_TITULO = "Método das características"

# `<` que NÃO abre uma tag (não vem seguido de letra, `/` ou `!`) vira &lt;
_SOLTO = re.compile(r"<(?![/!]?[a-zA-Z])")


def _escapa(corpo: str) -> str:
    return _SOLTO.sub("&lt;", corpo)


def li(rotulo: str, href):
    """Um item de navegação. href None vira '(em breve)', sem link."""
    if href is None:
        return f'<li class="soon">{rotulo} (em breve)</li>'
    return f'<li><a href="{href}">{rotulo}</a></li>'


def _bloco(titulo: str, itens) -> str:
    linhas = "\n".join("            " + li(r, h) for r, h in itens)
    return (f"        <div>\n          <h4>{titulo}</h4>\n          <ul>\n"
            f"{linhas}\n          </ul>\n        </div>")


def page(fname, title, h1, lede, meta, body, prev, nxt, scripts=""):
    """Escreve paginas/<fname>. `prev` e `nxt` são listas de (rótulo, href ou None)."""
    html = f"""<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title} — {SUFIXO_TITULO}</title>
  <link rel="stylesheet" href="../assets/style.css">
  <link rel="stylesheet" href="../vendor/katex/katex.min.css">
  <script src="../assets/site.js"></script>
  <script defer src="../vendor/katex/katex.min.js"></script>
  <script defer src="../vendor/katex/auto-render.min.js"></script>
</head>
<body>
  <header class="topbar">
    <a href="../index.html">← Mapa de conceitos</a>
    <span class="spacer"></span>
    <button id="tema" type="button">Tema escuro</button>
  </header>

  <div class="layout">
    <nav class="toc" id="toc" aria-label="Nesta página"></nav>
    <main>
      <header>
        <h1>{h1}</h1>
        <p class="lede">{lede}</p>
        <p class="meta">{meta}</p>
      </header>

{_escapa(body)}

      <nav class="nextprev" aria-label="Navegação">
{_bloco("Ajuda ler antes", prev)}
{_bloco("Para onde ir depois", nxt)}
      </nav>
    </main>
  </div>
{scripts}
</body>
</html>
"""
    destino = RAIZ / "paginas" / fname
    destino.write_text(html, encoding="utf-8")
    print(f"escrito: {destino.relative_to(RAIZ)}  ({len(html)} caracteres)")
