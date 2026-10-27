import numpy as np
import matplotlib.pyplot as plt

# Um grafo pequeno: 6 vértices e 6 arestas. Cada aresta recebe uma orientação i -> j.
n = 6
arestas = [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (1, 4)]
m = len(arestas)
c = 1.0   # condutância

# --- Matriz de incidência B (m x n): a linha da aresta i -> j tem -1 na coluna i e +1 na coluna j
B = np.zeros((m, n))
for e, (i, j) in enumerate(arestas):
    B[e, i] = -1
    B[e, j] = +1

# --- Laplaciano do grafo
L = B.T @ B

# --- Dado inicial: toda a "quantidade" concentrada no vértice 0
u0 = np.zeros(n)
u0[0] = 1.0

# --- Solução pela decomposição espectral:  L = Q diag(lam) Q'
lam, Q = np.linalg.eigh(L)

def u_em(t):
    # u(t) = Q exp(-c lam t) Q' u0
    return Q @ (np.exp(-c * lam * t) * (Q.T @ u0))

print("L =\n", L.astype(int))
print("autovalores de L:", np.round(lam, 4) + 0.0)
for t in (0, 1, 5, 50):
    u = u_em(t)
    print(f"t = {t:>2}: soma de u = {u.sum():.4f}   u = {np.round(u, 3) + 0.0}")

ts = np.linspace(0, 6, 200)
U = np.array([u_em(t) for t in ts])
for i in range(n):
    plt.plot(ts, U[:, i], label=f"vértice {i}")
plt.axhline(1 / n, color="k", ls=":", lw=1)
plt.xlabel("t"); plt.ylabel("u_i(t)"); plt.legend(); plt.title("Difusão no grafo")
plt.show()
