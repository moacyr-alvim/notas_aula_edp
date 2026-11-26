"""Roda todos os arquivos de py/ do jeito que o worker faz (mesmo PRELUDE do pyworker.js).

Uso:  python3 tests/run_python_cells.py
Verifica: cada arquivo executa sem erro, gera figuras PNG válidas e (nas soluções) os números esperados.
"""
import base64, contextlib, io, pathlib, re, sys

import numpy as np

root = pathlib.Path(__file__).resolve().parent.parent
js = (root / "assets" / "pyworker.js").read_text(encoding="utf-8")
prelude = re.search(r"const PRELUDE = `(.*?)`;", js, re.S).group(1)

pre_ns = {}
exec(prelude, pre_ns)                      # igual ao pyodide.runPython(PRELUDE)

fails = 0
def check(name, ok, info=""):
    global fails
    print(("ok   " if ok else "FALHA"), name, info)
    fails += (not ok)

def rodar(nome):
    code = (root / "py" / nome).read_text(encoding="utf-8")
    ns = {"__name__": "__main__"}          # espaço de nomes limpo a cada execução
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        exec(compile(code, "<exec>", "exec"), ns)
    figs = pre_ns["_take_figs"]()
    return buf.getvalue(), figs

def numeros(saida, rotulo):
    m = re.search(rotulo + r".*?max\|?u?\|? = ([-+0-9.eE]+)", saida)
    return float(m.group(1)) if m else None

for nome in sorted(p.name for p in (root / "py").glob("*.py")):
    saida, figs = rodar(nome)
    png_ok = bool(figs) and all(base64.b64decode(f)[:8] == b"\x89PNG\r\n\x1a\n" for f in figs)
    check(f"{nome}: executa e gera figura PNG", png_ok, f"({len(figs)} fig)")
    if nome in ("transporte_solucao.py", "transporte_lambda.py", "cfl_solucao.py"):
        print("     " + saida.strip().replace("\n", "\n     "))

# valores esperados das soluções
s, _ = rodar("transporte_solucao.py")
mx = {k: float(v) for k, v in re.findall(r"(central|esquerda|direita)\s*: min = [-+0-9.eE]+\s+max = ([-+0-9.eE]+)", s)}
check("upwind (esquerda) fica em [0,1]", "esquerda" in mx and mx["esquerda"] <= 1.0 + 1e-9, f"max={mx.get('esquerda')}")
check("central explode (> 1e6)", mx.get("central", 0) > 1e6, f"max={mx.get('central'):.3g}")
check("downwind explode (> 1e6)", mx.get("direita", 0) > 1e6, f"max={mx.get('direita'):.3g}")

s, _ = rodar("cfl_solucao.py")
ok_ = float(re.search(r"satisfeita.*?= ([0-9.eE+-]+)\n", s).group(1))
bad = float(re.search(r"violada.*?= ([0-9.eE+-]+)\n", s).group(1))
check("CFL satisfeita: max|u| ≈ 0,5 (onda se divide em duas)", abs(ok_ - 0.5) < 0.01, f"max={ok_:.3f}")
check("CFL violada: max|u| >> 1", bad > 5, f"max={bad:.3g}")

s, _ = rodar("transporte_lambda.py")
m = {float(a): float(b) for a, b in re.findall(r"lambda = ([0-9.]+)\s.*?max = ([-+0-9.eE]+)", s)}
check("λ=0,5 e λ=1 estáveis (max ≤ 1); λ=1,2 instável", m[0.5] <= 1 + 1e-9 and m[1.0] <= 1 + 1e-9 and m[1.2] > 10, str(m))

s, _ = rodar("sep_solucao.py")
dif = float(re.search(r"diferenças finitas.*?: ([0-9.eE+-]+)\n", s).group(1))
check("separação de variáveis: série ≈ diferenças finitas (erro < 0,01)", dif < 0.01, f"dif={dif:.4f}")

s, _ = rodar("acao_solucao.py")
err = float(re.search(r"20000 passos:.*?erro máx = ([0-9.eE+-]+)", s).group(1))
A20 = float(re.search(r"20000 passos:\s+A = *([-0-9.eE+]+)", s).group(1))
check("ação discreta: a descida chega na parábola (erro < 0,01)", err < 1e-2, f"erro={err:.2e}")
check("ação discreta: A ≈ -g²T³/24 = -32,013", abs(A20 + 32.0133) < 0.05, f"A={A20:.4f}")

s, _ = rodar("calor_circulo_solucao.py")
esp = float(re.search(r"erro espectral\s*= ([0-9.eE+-]+)", s).group(1))
dif = float(re.search(r"erro diferencas finitas = ([0-9.eE+-]+)", s).group(1))
check("calor no círculo: espectral é exato até o arredondamento", esp < 1e-12, f"erro={esp:.1e}")
check("calor no círculo: diferenças finitas erram bem mais", dif > 100 * esp, f"erro={dif:.1e}")

