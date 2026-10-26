import numpy as np
import matplotlib.pyplot as plt

# --- Parâmetros do Problema ---
L = 3.0       # Comprimento do domínio
T_final = 1.5 # Tempo total de simulação
c = 1.0       # Velocidade de propagação (c > 0, onda vai para a direita)

# --- Discretização ---
nx = 300         # Número de pontos no espaço
dx = L / (nx - 1) # Tamanho do passo espacial
nt = 150        # Número de passos de tempo
dt = T_final / nt # Tamanho do passo de tempo

# --- Condição Inicial (Onda Quadrada / Pulso Retangular) ---
x = np.linspace(0, L, nx)
u_initial = np.zeros(nx)
# Cria uma onda quadrada entre x = 0.5 e x = 0.7
u_initial[np.where((x >= 0.5) & (x <= 0.7))] = 1.0

# -----------------------------------------------------------------------------
# -- Esquema de Diferença Central
# -----------------------------------------------------------------------------
def central_difference_scheme(u_initial, c, dx, dt, nt):
    u = u_initial.copy()
    for _ in range(nt):
        u_next = u.copy()
        for i in range(1, nx - 1):
            ########### complete a próxima linha ##########
            u_next[i] = u[i] # + ....
        u = u_next
    return u

# -----------------------------------------------------------------------------
# -- Esquema de Diferença para a Esquerda (Backward Difference - UPWIND para c>0)
# -----------------------------------------------------------------------------
def backward_difference_scheme(u_initial, c, dx, dt, nt):
    u = u_initial.copy()
    for _ in range(nt):
        u_next = u.copy()
        for i in range(1, nx):
            ########### complete a próxima linha ##########
            u_next[i] = u[i] # + ....
        u = u_next
    return u

# -----------------------------------------------------------------------------
# -- Esquema de Diferença para a Direita (Forward Difference - DOWNWIND para c>0)
# -----------------------------------------------------------------------------
def forward_difference_scheme(u_initial, c, dx, dt, nt):
    u = u_initial.copy()
    for _ in range(nt):
        u_next = u.copy()
        for i in range(0, nx - 1):
            ########### complete a próxima linha ##########
            u_next[i] = u[i] # + ....
        u = u_next
    return u

# --- Executar as simulações ---
u_central_final = central_difference_scheme(u_initial, c, dx, dt, nt)
u_backward_final = backward_difference_scheme(u_initial, c, dx, dt, nt)
u_forward_final = forward_difference_scheme(u_initial, c, dx, dt, nt)

# --- Resumo numérico (ajuda a ver o que os gráficos escondem) ---
print(f"lambda = c*dt/dx = {c*dt/dx:.3f}")
for nome, v in [("central ", u_central_final), ("esquerda", u_backward_final), ("direita ", u_forward_final)]:
    print(f"{nome}: min = {v.min():.3g}   max = {v.max():.3g}")

# --- Visualização dos Resultados ---
fig, (ax1, ax2, ax3) = plt.subplots(1, 3, figsize=(18, 6))

# Plot 1: Diferença Central
ax1.plot(x, u_initial, label='Condição Inicial', color='blue')
ax1.plot(x, u_central_final, label='Diferença Central', color='red')
ax1.set_title("Esquema Central", fontsize=14)
ax1.set_xlabel("x")
ax1.set_ylabel("u(x,t)")
ax1.legend()
ax1.grid(True)
ax1.set_ylim(-1.0, 1.5)

# Plot 2: Diferença para a Esquerda (Upwind)
ax2.plot(x, u_initial, label='Condição Inicial', color='blue')
ax2.plot(x, u_backward_final, label='Diferença Esquerda', color='green')
ax2.set_title("Esquema Backward (Upwind - Estável)", fontsize=14)
ax2.set_xlabel("x")
ax2.set_ylabel("u(x,t)")
ax2.legend()
ax2.grid(True)
ax2.set_ylim(-1.0, 1.5)

# Plot 3: Diferença para a Direita (Downwind)
ax3.plot(x, u_initial, label='Condição Inicial', color='blue')
ax3.plot(x, u_forward_final, label='Diferença Direita', color='purple')
ax3.set_title("Esquema Forward (Downwind - Instável)", fontsize=14)
ax3.set_xlabel("x")
ax3.set_ylabel("u(x,t)")
ax3.legend()
ax3.grid(True)
ax3.set_ylim(-1.0, 1.5)

plt.suptitle("Esquemas de Diferença Finitas para a Equação de Transporte", fontsize=16)
plt.tight_layout(rect=[0, 0, 1, 0.95])
plt.show()