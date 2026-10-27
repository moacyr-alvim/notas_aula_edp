import numpy as np
import matplotlib.pyplot as plt

k = 6   # vértices em cada bloco (dois blocos completos, ligados por uma única aresta)

def laplaciano_dois_blocos(k, eps):
    n = 2 * k
    arestas, pesos = [], []
    for g in (0, 1):                       # dentro de cada bloco: todos ligados a todos, condutância 1
        for i in range(k):
            for j in range(i + 1, k):
                arestas.append((g * k + i, g * k + j)); pesos.append(1.0)
    arestas.append((k - 1, k)); pesos.append(eps)      # a "porta" entre os blocos
    B = np.zeros((len(arestas), n))
    for e, (i, j) in enumerate(arestas):
        B[e, i], B[e, j] = -1, 1
    C = np.diag(pesos)
    ########### complete: L = B' C B ##########
    return np.zeros((n, n))

print(" eps      lambda_1   lambda_2   2*eps/k   tempo ~ 1/lambda_2")
epss = [1, 0.3, 0.1, 0.03, 0.01, 0.003]
l2s = []
for eps in epss:
    lam = np.linalg.eigvalsh(laplaciano_dois_blocos(k, eps))
    l2s.append(lam[1])
    print(f"{eps:6.3f}   {round(lam[0], 10) + 0.0:9.1f}  {lam[1]:9.5f}  {2*eps/k:8.5f}   {1/max(lam[1], 1e-12):9.1f}")

# --- Vetor de Fiedler (autovetor de lambda_2): o sinal separa as comunidades
lam, Q = np.linalg.eigh(laplaciano_dois_blocos(k, 0.05))
fiedler = Q[:, 1]
grupo = np.zeros(2 * k, dtype=bool)   ########### complete: separe os vértices pelo sinal do vetor de Fiedler ##########
print("\nSinal do vetor de Fiedler:", grupo.astype(int))
print("Blocos verdadeiros:       ", np.array([0] * k + [1] * k))

fig, ax = plt.subplots(1, 2, figsize=(10, 3.6))
ax[0].loglog(epss, l2s, "o-", label="lambda_2")
ax[0].loglog(epss, [2 * e / k for e in epss], "k--", label="2 eps / k")
ax[0].set_xlabel("condutância da porta (eps)"); ax[0].legend()
ax[1].bar(range(2 * k), fiedler, color=["C0"] * k + ["C3"] * k)
ax[1].set_xlabel("vértice"); ax[1].set_title("vetor de Fiedler (eps = 0,05)")
plt.tight_layout(); plt.show()
