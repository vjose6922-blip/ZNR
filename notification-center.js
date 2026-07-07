/**
 * ============================================================
 * Centro de Notificaciones — Z&R
 * ============================================================
 * Widget compartido: campanita en el header + modal con el
 * historial de notificaciones del usuario (comprador o vendedor).
 *
 * Identidad:
 *  - Vendedor: si existe localStorage.vendor_session (token+uid) válido.
 *  - Comprador: si no hay sesión de vendedor, usa localStorage.client_phone.
 *
 * WhatsApp SIEMPRE es respaldo, nunca se dispara en paralelo con el push:
 * el backend solo entrega un "whatsappUrl" en la notificación cuando el
 * push no llegó a ningún dispositivo. Si ese link viene, se muestra un
 * botón secundario "Escribir por WhatsApp" dentro de la notificación.
 *
 * Cárgalo con: <script src="notification-center.js" defer></script>
 * (después de api-config.js y common.js)
 * ============================================================
 */
(function () {
  'use strict';

  const POLL_MS = 60000; // refresco de badge cada 60s
  let modalBuilt = false;
  let currentTab = 'pedidos';
  let cache = { items: [], loaded: false };

  const TIPO_INFO = {
    confirmacion_stock:     { grupo: 'pedidos', icono: '📦' },
    sin_stock:               { grupo: 'pedidos', icono: '❌' },
    solicitud_comprador:     { grupo: 'pedidos', icono: '🛍️' },
    confirmacion_vendedor:   { grupo: 'pedidos', icono: '✅' },
    sin_stock_vendedor:      { grupo: 'pedidos', icono: '❌' },
    pedido_en_camino:        { grupo: 'pedidos', icono: '🚚' },
    pedido_entregado:        { grupo: 'pedidos', icono: '📬' },
    cuenta_aprobada:         { grupo: 'cuenta',  icono: '🎉' },
    cuenta_rechazada:        { grupo: 'cuenta',  icono: '🚫' },
    cuenta_suspendida:       { grupo: 'cuenta',  icono: '⛔' },
    cuenta_reactivada:       { grupo: 'cuenta',  icono: '♻️' },
    producto_aprobado:       { grupo: 'cuenta',  icono: '✅' },
    producto_rechazado:      { grupo: 'cuenta',  icono: '🚫' },
    producto_reportado:      { grupo: 'cuenta',  icono: '🚩' },
    beneficiario_aprobado:   { grupo: 'cuenta',  icono: '💜' },
    beneficiario_rechazado:  { grupo: 'cuenta',  icono: '🚫' },
    plus_aprobado:           { grupo: 'cuenta',  icono: '⭐' },
    plus_rechazado:          { grupo: 'cuenta',  icono: '⭐' }
  };

  function getIdentity() {
    try {
      const stored = localStorage.getItem('vendor_session');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.token && parsed.uid) {
          return { type: 'vendedor', id: parsed.uid, vendorToken: parsed.token };
        }
      }
    } catch (_) {}
    const phone = localStorage.getItem('client_phone');
    if (phone) return { type: 'cliente', id: phone };
    return null;
  }

  function apiUrl() {
    return window.API_URL;
  }

  async function fetchNotificaciones() {
    const identity = getIdentity();
    if (!identity || !apiUrl()) return { ok: true, notificaciones: [] };
    const params = new URLSearchParams({
      action: identity.type === 'vendedor' ? 'misNotificacionesVendedor' : 'misNotificacionesCliente',
      pageSize: '30'
    });
    if (identity.type === 'vendedor') params.set('vendorToken', identity.vendorToken);
    else params.set('phone', identity.id);
    try {
      const res = await fetch(`${apiUrl()}?${params.toString()}`);
      return await res.json();
    } catch (e) {
      return { ok: false, notificaciones: [] };
    }
  }

  async function marcarLeida(id) {
    const identity = getIdentity();
    if (!identity || !apiUrl()) return;
    const body = { action: 'marcarNotificacionLeida', id, ownerType: identity.type };
    if (identity.type === 'vendedor') body.vendorToken = identity.vendorToken;
    else body.phone = identity.id;
    try { await fetch(apiUrl(), { method: 'POST', body: JSON.stringify(body) }); } catch (_) {}
  }

  async function marcarTodasLeidas() {
    const identity = getIdentity();
    if (!identity || !apiUrl()) return;
    const body = { action: 'marcarTodasNotificacionesLeidas', ownerType: identity.type };
    if (identity.type === 'vendedor') body.vendorToken = identity.vendorToken;
    else body.phone = identity.id;
    try { await fetch(apiUrl(), { method: 'POST', body: JSON.stringify(body) }); } catch (_) {}
  }

  function injectStyles() {
    if (document.getElementById('nc-styles')) return;
    const s = document.createElement('style');
    s.id = 'nc-styles';
    s.textContent = `
#notif-bell-btn{position:relative}
.nc-badge{position:absolute;top:2px;right:2px;background:#ff4f81;color:#fff;border-radius:50px;font-size:10px;font-weight:800;line-height:1;padding:3px 5px;min-width:16px;text-align:center;box-shadow:0 0 0 2px var(--color-surface,#252831)}
#nc-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);z-index:9200;opacity:0;pointer-events:none;transition:opacity .25s ease}
#nc-overlay.visible{opacity:1;pointer-events:auto}
#nc-modal{position:fixed;top:0;right:0;height:100dvh;width:min(420px,100vw);background:var(--color-surface,#252831);border-left:1px solid var(--color-border-subtle,rgba(255,255,255,.07));z-index:9201;display:flex;flex-direction:column;transform:translateX(100%);transition:transform .28s cubic-bezier(.4,0,.2,1);box-shadow:-8px 0 40px rgba(0,0,0,.4)}
#nc-modal.visible{transform:translateX(0)}
.nc-header{display:flex;align-items:center;justify-content:space-between;padding:18px 20px 14px;border-bottom:1px solid rgba(255,255,255,.07);flex-shrink:0}
.nc-title{font-size:16px;font-weight:700;margin:0;color:var(--color-text-primary,#fff);display:flex;align-items:center;gap:8px}
.nc-close{background:rgba(255,255,255,.07);border:none;color:var(--color-text-secondary,#aaa);width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center}
.nc-close:hover{background:rgba(255,79,129,.15);color:#ff4f81}
.nc-tabs{display:flex;gap:6px;padding:12px 16px 0;border-bottom:1px solid rgba(255,255,255,.07);flex-shrink:0}
.nc-tab{flex:1;text-align:center;padding:9px 6px;border-radius:10px 10px 0 0;border:none;background:transparent;color:var(--color-text-muted,#888);font-size:13px;font-weight:600;cursor:pointer}
.nc-tab.active{background:rgba(255,79,129,.12);color:#ff4f81}
.nc-markall{background:none;border:none;color:#ff4f81;font-size:12px;font-weight:600;cursor:pointer;padding:8px 16px;text-align:right}
.nc-list{flex:1;overflow-y:auto;padding:10px 14px 20px}
.nc-empty{text-align:center;color:var(--color-text-muted,#888);padding:60px 20px;font-size:13px}
.nc-item{display:flex;gap:12px;padding:14px;border-radius:14px;background:rgba(255,255,255,.03);margin-bottom:10px;border:1px solid rgba(255,255,255,.06);cursor:pointer;position:relative}
.nc-item.unread{background:rgba(255,79,129,.07);border-color:rgba(255,79,129,.25)}
.nc-item.unread::before{content:'';position:absolute;top:14px;left:5px;width:7px;height:7px;border-radius:50%;background:#ff4f81}
.nc-icon{font-size:20px;flex-shrink:0;width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.05);border-radius:10px}
.nc-body{flex:1;min-width:0}
.nc-item-title{font-size:13.5px;font-weight:700;color:var(--color-text-primary,#fff);margin:0 0 3px}
.nc-item-msg{font-size:12.5px;color:var(--color-text-secondary,#bbb);margin:0 0 6px;line-height:1.4}
.nc-item-fecha{font-size:11px;color:var(--color-text-muted,#777)}
.nc-wa-btn{display:inline-flex;align-items:center;gap:5px;margin-top:8px;padding:6px 12px;border-radius:20px;background:#25d36622;color:#25d366;font-size:11.5px;font-weight:700;border:1px solid #25d36655;text-decoration:none}
.nc-wa-btn:hover{background:#25d36633}
`;
    document.head.appendChild(s);
  }

  function buildModal() {
    if (modalBuilt) return;
    injectStyles();
    const overlay = document.createElement('div');
    overlay.id = 'nc-overlay';
    const modal = document.createElement('div');
    modal.id = 'nc-modal';
    modal.innerHTML = `
      <div class="nc-header">
        <p class="nc-title">🔔 Notificaciones</p>
        <button class="nc-close" id="nc-close-btn">✕</button>
      </div>
      <div class="nc-tabs">
        <button class="nc-tab active" data-tab="pedidos">Pedidos</button>
        <button class="nc-tab" data-tab="cuenta">Cuenta</button>
      </div>
      <button class="nc-markall" id="nc-markall-btn">Marcar todas como leídas</button>
      <div class="nc-list" id="nc-list"></div>
    `;
    document.body.appendChild(overlay);
    document.body.appendChild(modal);
    modalBuilt = true;

    overlay.addEventListener('click', closeModal);
    document.getElementById('nc-close-btn').addEventListener('click', closeModal);
    document.getElementById('nc-markall-btn').addEventListener('click', async () => {
      await marcarTodasLeidas();
      cache.items.forEach(n => n.leida = true);
      renderList();
      updateBadge();
    });
    modal.querySelectorAll('.nc-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        currentTab = tab.dataset.tab;
        modal.querySelectorAll('.nc-tab').forEach(t => t.classList.toggle('active', t === tab));
        renderList();
      });
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  }

  function fechaCorta(fecha) {
    try {
      const d = new Date(fecha);
      return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) + ' · ' +
             d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    } catch (_) { return ''; }
  }

  function renderList() {
    const listEl = document.getElementById('nc-list');
    if (!listEl) return;
    const items = cache.items.filter(n => (TIPO_INFO[n.tipo] || {}).grupo === currentTab || (!TIPO_INFO[n.tipo] && currentTab === 'pedidos'));
    if (!items.length) {
      listEl.innerHTML = `<div class="nc-empty">Sin notificaciones por aquí todavía 👀</div>`;
      return;
    }
    listEl.innerHTML = items.map(n => {
      const info = TIPO_INFO[n.tipo] || { icono: '🔔' };
      let meta = {};
      try { meta = n.meta ? JSON.parse(n.meta) : {}; } catch (_) {}
      const waBtn = meta.whatsappUrl
        ? `<a class="nc-wa-btn" href="${meta.whatsappUrl}" target="_blank" rel="noopener" onclick="event.stopPropagation()">📲 Escribir por WhatsApp</a>`
        : '';
      return `
        <div class="nc-item ${n.leida ? '' : 'unread'}" data-id="${n.id}" data-url="${n.url || ''}">
          <div class="nc-icon">${info.icono}</div>
          <div class="nc-body">
            <p class="nc-item-title">${n.titulo || ''}</p>
            <p class="nc-item-msg">${n.mensaje || ''}</p>
            <p class="nc-item-fecha">${fechaCorta(n.fecha)}</p>
            ${waBtn}
          </div>
        </div>`;
    }).join('');

    listEl.querySelectorAll('.nc-item').forEach(el => {
      el.addEventListener('click', async () => {
        const id = el.dataset.id;
        const url = el.dataset.url;
        const notif = cache.items.find(n => String(n.id) === String(id));
        if (notif && !notif.leida) {
          notif.leida = true;
          el.classList.remove('unread');
          await marcarLeida(id);
          updateBadge();
        }
        if (url) window.location.href = url;
      });
    });
  }

  function updateBadge() {
    const unread = cache.items.filter(n => !n.leida).length;
    document.querySelectorAll('#notif-bell-btn').forEach(btn => {
      let badge = btn.querySelector('.nc-badge');
      if (unread > 0) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'nc-badge';
          btn.appendChild(badge);
        }
        badge.textContent = unread > 99 ? '99+' : unread;
      } else if (badge) {
        badge.remove();
      }
    });
  }

  async function loadNotificaciones() {
    const data = await fetchNotificaciones();
    cache.items = (data && data.ok && Array.isArray(data.notificaciones)) ? data.notificaciones : [];
    cache.loaded = true;
    updateBadge();
    renderList();
  }

  function openModal() {
    buildModal();
    document.getElementById('nc-overlay').classList.add('visible');
    document.getElementById('nc-modal').classList.add('visible');
    loadNotificaciones();
  }

  function closeModal() {
    const overlay = document.getElementById('nc-overlay');
    const modal = document.getElementById('nc-modal');
    if (overlay) overlay.classList.remove('visible');
    if (modal) modal.classList.remove('visible');
  }

  function wireBellButtons() {
    document.querySelectorAll('#notif-bell-btn').forEach(btn => {
      if (btn.dataset.ncWired) return;
      btn.dataset.ncWired = '1';
      btn.addEventListener('click', openModal);
    });
  }

  async function refreshBadgeOnly() {
    const data = await fetchNotificaciones();
    if (data && data.ok && Array.isArray(data.notificaciones)) {
      cache.items = data.notificaciones;
      updateBadge();
    }
  }

  function init() {
    injectStyles();
    wireBellButtons();
    refreshBadgeOnly();
    setInterval(refreshBadgeOnly, POLL_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
