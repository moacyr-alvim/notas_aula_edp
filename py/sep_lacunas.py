import numpy as np
import matplotlib.pyplot as plt

# Calor numa barra [0, L] com as pontas a 0:  u_t = k u_xx,  u(x,0) = f(x)
L, k = np.pi, 1.0
x = np.linspace(0, L, 401)
f = lambda x: np.where((x > L / 4) & (x < 3 * L / 4), 1.0, 0.0)      # caixa central

# --- coeficientes b_n = (2/L) * integral de f(x) sin(n pi x / L) dx   (regra do trapézio)
def coef(f, n, L, M=4000):
    xs = np.linspace(0, L, M + 1)
    ########### complete: 2/L vezes a integral (np.trapezoid(y, xs)) de f(xs) * sin(n pi xs / L) ##########
    return 0.0

# --- a série: soma de b_n e^{-k (n pi / L)^2 t} sin(n pi x / L)
def serie(x, t, b):
    n = np.arange(1, len(b) + 1)
    ########### complete: soma sobre n de b[n-1] * exp(-k (n pi / L)^2 t) * sin(n pi x / L) ##########
    return 0 * x

N = 60
b = np.array([coef(f, n, L) for n in range(1, N + 1)])

plt.figure(figsize=(7, 3.6))
for t in (0, 0.01, 0.05, 0.2, 0.6):
    plt.plot(x, serie(x, t, b), label=f"t = {t}")
plt.xlabel("x"); plt.ylabel("u"); plt.legend(); plt.title("Calor na barra: a caixa vira um morro suave")

# --- conferindo com diferenças finitas (esquema explícito, r = k dt / dx^2 <= 1/2)
nx = 201; dx = L / (nx - 1); dt = 0.4 * dx ** 2 / k; xs = np.linspace(0, L, nx)
v = f(xs); v[0] = v[-1] = 0.0
T = 0.2
for _ in range(int(round(T / dt))):
    v[1:-1] += k * dt / dx ** 2 * (v[2:] - 2 * v[1:-1] + v[:-2])
t_real = int(round(T / dt)) * dt
print("max |série - diferenças finitas| em t =", round(t_real, 4), ":", float(np.max(np.abs(serie(xs, t_real, b) - v))))
print("b_1..b_5 =", np.round(b[:5], 4))
plt.show()
