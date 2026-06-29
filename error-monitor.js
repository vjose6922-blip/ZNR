(function () {
  'use strict';

  const EM_KEY              = 'zr_error_queue';
  const EM_MAX_LOCAL        = 100;
  const EM_DEBOUNCE         = 1000;
  const EM_MAX_SENDS_PER_LOAD = 40; // límite de seguridad: no saturar el backend si hay un loop de errores

  let _lastErrors = {};
  let _queue      = [];
  let _sendsThisLoad = 0;

  // Cargar errores previos al inicio
  try {
    const stored = JSON.parse(localStorage.getItem(EM_KEY) || '[]');
    _queue = stored.slice(0, EM_MAX_LOCAL);
  } catch (_) {}

  window.ZRMonitor = {
    report,
    flush,
    getErrors: () => _queue.slice(),
    clear: () => { _queue = []; persistQueue(); }
  };

  function report(level, source, action, message, extra = {}) {
    const key = `${source}:${action}:${message}`;
    const now = Date.now();

    if (_lastErrors[key] && now - _lastErrors[key] < EM_DEBOUNCE) return;
    _lastErrors[key] = now;

    const entry = {
      ts:      new Date().toISOString(),
      level,
      source,
      action,
      message: String(message).slice(0, 300),
      url:     window.location.pathname.split('/').pop(),
      ua:      navigator.userAgent.slice(0, 80),
      filename: extra.filename || '',
      lineno:   extra.lineno   || 0,
      colno:    extra.colno    || 0,
      stack:    (extra.stack || '').slice(0, 500),
    };

    _queue.push(entry);
    if (_queue.length > EM_MAX_LOCAL) _queue.shift();
    persistQueue();

    // Enviar al servidor con los nuevos campos
    sendEntry(entry);
  }

  function persistQueue() {
    try {
      localStorage.setItem(EM_KEY, JSON.stringify(_queue));
    } catch (_) {}
  }

  async function sendEntry(entry) {
    const api = window.API_URL;
    if (!api) return;
    if (_sendsThisLoad >= EM_MAX_SENDS_PER_LOAD) return; // ya está en localStorage, se reintentará en el próximo flush()
    _sendsThisLoad++;
    try {
      const params = new URLSearchParams({
        action:   'logError',
        nivel:    entry.level,
        fuente:   entry.source,
        accion:   entry.action,
        mensaje:  entry.message,
        url:      entry.url,
        ua:       entry.ua,
        filename: entry.filename,
        lineno:   entry.lineno,
        colno:    entry.colno,
        stack:    entry.stack,
        ts:       entry.ts,
      });
      await fetch(api, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    params.toString(),
      });
    } catch (_) {
      // Si falla el envío, no importa, ya está en localStorage
    }
  }

  async function flush() {
    const queue = _queue.slice();
    for (const entry of queue) {
      await sendEntry(entry);
    }
  }

  // ─── Manejo unificado de eventos (propios + heredados del buffer temprano) ───

  function handleScriptError(payload) {
    // Ignorar ruido conocido: loops del ResizeObserver y errores opacos
    // de scripts cross-origin sin CORS (no traen información útil)
    if (!payload.message ||
        payload.message.includes('ResizeObserver') ||
        payload.message.includes('Script error')) return;

    const filename = payload.filename || '';
    report(
      'ERROR',
      filename.split('/').pop() || 'global',
      'uncaughtError',
      payload.message,
      { filename, lineno: payload.lineno, colno: payload.colno, stack: payload.stack }
    );
  }

  function handleResourceError(payload) {
    report(
      'ERROR',
      (payload.tag || 'recurso').toUpperCase(),
      'resourceLoadError',
      payload.message,
      { filename: payload.url || '' }
    );
  }

  function handleRejection(payload) {
    if (!payload.message || payload.message === 'undefined') return;
    report(
      'ERROR',
      'promise',
      'unhandledRejection',
      payload.message,
      { filename: 'promise', stack: payload.stack }
    );
  }

  function handleCSP(payload) {
    report(
      'CRÍTICO',
      'csp',
      'cspViolation',
      payload.message,
      { filename: payload.sourceFile || payload.blockedURI || '', lineno: payload.lineNumber || 0 }
    );
  }

  function handleEarlyEvent(type, payload) {
    switch (type) {
      case 'script':      return handleScriptError(payload);
      case 'resource':    return handleResourceError(payload);
      case 'rejection':   return handleRejection(payload);
      case 'csp':         return handleCSP(payload);
    }
  }

  // ─── 1) Drenar lo que pasó ANTES de que este script cargara ───
  // (capturado por error-bootstrap.js, que debe cargar primero)
  if (Array.isArray(window.__zrEarlyErrors) && window.__zrEarlyErrors.length) {
    window.__zrEarlyErrors.forEach(item => handleEarlyEvent(item.type, item.payload));
    window.__zrEarlyErrors = [];
  }

  // ─── 2) A partir de ahora, los eventos van directo a nuestro manejador ───
  // (sin esto, error-bootstrap.js seguiría solo guardándolos en el buffer)
  window.__zrEarlyHandler = handleEarlyEvent;

  // Si por algún motivo error-bootstrap.js no se cargó en esta página
  // (p. ej. una página vieja a la que aún no se le agregó), registramos
  // los listeners aquí también como respaldo. No genera duplicados
  // porque solo ocurre cuando el bootstrap nunca corrió.
  if (!window.__zrBootstrapLoaded) {
    window.addEventListener('error', (e) => {
      const isResourceError = !e.message && e.target && e.target !== window;
      if (isResourceError) {
        const el = e.target;
        handleResourceError({ tag: (el.tagName || '?').toLowerCase(), url: el.src || el.href || '', message: `No se pudo cargar <${(el.tagName || '?').toLowerCase()}>: ${el.src || el.href || ''}` });
      } else {
        handleScriptError({ message: e.message, filename: e.filename, lineno: e.lineno, colno: e.colno, stack: e.error?.stack || '' });
      }
    }, true);
    window.addEventListener('unhandledrejection', (e) => {
      handleRejection({ message: e.reason?.message || String(e.reason).slice(0, 200), stack: e.reason?.stack || '' });
    });
    document.addEventListener('securitypolicyviolation', (e) => {
      handleCSP({ message: `CSP bloqueó "${e.violatedDirective}": ${e.blockedURI}`, sourceFile: e.sourceFile, lineNumber: e.lineNumber, blockedURI: e.blockedURI });
    });
  }

  // ─── Función para mostrar errores en el panel (opcional) ──

  window.showErrorLog = function() {
    const errors = _queue.slice().reverse();
    if (!errors.length) {
      alert('No hay errores registrados.');
      return;
    }

    let html = `<div style="font-family:monospace;font-size:13px;max-height:80vh;overflow-y:auto;padding:10px;">`;
    html += `<h3>📋 Registro de errores (${errors.length})</h3>`;
    html += `<table style="width:100%;border-collapse:collapse;text-align:left;">`;
    html += `<tr><th>Fecha</th><th>Nivel</th><th>Fuente</th><th>Acción</th><th>Mensaje</th></tr>`;
    errors.forEach(e => {
      const fecha = new Date(e.ts).toLocaleString('es-MX');
      const color = e.level === 'CRÍTICO' ? '#ef4444' : '#f97316';
      html += `<tr style="border-bottom:1px solid #eee;">`;
      html += `<td style="padding:4px 8px;">${fecha}</td>`;
      html += `<td style="padding:4px 8px;color:${color};font-weight:700;">${e.level}</td>`;
      html += `<td style="padding:4px 8px;">${e.source || e.filename || '?'}</td>`;
      html += `<td style="padding:4px 8px;">${e.action || ''}</td>`;
      html += `<td style="padding:4px 8px;">${e.message}</td>`;
      html += `</tr>`;
      if (e.filename || e.lineno) {
        html += `<tr><td colspan="5" style="padding:0 8px 4px 8px;color:#aaa;font-size:11px;">${e.filename || ''}${e.lineno ? ':' + e.lineno + ':' + e.colno : ''}</td></tr>`;
      }
      if (e.stack) {
        html += `<tr><td colspan="5" style="padding:2px 8px 10px 8px;color:#888;font-size:11px;white-space:pre-wrap;">${e.stack}</td></tr>`;
      }
    });
    html += `</table>`;
    html += `<div style="margin-top:10px;display:flex;gap:10px;">`;
    html += `<button onclick="ZRMonitor.clear();alert('Errores borrados');location.reload();" style="padding:6px 14px;border:none;border-radius:6px;background:#ef4444;color:#fff;cursor:pointer;">🗑️ Borrar todos</button>`;
    html += `<button onclick="document.getElementById('error-log-modal').remove();" style="padding:6px 14px;border:none;border-radius:6px;background:#666;color:#fff;cursor:pointer;">Cerrar</button>`;
    html += `</div></div>`;

    const modal = document.createElement('div');
    modal.id = 'error-log-modal';
    modal.style.cssText = `
      position:fixed; top:0; left:0; width:100%; height:100%;
      background:rgba(0,0,0,0.6); backdrop-filter:blur(4px);
      z-index:99999; display:flex; align-items:center; justify-content:center;
      padding:20px;
    `;
    modal.innerHTML = `<div style="background:#fff; border-radius:16px; max-width:800px; width:100%; padding:20px; box-shadow:0 20px 60px rgba(0,0,0,0.3);">${html}</div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  };

  // ─── Asegurar que la cola se envíe aunque el usuario cierre/minimice rápido ──

  function flushOnExit() {
    if (_queue.length) flush();
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushOnExit();
  });
  window.addEventListener('pagehide', flushOnExit);

  // ─── Inicialización ──────────────────────────────────────────

  console.log(`📊 ZRMonitor: ${_queue.length} errores en caché local.`);
  console.log('💡 Para ver errores guardados, ejecuta: ZRMonitor.getErrors()');
  console.log('💡 Para mostrar panel: showErrorLog()');

  window.addEventListener('load', () => setTimeout(flush, 3000));
})();