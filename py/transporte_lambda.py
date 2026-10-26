import numpy as np
import matplotlib.pyplot as plt

# Upwind (diferença à esquerda) para u_t + c u_x = 0, com várias razões lambda = c*dt/dx.
# Tente mudar a lista `lams`: o que acontece logo abaixo e logo acima de 1?
lams = [0.5, 1.0, 1.2]

c = 1.0
L, T_final, nx = 3.0, 1.5, 300
dx = L / (nx - 1)
x = np.linspace(0, L, nx)
u0 = np.where((x >= 0.5) & (x <= 0.7), 1.0, 0.0)

def upwind(u0, lam, nt):
    u = u0.copy()
    for _ in range(nt):
        u[1:] = u[1:] - lam * (u[1:] - u[:-1])   # o lado direito usa só valores antigos
    return u

fig, axs = plt.subplots(1, len(lams), figsize=(5.2 * len(lams), 4.2))
axs = np.atleast_1d(axs)
for ax, lam in zip(axs, lams):
    dt = lam * dx / c
    nt = int(round(T_final / dt))
    T = nt * dt
    u = upwind(u0, lam, nt)
    exata = np.where((x - c * T >= 0.5) & (x - c * T <= 0.7), 1.0, 0.0)
    print(f"lambda = {lam:<5} passos = {nt:<4} min = {u.min():.3g}  max = {u.max():.3g}")
    ax.plot(x, exata, "k--", lw=1, label="solução exata")
    ax.plot(x, u, color="tab:green", label="upwind")
    ax.set_title(f"lambda = {lam}")
    ax.set_ylim(-0.3, 1.4)
    ax.grid(True)
    ax.legend()
plt.tight_layout()
plt.show()
