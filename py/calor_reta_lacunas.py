import math
import numpy as np
import matplotlib.pyplot as plt

erf = np.vectorize(math.erf)          # a funcao erro vem da biblioteca padrao

# ============ u_t = D u_xx na reta, resolvida no espaco de Fourier ============
D = 0.25
L, N = 64.0, 1 << 13
x = -L + 2 * L * (np.arange(N) + 0.5) / N     # grade deslocada: o salto da caixa cai entre dois pontos
dx = x[1] - x[0]
k = 2 * np.pi * np.fft.fftfreq(N, d=dx)

def evolui(u0, t):
    """cada modo decai sozinho: uhat(k,t) = exp(-D k^2 t) uhat(k,0)"""
    ########### complete: o multiplicador que resolve a EDO em cada k ##########
    mult = np.ones_like(k)
    return np.real(np.fft.ifft(mult * np.fft.fft(u0)))

# --- dado inicial: uma caixa.  A solucao exata usa a funcao erro
caixa = (np.abs(x) < 1) * 1.0
exata = lambda t: 0.5 * (erf((x + 1) / np.sqrt(4 * D * t)) - erf((x - 1) / np.sqrt(4 * D * t)))

print("t      erro max (FFT vs erf)   massa        altura    largura sqrt(4Dt)")
for t in (0.05, 0.3, 1.0, 4.0):
    uf, ue = evolui(caixa, t), exata(t)
    print(f"{t:5.2f}  {np.max(np.abs(uf - ue)):.3e}            {np.sum(uf) * dx:.6f}   "
          f"{uf.max():.4f}    {np.sqrt(4 * D * t):.4f}")

plt.figure(figsize=(7, 3.6))
plt.plot(x, caixa, "--", lw=1.2, label="t = 0")
for t in (0.05, 0.3, 1.0, 4.0):
    plt.plot(x, evolui(caixa, t), lw=1.8, label=f"t = {t}")
plt.xlim(-8, 8); plt.xlabel("x"); plt.ylabel("u"); plt.legend(fontsize=8)
plt.title("A caixa vira lisa assim que t > 0, e achata como 1/sqrt(t)")

# ============ autossemelhanca: tudo colapsa num perfil so ============
plt.figure(figsize=(7, 3.6))
for t in (0.5, 2.0, 8.0, 32.0):
    e = np.sqrt(4 * D * t)
    plt.plot(x / e, e * evolui(caixa, t), lw=1.6, label=f"t = {t}")
xi = np.linspace(-4, 4, 400)
plt.plot(xi, 2 * np.exp(-xi ** 2) / np.sqrt(np.pi), "k--", lw=1.4, label="2 exp(-xi^2)/sqrt(pi)")
plt.xlim(-4, 4); plt.xlabel("xi = x / sqrt(4Dt)"); plt.ylabel("sqrt(4Dt) u"); plt.legend(fontsize=8)
plt.title("Reescalando, todas as curvas viram a mesma: o nucleo gaussiano")

# ============ a reta e o circulo: iguais no comeco, muito diferentes no fim ============
def no_circulo(t, voltas=8):
    s = np.zeros_like(x)
    for m in range(-voltas, voltas + 1):
        s += 0.5 * (erf((x + 2 * np.pi * m + 1) / np.sqrt(4 * D * t))
                    - erf((x + 2 * np.pi * m - 1) / np.sqrt(4 * D * t)))
    return s

media = 2 / (2 * np.pi)
uma_volta = np.abs(x) <= np.pi            # no circulo so faz sentido olhar um periodo
# o desvio deve cair como o primeiro harmonico: 2|c_1| exp(-D t), com c_1 = sen(1)/pi
c1 = np.sin(1.0) / np.pi
print("\nt       max|u| na reta    max|u - media| no circulo    2|c1| exp(-Dt)")
for t in (0.1, 1.0, 5.0, 10.0, 20.0):
    desvio = np.max(np.abs(no_circulo(t)[uma_volta] - media))
    print(f"{t:5.1f}   {exata(t).max():.6f}          {desvio:.3e}                 {2 * c1 * np.exp(-D * t):.3e}")

plt.figure(figsize=(7, 3.6))
for t, cor in zip((0.1, 2.0, 10.0), ("C0", "C1", "C2")):
    plt.plot(x, exata(t), cor, lw=2.2, label=f"reta, t = {t}")
    plt.plot(x, no_circulo(t), cor + "--", lw=1.4, label=f"circulo, t = {t}")
plt.axhline(media, color="k", ls=":", lw=1.2, label="media no circulo")
plt.xlim(-9, 9); plt.xlabel("x"); plt.ylabel("u"); plt.legend(fontsize=7, ncol=2)
plt.title("O circulo e a reta enrolada: so se separam quando a nuvem da a volta")
