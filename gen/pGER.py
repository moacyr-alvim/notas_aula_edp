# -*- coding: utf-8 -*-
"""Gera paginas/gerador-infinitesimal.html."""
from tpl import page

BODY = r"""
      <h2 id="pergunta" data-toc="Uma pergunta boba">Uma pergunta boba</h2>

      <p>Este livro passa o tempo todo escrevendo equações da forma</p>

      $$\frac{\partial u}{\partial t}=(\text{alguma coisa})\,u.$$

      <p>Na <a href="difusao-grafos.html">difusão em grafos</a>, "alguma coisa" era $-c\,L$, com $L=B^\top B$. Na
      <a href="calor-reta.html">equação do calor</a>, era $D\,\partial_{xx}$. Em
      <a href="fokker-planck.html">Fokker–Planck</a> apareceram duas: $a\,\partial_x+D\,\partial_{xx}$ para a
      equação para trás, e a adjunta dela para a densidade. Em <a href="black-scholes.html">Black–Scholes</a>,
      $r S\,\partial_S+\tfrac{\sigma^2S^2}{2}\,\partial_{SS}$.</p>

      <p>A pergunta boba é: <b>de onde vêm esses operadores?</b> Não "como se verifica que estão certos" — isso o
      livro já fez caso a caso —, mas de que fábrica eles saem. E a resposta é que saem todos da mesma, por uma
      receita de uma linha só. O nome da fábrica é <b>gerador infinitesimal</b>, e esta caixinha é sobre
      perceber que seis páginas diferentes estavam fazendo a mesma conta.</p>

      <h2 id="definicao" data-toc="A derivada da média do futuro">A derivada da média do futuro</h2>

      <p>Pegue um processo aleatório $X_t$ — o caminhante do passeio, a partícula que difunde, o preço da ação,
      o andarilho num grafo. Pegue uma função $f$ que atribui um número a cada estado; pense nela como um
      <em>prêmio</em>: se o processo estiver em $x$, você ganha $f(x)$. Agora espere um tempinho $t$ e pergunte
      quanto você espera ganhar. Isso é $\mathbb E[f(X_t)\mid X_0=x]$, um número que depende de onde você
      começou e de quanto esperou.</p>

      <p>Em $t=0$ esse número é $f(x)$, obviamente. O <b>gerador</b> é a velocidade com que ele começa a mudar:</p>

      <aside class="box atencao">
        <p class="tag">A definição</p>
        $$(\mathcal Lf)(x)=\lim_{t\to0}\frac{\mathbb E\big[f(X_t)\mid X_0=x\big]-f(x)}{t}.$$
        <p>É só isso: a derivada, no instante zero, da média do futuro. $\mathcal L$ pega uma função do estado e
        devolve outra função do estado — a <em>taxa</em> com que a média de $f$ começa a andar, a partir de cada
        ponto de partida.</p>
        <p>O adjetivo "infinitesimal" é porque ele mora em $t=0$ e em mais lugar nenhum. A surpresa, que é o
        assunto da seção do semigrupo, é que esse instante único contém o processo inteiro.</p>
      </aside>

      <p>Para uma difusão $dX=a(x)\,dt+\sigma(x)\,dB$ a conta cabe em três linhas, e é a <em>mesma</em> que a
      página de Fokker–Planck fez com $p$, $q$ e Taylor. Escrevendo $\Delta X=X_t-x$,</p>

      $$f(X_t)=f(x)+f'(x)\,\Delta X+\tfrac12 f''(x)\,(\Delta X)^2+\cdots$$

      <p>e tirando a média, com $\mathbb E[\Delta X]=a\,t+\cdots$ e $\mathbb E[(\Delta X)^2]=\sigma^2t+\cdots$,</p>

      $$\mathbb E[f(X_t)]-f(x)=\big[a(x)f'(x)+\tfrac{\sigma^2(x)}{2}f''(x)\big]\,t+o(t),$$

      <p>ou seja, dividindo por $t$ e fazendo $t\to0$,</p>

      $$\boxed{\ \mathcal Lf=a\,f'+D\,f'',\qquad D=\tfrac{\sigma^2}{2}.\ }$$

      <p>Vale reparar no que fez o termo de segunda ordem sobreviver. Numa curva lisa comum, $(\Delta X)^2$ seria
      de ordem $t^2$ e sumiria na divisão por $t$. No passeio aleatório não: o deslocamento é de ordem
      $\sqrt t$, então o quadrado é de ordem $t$ e <b>fica</b>. Aquele $\sqrt t$ que o livro vem perseguindo desde
      a <a href="passeio-aleatorio.html">página do passeio</a> é exatamente o que põe a segunda derivada dentro
      do gerador. Sem ele não haveria difusão, nem calor, nem nada disto.</p>

      <aside class="box">
        <p class="tag">O gerador do browniano é meio laplaciano</p>
        <p>Ponha $a=0$ e $\sigma=1$ na fórmula acima:</p>
        $$\mathcal L=\tfrac12\,\partial_{xx}.$$
        <p>Essa é, talvez, a frase que explica metade deste livro. A equação do calor não aparece em toda parte
        por analogia poética com difusão de partículas: ela aparece porque <b>o gerador do movimento browniano é
        o laplaciano dividido por dois</b>, e qualquer coisa que se espalhe sem memória e sem direção preferida
        tem esse gerador. Calor, concentração, probabilidade e preço de opção resolvem a mesma equação porque
        são a mesma média, do mesmo caminhante.</p>
      </aside>

      <h2 id="demo" data-toc="Veja a derivada acontecer">Veja a derivada acontecer</h2>

      <p>A definição é um limite, e limite é coisa que se vê. À esquerda, a função de teste $f$ tracejada e a
      média do futuro $\mathbb E[f(X_t)\mid x]$ cheia: é o processo agindo sobre a função, espalhando-a e
      empurrando-a. À direita, as duas coisas que a definição diz serem iguais no limite — o quociente
      $\big(\mathbb E[f(X_t)]-f\big)/t$, cheio, e o operador $a\,f'+D\,f''$, tracejado. A sombra entre eles é o
      que ainda falta para o limite chegar.</p>

      <div class="demo" id="demo-ger">
        <div class="controls">
          <label>Processo
            <select id="ger-proc" aria-label="Processo"></select>
          </label>
          <label>Função
            <select id="ger-func" aria-label="Função de teste"></select>
          </label>
          <label>t
            <input type="range" id="ger-t" min="-4" max="-0.3" step="0.02" value="-1" aria-label="Tempo">
            <output id="ger-tv">0,100</output>
          </label>
          <button id="ger-play" type="button">▶ Encolher t</button>
        </div>
        <div class="panels two">
          <canvas id="ger-media" role="img" aria-label="A função de teste e a média do futuro, lado a lado"></canvas>
          <canvas id="ger-quoc" role="img" aria-label="O quociente de diferenças comparado com o operador diferencial"></canvas>
        </div>
        <div class="readout" id="ger-readout" aria-live="polite"></div>
        <div class="legend">
          <span><i style="border-color:var(--ink)"></i>a média do futuro, e o quociente</span>
          <span><i style="border-top-style:dashed;border-color:var(--ink-soft)"></i>a função $f$</span>
          <span><i style="border-top-style:dashed;border-color:var(--carac)"></i>o operador $a\,f'+D\,f''$</span>
          <span><i style="border-color:var(--choque)"></i>o que falta para o limite</span>
        </div>
      </div>

      <p>Três coisas para tentar:</p>
      <ol>
        <li><b>Aperte "Encolher t".</b> As duas curvas da direita se fundem. Esse fundir-se <em>é</em> a
        definição do gerador, acontecendo na sua frente. Repare na velocidade: dividir $t$ por dez divide a
        diferença por dez, porque o resto do Taylor é de ordem $t$.</li>
        <li><b>Olhe o painel da esquerda com $t$ grande.</b> No Ornstein–Uhlenbeck a média do futuro é uma
        versão achatada e puxada para a origem de $f$; no browniano geométrico, puxada para a direita. É o
        semigrupo $P_t$ agindo. Agora encolha $t$: $P_tf$ volta a ser $f$, e o que sobra de interessante é só a
        <em>velocidade</em> com que ela saiu de lá — que é o painel da direita.</li>
        <li><b>Escolha $f(x)=x^2$ com o browniano.</b> A diferença é zero para <em>qualquer</em> $t$, não só no
        limite. Não é sorte: $\mathbb E[X_t^2]=x^2+2Dt$ é exato, então o quociente vale $2D$ sempre. Quando $f$ é
        um polinômio de grau dois e o processo tem coeficientes constantes, o Taylor não tem resto nenhum.</li>
      </ol>

      <h2 id="catalogo" data-toc="O mesmo objeto, seis vezes">O mesmo objeto, seis vezes</h2>

      <p>Com a receita na mão, dá para varrer o livro e colher os geradores:</p>

      <table class="tabela">
        <thead><tr><th>O processo</th><th>O gerador $\mathcal L$</th><th>Onde apareceu</th></tr></thead>
        <tbody>
          <tr><td>andarilho num grafo</td><td>$-c\,L$, com $L=B^\top B$</td><td><a href="difusao-grafos.html">difusão em grafos</a></td></tr>
          <tr><td>movimento browniano</td><td>$\tfrac12\,\partial_{xx}$</td><td><a href="calor-reta.html">o calor na reta</a></td></tr>
          <tr><td>deriva mais ruído</td><td>$a\,\partial_x+D\,\partial_{xx}$</td><td><a href="fokker-planck.html">Fokker–Planck</a></td></tr>
          <tr><td>Ornstein–Uhlenbeck</td><td>$-\gamma x\,\partial_x+D\,\partial_{xx}$</td><td><a href="eds-fokker-planck.html">EDS</a></td></tr>
          <tr><td>browniano geométrico</td><td>$\mu x\,\partial_x+\tfrac{\sigma^2x^2}{2}\,\partial_{xx}$</td><td><a href="black-scholes.html">Black–Scholes</a></td></tr>
          <tr><td>processo de Poisson</td><td>$\lambda\big[f(x+1)-f(x)\big]$</td><td>a seção dos saltos, abaixo</td></tr>
        </tbody>
      </table>

      <p>Um cuidado de notação: na página de grafos, $L$ é o <em>laplaciano do grafo</em>, e o gerador do
      andarilho é $-c\,L$, com sinal trocado. É a mesma troca de sinal de sempre — o laplaciano do grafo é
      definido positivo, e difusão decai.</p>

      <p>E repare na última linha da tabela: o gerador do processo de Poisson não tem derivada nenhuma. Ele é uma
      <em>diferença</em>. Guardaremos isso para o fim.</p>

      <h2 id="matriz" data-toc="Em espaço finito é uma matriz">Em espaço finito é uma matriz, e as linhas somam zero</h2>

      <p>Quando o processo tem poucos estados — digamos quatro —, não há derivada nenhuma e tudo fica
      transparente. Do estado $i$ o processo salta para o estado $j$ a uma <b>taxa</b> $q_{ij}\ge0$, e a
      definição do gerador dá, sem nenhum limite difícil,</p>

      $$(\mathcal Lf)(i)=\sum_{j\ne i}q_{ij}\big[f(j)-f(i)\big],$$

      <p>que é "a soma, sobre os destinos, da taxa vezes o quanto o prêmio muda indo para lá". Como matriz, isso
      é pôr $q_{ij}$ fora da diagonal e, na diagonal, menos a soma da linha:</p>

      $$L=\begin{pmatrix}
      -1{,}3 & 1{,}0 & 0 & 0{,}3\\
      0{,}5 & -1{,}7 & 1{,}2 & 0\\
      0 & 0{,}4 & -1{,}3 & 0{,}9\\
      0{,}7 & 0 & 0{,}6 & -1{,}3
      \end{pmatrix},\qquad L\mathbf 1=0.$$

      <p>A condição $L\mathbf 1=0$ — <b>toda linha soma zero</b> — é a frase "probabilidade não vaza", escrita em
      álgebra linear. E ela tem uma consequência imediata: a matriz de transição $P_t=e^{tL}$ tem toda linha
      somando <em>um</em>, porque $e^{tL}\mathbf 1=\mathbf 1$ assim que $L\mathbf 1=0$. Gerador e transição são a
      mesma informação; o que muda é se as linhas somam zero (taxas) ou um (probabilidades).</p>

      <aside class="box">
        <p class="tag">O que faz $e^{tL}$ ser uma matriz de probabilidades</p>
        <p>Vale experimentar o seguinte, e o código no fim da página faz exatamente isso: <b>apague a
        diagonal</b> de $L$, deixando só as taxas. O que quebra?</p>
        <p>Quase nada do que se esperaria. A propriedade de semigrupo $e^{(t+s)L}=e^{tL}e^{sL}$ continua
        valendo — ela é identidade algébrica de qualquer matriz, e não sabe o que é probabilidade. A adjunção
        entre levar a densidade para a frente e o prêmio para trás também continua, pelo mesmo motivo. O que
        quebra é só isto: as linhas de $e^{tL}$ deixam de somar um, e passam a crescer como $e^{1{,}3\,t}$.
        Com $t=7$ a "probabilidade" total vira vinte mil.</p>
        <p>Ou seja: o semigrupo é barato, e qualquer operador tem um. O que custa — e o que define um processo
        de Markov — é a diagonal certa mais as taxas não negativas fora dela. Essas duas condições são
        exatamente a caracterização de Kolmogorov de um gerador.</p>
      </aside>

      <h2 id="semigrupo" data-toc="Markov, semigrupo, gerador">Markov, semigrupo, gerador: três nomes para a mesma coisa</h2>

      <p>Escreva $P_t$ para a operação "tire a média do futuro depois de um tempo $t$":
      $(P_tf)(x)=\mathbb E[f(X_t)\mid X_0=x]$. Então a propriedade de Markov — o processo não lembra de onde
      veio, só sabe onde está — é literalmente</p>

      $$P_{t+s}=P_t\,P_s,$$

      <p>porque esperar $t+s$ é esperar $t$, olhar onde se está, e esperar mais $s$. Uma família de operadores
      com essa propriedade é um <b>semigrupo</b>. E o gerador, pela definição, é a derivada dela em zero.</p>

      <p>Daí sai tudo. Derivando $P_{t+h}=P_hP_t$ em $h=0$,</p>

      $$\frac{d}{dt}P_t=\mathcal L\,P_t,\qquad\text{ou seja}\qquad P_t=e^{t\mathcal L},$$

      <p>que é a mesma conta de $u'=au\Rightarrow u=e^{at}u_0$, só que $a$ agora é um operador. A EDP
      $u_t=\mathcal Lu$ <em>é</em> essa equação. E a moral é forte: <b>conhecer $\mathcal L$ é conhecer o processo
      inteiro</b>, porque toda a família $P_t$ se reconstrói de um único instante.</p>

      <p>A versão integrada desse enunciado tem nome, fórmula de Dynkin, e é o cavalo de batalha da teoria:</p>

      $$\mathbb E\big[f(X_t)\big]-f(x)=\mathbb E\left[\int_0^t(\mathcal Lf)(X_s)\,ds\right].$$

      <p>Leia assim: a média de $f$ mudou o quanto $\mathcal Lf$ mandou mudar, somado ao longo do caminho. É a
      definição do gerador deixada de ser um limite e virada uma identidade exata — e é com ela que se provam,
      de uma penada, os resultados que este livro obteve um a um. Os problemas de saída da
      <a href="feynman-kac.html">caixinha de Feynman–Kac</a>, por exemplo, saem de aplicar Dynkin até o instante
      em que o caminhante toca a parede.</p>

      <aside class="box atencao">
        <p class="tag">Onde isto vira uma disciplina</p>
        <p>Tudo o que está acima é verdade e é usado assim, mas um curso sério de <b>processos estocásticos</b>
        gasta um bom tempo em coisas que aqui passaram batido. $\mathcal L=\tfrac12\partial_{xx}$ não está
        definido em qualquer função — tem que ter duas derivadas, e em que sentido? Operadores assim não são
        contínuos, e a conta $P_t=e^{t\mathcal L}$, que em dimensão finita é uma série convergente, em dimensão
        infinita precisa de um teorema (Hille–Yosida) dizendo quais $\mathcal L$ de fato geram um semigrupo.</p>
        <p>Nesse curso você veria o gerador aparecer com outros nomes e outras companhias: martingales (a
        afirmação de que $f(X_t)-\int_0^t\mathcal Lf\,ds$ é "justo"), a fórmula de Itô (que é Dynkin antes de
        tirar a média), processos de Markov gerais, processos de Lévy. Este livro é de EDP, e o que ele mostra é
        o lado da EDP dessa moeda: <em>toda</em> equação de evolução sem memória tem a forma
        $u_t=\mathcal Lu$, e o operador do lado direito é sempre a mesma derivada em zero. Se você fizer a
        disciplina depois, vai reconhecer o objeto — e, espero, achar que ele já era velho conhecido.</p>
      </aside>

      <h2 id="adjunto" data-toc="Para a frente e para trás">Para a frente e para trás</h2>

      <p>O gerador age em <b>funções do estado</b> (prêmios, valores), e a equação $-v_t=\mathcal Lv$ é a equação
      para trás. A adjunta $\mathcal L^*$ age em <b>densidades</b>, e $\rho_t=\mathcal L^*\rho$ é Fokker–Planck.
      A página de <a href="fokker-planck.html">Fokker–Planck</a> já tinha deduzido as duas e mostrado que
      $\int\rho\,v$ não muda; em espaço finito isso é só a transposta, e o pareamento é o produto escalar
      $\langle\rho,f\rangle=\sum_i\rho_i f_i$.</p>

      <p>Há uma simetria bonita escondida aí. O gerador tem dois vetores especiais, um de cada lado:</p>

      $$\mathcal L\mathbf 1=0\qquad\text{(sempre)},\qquad\qquad \pi\,\mathcal L=0\qquad\text{(define $\pi$)}.$$

      <p>À direita, o vetor constante: a média de um prêmio constante não muda, o que é trivial e é exatamente a
      conservação de probabilidade. À esquerda, a <b>distribuição estacionária</b>: a densidade que o processo
      não mexe. Uma é dada de graça, a outra é o que se quer descobrir, e as duas são núcleos do mesmo
      operador em lados opostos. Na cadeia de quatro estados acima, $\pi=(0{,}221;\ 0{,}203;\ 0{,}310;\
      0{,}266)$, e o código confere que $\pi\mathcal L=0$ a menos de $10^{-16}$.</p>

      <h2 id="potencial" data-toc="Gerador com um potencial">Gerador com um potencial: Feynman–Kac e Schrödinger</h2>

      <p>A <a href="feynman-kac.html">caixinha de Feynman–Kac</a> acrescentou à viagem um desconto e um
      pagamento, e a equação virou</p>

      $$-v_t=\mathcal Lv-r(x)\,v+f(x).$$

      <p>Em linguagem de operadores: o gerador <b>mais um termo de ordem zero</b>, que é multiplicação por uma
      função. Essa soma tem nome em física — é um hamiltoniano, $\mathcal L$ fazendo o papel da energia cinética
      e $-r$ o do potencial. Não é coincidência de forma: foi exatamente assim que Feynman e Kac se
      encontraram, um vindo da mecânica quântica e o outro da probabilidade.</p>

      <p>O parentesco com a <a href="poco-infinito.html">caixinha do poço</a> fica óbvio quando se põem as duas
      lado a lado:</p>

      $$u_t=\mathcal Lu\qquad\text{contra}\qquad i\,\psi_t=-\psi_{xx}.$$

      <p>A diferença é um $i$. E o $i$ é toda a diferença do mundo: sem ele, $e^{t\mathcal L}$ encolhe as coisas
      (os modos decaem como $e^{-\lambda t}$, o calor espalha, a informação se perde); com ele, $e^{-itH}$ só
      gira (os modos viram $e^{-i\lambda t}$, a norma se conserva, nada se perde e tudo oscila). Semigrupo de
      contração de um lado, grupo unitário do outro — mesma estrutura, mesmo gerador, destinos opostos. A
      <a href="poco-infinito.html">ressurgência</a> daquela página, em que o pacote de ondas volta a se montar
      sozinho, é impensável na difusão, e a razão cabe num símbolo.</p>

      <h2 id="saltos" data-toc="Quando deixa de ser derivada">Quando o gerador deixa de ser uma derivada</h2>

      <p>Vale desfazer uma impressão que esta página pode ter deixado: gerador não é sinônimo de operador
      diferencial. O processo de Poisson, que fica parado e de vez em quando pula uma unidade a uma taxa
      $\lambda$, tem</p>

      $$(\mathcal Lf)(x)=\lambda\big[f(x+1)-f(x)\big],$$

      <p>direto da definição: em um tempinho $t$, com probabilidade $\lambda t$ o prêmio passa a ser $f(x+1)$, e
      com o resto da probabilidade continua $f(x)$. É uma diferença finita, não uma derivada, e nenhum
      refinamento a transforma numa — o salto tem tamanho fixo.</p>

      <p>Juntando as duas possibilidades, o gerador mais geral de um processo com incrementos independentes é</p>

      $$\mathcal Lf=a\,f'+D\,f''+\int\Big[f(x+y)-f(x)-y\,f'(x)\mathbf 1_{\{|y|&lt;1\}}\Big]\nu(dy),$$

      <p>com $\nu$ medindo quantos saltos de cada tamanho acontecem por unidade de tempo. Os dois primeiros
      termos são a parte que anda continuamente; a integral é a parte que pula.</p>

      <p>E isso fecha um círculo com a página anterior. A hipótese "caminhos contínuos" de Black–Scholes é,
      nesta linguagem, a hipótese de que $\nu=0$. Com saltos, a equação ganha a integral e deixa de ser uma EDP:
      vira íntegro-diferencial. E a réplica — aquela carteira que acompanhava a opção — para de funcionar, não
      por imperfeição numérica, mas porque não há rebalanceamento possível no meio de um salto. <b>EDP é o que
      se obtém quando o processo anda sem pular.</b> Boa parte deste livro é, vista daqui, o estudo desse caso
      particular — e é um caso particular e tanto.</p>

      <h2 id="python" data-toc="Rode você mesmo">Rode você mesmo</h2>

      <p>Três experimentos. O primeiro mede $\mathcal Lf$ por Monte Carlo e mostra o compromisso que a demo
      esconde: encolher $t$ derruba o viés mas levanta o ruído, e existe um $t$ ótimo no meio. O segundo é a
      cadeia de quatro estados, onde tudo é matriz e nada é aproximado. O terceiro simula a cadeia de verdade e
      compara com $e^{tL}$. A lacuna é a diagonal do gerador.</p>

      <div class="pycell" data-title="O gerador infinitesimal: medido, em matriz, e determinando o processo"
           data-starter="../py/gerador_lacunas.py"
           data-solution="../py/gerador_solucao.py"></div>

      <p>Os números: medindo com duzentos mil sorteios, o erro desce de $0{,}19$ em $t=0{,}32$ até $0{,}0016$ em
      $t=0{,}01$ e <em>volta a subir</em> até $0{,}061$ em $t=10^{-4}$ — o vale é o compromisso. Na cadeia, as
      linhas de $L$ somam zero a menos de $6\times10^{-17}$, as de $e^{tL}$ somam um a menos de
      $8\times10^{-15}$, o semigrupo fecha a $4\times10^{-16}$ e $\pi\mathcal L=0$ a $10^{-16}$. E quarenta mil
      andarilhos simulados em $t=1{,}5$ dão $(0{,}288;\ 0{,}265;\ 0{,}257;\ 0{,}190)$ contra os
      $(0{,}292;\ 0{,}260;\ 0{,}258;\ 0{,}190)$ previstos por $e^{tL}$. Com a lacuna em branco, as linhas passam
      a somar $1{,}7$, a "probabilidade" total em $t=7$ vira vinte mil, e a cadeia simulada erra por $2{,}4$ —
      mas o semigrupo continua fechando a $10^{-14}$, que é o ponto da caixa lá em cima.</p>

      <h2 id="exercicios">Exercícios</h2>

      <aside class="box exercicio">
        <p class="tag">1. O gerador na mão, e por que a segunda derivada sobrevive</p>
        <p>Para $dX=a\,dt+\sigma\,dB$ com $a$ e $\sigma$ constantes: (a) escreva o Taylor de $f(X_t)$ até a
        terceira ordem em $\Delta X$ e tire a média, usando $\mathbb E[\Delta X]=at$,
        $\mathbb E[(\Delta X)^2]=\sigma^2t+a^2t^2$ e $\mathbb E[|\Delta X|^3]=O(t^{3/2})$. (b) Divida por $t$ e
        faça $t\to0$. (c) Refaça supondo que $X$ fosse uma curva lisa, com $\Delta X=at+O(t^2)$: o que acontece
        com o termo de segunda ordem, e por quê?</p>
      </aside>
      <details>
        <summary>Solução</summary>
        <div class="body">
          <p>(a) $\mathbb E[f(X_t)]-f(x)=f'(x)\,at+\tfrac12f''(x)(\sigma^2t+a^2t^2)+O(t^{3/2})$.</p>
          <p>(b) Dividindo por $t$: $f'a+\tfrac12f''\sigma^2+O(t^{1/2})$, e no limite sobra
          $\mathcal Lf=af'+Df''$ com $D=\sigma^2/2$. Note que o resto é $O(\sqrt t)$, e não $O(t)$ — é a
          terceira ordem que manda, e é por isso que a convergência na demo, que usa funções e processos bem
          comportados, parece mais rápida do que a estimativa grosseira sugere.</p>
          <p>(c) Numa curva lisa, $(\Delta X)^2=a^2t^2+O(t^3)$, que dividido por $t$ vai a zero. O gerador de um
          movimento determinístico é só $\mathcal Lf=af'$ — transporte, primeira ordem, sem difusão nenhuma. A
          segunda derivada só sobrevive porque o passeio aleatório anda $\sqrt t$, e não $t$. <b>Difusão é
          exatamente o que a raiz quadrada do tempo produz.</b></p>
        </div>
      </details>

      <aside class="box exercicio">
        <p class="tag">2. O gerador do processo de Poisson</p>
        <p>Um contador começa em $x$ e, a cada instante, pula para $x+1$ com taxa $\lambda$ (isto é: em um tempo
        $t$ pequeno, a chance de pular é $\lambda t+o(t)$, e a de pular duas vezes é $o(t)$). (a) Calcule
        $\mathbb E[f(X_t)]$ até a primeira ordem em $t$ e obtenha $\mathcal Lf$. (b) Esse operador é
        diferencial? (c) Suponha agora saltos de tamanho $h$ com taxa $\lambda=c/h^2$ e deriva compensando; o
        que acontece quando $h\to0$?</p>
      </aside>
      <details>
        <summary>Solução</summary>
        <div class="body">
          <p>(a) $\mathbb E[f(X_t)]=(1-\lambda t)f(x)+\lambda t\,f(x+1)+o(t)$, logo
          $\mathcal Lf(x)=\lambda[f(x+1)-f(x)]$.</p>
          <p>(b) Não. Ele usa o valor de $f$ num ponto <em>distante</em>, e nenhuma quantidade de derivadas em
          $x$ determina $f(x+1)$. É um operador não local, e essa é a assinatura dos saltos.</p>
          <p>(c) Com saltos simétricos de tamanho $h$ a taxas $c/h^2$ para cada lado,
          $\mathcal Lf=\tfrac{c}{h^2}[f(x+h)-2f(x)+f(x-h)]\to c\,f''$. É a conta da
          <a href="passeio-aleatorio.html">página do passeio</a> de novo: saltos pequenos e frequentes
          <em>viram</em> derivada, desde que a taxa cresça como $1/h^2$. O que não vira derivada é salto de
          tamanho fixo, por mais raro que seja.</p>
        </div>
      </details>

      <aside class="box exercicio">
        <p class="tag">3. O que faz $e^{tL}$ ser probabilidade</p>
        <p>Seja $L$ uma matriz qualquer. (a) Mostre que $e^{(t+s)L}=e^{tL}e^{sL}$ sempre, sem hipótese nenhuma.
        (b) Mostre que, se $L\mathbf 1=0$, então $e^{tL}\mathbf 1=\mathbf 1$. (c) Dê um exemplo de matriz com
        linhas somando zero cuja exponencial tem entrada negativa, e diga que hipótese está faltando. (d)
        Conclua qual par de condições caracteriza um gerador.</p>
      </aside>
      <details>
        <summary>Solução</summary>
        <div class="body">
          <p>(a) Como $tL$ e $sL$ comutam, a série do produto se reorganiza na série da soma — é a mesma conta
          de $e^{a+b}=e^ae^b$. Por isso o semigrupo é "de graça" e não diz nada sobre probabilidade.</p>
          <p>(b) $e^{tL}\mathbf 1=\sum_k\frac{t^k}{k!}L^k\mathbf 1$, e todo termo com $k\ge1$ morre porque
          $L\mathbf 1=0$. Sobra o termo $k=0$, que é $\mathbf 1$.</p>
          <p>(c) Tome $L=\begin{pmatrix}1&-1\\-1&1\end{pmatrix}$: as linhas somam zero, mas o termo fora da
          diagonal é negativo, e $e^{tL}$ tem entradas negativas para todo $t>0$. Falta exigir
          $q_{ij}\ge0$ fora da diagonal — taxas de salto não podem ser negativas.</p>
          <p>(d) Um gerador é uma matriz com <b>linhas somando zero</b> e <b>entradas não negativas fora da
          diagonal</b>. As duas juntas garantem que $e^{tL}$ é estocástica para todo $t\ge0$, e a recíproca
          também vale. Essa é a caracterização de Kolmogorov, e foi ela que a lacuna do código violou.</p>
        </div>
      </details>

      <aside class="box exercicio">
        <p class="tag">4. O $\mathbf 1$ à direita e o $\pi$ à esquerda</p>
        <p>(a) Por que $\mathcal L\mathbf 1=0$ vale para todo gerador, direto da <em>definição</em> com
        $f\equiv1$? (b) Se $\pi\mathcal L=0$ e $\rho_0=\pi$, mostre que $\rho_t=\pi$ para todo $t$. (c) Mostre
        que $\mathbb E_\pi[f(X_t)]$ não depende de $t$. (d) No Ornstein–Uhlenbeck, que $\pi$ é esse?</p>
      </aside>
      <details>
        <summary>Solução</summary>
        <div class="body">
          <p>(a) Com $f\equiv1$, $\mathbb E[f(X_t)]=1=f(x)$ para todo $t$, então o quociente é zero antes de
          qualquer limite. A média de um prêmio constante não tem como mudar.</p>
          <p>(b) $\rho_t=\rho_0e^{t\mathcal L}=\pi\sum_k\frac{t^k}{k!}\mathcal L^k=\pi$, porque todo termo com
          $k\ge1$ tem um $\pi\mathcal L$ dentro.</p>
          <p>(c) $\mathbb E_\pi[f(X_t)]=\langle\pi e^{t\mathcal L},f\rangle=\langle\pi,f\rangle$ pelo item (b).
          Começando no estacionário, nenhuma média muda nunca — é isso que "estacionário" quer dizer.</p>
          <p>(d) É a gaussiana de Boltzmann. Resolvendo $\mathcal L^*\rho=0$, isto é
          $\partial_x(\gamma x\rho)+D\rho''=0$, vem $\gamma x\rho+D\rho'=0$ e
          $\rho\propto e^{-\gamma x^2/2D}$: média zero e variância $D/\gamma=\sigma^2/2\gamma$, exatamente a
          variância de equilíbrio que a <a href="eds-fokker-planck.html">caixinha de EDS</a> já tinha medido.</p>
        </div>
      </details>

      <aside class="box exercicio">
        <p class="tag">5. O limite que não dá para medir</p>
        <p>Medindo $\mathcal Lf$ por Monte Carlo com $N$ sorteios, o erro tem duas partes: o viés, de tamanho
        $B\,t$ (o limite ainda não chegou), e o ruído, de tamanho $A/\sqrt{t\,N}$ (a diferença some dentro da
        incerteza). (a) Justifique a forma do ruído, lembrando que
        $\operatorname{Var}[f(X_t)]\approx f'(x)^2\,2Dt$. (b) Minimize $B\,t+A/\sqrt{tN}$ e ache $t^*$. (c)
        Mostre que o melhor erro possível cai como $N^{-1/3}$. (d) Por que a demo da página consegue ir a
        $t=10^{-4}$ sem sofrer disso?</p>
      </aside>
      <details>
        <summary>Solução</summary>
        <div class="body">
          <p>(a) O desvio padrão de uma média de $N$ sorteios de $f(X_t)$ é
          $\sqrt{\operatorname{Var}[f(X_t)]/N}\approx|f'|\sqrt{2Dt/N}$. Como o estimador divide por $t$, o
          desvio do resultado é $|f'|\sqrt{2D}\big/\sqrt{tN}$, que é a forma anunciada.</p>
          <p>(b) Derivando, $B-\tfrac{A}{2}t^{-3/2}N^{-1/2}=0$, logo
          $t^*=\Big(\tfrac{A}{2B\sqrt N}\Big)^{2/3}\propto N^{-1/3}$.</p>
          <p>(c) O erro no ótimo é da ordem de $B\,t^*\propto N^{-1/3}$. É uma taxa ruim: para ganhar uma casa
          decimal são precisos mil vezes mais sorteios. Derivada numérica em cima de dado ruidoso é cara.</p>
          <p>(d) Porque a demo não sorteia nada. Os quatro processos têm densidade de transição exata — gaussiana
          em $x$ ou em $\ln x$ —, e a média é feita por quadratura, com erro perto do arredondamento. Sem ruído,
          só sobra o viés, que cai como $t$, e encolher $t$ só melhora — até $t$ ficar tão pequeno que
          $\mathbb E[f]-f$ se perca na subtração de dois números quase iguais, que é outro limite, e bem mais
          distante.</p>
        </div>
      </details>

      <aside class="box exercicio">
        <p class="tag">6. Um gerador que você já resolveu</p>
        <p>Considere o andarilho num grafo em caminho de três nós, com $L=B^\top B$ como na
        <a href="difusao-grafos.html">caixinha de grafos</a>. (a) Escreva o gerador $\mathcal L=-L$ e confira que
        as linhas somam zero. (b) Quais são as taxas de salto? (c) Ache $\pi$ resolvendo $\pi\mathcal L=0$. (d)
        Explique, sem calcular, por que $\pi$ não é uniforme num grafo com graus diferentes — e por que é
        uniforme neste.</p>
      </aside>
      <details>
        <summary>Solução</summary>
        <div class="body">
          <p>(a) $\mathcal L=-\begin{pmatrix}1&-1&0\\-1&2&-1\\0&-1&1\end{pmatrix}
          =\begin{pmatrix}-1&1&0\\1&-2&1\\0&1&-1\end{pmatrix}$, e as linhas somam $0$, $0$ e $0$.</p>
          <p>(b) Cada aresta dispara a taxa $1$: do nó $1$ só se vai ao $2$ (taxa $1$), do nó $2$ vai-se ao $1$
          ou ao $3$ (taxa $1$ cada, daí o $-2$ na diagonal), e do $3$ só ao $2$.</p>
          <p>(c) $\pi\mathcal L=0$ com $\sum\pi_i=1$ dá $\pi=(1/3,1/3,1/3)$.</p>
          <p>(d) Com taxas iguais em cada aresta, o fluxo de $i$ para $j$ é $\pi_i$ e o de volta é $\pi_j$;
          equilibrá-los aresta a aresta exige $\pi_i=\pi_j$ para todo par vizinho, e num grafo conexo isso força
          $\pi$ uniforme — <em>independentemente</em> dos graus. (O que não é uniforme, e vale $\deg(i)$
          normalizado, é a estacionária do passeio a tempo <b>discreto</b>, em que a cada passo se escolhe um
          vizinho ao acaso: lá o nó de grau alto é visitado mais. Dois processos diferentes, dois geradores
          diferentes, duas estacionárias diferentes — e a diferença mora inteira na diagonal.)</p>
        </div>
      </details>
"""

