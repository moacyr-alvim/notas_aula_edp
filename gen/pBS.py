# -*- coding: utf-8 -*-
"""Gera paginas/black-scholes.html."""
from tpl import page

BODY = r"""
      <h2 id="opcao" data-toc="O que é uma opção">O que é uma opção</h2>

      <p>Uma ação custa $100$ hoje. Eu te vendo, por um preço a combinar, o <b>direito</b> — não a obrigação —
      de me comprar essa ação por $100$ daqui a um ano. Se daqui a um ano ela estiver valendo $130$, você
      exerce o direito, me paga $100$, e ganha $30$. Se estiver valendo $70$, você simplesmente não exerce, e
      perde apenas o que me pagou hoje. Isso é uma <b>opção de compra</b>, e o que ela paga no vencimento é</p>

      $$g(S_T)=\max(S_T-K,0),$$

      <p>onde $S_T$ é o preço da ação no vencimento e $K$ é o preço combinado, chamado de <em>strike</em>. Essa
      função já apareceu neste livro: é a <b>rampa</b> da demo da
      <a href="feynman-kac.html">caixinha de Feynman–Kac</a>, aquela que paga o quanto passar de um ponto.</p>

      <p>A pergunta é quanto vale esse direito hoje. Ela parece uma pergunta de economia, e em parte é — mas a
      resposta é uma EDP, e é a mesma EDP do calor, disfarçada. O caminho até lá tem uma surpresa no meio.</p>

      <h2 id="ingenua" data-toc="A tentativa ingênua">A tentativa ingênua, e por que ela falha</h2>

      <p>A resposta natural é a de Feynman–Kac: o preço é o pagamento médio, descontado. A ação segue o
      browniano geométrico $dS=\mu S\,dt+\sigma S\,dB$ da <a href="eds-fokker-planck.html">caixinha de EDS</a>,
      e a conta sai na hora. Para enxergar o problema, nem precisamos de tempo contínuo: basta um passo só.</p>

      <p>Suponha que, em um ano, a ação ou sobe para $120$ ou cai para $90$, e que o dinheiro parado rende
      $r=5\%$ ao ano. A opção com $K=100$ paga $20$ se subir e $0$ se cair. Se a chance real de subir é $p$, o
      preço "médio descontado" seria $e^{-r}\,[\,p\cdot 20+(1-p)\cdot 0\,]$:</p>

      <table class="tabela">
        <thead><tr><th>Se você acha que a chance de subir é</th><th>$p=0{,}3$</th><th>$p=0{,}5$</th><th>$p=0{,}7$</th></tr></thead>
        <tbody><tr><td>o preço "justo" seria</td><td>$5{,}71$</td><td>$9{,}51$</td><td>$13{,}32$</td></tr></tbody>
      </table>

      <p>Três pessoas, três preços. À primeira vista isso não tem nada de escandaloso — pessoas discordam sobre
      preços o tempo todo, é disso que mercado é feito. Mas aqui há um detalhe que torna a discordância
      insustentável, e é um detalhe que não existe quando se negocia café ou apartamento: <b>a opção pode ser
      fabricada a partir da própria ação</b>. Ela não é uma mercadoria independente. E o custo de fabricá-la não
      depende da opinião de ninguém.</p>

      <h2 id="replica" data-toc="A réplica">A réplica: duas equações, duas incógnitas</h2>

      <p>Vamos fabricar. Monte hoje uma carteira com $\Delta$ ações e $B$ reais em dinheiro, e exija que ela
      pague <em>exatamente o mesmo</em> que a opção nos dois cenários possíveis. O dinheiro rende $e^{r}$ no ano,
      então:</p>

      $$\begin{aligned}
      \text{se subir:}\quad & 120\,\Delta+B\,e^{r}=20,\\
      \text{se cair:}\quad & \ \ 90\,\Delta+B\,e^{r}=\ \ 0.
      \end{aligned}$$

      <p>Subtraia uma da outra: $30\,\Delta=20$, ou seja $\Delta=2/3$. Repondo na segunda, $B\,e^{r}=-60$, isto
      é $B=-60\,e^{-r}=-57{,}07$. O sinal negativo quer dizer que você <em>toma emprestado</em>. E o custo de
      montar essa carteira hoje é</p>

      $$\Delta\cdot 100+B=\tfrac23\cdot 100-57{,}07=9{,}59.$$

      <aside class="box atencao">
        <p class="tag">Por que o preço <em>tem</em> que ser 9,59</p>
        <p>Porque qualquer outro número imprime dinheiro.</p>
        <p><b>Se a opção estivesse sendo vendida a 11:</b> você a vende por $11$, gasta $9{,}59$ montando a
        carteira, e embolsa $1{,}41$ hoje. No vencimento, a carteira paga exatamente o que você tem que pagar
        ao dono da opção — $20$ se subiu, $0$ se caiu. Você fica com $1{,}41$ sem risco nenhum, chova ou faça
        sol.</p>
        <p><b>Se estivesse a 8:</b> faça ao contrário. Compre a opção por $8$ e monte a carteira invertida
        (venda $2/3$ de ação, aplique $57{,}07$), que rende $9{,}59$ hoje. Embolse $1{,}59$. No vencimento a
        opção paga exatamente o que a carteira invertida lhe custa.</p>
        <p>Dinheiro de graça, sem risco, em qualquer quantidade, não sobrevive num mercado com gente atenta. O
        preço é $9{,}59$ — não porque alguém ache, mas porque é <b>o custo da receita</b>.</p>
      </aside>

      <p>Agora olhe de novo para a conta e procure a probabilidade real $p$. Ela não está lá. Nunca entrou. As
      duas equações só perguntaram <em>quanto a ação vale em cada cenário</em>, nunca <em>com que chance cada
      cenário acontece</em>. É um sumiço notável: o preço da opção não depende de a ação ser uma aposta boa ou
      ruim.</p>

      <h2 id="neutra" data-toc="A probabilidade que não é crença">A probabilidade que não é crença de ninguém</h2>

      <p>Há um jeito de reescrever $9{,}59$ que parece desfazer o sumiço, e vale a pena entender o truque.
      Chamando $u=1{,}2$ e $d=0{,}9$ os dois fatores, um pouco de álgebra põe o custo da réplica na forma</p>

      $$\text{preço}=e^{-r}\big[q\,C_{\text{sobe}}+(1-q)\,C_{\text{cai}}\big],
      \qquad q=\frac{e^{r}-d}{u-d}=0{,}5042.$$

      <p>Ou seja: o preço <em>é</em> uma esperança descontada, mas com $q$ no lugar de $p$. E $q$ não é a crença
      de ninguém — é uma razão entre juros e os dois cenários, que caiu da álgebra da réplica. Ela se comporta
      como probabilidade (está entre $0$ e $1$ sempre que não houver arbitragem na própria ação) e tem uma
      propriedade que explica o nome:</p>

      $$q\,u+(1-q)\,d=e^{r}.$$

      <p>Debaixo de $q$, a ação rende <em>exatamente a taxa do dinheiro parado</em>. Por isso $q$ se chama
      <b>medida neutra ao risco</b>: é o mundo imaginário em que ninguém cobra prêmio nenhum por correr risco.
      Vale insistir que isso não é uma hipótese sobre a psicologia de ninguém, e sim uma consequência algébrica
      de a opção ser replicável. Ninguém é neutro ao risco; o preço é que sai <em>como se</em> todos fossem.</p>

      <h2 id="formula" data-toc="A fórmula">A fórmula</h2>

      <p>No tempo contínuo acontece a mesma coisa, e o exercício 6 da
      <a href="feynman-kac.html">caixinha de Feynman–Kac</a> já tinha deixado tudo pronto. A réplica contínua
      troca a deriva real $\mu$ pela taxa $r$; com essa troca feita, Feynman–Kac com desconto $r$ dá</p>

      $$C(S,t)=e^{-r(T-t)}\,\mathbb E^{q}\big[\max(S_T-K,0)\big].$$

      <p>E essa esperança a gente sabe fazer. Com $x=\ln S$ os coeficientes ficam constantes, o desconto sai para
      fora, o transporte some num referencial que anda junto, e sobra a
      <a href="calor-reta.html">equação do calor na reta</a>, cuja solução é a gaussiana integrada. O resultado é
      a fórmula de Black–Scholes:</p>

      <aside class="box atencao">
        <p class="tag">A fórmula</p>
        $$C=S\,\Phi(d_1)-K\,e^{-rT}\,\Phi(d_2),\qquad
        d_1=\frac{\ln(S/K)+\big(r+\tfrac{\sigma^2}{2}\big)T}{\sigma\sqrt T},\qquad d_2=d_1-\sigma\sqrt T,$$
        <p>com $\Phi$ a acumulada da normal. Repare no que <b>não</b> está aí: $\mu$. A deriva real da ação, a
        coisa sobre a qual todo mundo tem opinião, não entra. O que entra é $\sigma$, o tamanho do tremor — e é
        por isso que quem negocia opções fala o dia inteiro sobre volatilidade e quase nunca sobre para onde a
        ação vai.</p>
        <p>As duas parcelas se leem como uma compra: a segunda, $K\,e^{-rT}\Phi(d_2)$, é o que você espera
        <em>pagar</em> — o strike, descontado, vezes a chance de exercer; e $\Phi(d_2)$ é precisamente a
        probabilidade neutra ao risco de a opção valer a pena. A primeira, $S\,\Phi(d_1)$, é o que você espera
        <em>receber</em>: o valor da ação que vai trocar de mãos, já pesado pela chance de a troca acontecer.</p>
        <p>Com $S=K=100$, $r=5\%$, $\sigma=20\%$ e um ano, dá $C=10{,}45$.</p>
      </aside>

      <h2 id="edp" data-toc="A EDP">A EDP, que é a do calor de novo</h2>

      <p>Como $C$ é uma esperança descontada do processo com deriva $r$, Feynman–Kac dá a equação de graça:</p>

      $$\frac{\partial C}{\partial t}+r\,S\,\frac{\partial C}{\partial S}
      +\frac{\sigma^2S^2}{2}\,\frac{\partial^2C}{\partial S^2}-r\,C=0,
      \qquad C(S,T)=\max(S-K,0).$$

      <p>Cada termo é um dos três verbos da viagem: o transporte com deriva $r$, a difusão com intensidade
      $\sigma S$, e o desconto $-rC$. O dado é <b>final</b>, não inicial, e a equação se resolve de $T$ para
      trás — que é como todas as equações para trás funcionam.</p>

      <aside class="box">
        <p class="tag">É calor com o tempo invertido, e por isso está tudo bem</p>
        <p>Com $x=\ln S$, $\tau=T-t$ e um pouco de arrumação, a equação acima vira literalmente
        $u_\tau=\tfrac{\sigma^2}{2}u_{xx}$ (exercício 6). Isso deveria acender uma luz: resolver calor para trás
        no tempo é o exemplo clássico de problema <em>mal-posto</em>, em que um errinho no dado explode.</p>
        <p>O que salva é a direção. Aqui nunca se caminha para trás no calor: caminha-se para a frente em
        $\tau$, o tempo que <em>falta</em>. Partindo do pagamento no vencimento e indo em direção a hoje,
        estamos sempre suavizando, nunca desamassando. É também por isso que $C$ é lisa como manteiga mesmo
        tendo saído de um pagamento com bico em $S=K$: o bico some instantaneamente, como todo bico some na
        equação do calor.</p>
      </aside>

      <p>Há um segundo caminho para a mesma equação, o caminho histórico: aplicar Itô a $C(S,t)$, montar a
      carteira $\Pi=C-\Delta S$ e escolher $\Delta$ de modo que o termo com $dB$ se cancele. O que sobra não tem
      risco, logo tem que render $r$, e isso dá a EDP. É a mesma ideia da réplica, dita em linguagem de cálculo
      estocástico em vez de duas equações e duas incógnitas.</p>

      <h2 id="delta" data-toc="O delta">O delta, e a receita em movimento</h2>

      <p>Na árvore de um passo a receita era $\Delta=2/3$ de ação. No tempo contínuo a receita é</p>

      $$\Delta=\frac{\partial C}{\partial S}=\Phi(d_1),$$

      <p>que é sempre um número entre $0$ e $1$ — você nunca precisa de mais de uma ação nem de menos de zero.
      Ele se lê direto: quando a opção está muito dentro do dinheiro, $\Delta\to1$ e a opção anda junto com a
      ação, porque o exercício é quase certo; muito fora, $\Delta\to0$ e a opção mal reage, porque quase certo é
      que ela não valerá nada.</p>

      <p>E aqui está a parte que o nome "fórmula" esconde: $\Delta$ <b>muda o tempo todo</b>. Replicar não é
      comprar uma cesta e esquecer; é uma receita que precisa ser refeita conforme a ação anda e o tempo passa.
      Quanto mais depressa $\Delta$ muda — isto é, quanto maior $\partial^2C/\partial S^2$ — mais trabalho dá
      acompanhar. A demo abaixo é exatamente sobre isso.</p>

      <h2 id="demo" data-toc="Veja a receita funcionar">Veja a receita funcionar</h2>

      <p>Você vendeu a opção e embolsou o prêmio de $10{,}45$. Agora tem que entregar o que prometeu. À esquerda,
      a ação faz o que quer, com o strike tracejado; os pontinhos marcam os instantes em que você rebalanceia a
      carteira. À direita, o que a opção <em>vale</em> a cada instante, desenhado como uma faixa larga e clara,
      e o que a sua <em>carteira</em> vale, como um fio fino por cima: enquanto o fio estiver dentro da faixa, a
      réplica está funcionando. Como as duas quase sempre coincidem — que é justamente a graça —, a tirinha de
      baixo mostra a <b>diferença</b> entre elas, com escala própria; é lá que dá para ver o erro de perto.</p>

      <div class="demo" id="demo-bs">
        <div class="controls">
          <label>Rebalanceamentos
            <input type="range" id="bs-n" min="0" max="9" step="1" value="6" aria-label="Número de rebalanceamentos">
            <output id="bs-nv">48</output>
          </label>
          <label>Deriva real μ
            <input type="range" id="bs-mu" min="-0.3" max="0.5" step="0.05" value="0.1" aria-label="Deriva real da ação">
            <output id="bs-muv">10%</output>
          </label>
          <button id="bs-sortear" type="button">🎲 Outro caminho</button>
          <button id="bs-play" type="button">▶ Animar</button>
        </div>
        <div class="panels two">
          <canvas id="bs-acao" role="img" aria-label="O caminho da ação ao longo do ano, com o strike tracejado e os instantes de rebalanceamento marcados"></canvas>
          <canvas id="bs-carteira" role="img" aria-label="O valor da opção e o valor da carteira replicante ao longo do ano, com a diferença sombreada"></canvas>
        </div>
        <div class="readout" id="bs-readout" aria-live="polite"></div>
        <div class="legend">
          <span><i style="border-color:var(--ink)"></i>a ação</span>
          <span><i style="border-color:var(--ink);opacity:.35;border-top-width:7px"></i>o valor da opção</span>
          <span><i style="border-color:var(--carac)"></i>a carteira replicante</span>
          <span><i style="border-top-style:dashed;border-color:var(--choque)"></i>o strike $K$</span>
          <span><i style="border-color:var(--choque)"></i>a diferença, ampliada</span>
        </div>
      </div>

      <p>Quatro coisas para tentar:</p>
      <ol>
        <li><b>Deixe em $1$ rebalanceamento e aperte "Animar".</b> O fio da carteira sai passeando para fora da
        faixa da opção, e a tirinha de baixo vira uma montanha: você comprou $0{,}64$ de ação no começo e não
        mexeu mais. No vencimento sobra ou falta dinheiro, e bastante — a sobra típica é de uns $6$ reais, mais
        da metade do prêmio que você cobrou.</li>
        <li><b>Agora vá subindo o número de rebalanceamentos.</b> O fio entra na faixa e fica lá, e a tirinha de
        baixo (que tem escala fixa) vai achatando: a sobra típica cai como $1/\sqrt n$, de modo que quadruplicar
        o número de ajustes corta o erro pela metade. <em>A replicação não é exata — é um limite.</em></li>
        <li><b>Com os rebalanceamentos lá em cima, arraste a deriva $\mu$ de $-30\%$ a $+50\%$.</b> O caminho da
        ação muda radicalmente, o valor da opção muda, a carteira muda — e a sobra no fim continua perto de
        zero. Essa é a afirmação central da página, e ela é bem mais fácil de acreditar vendo do que lendo. O
        prêmio de $10{,}45$ estava certo tanto para o pessimista quanto para o otimista.</li>
        <li><b>Sorteie vários caminhos com $1$ rebalanceamento e depois com $480$.</b> Com poucos ajustes a sobra
        pula de positiva para negativa sem padrão: às vezes você ganha, às vezes perde. Com muitos, ela fica
        grudada no zero. Note que mesmo no caso ruim a sobra <em>média</em> é quase zero — o hedge malfeito não
        é enviesado, é só impreciso. Quem vende opção sem rebalançar não está roubando nem sendo roubado; está
        apostando.</li>
      </ol>

      <h2 id="python" data-toc="Rode você mesmo">Rode você mesmo</h2>

      <p>Três experimentos. O primeiro refaz a réplica de um passo e mostra a árvore de $n$ passos convergindo
      para a fórmula fechada. O segundo mede a sobra típica do hedge contra o número de rebalanceamentos. O
      terceiro é a conclusão: coberto, o resultado médio quase não muda com $\mu$; nu, muda enormemente. A
      lacuna é a linha que recalcula a receita.</p>

      <div class="pycell" data-title="Black–Scholes: a réplica, a árvore e a deriva que não importa"
           data-starter="../py/black_scholes_lacunas.py"
           data-solution="../py/black_scholes_solucao.py"></div>

      <p>Os números que saem: a árvore erra $0{,}197$ com $10$ passos e $0{,}0004$ com $5000$, caindo como
      $1/n$; a sobra típica do hedge vai de $6{,}21$ com um rebalanceamento a $0{,}42$ com $256$, com inclinação
      $-0{,}484$ no log-log. E a conclusão: as médias cobertas variam $0{,}02$ entre $\mu=-20\%$ e $\mu=+30\%$,
      enquanto as nuas variam $34{,}5$ — uma razão de mais de mil. Com a lacuna em branco o delta nunca é
      recalculado, a inclinação vira $-0{,}003$ (o erro para de encolher) e a razão despenca para $6$: as duas
      conclusões morrem juntas, que é o jeito de ver que elas eram a mesma conclusão.</p>

      <h2 id="quebra" data-toc="Onde o modelo quebra">Onde o modelo quebra</h2>

      <p>Esta é uma caixinha sobre uma equação que ganhou um Nobel e também já ajudou a quebrar fundos. As duas
      coisas têm a mesma causa: as hipóteses são fortes, e cada uma delas é falsa de um jeito interessante.</p>

      <ul>
        <li><b>$\sigma$ constante.</b> Falso, e o próprio mercado admite. Se você pegar os preços reais das
        opções e perguntar "que $\sigma$ a fórmula precisaria para dar este preço?", a resposta muda conforme o
        strike, desenhando uma curva chamada <em>sorriso de volatilidade</em>. Isso é o mercado dizendo, em
        bom som, que não acredita nas caudas da lognormal: quedas grandes são mais prováveis do que o modelo
        supõe, e opções que protegem contra elas custam mais caro.</li>
        <li><b>Negociação contínua e de graça.</b> A demo mostra o lado bom — mais ajustes, menos erro — e
        esconde o lado ruim: cada ajuste custa. Como o erro cai só com $1/\sqrt n$ e o custo sobe com $n$,
        existe um número ótimo de ajustes, e o erro que sobra nele não é desprezível (exercício 5).</li>
        <li><b>Caminhos contínuos.</b> O browniano geométrico não dá saltos. O mundo dá: uma notícia abre o
        mercado $20\%$ abaixo e não existe rebalanceamento possível no meio do salto. Toda a lei $1/\sqrt n$
        depende de a ação não pular, e é exatamente aí que o hedge falha quando mais se precisa dele.</li>
      </ul>

      <p>Vale terminar com a leitura honesta do que o modelo faz. Quase ninguém usa Black–Scholes para
      <em>descobrir</em> o preço de uma opção líquida — o preço está na tela. Usa-se a fórmula ao contrário,
      como <b>dicionário</b>: dado o preço, qual $\sigma$ o explica. Essa volatilidade implícita vira a língua
      em que se compara opção com opção, strike com strike, e é por isso que a fórmula continua de pé mesmo com
      todas as hipóteses furadas. Ela não é um oráculo de preços; é uma mudança de unidades — e boas mudanças de
      unidades são, com frequência, a coisa mais útil que uma teoria produz.</p>

      <h2 id="exercicios">Exercícios</h2>

      <aside class="box exercicio">
        <p class="tag">1. Paridade put-call, sem modelo nenhum</p>
        <p>Uma opção de <em>venda</em> paga $\max(K-S_T,0)$. Considere duas carteiras: (A) uma opção de compra
        mais $K\,e^{-rT}$ em dinheiro; (B) uma opção de venda mais uma ação. (a) Mostre que as duas pagam o
        mesmo no vencimento, nos dois casos $S_T>K$ e $S_T\le K$. (b) Conclua que $C-P=S-K\,e^{-rT}$. (c) Que
        hipóteses do modelo foram usadas?</p>
      </aside>
      <details>
        <summary>Solução</summary>
        <div class="body">
          <p>(a) Se $S_T>K$: a carteira (A) tem $S_T-K$ da opção mais $K$ do dinheiro, total $S_T$; a (B) tem
          $0$ da venda mais a ação, total $S_T$. Se $S_T\le K$: (A) tem $0$ mais $K$, total $K$; (B) tem
          $K-S_T$ mais $S_T$, total $K$. Iguais nos dois casos, portanto iguais sempre.</p>
          <p>(b) Duas carteiras que pagam o mesmo em todos os cenários têm que custar o mesmo hoje, de novo sob
          pena de dinheiro de graça. Então $C+K\,e^{-rT}=P+S$.</p>
          <p>(c) <b>Nenhuma.</b> Não usamos browniano geométrico, nem $\sigma$ constante, nem continuidade dos
          caminhos — nem sequer que exista um modelo. Só usamos que os dois pagamentos são iguais e que não há
          almoço grátis. Por isso a paridade vale no mundo real com uma precisão que a fórmula de Black–Scholes
          nunca terá: ela é aritmética, não modelo.</p>
        </div>
      </details>

      <aside class="box exercicio">
        <p class="tag">2. A árvore de um passo com os seus números</p>
        <p>Refaça a réplica com $S=50$, $K=55$, $u=1{,}4$, $d=0{,}8$, $r=4\%$ e um ano. (a) Ache $\Delta$, $B$ e
        o preço. (b) Ache $q$ e confirme que a esperança descontada dá o mesmo. (c) O que aconteceria se fosse
        $u=1{,}4$ e $d=1{,}1$, com $r=4\%$? Calcule $q$ e interprete.</p>
      </aside>
      <details>
        <summary>Solução</summary>
        <div class="body">
          <p>(a) Os cenários são $S=70$ (paga $15$) e $S=40$ (paga $0$). Então $\Delta=15/30=0{,}5$ e
          $B\,e^{0{,}04}=-0{,}5\cdot40=-20$, ou seja $B=-20e^{-0{,}04}=-19{,}22$. O preço é
          $0{,}5\cdot50-19{,}22=5{,}78$.</p>
          <p>(b) $q=(e^{0{,}04}-0{,}8)/(1{,}4-0{,}8)=(1{,}0408-0{,}8)/0{,}6=0{,}4013$, e
          $e^{-0{,}04}\cdot0{,}4013\cdot15=5{,}78$. O mesmo, como tinha que ser.</p>
          <p>(c) $q=(1{,}0408-1{,}1)/0{,}3=-0{,}197$, negativo — a "probabilidade" não é probabilidade. E com
          razão: se a ação sobe pelo menos $10\%$ em todo cenário enquanto o dinheiro rende $4\%$, então tomar
          emprestado e comprar ação é lucro certo. A arbitragem está na <em>ação</em>, antes de qualquer opção
          existir. A condição $d&lt;e^{r\Delta t}&lt;u$ é exatamente a de não haver almoço grátis, e é ela que faz
          $q$ cair entre $0$ e $1$.</p>
        </div>
      </details>

      <aside class="box exercicio">
        <p class="tag">3. Os extremos da fórmula</p>
        <p>(a) O que acontece com $C$ quando $\sigma\to0$? Interprete o resultado em palavras. (b) E quando
        $T\to0$? (c) Mostre, sem usar a fórmula, que sempre vale $C\ge\max(S-K\,e^{-rT},0)$, e explique por que
        isso diz que opção nunca vale menos do que "o valor do tempo".</p>
      </aside>
      <details>
        <summary>Solução</summary>
        <div class="body">
          <p>(a) Com $\sigma\to0$ não há tremor: a ação vira uma aplicação que rende $r$ com certeza, indo para
          $S\,e^{rT}$. Então a opção paga $\max(S\,e^{rT}-K,0)$, que descontado é $\max(S-K\,e^{-rT},0)$. Na
          fórmula, $d_1$ e $d_2$ vão os dois para $\pm\infty$ conforme o sinal de $\ln(S/K)+rT$, e $\Phi$ vai
          para $1$ ou $0$ junto, dando o mesmo.</p>
          <p>(b) Com $T\to0$ sobra $\max(S-K,0)$: no instante do vencimento, o direito vale o que ele paga.</p>
          <p>(c) Compare duas carteiras: ter a opção, ou ter a ação e dever $K\,e^{-rT}$. No vencimento a
          segunda vale $S_T-K$, e a primeira vale $\max(S_T-K,0)$, que nunca é menor. Logo o preço da primeira
          não pode ser menor que o da segunda, que é $S-K\,e^{-rT}$; e como a opção nunca paga negativo, também
          $C\ge0$. A diferença entre $C$ e esse piso é o <em>valor do tempo</em>: o quanto vale ainda poder
          desistir.</p>
        </div>
      </details>

      <aside class="box exercicio">
        <p class="tag">4. O delta é mesmo $\Phi(d_1)$</p>
        <p>Derivar $C=S\,\Phi(d_1)-K\,e^{-rT}\Phi(d_2)$ em relação a $S$ produz três parcelas, porque $d_1$ e
        $d_2$ também dependem de $S$. (a) Escreva as três. (b) Mostre a identidade
        $S\,\varphi(d_1)=K\,e^{-rT}\varphi(d_2)$, onde $\varphi$ é a densidade normal. (c) Conclua que
        $\partial C/\partial S=\Phi(d_1)$, e comente por que esse cancelamento é mais do que sorte.</p>
      </aside>
      <details>
        <summary>Solução</summary>
        <div class="body">
          <p>(a) Como $\partial d_1/\partial S=\partial d_2/\partial S=1/(S\sigma\sqrt T)$,
          $$\frac{\partial C}{\partial S}=\Phi(d_1)+S\,\varphi(d_1)\frac{1}{S\sigma\sqrt T}
          -K\,e^{-rT}\varphi(d_2)\frac{1}{S\sigma\sqrt T}.$$</p>
          <p>(b) Com $v=\sigma\sqrt T$ e $d_2=d_1-v$,
          $\varphi(d_2)=\frac{1}{\sqrt{2\pi}}e^{-(d_1-v)^2/2}=\varphi(d_1)\,e^{d_1v-v^2/2}$. E
          $d_1v-v^2/2=\ln(S/K)+\big(r+\tfrac{\sigma^2}2\big)T-\tfrac{\sigma^2}2T=\ln(S/K)+rT$. Logo
          $\varphi(d_2)=\varphi(d_1)\,\tfrac SK e^{rT}$, e multiplicando por $K\,e^{-rT}$ sai exatamente
          $S\,\varphi(d_1)$.</p>
          <p>(c) As duas últimas parcelas se cancelam e sobra $\Phi(d_1)$. Não é sorte: a réplica exige que
          segurar $\partial C/\partial S$ ações cancele o risco, e a fórmula foi construída para ser o custo da
          réplica. Se o cancelamento falhasse, a fórmula não seria o preço de nada. A identidade de (b) é a
          réplica deixando sua assinatura dentro da conta.</p>
        </div>
      </details>

      <aside class="box exercicio">
        <p class="tag">5. Quantas vezes rebalancear, se cada ajuste custa</p>
        <p>O código mede que a sobra típica é $A/\sqrt n$ com $A\approx6{,}5$. Suponha que cada rebalanceamento
        custe $c$ em taxas. (a) Escreva o custo total esperado como função de $n$. (b) Minimize e ache $n^*$.
        (c) Com $c=0{,}02$, calcule $n^*$ e o custo total, e compare com o prêmio de $10{,}45$. (d) O que esse
        resultado diz sobre a frase "no limite contínuo o hedge é perfeito"?</p>
      </aside>
      <details>
        <summary>Solução</summary>
        <div class="body">
          <p>(a) $f(n)=c\,n+A/\sqrt n$: o primeiro termo é a taxa, o segundo é o erro que você ainda carrega.</p>
          <p>(b) $f'(n)=c-\tfrac{A}{2}n^{-3/2}=0$ dá $n^{3/2}=A/(2c)$, isto é
          $n^*=\big(\tfrac{A}{2c}\big)^{2/3}$.</p>
          <p>(c) $n^*=(6{,}5/0{,}04)^{2/3}=(162{,}5)^{2/3}\approx30$ ajustes. O custo total é
          $0{,}02\cdot30+6{,}5/\sqrt{30}\approx0{,}60+1{,}19=1{,}79$, ou seja <b>$17\%$ do prêmio</b>. Não é
          pouco: a imperfeição do hedge é um custo de primeira ordem no negócio, não um detalhe.</p>
          <p>(d) Diz que o limite contínuo é uma idealização que o dinheiro não deixa alcançar. Matematicamente
          $n\to\infty$ leva o erro a zero; economicamente, $n\to\infty$ leva o custo a infinito. O ótimo fica
          num meio-termo em que <em>sobra erro</em>. A teoria descreve um ponto que ninguém pode ocupar, e ainda
          assim descreve bem a vizinhança dele — que é o que se pede de uma boa idealização.</p>
        </div>
      </details>

      <aside class="box exercicio">
        <p class="tag">6. De Black–Scholes para o calor, explicitamente</p>
        <p>Na EDP, substitua $x=\ln S$, $\tau=T-t$ e $C(S,t)=e^{-r\tau}w(x,\tau)$. (a) Mostre que $w$ satisfaz
        $w_\tau=\big(r-\tfrac{\sigma^2}{2}\big)w_x+\tfrac{\sigma^2}{2}w_{xx}$. (b) Agora ande junto com a
        deriva, pondo $y=x+\big(r-\tfrac{\sigma^2}{2}\big)\tau$, e obtenha a equação do calor pura. (c) Qual é o
        dado inicial, em $y$? (d) Escreva a solução como convolução com o núcleo gaussiano e diga, sem fazer a
        conta, por que ela tem que dar a fórmula com os dois $\Phi$.</p>
      </aside>
      <details>
        <summary>Solução</summary>
        <div class="body">
          <p>(a) Com $x=\ln S$ vale $S\partial_S=\partial_x$ e $S^2\partial_{SS}=\partial_{xx}-\partial_x$.
          Trocando $t$ por $\tau=T-t$ o sinal de $\partial_t$ vira, e o fator $e^{-r\tau}$ foi escolhido para
          comer o termo $-rC$ — é o exercício 1 da caixinha de Feynman–Kac, o desconto constante saindo para
          fora. Sobra $w_\tau=\big(r-\tfrac{\sigma^2}2\big)w_x+\tfrac{\sigma^2}2w_{xx}$.</p>
          <p>(b) Num referencial que anda com a deriva, o termo de transporte some:
          $w_\tau=\tfrac{\sigma^2}2w_{yy}$. É calor puro, com $D=\sigma^2/2$.</p>
          <p>(c) Em $\tau=0$, $w=C(S,T)=\max(S-K,0)=\max(e^{y}-K,0)$.</p>
          <p>(d) A solução é esse dado convoluído com a gaussiana de variância $\sigma^2\tau$. O dado tem duas
          parcelas — $e^y$ e $-K$ — vivendo só onde $e^y>K$. Convoluir a constante $K$ com a gaussiana sobre uma
          semirreta dá uma normal acumulada, e é de lá que vem $\Phi(d_2)$; convoluir $e^{y}$ com a gaussiana
          sobre a mesma semirreta dá outra acumulada, só que com o argumento deslocado de $\sigma^2\tau$ por
          causa do completamento de quadrado — e esse deslocamento é exatamente a diferença
          $d_1-d_2=\sigma\sqrt T$. Os dois $\Phi$ da fórmula são as duas parcelas do pagamento, cada uma
          integrada contra o mesmo núcleo do calor.</p>
        </div>
      </details>
"""

