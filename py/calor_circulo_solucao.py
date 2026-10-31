import numpy as np
import matplotlib.pyplot as plt

# Calor no círculo:  u_t = u_xx,  x em [0, 2pi),  condição periódica.
N = 128
x = 2 * np.pi * np.arange(N) / N
k = np.fft.fftfreq(N, d=1.0 / N)            # 0, 1, ..., N/2-1, -N/2, ..., -1

# --- a solução espectral: transformar, multiplicar por e^{-k^2 t}, voltar
def espectral(u0, t):
    return np.real(np.fft.ifft(np.fft.fft(u0) * np.exp(-k ** 2 * t)))

# --- diferenças finitas explícitas, para comparar (r = dt/dx^2 <= 1/2)
def dif_finitas(u0, t, r=0.4):
    dx = 2 * np.pi / N
    n = int(np.ceil(t / (r * dx ** 2)))
    dt = t / n
    lam = dt / dx ** 2
    u = u0.copy()
    for _ in range(n):
        u = u + lam * (np.roll(u, -1) - 2 * u + np.roll(u, 1))
    return u, n

# --- dado com solução exata conhecida: cada modo decai com a sua taxa
u0 = np.cos(x) + 0.5 * np.sin(3 * x)
exata = lambda t: np.exp(-t) * np.cos(x) + 0.5 * np.exp(-9 * t) * np.sin(3 * x)

T = 0.3
ue = espectral(u0, T)
uf, passos = dif_finitas(u0, T)
ux = exata(T)
print(f"erro espectral        = {np.max(np.abs(ue - ux)):.2e}   (1 passo)")
print(f"erro diferencas finitas = {np.max(np.abs(uf - ux)):.2e}   ({passos} passos)")

plt.figure(figsize=(7, 3.6))
plt.plot(x, u0, "--", lw=1.4, label="t = 0")
plt.plot(x, ux, lw=2.6, label=f"exata em t = {T}")
plt.plot(x, ue, lw=1.2, label="espectral")
plt.plot(x, uf, ":", lw=1.8, label="diferenças finitas")
plt.xlabel("x"); plt.ylabel("u"); plt.legend(fontsize=8)
plt.title("Modo 1 decai como e^{-t}; modo 3, como e^{-9t}")

# --- suavização instantânea: partindo de um degrau
caixa = np.where((x > 2) & (x < 4), 1.0, 0.0)   # um degrau duplo: vale 1 entre x = 2 e x = 4
plt.figure(figsize=(7, 3.6))
for t in (0.0, 1e-3, 1e-2, 1e-1):
    plt.plot(x, espectral(caixa, t), lw=1.8, label=f"t = {t:g}")
plt.xlabel("x"); plt.ylabel("u"); plt.legend(fontsize=8)
plt.title("A caixa vira suave assim que t > 0, e tende à média")

# --- energia e decaimento para a média (Parseval)
c = np.fft.fft(caixa) / N                   # coeficientes c_k
media = c[0].real
for t in (0.0, 0.1, 0.5, 1.0, 2.0):
    u = espectral(caixa, t)
    print(f"t = {t:4.1f}   energia = {np.mean(u ** 2):7.4f}   max|u - média| = {np.max(np.abs(u - media)):.4f}")
