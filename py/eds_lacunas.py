import numpy as np
import matplotlib.pyplot as plt

# ============ 1. Euler-Maruyama: simular a EDS e conferir contra a densidade da EDP ============
rng = np.random.default_rng(7)
M, T, passos = 20000, 1.0, 1000
dt = T / passos

def euler_maruyama(b, sig, x0, M, passos, dt, rng):
    """X <- X + b(X) dt + sig(X) sqrt(dt) Z,  com sig avaliado ANTES do passo (Ito)"""
    x = np.full(M, x0, dtype=float)
    raiz = np.sqrt(dt)
    for _ in range(passos):
        Z = rng.standard_normal(M)
        ########### complete: a deriva entra com dt.  E o ruido, com que potencia  ##########
        ########### de dt?  O erro classico esta escrito abaixo: rode e compare.   ##########
        x = x + b(x) * dt + sig(x) * dt * Z
    return x

exemplos = {
    # nome:            (b(x),                    sigma(x),              densidade exata em t = T)
    "so deriva":       (lambda z: -0.8 * z,      lambda z: 0 * z,       None),
    "browniano":       (lambda z: 0.7 + 0 * z,   lambda z: 0.75 + 0 * z, None),
    "Ornstein-Uhlen.": (lambda z: -0.8 * z,      lambda z: 0.75 + 0 * z, None),
}
x0 = 2.2
gauss = lambda z, m, v: np.exp(-(z - m) ** 2 / (2 * v)) / np.sqrt(2 * np.pi * v)

plt.figure(figsize=(7.4, 5.2))
for i, (nome, (b, sig, _)) in enumerate(exemplos.items(), 1):
    X = euler_maruyama(b, sig, -1.6 if nome == "browniano" else x0, M, passos, dt, rng)
    # media e variancia exatas da familia linear  dX = (mu - gamma X) dt + sigma dB
    if nome == "browniano":
        m, v = -1.6 + 0.7 * T, 0.75 ** 2 * T
    else:
        g, s2 = 0.8, (0.0 if nome == "so deriva" else 0.75 ** 2)
        m, v = x0 * np.exp(-g * T), s2 / (2 * g) * (1 - np.exp(-2 * g * T))
    print(f"{nome:17s} simulado: media {X.mean():+.4f}  variancia {X.var():.5f}   "
          f"exato: media {m:+.4f}  variancia {v:.5f}")
    plt.subplot(2, 2, i)
    if v > 1e-9:
        plt.hist(X, bins=50, density=True, alpha=0.45)
        z = np.linspace(m - 4 * np.sqrt(v), m + 4 * np.sqrt(v), 300)
        plt.plot(z, gauss(z, m, v), lw=2.2)
    else:
        plt.axvline(m, lw=2.2); plt.hist(X, bins=50, density=True, alpha=0.45)
    plt.title(nome, fontsize=9)

# --- browniano geometrico: a densidade e lognormal, e o logaritmo anda com mu - sigma^2/2
mu, sg, S0 = 0.45, 0.5, 1.0
S = euler_maruyama(lambda z: mu * z, lambda z: sg * z, S0, M, passos, dt, rng)
m_log, v_log = np.log(S0) + (mu - sg ** 2 / 2) * T, sg ** 2 * T
print(f"\nbrowniano geometrico: E[S] simulado {S.mean():.4f}, exato {S0*np.exp(mu*T):.4f}")
print(f"                      E[ln S] simulado {np.log(S).mean():+.4f}, exato {m_log:+.4f}"
      f"   (note o desconto de sigma^2/2 = {sg**2/2:.4f})")
plt.subplot(2, 2, 4)
plt.hist(S, bins=60, density=True, alpha=0.45)
z = np.linspace(1e-3, S.max(), 400)
plt.plot(z, gauss(np.log(z), m_log, v_log) / z, lw=2.2)
plt.title("browniano geometrico (lognormal)", fontsize=9)
plt.tight_layout()

# ============ 2. Ito contra Stratonovich, medido ============
# dX = sigma(X) dB num circulo, sem deriva nenhuma. Ito avalia sigma antes do passo;
# Stratonovich, no meio dele (com o MESMO sorteio). As densidades de equilibrio diferem.
L = 2 * np.pi
Dx = lambda z: 0.3 + 0.15 * np.sin(z)
sg2 = lambda z: np.sqrt(2 * Dx(z))
M2, dt2, T2 = 8000, 2e-3, 12.0
raiz = np.sqrt(dt2)
xi = rng.uniform(0, L, M2); xs = xi.copy()
for _ in range(int(T2 / dt2)):
    Z = rng.standard_normal(M2)
    xi = (xi + sg2(xi) * raiz * Z) % L                 # Ito
    meio = xs + sg2(xs) * raiz * Z / 2                 # Stratonovich: o mesmo Z, avaliado no meio
    xs = (xs + sg2(meio) * raiz * Z) % L

g = np.linspace(0, L, 31); c = 0.5 * (g[:-1] + g[1:])
print("\nerro medio de cada histograma contra D^(-alpha):")
print("                 alpha=1 (Ito)   alpha=1/2 (Strat)   alpha=0 (Fick)")
for nome, Xf in (("Ito         ", xi), ("Stratonovich", xs)):
    h, _ = np.histogram(Xf, bins=g, density=True)
    linha = []
    for al in (1.0, 0.5, 0.0):
        teor = Dx(c) ** (-al); teor /= np.trapezoid(teor, c)
        linha.append(np.mean(np.abs(h / teor - 1)))
    print(f"  {nome}   {linha[0]:.4f}          {linha[1]:.4f}              {linha[2]:.4f}")

plt.figure(figsize=(7, 3.6))
for nome, Xf, al in (("Ito", xi, 1.0), ("Stratonovich", xs, 0.5)):
    h, _ = np.histogram(Xf, bins=g, density=True)
    teor = Dx(c) ** (-al); teor /= np.trapezoid(teor, c)
    p = plt.plot(c, h, "o", ms=4, label=f"{nome} (medido)")[0]
    plt.plot(c, teor, lw=1.8, color=p.get_color(), label=f"D^(-{al})")
plt.plot(c, Dx(c) / Dx(c).max() * 0.1, ":", lw=1.4, color="k", label="D(x) (reescalado)")
plt.xlabel("x"); plt.ylabel("densidade de equilibrio"); plt.legend(fontsize=7, ncol=2)
plt.title("A mesma equacao, duas convencoes, dois equilibrios")