page(
    fname="black-scholes.html",
    title="Black–Scholes",
    h1="Black–Scholes: o preço é o custo da receita",
    lede="Quanto vale o direito de comprar amanhã por um preço combinado hoje? A resposta ingênua depende de "
         "quanto você acha que a ação vai subir — e é por isso que ela está errada. O preço certo sai de "
         "fabricar a opção com ações e dinheiro, e a deriva real some da conta.",
    meta='Ajuda ler antes: <a href="feynman-kac.html">A fórmula de Feynman–Kac</a> e '
         '<a href="eds-fokker-planck.html">Equações diferenciais estocásticas</a>. Leitura de uns 25 minutos.',
    body=BODY,
    prev=[("A fórmula de Feynman–Kac", "feynman-kac.html"),
          ("Equações diferenciais estocásticas e Fokker–Planck", "eds-fokker-planck.html"),
          ("A equação do calor na reta", "calor-reta.html")],
    nxt=[("A equação do calor na reta", "calor-reta.html"),
         ("O princípio do máximo", "principio-maximo.html"),
         ("Deriva, ruído e Fokker–Planck", "fokker-planck.html")],
    scripts='\n  <script src="../assets/bs-core.js"></script>\n'
            '  <script src="../assets/bs-demo.js"></script>\n'
            '  <script src="../assets/pyrunner.js"></script>\n',
)
