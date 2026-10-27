import numpy as np
import matplotlib.pyplot as plt

ell, k, s = 2 * np.pi, 0.2, 0.5       # comprimento do anel, difusão, largura da gaussiana
N = 64
h = ell / N
c = k / h**2                          # a condutância que mantém k = c h^2 fixo
x = h * np.arange(N)
u0 = np.exp(-(x - ell / 2) ** 2 / (2 * s**2))

# --- O laplaciano do anel é circulante: primeira coluna (2, -1, 0, ..., 0, -1)
l0 = np.zeros(N)
########### complete: l0[0] = 2, e -1 nas posições vizinhas (1 e N-1) ##########

# --- Autovalores de L = FFT da primeira coluna (e batem com 2 - 2 cos(2 pi k / N))
lam = np.fft.fft(l0).real
print("autovalores = 2 - 2cos(2 pi k/N) ?", np.allclose(lam, 2 - 2 * np.cos(2 * np.pi * np.arange(N) / N)))

# --- Solução: transforma, multiplica cada modo por exp(-c lam t), volta
def u_em(t):
    ########### complete: ifft( exp(-c lam t) * fft(u0) ), e tome a parte real ##########
    return u0

# --- Conferindo com a decomposição de matriz (que só dá conta de N pequeno)
L = np.zeros((N, N))
for l in range(N):
    L[:, l] = np.roll(l0, l)
w, Q = np.linalg.eigh(L)
u_eigh = Q @ (np.exp(-c * w * 1.0) * (Q.T @ u0))
print("FFT = eigh em t = 1 ?             ", np.allclose(u_em(1.0), u_eigh))
print("massa conservada ?                ", np.isclose(u_em(1.0).sum(), u0.sum()))

# --- A solução é uma convolução: u(t) = K_t (*) u0, com K_t o "núcleo do calor" do anel
K = np.fft.ifft(np.exp(-c * lam * 1.0)).real          # o que sai do impulso unitário
u_conv = np.fft.ifft(np.fft.fft(K) * np.fft.fft(u0)).real
print("u(t) = K_t (*) u0 ?               ", np.allclose(u_conv, u_em(1.0)))

for t in (0, 0.3, 1, 3):
    plt.plot(x, u_em(t), label=f"t = {t}")
plt.xlabel("x"); plt.legend(); plt.title(f"Calor no anel com N = {N} (via FFT)")
plt.show()
