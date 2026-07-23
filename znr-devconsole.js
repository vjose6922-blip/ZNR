/* ============================================================
   ZNR DevConsole (extendida)
   Consola de depuración flotante para usar cuando el navegador
   tiene bloqueada la consola de DevTools.

   Pestañas incluidas:
     - Consola: console.log/info/warn/error, errores globales,
       promesas rechazadas.
     - Red: fetch, XMLHttpRequest y WebSocket (mensajes en vivo).
     - Service Worker: registros, update/skipWaiting/unregister,
       y mensajes que el SW envíe a la página (postMessage).
     - Storage: localStorage, sessionStorage y cookies (ver,
       agregar, editar, borrar).
     - IndexedDB: bases de datos, object stores y conteo de
       registros, con opción de borrar una base completa.
     - Rendimiento: Navigation Timing, Resource Timing (qué se
       sirvió desde caché vs red) y memoria JS (si el navegador
       la expone).
     - Info: datos generales del entorno (PWA, online/offline,
       soporte de APIs).

   Cómo activarla:
     1) Sube este archivo junto a tus demás .js (ej: devconsole.js)
     2) Agrega antes de </body> en la(s) página(s) que quieras
        depurar (vendedor.html, index.html, etc.):
          <script src="devconsole.js"></script>
     3) Abre la página normalmente y agrega ?dc=1 a la URL UNA
        sola vez, ej:
          https://tusitio.github.io/vendedor.html?dc=1
        Esto activa la herramienta y la deja guardada
        (localStorage) para que aparezca automáticamente en tus
        próximas visitas SOLO en tu navegador.
     4) Para desactivarla en este navegador, visita cualquier
        página con ?dc=0 una vez, o usa el botón "Apagar" del panel.

   Si NO se ha activado con ?dc=1 alguna vez, este script no hace
   absolutamente nada (0 impacto para tus usuarios reales de ZNR),
   así que es seguro dejarlo incluido en producción.
   ============================================================ */
