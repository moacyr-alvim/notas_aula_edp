"""Feynman-Kac nos dois sentidos: a EDP resolvendo esperancas, e os caminhos resolvendo a EDP.

Tres experimentos:
  1. valor com desconto: diferencas finitas para trás  x  Monte Carlo com peso exp(-∫r);
  2. os problemas de saida: a chance de tocar L primeiro e o tempo medio ate parar,
     medidos no passeio da grade e comparados com x/L e x(L-x)/2D;
  3. a lei 1/sqrt(N): o erro do Monte Carlo contra o numero de caminhos.
"""
import math

import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(20240713)

D = 0.5          # difusao, ou seja sigma = 1
SIG = 1.0
T = 1.0          # vencimento
R = 1.5          # taxa de desconto (ou de morte) na zona de perigo
Phi = np.vectorize(lambda z: 0.5 * (1 + math.erf(z / math.sqrt(2))))   # sem scipy no Pyodide


def premio(x):
    """Degrau: paga 1 se terminar a direita de 0."""
    return np.where(x > 0, 1.0, 0.0)


def taxa(x):
    """A zona de perigo: desconta (ou mata) so a esquerda de 0."""
    return np.where(x < 0, R, 0.0)


# ---------------------------------------------------------------- 1. EDP para tras
# v_s = D v_xx - r(x) v  com  v(.,0) = g,  resolvida no tempo ate o vencimento s = T - t.
# A grade e deslocada de meio passo para nenhum ponto cair no salto do degrau.
XL, dx = 8.0, 0.02
xs = -XL + (np.arange(round(2 * XL / dx)) + 0.5) * dx
ds = 0.4 * dx * dx / D
passos = int(math.ceil(T / ds))
ds = T / passos
lam = D * ds / (dx * dx)

v = premio(xs)
fator = np.exp(-taxa(xs) * ds)      # o desconto entra MULTIPLICANDO: sobreviva o passo e siga
for _ in range(passos):
    novo = v.copy()
    novo[1:-1] = (v[1:-1] + lam * (v[2:] - 2 * v[1:-1] + v[:-2])) * fator[1:-1]
    novo[0], novo[-1] = 0.0, 1.0    # a 8 desvios, o premio so sofre o desconto (aqui r=0 a direita)
    v = novo


def edp_em(x):
    return np.interp(x, xs, v)


# ---------------------------------------------------------- 1b. Monte Carlo com peso
def monte_carlo(x0, s, n, npassos=200):
    """Media de exp(-∫r) * g(X_s) sobre n caminhos saindo de x0."""
    x = np.full(n, float(x0))
    dt = s / npassos
    peso = np.ones(n)
    for _ in range(npassos):
        ########### complete: o peso de Feynman-Kac, exp(-integral de r ao longo do caminho);
        ########### a cada passo o caminho sobrevive com probabilidade exp(-r(x) dt)  ##########
        peso *= 1.0
        x = x + SIG * math.sqrt(dt) * rng.standard_normal(n)
    paga = peso * premio(x)
    return paga.mean(), paga.std(ddof=1) / math.sqrt(n)


print("1. valor com desconto na zona de perigo (sem formula fechada)")
print("     x        EDP    Monte Carlo      erro    sigmas")
pior = 0.0
for x0 in (-1.0, -0.5, 0.0, 0.5, 1.0):
    m, e = monte_carlo(x0, T, 200_000)
    a = float(edp_em(x0))
    sig = abs(m - a) / max(e, 1e-12)
    pior = max(pior, sig)
    print(f"  {x0:5.2f}  {a:9.5f}  {m:11.5f}  {e:9.5f}  {sig:7.2f}")
print(f"  pior discordancia = {pior:.2f} sigmas")

const = 0.5          # a taxa usada no experimento 3, onde ha formula fechada para comparar