s, _ = rodar("eds_solucao.py")
mlog = float(re.search(r"E\[ln S\] simulado ([-+0-9.]+), exato ([-+0-9.]+)", s).group(1))
elog = float(re.search(r"E\[ln S\] simulado ([-+0-9.]+), exato ([-+0-9.]+)", s).group(2))
check("EDS: Euler-Maruyama reproduz E[ln S] = (mu - sigma^2/2)t", abs(mlog - elog) < 0.02, f"{mlog} vs {elog}")
linhas = re.findall(r"^  (Ito|Stratonovich)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*$", s, re.M)
alvo = {"Ito": 1, "Stratonovich": 2}
for nome, *erros in linhas:
    e = [float(v) for v in erros]
    melhor = e.index(min(e)) + 1
    check(f"EDS: o histograma de {nome} escolhe o alpha certo", melhor == alvo[nome], f"erros {e}")

s, _ = rodar("transformada_reta_solucao.py")
for nome, esperado in (("triangulo", 0.5477), ("exponencial", 0.7071), ("gaussiana", 0.5000)):
    v = float(re.search(nome + r"\s+Dx\*Dk = ([0-9.]+)", s).group(1))
    check(f"transformada: {nome} tem Δx·Δk = {esperado}", abs(v - esperado) < 2e-3, f"{v}")
erro_g = float(re.search(r"gaussiana\s+erro relativo da FFT = ([0-9.eE+-]+)", s).group(1))
check("transformada: a FFT da gaussiana bate com a fórmula", erro_g < 1e-12, f"erro={erro_g:.1e}")

s, _ = rodar("calor_reta_solucao.py")
linhas = re.findall(r"^\s*([0-9.]+)\s+([0-9.eE+-]+)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*$", s, re.M)
check("calor na reta: a FFT bate com a fórmula da função erro", all(float(l[1]) < 2e-4 for l in linhas), str([l[1] for l in linhas]))
check("calor na reta: a massa se conserva", all(abs(float(l[2]) - 2) < 1e-5 for l in linhas), str([l[2] for l in linhas]))
circ = re.findall(r"^\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.eE+-]+)\s+([0-9.eE+-]+)\s*$", s, re.M)
check("calor na reta: no círculo o desvio da média é 2|c1|exp(-Dt)",
      all(abs(float(a) - float(b)) / float(b) < 0.02 for _, _, a, b in circ[-2:]), str(circ[-2:]))

s, _ = rodar("passeio_aleatorio_solucao.py")
dmed = float(re.search(r"D medido = ([0-9.eE+-]+)", s).group(1))
incl = float(re.search(r"inclinacao no log-log = ([0-9.eE+-]+)", s).group(1))
check("passeio: D medido ≈ 0,25", abs(dmed - 0.25) < 0.02, f"D={dmed}")
check("passeio: a largura cresce como √t (inclinação 1/2)", abs(incl - 0.5) < 0.03, f"inclinação={incl}")

s, _ = rodar("fokker_planck_solucao.py")
boltz = float(re.search(r"erro max vs Boltzmann = ([0-9.eE+-]+)", s).group(1))
invd = float(re.search(r"erro max vs 1/D = ([0-9.eE+-]+)", s).group(1))
check("Fokker-Planck: o estacionário do poço duplo é Boltzmann", boltz < 5e-3, f"erro={boltz:.1e}")
check("Fokker-Planck: sem viés e com D variável, ρ ∝ 1/D", invd < 5e-3, f"erro={invd:.1e}")

s, _ = rodar("feynman_kac_solucao.py")
sig = float(re.search(r"pior discordancia = ([0-9.eE+-]+) sigmas", s).group(1))
du = float(re.search(r"erro max da chance = ([0-9.eE+-]+)", s).group(1))
dt_ = float(re.search(r"erro relativo max do tempo = ([0-9.eE+-]+)", s).group(1))
inc = float(re.search(r"inclinacao no log-log = ([-0-9.eE+]+)", s).group(1))
check("Feynman-Kac: na zona de perigo a EDP e o Monte Carlo concordam", sig < 4, f"{sig:.2f} sigmas")
check("Feynman-Kac: a chance de sair por L e x/L", du < 0.01, f"erro={du:.4f}")
check("Feynman-Kac: o tempo medio de saida e x(L-x)/2D", dt_ < 0.03, f"erro relativo={dt_:.4f}")
check("Feynman-Kac: o erro do Monte Carlo cai como 1/raiz(N)", abs(inc + 0.5) < 0.08, f"inclinacao={inc}")

