# Método das características — site

Protótipo do "livro como site": um mapa de conceitos na página inicial, páginas curtas com demos
interativas e células de Python que rodam **no navegador** (Pyodide), sem servidor.

## Ver no seu computador

O Python no navegador usa um Web Worker, que não funciona abrindo o arquivo direto do disco.
Sirva a pasta com um servidor local:

```bash
cd site
python3 -m http.server 8000
# abra http://localhost:8000
```

## Publicar no GitHub Pages

1. Crie um repositório e envie esta pasta (o conteúdo de `site/` na raiz do repositório):

   ```bash
   git init && git add . && git commit -m "Primeira versão do site"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
   git push -u origin main
   ```

2. No GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
   O arquivo `.github/workflows/pages.yml` roda os testes e publica a cada `push` na `main`.
   (Alternativa mais simples: Source = "Deploy from a branch", branch `main`, pasta `/ (root)`.
   Nesse caso os testes não rodam automaticamente.)

3. O endereço fica `https://SEU-USUARIO.github.io/SEU-REPOSITORIO/`.

O site é 100% estático. A primeira execução de Python em cada visita baixa o Pyodide
(cerca de 10 a 20 MB, depois fica no cache do navegador). Fórmulas (KaTeX) e Pyodide vêm do CDN jsDelivr;
sem internet, nem fórmulas nem Python aparecem.

## Estrutura

```
index.html            mapa de conceitos (página inicial)
paginas/              uma página por tópico (HTML escrito à mão)
py/                   os códigos Python das células (edite aqui; o site carrega esses arquivos)
                      calor_circulo_*.py resolve o calor no círculo com FFT (espectral x diferenças finitas)
assets/
  style.css           visual (claro/escuro automático)
  site.js             tema, índice lateral, fórmulas
  mapa.js             dados e desenho do mapa (nós, setas, percursos)
  pyrunner.js         células de Python editáveis
  pyworker.js         Web Worker com Pyodide (versão do Pyodide definida aqui)
  burgers-core.js     matemática da demo de Burgers (Hopf–Lax), testável em Node
  burgers-demo.js     desenho da demo de Burgers
  cfl-demo.js         demo dos cones de dependência
  lei-core.js         problema de Riemann para u_t + F(u)_x = 0 (fluxos quadráticos), testável em Node
  lei-demo.js         desenho da demo do problema de Riemann (página de Hamilton–Jacobi)
  grafo-core.js       difusão em grafos (L = BᵀCB, autovalores, dois blocos) e o grafo em anel de N vértices, testável em Node
  grafo-demo.js       demo dos dois blocos (λ₂ e o vetor de Fiedler)
  anel-demo.js        demo do grafo em anel contra a equação do calor (limite contínuo)
  conv-core.js        convolução linear e circular (e a regra dos índices que somam), testável em Node
  onda-core.js        fórmula de d'Alembert e dados iniciais da demo da onda, testável em Node
  transp-core.js      transporte u = f(x − ct), semirreta com entrada; testável em Node
  sep-core.js         séries de senos do calor numa barra, testável em Node
  sf-core.js          séries de Fourier: coeficientes fechados, energia (Parseval), Gibbs; testável em Node
  sf-demo.js          demo da soma parcial e do espectro log-log
  hl-core.js          fórmula de Hopf–Lax: mínimos de f(y) + (x−y)²/2t, choques e perfis, testável em Node
  hl-demo.js          demo do mínimo que salta (a função minimizada e o perfil)
  sep-demo.js         demo da separação de variáveis: soma de N modos e amplitudes que murcham
  transp-demo.js      demo do transporte: características no plano x–t e o perfil deslizando
  onda-demo.js        demo da onda: diagrama x–t com o cone de dependência e o perfil u(x,t)
  ma-core.js          Monge–Ampère: ponto médio, gradiente, área e fórmulas fechadas (parábola, círculo, elipse), testável em Node
  ma-demo.js          demo de Monge–Ampère: P₂ arrastável, características, gradiente e área
  conv-demo.js        demo da convolução: zeros fora da janela × cópias periódicas
rascunhos/            material guardado para páginas futuras (não está ligado ao mapa)
tests/                testes (veja abaixo)
```

## Como acrescentar

**Uma célula de Python** em qualquer página:

```html
<div class="pycell" data-title="Título da célula"
     data-starter="../py/meu_codigo.py"
     data-solution="../py/meu_codigo_solucao.py"></div>
...
<script src="../assets/pyrunner.js"></script>
```

`data-solution` é opcional (vira o bloco "Ver solução"). Use `numpy` e `matplotlib`; `plt.show()` mostra a
figura embaixo da célula. Outros pacotes do Pyodide podem ser acrescentados em `assets/pyworker.js`
(`pyodide.loadPackage([...])`).

**Uma página nova**: copie uma página de `paginas/`, escreva, e no `assets/mapa.js` troque `href: null`
do nó correspondente pelo caminho da página. O índice lateral é gerado dos `<h2 id="...">`.

**Fórmulas**: `$...$` (na linha) e `$$...$$` (em bloco). Dentro do HTML, escreva `&lt;` no lugar de `<` nas fórmulas
(`$t &lt; 2$`), senão o navegador entende como início de tag.

## Testes

```bash
node tests/burgers-core.test.js     # matemática da demo de Burgers (fórmulas exatas e Godunov)
node tests/grafo-core.test.js       # difusão em grafos e grafo em anel: L = BᵀB, evolução contra Runge–Kutta, limite contínuo O(h²)
node tests/conv-core.test.js        # convolução, matriz circulante, shift S, DFT e teorema da convolução
node tests/sep-core.test.js         # separação de variáveis: coeficientes, EDP, Parseval, decaimento
node tests/transp-core.test.js      # transporte: EDP, translação, semirreta, saltos
node tests/onda-core.test.js        # d'Alembert: dados iniciais, EDP por diferenças finitas, dependência
node tests/ma-core.test.js          # Monge–Ampère: det D²u = −1, área = |u|, gradiente, elipse = círculo transformado
node tests/lei-core.test.js         # problema de Riemann: solver exato contra Godunov, Lax e Rankine–Hugoniot (para a futura página de Hamilton–Jacobi)
python3 tests/run_python_cells.py   # roda todos os py/*.py como o worker faz (precisa de numpy e matplotlib)
node tests/smoke_dom.js             # scripts de tela e executor de Python com um DOM simulado
python3 tests/check_site.py         # links, âncoras, ids, tags e fórmulas
```

O que **não** é coberto por esses testes: a renderização real no navegador (aparência, canvas) e o carregamento
do Pyodide pelo CDN. Vale abrir cada página uma vez em um navegador depois de publicar.

## Sobre os códigos Python

`py/transporte_*` e `py/cfl_*` vêm dos seus arquivos, com duas diferenças: um resumo numérico impresso antes dos
gráficos (mínimo e máximo, porque os gráficos cortam o eixo e escondem valores como 1e21) e o comentário
"CFL = 1.5" corrigido para 1.025, que é o valor usado. `py/transporte_lambda.py` é novo.
