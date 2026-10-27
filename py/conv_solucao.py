import numpy as np
import matplotlib.pyplot as plt

# ---------------------------------------------------------------------------
# Convolução pela regra "os índices somam": u[m] * v[l] contribui para z[m + l]
# ---------------------------------------------------------------------------
def conv_linear(u, v):
    z = np.zeros(len(u) + len(v) - 1)
    for m in range(len(u)):
        for l in range(len(v)):
            z[m + l] += u[m] * v[l]
    return z

def conv_circular(u, v, N):
    z = np.zeros(N)
    for m in range(len(u)):
        for l in range(len(v)):
            z[(m + l) % N] += u[m] * v[l]      # o índice dá a volta
    return z

# 1) Produto de polinômios: (1 + 2x + 3x^2)(4 + 5x)
p, q = [1, 2, 3], [4, 5]
print("polinômios :", conv_linear(p, q), "  (np.convolve:", np.convolve(p, q), ")")

# 2) Soma de dois dados honestos: P(X+Y = s) é a convolução das probabilidades
dado = np.ones(6) / 6                       # índice i <-> face i+1
soma = conv_linear(dado, dado)              # índice k <-> soma k+2
print("P(soma = 7):", round(soma[5], 4), " (esperado 6/36 =", round(6 / 36, 4), ")")

# 3) Linear x circular: o mesmo par de vetores, dois "chutes" fora da janela
u, v = [1, 2, 3, 4], [1, 1, 1]
print("linear   :", conv_linear(u, v))
print("circular :", conv_circular(u, v, 4), "  <- a linear dobrada (módulo 4)")

# 4) Filtros de áudio: um sinal com ruído e dois núcleos
rng = np.random.default_rng(0)
t = np.linspace(0, 1, 400)
x = np.sin(2 * np.pi * 3 * t) + 0.4 * rng.standard_normal(400)
media = np.ones(15) / 15                    # média móvel de 15 pontos: suaviza
eco = np.zeros(80); eco[0] = 1; eco[-1] = 0.6   # o som mais uma cópia atrasada

suave = conv_linear(x, media)[7:7 + 400]    # recorta para alinhar com x
com_eco = conv_linear(x, eco)[:400]

fig, ax = plt.subplots(1, 2, figsize=(10, 3.4), sharey=True)
ax[0].plot(t, x, color="0.7", label="sinal com ruído"); ax[0].plot(t, suave, "k", label="média móvel")
ax[0].set_title("filtro que suaviza"); ax[0].legend(loc="lower left")
ax[1].plot(t, x, color="0.7", label="original"); ax[1].plot(t, com_eco, "C3", label="com eco")
ax[1].set_title("filtro de eco"); ax[1].legend(loc="lower left")
plt.tight_layout(); plt.show()
