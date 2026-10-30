import numpy as np
import matplotlib.pyplot as plt

# Queda livre, m = 1:  L(y, v) = v^2/2 - g y.  Caminho de y(0) = 0 a y(T) = 0.
g, T, N = 9.8, 2.0, 100
h = T / N
s = np.linspace(0, T, N + 1)

def acao(y):
    v = (y[1:] - y[:-1]) / h
    return np.sum(h * (v ** 2 / 2 - g * y[:-1]))

# --- gradiente: dA/dy_k = h L_y - [L_v(k) - L_v(k-1)],  com L_y = -g e L_v = v
def gradiente(y):
    v = (y[1:] - y[:-1]) / h
    gr = np.zeros_like(y)
    ########### complete: gr[1:-1] = -h*g - (v[1:] - v[:-1])   (os extremos ficam com zero) ##########
    return gr

# --- descida: y <- y - tau * grad,  estável enquanto tau/h <= 1/2
tau = 0.4 * h
y = np.zeros(N + 1)                          # começa na reta y = 0
marcos = [0, 200, 1000, 5000, 20000]
guardados = {0: y.copy()}
for it in range(1, max(marcos) + 1):
    ########### complete: um passo da descida, y = y - tau * gradiente(y) ##########
    if it in marcos:
        guardados[it] = y.copy()

y_ex = g / 2 * s * (T - s)                   # solução exata: ÿ = -g, y(0) = y(T) = 0
A_ex = -g ** 2 * T ** 3 / 24

plt.figure(figsize=(7, 3.8))
for it in marcos:
    plt.plot(s, guardados[it], lw=1.4, label=f"{it} passos")
plt.plot(s, y_ex, "k--", lw=2, label="exata")
plt.xlabel("s"); plt.ylabel("y"); plt.legend(fontsize=8)
plt.title("Descendo o gradiente da ação: a reta vira a parábola da queda livre")

for it in marcos:
    print(f"{it:6d} passos:  A = {acao(guardados[it]):10.4f}   erro máx = {np.max(np.abs(guardados[it] - y_ex)):.3e}")
print(f"        exata:  A = {A_ex:10.4f}")

# --- sem potencial (g = 0) o gradiente é o laplaciano do grafo caminho: difusão pura
rng = np.random.default_rng(0)
z = np.linspace(0, 1, N + 1) + 0.25 * rng.standard_normal(N + 1)
z[0], z[-1] = 0.0, 1.0
plt.figure(figsize=(7, 3.4))
plt.plot(s, z, lw=1.2, label="caminho inicial")
for it in range(1, 20001):
    lap = np.zeros_like(z)
    ########### complete: lap[1:-1] = z[2:] - 2*z[1:-1] + z[:-2] ##########
    z = z + (tau / h) * lap                  # = y - tau * grad, com grad = -lap/h
    if it in (50, 500, 20000):
        plt.plot(s, z, lw=1.4, label=f"{it} passos")
plt.xlabel("s"); plt.ylabel("y"); plt.legend(fontsize=8)
plt.title("Com g = 0 a descida é a equação do calor: o caminho estica até a reta")
print(f"\nsem potencial: distância máxima até a reta = {np.max(np.abs(z - np.linspace(0, 1, N + 1))):.3e}")
