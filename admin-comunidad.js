(function () {

  
  const STYLES = `
<style id="admin-comunidad-styles">
.vendor-row, .pending-product-row {
  display: flex; align-items: center; gap: 14px;
  padding: 12px 16px; border-radius: 14px;
  background: var(--color-bg-secondary, #f5f5f8);
  margin-bottom: 10px; flex-wrap: wrap;
}
.vendor-row .info, .pending-product-row .info { flex: 1; min-width: 0; }
.vendor-row .info strong, .pending-product-row .info strong { display: block; font-size: 14px; }
.vendor-row .info span, .pending-product-row .info span { font-size: 12px; color: #888; }
.vendor-row .actions, .pending-product-row .actions { display: flex; gap: 8px; flex-shrink: 0; }
.btn-approve { padding:6px 14px;border:none;border-radius:20px;background:#e8f5e9;color:#2e7d32;font-size:12px;font-weight:600;cursor:pointer; }
.btn-reject  { padding:6px 14px;border:none;border-radius:20px;background:#ffebee;color:#c62828;font-size:12px;font-weight:600;cursor:pointer; }
.btn-suspend { padding:6px 14px;border:none;border-radius:20px;background:#fff3e0;color:#e65100;font-size:12px;font-weight:600;cursor:pointer; }
.btn-stats   { padding:6px 14px;border:none;border-radius:20px;background:#e8e8ff;color:#3b1f5f;font-size:12px;font-weight:600;cursor:pointer; }
#vendor-stats-modal {
  display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);
  backdrop-filter:blur(4px);z-index:10000;align-items:center;justify-content:center;
}
#vendor-stats-modal.open { display:flex; }
.vendor-stats-box { background:#fff;border-radius:20px;padding:28px;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.25);position:relative; }
.vendor-stats-box h3 { margin:0 0 16px;font-size:18px; }
.vstats-grid { display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px; }
.vstat-card { background:#f5f5f8;border-radius:12px;padding:12px;text-align:center; }
.vstat-val { font-size:22px;font-weight:800;color:#3b1f5f;display:block; }
.vstat-lbl { font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.04em; }
.pending-product-row img { width:56px;height:56px;object-fit:contain;border-radius:10px;background:#fff;flex-shrink:0; }
.vest-pendiente  { display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;background:#fff8e1;color:#f57f17; }
.vest-activo     { display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;background:#e8f5e9;color:#2e7d32; }
.vest-rechazado  { display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;background:#ffebee;color:#c62828; }
.vest-suspendido { display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;background:#fff3e0;color:#e65100; }
.reporte-row { display:flex;align-items:flex-start;gap:14px;padding:12px 16px;border-radius:14px;background:var(--color-bg-secondary,#f5f5f8);margin-bottom:10px;flex-wrap:wrap; }
.reporte-row .info { flex:1;min-width:0; }
.reporte-row .info strong { display:block;font-size:13px; }
.reporte-row .info span { font-size:12px;color:#888; }
.reporte-row .actions { display:flex;gap:8px;flex-wrap:wrap;flex-shrink:0; }
.btn-ver-producto { padding:6px 14px;border:none;border-radius:20px;background:#e8e8ff;color:#3b1f5f;font-size:12px;font-weight:600;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center; }
.btn-del-desde-reporte { padding:6px 14px;border:none;border-radius:20px;background:#ffebee;color:#c62828;font-size:12px;font-weight:600;cursor:pointer; }
.btn-marcar-revisado { padding:6px 14px;border:none;border-radius:20px;background:#e8f5e9;color:#2e7d32;font-size:12px;font-weight:600;cursor:pointer; }
#reportes-badge { display:inline-flex;align-items:center;justify-content:center;background:#ef4444;color:#fff;border-radius:50%;width:18px;height:18px;font-size:10px;font-weight:700;margin-left:6px;vertical-align:middle; }
</style>`;

  
  function _escapeHtml(str) {
    if (typeof escapeHtml === 'function') return escapeHtml(str);
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
  }
  function _getToken() {
    if (typeof getToken === 'function') return getToken();
    return sessionStorage.getItem('admin_token') || '';
  }
  function _gasGet(params) {
    if (typeof gasGet === 'function') return gasGet(params);
    const url = API_URL + '?' + new URLSearchParams(params).toString();
    return fetch(url).then(r => r.json());
  }
  function _gasPost(params) {
    if (typeof gasPost === 'function') return gasPost(params);
    return fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString()
    }).then(r => r.json());
  }
  function _msg(text, type) {
    if (typeof showTemporaryMessage === 'function') showTemporaryMessage(text, type);
  }
  function _optimizeDriveUrl(url, size) {
    if (typeof optimizeDriveUrl === 'function') return optimizeDriveUrl(url, size);
    return url;
  }

  
  function init() {
    if (!_getToken()) return;
    if (!document.getElementById('admin-comunidad-styles')) {
      document.head.insertAdjacentHTML('beforeend', STYLES);
    }
    loadVendors();
    loadPendingProducts();
    loadReportes();
  }

  
  async function loadVendors() {
    const container = document.getElementById('admin-vendors-list');
    if (!container) return;
    container.innerHTML = '<p style="color:#aaa;text-align:center">Cargando...</p>';
    try {
      const data = await _gasGet({ action: 'vendedoresAdmin', token: _getToken() });
      if (!data.ok) throw new Error(data.error);
      const vendors = data.vendors || [];
      if (!vendors.length) {
        container.innerHTML = '<p style="color:#aaa;text-align:center">No hay vendedores registrados aún.</p>';
        return;
      }
      window._allVendors = vendors;
      container.innerHTML = vendors.map(v => `
        <div class="vendor-row" id="vrow-${_escapeHtml(v.uid)}">
          <div class="info">
            <strong>${_escapeHtml(v.nombre)}</strong>
            <span> ${_escapeHtml(v.telefono)}</span><br>
            <span class="vest-${_escapeHtml(v.estado)}">${_escapeHtml(v.estado)}</span>
            <span style="font-size:11px;color:#aaa;margin-left:8px">${v.fecha ? new Date(v.fecha).toLocaleDateString() : ''}</span>
            ${v.productos != null ? `<span style="font-size:11px;color:#888;margin-left:8px"> ${v.productos} productos</span>` : ''}
          </div>
          <div class="actions" style="flex-wrap:wrap;gap:6px;">
            ${v.estado === 'pendiente' ? `
              <button class="btn-approve" onclick="AdminComunidad.aprobarVendedor('${_escapeHtml(v.uid)}')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-check"/></svg> Aprobar</button>
              <button class="btn-reject"  onclick="AdminComunidad.rechazarVendedor('${_escapeHtml(v.uid)}')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-x"/></svg> Rechazar</button>` : ''}
            ${v.estado === 'activo' ? `
              <button class="btn-suspend" onclick="AdminComunidad.suspenderVendedor('${_escapeHtml(v.uid)}','${_escapeHtml(v.nombre)}')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-suspend"/></svg> Suspender</button>
              <button class="btn-stats"   onclick="AdminComunidad.verEstadisticas('${_escapeHtml(v.uid)}','${_escapeHtml(v.nombre)}')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-stats"/></svg> Stats</button>` : ''}
            ${(v.estado === 'suspendido' || v.estado === 'rechazado') ? `
              <button class="btn-approve" onclick="AdminComunidad.aprobarVendedor('${_escapeHtml(v.uid)}')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"/></svg> Activar</button>` : ''}
          </div>
        </div>`).join('');
      const pending = vendors.filter(v => v.estado === 'pendiente').length;
      if (typeof window._updateNotifTabBadge === 'function') window._updateNotifTabBadge('vendors', pending);
    } catch (err) {
      container.innerHTML = `<p style="color:#ef4444">Error: ${_escapeHtml(err.message)}</p>`;
    }
  }

  async function aprobarVendedor(uid) { await _vendorAction(uid, 'aprobarVendedor', ' Vendedor aprobado'); }
  async function rechazarVendedor(uid) { await _vendorAction(uid, 'rechazarVendedor', ' Vendedor rechazado'); }

  async function _vendorAction(uid, action, msg) {
    try {
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      let waWindow = null;
      if (action === 'aprobarVendedor' && !isMobile) {
        waWindow = window.open('', '_blank');
        if (waWindow) waWindow.document.write('<p style="font-family:sans-serif;padding:20px">⏳ Aprobando vendedor, un momento...</p>');
      }
      const data = await _gasPost({ action, uid, token: _getToken() });
      if (!data.ok) { if (waWindow) waWindow.close(); throw new Error(data.error); }
      if (action === 'aprobarVendedor' && data.codigo && data.telefono) {
        const row    = document.getElementById(`vrow-${uid}`);
        const nombre = row ? row.querySelector('.info strong')?.textContent?.trim() || 'Vendedor' : 'Vendedor';
        const mensaje =
          ` *¡Cuenta aprobada!* \n\n` +
          `Hola ${nombre}, tu cuenta de vendedor en Z&R Comunidad ha sido *aprobada*.\n\n` +
          `*Tu contraseña temporal es:* ${data.codigo}\n\n` +
          `Puedes cambiarla después de iniciar sesión.\n\n` +
          ` Accede aquí: vjose6922-blip.github.io/ZNR/vendedor.html\n\n` +
          `¡Bienvenido! `;
        if (isMobile) {
          if (waWindow) waWindow.close();
          window.location.href = `whatsapp://send?phone=52${data.telefono}&text=${encodeURIComponent(mensaje)}`;
        } else {
          if (waWindow) waWindow.location.href = `https://wa.me/52${data.telefono}?text=${encodeURIComponent(mensaje)}`;
        }
      }
      _msg(msg, 'success');
      loadVendors();
      if (typeof window.refreshAllAdminBadges === 'function') window.refreshAllAdminBadges();
    } catch (err) {
      _msg(' ' + err.message, 'error');
    }
  }

  async function suspenderVendedor(uid, nombre) {
    if (typeof showCustomConfirm !== 'function') return;
    showCustomConfirm({
      title: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-suspend"/></svg> Suspender vendedor',
      message: `¿Deseas suspender a "${nombre}"? Podrás reactivarlo en cualquier momento.`,
      icon: '', confirmText: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-suspend"/></svg> Suspender', cancelText: 'Cancelar',
      onConfirm: async () => {
        try {
          const data = await _gasPost({ action: 'rechazarVendedor', uid, token: _getToken() });
          if (!data.ok) throw new Error(data.error);
          _msg('⏸ Vendedor suspendido', 'success');
          loadVendors();
        } catch (err) { _msg(' ' + err.message, 'error'); }
      }
    });
  }

  function verEstadisticas(uid, nombre) {
    let modal = document.getElementById('vendor-stats-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'vendor-stats-modal';
      modal.innerHTML = `<div class="vendor-stats-box">
        <button id="vstats-close" style="position:absolute;top:14px;right:14px;background:none;border:none;font-size:20px;cursor:pointer;color:#aaa;"></button>
        <h3 id="vstats-title">Estadísticas</h3>
        <div class="vstats-grid" id="vstats-grid"><p style="color:#aaa;text-align:center;grid-column:span 2">Cargando...</p></div>
        <div id="vstats-products" style="margin-top:8px;max-height:260px;overflow-y:auto;"></div>
      </div>`;
      document.body.appendChild(modal);
      modal.querySelector('#vstats-close').addEventListener('click', () => modal.classList.remove('open'));
      modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
    }
    modal.classList.add('open');
    document.getElementById('vstats-title').textContent = ` ${nombre}`;
    const grid  = document.getElementById('vstats-grid');
    const prods = document.getElementById('vstats-products');
    grid.innerHTML = '<p style="color:#aaa;text-align:center;grid-column:span 2">Cargando...</p>';
    prods.innerHTML = '';
    _gasGet({ action: 'listarComunidad', vendedor_uid: uid, admin: 'true', token: _getToken() })
      .then(data => {
        const all       = (data.products || []).filter(p => p.vendedor_uid === uid);
        const totalStock = all.reduce((s, p) => s + (Number(p.stock) || 0), 0);
        const pendientes = all.filter(p => p.estado === 'pendiente').length;
        const aprobados  = all.filter(p => p.estado === 'aprobado').length;
        grid.innerHTML = `
          <div class="vstat-card"><span class="vstat-val">${all.length}</span><span class="vstat-lbl">Productos</span></div>
          <div class="vstat-card"><span class="vstat-val">${totalStock}</span><span class="vstat-lbl">Stock total</span></div>
          <div class="vstat-card"><span class="vstat-val">${aprobados}</span><span class="vstat-lbl">Aprobados</span></div>
          <div class="vstat-card"><span class="vstat-val">${pendientes}</span><span class="vstat-lbl">Pendientes</span></div>`;
        prods.innerHTML = all.length ? all.map(p => `
          <div style="display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid #eee;">
            <img src="${p.imagen1 || ''}" style="width:44px;height:44px;object-fit:contain;border-radius:8px;background:#f5f5f8;" onerror="this.src=''">
            <div style="flex:1;min-width:0;">
              <div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.nombre || '—'}</div>
              <div style="font-size:11px;color:#888;">$${Number(p.precio||0).toLocaleString()} · Stock: ${p.stock||0} · <span style="color:${p.estado==='aprobado'?'#2e7d32':'#f57f17'}">${p.estado||''}</span></div>
            </div>
          </div>`).join('') : '<p style="color:#aaa;text-align:center;font-size:13px;">Sin productos publicados</p>';
      })
      .catch(err => { grid.innerHTML = `<p style="color:#ef4444;grid-column:span 2">Error: ${_escapeHtml(err.message)}</p>`; });
  }

  
  async function loadPendingProducts() {
    const container = document.getElementById('admin-pending-list');
    if (!container) return;
    container.innerHTML = '<p style="color:#aaa;text-align:center">Cargando...</p>';
    try {
      const data = await _gasGet({ action: 'productosPendientes', token: _getToken() });
      if (!data.ok) throw new Error(data.error);
      const products = data.products || [];
      if (!products.length) {
        container.innerHTML = '<p style="color:#aaa;text-align:center">Sin productos pendientes </p>';
        return;
      }
      container.innerHTML = products.map(p => `
        <div class="pending-product-row" id="prow-${p.id}">
          <img src="${_escapeHtml(p.imagen1 ? _optimizeDriveUrl(p.imagen1, 80) : '')}" alt="${_escapeHtml(p.nombre)}" onerror="this.style.display='none'">
          <div class="info">
            <strong>${_escapeHtml(p.nombre)}</strong>
            <span>$${Number(p.precio).toLocaleString()} · Stock: ${p.stock} · ${_escapeHtml(p.categoria || '')}</span><br>
            <span> ${_escapeHtml(p.vendedor_nombre || '')} ·  ${_escapeHtml(p.vendedor_tel || '')}</span><br>
            <label style="font-size:11px;color:#666;display:flex;align-items:center;gap:6px;margin-top:6px;">
              <span>Aprobación futura:</span>
              <select id="confiable-sel-${p.id}" style="font-size:11px;border-radius:8px;border:1px solid #ddd;padding:2px 6px;">
                <option value="false">Requiere revisión</option>
                <option value="true" ${p.confiable === true || p.confiable === 'true' ? 'selected' : ''}>Auto-aprobar (vendedor confiable)</option>
              </select>
            </label>
          </div>
          <div class="actions">
            <button class="btn-approve" onclick="AdminComunidad.aprobarProducto('${p.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-check"/></svg> Aprobar</button>
            <button class="btn-reject"  onclick="AdminComunidad.rechazarProducto('${p.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-x"/></svg> Rechazar</button>
          </div>
        </div>`).join('');
      if (typeof window._updateNotifTabBadge === 'function') window._updateNotifTabBadge('pending', products.length);
    } catch (err) {
      container.innerHTML = `<p style="color:#ef4444">Error: ${_escapeHtml(err.message)}</p>`;
    }
  }

  async function aprobarProducto(id) {
    const sel = document.getElementById(`confiable-sel-${id}`);
    await _productAction(id, 'aprobarProductoComunidad', ' Producto aprobado', sel ? sel.value : 'false');
  }
  async function rechazarProducto(id) { await _productAction(id, 'rechazarProductoComunidad', ' Producto rechazado', null); }

  async function _productAction(id, action, msg, confiable) {
    try {
      const payload = { action, id, token: _getToken() };
      if (confiable !== null && confiable !== undefined) payload.confiable = confiable;
      const data = await _gasPost(payload);
      if (!data.ok) throw new Error(data.error);
      _msg(msg, 'success');
      const row = document.getElementById(`prow-${id}`);
      if (row) { row.style.opacity = '0'; setTimeout(() => { row.remove(); loadPendingProducts(); }, 300); }
      if (typeof window.refreshAllAdminBadges === 'function') window.refreshAllAdminBadges();
    } catch (err) { _msg(' ' + err.message, 'error'); }
  }

  
  async function loadReportes() {
    const container = document.getElementById('admin-reportes-list');
    if (!container) return;
    container.innerHTML = '<p style="color:#aaa;text-align:center">Cargando reportes...</p>';
    try {
      const data = await _gasGet({ action: 'obtenerReportes', token: _getToken() });
      if (!data.ok) throw new Error(data.error);
      const reportes = data.reportes || [];
      updateReportesBadge(reportes.length);
      if (typeof window._updateNotifTabBadge === 'function') window._updateNotifTabBadge('reportes', reportes.length);
      if (!reportes.length) { container.innerHTML = '<p style="color:#aaa;text-align:center">Sin reportes pendientes</p>'; return; }
      container.innerHTML = reportes.map(r => {
        const imgSrc       = r.imagen1 || r.imagen || '';
        const imgOpt       = imgSrc ? _optimizeDriveUrl(imgSrc, 160) : '';
        const vendorUid    = _escapeHtml(r.vendedor_uid    || r.vendedorUid    || '');
        const vendorNombre = _escapeHtml(r.vendedor_nombre || r.nombreVendedor || r.vendedorNombre || '');
        const vendorTel    = _escapeHtml(r.vendedor_tel    || r.telefonoVendedor || '');
        const productId    = _escapeHtml(String(r.productId || ''));
        const reporteId    = _escapeHtml(String(r.reporteId || r.id || ''));
        const nombre       = _escapeHtml(r.nombreProducto || '—');
        const precio       = r.precio ? '$' + Number(r.precio).toLocaleString() : '';
        const categoria    = _escapeHtml(r.categoria || '');
        return `
          <div class="reporte-card" id="rrow-${reporteId}">
            <div class="reporte-card-top">
              ${imgSrc ? `<img src="${_escapeHtml(imgOpt)}" class="reporte-card-img" onerror="this.src=''" loading="lazy" onclick="window.open('${_escapeHtml(imgSrc)}','_blank')">` : '<div class="reporte-card-img-placeholder"></div>'}
              <div class="reporte-card-info">
                <div class="reporte-card-nombre">${nombre}</div>
                <div class="reporte-card-meta">
                  ${precio    ? `<span class="rmeta-chip price">${precio}</span>` : ''}
                  ${categoria ? `<span class="rmeta-chip">${categoria}</span>` : ''}
                  <span class="rmeta-chip motivo"> ${_escapeHtml(r.motivo || '—')}</span>
                </div>
                ${vendorNombre ? `<div class="reporte-card-vendedor"><span> <strong>${vendorNombre}</strong></span>${vendorTel ? `<a href="https://wa.me/${vendorTel.replace(/\D/g,'')}" target="_blank" rel="noopener" style="color:#25d366;font-size:12px;"> ${vendorTel}</a>` : ''}</div>` : ''}
                <div style="font-size:11px;color:#aaa;margin-top:4px;">
                   ${r.timestamp ? new Date(r.timestamp).toLocaleString() : '—'}
                  ${r.telefonoUsuario ? ` ·  Reportó: ${_escapeHtml(r.telefonoUsuario)}` : ''}
                </div>
              </div>
            </div>
            <div class="reporte-card-actions">
              <a class="btn-ver-producto" href="comunidad.html?inspector=1#product-${productId}" target="_blank">Ver</a>
              ${vendorUid ? `<button class="btn-suspend" onclick="AdminComunidad.suspenderVendedor('${vendorUid}','${vendorNombre}')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-suspend"/></svg> Suspender</button>` : ''}
              <button class="btn-del-desde-reporte" onclick="AdminComunidad.eliminarProductoDesdeReporte('${productId}','${nombre}','${reporteId}')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-trash"/></svg> Eliminar producto</button>
              <button class="btn-marcar-revisado" onclick="AdminComunidad.marcarReporteRevisado('${reporteId}')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg> Revisado</button>
            </div>
          </div>`;
      }).join('');
    } catch (err) {
      container.innerHTML = `<p style="color:#ef4444">Error: ${_escapeHtml(err.message)}</p>`;
    }
  }

  function updateReportesBadge(count) {
    const badge = document.getElementById('reportes-badge');
    if (badge) { badge.textContent = count; badge.style.display = count > 0 ? 'inline-flex' : 'none'; }
    if (typeof window._updateNotifTabBadge === 'function') window._updateNotifTabBadge('reportes', count);
  }

  async function eliminarProductoDesdeReporte(productId, nombreProducto, reporteId) {
    if (typeof showCustomConfirm !== 'function') return;
    showCustomConfirm({
      title: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-trash"/></svg> Eliminar producto',
      message: `¿Eliminar "${nombreProducto}" y marcar todos sus reportes como revisados?`,
      icon: '', confirmText: 'Eliminar', cancelText: 'Cancelar',
      onConfirm: async () => {
        try {
          const data = await _gasPost({ action: 'deleteComunidad', id: String(productId), token: _getToken() });
          if (!data.ok) throw new Error(data.error);
          _msg(' Producto eliminado', 'success');
          loadReportes();
        } catch (err) { _msg(' ' + err.message, 'error'); }
      }
    });
  }

  async function marcarReporteRevisado(reporteId) {
    try {
      const data = await _gasPost({ action: 'marcarReporteRevisado', reporteId: String(reporteId), token: _getToken() });
      if (!data.ok) throw new Error(data.error);
      _msg(' Reporte archivado', 'success');
      const row = document.getElementById(`rrow-${reporteId}`);
      if (row) { row.style.opacity = '0'; setTimeout(() => row.remove(), 300); }
      const container   = document.getElementById('admin-reportes-list');
      const currentCards = container ? container.querySelectorAll('.reporte-card').length : 0;
      const newCount    = Math.max(0, currentCards - 1);
      updateReportesBadge(newCount);
      if (typeof window.refreshAllAdminBadges === 'function') window.refreshAllAdminBadges();
    } catch (err) { _msg(' ' + err.message, 'error'); }
  }

  
  window.AdminComunidad = {
    init,
    loadVendors,
    loadPendingProducts,
    aprobarVendedor,
    rechazarVendedor,
    aprobarProducto,
    rechazarProducto,
    suspenderVendedor,
    verEstadisticas,
    loadReportes,
    eliminarProductoDesdeReporte,
    marcarReporteRevisado,
    updateReportesBadge
  };

  
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      init();
      const rvBtn = document.getElementById('refresh-vendors-btn');
      if (rvBtn) rvBtn.addEventListener('click', () => loadVendors());
      const rpBtn = document.getElementById('refresh-pending-btn');
      if (rpBtn) rpBtn.addEventListener('click', () => loadPendingProducts());
      const rrBtn = document.getElementById('refresh-reportes-btn');
      if (rrBtn) rrBtn.addEventListener('click', () => loadReportes());
    }, 400);
  });

})();
