import numpy as np
import matplotlib.pyplot as plt

ell = 2 * np.pi     # comprimento do círculo
k = 0.2             # coeficiente de difusão do limite contínuo: u_t = k u_xx
s = 0.5             # largura da gaussiana inicial
T = 1.0

def laplaciano_ciclo(N):
    I = np.eye(N)
    # cada vértice liga ao vizinho da esquerda e da direita (o último liga ao primeiro)
    return 2 * I - np.roll(I, 1, axis=0) - np.roll(I, -1, axis=0)

def exata(x, t):
    # solução exata de u_t = k u_xx no círculo (série de Fourier da gaussiana)
    v = s * np.sqrt(2 * np.pi) / ell * np.ones_like(x)
    for m in range(1, 60):
        kap = 2 * np.pi * m / ell
        v += 2 * s * np.sqrt(2 * np.pi) / ell * np.exp(-(s**2 / 2 + k * t) * kap**2) * np.cos(kap * (x - ell / 2))
    return v

# --- 1) autovalores: c * lambda_m  contra  k (2 pi m / ell)^2
print("   N        c      m=1 (grafo)  m=1 (limite)   m=2 (grafo)  m=2 (limite)")
for N in (8, 16, 64, 256):
    h = ell / N
    c = k / h**2                        # a escala que mantém k fixo
    lam = np.linalg.eigvalsh(laplaciano_ciclo(N))
    a1, a2 = c * lam[1], c * lam[3]     # os autovalores aparecem em pares (m e N-m)
    print(f"{N:4d}  {c:9.1f}   {a1:10.4f}   {k*(2*np.pi/ell)**2:10.4f}   {a2:10.4f}   {k*(4*np.pi/ell)**2:10.4f}")

# --- 2) a solução em t = T para vários N, contra a exata
xx = np.linspace(0, ell, 400)
plt.plot(xx, exata(xx, T), "k", lw=2, label="u_t = k u_xx (exata)")
for N, mk in ((8, "s"), (16, "^"), (64, "o")):
    h = ell / N
    c = k / h**2
    x = h * np.arange(N)
    u0 = np.exp(-(x - ell / 2)**2 / (2 * s**2))
    lam, Q = np.linalg.eigh(laplaciano_ciclo(N))
    uT = Q @ (np.exp(-c * lam * T) * (Q.T @ u0))
    print(f"N = {N:3d}: erro máximo contra a exata = {np.max(np.abs(uT - exata(x, T))):.2e}")
    plt.plot(x, uT, mk, ms=5, label=f"grafo com N = {N}")
plt.xlabel("x"); plt.legend(); plt.title(f"t = {T}")
plt.show()
