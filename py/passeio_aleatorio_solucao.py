import numpy as np
import matplotlib.pyplot as plt

# ============ M caminhantes na grade x = j h, com preguica ============
# a cada tique: direita com prob s/2, esquerda com s/2, parado com 1 - s
h, D, s = 0.05, 0.25, 0.5
T, M = 1.0, 20000

# --- o relogio: qual tau faz o passeio ter difusao D?
tau = h * h * s / (2 * D)

n = int(round(T / tau))
rng = np.random.default_rng(7)
x = np.zeros(M)
tempos, larguras = [], []
for k in range(1, n + 1):
    z = rng.random(M)
    x += h * (z < s / 2) - h * ((z >= s / 2) & (z < s))
    if k % max(1, n // 12) == 0:
        tempos.append(k * tau); larguras.append(x.std())
tempos, larguras = np.array(tempos), np.array(larguras)

print(f"h = {h}   tau = {tau:.5f}   n = {n} passos")
print(f"media    = {x.mean():+.4f}   (esperado 0)")
print(f"variancia = {x.var():.4f}   (2 D t = {2 * D * T:.4f})")
print(f"D medido = {x.var() / (2 * T):.4f}   (pedido {D})")

# --- a distribuicao contra a gaussiana
xs = np.linspace(-3, 3, 400)
gauss = np.exp(-xs ** 2 / (4 * D * T)) / np.sqrt(4 * np.pi * D * T)
plt.figure(figsize=(7, 3.6))
plt.hist(x, bins=60, density=True, alpha=0.5, label=f"{M} caminhantes")
plt.plot(xs, gauss, lw=2.4, label="gaussiana de variancia 2Dt")
plt.xlabel("x"); plt.ylabel("densidade"); plt.legend(fontsize=8)
plt.title(f"Depois de {n} passos de tamanho {h}")

# --- a lei da raiz quadrada
plt.figure(figsize=(7, 3.6))
plt.plot(tempos, larguras, "o", ms=5, label="largura medida")
plt.plot(tempos, np.sqrt(2 * D * tempos), lw=2, label="raiz de 2Dt")
plt.xlabel("t"); plt.ylabel("desvio padrao"); plt.legend(fontsize=8)
plt.title("A largura cresce como a raiz do tempo, nao como o tempo")

# --- a mesma coisa em log-log: a inclinacao 1/2 e a assinatura da difusao
inclin = np.polyfit(np.log(tempos), np.log(larguras), 1)[0]
print(f"inclinacao no log-log = {inclin:.4f}   (esperado 0,5)")
plt.figure(figsize=(7, 3.6))
plt.loglog(tempos, larguras, "o", ms=5, label=f"medido (inclinacao {inclin:.3f})")
plt.loglog(tempos, np.sqrt(2 * D * tempos), lw=2, label="inclinacao 1/2")
plt.xlabel("t"); plt.ylabel("desvio padrao"); plt.legend(fontsize=8)
plt.title("No log-log, difundir e uma reta de inclinacao 1/2")
