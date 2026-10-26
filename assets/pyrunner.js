/* Células de Python editáveis (Pyodide em Web Worker).
 *
 * Uso no HTML:
 *   <div class="pycell" data-title="Upwind com lacunas"
 *        data-starter="../py/transporte_lacunas.py"
 *        data-solution="../py/transporte_solucao.py"></div>
 * e, no fim da página:  <script src="../assets/pyrunner.js"></script>
 *
 * Todas as células da página compartilham UM worker (o Python é carregado uma vez só);
 * cada execução começa com um espaço de nomes limpo.
 */
(function () {
  "use strict";

  var WORKER_URL = new URL("pyworker.js", document.currentScript.src).href;
  var TIMEOUT_MS = 120000;   // trava de segurança: encerra execuções muito longas

  var worker = null, state = "idle";   // idle | loading | ready
  var running = null;                  // { id, cell, timer }
  var pending = null;                  // execução à espera do Python carregar
  var nextId = 1;
  var cells = [];
  var statusText = "";

  /* ---------------- worker ---------------- */
  function ensureWorker() {
    if (worker) return;
    state = "loading";
    statusText = "Carregando Python…";
    worker = new Worker(WORKER_URL);
    worker.onmessage = onWorkerMessage;
    worker.onerror = function (e) {
      fatal("Erro ao iniciar o Python no navegador: " + (e.message || "worker indisponível") +
        ". Se você abriu o arquivo direto do disco (file://), sirva a pasta com um servidor local (veja o README).");
    };
    refreshAll();
  }

  function killWorker() {
    if (worker) worker.terminate();
    worker = null; state = "idle"; statusText = "";
  }

  function fatal(text) {
    var cell = running && running.cell;
    if (running) { clearTimeout(running.timer); running = null; }
    pending = null;
    killWorker();
    cells.forEach(function (c) { if (c === cell || !cell) c.showError(text); });
    refreshAll();
  }

  function onWorkerMessage(ev) {
    var m = ev.data;
    if (m.type === "status") { statusText = m.text; refreshAll(); }
    else if (m.type === "ready") {
      state = "ready"; statusText = "";
      if (pending) { worker.postMessage({ type: "run", id: pending.id, code: pending.code }); pending = null; }
      refreshAll();
    }
    else if (m.type === "fatal") fatal(m.text);
    else if (!running || m.id !== running.id) return;
    else if (m.type === "stdout" || m.type === "stderr") running.cell.appendText(m.text + "\n", m.type === "stderr");
    else if (m.type === "done") {
      var c = running.cell; clearTimeout(running.timer); running = null;
      c.showFigures(m.figs); c.setDone("Concluído em " + (m.ms / 1000).toFixed(1).replace(".", ",") + " s");
      refreshAll();
    }
    else if (m.type === "error") {
      var c2 = running.cell; clearTimeout(running.timer); running = null;
      c2.showError(m.text); c2.setDone("Erro"); refreshAll();
    }
  }

  function run(cell) {
    if (running) return;
    ensureWorker();
    cell.clearOutput();
    var id = nextId++;
    running = { id: id, cell: cell, timer: setTimeout(function () { stop("Execução interrompida após " + TIMEOUT_MS / 1000 + " s (tempo limite)."); }, TIMEOUT_MS) };
    var job = { id: id, code: cell.getCode() };
    if (state === "ready") worker.postMessage({ type: "run", id: job.id, code: job.code });
    else pending = job;
    refreshAll();
  }

  function stop(reason) {
    if (!running) return;
    var cell = running.cell;
    clearTimeout(running.timer); running = null; pending = null;
    killWorker();                       // o Python é recarregado (do cache) na próxima execução
    cell.showError(reason || "Execução interrompida.");
    cell.setDone("Interrompido");
    refreshAll();
  }

  function refreshAll() { cells.forEach(function (c) { c.refresh(); }); }

  /* ---------------- célula ---------------- */
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function basename(url) { return (url || "codigo.py").split("/").pop().split("?")[0]; }

  function Cell(root) {
    var self = this;
    this.root = root;
    this.starterUrl = root.dataset.starter;
    this.solutionUrl = root.dataset.solution;
    this.fileName = root.dataset.file || basename(this.starterUrl);
    this.starter = "";
    this.doneText = "";
    this.stdoutNode = null;

    // barra
    var bar = el("div", "bar");
    bar.appendChild(el("span", "title", root.dataset.title || "Código Python"));
    this.status = el("span", "status");
    bar.appendChild(this.status);
    this.bRun = el("button", "run", "Rodar"); this.bRun.title = "Ctrl+Enter";
    this.bStop = el("button", null, "Parar");
    this.bReset = el("button", null, "Restaurar");
    this.bCopy = el("button", null, "Copiar");
    this.bDown = el("button", null, "Baixar .py");
    [this.bRun, this.bStop, this.bReset, this.bCopy, this.bDown].forEach(function (b) { b.type = "button"; bar.appendChild(b); });

    // editor com margem de números de linha
    var editor = el("div", "editor");
    this.gutter = el("pre", "gutter"); this.gutter.setAttribute("aria-hidden", "true");
    this.ta = el("textarea");
    this.ta.spellcheck = false; this.ta.setAttribute("wrap", "off");
    this.ta.setAttribute("aria-label", "Código Python editável");
    editor.appendChild(this.gutter); editor.appendChild(this.ta);

    this.out = el("div", "out");
    this.out.setAttribute("aria-live", "polite");

    root.textContent = "";
    root.appendChild(bar); root.appendChild(editor); root.appendChild(this.out);

    if (this.solutionUrl) {
      var d = el("details");
      d.appendChild(el("summary", null, "Ver solução (tente primeiro!)"));
      var body = el("div", "body");
      this.solPre = el("pre"); this.solPre.style.cssText = "overflow:auto;font:.82rem/1.5 var(--mono);background:var(--code-bg);color:var(--code-ink);padding:.8rem 1rem;border-radius:4px;";
      this.solCode = el("code"); this.solCode.style.cssText = "background:none;padding:0;font:inherit;";
      this.solPre.appendChild(this.solCode);
      this.bUse = el("button", null, "Colocar a solução no editor"); this.bUse.type = "button";
      this.bUse.style.cssText = "font:inherit;font-family:var(--sans);margin-top:.5rem;padding:.25rem .7rem;border:1px solid var(--rule);border-radius:6px;background:var(--box-bg);color:var(--ink);cursor:pointer;";
      body.appendChild(this.solPre); body.appendChild(this.bUse);
      d.appendChild(body); root.appendChild(d);
      var loaded = false;
      d.addEventListener("toggle", function () {
        if (!d.open || loaded) return;
        loaded = true;
        fetch(self.solutionUrl).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
          .then(function (t) { self.solText = t; self.solCode.textContent = t; })
          .catch(function () { loaded = false; self.solCode.textContent = "Não foi possível carregar a solução."; });
      });
      this.bUse.addEventListener("click", function () { if (self.solText) { self.setCode(self.solText); self.ta.focus(); } });
    }

    // eventos
    this.bRun.addEventListener("click", function () { run(self); });
    this.bStop.addEventListener("click", function () { if (running && running.cell === self) stop("Execução interrompida por você."); });
    this.bReset.addEventListener("click", function () { self.setCode(self.starter); self.clearOutput(); });
    this.bCopy.addEventListener("click", function () { self.copy(); });
    this.bDown.addEventListener("click", function () { self.download(); });
    this.ta.addEventListener("input", function () { self.layout(); });
    this.ta.addEventListener("scroll", function () { self.gutter.scrollTop = self.ta.scrollTop; });
    var tabFree = false;
    this.ta.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey || e.shiftKey) && e.key === "Enter") { e.preventDefault(); if (!running) run(self); return; }
      if (e.key === "Escape") { tabFree = true; return; }          // Esc e depois Tab: sai do editor
      if (e.key === "Tab" && !tabFree) {
        e.preventDefault();
        var s = self.ta.selectionStart, t = self.ta.selectionEnd, v = self.ta.value;
        self.ta.value = v.slice(0, s) + "    " + v.slice(t);
        self.ta.selectionStart = self.ta.selectionEnd = s + 4;
        self.layout();
      }
      tabFree = false;
    });

    // código inicial
    if (!this.starterUrl) { this.setCode(""); }
    else {
      this.setCode("# carregando…");
      fetch(this.starterUrl).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
        .then(function (t) { self.starter = t; self.setCode(t); })
        .catch(function (err) {
          self.setCode("# Não foi possível carregar " + self.starterUrl + " (" + err.message + ").\n" +
            "# Abra o site por um servidor (GitHub Pages ou `python3 -m http.server`), não direto do disco.");
        });
    }
    this.refresh();
  }

  Cell.prototype.setCode = function (t) { this.ta.value = t; this.layout(); };
  Cell.prototype.getCode = function () { return this.ta.value; };
  Cell.prototype.layout = function () {
    var n = this.ta.value.split("\n").length, g = "";
    for (var i = 1; i <= n; i++) g += i + "\n";
    this.gutter.textContent = g;
    this.ta.style.height = "auto";
    this.ta.style.height = Math.min(this.ta.scrollHeight + 2, window.innerHeight * 0.7) + "px";
    this.gutter.style.height = this.ta.style.height;
  };
  Cell.prototype.clearOutput = function () { this.out.textContent = ""; this.stdoutNode = null; this.doneText = ""; };
  Cell.prototype.appendText = function (t, isErr) {
    if (!this.stdoutNode) { this.stdoutNode = el("pre"); this.out.appendChild(this.stdoutNode); }
    this.stdoutNode.textContent += t;
    if (isErr) this.stdoutNode.classList.add("err");
  };
  Cell.prototype.showError = function (t) { var p = el("pre", "err"); p.textContent = t; this.out.appendChild(p); };
  Cell.prototype.showFigures = function (figs) {
    for (var i = 0; i < figs.length; i++) {
      var img = el("img"); img.alt = "Gráfico gerado pelo seu código (figura " + (i + 1) + ")";
      img.src = "data:image/png;base64," + figs[i]; this.out.appendChild(img);
    }
  };
  Cell.prototype.setDone = function (t) { this.doneText = t; };
  Cell.prototype.refresh = function () {
    var mine = running && running.cell === this, busy = !!running;
    this.bRun.disabled = busy;
    this.bStop.disabled = !mine;
    this.bReset.disabled = busy;
    var txt = "", cls = "status";
    if (mine) { txt = state === "ready" ? "Rodando…" : (statusText || "Carregando Python…"); cls += " busy"; }
    else if (busy) txt = "Aguarde a outra célula";
    else if (this.doneText) txt = this.doneText;
    else if (state === "loading") { txt = statusText || "Carregando Python…"; cls += " busy"; }
    else if (state === "ready") txt = "Python pronto";
    this.status.className = cls; this.status.textContent = txt;
  };
  Cell.prototype.copy = function () {
    var self = this, t = this.getCode(), b = this.bCopy;
    function ok() { b.textContent = "Copiado"; setTimeout(function () { b.textContent = "Copiar"; }, 1400); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, function () { self.ta.select(); document.execCommand("copy"); ok(); });
    else { this.ta.select(); document.execCommand("copy"); ok(); }
  };
  Cell.prototype.download = function () {
    var blob = new Blob([this.getCode()], { type: "text/x-python;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = this.fileName;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  };

  /* ---------------- inicialização ---------------- */
  function init() {
    var roots = document.querySelectorAll(".pycell");
    for (var i = 0; i < roots.length; i++) cells.push(new Cell(roots[i]));
    // começa a baixar o Python quando a primeira célula estiver perto da tela
    if ("IntersectionObserver" in window && cells.length) {
      var io = new IntersectionObserver(function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) { ensureWorker(); io.disconnect(); }
      }, { rootMargin: "400px" });
      cells.forEach(function (c) { io.observe(c.root); });
    }
    window.addEventListener("resize", function () { cells.forEach(function (c) { c.layout(); }); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
