/* ============================================================
   ZNR DevConsole
   Consola de depuración flotante para usar cuando el navegador
   tiene bloqueada la consola de DevTools.

   Cómo activarla:
     1) Sube este archivo junto a tus demás .js (ej: devconsole.js)
     2) Agrega antes de </body> en la(s) página(s) que quieras
        depurar (vendedor.html, index.html, etc.):
          <script src="devconsole.js"></script>
     3) Abre la página normalmente en tu navegador y agrega
        ?dc=1 a la URL UNA sola vez, ej:
          https://tusitio.github.io/vendedor.html?dc=1
        Esto activa la herramienta y la deja guardada (localStorage)
        para que aparezca automáticamente en tus próximas visitas
        SOLO en tu navegador.
     4) Para desactivarla en este navegador, visita cualquier
        página con ?dc=0 una vez, o usa el botón "Apagar" del panel.

   Por diseño, si NO se ha activado con ?dc=1 alguna vez, este
   script no hace absolutamente nada (0 impacto para tus usuarios
   reales de ZNR), así que es seguro dejarlo incluido en producción.
   ============================================================ */
(function () {
  "use strict";

  // ---------- Activación / seguridad ----------
  var STORAGE_KEY = "znrDC";
  var params;
  try {
    params = new URLSearchParams(window.location.search);
  } catch (e) {
    params = null;
  }

  if (params && params.get("dc") === "1") {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch (e) {}
  }
  if (params && params.get("dc") === "0") {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    return; // apagar y no continuar
  }

  var active = false;
  try { active = localStorage.getItem(STORAGE_KEY) === "1"; } catch (e) {}
  if (!active) return; // no activado: no hacemos nada

  if (window.__znrDevConsoleLoaded) return; // evitar doble carga
  window.__znrDevConsoleLoaded = true;

  // ---------- Estado ----------
  var MAX_LOGS = 400;
  var consoleLogs = [];
  var networkLogs = [];
  var netIdSeq = 1;
  var counters = { errors: 0, failedReq: 0 };

  // ---------- Utilidades ----------
  function ts() {
    var d = new Date();
    return d.toLocaleTimeString("es-MX", { hour12: false }) + "." +
      String(d.getMilliseconds()).padStart(3, "0");
  }

  function safeStringify(val) {
    if (typeof val === "string") return val;
    if (val instanceof Error) return val.stack || (val.name + ": " + val.message);
    try {
      var seen = [];
      return JSON.stringify(val, function (k, v) {
        if (typeof v === "object" && v !== null) {
          if (seen.indexOf(v) !== -1) return "[Circular]";
          seen.push(v);
        }
        if (typeof v === "function") return "[Function]";
        return v;
      }, 2);
    } catch (e) {
      try { return String(val); } catch (e2) { return "[No representable]"; }
    }
  }

  function truncate(str, n) {
    if (typeof str !== "string") return str;
    return str.length > n ? str.slice(0, n) + "\n… [truncado, " + str.length + " caracteres totales]" : str;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function trimArray(arr) {
    while (arr.length > MAX_LOGS) arr.shift();
  }

  // ---------- Captura de console.* ----------
  var levels = ["log", "info", "warn", "error", "debug"];
  var originalConsole = {};
  levels.forEach(function (level) {
    originalConsole[level] = console[level].bind(console);
    console[level] = function () {
      var args = Array.prototype.slice.call(arguments);
      addConsoleEntry(level, args);
      return originalConsole[level].apply(console, args);
    };
  });

  window.addEventListener("error", function (e) {
    addConsoleEntry("error", [
      (e.message || "Error") + (e.filename ? " @ " + e.filename + ":" + e.lineno : "")
    ]);
  });
  window.addEventListener("unhandledrejection", function (e) {
    var reason = e.reason;
    addConsoleEntry("error", ["Promise rechazada sin manejar:", reason]);
  });

  function addConsoleEntry(level, args) {
    var entry = {
      level: level,
      time: ts(),
      text: args.map(safeStringify).join("  ")
    };
    consoleLogs.push(entry);
    trimArray(consoleLogs);
    if (level === "error") counters.errors++;
    updateBadge();
    if (panelOpen && currentTab === "console") renderConsole();
  }

  // ---------- Captura de fetch ----------
  var originalFetch = window.fetch;
  if (originalFetch) {
    window.fetch = function (input, init) {
      var url = typeof input === "string" ? input : (input && input.url) || "";
      var method = (init && init.method) || (input && input.method) || "GET";
      var start = performance.now();
      var entry = {
        id: netIdSeq++,
        type: "fetch",
        method: method,
        url: url,
        status: "…",
        duration: null,
        reqHeaders: (init && init.headers) ? safeStringify(init.headers) : "",
        reqBody: (init && init.body) ? truncate(safeStringify(init.body), 4000) : "",
        resBody: "",
        ok: null
      };
      addNetworkEntry(entry);

      return originalFetch.apply(this, arguments).then(function (response) {
        entry.duration = (performance.now() - start).toFixed(1);
        entry.status = response.status;
        entry.ok = response.ok;
        if (!response.ok) counters.failedReq++;
        try {
          response.clone().text().then(function (text) {
            entry.resBody = truncate(text, 4000);
            updateBadge();
            if (panelOpen && currentTab === "network") renderNetwork();
          }).catch(function () {});
        } catch (e) {}
        updateBadge();
        if (panelOpen && currentTab === "network") renderNetwork();
        return response;
      }).catch(function (err) {
        entry.duration = (performance.now() - start).toFixed(1);
        entry.status = "error";
        entry.resBody = err && err.message ? err.message : String(err);
        counters.failedReq++;
        updateBadge();
        if (panelOpen && currentTab === "network") renderNetwork();
        throw err;
      });
    };
  }

  // ---------- Captura de XMLHttpRequest ----------
  var xhrOpen = XMLHttpRequest.prototype.open;
  var xhrSend = XMLHttpRequest.prototype.send;
  var xhrSetHeader = XMLHttpRequest.prototype.setRequestHeader;

  XMLHttpRequest.prototype.open = function (method, url) {
    this.__znr = { method: method, url: url, headers: {} };
    return xhrOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.setRequestHeader = function (k, v) {
    if (this.__znr) this.__znr.headers[k] = v;
    return xhrSetHeader.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function (body) {
    var self = this;
    if (this.__znr) {
      var start = performance.now();
      var entry = {
        id: netIdSeq++,
        type: "xhr",
        method: this.__znr.method,
        url: this.__znr.url,
        status: "…",
        duration: null,
        reqHeaders: safeStringify(this.__znr.headers),
        reqBody: body ? truncate(safeStringify(body), 4000) : "",
        resBody: "",
        ok: null
      };
      addNetworkEntry(entry);
      this.addEventListener("loadend", function () {
        entry.duration = (performance.now() - start).toFixed(1);
        entry.status = self.status;
        entry.ok = self.status >= 200 && self.status < 400;
        if (!entry.ok) counters.failedReq++;
        try { entry.resBody = truncate(self.responseText || "", 4000); }
        catch (e) { entry.resBody = "[binario / no legible]"; }
        updateBadge();
        if (panelOpen && currentTab === "network") renderNetwork();
      });
    }
    return xhrSend.apply(this, arguments);
  };

  function addNetworkEntry(entry) {
    networkLogs.push(entry);
    trimArray(networkLogs);
    if (panelOpen && currentTab === "network") renderNetwork();
  }

  // ---------- UI ----------
  var css = "\
    #znr-dc-btn{position:fixed;bottom:16px;right:16px;z-index:2147483000;\
      width:48px;height:48px;border-radius:50%;background:#1e1e2e;color:#fff;\
      border:2px solid #3a3a52;font-size:20px;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.4);\
      display:flex;align-items:center;justify-content:center;font-family:monospace;}\
    #znr-dc-btn .znr-badge{position:absolute;top:-6px;right:-6px;background:#e74c3c;color:#fff;\
      font-size:11px;border-radius:10px;padding:1px 6px;font-family:sans-serif;display:none;}\
    #znr-dc-panel{position:fixed;left:0;right:0;bottom:0;height:46vh;min-height:220px;\
      background:#1e1e2e;color:#e6e6e6;z-index:2147483001;font-family:Consolas,monospace;\
      font-size:12px;display:none;flex-direction:column;box-shadow:0 -2px 14px rgba(0,0,0,.5);}\
    #znr-dc-panel.open{display:flex;}\
    #znr-dc-drag{height:6px;cursor:ns-resize;background:#3a3a52;}\
    #znr-dc-head{display:flex;align-items:center;background:#151521;padding:4px 8px;gap:4px;\
      border-bottom:1px solid #3a3a52;flex-wrap:wrap;}\
    #znr-dc-head b{color:#f39c12;font-size:12px;margin-right:8px;}\
    .znr-tab{background:none;border:none;color:#aaa;padding:6px 10px;cursor:pointer;font-family:inherit;\
      font-size:12px;border-bottom:2px solid transparent;}\
    .znr-tab.active{color:#fff;border-bottom:2px solid #f39c12;}\
    .znr-spacer{flex:1;}\
    .znr-btn-mini{background:#2c2c40;color:#ddd;border:1px solid #3a3a52;border-radius:4px;\
      padding:3px 8px;cursor:pointer;font-size:11px;font-family:inherit;}\
    .znr-btn-mini:hover{background:#3a3a52;}\
    #znr-dc-body{flex:1;overflow:auto;padding:6px 8px;}\
    .znr-row{padding:3px 4px;border-bottom:1px solid #2a2a3d;white-space:pre-wrap;word-break:break-all;}\
    .znr-row.log{color:#e6e6e6;}\
    .znr-row.info{color:#5dade2;}\
    .znr-row.warn{color:#f4d03f;background:rgba(244,208,63,.06);}\
    .znr-row.error{color:#ff6b6b;background:rgba(255,107,107,.08);}\
    .znr-time{color:#777;margin-right:6px;}\
    .znr-net-row{padding:4px;border-bottom:1px solid #2a2a3d;cursor:pointer;display:flex;gap:8px;}\
    .znr-net-row:hover{background:#26263a;}\
    .znr-net-method{color:#5dade2;width:44px;flex-shrink:0;}\
    .znr-net-status{width:38px;flex-shrink:0;}\
    .znr-net-status.ok{color:#2ecc71;}\
    .znr-net-status.bad{color:#ff6b6b;}\
    .znr-net-status.pending{color:#f4d03f;}\
    .znr-net-url{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}\
    .znr-net-dur{color:#888;width:60px;text-align:right;flex-shrink:0;}\
    .znr-net-detail{background:#151521;padding:8px;border-bottom:1px solid #3a3a52;white-space:pre-wrap;word-break:break-all;}\
    .znr-net-detail h4{margin:6px 0 2px;color:#f39c12;font-size:11px;}\
    .znr-filter{background:#2c2c40;border:1px solid #3a3a52;color:#eee;border-radius:4px;\
      padding:3px 6px;font-size:11px;font-family:inherit;}\
    .znr-sw-card,.znr-cache-card{background:#26263a;border:1px solid #3a3a52;border-radius:6px;\
      padding:8px;margin-bottom:8px;}\
    .znr-sw-card b,.znr-cache-card b{color:#f39c12;}\
    .znr-empty{color:#777;padding:10px;text-align:center;}\
    ";
  var styleEl = document.createElement("style");
  styleEl.id = "znr-dc-style";
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  var btn = document.createElement("button");
  btn.id = "znr-dc-btn";
  btn.title = "ZNR DevConsole";
  btn.innerHTML = '🛠<span class="znr-badge" id="znr-dc-badge"></span>';
  document.body.appendChild(btn);

  var panel = document.createElement("div");
  panel.id = "znr-dc-panel";
  panel.innerHTML =
    '<div id="znr-dc-drag"></div>' +
    '<div id="znr-dc-head">' +
      '<b>ZNR DevConsole</b>' +
      '<button class="znr-tab active" data-tab="console">Consola</button>' +
      '<button class="znr-tab" data-tab="network">Red</button>' +
      '<button class="znr-tab" data-tab="sw">Service Worker</button>' +
      '<button class="znr-tab" data-tab="cache">Caché</button>' +
      '<button class="znr-tab" data-tab="info">Info</button>' +
      '<input class="znr-filter" id="znr-dc-search" placeholder="filtrar…" style="width:140px;">' +
      '<div class="znr-spacer"></div>' +
      '<button class="znr-btn-mini" id="znr-dc-clear">Limpiar</button>' +
      '<button class="znr-btn-mini" id="znr-dc-copy">Copiar</button>' +
      '<button class="znr-btn-mini" id="znr-dc-off">Apagar</button>' +
      '<button class="znr-btn-mini" id="znr-dc-close">✕</button>' +
    '</div>' +
    '<div id="znr-dc-body"></div>';
  document.body.appendChild(panel);

  var panelOpen = false;
  var currentTab = "console";

  btn.addEventListener("click", function () {
    panelOpen = !panelOpen;
    panel.classList.toggle("open", panelOpen);
    if (panelOpen) renderCurrentTab();
  });
  document.getElementById("znr-dc-close").addEventListener("click", function () {
    panelOpen = false;
    panel.classList.remove("open");
  });
  document.getElementById("znr-dc-off").addEventListener("click", function () {
    if (confirm("¿Apagar ZNR DevConsole en este navegador? Se puede reactivar visitando la página con ?dc=1")) {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      location.reload();
    }
  });
  document.getElementById("znr-dc-clear").addEventListener("click", function () {
    if (currentTab === "console") { consoleLogs = []; counters.errors = 0; renderConsole(); }
    else if (currentTab === "network") { networkLogs = []; counters.failedReq = 0; renderNetwork(); }
    updateBadge();
  });
  document.getElementById("znr-dc-copy").addEventListener("click", function () {
    var data = currentTab === "network" ? networkLogs : consoleLogs;
    var text = JSON.stringify(data, null, 2);
    navigator.clipboard && navigator.clipboard.writeText(text).then(function () {
      originalConsole.info("[ZNR DevConsole] Copiado al portapapeles (" + data.length + " registros)");
    }).catch(function () {});
  });
  document.getElementById("znr-dc-search").addEventListener("input", renderCurrentTab);

  Array.prototype.forEach.call(document.querySelectorAll(".znr-tab"), function (tabBtn) {
    tabBtn.addEventListener("click", function () {
      Array.prototype.forEach.call(document.querySelectorAll(".znr-tab"), function (b) { b.classList.remove("active"); });
      tabBtn.classList.add("active");
      currentTab = tabBtn.getAttribute("data-tab");
      renderCurrentTab();
    });
  });

  // Redimensionar panel arrastrando la barra superior
  (function enableResize() {
    var drag = document.getElementById("znr-dc-drag");
    var dragging = false;
    drag.addEventListener("mousedown", function () { dragging = true; document.body.style.userSelect = "none"; });
    window.addEventListener("mouseup", function () { dragging = false; document.body.style.userSelect = ""; });
    window.addEventListener("mousemove", function (e) {
      if (!dragging) return;
      var newHeight = window.innerHeight - e.clientY;
      if (newHeight > 120 && newHeight < window.innerHeight - 40) {
        panel.style.height = newHeight + "px";
      }
    });
  })();

  function updateBadge() {
    var total = counters.errors + counters.failedReq;
    var badge = document.getElementById("znr-dc-badge");
    if (total > 0) { badge.style.display = "inline-block"; badge.textContent = total > 99 ? "99+" : total; }
    else { badge.style.display = "none"; }
  }

  function renderCurrentTab() {
    if (currentTab === "console") renderConsole();
    else if (currentTab === "network") renderNetwork();
    else if (currentTab === "sw") renderServiceWorker();
    else if (currentTab === "cache") renderCache();
    else if (currentTab === "info") renderInfo();
  }

  function getFilter() {
    var el = document.getElementById("znr-dc-search");
    return el ? el.value.trim().toLowerCase() : "";
  }

  function renderConsole() {
    var body = document.getElementById("znr-dc-body");
    var filter = getFilter();
    var rows = consoleLogs.filter(function (e) {
      return !filter || e.text.toLowerCase().indexOf(filter) !== -1;
    });
    if (!rows.length) { body.innerHTML = '<div class="znr-empty">Sin registros de consola.</div>'; return; }
    body.innerHTML = rows.map(function (e) {
      return '<div class="znr-row ' + e.level + '"><span class="znr-time">' + e.time + '</span>' +
        escapeHtml(e.text) + '</div>';
    }).join("");
    body.scrollTop = body.scrollHeight;
  }

  function renderNetwork() {
    var body = document.getElementById("znr-dc-body");
    var filter = getFilter();
    var rows = networkLogs.filter(function (e) {
      return !filter || e.url.toLowerCase().indexOf(filter) !== -1;
    });
    if (!rows.length) { body.innerHTML = '<div class="znr-empty">Sin peticiones de red.</div>'; return; }
    body.innerHTML = rows.slice().reverse().map(function (e) {
      var statusClass = e.status === "…" ? "pending" : (e.ok ? "ok" : "bad");
      return '<div class="znr-net-row" data-id="' + e.id + '">' +
        '<span class="znr-net-method">' + escapeHtml(e.method) + '</span>' +
        '<span class="znr-net-status ' + statusClass + '">' + e.status + '</span>' +
        '<span class="znr-net-url" title="' + escapeHtml(e.url) + '">' + escapeHtml(e.url) + '</span>' +
        '<span class="znr-net-dur">' + (e.duration ? e.duration + "ms" : "") + '</span>' +
        '</div>' +
        '<div class="znr-net-detail" style="display:none" id="znr-net-detail-' + e.id + '"></div>';
    }).join("");
    body.scrollTop = 0;

    Array.prototype.forEach.call(body.querySelectorAll(".znr-net-row"), function (row) {
      row.addEventListener("click", function () {
        var id = row.getAttribute("data-id");
        var detailEl = document.getElementById("znr-net-detail-" + id);
        var isOpen = detailEl.style.display !== "none";
        detailEl.style.display = isOpen ? "none" : "block";
        if (!isOpen) {
          var entry = networkLogs.find(function (n) { return String(n.id) === id; });
          if (entry) {
            detailEl.innerHTML =
              '<h4>Encabezados de solicitud</h4>' + escapeHtml(entry.reqHeaders || "(ninguno)") +
              '<h4>Cuerpo de solicitud</h4>' + escapeHtml(entry.reqBody || "(vacío)") +
              '<h4>Respuesta</h4>' + escapeHtml(entry.resBody || "(sin datos aún)");
          }
        }
      });
    });
  }

  function renderServiceWorker() {
    var body = document.getElementById("znr-dc-body");
    if (!("serviceWorker" in navigator)) {
      body.innerHTML = '<div class="znr-empty">Este navegador no soporta Service Workers.</div>';
      return;
    }
    body.innerHTML = '<div class="znr-empty">Cargando registros…</div>';
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      var controller = navigator.serviceWorker.controller;
      var html = '<div class="znr-sw-card"><b>Controller actual:</b> ' +
        (controller ? escapeHtml(controller.scriptURL) + " (" + controller.state + ")" : "ninguno") +
        '</div>';
      if (!regs.length) {
        html += '<div class="znr-empty">No hay Service Workers registrados.</div>';
      } else {
        regs.forEach(function (reg, i) {
          var sw = reg.active || reg.installing || reg.waiting;
          html += '<div class="znr-sw-card">' +
            '<b>#' + (i + 1) + ' scope:</b> ' + escapeHtml(reg.scope) + '<br>' +
            '<b>script:</b> ' + escapeHtml(sw ? sw.scriptURL : "n/d") + '<br>' +
            '<b>estado:</b> ' + (sw ? sw.state : "n/d") +
            (reg.waiting ? ' <span style="color:#f4d03f">(hay una versión esperando)</span>' : '') + '<br>' +
            '<button class="znr-btn-mini znr-sw-update" data-scope="' + reg.scope + '">Buscar actualización</button> ' +
            '<button class="znr-btn-mini znr-sw-skip" data-scope="' + reg.scope + '">Activar waiting (skipWaiting)</button> ' +
            '<button class="znr-btn-mini znr-sw-remove" data-scope="' + reg.scope + '">Eliminar</button>' +
            '</div>';
        });
      }
      body.innerHTML = html;

      Array.prototype.forEach.call(body.querySelectorAll(".znr-sw-update"), function (b) {
        b.addEventListener("click", function () {
          var reg = regs.find(function (r) { return r.scope === b.getAttribute("data-scope"); });
          if (reg) reg.update().then(function () { renderServiceWorker(); });
        });
      });
      Array.prototype.forEach.call(body.querySelectorAll(".znr-sw-skip"), function (b) {
        b.addEventListener("click", function () {
          var reg = regs.find(function (r) { return r.scope === b.getAttribute("data-scope"); });
          if (reg && reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
          setTimeout(renderServiceWorker, 300);
        });
      });
      Array.prototype.forEach.call(body.querySelectorAll(".znr-sw-remove"), function (b) {
        b.addEventListener("click", function () {
          var reg = regs.find(function (r) { return r.scope === b.getAttribute("data-scope"); });
          if (reg && confirm("¿Eliminar este Service Worker?")) {
            reg.unregister().then(function () { renderServiceWorker(); });
          }
        });
      });
    });
  }

  function renderCache() {
    var body = document.getElementById("znr-dc-body");
    if (!("caches" in window)) {
      body.innerHTML = '<div class="znr-empty">Este navegador no soporta Cache Storage.</div>';
      return;
    }
    body.innerHTML = '<div class="znr-empty">Cargando cachés…</div>';
    caches.keys().then(function (names) {
      if (!names.length) {
        body.innerHTML = '<div class="znr-empty">No hay cachés almacenadas.</div>';
        return;
      }
      Promise.all(names.map(function (name) {
        return caches.open(name).then(function (c) { return c.keys().then(function (reqs) { return { name: name, reqs: reqs }; }); });
      })).then(function (results) {
        var html = '<button class="znr-btn-mini" id="znr-cache-delall" style="margin-bottom:8px;">Eliminar TODAS las cachés</button>';
        results.forEach(function (r) {
          html += '<div class="znr-cache-card">' +
            '<b>' + escapeHtml(r.name) + '</b> — ' + r.reqs.length + ' recursos ' +
            '<button class="znr-btn-mini znr-cache-del" data-name="' + escapeHtml(r.name) + '" style="float:right;">Eliminar</button>' +
            '<details style="margin-top:6px;"><summary>ver URLs</summary>' +
            r.reqs.slice(0, 200).map(function (req) { return '<div style="opacity:.8;">' + escapeHtml(req.url) + '</div>'; }).join("") +
            (r.reqs.length > 200 ? '<div class="znr-empty">… y ' + (r.reqs.length - 200) + ' más</div>' : '') +
            '</details></div>';
        });
        body.innerHTML = html;

        var delAllBtn = document.getElementById("znr-cache-delall");
        if (delAllBtn) delAllBtn.addEventListener("click", function () {
          if (confirm("¿Eliminar TODAS las cachés de este sitio?")) {
            Promise.all(names.map(function (n) { return caches.delete(n); })).then(renderCache);
          }
        });
        Array.prototype.forEach.call(body.querySelectorAll(".znr-cache-del"), function (b) {
          b.addEventListener("click", function () {
            var name = b.getAttribute("data-name");
            if (confirm('¿Eliminar la caché "' + name + '"?')) {
              caches.delete(name).then(renderCache);
            }
          });
        });
      });
    });
  }

  function renderInfo() {
    var body = document.getElementById("znr-dc-body");
    var isStandalone = window.matchMedia && window.matchMedia("(display-mode: standalone)").matches;
    var lines = [
      ["URL actual", location.href],
      ["User Agent", navigator.userAgent],
      ["¿En línea?", navigator.onLine ? "Sí" : "No (offline)"],
      ["Modo PWA (standalone)", isStandalone ? "Sí" : "No (pestaña normal de navegador)"],
      ["Service Worker soportado", ("serviceWorker" in navigator) ? "Sí" : "No"],
      ["Cache Storage soportado", ("caches" in window) ? "Sí" : "No"],
      ["Errores capturados", counters.errors],
      ["Peticiones fallidas", counters.failedReq]
    ];
    body.innerHTML = '<div class="znr-sw-card">' +
      lines.map(function (l) { return '<div><b>' + l[0] + ':</b> ' + escapeHtml(String(l[1])) + '</div>'; }).join("") +
      '</div>';
  }

  window.addEventListener("online", function () { addConsoleEntry("info", ["🌐 Conexión recuperada (online)"]); });
  window.addEventListener("offline", function () { addConsoleEntry("warn", ["🌐 Conexión perdida (offline)"]); });
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      addConsoleEntry("info", ["🔄 El Service Worker controller cambió (nueva versión activa)"]);
    });
  }

  originalConsole.info("%c[ZNR DevConsole] Activo. Haz clic en el botón 🛠 (abajo a la derecha).", "color:#f39c12;font-weight:bold;");
})();