# --------------------------------------------------------- 2. os problemas de saida
# O passeio simetrico na grade 0..M com as pontas absorventes: aqui a conta discreta da
# a resposta continua EXATA, sem vies nenhum, e por isso o teste e limpo.
M, L = 20, 1.0
h = L / M
tau = h * h / (2 * D)
N = 40_000
print("\n2. problemas de saida no passeio da grade (h = %.3f, tau = %.4f)" % (h, tau))
print("     x    chance medida    x/L      tempo medido   x(L-x)/2D")
pior_u, pior_t, medidos = 0.0, 0.0, []
for j in (2, 6, 10, 14, 18):
    pos = np.full(N, j)
    vivo = np.ones(N, dtype=bool)
    passos_ate = np.zeros(N)
    n = 0
    while vivo.any() and n < 20000:
        n += 1
        salto = np.where(rng.random(vivo.sum()) < 0.5, 1, -1)
        pos[vivo] += salto
        passos_ate[vivo] = n
        vivo = vivo & (pos > 0) & (pos < M)
    u_med = float((pos >= M).mean())
    t_med = float((passos_ate * tau).mean())
    x = j * h
    u_exato, t_exato = x / L, x * (L - x) / (2 * D)
    pior_u = max(pior_u, abs(u_med - u_exato))
    pior_t = max(pior_t, abs(t_med - t_exato) / t_exato)
    medidos.append((x, u_med, t_med))
    print(f"  {x:4.2f}  {u_med:12.4f}  {u_exato:8.4f}  {t_med:14.4f}  {t_exato:10.4f}")
print(f"  erro max da chance = {pior_u:.4f}   erro relativo max do tempo = {pior_t:.4f}")

# ------------------------------------------------------------- 3. a lei 1/sqrt(N)
print("\n3. o erro do Monte Carlo contra o numero de caminhos (x = 0,2, r constante)")
xmc = 0.2
alvo3 = math.exp(-const * T) * float(Phi(np.array(xmc / math.sqrt(T))))


def mc_const(n):
    x = xmc + SIG * math.sqrt(T) * rng.standard_normal(n)
    return math.exp(-const * T) * premio(x).mean()


Ns = [250, 1000, 4000, 16000, 64000]
erros = []
for n in Ns:
    reps = np.array([mc_const(n) - alvo3 for _ in range(60)])
    erros.append(float(np.sqrt((reps ** 2).mean())))
    print(f"  N = {n:6d}   erro tipico = {erros[-1]:.5f}")
incl = float(np.polyfit(np.log(Ns), np.log(erros), 1)[0])
print(f"  inclinacao no log-log = {incl:.3f}   (a lei diz -0,5)")

# ------------------------------------------------------------------------ figuras
fig, ax = plt.subplots(1, 3, figsize=(13.5, 3.8))

dentro_plot = np.abs(xs) <= 3
ax[0].fill_between([-3, 0], 0, 1.05, color="tab:red", alpha=0.07)
ax[0].plot(xs[dentro_plot], premio(xs)[dentro_plot], "--", color="0.6", label="prêmio $g$")
ax[0].plot(xs[dentro_plot], v[dentro_plot], color="C0", lw=2, label="$v$ pela EDP")
xm = np.array([-1.0, -0.5, 0.0, 0.5, 1.0])
med = [monte_carlo(a, T, 50_000) for a in xm]
ax[0].errorbar(xm, [m for m, _ in med], yerr=[2 * e for _, e in med], fmt="o",
               color="C3", ms=5, capsize=3, label="Monte Carlo")
ax[0].set_title("valor com zona de perigo ($r=1{,}5$ em $x<0$)")
ax[0].set_xlabel("$x$"); ax[0].set_ylabel("$v(x,0)$"); ax[0].legend(fontsize=8)

xs2 = np.linspace(0, L, 60)
esc = L * L / (8 * D)                                   # para o tempo caber no mesmo eixo
ax[1].plot(xs2, xs2 / L, color="0.6", lw=1.5, label="$x/L$")
ax[1].plot(xs2, xs2 * (L - xs2) / (2 * D) / esc, "--", color="0.6", lw=1.5, label="$x(L-x)/2D$")
ax[1].plot([m[0] for m in medidos], [m[1] for m in medidos], "o", color="C0", ms=6, label="chance medida")
ax[1].plot([m[0] for m in medidos], [m[2] / esc for m in medidos], "s", color="C3", ms=6, label="tempo medido")
ax[1].set_title("saída: medido (pontos) x fórmula (linhas)")
ax[1].set_xlabel("$x$"); ax[1].set_ylabel("chance, e tempo em $L^2/8D$"); ax[1].legend(fontsize=8)

ax[2].loglog(Ns, erros, "o-", color="C0", label="erro medido")
ax[2].loglog(Ns, erros[0] * (np.array(Ns) / Ns[0]) ** -0.5, "--", color="0.6", label="$N^{-1/2}$")
ax[2].set_title(f"o erro cai como $N^{{{incl:.2f}}}$")
ax[2].set_xlabel("caminhos"); ax[2].set_ylabel("erro típico"); ax[2].legend(fontsize=8)

fig.tight_layout()
plt.show()
