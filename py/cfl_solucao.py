import numpy as np
import matplotlib.pyplot as plt

# --- Implementação do Método Numérico ---
def solve_wave_equation(u_initial, c, L, T_final, dx, dt):
    nx = len(u_initial)
    
    # Cálculo do Número CFL e do termo constante do stencil
    cfl = c * dt / dx
    CFL_sq = cfl**2  # (c * dt / dx)^2
    
    # Determina o número de passos de tempo necessários
    nt = int(T_final / dt)
    
    # Inicializa as matrizes da solução
    u_past = u_initial.copy()
    u_present = u_initial.copy()
    u_future = np.zeros(nx)
    
    # 1. Primeiro Passo (usa a condição inicial de velocidade u_t = 0)
    # A atualização é feita ponto a ponto, respeitando as bordas (1 a nx-2)
    for i in range(1, nx - 1):
        # Fórmula do primeiro passo: u_i^1 = u_i^0 + 0.5 * (CFL)^2 * (u_{i+1}^0 - 2u_i^0 + u_{i-1}^0)
        u_present[i] = u_past[i] + 0.5 * CFL_sq * (u_past[i+1] - 2 * u_past[i] + u_past[i-1])

    # 2. Loop de Tempo Principal
    for j in range(1, nt):
        # A atualização é feita ponto a ponto, respeitando as bordas (1 a nx-2)
        for i in range(1, nx - 1):
            
            # --- Este é o ponto chave para o aluno completar no exercício ---
            u_future[i] = (2 * u_present[i] - u_past[i] + CFL_sq * (u_present[i+1] - 2 * u_present[i] + u_present[i-1]))
        
        # Atualiza os estados de tempo para o próximo passo
        u_past = u_present.copy()
        u_present = u_future.copy()
    
    return u_present, cfl

# -----------------------------------------------------------------------------
# --- Execução das simulações (Controle da Condição CFL) ---
# -----------------------------------------------------------------------------

# --- Execução das simulações (Controle da Condição CFL) ---
# (Manter o código de execução aqui para completude, embora a lógica seja a mesma)

# --- Parâmetros Físicos ---
L = 10.0      # Comprimento do domínio
c = 1.0       # Velocidade de propagação (constante)
T_final = 2.0 # Tempo final de simulação

# --- Discretização Espacial Base ---
nx = 500
dx = L / (nx - 1) 
x = np.linspace(0, L, nx)

# --- Condição Inicial (Onda Gaussiana) ---
# u(x,0): Posição inicial da onda
u_initial = np.exp(-((x - L / 2)**2) / 0.5)

# CASO 1: Condição CFL Satisfeita (CFL = 0.5)
dt_ok = 0.5 * dx / c 
final_solution_cfl_ok, cfl_ok = solve_wave_equation(u_initial, c, L, T_final, dx, dt_ok)

# CASO 2: Condição CFL Violada (CFL = 1.025)
dt_fail = 1.025 * dx / c
final_solution_cfl_fail, cfl_fail = solve_wave_equation(u_initial, c, L, T_final, dx, dt_fail)

# --- Resumo numérico ---
print(f"CFL satisfeita (lambda = {cfl_ok:.3f}):  max|u| = {np.abs(final_solution_cfl_ok).max():.3g}")
print(f"CFL violada    (lambda = {cfl_fail:.3f}):  max|u| = {np.abs(final_solution_cfl_fail).max():.3g}")

# --- Visualização dos Resultados ---
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 6))

# Plot 1: Condição CFL Satisfeita
ax1.plot(x, u_initial, label='Condição Inicial', color='blue')
ax1.plot(x, final_solution_cfl_ok, label=f'Solução Final (CFL={cfl_ok:.2f})', color='green')
ax1.set_title("CFL Satisfeita: (CFL <= 1)", fontsize=16)
ax1.set_xlabel("x")
ax1.set_ylabel("u(x,t)")
ax1.legend()
ax1.grid(True)
ax1.set_ylim(-1.5, 1.5)

# Plot 2: Condição CFL Violada
ax2.plot(x, u_initial, label='Condição Inicial', color='blue')
ax2.plot(x, final_solution_cfl_fail, label=f'Solução Final (CFL={cfl_fail:.2f})', color='red')
ax2.set_title("CFL Violada: (CFL > 1)", fontsize=16)
ax2.set_xlabel("x")
ax2.set_ylabel("u(x,t)")
ax2.legend()
ax2.grid(True)
ax2.set_ylim(-2.0, 2.0)

plt.suptitle("Impacto da Condição CFL na Equação da Onda (Implementação via Loop Explícito)", fontsize=20)
plt.tight_layout(rect=[0, 0, 1, 0.95])
plt.show()