page(
    fname="gerador-infinitesimal.html",
    title="O gerador infinitesimal",
    h1="O gerador infinitesimal",
    lede="Grafos, passeios, Fokker–Planck, Feynman–Kac, Black–Scholes e até o poço de potencial escreveram "
         "operadores de cara diferente. Eram o mesmo objeto visto de ângulos diferentes: a derivada, no "
         "instante zero, da média do futuro.",
    meta='Ajuda ler antes: <a href="fokker-planck.html">Deriva, ruído e Fokker–Planck</a> e '
         '<a href="difusao-grafos.html">A EDP da difusão em grafos</a>. Leitura de uns 25 minutos.',
    body=BODY,
    prev=[("Deriva, ruído e Fokker–Planck", "fokker-planck.html"),
          ("A EDP da difusão em grafos", "difusao-grafos.html"),
          ("A fórmula de Feynman–Kac", "feynman-kac.html"),
          ("A equação do calor na reta", "calor-reta.html")],
    nxt=[("A fórmula de Feynman–Kac", "feynman-kac.html"),
         ("Black–Scholes: o preço é o custo da receita", "black-scholes.html"),
         ("O poço de potencial infinito", "poco-infinito.html")],
    scripts='\n  <script src="../assets/ger-core.js"></script>\n'
            '  <script src="../assets/ger-demo.js"></script>\n'
            '  <script src="../assets/pyrunner.js"></script>\n',
)
