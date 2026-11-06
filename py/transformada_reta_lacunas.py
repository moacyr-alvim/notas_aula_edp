import numpy as np
import matplotlib.pyplot as plt

# ============ a transformada na reta, com a FFT ============
# convencao:  uhat(k) = integral de f(x) e^{-ikx} dx
L, N = 40.0, 1 << 15                  # dominio [-L, L] e numero de pontos
x = -L + 2 * L * np.arange(N) / N
dx = x[1] - x[0]
k = 2 * np.pi * np.fft.fftfreq(N, d=dx)

def transformada(f):
    """FFT -> integral: multiplica por dx e corrige a fase de a origem nao ser x = 0"""
    ########### complete: falta a correcao de fase.  A FFT supoe que a amostra  ##########
    ########### comeca em x = 0, e a nossa comeca em x[0] = -L                  ##########
    return dx * np.fft.fft(f)

w = 1.3
formas = {
    "caixa":       (lambda z: (np.abs(z) < w) * 1.0,
                    lambda q: np.where(np.abs(q) < 1e-12, 2 * w, 2 * np.sin(w * q) / np.where(q == 0, 1, q))),
    "triangulo":   (lambda z: np.maximum(0.0, 1 - np.abs(z) / w),
                    lambda q: np.where(np.abs(q) < 1e-6, w, 4 * np.sin(w * q / 2) ** 2 / (w * np.where(q == 0, 1, q) ** 2))),
    "exponencial": (lambda z: np.exp(-np.abs(z) / w),
                    lambda q: 2 * w / (1 + w * w * q * q)),
    "gaussiana":   (lambda z: np.exp(-z * z / (2 * w * w)),
                    lambda q: w * np.sqrt(2 * np.pi) * np.exp(-w * w * q * q / 2)),
}

ko = np.fft.fftshift(k)
plt.figure(figsize=(7.4, 5.6))
for i, (nome, (f, F)) in enumerate(formas.items(), 1):
    fx = f(x)
    num = np.fft.fftshift(transformada(fx))
    erro = np.max(np.abs(num - F(ko))) / np.max(np.abs(F(ko)))
    par = np.sum(np.abs(fx) ** 2) * dx, np.sum(np.abs(num) ** 2) * (k[1] - k[0]) / (2 * np.pi)
    print(f"{nome:12s} erro relativo da FFT = {erro:.2e}   Parseval: {par[0]:.4f} vs {par[1]:.4f}")
    plt.subplot(2, 2, i)
    plt.plot(ko, F(ko), lw=2.6, label="formula")
    plt.plot(ko, num.real, "--", lw=1.4, label="FFT")
    plt.xlim(-14, 14); plt.title(nome, fontsize=10); plt.legend(fontsize=7)
plt.tight_layout()

# ============ a gangorra: apertar em x alarga em k ============
def larguras(f, F):
    fx = f(x)
    dxx = np.sqrt(np.sum(x ** 2 * fx ** 2) * dx / (np.sum(fx ** 2) * dx))
    Fk = F(ko)
    dkk = np.sqrt(np.sum(ko ** 2 * Fk ** 2) / np.sum(Fk ** 2))
    return dxx, dkk

print()
ws = np.linspace(0.4, 3.0, 14)
plt.figure(figsize=(7, 3.6))
for nome in ("triangulo", "exponencial", "gaussiana"):
    prod = []
    for wi in ws:
        w = wi
        f, F = formas[nome]
        a, b = larguras(f, F)
        prod.append(a * b)
    plt.plot(ws, prod, "o-", ms=4, label=f"{nome} ({np.mean(prod):.3f})")
    print(f"{nome:12s} Dx*Dk = {np.mean(prod):.4f} +- {np.std(prod):.1e}")
w = 1.3
plt.axhline(0.5, ls="--", lw=1.4, color="k", label="minimo 1/2")
plt.xlabel("largura w"); plt.ylabel("Dx * Dk"); plt.legend(fontsize=8); plt.ylim(0.4, 0.8)
plt.title("O produto nao depende da largura: so da forma")

# ============ as caudas: quanto mais lisa a funcao, mais rapido uhat cai ============
plt.figure(figsize=(7, 3.6))
kk = ko[(ko > 0.5) & (ko < 60)]
for nome, (f, F) in formas.items():
    plt.loglog(kk, np.abs(F(kk)) + 1e-300, lw=1.8, label=nome)
plt.xlabel("k"); plt.ylabel("|uhat|"); plt.legend(fontsize=8); plt.ylim(1e-8, 10)
plt.title("Salto: 1/k.  Bico: 1/k^2.  Lisa: cai mais rapido que qualquer potencia")
