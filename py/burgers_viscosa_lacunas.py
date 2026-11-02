import numpy as np
import matplotlib.pyplot as plt

# Burgers viscosa periódica:  u_t + u u_x = eps u_xx,  x em [0, 2pi),  u(x,0) = sen(x).
# Sem viscosidade, as características se cruzariam em t* = 1, em x = pi.
N = 256
x = 2 * np.pi * np.arange(N) / N
k = np.fft.fftfreq(N, d=1.0 / N)
mascara = np.abs(k) < N / 3          # antirrecobrimento (regra dos 2/3): o produto u² duplica as frequências

def rhs(u, eps):
    # -(u²/2)_x  +  eps u_xx,  com o produto feito no espaço físico e a derivada no espectro
    ########### complete: nao_linear = -0.5j * k * fft(u*u) * mascara ##########
    nao_linear = 0 * k
    return np.real(np.fft.ifft(nao_linear - eps * k ** 2 * np.fft.fft(u)))

def pseudoespectral(u0, T, eps, dt=1e-3):
    u = u0.copy()
    for _ in range(int(round(T / dt))):          # Runge-Kutta de 4ª ordem
        a = rhs(u, eps); b = rhs(u + dt / 2 * a, eps)
        c = rhs(u + dt / 2 * b, eps); d = rhs(u + dt * c, eps)
        u = u + dt / 6 * (a + 2 * b + 2 * c + d)
    return u

# --- a mesma solução por Cole-Hopf: u = -2 eps (ln phi)_x, com phi resolvendo o calor
def cole_hopf(u0, T, eps):
    F0 = np.real(np.fft.ifft(np.where(k == 0, 0, np.fft.fft(u0) / (1j * np.where(k == 0, 1, k)))))
    F0 = F0 - F0.min()                            # primitiva de u0 (média livre; subtrair o mínimo evita estouro)
    phi0 = np.exp(-F0 / (2 * eps))
    phi = np.real(np.fft.ifft(np.fft.fft(phi0) * np.exp(-eps * k ** 2 * T)))
    phi_x = np.real(np.fft.ifft(1j * k * np.fft.fft(phi0) * np.exp(-eps * k ** 2 * T)))
    ########### complete: u = -2 eps phi_x / phi ##########
    return 0 * phi

u0 = np.sin(x)
eps = 0.05
for T in (0.5, 1.0, 1.5):
    up, uc = pseudoespectral(u0, T, eps), cole_hopf(u0, T, eps)
    print(f"T = {T:.1f}   maior diferença entre pseudoespectral e Cole-Hopf = {np.max(np.abs(up - uc)):.2e}")

plt.figure(figsize=(7, 3.8))
plt.plot(x, u0, "--", lw=1.4, label="t = 0")
for T in (0.5, 1.0, 1.5, 2.5):
    plt.plot(x, pseudoespectral(u0, T, eps), lw=1.8, label=f"t = {T}")
plt.xlabel("x"); plt.ylabel("u"); plt.legend(fontsize=8)
plt.title(f"Burgers viscosa, eps = {eps}: a frente se forma em t* = 1 e depois decai")

plt.figure(figsize=(7, 3.8))
for e in (0.1, 0.05, 0.02, 0.01):
    u = pseudoespectral(u0, 1.5, e)
    larg = 2 * np.max(np.abs(u)) / np.max(np.abs(np.real(np.fft.ifft(1j * k * np.fft.fft(u)))))
    plt.plot(x, u, lw=1.8, label=f"eps = {e:g}  (largura ≈ {larg:.2f})")
plt.xlabel("x"); plt.ylabel("u"); plt.legend(fontsize=8)
plt.title("Em t = 1,5, o choque viscoso afina proporcionalmente a eps")
