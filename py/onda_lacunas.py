import numpy as np
import matplotlib.pyplot as plt

c = 2.0
x = np.linspace(-8, 8, 801)

# --- d'Alembert para u_tt = c^2 u_xx, u(x,0) = f(x), u_t(x,0) = g(x), com G' = g
def dalembert(f, G, x, t):
    ########### complete: 1/2 [f(x-ct) + f(x+ct)] + (G(x+ct) - G(x-ct)) / (2c) ##########
    return 0 * x

# --- Martelada: a corda parte do repouso (f = 0) e leva uma pancada g = 1 em [-1, 1]
f = lambda x: 0 * x
G = lambda w: np.clip(w + 1, 0, 2)          # G(w) = integral de g de -infinito até w

plt.figure(figsize=(7, 3.6))
for t in (0, 0.25, 0.5, 1, 2):
    plt.plot(x, dalembert(f, G, x, t), label=f"t = {t}")
plt.xlabel("x"); plt.ylabel("u"); plt.legend(); plt.title("Martelada: o patamar não volta a zero (c = 2)")

print("u(0,t) para t = 0.1, 0.25, 0.5, 1, 5:", [float(dalembert(f, G, 0.0, t)) for t in (0.1, 0.25, 0.5, 1, 5)])
print("patamar 1/c =", 1 / c)

# --- Conferindo que d'Alembert resolve a EDP (diferenças finitas) com dados suaves
f2 = lambda x: np.exp(-x ** 2)
G2 = lambda w: -0.5 * np.exp(-w ** 2)         # primitiva de g(x) = x exp(-x^2)
h = 1e-3
xs = np.linspace(-3, 3, 61); t0 = 0.7
U = lambda xx, tt: dalembert(f2, G2, xx, tt)
utt = (U(xs, t0 + h) - 2 * U(xs, t0) + U(xs, t0 - h)) / h ** 2
uxx = (U(xs + h, t0) - 2 * U(xs, t0) + U(xs - h, t0)) / h ** 2
print("max |u_tt - c^2 u_xx| =", float(np.max(np.abs(utt - c ** 2 * uxx))))
plt.show()
