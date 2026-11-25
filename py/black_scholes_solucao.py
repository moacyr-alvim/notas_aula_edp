"""Black-Scholes: a replica, a arvore e a deriva que nao importa.

Tres experimentos:
  1. a arvore binomial convergindo para a formula fechada, e a replica de um passo
     comparada com a conta ingenua (esperanca descontada com a probabilidade REAL);
  2. o erro do hedge dinamico contra o numero de rebalanceamentos: cai como 1/raiz(n);
  3. o coracao da coisa: coberto, o resultado nao depende de mu; nu, depende muito.
"""
import math

import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(20261125)

S0, K, r, SIG, T = 100.0, 100.0, 0.05, 0.20, 1.0


def erf_vec(x):
    """Funcao erro vetorizada, por serie de termos positivos (sem scipy no Pyodide)."""
    x = np.asarray(x, dtype=float)
    s = np.sign(x)
    z = np.minimum(np.abs(x), 6.0)          # alem de 6 a funcao erro ja e 1 ate 1e-17
    soma = z.copy()
    termo = z.copy()
    for n in range(1, 110):
        termo = termo * (2 * z * z / (2 * n + 1))
        soma = soma + termo
    return s * 2 / math.sqrt(math.pi) * np.exp(-z * z) * soma


def Phi(z):
    return 0.5 * (1 + erf_vec(np.asarray(z) / math.sqrt(2)))


def call(S, K, r, sig, T):
    """Preco da opcao de compra pela formula fechada."""
    S = np.asarray(S, dtype=float)
    T = np.asarray(T, dtype=float)
    saida = np.maximum(S - K, 0.0) * np.ones_like(S * T)
    vivo = T > 1e-12
    if np.any(vivo):
        v = sig * np.sqrt(np.where(vivo, T, 1.0))
        d1 = (np.log(S / K) + (r + sig * sig / 2) * T) / v
        d2 = d1 - v
        cheio = S * Phi(d1) - K * np.exp(-r * T) * Phi(d2)
        saida = np.where(vivo, cheio, saida)
    return saida


def delta(S, T):
    """A receita: quantas acoes segurar. E a derivada do preco em relacao a S."""
    T = np.maximum(T, 1e-12)
    d1 = (np.log(S / K) + (r + SIG * SIG / 2) * T) / (SIG * np.sqrt(T))
    return Phi(d1)


print("confere a funcao erro vetorizada contra math.erf:",
      f"{np.abs(erf_vec([-2.5, -0.3, 0.0, 0.7, 3.1]) - [math.erf(v) for v in [-2.5, -0.3, 0.0, 0.7, 3.1]]).max():.1e}")

C0 = float(call(S0, K, r, SIG, T))
print(f"\npreco pela formula: C = {C0:.4f}")

# ------------------------------------------------------- 1. a arvore binomial
print("\n1a. a replica num passo so (u = 1,2, d = 0,9, um ano)")
u, d, dt = 1.2, 0.9, 1.0
Su, Sd = S0 * u, S0 * d
Cu, Cd = max(Su - K, 0), max(Sd - K, 0)
dl = (Cu - Cd) / (Su - Sd)
caixa = math.exp(-r * dt) * (Cu - dl * Su)
preco_replica = dl * S0 + caixa
q = (math.exp(r * dt) - d) / (u - d)
print(f"  se subir: S = {Su:.0f}, a opcao paga {Cu:.0f};  se cair: S = {Sd:.0f}, paga {Cd:.0f}")
print(f"  a receita: delta = {dl:.4f} acoes e caixa = {caixa:.4f}")
print(f"  custo da receita = {preco_replica:.4f}")
print(f"  esperanca descontada com q = {q:.4f}: {math.exp(-r*dt)*(q*Cu+(1-q)*Cd):.4f}  (o mesmo numero)")
print("  a conta INGENUA, com a probabilidade real p, daria outro preco para cada crenca:")
for p in (0.3, 0.5, 0.7):
    print(f"    p = {p:.1f}  ->  {math.exp(-r*dt)*(p*Cu+(1-p)*Cd):.4f}")


def binomial(n):
    dtn = T / n
    un = math.exp(SIG * math.sqrt(dtn))
    dn = 1 / un
    qn = (math.exp(r * dtn) - dn) / (un - dn)
    desc = math.exp(-r * dtn)
    j = np.arange(n + 1)
    v = np.maximum(S0 * un ** (n - j) * dn ** j - K, 0.0)
    for _ in range(n):
        v = desc * (qn * v[:-1] + (1 - qn) * v[1:])
    return float(v[0])


print("\n1b. a arvore com n passos converge para a formula")
ns_arv = [10, 50, 200, 1000, 5000]
erros_arv = []
for n in ns_arv:
    v = binomial(n)
    erros_arv.append(abs(v - C0))
    print(f"  n = {n:5d}   arvore = {v:.4f}   erro = {erros_arv[-1]:.5f}")
print(f"  erro maximo da arvore em n = 5000: {erros_arv[-1]:.5f}")


