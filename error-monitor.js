(function () {
'use strict';

const EM_KEY       = 'zr_error_queue';
const EM_MAX_LOCAL = 50;
const EM_DEBOUNCE  = 3000;

let _lastErrors = {};
let _queue      = [];

window.ZRMonitor = {
  report,
  flush,
};

function report(level, source, action, message) {
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
  };

  _queue.push(entry);
  persistQueue();

  sendEntry(entry);
}

function persistQueue() {
  try {
    const stored = loadQueue();
    const merged = [...stored, ..._queue].slice(-EM_MAX_LOCAL);
    localStorage.setItem(EM_KEY, JSON.stringify(merged));
    _queue = [];
  } catch (_) {}
}

function loadQueue() {
  try { return JSON.parse(localStorage.getItem(EM_KEY) || '[]'); }
  catch (_) { return []; }
}

async function sendEntry(entry) {
  const api = window.API_URL;
  if (!api) return;
  try {
    const params = new URLSearchParams({
      action:  'logError',
      nivel:   entry.level,
      fuente:  entry.source,
      accion:  entry.action,
      mensaje: entry.message,
      url:     entry.url,
      ts:      entry.ts,
    });
    await fetch(api, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    params.toString(),
    });
  } catch (_) {

  }
}

async function flush() {
  const queue = loadQueue();
  if (!queue.length) return;
  for (const entry of queue) await sendEntry(entry);
  localStorage.removeItem(EM_KEY);
}

window.addEventListener('load', () => setTimeout(flush, 4000));

window.addEventListener('error', (e) => {

  if (!e.message || e.message.includes('ResizeObserver') || e.message.includes('Script error')) return;
  report('ERROR', e.filename ? e.filename.split('/').pop() : 'global', 'uncaughtError', e.message);
});

window.addEventListener('unhandledrejection', (e) => {
  const msg = e.reason?.message || String(e.reason).slice(0, 200);
  if (!msg || msg === 'undefined') return;
  report('ERROR', 'promise', 'unhandledRejection', msg);
});

})();

let _cachedErrorLog = [];

async function loadErrorLog() {
  const list = document.getElementById('em-list');
  if (!list) return;
  list.innerHTML = '<p style="color:var(--color-text-muted);text-align:center;padding:20px">Cargando...</p>';

  const local = (() => { try { return JSON.parse(localStorage.getItem('zr_error_queue') || '[]'); } catch(_){return[];} })();

  try {
    const api = window.API_URL;
    if (!api) throw new Error('API no disponible');
    const params = new URLSearchParams({ action: 'obtenerErrorLog', token: sessionStorage.getItem('admin_token') || '' });
    const res  = await fetch(api, { method: 'POST', headers: {'Content-Type':'application/x-www-form-urlencoded'}, body: params.toString() });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Error del servidor');

    _cachedErrorLog = [...(data.errors || []), ...local].sort((a, b) => new Date(b.ts) - new Date(a.ts));
  } catch (_) {

    _cachedErrorLog = local.sort((a, b) => new Date(b.ts) - new Date(a.ts));
  }

  renderErrorLog();
}

function renderErrorLog() {
  const list   = document.getElementById('em-list');
  const filter = document.getElementById('em-filter')?.value || 'all';
  const badge  = document.getElementById('em-badge');
  if (!list) return;

  const entries = filter === 'all' ? _cachedErrorLog : _cachedErrorLog.filter(e => e.level === filter || e.nivel === filter);

  const critCount = _cachedErrorLog.filter(e => (e.level || e.nivel) === 'CRÍTICO').length;
  if (badge) { badge.textContent = critCount; badge.style.display = critCount ? 'inline-block' : 'none'; }

  if (!entries.length) {
    list.innerHTML = '<p style="color:var(--color-text-muted);text-align:center;padding:20px">Sin errores registrados</p>';
    return;
  }

  const rows = entries.slice(0, 100).map(e => {
    const level   = e.level   || e.nivel   || 'ERROR';
    const source  = e.source  || e.fuente  || '?';
    const action  = e.action  || e.accion  || '?';
    const message = e.message || e.mensaje || '?';
    const ts      = e.ts ? new Date(e.ts).toLocaleString('es-MX', {dateStyle:'short', timeStyle:'short'}) : '';
    const color   = level === 'CRÍTICO' ? '#ef4444' : '#f97316';
    const bg      = level === 'CRÍTICO' ? 'rgba(239,68,68,0.08)' : 'rgba(249,115,22,0.06)';

    return `<div style="display:flex;gap:12px;align-items:flex-start;padding:10px 12px;border-radius:10px;background:${bg};margin-bottom:8px;border-left:3px solid ${color}">
      <div style="flex:1;min-width:0">
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:4px">
          <span style="background:${color};color:#fff;border-radius:6px;padding:1px 7px;font-size:10px;font-weight:700">${escapeHtml(level)}</span>
          <span style="color:var(--color-text-soft);font-size:11px">${ts}</span>
          <span style="color:var(--color-text-soft);font-size:11px">${escapeHtml(source)} › ${escapeHtml(action)}</span>
        </div>
        <div style="color:var(--color-text-main);font-size:13px">${escapeHtml(message)}</div>
      </div>
    </div>`;
  }).join('');

  list.innerHTML = rows + (entries.length > 100 ? `<p style="color:var(--color-text-soft);font-size:12px;text-align:center">Mostrando los últimos 100 de ${entries.length}</p>` : '');
}

async function clearErrorLog() {
  if (!confirm('¿Limpiar el log de errores? No se puede deshacer.')) return;
  localStorage.removeItem('zr_error_queue');
  _cachedErrorLog = [];
  try {
    const api = window.API_URL;
    const params = new URLSearchParams({ action: 'limpiarErrorLog', token: sessionStorage.getItem('admin_token') || '' });
    await fetch(api, { method: 'POST', headers: {'Content-Type':'application/x-www-form-urlencoded'}, body: params.toString() });
  } catch (_) {}
  renderErrorLog();
}