(function () {
  "use strict";

  // ---------- Activación / seguridad ----------
  var STORAGE_KEY = "znrDC";
  var params;
  try { params = new URLSearchParams(window.location.search); } catch (e) { params = null; }

  if (params && params.get("dc") === "1") {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch (e) {}
  }
  if (params && params.get("dc") === "0") {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    return;
  }

  var active = false;
  try { active = localStorage.getItem(STORAGE_KEY) === "1"; } catch (e) {}
  if (!active) return;

  if (window.__znrDevConsoleLoaded) return;
  window.__znrDevConsoleLoaded = true;

  // ---------- Estado ----------
  var MAX_LOGS = 400;
  var consoleLogs = [];
  var networkLogs = [];
  var swMessages = [];
  var netIdSeq = 1;
  var counters = { errors: 0, failedReq: 0 };
  var consoleLevelFilter = { log: true, info: true, warn: true, error: true, debug: true };
  var networkTypeFilter = { fetch: true, xhr: true, ws: true };

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

  function trimArray(arr) { while (arr.length > MAX_LOGS) arr.shift(); }

  function downloadText(filename, text) {
    var blob = new Blob([text], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
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
    addConsoleEntry("error", [(e.message || "Error") + (e.filename ? " @ " + e.filename + ":" + e.lineno : "")]);
  });
  window.addEventListener("unhandledrejection", function (e) {
    addConsoleEntry("error", ["Promise rechazada sin manejar:", e.reason]);
  });

  function addConsoleEntry(level, args) {
    var entry = { level: level, time: ts(), text: args.map(safeStringify).join("  ") };
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
        id: netIdSeq++, type: "fetch", method: method, url: url, status: "…", duration: null,
        reqHeaders: (init && init.headers) ? safeStringify(init.headers) : "",
        reqBody: (init && init.body) ? truncate(safeStringify(init.body), 4000) : "",
        resBody: "", ok: null
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
        id: netIdSeq++, type: "xhr", method: this.__znr.method, url: this.__znr.url, status: "…", duration: null,
        reqHeaders: safeStringify(this.__znr.headers),
        reqBody: body ? truncate(safeStringify(body), 4000) : "",
        resBody: "", ok: null
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

  // ---------- Captura de WebSocket ----------
  if (window.WebSocket) {
    var OrigWS = window.WebSocket;
    var WSProxy = function (url, protocols) {
      var ws = protocols !== undefined ? new OrigWS(url, protocols) : new OrigWS(url);
      var entry = {
        id: netIdSeq++, type: "ws", method: "WS", url: String(url), status: "conectando", duration: null,
        reqHeaders: "", reqBody: "", resBody: "", ok: true, messages: []
      };
      addNetworkEntry(entry);
      ws.addEventListener("open", function () { entry.status = "abierto"; if (panelOpen && currentTab === "network") renderNetwork(); });
      ws.addEventListener("close", function (e) {
        entry.status = "cerrado (" + e.code + ")";
        if (panelOpen && currentTab === "network") renderNetwork();
      });
      ws.addEventListener("error", function () {
        entry.status = "error"; entry.ok = false; counters.failedReq++; updateBadge();
        if (panelOpen && currentTab === "network") renderNetwork();
      });
      ws.addEventListener("message", function (e) {
        entry.messages.push({ dir: "recibido", time: ts(), data: truncate(safeStringify(e.data), 1500) });
        if (entry.messages.length > 60) entry.messages.shift();
        if (panelOpen && currentTab === "network") renderNetwork();
      });
      var origSend = ws.send.bind(ws);
      ws.send = function (data) {
        entry.messages.push({ dir: "enviado", time: ts(), data: truncate(safeStringify(data), 1500) });
        if (entry.messages.length > 60) entry.messages.shift();
        if (panelOpen && currentTab === "network") renderNetwork();
        return origSend(data);
      };
      return ws;
    };
    WSProxy.prototype = OrigWS.prototype;
    ["CONNECTING", "OPEN", "CLOSING", "CLOSED"].forEach(function (k) { WSProxy[k] = OrigWS[k]; });
    window.WebSocket = WSProxy;
  }

  function addNetworkEntry(entry) {
    networkLogs.push(entry);
    trimArray(networkLogs);
    if (panelOpen && currentTab === "network") renderNetwork();
  }

  // ---------- Mensajes desde el Service Worker ----------
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", function (e) {
      swMessages.push({ time: ts(), data: truncate(safeStringify(e.data), 2000) });
      if (swMessages.length > 100) swMessages.shift();
      addConsoleEntry("info", ["📩 Mensaje del Service Worker:", e.data]);
      if (panelOpen && currentTab === "sw") renderServiceWorker();
    });
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      addConsoleEntry("info", ["🔄 El Service Worker controller cambió (nueva versión activa)"]);
    });
  }
  window.addEventListener("online", function () { addConsoleEntry("info", ["🌐 Conexión recuperada (online)"]); });
  window.addEventListener("offline", function () { addConsoleEntry("warn", ["🌐 Conexión perdida (offline)"]); });

  // ---------- UI: estilos ----------
  var css = "\
    #znr-dc-btn{position:fixed;bottom:16px;right:16px;z-index:2147483000;\
      width:48px;height:48px;border-radius:50%;background:#1e1e2e;color:#fff;\
      border:2px solid #3a3a52;font-size:20px;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.4);\
      display:flex;align-items:center;justify-content:center;font-family:monospace;}\
    #znr-dc-btn .znr-badge{position:absolute;top:-6px;right:-6px;background:#e74c3c;color:#fff;\
      font-size:11px;border-radius:10px;padding:1px 6px;font-family:sans-serif;display:none;}\
    #znr-dc-panel{position:fixed;left:0;right:0;bottom:0;height:50vh;min-height:220px;\
      background:#1e1e2e;color:#e6e6e6;z-index:2147483001;font-family:Consolas,monospace;\
      font-size:12px;display:none;flex-direction:column;box-shadow:0 -2px 14px rgba(0,0,0,.5);}\
    #znr-dc-panel.open{display:flex;}\
    #znr-dc-drag{height:6px;cursor:ns-resize;background:#3a3a52;flex-shrink:0;}\
    #znr-dc-head{display:flex;align-items:center;background:#151521;padding:4px 8px;gap:4px;\
      border-bottom:1px solid #3a3a52;flex-wrap:wrap;flex-shrink:0;}\
    #znr-dc-head b{color:#f39c12;font-size:12px;margin-right:8px;}\
    .znr-tab{background:none;border:none;color:#aaa;padding:6px 8px;cursor:pointer;font-family:inherit;\
      font-size:11px;border-bottom:2px solid transparent;white-space:nowrap;}\
    .znr-tab.active{color:#fff;border-bottom:2px solid #f39c12;}\
    .znr-spacer{flex:1;}\
    .znr-btn-mini{background:#2c2c40;color:#ddd;border:1px solid #3a3a52;border-radius:4px;\
      padding:3px 8px;cursor:pointer;font-size:11px;font-family:inherit;}\
    .znr-btn-mini:hover{background:#3a3a52;}\
    .znr-chip{background:#2c2c40;color:#999;border:1px solid #3a3a52;border-radius:10px;\
      padding:1px 8px;cursor:pointer;font-size:10px;margin-right:4px;display:inline-block;}\
    .znr-chip.on{color:#fff;border-color:#f39c12;}\
    #znr-dc-body{flex:1;overflow:auto;padding:6px 8px;}\
    #znr-dc-toolbar{padding:4px 0 8px;border-bottom:1px solid #2a2a3d;margin-bottom:6px;}\
    .znr-row{padding:3px 4px;border-bottom:1px solid #2a2a3d;white-space:pre-wrap;word-break:break-all;}\
    .znr-row.log{color:#e6e6e6;} .znr-row.info{color:#5dade2;}\
    .znr-row.warn{color:#f4d03f;background:rgba(244,208,63,.06);}\
    .znr-row.error{color:#ff6b6b;background:rgba(255,107,107,.08);}\
    .znr-time{color:#777;margin-right:6px;}\
    .znr-net-row{padding:4px;border-bottom:1px solid #2a2a3d;cursor:pointer;display:flex;gap:8px;}\
    .znr-net-row:hover{background:#26263a;}\
    .znr-net-method{color:#5dade2;width:44px;flex-shrink:0;}\
    .znr-net-status{width:70px;flex-shrink:0;}\
    .znr-net-status.ok{color:#2ecc71;} .znr-net-status.bad{color:#ff6b6b;} .znr-net-status.pending{color:#f4d03f;}\
    .znr-net-url{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}\
    .znr-net-dur{color:#888;width:60px;text-align:right;flex-shrink:0;}\
    .znr-net-detail{background:#151521;padding:8px;border-bottom:1px solid #3a3a52;white-space:pre-wrap;word-break:break-all;}\
    .znr-net-detail h4{margin:6px 0 2px;color:#f39c12;font-size:11px;}\
    .znr-filter{background:#2c2c40;border:1px solid #3a3a52;color:#eee;border-radius:4px;\
      padding:3px 6px;font-size:11px;font-family:inherit;}\
    .znr-card{background:#26263a;border:1px solid #3a3a52;border-radius:6px;padding:8px;margin-bottom:8px;}\
    .znr-card b{color:#f39c12;}\
    .znr-empty{color:#777;padding:10px;text-align:center;}\
    .znr-kv-row{display:flex;gap:6px;padding:2px 0;border-bottom:1px dashed #2a2a3d;align-items:flex-start;}\
    .znr-kv-key{color:#5dade2;width:180px;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}\
    .znr-kv-val{flex:1;word-break:break-all;}\
    .znr-kv-actions{flex-shrink:0;}\
    table.znr-table{width:100%;border-collapse:collapse;}\
    table.znr-table td,table.znr-table th{padding:3px 6px;border-bottom:1px solid #2a2a3d;text-align:left;}\
    table.znr-table th{color:#f39c12;font-weight:normal;}\
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
      '<button class="znr-tab" data-tab="storage">Storage</button>' +
      '<button class="znr-tab" data-tab="idb">IndexedDB</button>' +
      '<button class="znr-tab" data-tab="perf">Rendimiento</button>' +
      '<button class="znr-tab" data-tab="info">Info</button>' +
      '<input class="znr-filter" id="znr-dc-search" placeholder="filtrar…" style="width:120px;">' +
      '<div class="znr-spacer"></div>' +
      '<button class="znr-btn-mini" id="znr-dc-clear">Limpiar</button>' +
      '<button class="znr-btn-mini" id="znr-dc-copy">Copiar</button>' +
      '<button class="znr-btn-mini" id="znr-dc-export">Exportar reporte</button>' +
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
    panelOpen = false; panel.classList.remove("open");
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
  document.getElementById("znr-dc-export").addEventListener("click", exportFullReport);
  document.getElementById("znr-dc-search").addEventListener("input", renderCurrentTab);

  Array.prototype.forEach.call(document.querySelectorAll(".znr-tab"), function (tabBtn) {
    tabBtn.addEventListener("click", function () {
      Array.prototype.forEach.call(document.querySelectorAll(".znr-tab"), function (b) { b.classList.remove("active"); });
      tabBtn.classList.add("active");
      currentTab = tabBtn.getAttribute("data-tab");
      renderCurrentTab();
    });
  });

  (function enableResize() {
    var drag = document.getElementById("znr-dc-drag");
    var dragging = false;
    drag.addEventListener("mousedown", function () { dragging = true; document.body.style.userSelect = "none"; });
    window.addEventListener("mouseup", function () { dragging = false; document.body.style.userSelect = ""; });
    window.addEventListener("mousemove", function (e) {
      if (!dragging) return;
      var newHeight = window.innerHeight - e.clientY;
      if (newHeight > 120 && newHeight < window.innerHeight - 40) panel.style.height = newHeight + "px";
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
    else if (currentTab === "storage") renderStorage();
    else if (currentTab === "idb") renderIDB();
    else if (currentTab === "perf") renderPerf();
    else if (currentTab === "info") renderInfo();
  }

  function getFilter() {
    var el = document.getElementById("znr-dc-search");
    return el ? el.value.trim().toLowerCase() : "";
  }

  // ---------- Consola ----------
  function renderConsole() {
    var body = document.getElementById("znr-dc-body");
    var filter = getFilter();
    var chips = levels.map(function (lvl) {
      return '<span class="znr-chip ' + (consoleLevelFilter[lvl] ? "on" : "") + '" data-lvl="' + lvl + '">' + lvl + '</span>';
    }).join("");
    var rows = consoleLogs.filter(function (e) {
      if (!consoleLevelFilter[e.level]) return false;
      return !filter || e.text.toLowerCase().indexOf(filter) !== -1;
    });
    var html = '<div id="znr-dc-toolbar">' + chips + '</div>';
    html += rows.length ? rows.map(function (e) {
      return '<div class="znr-row ' + e.level + '"><span class="znr-time">' + e.time + '</span>' + escapeHtml(e.text) + '</div>';
    }).join("") : '<div class="znr-empty">Sin registros de consola.</div>';
    body.innerHTML = html;
    Array.prototype.forEach.call(body.querySelectorAll(".znr-chip"), function (chip) {
      chip.addEventListener("click", function () {
        var lvl = chip.getAttribute("data-lvl");
        consoleLevelFilter[lvl] = !consoleLevelFilter[lvl];
        renderConsole();
      });
    });
    body.scrollTop = body.scrollHeight;
  }

  // ---------- Red ----------
  function renderNetwork() {
    var body = document.getElementById("znr-dc-body");
    var filter = getFilter();
    var chips = Object.keys(networkTypeFilter).map(function (t) {
      return '<span class="znr-chip ' + (networkTypeFilter[t] ? "on" : "") + '" data-type="' + t + '">' + t + '</span>';
    }).join("");
    var rows = networkLogs.filter(function (e) {
      if (!networkTypeFilter[e.type]) return false;
      return !filter || e.url.toLowerCase().indexOf(filter) !== -1;
    });
    var html = '<div id="znr-dc-toolbar">' + chips + '</div>';
    if (!rows.length) {
      html += '<div class="znr-empty">Sin actividad de red.</div>';
      body.innerHTML = html;
      return;
    }
    html += rows.slice().reverse().map(function (e) {
      var statusClass = (e.status === "…" || e.status === "conectando") ? "pending" : (e.ok ? "ok" : "bad");
      return '<div class="znr-net-row" data-id="' + e.id + '">' +
        '<span class="znr-net-method">' + escapeHtml(e.method) + '</span>' +
        '<span class="znr-net-status ' + statusClass + '">' + e.status + '</span>' +
        '<span class="znr-net-url" title="' + escapeHtml(e.url) + '">' + escapeHtml(e.url) + '</span>' +
        '<span class="znr-net-dur">' + (e.duration ? e.duration + "ms" : "") + '</span>' +
        '</div>' +
        '<div class="znr-net-detail" style="display:none" id="znr-net-detail-' + e.id + '"></div>';
    }).join("");
    body.innerHTML = html;
    body.scrollTop = 0;

    Array.prototype.forEach.call(body.querySelectorAll(".znr-chip"), function (chip) {
      chip.addEventListener("click", function () {
        var t = chip.getAttribute("data-type");
        networkTypeFilter[t] = !networkTypeFilter[t];
        renderNetwork();
      });
    });
    Array.prototype.forEach.call(body.querySelectorAll(".znr-net-row"), function (row) {
      row.addEventListener("click", function () {
        var id = row.getAttribute("data-id");
        var detailEl = document.getElementById("znr-net-detail-" + id);
        var isOpen = detailEl.style.display !== "none";
        detailEl.style.display = isOpen ? "none" : "block";
        if (!isOpen) {
          var entry = networkLogs.find(function (n) { return String(n.id) === id; });
          if (!entry) return;
          if (entry.type === "ws") {
            detailEl.innerHTML = '<h4>Mensajes WebSocket (' + entry.messages.length + ')</h4>' +
              (entry.messages.length ? entry.messages.map(function (m) {
                return '<div><span class="znr-time">' + m.time + '</span>[' + m.dir + '] ' + escapeHtml(m.data) + '</div>';
              }).join("") : "(sin mensajes aún)");
          } else {
            detailEl.innerHTML =
              '<h4>Encabezados de solicitud</h4>' + escapeHtml(entry.reqHeaders || "(ninguno)") +
              '<h4>Cuerpo de solicitud</h4>' + escapeHtml(entry.reqBody || "(vacío)") +
              '<h4>Respuesta</h4>' + escapeHtml(entry.resBody || "(sin datos aún)");
          }
        }
      });
    });
  }

  // ---------- Service Worker ----------
  function renderServiceWorker() {
    var body = document.getElementById("znr-dc-body");
    if (!("serviceWorker" in navigator)) {
      body.innerHTML = '<div class="znr-empty">Este navegador no soporta Service Workers.</div>';
      return;
    }
    body.innerHTML = '<div class="znr-empty">Cargando registros…</div>';
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      var controller = navigator.serviceWorker.controller;
      var html = '<div class="znr-card"><b>Controller actual:</b> ' +
        (controller ? escapeHtml(controller.scriptURL) + " (" + controller.state + ")" : "ninguno") + '</div>';
      if (!regs.length) {
        html += '<div class="znr-empty">No hay Service Workers registrados.</div>';
      } else {
        regs.forEach(function (reg, i) {
          var sw = reg.active || reg.installing || reg.waiting;
          html += '<div class="znr-card">' +
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
      html += '<div class="znr-card"><b>Mensajes recibidos del SW (' + swMessages.length + ')</b><br>' +
        (swMessages.length ? swMessages.slice().reverse().map(function (m) {
          return '<div><span class="znr-time">' + m.time + '</span>' + escapeHtml(m.data) + '</div>';
        }).join("") : '<span class="znr-empty">Ninguno todavía.</span>') + '</div>';
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
          if (reg && confirm("¿Eliminar este Service Worker?")) reg.unregister().then(function () { renderServiceWorker(); });
        });
      });
    });
  }

  // ---------- Storage: localStorage / sessionStorage / cookies ----------
  function renderKVSection(title, storageObj, keyPrefix) {
    var rows = "";
    var keys = [];
    try { keys = Object.keys(storageObj); } catch (e) {}
    if (!keys.length) {
      rows = '<div class="znr-empty">(vacío)</div>';
    } else {
      rows = keys.map(function (k) {
        var val = "";
        try { val = storageObj.getItem(k); } catch (e) { val = "(error al leer)"; }
        return '<div class="znr-kv-row">' +
          '<div class="znr-kv-key" title="' + escapeHtml(k) + '">' + escapeHtml(k) + '</div>' +
          '<div class="znr-kv-val">' + escapeHtml(truncate(val || "", 300)) + '</div>' +
          '<div class="znr-kv-actions">' +
          '<button class="znr-btn-mini znr-kv-edit" data-key="' + escapeHtml(k) + '" data-prefix="' + keyPrefix + '">Editar</button> ' +
          '<button class="znr-btn-mini znr-kv-del" data-key="' + escapeHtml(k) + '" data-prefix="' + keyPrefix + '">Borrar</button>' +
          '</div></div>';
      }).join("");
    }
    return '<div class="znr-card"><b>' + title + ' (' + keys.length + ')</b> ' +
      '<button class="znr-btn-mini znr-kv-add" data-prefix="' + keyPrefix + '" style="float:right;">+ Agregar</button>' +
      '<button class="znr-btn-mini znr-kv-clear" data-prefix="' + keyPrefix + '" style="float:right;margin-right:6px;">Vaciar</button>' +
      '<div style="clear:both;margin-top:6px;">' + rows + '</div></div>';
  }

  function renderCookies() {
    var cookieStr = document.cookie || "";
    var pairs = cookieStr.split(";").map(function (s) { return s.trim(); }).filter(Boolean);
    var rows = pairs.length ? pairs.map(function (p) {
      var idx = p.indexOf("=");
      var k = idx === -1 ? p : p.slice(0, idx);
      var v = idx === -1 ? "" : p.slice(idx + 1);
      return '<div class="znr-kv-row">' +
        '<div class="znr-kv-key" title="' + escapeHtml(k) + '">' + escapeHtml(k) + '</div>' +
        '<div class="znr-kv-val">' + escapeHtml(truncate(decodeURIComponent(v || ""), 300)) + '</div>' +
        '<div class="znr-kv-actions"><button class="znr-btn-mini znr-cookie-del" data-key="' + escapeHtml(k) + '">Borrar</button></div>' +
        '</div>';
    }).join("") : '<div class="znr-empty">(sin cookies accesibles por JS — las httpOnly no se pueden ver aquí)</div>';
    return '<div class="znr-card"><b>Cookies (' + pairs.length + ')</b><div style="margin-top:6px;">' + rows + '</div></div>';
  }

  function renderStorage() {
    var body = document.getElementById("znr-dc-body");
    var html = renderKVSection("localStorage", localStorage, "local") +
      renderKVSection("sessionStorage", sessionStorage, "session") +
      renderCookies();
    body.innerHTML = html;

    function getStore(prefix) { return prefix === "local" ? localStorage : sessionStorage; }

    Array.prototype.forEach.call(body.querySelectorAll(".znr-kv-edit"), function (b) {
      b.addEventListener("click", function () {
        var key = b.getAttribute("data-key"), store = getStore(b.getAttribute("data-prefix"));
        var current = store.getItem(key) || "";
        var val = prompt('Nuevo valor para "' + key + '":', current);
        if (val !== null) { store.setItem(key, val); renderStorage(); }
      });
    });
    Array.prototype.forEach.call(body.querySelectorAll(".znr-kv-del"), function (b) {
      b.addEventListener("click", function () {
        var key = b.getAttribute("data-key"), store = getStore(b.getAttribute("data-prefix"));
        store.removeItem(key); renderStorage();
      });
    });
    Array.prototype.forEach.call(body.querySelectorAll(".znr-kv-add"), function (b) {
      b.addEventListener("click", function () {
        var store = getStore(b.getAttribute("data-prefix"));
        var key = prompt("Nueva clave:");
        if (!key) return;
        var val = prompt('Valor para "' + key + '":', "");
        if (val !== null) { store.setItem(key, val); renderStorage(); }
      });
    });
    Array.prototype.forEach.call(body.querySelectorAll(".znr-kv-clear"), function (b) {
      b.addEventListener("click", function () {
        var store = getStore(b.getAttribute("data-prefix"));
        if (confirm("¿Vaciar por completo este storage?")) { store.clear(); renderStorage(); }
      });
    });
    Array.prototype.forEach.call(body.querySelectorAll(".znr-cookie-del"), function (b) {
      b.addEventListener("click", function () {
        var key = b.getAttribute("data-key");
        document.cookie = key + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        renderStorage();
      });
    });
  }

  // ---------- IndexedDB ----------
  function renderIDB() {
    var body = document.getElementById("znr-dc-body");
    if (!("indexedDB" in window)) {
      body.innerHTML = '<div class="znr-empty">Este navegador no soporta IndexedDB.</div>';
      return;
    }
    if (!indexedDB.databases) {
      body.innerHTML = '<div class="znr-empty">Tu navegador no permite listar las bases de IndexedDB automáticamente (funciona mejor en Chrome/Edge).</div>';
      return;
    }
    body.innerHTML = '<div class="znr-empty">Cargando bases de datos…</div>';
    indexedDB.databases().then(function (dbs) {
      if (!dbs.length) { body.innerHTML = '<div class="znr-empty">No hay bases de IndexedDB.</div>'; return; }
      var htmlParts = [];
      var pending = dbs.length;
      dbs.forEach(function (dbInfo) {
        var req = indexedDB.open(dbInfo.name);
        req.onsuccess = function () {
          var db = req.result;
          var storeNames = Array.prototype.slice.call(db.objectStoreNames);
          if (!storeNames.length) {
            htmlParts.push({ name: dbInfo.name, html: '<div class="znr-card"><b>' + escapeHtml(dbInfo.name) + '</b> (v' + dbInfo.version + ') — sin object stores' +
              '<button class="znr-btn-mini znr-idb-del" data-name="' + escapeHtml(dbInfo.name) + '" style="float:right;">Eliminar base</button></div>' });
            db.close(); finish();
            return;
          }
          var tx = db.transaction(storeNames, "readonly");
          var counts = {};
          var remaining = storeNames.length;
          storeNames.forEach(function (sn) {
            var countReq = tx.objectStore(sn).count();
            countReq.onsuccess = function () {
              counts[sn] = countReq.result;
              remaining--;
              if (remaining === 0) {
                var storesHtml = storeNames.map(function (sn2) {
                  return '<div>— ' + escapeHtml(sn2) + ': ' + counts[sn2] + ' registro(s)</div>';
                }).join("");
                htmlParts.push({
                  name: dbInfo.name,
                  html: '<div class="znr-card"><b>' + escapeHtml(dbInfo.name) + '</b> (v' + dbInfo.version + ')' +
                    '<button class="znr-btn-mini znr-idb-del" data-name="' + escapeHtml(dbInfo.name) + '" style="float:right;">Eliminar base</button>' +
                    '<div style="margin-top:6px;">' + storesHtml + '</div></div>'
                });
                db.close(); finish();
              }
            };
            countReq.onerror = function () { remaining--; if (remaining === 0) finish(); };
          });
        };
        req.onerror = function () {
          htmlParts.push({ name: dbInfo.name, html: '<div class="znr-card"><b>' + escapeHtml(dbInfo.name) + '</b> — no se pudo abrir</div>' });
          finish();
        };
      });
      function finish() {
        pending--;
        if (pending === 0) {
          htmlParts.sort(function (a, b) { return a.name.localeCompare(b.name); });
          body.innerHTML = htmlParts.map(function (p) { return p.html; }).join("");
          Array.prototype.forEach.call(body.querySelectorAll(".znr-idb-del"), function (b) {
            b.addEventListener("click", function () {
              var name = b.getAttribute("data-name");
              if (confirm('¿Eliminar la base IndexedDB "' + name + '"? Esto puede afectar sesión/autenticación local (ej. Firebase).')) {
                indexedDB.deleteDatabase(name);
                setTimeout(renderIDB, 300);
              }
            });
          });
        }
      }
    }).catch(function (err) {
      body.innerHTML = '<div class="znr-empty">Error al listar IndexedDB: ' + escapeHtml(err.message || String(err)) + '</div>';
    });
  }

  // ---------- Rendimiento ----------
  function renderPerf() {
    var body = document.getElementById("znr-dc-body");
    var html = '<button class="znr-btn-mini" id="znr-perf-refresh">Refrescar</button> ' +
      '<button class="znr-btn-mini" id="znr-perf-clear">Limpiar marcas de recursos</button><br><br>';

    var nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
    if (nav) {
      html += '<div class="znr-card"><b>Navegación (ms)</b><br>' +
        'DNS: ' + (nav.domainLookupEnd - nav.domainLookupStart).toFixed(0) + '<br>' +
        'Conexión TCP: ' + (nav.connectEnd - nav.connectStart).toFixed(0) + '<br>' +
        'TTFB (respuesta del servidor): ' + (nav.responseStart - nav.requestStart).toFixed(0) + '<br>' +
        'Descarga de documento: ' + (nav.responseEnd - nav.responseStart).toFixed(0) + '<br>' +
        'DOMContentLoaded: ' + (nav.domContentLoadedEventEnd - nav.startTime).toFixed(0) + '<br>' +
        'Carga total (load): ' + (nav.loadEventEnd - nav.startTime).toFixed(0) + '<br>' +
        'Tipo de navegación: ' + nav.type +
        '</div>';
    } else {
      html += '<div class="znr-empty">Navigation Timing no disponible.</div>';
    }

    if (performance.memory) {
      var mb = function (n) { return (n / 1048576).toFixed(1) + " MB"; };
      html += '<div class="znr-card"><b>Memoria JS (aprox., solo Chrome)</b><br>' +
        'Usada: ' + mb(performance.memory.usedJSHeapSize) + '<br>' +
        'Asignada: ' + mb(performance.memory.totalJSHeapSize) + '<br>' +
        'Límite: ' + mb(performance.memory.jsHeapSizeLimit) + '</div>';
    }

    var resources = (performance.getEntriesByType && performance.getEntriesByType("resource")) || [];
    html += '<div class="znr-card"><b>Recursos cargados (' + resources.length + ')</b>' +
      '<table class="znr-table"><tr><th>Recurso</th><th>Tipo</th><th>Duración</th><th>Origen</th></tr>' +
      resources.slice(-150).map(function (r) {
        var cached = r.transferSize === 0 && r.decodedBodySize > 0;
        var name = r.name.length > 70 ? "…" + r.name.slice(-70) : r.name;
        return '<tr><td title="' + escapeHtml(r.name) + '">' + escapeHtml(name) + '</td>' +
          '<td>' + escapeHtml(r.initiatorType) + '</td>' +
          '<td>' + r.duration.toFixed(0) + 'ms</td>' +
          '<td>' + (cached ? '<span style="color:#2ecc71">caché</span>' : 'red') + '</td></tr>';
      }).join("") + '</table></div>';

    body.innerHTML = html;
    document.getElementById("znr-perf-refresh").addEventListener("click", renderPerf);
    document.getElementById("znr-perf-clear").addEventListener("click", function () {
      if (performance.clearResourceTimings) performance.clearResourceTimings();
      renderPerf();
    });
  }

  // ---------- Info ----------
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
      ["IndexedDB.databases() soportado", (indexedDB && indexedDB.databases) ? "Sí" : "No"],
      ["Errores capturados", counters.errors],
      ["Peticiones fallidas", counters.failedReq]
    ];
    body.innerHTML = '<div class="znr-card">' +
      lines.map(function (l) { return '<div><b>' + l[0] + ':</b> ' + escapeHtml(String(l[1])) + '</div>'; }).join("") +
      '</div>';
  }

  // ---------- Exportar reporte completo ----------
  function exportFullReport() {
    var report = {
      generadoEn: new Date().toISOString(),
      url: location.href,
      userAgent: navigator.userAgent,
      consola: consoleLogs,
      red: networkLogs,
      mensajesServiceWorker: swMessages,
      localStorage: (function () { try { return Object.assign({}, localStorage); } catch (e) { return {}; } })(),
      sessionStorage: (function () { try { return Object.assign({}, sessionStorage); } catch (e) { return {}; } })(),
      cookies: document.cookie
    };
    downloadText("znr-devconsole-reporte-" + Date.now() + ".json", JSON.stringify(report, null, 2));
    originalConsole.info("[ZNR DevConsole] Reporte exportado.");
  }

  originalConsole.info("%c[ZNR DevConsole] Activo (extendida). Haz clic en el botón 🛠 (abajo a la derecha).", "color:#f39c12;font-weight:bold;");
})();
