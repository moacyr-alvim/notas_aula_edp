"""O gerador infinitesimal: medido, em forma de matriz, e determinando o processo.

Tres experimentos:
  1. medir (L f)(x) por Monte Carlo e ver o compromisso: encolher t diminui o VIES mas
     aumenta o RUIDO, e existe um t otimo no meio;
  2. em espaco finito tudo e matriz: linhas de L somam zero, linhas de exp(tL) somam um,
     o semigrupo fecha, e levar a densidade para a frente = levar o premio para tras;
  3. o gerador determina o processo: a cadeia simulada bate com exp(tL).
"""
import math

import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(20261125)

# ---------------------------------------------- 1. medir o gerador por Monte Carlo
# Processo: Ornstein-Uhlenbeck  dX = -gama X dt + sigma dB, com gama = 1.2, sigma = 1.
# O gerador e  L f = -gama x f'(x) + (sigma^2/2) f''(x).
GAMA, SIGMA = 1.2, 1.0
D = SIGMA * SIGMA / 2


def f(x):
    return np.exp(-x * x / 2)


def f1(x):
    return -x * np.exp(-x * x / 2)


def f2(x):
    return (x * x - 1) * np.exp(-x * x / 2)


def gerador_exato(x):
    return -GAMA * x * f1(x) + D * f2(x)


def passo_exato(x, t, n):
    """Um sorteio de X_t dado X_0 = x, com a lei EXATA do Ornstein-Uhlenbeck."""
    m = x * math.exp(-GAMA * t)
    v = SIGMA ** 2 * (1 - math.exp(-2 * GAMA * t)) / (2 * GAMA)
    return m + math.sqrt(v) * rng.standard_normal(n)


X0, N = 0.8, 200_000
alvo = float(gerador_exato(np.array(X0)))
print(f"1. medir (L f)(x) em x = {X0}, com N = {N} sorteios")
print(f"   valor exato: L f = {alvo:.6f}")
print("        t        medido      erro")
ts = [10.0 ** k for k in (-0.5, -1, -1.5, -2, -2.5, -3, -3.5, -4)]
erros = []
for t in ts:
    amostra = f(passo_exato(X0, t, N))
    est = (amostra.mean() - float(f(np.array(X0)))) / t
    erros.append(abs(est - alvo))
    print(f"  {t:9.2e}  {est:11.5f}  {erros[-1]:9.5f}")
i_melhor = int(np.argmin(erros))
print(f"   melhor t = {ts[i_melhor]:.1e}, com erro {erros[i_melhor]:.5f}")
print("   t grande erra por VIES (o limite ainda nao chegou);")
print("   t pequeno erra por RUIDO (a diferenca some dentro do erro de Monte Carlo)")

# ------------------------------------------- 2. espaco finito: tudo vira matriz
# Uma cadeia de 4 estados. Fora da diagonal ficam as TAXAS de salto i -> j.
taxas = np.array([
    [0.0, 1.0, 0.0, 0.3],
    [0.5, 0.0, 1.2, 0.0],
    [0.0, 0.4, 0.0, 0.9],
    [0.7, 0.0, 0.6, 0.0],
])

L = taxas.copy()
np.fill_diagonal(L, 0.0)
########### complete: a diagonal do gerador. Fora dela estao as taxas de salto;
########### o que a diagonal precisa valer para a linha somar ZERO?  ##########
np.fill_diagonal(L, 0.0)


def expm(A, t, termos=24):
    """Exponencial de matriz por escalonamento e quadratura (sem scipy no Pyodide)."""
    norma = np.abs(A * t).sum(axis=1).max()
    e = max(0, int(math.ceil(math.log2(norma + 1))) + 1)
    B = A * t / (2 ** e)
    E = np.eye(A.shape[0])
    termo = np.eye(A.shape[0])
    for k in range(1, termos + 1):
        termo = termo @ B / k
        E = E + termo
    for _ in range(e):
        E = E @ E
    return E


print("\n2. em espaco finito, o gerador e uma matriz")
print("   L =")
for lin in L:
    print("      [" + "  ".join(f"{v:6.2f}" for v in lin) + "]")
soma_L = L.sum(axis=1)
print(f"   soma de cada linha de L: {np.array2string(soma_L, precision=3)}")
print(f"   maior |soma de linha| de L = {np.abs(soma_L).max():.2e}   (tem que ser zero)")

for t in (0.05, 1.0, 7.0):
    P = expm(L, t)
    print(f"   t = {t:4.2f}:  maior |soma de linha de exp(tL) - 1| = {np.abs(P.sum(axis=1) - 1).max():.2e}"
          f"   menor entrada = {P.min():.3e}")