# --------------------------------------------------- 2. o hedge dinamico
def hedge(n_rebal, n_cam, mu, semente):
    """Vende a opcao por C0, segura delta acoes e financia o resto em caixa.
    Devolve a sobra (carteira menos o que a opcao pagou) de cada caminho."""
    g = np.random.default_rng(semente)
    dtr = T / n_rebal
    S = np.full(n_cam, S0)
    dl = delta(S, T)
    caixa = C0 - dl * S
    for k in range(1, n_rebal + 1):
        z = g.standard_normal(n_cam)
        S = S * np.exp((mu - SIG * SIG / 2) * dtr + SIG * math.sqrt(dtr) * z)
        caixa = caixa * math.exp(r * dtr)
        if k < n_rebal:
            novo = delta(S, T - k * dtr)        # <<< a receita, recalculada
            caixa = caixa - (novo - dl) * S
            dl = novo
    carteira = dl * S + caixa
    return carteira - np.maximum(S - K, 0.0)


print("\n2. o erro do hedge contra o numero de rebalanceamentos (mu = 10%)")
ns_h = [1, 4, 16, 64, 256]
rms_h = []
for n in ns_h:
    e = hedge(n, 8000, 0.10, 1000 + n)
    rms_h.append(float(np.sqrt((e ** 2).mean())))
    print(f"  n = {n:4d}   sobra tipica = {rms_h[-1]:.4f}")
incl = float(np.polyfit(np.log(ns_h), np.log(rms_h), 1)[0])
print(f"  inclinacao no log-log = {incl:.3f}   (a lei diz -0,5)")

# ------------------------------------------- 3. coberto x nu, variando mu
print("\n3. o preco nao depende da deriva real mu (n = 250 rebalanceamentos)")
print("     mu      coberto: media   desvio      nu: media   desvio")
cobertos = {}
medias_cob, medias_nu = [], []
for mu in (-0.20, 0.00, 0.10, 0.30):
    e = hedge(250, 8000, mu, 777)
    g = np.random.default_rng(777)
    ST = S0 * np.exp((mu - SIG * SIG / 2) * T + SIG * math.sqrt(T) * g.standard_normal(8000))
    nu = C0 * math.exp(r * T) - np.maximum(ST - K, 0.0)
    cobertos[mu] = e
    medias_cob.append(float(e.mean()))
    medias_nu.append(float(nu.mean()))
    print(f"  {mu:+.2f}  {e.mean():14.4f}  {e.std():8.4f}  {nu.mean():13.4f}  {nu.std():8.4f}")
espalha_cob = max(medias_cob) - min(medias_cob)
espalha_nu = max(medias_nu) - min(medias_nu)
print(f"  coberto: as medias variam {espalha_cob:.4f} entre os mu")
print(f"  nu: as medias variam {espalha_nu:.4f} entre os mu")
print(f"  razao = {espalha_nu/max(espalha_cob,1e-12):.0f} vezes")

# ------------------------------------------------------------------ figuras
fig, ax = plt.subplots(1, 3, figsize=(13.5, 3.8))

ax[0].loglog(ns_arv, erros_arv, "o-", color="C0", label="erro da árvore")
ax[0].loglog(ns_arv, erros_arv[0] * (np.array(ns_arv) / ns_arv[0]) ** -1.0, "--", color="0.6", label="$1/n$")
ax[0].set_title("árvore binomial → fórmula")
ax[0].set_xlabel("passos da árvore"); ax[0].set_ylabel("erro"); ax[0].legend(fontsize=8)

ax[1].loglog(ns_h, rms_h, "o-", color="C0", label="sobra típica")
ax[1].loglog(ns_h, rms_h[0] * (np.array(ns_h) / ns_h[0]) ** -0.5, "--", color="0.6", label="$n^{-1/2}$")
ax[1].set_title(f"erro do hedge ~ $n^{{{incl:.2f}}}$")
ax[1].set_xlabel("rebalanceamentos"); ax[1].set_ylabel("sobra típica"); ax[1].legend(fontsize=8)

faixa = np.linspace(-12, 12, 70)
for mu, cor in ((-0.20, "C0"), (0.30, "C3")):
    ax[2].hist(cobertos[mu], bins=faixa, histtype="step", lw=1.8, color=cor,
               density=True, label=f"coberto, $\\mu={mu:+.0%}$".replace("%", r"\%"))
g = np.random.default_rng(777)
ST = S0 * np.exp((0.30 - SIG * SIG / 2) * T + SIG * math.sqrt(T) * g.standard_normal(8000))
ax[2].hist(C0 * math.exp(r * T) - np.maximum(ST - K, 0.0), bins=faixa, histtype="step",
           lw=1.2, color="0.5", density=True, label="nu, $\\mu=+30\\%$")
ax[2].set_title("coberto: $\\mu$ não importa")
ax[2].set_xlabel("sobra no vencimento"); ax[2].legend(fontsize=7)

fig.tight_layout()
plt.show()
