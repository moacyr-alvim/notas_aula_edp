import numpy as np
import matplotlib.pyplot as plt

# =============== 1. Fokker-Planck com um potencial ===============
# rho_t = -(a rho)_x + (D rho)_xx  em forma de fluxo:  rho_t + J_x = 0,  J = a rho - (D rho)_x
def relaxa(a_fun, D_fun, L, N, T, dt_fator=0.25):
    """evolui ate relaxar, com fluxo zero nas bordas (nada entra, nada sai)"""
    y = np.linspace(-L, L, N)
    dy = y[1] - y[0]
    face = 0.5 * (y[:-1] + y[1:])            # as faces entre celulas vizinhas
    af, Dc = a_fun(face), D_fun(y)
    dt = min(dt_fator * dy * dy / Dc.max(), 0.4 * dy / max(np.abs(af).max(), 1e-9))
    rho = np.exp(-y ** 2 / 2); rho /= rho.sum() * dy
    for _ in range(int(T / dt)):
        g = Dc * rho
        # --- o fluxo nas faces: transporte menos a derivada de (D rho)
        J = af * 0.5 * (rho[:-1] + rho[1:]) - (g[1:] - g[:-1]) / dy
        J = np.concatenate(([0.0], J, [0.0]))
        rho = rho - dt * (J[1:] - J[:-1]) / dy
    return y, rho, dy

V = lambda z: (z ** 2 - 1) ** 2              # poco duplo: dois minimos em z = +-1
dV = lambda z: 4 * z * (z ** 2 - 1)
Dp = 0.3
y, rho, dy = relaxa(lambda z: -dV(z), lambda z: Dp + 0 * z, L=2.0, N=201, T=30.0)
boltz = np.exp(-V(y) / Dp); boltz /= boltz.sum() * dy
print(f"\npoco duplo: erro max vs Boltzmann = {np.max(np.abs(rho - boltz)):.2e}")

plt.figure(figsize=(7, 3.6))
plt.plot(y, rho, lw=2.6, label="estacionario (numerico)")
plt.plot(y, boltz, "--", lw=1.8, label="exp(-V/D) normalizada")
plt.plot(y, V(y) / V(y).max() * rho.max(), ":", lw=1.4, label="o potencial V (reescalado)")
plt.xlabel("x"); plt.ylabel("rho"); plt.legend(fontsize=8)
plt.title("Equilibrio num poco duplo: a distribuicao de Boltzmann")

# =============== 2. sem vies nenhum, mas com D variavel ===============
Dvar = lambda z: 0.2 + 0.25 * (1 + np.tanh(2 * z))     # anda devagar a esquerda, rapido a direita
y2, rho2, dy2 = relaxa(lambda z: 0 * z, Dvar, L=3.0, N=201, T=40.0)
inv = 1.0 / Dvar(y2); inv /= inv.sum() * dy2
print(f"D variavel, sem vies: erro max vs 1/D = {np.max(np.abs(rho2 - inv)):.2e}")

plt.figure(figsize=(7, 3.6))
plt.plot(y2, rho2, lw=2.6, label="estacionario (numerico)")
plt.plot(y2, inv, "--", lw=1.8, label="proporcional a 1/D")
plt.plot(y2, Dvar(y2) / Dvar(y2).max() * rho2.max(), ":", lw=1.4, label="D(x) (reescalado)")
plt.xlabel("x"); plt.ylabel("rho"); plt.legend(fontsize=8)
plt.title("Sem deriva nenhuma, o caminhante se acumula onde anda devagar")
