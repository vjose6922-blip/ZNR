
(function () {
  'use strict';

  window.__zrEarlyErrors = window.__zrEarlyErrors || [];

  window.__zrEarlyHandler = window.__zrEarlyHandler || function (type, payload) {
    window.__zrEarlyErrors.push({ type, payload, ts: Date.now() });
  };

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

  document.addEventListener('securitypolicyviolation', function (e) {
    window.__zrEarlyHandler('csp', {
      message: `CSP bloqueó "${e.violatedDirective}": ${e.blockedURI}`,
      directive: e.violatedDirective || '',
      blockedURI: e.blockedURI || '',
      sourceFile: e.sourceFile || '',
      lineNumber: e.lineNumber || 0
    });
  });
  const _origConsoleError = console.error.bind(console);
  const _origConsoleWarn  = console.warn.bind(console);

  function _stringifyArgs(args) {
    return Array.prototype.map.call(args, function (a) {
      if (a instanceof Error) return a.message + (a.stack ? '\n' + a.stack : '');
      if (typeof a === 'object') {
        try { return JSON.stringify(a); } catch (_) { return String(a); }
      }
      return String(a);
    }).join(' ');
  }

  console.error = function () {
    window.__zrEarlyHandler('console', {
      level: 'ERROR',
      message: _stringifyArgs(arguments)
    });
    return _origConsoleError.apply(console, arguments);
  };

  console.warn = function () {
    window.__zrEarlyHandler('console', {
      level: 'WARN',
      message: _stringifyArgs(arguments)
    });
    return _origConsoleWarn.apply(console, arguments);
  };

  window.__zrBootstrapLoaded = true;
})();
