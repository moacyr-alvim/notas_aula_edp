/* Núcleo matemático da demo de Burgers (sem DOM; roda no navegador e no Node).
 *
 * Equação:  u_t + u u_x = 0,  u(x,0) = f(x)      (c = 1; para c qualquer, troque t por c*t)
 *
 * Solução admissível (de entropia) por Hopf–Lax aplicada à primitiva F0(y) = ∫ f:
 *     w(x,t) = min_y { F0(y) + (x-y)^2 / (2t) },    u = w_x = (x - y*) / t
 * Antes da quebra coincide com a solução clássica por características; depois, escolhe o choque correto.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.BurgersCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var TMAX = 4;

  var ICS = {
    rampa: {
      label: "Rampa (exercício 3b)",
      f: function (x) { return x <= 0 ? 2 : (x < 2 ? 2 - x / 2 : 1); },
      xmin: -2, xmax: 8, umin: 0.5, umax: 2.5, focus: [0, 2], fan: []
    },
    gauss: {
      label: "Pulso suave (gaussiana)",
      f: function (x) { return Math.exp(-x * x / 2); },
      xmin: -4, xmax: 6, umin: -0.1, umax: 1.3, focus: [-2.5, 2.5], fan: []
    },
    choque: {
      label: "Degrau para baixo (choque imediato)",
      f: function (x) { return x < 0 ? 1 : 0; },
      xmin: -3, xmax: 5, umin: -0.1, umax: 1.3, focus: [-0.001, 0.001], fan: []
    },
    rarefacao: {
      label: "Degrau para cima (rarefação)",
      f: function (x) { return x < 0 ? 0 : 1; },
      xmin: -3, xmax: 5, umin: -0.1, umax: 1.3, focus: [-0.001, 0.001],
      fan: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]
    }
  };

  function createSolver(ic, opts) {
    opts = opts || {};
    var dy = opts.dy || 0.01, ymin = -14, ymax = 14;
    var N = Math.round((ymax - ymin) / dy) + 1;
    var ys = new Float64Array(N), F0 = new Float64Array(N);
    var prev = ic.f(ymin);
    ys[0] = ymin; F0[0] = 0;
    for (var i = 1; i < N; i++) {
      var y = ymin + i * dy, fy = ic.f(y);
      F0[i] = F0[i - 1] + 0.5 * (prev + fy) * dy;
      ys[i] = y; prev = fy;
    }

    // minimizador y*(x,t) de F0(y) + (x-y)^2/(2t), com refinamento parabólico
    function solveY(x, t) {
      var inv = 1 / (2 * t), best = 0, bv = Infinity;
      for (var i = 0; i < N; i++) {
        var d = x - ys[i], v = F0[i] + d * d * inv;
        if (v < bv) { bv = v; best = i; }
      }
      if (best > 0 && best < N - 1) {
        var d1 = x - ys[best - 1], d2 = x - ys[best + 1];
        var gm = F0[best - 1] + d1 * d1 * inv, gp = F0[best + 1] + d2 * d2 * inv;
        var den = gm - 2 * bv + gp;
        if (den > 1e-12) {
          var off = 0.5 * (gm - gp) / den;
          if (Math.abs(off) <= 1) return ys[best] + off * dy;
        }
      }
      return ys[best];
    }

    function u(x, t) { return t < 1e-9 ? ic.f(x) : (x - solveY(x, t)) / t; }

    function profile(xs, t) {
      var out = new Float64Array(xs.length);
      for (var i = 0; i < xs.length; i++) out[i] = u(xs[i], t);
      return out;
    }

    // tempo de quebra: t* = -1 / min f'
    function breakTime() {
      var h = 0.002, m = Infinity;
      for (var x = ic.xmin - 6; x < ic.xmax; x += h) {
        var d = (ic.f(x + h) - ic.f(x)) / h;
        if (d < m) m = d;
      }
      return m < -1e-9 ? -1 / m : Infinity;
    }
    var tb = breakTime();

    // choque no instante t (ou null): maior salto de y* entre pontos vizinhos, refinado por bisseção
    function shockAt(t, nGrid) {
      if (!(t > tb + 1e-9) || t < 1e-9) return null;
      nGrid = nGrid || 160;
      var a = ic.xmin, b = ic.xmax, h = (b - a) / (nGrid - 1);
      var prevY = solveY(a, t), bestJ = -1, bestI = -1, yPrev = prevY;
      for (var i = 1; i < nGrid; i++) {
        var yi = solveY(a + i * h, t), jmp = yi - yPrev;
        if (jmp > bestJ) { bestJ = jmp; bestI = i; }
        yPrev = yi;
      }
      if (bestJ < 3 * h) return null; // sem salto de y*: solução ainda é contínua
      var xlo = a + (bestI - 1) * h, xhi = a + bestI * h;
      var yl = solveY(xlo, t), yr = solveY(xhi, t);
      for (var k = 0; k < 40; k++) {
        var xm = 0.5 * (xlo + xhi), ym = solveY(xm, t);
        if (Math.abs(ym - yl) < Math.abs(ym - yr)) xlo = xm; else xhi = xm;
      }
      var xs = 0.5 * (xlo + xhi);
      return { x: xs, uL: (xlo - solveY(xlo, t)) / t, uR: (xhi - solveY(xhi, t)) / t };
    }

    function shockPath(step) {
      step = step || 0.05;
      var path = [];
      if (!isFinite(tb) && tb !== 0) return path;
      for (var t = Math.max(tb, 0) + step; t <= TMAX + 1e-9; t += step) {
        var s = shockAt(t, 140);
        if (s) path.push({ t: t, x: s.x, uL: s.uL, uR: s.uR });
      }
      // liga a origem do choque (ponto de quebra) ao primeiro ponto calculado
      if (path.length) {
        var t0 = Math.max(tb, 0);
        var s0 = shockAt(t0 + 1e-3, 200);
        if (s0) path.unshift({ t: t0, x: s0.x, uL: s0.uL, uR: s0.uR });
      }
      return path;
    }

    // lista de pontos de partida x0 (grossa fora do foco, fina no foco)
    function startPoints() {
      var lo = ic.xmin - ic.umax * TMAX, hi = ic.xmax, set = {}, v = [];
      function add(x) { var k = Math.round(x * 1000); if (!set[k]) { set[k] = 1; v.push(k / 1000); } }
      var fineStep = (ic.focus[1] - ic.focus[0]) > 1 ? ((ic.focus[1] - ic.focus[0]) > 3 ? 0.2 : 0.1) : 0;
      for (var x = lo; x <= hi + 1e-9; x += 0.5) {
        if (!fineStep || x < ic.focus[0] || x > ic.focus[1]) add(x);
      }
      if (fineStep) for (x = ic.focus[0]; x <= ic.focus[1] + 1e-9; x += fineStep) add(x);
      else add(0.0005), add(-0.0005);
      v.sort(function (p, q) { return p - q; });
      return v;
    }

    // até quando cada característica "vive" (antes de ser engolida por um choque)
    function charLines() {
      var tol = 0.04, ds = 0.04, out = [], pts = startPoints();
      function alive(x0, s) {
        if (s < 1e-9) return true;
        return Math.abs(solveY(x0 + ic.f(x0) * s, s) - x0) < tol;
      }
      for (var j = 0; j < pts.length; j++) {
        var x0 = pts[j], tEnd = TMAX;
        if (isFinite(tb)) {
          var s = ds, prevS = 0, died = false;
          for (; s <= TMAX + 1e-9; s += ds) {
            if (!alive(x0, s)) { died = true; break; }
            prevS = s;
          }
          if (died) {
            var lo = prevS, hi = s;
            for (var k = 0; k < 14; k++) { var m = 0.5 * (lo + hi); if (alive(x0, m)) lo = m; else hi = m; }
            tEnd = lo;
          }
        }
        out.push({ x0: x0, f: ic.f(x0), tEnd: tEnd });
      }
      return out;
    }

    // solução clássica (pode ser multivalorada após t*): lista de segmentos [[x,u],...]
    function classical(t) {
      var segs = [], cur = [], prevF = null;
      for (var x0 = ic.xmin - 6; x0 <= ic.xmax + 6; x0 += 0.01) {
        var fv = ic.f(x0);
        if (prevF !== null && Math.abs(fv - prevF) > 0.25) { if (cur.length) segs.push(cur); cur = []; }
        cur.push([x0 + fv * t, fv]); prevF = fv;
      }
      if (cur.length) segs.push(cur);
      return segs;
    }

    return {
      ic: ic, tBreak: tb, u: u, profile: profile, solveY: solveY,
      shockAt: shockAt, shockPath: shockPath, charLines: charLines, classical: classical
    };
  }

  return { ICS: ICS, TMAX: TMAX, createSolver: createSolver };
});
