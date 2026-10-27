import numpy as np
import matplotlib.pyplot as plt

N = 8
rng = np.random.default_rng(1)
u = rng.integers(-3, 4, N).astype(float)
v = rng.integers(-3, 4, N).astype(float)

# --- Convolução circular na unha: z_j = soma_m u_{(j-m) mod N} v_m
z = np.array([sum(u[(j - m) % N] * v[m] for m in range(N)) for j in range(N)])

# --- A matriz U: u na primeira coluna; cada coluna é a anterior deslocada circularmente
U = np.zeros((N, N))
for l in range(N):
    ########### complete: a coluna l de U é u deslocado l posições (dica: np.roll(u, l)) ##########
    pass
print("U v = u (*) v ?             ", np.allclose(U @ v, z))
print("primeira linha de U:", U[0], "(u invertido)")

# --- S: o shift circular = a identidade com as linhas deslocadas
S = np.roll(np.eye(N), 1, axis=0)
U_comb = sum(u[l] * np.linalg.matrix_power(S, l) for l in range(N))
print("U = soma u_l S^l ?           ", np.allclose(U, U_comb))
print("S^N = I ?                    ", np.allclose(np.linalg.matrix_power(S, N), np.eye(N)))

# --- A base de Fourier: f_k(j) = w^(jk) / sqrt(N),  w = e^(2 pi i / N)
w = np.exp(2j * np.pi / N)
F = np.eye(N, dtype=complex)   ########### complete: F[j, k] = w^(j k) / sqrt(N) ##########
print("F* F = I (ortonormal) ?      ", np.allclose(F.conj().T @ F, np.eye(N)))
print("F* S F é diagonal ?          ", np.allclose(F.conj().T @ S @ F, np.diag(w ** (-np.arange(N)))))

# --- Qualquer U (qualquer u!) é diagonalizada por F
D = F.conj().T @ U @ F
print("F* U F é diagonal ?          ", np.allclose(D, np.diag(np.diag(D))))
print("diagonal = fft(u) ?          ", np.allclose(np.diag(D), np.fft.fft(u)))

# --- Coordenadas na base de Fourier: u_hat(k) = <f_k, u>  (produto interno)
u_hat = np.array([np.vdot(F[:, k], u) for k in range(N)])      # vdot conjuga o primeiro argumento
v_hat = F.conj().T @ v
print("F* u = <f_k, u> ?            ", np.allclose(u_hat, F.conj().T @ u))

# --- A convolução vira produto ponto a ponto
z_hat = u_hat * v_hat          ########### complete: o produto ponto a ponto, com o fator sqrt(N) da normalização de F ##########
z_via_F = (F @ z_hat).real
print("z = F (sqrt(N) u_hat .* v_hat)?", np.allclose(z_via_F, z))

# --- Na convenção do numpy (sem o 1/sqrt(N)) o fator desaparece
z_fft = np.fft.ifft(np.fft.fft(u) * np.fft.fft(v)).real
print("ifft(fft(u) * fft(v)) = z ?   ", np.allclose(z_fft, z))

# --- Em figuras: a matriz U e os seus autovalores, que são exatamente fft(u)
fig, ax = plt.subplots(1, 2, figsize=(9, 3.6))
im = ax[0].imshow(U, cmap="coolwarm"); ax[0].set_title("U (circulante)"); plt.colorbar(im, ax=ax[0], fraction=0.046)
ev = np.linalg.eigvals(U)
ax[1].scatter(ev.real, ev.imag, s=90, facecolors="none", edgecolors="C0", label="autovalores de U")
ax[1].scatter(np.fft.fft(u).real, np.fft.fft(u).imag, s=18, color="C3", label="fft(u)")
ax[1].axhline(0, color="0.8"); ax[1].axvline(0, color="0.8"); ax[1].set_aspect("equal"); ax[1].legend(fontsize=8)
ax[1].set_title("plano complexo")
plt.tight_layout(); plt.show()