P1, P2 = expm(L, 0.7), expm(L, 1.3)
print(f"   semigrupo: max|P(0,7)P(1,3) - P(2,0)| = {np.abs(P1 @ P2 - expm(L, 2.0)).max():.2e}")

h = 1e-6
print(f"   L = lim (P(t)-I)/t:  erro = {np.abs((expm(L, h) - np.eye(4)) / h - L).max():.2e}")

# a estacionaria: o vetor a ESQUERDA com pi L = 0
P_longo = expm(L, 40.0)
pi = P_longo[0] / P_longo[0].sum()
print(f"   estacionaria pi = {np.array2string(pi, precision=4)}")
print(f"   maior |pi L| = {np.abs(pi @ L).max():.2e}   (tem que ser zero)")

# adjuncao: densidade para a frente = premio para tras
rho0 = np.array([0.5, 0.2, 0.3, 0.0])
premio = np.array([1.0, -2.0, 0.5, 3.0])
Pt = expm(L, 1.1)
frente = (rho0 @ Pt) @ premio
tras = rho0 @ (Pt @ premio)
print(f"   adjuncao: frente = {frente:.10f}, tras = {tras:.10f}, dif = {abs(frente-tras):.2e}")

# ------------------------------------ 3. o gerador determina o processo
# Simula a cadeia a tempo continuo: espera um tempo exponencial e salta.
def simula(L, estado0, T, n_and):
    estado = np.full(n_and, estado0)
    agora = np.zeros(n_and)
    taxa_saida = np.maximum(-np.diag(L), 1e-12)
    for _ in range(200):
        vivos = agora < T
        if not vivos.any():
            break
        idx = np.nonzero(vivos)[0]
        espera = rng.exponential(1.0 / taxa_saida[estado[idx]])
        novo_tempo = agora[idx] + espera
        salta = novo_tempo < T                       # so salta quem nao estourou T
        agora[idx] = novo_tempo
        pulando = idx[salta]
        if pulando.size:
            u = rng.random(pulando.size)
            prob = L[estado[pulando]].copy()
            np.put_along_axis(prob, estado[pulando][:, None], 0.0, axis=1)
            prob = prob / prob.sum(axis=1, keepdims=True)
            estado[pulando] = (u[:, None] < np.cumsum(prob, axis=1)).argmax(axis=1)
    return estado


T_SIM, N_AND = 1.5, 40_000
estados = simula(L, 0, T_SIM, N_AND)
empirico = np.bincount(estados, minlength=4) / N_AND
previsto = expm(L, T_SIM)[0]
print(f"\n3. a cadeia simulada contra exp(tL), em t = {T_SIM} ({N_AND} andarilhos, todos saindo do estado 0)")
print(f"   simulado: {np.array2string(empirico, precision=4)}")
print(f"   previsto: {np.array2string(previsto, precision=4)}")
print(f"   maior diferenca = {np.abs(empirico - previsto).max():.4f}")

# ------------------------------------------------------------------ figuras
fig, ax = plt.subplots(1, 3, figsize=(13.5, 3.8))

ax[0].loglog(ts, erros, "o-", color="C0", label="erro medido")
tt = np.array(ts)
ax[0].loglog(tt, erros[0] * (tt / tt[0]), "--", color="0.6", label="viés $\\propto t$")
ax[0].loglog(tt, erros[-1] * (tt / tt[-1]) ** -0.5, ":", color="C3", label="ruído $\\propto t^{-1/2}$")
ax[0].set_title("medir o gerador: há um $t$ ótimo")
ax[0].set_xlabel("$t$"); ax[0].set_ylabel("erro"); ax[0].legend(fontsize=8)

tg = np.linspace(0, 6, 120)
dens = np.array([rho0 @ expm(L, t) for t in tg])
for j in range(4):
    ax[1].plot(tg, dens[:, j], lw=1.8, label=f"estado {j}")
    ax[1].axhline(pi[j], ls="--", lw=0.8, color="0.6")
ax[1].set_title("a densidade caminhando para $\\pi$")
ax[1].set_xlabel("$t$"); ax[1].set_ylabel("probabilidade"); ax[1].legend(fontsize=7, ncol=2)

larg = 0.38
ax[2].bar(np.arange(4) - larg / 2, empirico, larg, color="C0", label="cadeia simulada")
ax[2].bar(np.arange(4) + larg / 2, previsto, larg, color="C3", alpha=0.8, label="$\\exp(tL)$")
ax[2].set_title(f"o gerador prevê o processo ($t={T_SIM}$)")
ax[2].set_xlabel("estado"); ax[2].set_xticks(range(4)); ax[2].legend(fontsize=8)

fig.tight_layout()
plt.show()