s, _ = rodar("gerador_solucao.py")
sl = float(re.search(r"maior \|soma de linha\| de L = ([0-9.eE+-]+)", s).group(1))
exp1 = max(float(v) for v in re.findall(r"soma de linha de exp\(tL\) - 1\| = ([0-9.eE+-]+)", s))
semi = float(re.search(r"max\|P\(0,7\)P\(1,3\) - P\(2,0\)\| = ([0-9.eE+-]+)", s).group(1))
piL = float(re.search(r"maior \|pi L\| = ([0-9.eE+-]+)", s).group(1))
adj = float(re.search(r"dif = ([0-9.eE+-]+)", s).group(1))
melhor = float(re.search(r"melhor t = [0-9.eE+-]+, com erro ([0-9.eE+-]+)", s).group(1))
cadeia = float(re.search(r"maior diferenca = ([0-9.eE+-]+)", s).group(1))
check("gerador: as linhas de L somam zero", sl < 1e-14, f"{sl:.1e}")
check("gerador: as linhas de exp(tL) somam um", exp1 < 1e-13, f"{exp1:.1e}")
check("gerador: o semigrupo fecha, P(t)P(s) = P(t+s)", semi < 1e-13, f"{semi:.1e}")
check("gerador: a estacionaria satisfaz pi L = 0", piL < 1e-13, f"{piL:.1e}")
check("gerador: densidade para a frente = premio para tras", adj < 1e-12, f"{adj:.1e}")
check("gerador: medido por Monte Carlo, o melhor t erra pouco", melhor < 0.01, f"erro={melhor:.5f}")
check("gerador: a cadeia simulada bate com exp(tL)", cadeia < 0.02, f"dif={cadeia:.4f}")

s, _ = rodar("black_scholes_solucao.py")
erf_ = float(re.search(r"contra math.erf: ([0-9.eE+-]+)", s).group(1))
arv = float(re.search(r"erro maximo da arvore em n = 5000: ([0-9.eE+-]+)", s).group(1))
inc = float(re.search(r"inclinacao no log-log = ([-0-9.eE+]+)", s).group(1))
razao = float(re.search(r"razao = ([0-9.eE+-]+) vezes", s).group(1))
rep = float(re.search(r"custo da receita = ([0-9.eE+-]+)", s).group(1))
esp = float(re.search(r"esperanca descontada com q = [0-9.]+: ([0-9.eE+-]+)", s).group(1))
check("Black-Scholes: a funcao erro vetorizada bate com math.erf", erf_ < 1e-14, f"erro={erf_:.1e}")
check("Black-Scholes: custo da replica = esperanca descontada com q", abs(rep - esp) < 1e-4, f"{rep} vs {esp}")
check("Black-Scholes: a arvore converge para a formula", arv < 1e-3, f"erro={arv:.5f}")
check("Black-Scholes: o erro do hedge cai como 1/raiz(n)", abs(inc + 0.5) < 0.08, f"inclinacao={inc}")
check("Black-Scholes: coberto, mu nao importa (razao > 100)", razao > 100, f"razao={razao:.0f}")

s, _ = rodar("burgers_viscosa_solucao.py")
difs = [float(m) for m in re.findall(r"Cole-Hopf = ([0-9.eE+-]+)", s)]
check("Burgers viscosa: pseudoespectral = Cole-Hopf (dois métodos independentes)", difs and max(difs) < 1e-5, f"máx={max(difs):.1e}")

# versões com lacunas: devem rodar (sem explodir erro) mesmo incompletas
s, _ = rodar("cfl_lacunas.py")
check("cfl_lacunas roda com o código incompleto", True)

# sem o peso de Feynman-Kac o Monte Carlo responde OUTRA pergunta, e a discordância tem que gritar
s, _ = rodar("feynman_kac_lacunas.py")
sig = float(re.search(r"pior discordancia = ([0-9.eE+-]+) sigmas", s).group(1))
check("feynman_kac_lacunas roda incompleto e a falta do peso aparece", sig > 20, f"{sig:.0f} sigmas")

# sem a diagonal, as linhas de L não somam zero e a probabilidade vaza; repare que o semigrupo
# CONTINUA valendo (é identidade algébrica de qualquer matriz) — o que quebra é ser probabilidade
s, _ = rodar("gerador_lacunas.py")
sl = float(re.search(r"maior \|soma de linha\| de L = ([0-9.eE+-]+)", s).group(1))
cadeia = float(re.search(r"maior diferenca = ([0-9.eE+-]+)", s).group(1))
semi = float(re.search(r"max\|P\(0,7\)P\(1,3\) - P\(2,0\)\| = ([0-9.eE+-]+)", s).group(1))
check("gerador_lacunas roda incompleto e a falta da diagonal aparece",
      sl > 0.5 and cadeia > 0.5, f"soma de linha={sl:.2f}, dif da cadeia={cadeia:.2f}")
check("gerador_lacunas: o semigrupo continua valendo mesmo assim", semi < 1e-12, f"{semi:.1e}")

# sem recalcular o delta o hedge vira estático: o erro deixa de encolher e mu volta a importar
s, _ = rodar("black_scholes_lacunas.py")
inc = float(re.search(r"inclinacao no log-log = ([-0-9.eE+]+)", s).group(1))
razao = float(re.search(r"razao = ([0-9.eE+-]+) vezes", s).group(1))
check("black_scholes_lacunas roda incompleto e a falta da receita aparece",
      abs(inc) < 0.1 and razao < 50, f"inclinacao={inc}, razao={razao:.0f}")

print("\nfalhas:", fails)
sys.exit(1 if fails else 0)
