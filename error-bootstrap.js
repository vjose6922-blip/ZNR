// error-bootstrap.js
// ─────────────────────────────────────────────────────────────────
// ⚠️ IMPORTANTE: este <script> debe ser el PRIMERO en el <head>,
// SIN defer ni async, y ANTES que cualquier otro <script src="...">.
//
// Su único trabajo es registrar los listeners de error lo antes
// posible, para no perder errores que ocurran mientras los demás
// scripts (script.js, admin.js, vendedor.js, etc.) todavía se están
// parseando o ejecutando.
//
// error-monitor.js (que sí puede cargar después, con defer) drena
// el buffer __zrEarlyErrors en cuanto arranca y luego toma el
// control directo de los eventos futuros. Ver error-monitor.js.
// ─────────────────────────────────────────────────────────────────
(function () {
  'use strict';

  window.__zrEarlyErrors = window.__zrEarlyErrors || [];

  // Por defecto solo encolamos. error-monitor.js sobreescribe esta
  // función cuando carga, para procesar los eventos en tiempo real
  // en vez de solo guardarlos.
  window.__zrEarlyHandler = window.__zrEarlyHandler || function (type, payload) {
    window.__zrEarlyErrors.push({ type, payload, ts: Date.now() });
  };

  // capture:true es OBLIGATORIO aquí. Los errores de carga de
  // recursos (img/script/link que no cargan) NO hacen bubbling,
  // solo se ven en la fase de captura de un listener en window.
  window.addEventListener('error', function (e) {
    const isResourceError = !e.message && e.target && e.target !== window;

    if (isResourceError) {
      const el = e.target;
      const url = el.src || el.href || '';
      window.__zrEarlyHandler('resource', {
        tag: (el.tagName || 'UNKNOWN').toLowerCase(),
        url: url,
        message: `No se pudo cargar <${(el.tagName || '?').toLowerCase()}>: ${url || '(sin url)'}`
      });
    } else {
      window.__zrEarlyHandler('script', {
        message: e.message || '',
        filename: e.filename || '',
        lineno: e.lineno || 0,
        colno: e.colno || 0,
        stack: (e.error && e.error.stack) || ''
      });
    }
  }, true);

  window.addEventListener('unhandledrejection', function (e) {
    const reason = e.reason;
    window.__zrEarlyHandler('rejection', {
      message: (reason && reason.message) || String(reason).slice(0, 200),
      stack: (reason && reason.stack) || ''
    });
  });

  // Violaciones de Content-Security-Policy (recurso bloqueado, script
  // bloqueado, etc.) — útil para detectar configuraciones de CSP
  // demasiado estrictas o intentos de inyección.
  document.addEventListener('securitypolicyviolation', function (e) {
    window.__zrEarlyHandler('csp', {
      message: `CSP bloqueó "${e.violatedDirective}": ${e.blockedURI}`,
      directive: e.violatedDirective || '',
      blockedURI: e.blockedURI || '',
      sourceFile: e.sourceFile || '',
      lineNumber: e.lineNumber || 0
    });
  });

  // Bandera para que error-monitor.js sepa que ya hay listeners activos
  // y no necesita registrar los suyos (evita duplicados).
  window.__zrBootstrapLoaded = true;
})();
