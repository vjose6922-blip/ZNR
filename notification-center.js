
(function () {
  'use strict';

  const POLL_MS = 180000; 
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
    plus_rechazado:          { grupo: 'cuenta',  icono: '⭐' },
    donacion_recibida:       { grupo: 'cuenta',  icono: '🎁' },
    donacion_retirada:       { grupo: 'cuenta',  icono: '📤' }
  };

  function getIdentity() {
    try {
      const stored = localStorage.getItem('vendor_session');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.token && parsed.uid) {
          return { type: 'vendedor', id: parsed.uid, vendorToken: parsed.token, telefono: parsed.telefono || '' };
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

  async function fetchFeed(action, extraParams) {
    const params = new URLSearchParams({ action, pageSize: '30', ...extraParams });
    try {
      const res = await fetch(`${apiUrl()}?${params.toString()}`);
      return await res.json();
    } catch (e) {
      return { ok: false, notificaciones: [] };
    }
  }

  async function fetchNotificaciones() {
    const identity = getIdentity();
    if (!identity || !apiUrl()) return { ok: true, notificaciones: [] };

    const requests = [];
    if (identity.type === 'vendedor') {
      requests.push(fetchFeed('misNotificacionesVendedor', { vendorToken: identity.vendorToken }));
      // El vendedor también puede comprar con su propio teléfono: traemos
      // esas notificaciones también y las combinamos con las de vendedor.
      if (identity.telefono) {
        requests.push(fetchFeed('misNotificacionesCliente', { phone: identity.telefono }));
      }
    } else {
      requests.push(fetchFeed('misNotificacionesCliente', { phone: identity.id }));
    }

    const results = await Promise.all(requests);
    const notificaciones = results
      .filter(r => r && r.ok && Array.isArray(r.notificaciones))
      .flatMap(r => r.notificaciones);
    notificaciones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    return { ok: true, notificaciones };
  }

  function postAction(body) {
    return fetch(apiUrl(), { method: 'POST', body: JSON.stringify(body) }).catch(() => {});
  }

  // Recibe la notificación completa (no solo el id) porque, si el usuario
  // es vendedor+comprador a la vez, cada notificación puede pertenecer a
  // una identidad distinta (vendedor por uid, o cliente por teléfono).
  async function marcarLeida(notif) {
    const identity = getIdentity();
    if (!identity || !apiUrl() || !notif) return;
    const body = { action: 'marcarNotificacionLeida', id: notif.id, ownerType: notif.ownerType };
    if (notif.ownerType === 'vendedor') {
      body.vendorToken = identity.vendorToken;
    } else {
      body.phone = identity.type === 'vendedor' ? identity.telefono : identity.id;
    }
    await postAction(body);
  }

  async function marcarTodasLeidas() {
    const identity = getIdentity();
    if (!identity || !apiUrl()) return;
    const calls = [];
    if (identity.type === 'vendedor') {
      calls.push(postAction({ action: 'marcarTodasNotificacionesLeidas', ownerType: 'vendedor', vendorToken: identity.vendorToken }));
      if (identity.telefono) {
        calls.push(postAction({ action: 'marcarTodasNotificacionesLeidas', ownerType: 'cliente', phone: identity.telefono }));
      }
    } else {
      calls.push(postAction({ action: 'marcarTodasNotificacionesLeidas', ownerType: 'cliente', phone: identity.id }));
    }
    await Promise.all(calls);
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
          await marcarLeida(notif);
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

  function pickTabWithUnread() {
    const counts = { pedidos: 0, cuenta: 0 };
    cache.items.forEach(n => {
      if (n.leida) return;
      const grupo = (TIPO_INFO[n.tipo] || {}).grupo || 'pedidos';
      counts[grupo] = (counts[grupo] || 0) + 1;
    });
    // Si "Pedidos" no tiene nada sin leer pero "Cuenta" sí, abre en "Cuenta".
    // En cualquier otro caso (ambas tienen, ninguna tiene, etc.) se queda en "Pedidos".
    if (counts.pedidos === 0 && counts.cuenta > 0) return 'cuenta';
    return 'pedidos';
  }

  async function loadNotificaciones(opts) {
    const autoSelectTab = !!(opts && opts.autoSelectTab);
    const data = await fetchNotificaciones();
    cache.items = (data && data.ok && Array.isArray(data.notificaciones)) ? data.notificaciones : [];
    cache.loaded = true;
    if (autoSelectTab) {
      currentTab = pickTabWithUnread();
      const modal = document.getElementById('nc-modal');
      if (modal) {
        modal.querySelectorAll('.nc-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === currentTab));
      }
    }
    updateBadge();
    renderList();
  }

  function openModal() {
    buildModal();
    document.getElementById('nc-overlay').classList.add('visible');
    document.getElementById('nc-modal').classList.add('visible');
    loadNotificaciones({ autoSelectTab: true });
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

  window.addEventListener('znr:nueva-notificacion', refreshBadgeOnly);
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'znr-nueva-notificacion') {
        refreshBadgeOnly();
      }
    });
  }
 
  // 🆕 Al volver a la pestaña tras estar oculta, refresca por si se perdió algún push
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshBadgeOnly();
  });
  
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
