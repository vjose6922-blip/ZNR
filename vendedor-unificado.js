(function() {
'use strict';

// ──────────────────────────────────────────────
// v0000
// ──────────────────────────────────────────────
let vendorSession = null;
Object.defineProperty(window, 'vendorSession', {
  get() { return vendorSession; },
  set(v) { vendorSession = v; },
  configurable: true
});

const API_BASE = window.API_URL || ""

function getAdminToken() {
return sessionStorage.getItem('admin_token') || '';
}

window.apiFetch = async function(data, method = 'POST') {
  const API_BASE = window.API_URL;
  if (!API_BASE) throw new Error('API_URL no está disponible');

  const TIMEOUT_MS = 15000;

  function fetchWithTimeout(url, options) {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), TIMEOUT_MS);
    return fetch(url, { ...options, signal: controller.signal })
      .then(r => { clearTimeout(tid); return r; })
      .catch(e => {
        clearTimeout(tid);
        if (e.name === 'AbortError') throw new Error('El servidor tardó demasiado. Intenta de nuevo.');
        throw e;
      });
  }

  function checkTokenInvalid(parsed) {
  if (parsed && parsed.ok === false &&
      typeof parsed.error === 'string' &&
      (parsed.error.toLowerCase().includes('token') ||
       parsed.error.toLowerCase().includes('no autorizado') ||
       parsed.error.toLowerCase().includes('unauthorized'))) {
    localStorage.removeItem('vendor_session');
    sessionStorage.removeItem('vendor_session');
    vendorSession = null;
    setTimeout(() => { window.location.reload(); }, 1500);
  }
  return parsed;
}

  if (String(method).toUpperCase() === 'GET') {
    const params = new URLSearchParams();
    Object.entries(data || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null) params.append(k, v);
    });

    const res = await fetchWithTimeout(`${API_BASE}?${params.toString()}`, { method: 'GET' });
    const text = await res.text();
    return checkTokenInvalid(JSON.parse(text));
  }

  const params = new URLSearchParams();
  Object.entries(data || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null) params.append(k, v);
  });

  const res = await fetchWithTimeout(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  const text = await res.text();
  return checkTokenInvalid(JSON.parse(text));
};

window.apiCall = async function(data) {
  const API_BASE = window.API_URL;
  if (!API_BASE) throw new Error('API_URL no está disponible');

  const params = new URLSearchParams();
  Object.entries(data || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null) params.append(k, v);
  });

  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  const text = await res.text();
  return JSON.parse(text);
};




window.debugPanel = {
  ensure() {
    let box = document.getElementById('debug-panel-top');
    if (box) return box;

    box = document.createElement('div');
    box.id = 'debug-panel-top';
    box.style.cssText = `
      position:fixed;
      top:0;
      left:0;
      right:0;
      z-index:2147483647;
      background:#111;
      color:#fff;
      font:12px/1.45 monospace;
      max-height:42vh;
      overflow:auto;
      box-shadow:0 8px 24px rgba(0,0,0,.35);
      border-bottom:2px solid #f97316;
    `;

    box.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;background:#1a1a1a;border-bottom:1px solid rgba(255,255,255,.12);position:sticky;top:0;">
        <div style="font-weight:700;color:#f97316;">DEBUG PANEL</div>
        <div style="display:flex;gap:8px;">
          <button id="debug-panel-clear" style="border:none;border-radius:8px;padding:6px 10px;cursor:pointer;background:#333;color:#fff;">Limpiar</button>
          <button id="debug-panel-close" style="border:none;border-radius:8px;padding:6px 10px;cursor:pointer;background:#ef4444;color:#fff;">Cerrar</button>
        </div>
      </div>
      <div id="debug-panel-body" style="padding:10px;"></div>
    `;

    document.body.appendChild(box);

    document.getElementById('debug-panel-clear').onclick = () => {
      const body = document.getElementById('debug-panel-body');
      if (body) body.innerHTML = '';
    };
    document.getElementById('debug-panel-close').onclick = () => box.remove();

    return box;
  },

  log(title, value = '') {
    const box = this.ensure();
    const body = document.getElementById('debug-panel-body');
    if (!body) return;

    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));

    const row = document.createElement('div');
    row.style.cssText = `
      border:1px solid rgba(255,255,255,.12);
      border-radius:10px;
      padding:8px 10px;
      margin-bottom:8px;
      background:rgba(255,255,255,.04);
      white-space:pre-wrap;
      word-break:break-word;
    `;

    row.innerHTML = `
      <div style="color:#f97316;font-weight:700;margin-bottom:4px;">${esc(title)}</div>
      <div>${esc(value)}</div>
    `;

    body.appendChild(row);
    box.scrollTop = box.scrollHeight;
  }
};











function injectStyles(id, css) {
if (document.getElementById(id)) return;
const style = document.createElement('style');
style.id = id;
style.textContent = css;
document.head.appendChild(style);
}

// ──────────────────────────────────────────────
// FUNCIÓN PRINCIPAL DE INICIO
// ──────────────────────────────────────────────
function initVendorPanel() {
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('register') === '1') {
setTimeout(() => {
const registerTab = document.querySelector('.login-tab[data-tab="register"]');
if (registerTab) registerTab.click();
}, 500);
}

if (!document.getElementById('login-section') && !document.getElementById('panel-section')) return;

// 🆕 Si ya tiene un teléfono guardado como comprador (lo aceptó en el
// carrito al hacer una compra), lo prellenamos en el login de vendedor
// para que use el mismo número y no tenga que volver a escribirlo.
const loginPhoneInput = document.getElementById('login-phone');
if (loginPhoneInput && !loginPhoneInput.value) {
  const savedClientPhone = localStorage.getItem('client_phone');
  if (savedClientPhone) loginPhoneInput.value = savedClientPhone;
}

let uploadedImages = { 1: null, 2: null, 3: null };
let selectedFiles = { 1: null, 2: null, 3: null };

const loginTab = document.querySelector('.login-tab[data-tab="login"]');
const registerTab = document.querySelector('.login-tab[data-tab="register"]');
const loginContainer = document.getElementById('login-form-container');
const registerContainer = document.getElementById('register-form-container');

if (loginTab && registerTab) {
loginTab.addEventListener('click', () => {
loginTab.classList.add('active');
registerTab.classList.remove('active');
loginContainer.style.display = 'block';
registerContainer.style.display = 'none';
});
registerTab.addEventListener('click', () => {
registerTab.classList.add('active');
loginTab.classList.remove('active');
loginContainer.style.display = 'none';
registerContainer.style.display = 'block';
});

const switchToRegister = document.getElementById('switch-to-register');
const switchToLogin = document.getElementById('switch-to-login');
if (switchToRegister) switchToRegister.addEventListener('click', () => registerTab && registerTab.click());
if (switchToLogin) switchToLogin.addEventListener('click', () => loginTab && loginTab.click());
}

async function registerVendor() {
const nombre = document.getElementById('reg-nombre')?.value.trim();
const phone = document.getElementById('reg-phone')?.value.trim().replace(/\D/g, '');
if (!nombre || phone.length !== 10) {
showTemporaryMessage(' Completa todos los campos correctamente', 'error');
return;
}
const btn = document.getElementById('register-btn');
if (btn) {
btn.disabled = true;
btn.textContent = 'Enviando...';
}
try {
const res = await apiFetch({ action: 'registrarVendedor', nombre, telefono: phone });
if (!res.ok) throw new Error(res.error);
showTemporaryMessage(' Registro exitoso. Espera a que el administrador active tu cuenta.', 'success');
document.getElementById('reg-nombre').value = '';
document.getElementById('reg-phone').value = '';
const loginTab = document.querySelector('.login-tab[data-tab="login"]');
if (loginTab) loginTab.click();
} catch (err) {
showTemporaryMessage(' ' + err.message, 'error');
} finally {
if (btn) {
btn.disabled = false;
btn.textContent = 'Registrarme';
}
}
}

const registerBtn = document.getElementById('register-btn');
if (registerBtn) registerBtn.addEventListener('click', registerVendor);

async function vendorLogin() {
const firstField  = document.getElementById('login-phone')?.value.trim();
const secondField = document.getElementById('login-password')?.value.trim();

if (!firstField || !secondField) {
showTemporaryMessage('Credenciales incorrectas', 'error');
return;
}

showLoader('Verificando...');

const esAdmin = /^\d{6}$/.test(firstField);

if (esAdmin) {
try {
const api = window.API_URL;
if (!api) throw new Error();
const formData = new URLSearchParams();
formData.append('action', 'login');
formData.append('password', firstField);
formData.append('token', secondField);
const adminCtrl = new AbortController();
const adminTid = setTimeout(() => adminCtrl.abort(), 15000);
let res;
try {
  res = await fetch(api, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
    signal: adminCtrl.signal
  });
} finally {
  clearTimeout(adminTid);
}
const data = await res.json();
if (data && data.ok === true) {
sessionStorage.setItem('admin_token', secondField);
sessionStorage.setItem('admin_session', 'true');
window.location.href = 'admin.html';
return;
}
} catch (_) {}
showTemporaryMessage('Credenciales incorrectas', 'error');
hideLoader();
return;
}

try {
const res = await apiFetch({ action: 'loginVendedor', telefono: firstField, password: secondField });
if (!res.ok) throw new Error();
vendorSession = {
token: res.token,
uid: res.uid,
telefono: firstField,
nombre: res.nombre,
confiable: res.confiable,
plan: res.plan || 'free',
planVence: res.planVence || null,
limiteProductos: res.limiteProductos || 20,
productosActuales: res.productosActuales || 0,
logo: res.logo || '',
descripcion: res.descripcion || '',
whatsapp: res.whatsapp || '',
categoria: res.categoria || '',
facebook: res.facebook || '',
twitter: res.twitter || '',
instagram: res.instagram || '',
tiktok: res.tiktok || '',
fechaRegistro: res.fechaRegistro || ''
};
localStorage.setItem('vendor_session', JSON.stringify(vendorSession));

// 🆕 El teléfono con el que acaba de iniciar sesión como vendedor pasa a
// ser también el que se usa para comprar (carrito/checkout), sin importar
// si ya tenía otro guardado o si es la primera vez.
localStorage.setItem('client_phone', firstField);
if (typeof updateSavedPhoneDisplay === 'function') updateSavedPhoneDisplay();
} catch (_) {
showTemporaryMessage('Credenciales incorrectas', 'error');
hideLoader();
return;
}
try {
showPanel();
} catch(e) {
console.error('showPanel error:', e);
} finally {
hideLoader();
}
}

function vendorLogout() {
localStorage.removeItem('vendor_session');
sessionStorage.removeItem('admin_session');
sessionStorage.removeItem('admin_token');
vendorSession = null;
const loginDiv = document.getElementById('login-section');
const panelDiv = document.getElementById('panel-section');
if (loginDiv) loginDiv.style.display = 'block';
if (panelDiv) panelDiv.style.display = 'none';
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) logoutBtn.style.display = 'none';

const navGuest = document.getElementById('bottom-nav-guest');
const navVendor = document.getElementById('bottom-nav-vendor');
if (navVendor) navVendor.style.display = 'none';
if (navGuest) navGuest.style.display = '';

closeSettingsModal();
}

function showPanel() {
const loginDiv = document.getElementById('login-section');
const panelDiv = document.getElementById('panel-section');
if (loginDiv) loginDiv.style.display = 'none';
if (panelDiv) panelDiv.style.display = 'block';

const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) logoutBtn.style.display = 'flex';

const liveBtn = document.getElementById('live-btn');
if (liveBtn) liveBtn.style.display = (vendorSession && vendorSession.plan === 'plus') ? 'flex' : 'none';

const verEntregasBtn = document.getElementById('btn-ver-entregas-panel');
if (verEntregasBtn) verEntregasBtn.style.display = (vendorSession && vendorSession.plan === 'plus') ? 'flex' : 'none';

const nameHeader = document.getElementById('vendor-name-header');
if (nameHeader && vendorSession) {
nameHeader.textContent = vendorSession.nombre;
}

updateVendorAvatar();

const navGuest = document.getElementById('bottom-nav-guest');
const navVendor = document.getElementById('bottom-nav-vendor');
if (navGuest) navGuest.style.display = 'none';
if (navVendor) navVendor.style.display = '';

const cardName = document.getElementById('vendor-card-name');
if (cardName && vendorSession) cardName.textContent = vendorSession.nombre;

const shareBtn = document.getElementById('share-vendor-link');
if (shareBtn) {
const newBtn = shareBtn.cloneNode(true);
shareBtn.parentNode.replaceChild(newBtn, shareBtn);
newBtn.style.display = 'inline-block';
newBtn.addEventListener('click', () => {
const vendorNameEncoded = encodeURIComponent(vendorSession.nombre);
const baseDir = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
const shareUrl = `${baseDir}comunidad.html?vendedor=${vendorNameEncoded}`;
navigator.clipboard.writeText(shareUrl)
.then(() => {
window.showTemporaryMessage?.(' Enlace copiado (URL completa)', 'success');
})
.catch(() => {
alert('No se pudo copiar. Comparte este enlace:\n' + shareUrl);
});
});
}

loadMyProducts();
renderVendorPlanPanel();
loadVendorSaleNotifications();
if (!window._vsnPollingStarted) {
window._vsnPollingStarted = true;
setInterval(loadVendorSaleNotifications, 45000);
}
}

// ── Notificaciones de venta pendientes (Comunidad) ──────────────────────
async function loadVendorSaleNotifications() {
if (!vendorSession || !vendorSession.uid) return;
try {
const data = await apiCall({ action: 'listarNotificacionesVentaComunidad', vendorToken: vendorSession.token });
if (!data || !data.ok) return;
renderVendorSaleNotifications(data.notificaciones || []);
} catch (e) {
console.error('No se pudieron cargar las notificaciones de venta:', e);
}
}

function renderVendorSaleNotifications(list) {
const panel = document.getElementById('vendor-plan-panel');
if (!panel) return;
let container = document.getElementById('vendor-sale-notifications');
if (!list || !list.length) {
if (container) container.remove();
return;
}
if (!container) {
container = document.createElement('div');
container.id = 'vendor-sale-notifications';
panel.insertAdjacentElement('afterend', container);
}
const esc2 = window.escapeHtml || (s => String(s == null ? '' : s));
container.innerHTML = list.map(n => {
const esConfirmada = n.estado === 'confirmada';
return `
<div class="vsn-card" data-req="${esc2(n.requestId)}" data-estado="${esc2(n.estado || 'pendiente')}" style="background:${esConfirmada ? '#eafaf0' : '#fff8e1'};border:1.5px solid ${esConfirmada ? '#7cd9a0' : '#f5cf6b'};border-radius:14px;padding:12px 14px;margin-top:10px;">
<div style="font-size:13px;font-weight:700;color:${esConfirmada ? '#15803d' : '#92702a'};margin-bottom:6px;">${esConfirmada ? ' Confirmada · pendiente de entregar' : ' Tienes una venta por confirmar'}</div>
${(n.items || []).map(it => `
<div style="display:flex;justify-content:space-between;gap:8px;font-size:12.5px;color:${esConfirmada ? '#2f6b48' : '#5c4a1f'};padding:2px 0;">
<span>${esc2(it.nombre)}${it.talla ? ' · ' + esc2(it.talla) : ''} × ${esc2(it.cantidad)}</span>
<span>$${Number(it.precio || 0).toLocaleString()}</span>
</div>
`).join('')}
${n.clientPhone ? `<div style="font-size:12px;color:${esConfirmada ? '#4d8064' : '#8a7238'};margin-top:4px;">Cliente: +52 ${esc2(n.clientPhone)}</div>` : ''}
<div style="display:flex;gap:8px;margin-top:10px;">
${esConfirmada
? `<button class="vsn-delivered-btn" style="flex:1;padding:8px;border:none;border-radius:10px;background:#16a34a;color:#fff;font-size:12.5px;font-weight:700;cursor:pointer;">📬 Marcar como entregado</button>`
: `<button class="vsn-confirm-btn" style="flex:1;padding:8px;border:none;border-radius:10px;background:#16a34a;color:#fff;font-size:12.5px;font-weight:700;cursor:pointer;">Confirmar (sí hay stock)</button>
<button class="vsn-nostock-btn" style="flex:1;padding:8px;border:none;border-radius:10px;background:#fff;border:1.5px solid #dc2626;color:#dc2626;font-size:12.5px;font-weight:700;cursor:pointer;">Sin stock</button>`}
</div>
${esConfirmada ? `<div style="font-size:11px;color:#4d8064;margin-top:6px;">El stock se descuenta hasta que marques la entrega.</div>` : ''}
</div>
`;
}).join('');
container.querySelectorAll('.vsn-confirm-btn').forEach(btn => {
btn.addEventListener('click', () => resolveVendorSaleNotification(btn.closest('.vsn-card').dataset.req, 'confirmar', btn));
});
container.querySelectorAll('.vsn-nostock-btn').forEach(btn => {
btn.addEventListener('click', () => resolveVendorSaleNotification(btn.closest('.vsn-card').dataset.req, 'sin_stock', btn));
});
container.querySelectorAll('.vsn-delivered-btn').forEach(btn => {
btn.addEventListener('click', () => resolveVendorSaleNotification(btn.closest('.vsn-card').dataset.req, 'entregado', btn));
});
}

async function resolveVendorSaleNotification(requestId, accion, btn) {
const runFn = async () => {
try {
const data = await apiCall({ action: 'resolverNotificacionVentaComunidad', vendorToken: vendorSession.token, requestId, accion });
if (data && data.ok) {
const mensajes = {
confirmar: ' Stock confirmado. El comprador ya puede pagar.',
sin_stock: 'Marcado sin stock',
entregado: ' ¡Entrega marcada! Se descontó el stock.'
};
window.showTemporaryMessage?.(mensajes[accion] || 'Actualizado', 'success');
loadVendorSaleNotifications();
loadMyProducts();
} else {
window.showTemporaryMessage?.(data?.error || 'No se pudo procesar', 'error');
}
} catch (e) {
window.showTemporaryMessage?.(' Error de red', 'error');
}
};
if (btn && window.withButtonLoading) await window.withButtonLoading(btn, runFn, 'Procesando…');
else await runFn();
}

// ──────────────────────────────────────────────
// RENDER PANEL PLAN + FILTROS
// ──────────────────────────────────────────────
function renderVendorPlanPanel() {
  const el = document.getElementById('vendor-plan-panel');
  if (!el || !vendorSession) return;
  const esPlus   = vendorSession.plan === 'plus';
  const limite   = vendorSession.limiteProductos || (esPlus ? 200 : 20);
  const actuales = vendorSession.productosActuales || 0;
  const pct = Math.min(100, Math.round((actuales / limite) * 100));
  const diasRestantes = vendorSession.planVence
    ? Math.ceil((new Date(vendorSession.planVence) - new Date()) / 86400000)
    : null;

  const planBadge = esPlus
    ? `<span style="background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;">PLUS</span>`
    : `<span style="background:#eee;color:#999;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;">FREE</span>`;

  let renovacionHTML = '';
  if (esPlus && diasRestantes != null && diasRestantes <= 7) {
    renovacionHTML = `<div style="margin-top:8px;background:#fff8e1;color:#92702a;font-size:12px;border-radius:10px;padding:8px 12px;">
      Tu plan Plus vence en ${diasRestantes} día${diasRestantes === 1 ? '' : 's'}. Contacta al admin para renovarlo y no perder tu visibilidad.
    </div>`;
  }

  const statusFilterHTML = `
    <div class="vendor-status-filter" style="display:flex; gap:8px; margin-top:14px; flex-wrap:wrap;">
      <button class="filter-status-btn active" data-status="todos" style="padding:4px 12px; border-radius:20px; border:1.5px solid var(--color-border-subtle); background:var(--color-accent-solid); color:#fff; font-size:11px; font-weight:600; cursor:pointer; transition:all .15s;">Todos</button>
      <button class="filter-status-btn" data-status="aprobado" style="padding:4px 12px; border-radius:20px; border:1.5px solid var(--color-border-subtle); background:transparent; color:var(--color-text-muted); font-size:11px; font-weight:600; cursor:pointer; transition:all .15s;">Aprobados</button>
      <button class="filter-status-btn" data-status="pendiente" style="padding:4px 12px; border-radius:20px; border:1.5px solid var(--color-border-subtle); background:transparent; color:var(--color-text-muted); font-size:11px; font-weight:600; cursor:pointer; transition:all .15s;">Pendientes</button>
      <button class="filter-status-btn" data-status="rechazado" style="padding:4px 12px; border-radius:20px; border:1.5px solid var(--color-border-subtle); background:transparent; color:var(--color-text-muted); font-size:11px; font-weight:600; cursor:pointer; transition:all .15s;">Rechazados</button>
    </div>
  `;

  el.innerHTML = `
    <div style="background:#f8f8fc;border-radius:14px;padding:12px 14px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <div style="font-size:13px;font-weight:600;">${actuales}/${limite} productos usados</div>
        ${planBadge}
      </div>
      <div style="background:#e6e6ee;border-radius:999px;height:6px;margin-top:8px;overflow:hidden;">
        <div style="background:${pct >= 100 ? '#c62828' : '#7c3aed'};height:100%;width:${pct}%;"></div>
      </div>
      ${renovacionHTML}
      ${statusFilterHTML}
    </div>
  `;

  el.querySelectorAll('.filter-status-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      el.querySelectorAll('.filter-status-btn').forEach(b => {
        b.classList.remove('active');
        b.style.background = 'transparent';
        b.style.color = 'var(--color-text-muted)';
        b.style.borderColor = 'var(--color-border-subtle)';
      });
      this.classList.add('active');
      this.style.background = 'var(--color-accent-solid)';
      this.style.color = '#fff';
      this.style.borderColor = 'var(--color-accent-solid)';

      const status = this.dataset.status;
      applyVendorStatusFilter(status);
    });
  });
}

// ── FILTRO DE ESTADO ──────────────────────────────────
let currentStatusFilter = 'todos';

function applyVendorStatusFilter(status) {
  currentStatusFilter = status;
  loadMyProducts(true, 1);
}

// ── FUNCIONES DE CACHÉ ────────────────────────────────
const VENDOR_PRODUCTS_CACHE_KEY = 'zr_vendor_products';
const VENDOR_PRODUCTS_CACHE_TTL = 3 * 60 * 1000; // 3 min

window.getVendorProductsCache = function(uid) {
  try {
    const raw = sessionStorage.getItem(VENDOR_PRODUCTS_CACHE_KEY + '_' + uid);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > VENDOR_PRODUCTS_CACHE_TTL) {
      sessionStorage.removeItem(VENDOR_PRODUCTS_CACHE_KEY + '_' + uid);
      return null;
    }
    return data;
  } catch(e) { return null; }
};
window.setVendorProductsCache = function(uid, products) {
  try {
    sessionStorage.setItem(VENDOR_PRODUCTS_CACHE_KEY + '_' + uid,
      JSON.stringify({ data: products, timestamp: Date.now() }));
  } catch(e) {}
};
window.invalidateVendorProductsCache = function(uid) {
  try { sessionStorage.removeItem(VENDOR_PRODUCTS_CACHE_KEY + '_' + (uid || vendorSession?.uid)); } catch(e) {}
};

function showVendorProductsSkeleton(container, count = 3) {
  const card = () => `
    <div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid #f0f0f0;align-items:center;">
      <div class="vp-sk" style="width:72px;height:72px;border-radius:10px;flex-shrink:0;"></div>
      <div style="flex:1;">
        <div class="vp-sk" style="height:13px;width:70%;margin-bottom:8px;border-radius:6px;"></div>
        <div class="vp-sk" style="height:11px;width:45%;margin-bottom:8px;border-radius:6px;"></div>
        <div class="vp-sk" style="height:22px;width:80px;border-radius:20px;"></div>
      </div>
    </div>`;
  container.innerHTML = `
    <style>
      .vp-sk{background:linear-gradient(90deg,var(--color-surface-2,#f0f0f4) 25%,var(--color-surface-3,#e4e4ea) 50%,var(--color-surface-2,#f0f0f4) 75%);background-size:600px 100%;animation:vp-shimmer 1.3s infinite linear;}
      @keyframes vp-shimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}
    </style>
    ${Array.from({length: count}, card).join('')}`;
}

// ── CREAR TARJETA DE PRODUCTO (fuera de initVendorPanel) ──
function createVendorProductCard(product) {
  const { id, nombre, precio, stock, descripcion, talla, categoria, imagen1, imagen2, imagen3, estado } = product;
  const safeNombre = escapeHtml(nombre || "Producto");
  const safeDescripcion = escapeHtml(descripcion || "");
  const safeTalla = escapeHtml(talla || "Sin especificar");
  const safeCategoria = escapeHtml(categoria || "");
  const stockNum = Number(stock || 0);
  const isOutOfStock = stockNum <= 0;

  const card = document.createElement("article");
  card.className = "product-card";
  card.id = `producto-${id}`;

  const slider = document.createElement("div");
  slider.className = "product-slider";
  slider.dataset.productId = id;

  const track = document.createElement("div");
  track.className = "product-slider-track";

  const images = [imagen1, imagen2, imagen3]
    .map(u => u ? (typeof optimizeDriveUrl === 'function' ? optimizeDriveUrl(u) : u) : null)
    .filter(Boolean);
  if (images.length === 0) {
    images.push("https://placehold.co/400x400/3b1f5f/white?text=Sin+Imagen");
  }

  images.forEach((url) => {
    const slide = document.createElement("div");
    slide.className = "product-slide";
    const img = document.createElement("img");
    img.alt = safeNombre;
    img.src = url;
    img.loading = "lazy";
    img.addEventListener("click", () => openImageModal(url, id, images, product));
    slide.appendChild(img);
    track.appendChild(slide);
  });
  slider.appendChild(track);

  const dotsContainer = document.createElement("div");
  dotsContainer.className = "slider-dots";
  images.forEach((_, index) => {
    const dot = document.createElement("div");
    dot.className = "slider-dot" + (index === 0 ? " active" : "");
    dot.dataset.index = index;
    dotsContainer.appendChild(dot);
  });
  slider.appendChild(dotsContainer);

  const badgeEl = document.createElement("div");
  badgeEl.className = "product-badge";
  badgeEl.textContent = estado || "Pendiente";
  slider.appendChild(badgeEl);

  const info = document.createElement("div");
  info.className = "product-info";

  const titleRow = document.createElement("div");
  titleRow.className = "product-title-row";
  const nameEl = document.createElement("h2");
  nameEl.className = "product-name";
  nameEl.textContent = safeNombre;
  const priceEl = document.createElement("div");
  priceEl.className = "product-price";
  priceEl.textContent = formatCurrency(precio);
  titleRow.appendChild(nameEl);
  titleRow.appendChild(priceEl);

  const metaRow = document.createElement("div");
  metaRow.className = "product-meta-row";
  if (safeCategoria) {
    const categoryEl = document.createElement("span");
    categoryEl.className = "category-badge";
    categoryEl.textContent = safeCategoria;
    metaRow.appendChild(categoryEl);
  }
  const stockEl = document.createElement("span");
  stockEl.className = "stock-badge";
  if (isOutOfStock) {
    stockEl.classList.add("out-of-stock");
    stockEl.textContent = " Sin stock";
  } else {
    stockEl.textContent = ` Stock: ${stockNum}`;
  }
  metaRow.appendChild(stockEl);

  const descEl = document.createElement("p");
  descEl.className = "product-description";
  descEl.textContent = safeDescripcion || "Sin descripción";

  const sizesEl = document.createElement("div");
  sizesEl.className = "product-sizes";
  sizesEl.textContent = safeTalla;

  info.appendChild(titleRow);
  info.appendChild(metaRow);
  info.appendChild(descEl);
  info.appendChild(sizesEl);

  const actions = document.createElement("div");
  actions.className = "product-actions";

  const editBtn = document.createElement("button");
  editBtn.className = "btn-secondary";
  editBtn.innerHTML = 'Editar';
  editBtn.onclick = () => editProduct(id);

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn-secondary btn-danger";
  deleteBtn.innerHTML = 'Eliminar';
  deleteBtn.onclick = () => deleteMyProduct(id);

  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);

  card.appendChild(slider);
  card.appendChild(info);
  card.appendChild(actions);
  attachSliderEvents(slider, images.length);
  return card;
}

function attachSliderEvents(slider, totalSlides) {
  const productId = slider.dataset.productId;
  const track = slider.querySelector(".product-slider-track");
  const dots = slider.querySelectorAll(".slider-dot");
  let startX = 0, currentX = 0, isDragging = false;
  let currentIndex = 0;

  function updateSlider(index) {
    currentIndex = ((index % totalSlides) + totalSlides) % totalSlides;
    track.style.transform = `translateX(-${currentIndex * 100}%)`;
    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === currentIndex);
    });
  }

  function handleStart(x) {
    isDragging = true;
    startX = x;
    currentX = x;
  }
  function handleMove(x) {
    if (isDragging) currentX = x;
  }
  function handleEnd() {
    if (!isDragging) return;
    const deltaX = currentX - startX;
    const threshold = 40;
    let index = currentIndex;
    if (deltaX < -threshold) index++;
    else if (deltaX > threshold) index--;
    updateSlider(index);
    isDragging = false;
  }

  slider.addEventListener("touchstart", (e) => handleStart(e.touches[0].clientX));
  slider.addEventListener("touchmove", (e) => handleMove(e.touches[0].clientX));
  slider.addEventListener("touchend", handleEnd);
  slider.addEventListener("mousedown", (e) => handleStart(e.clientX));
  slider.addEventListener("mousemove", (e) => { if (isDragging) handleMove(e.clientX); });
  slider.addEventListener("mouseup", handleEnd);
  slider.addEventListener("mouseleave", () => { if (isDragging) handleEnd(); });

  dots.forEach((dot) => {
    dot.addEventListener("click", () => updateSlider(Number(dot.dataset.index)));
  });

  updateSlider(0);
}

// ── APLICAR PRODUCTOS Y PAGINACIÓN ──────────────────────
function applyMyProducts(myProducts, container, total = null, currentPage = 1, totalPages = null) {
  // Si total es null, usar la longitud de myProducts
  const realTotal = (total !== null) ? total : myProducts.length;

  // Actualizar contador en la sesión
  if (vendorSession) {
    vendorSession.productosActuales = realTotal;
    localStorage.setItem('vendor_session', JSON.stringify(vendorSession));
  }
  if (typeof renderVendorPlanPanel === 'function') renderVendorPlanPanel();

  // Guardar en variable global para otros usos (ej. donaciones)
  window._vendorProducts = myProducts;
  updateDonacionesBadge();

  // Renderizar productos
  container.innerHTML = '';
  if (myProducts.length === 0) {
    container.innerHTML = `<p style="color:#aaa;text-align:center">No hay productos en esta página.</p>`;
  } else {
    myProducts.forEach(product => {
      const card = createVendorProductCard(product);
      container.appendChild(card);
    });
  }

  // Aplicar layout (grid/lista)
  const savedLayout = localStorage.getItem('products_layout') || 'list';
  applyLayoutGlobal(savedLayout);

  // Renderizar controles de paginación
  renderPagination(container, currentPage, totalPages, realTotal);
}

function renderPagination(container, currentPage, totalPages, total) {
  const oldPagination = document.getElementById('vendor-pagination');
  if (oldPagination) oldPagination.remove();

  if (!totalPages || totalPages <= 1) return;

  const paginationDiv = document.createElement('div');
  paginationDiv.id = 'vendor-pagination';
  paginationDiv.style.cssText = 'display:flex;justify-content:center;align-items:center;gap:12px;margin-top:20px;padding:12px 0;';

  // Botón Anterior: solo si hay página anterior
  if (currentPage > 1) {
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '‹ Anterior';
    prevBtn.className = 'btn-secondary';
    prevBtn.style.padding = '8px 16px';
    prevBtn.onclick = () => loadMyProducts(true, currentPage - 1);
    paginationDiv.appendChild(prevBtn);
  }

  // Indicador de página
  const pageInfo = document.createElement('span');
  pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
  pageInfo.style.fontSize = '14px';
  pageInfo.style.color = '#555';
  paginationDiv.appendChild(pageInfo);

  // Botón Siguiente: solo si hay página siguiente
  if (currentPage < totalPages) {
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Siguiente ›';
    nextBtn.className = 'btn-secondary';
    nextBtn.style.padding = '8px 16px';
    nextBtn.onclick = () => loadMyProducts(true, currentPage + 1);
    paginationDiv.appendChild(nextBtn);
  }

  container.parentNode.insertBefore(paginationDiv, container.nextSibling);
}

// ── CARGA DE PRODUCTOS CON PAGINACIÓN ────────────────────
window.loadMyProducts = async function loadMyProducts(force = false, page = 1) {
  const container = document.getElementById('products-container');
  if (!container) return;
  const uid = vendorSession?.uid;
  if (!uid) return;

  const limit = 20;
  const status = currentStatusFilter || 'todos';

  // Construir clave de caché incluyendo página y filtro
  const cacheKey = `vendor_products_${uid}_page_${page}_status_${status}`;
  const cached = !force ? sessionStorage.getItem(cacheKey) : null;

  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      applyMyProducts(parsed.data, container, parsed.total, parsed.page, parsed.totalPages);
      // Revalidar en background
      fetchPage(uid, page, limit, status, true);
      return;
    } catch (e) {}
  }

  showVendorProductsSkeleton(container, Math.min(limit, 6));
  await fetchPage(uid, page, limit, status, false);
};

async function fetchPage(uid, page, limit, status, background = false) {
  const container = document.getElementById('products-container');
  if (!container) return;

  try {
    const data = await apiFetch({
      action: 'listarComunidad',
      vendedor_uid: uid,
      admin: 'true',
      limit: limit,
      page: page,
      estado: status !== 'todos' ? status : undefined,
      vendorToken: vendorSession.token
    }, 'GET');

    if (!data.ok) throw new Error(data.error);

    // Filtrar por uid por si acaso
    const myProducts = (data.products || []).filter(p => p.vendedor_uid === uid);
    const total = data.total || myProducts.length;
    const totalPages = data.totalPages || Math.ceil(total / limit);

    // Guardar en caché
    const cacheKey = `vendor_products_${uid}_page_${page}_status_${status}`;
    sessionStorage.setItem(cacheKey, JSON.stringify({
      data: myProducts,
      total: total,
      page: page,
      totalPages: totalPages,
      timestamp: Date.now()
    }));

    if (!background) {
      applyMyProducts(myProducts, container, total, page, totalPages);
    }
  } catch (err) {
    if (!background) {
      container.innerHTML = `<p style="color:#ef4444">Error: ${escapeHtml(err.message)}</p>`;
    }
  }
}

// ── DONACIONES BADGE ──────────────────────────────────────
window.updateDonacionesBadge = function updateDonacionesBadge() {
  const el = document.getElementById('donaciones-count-badge');
  if (!el) return;
  const productos = window._vendorProducts || [];
  const activas = productos.filter(p => p.donado === true || p.donado === 'TRUE' || p.donado === 'true').length;
  el.textContent = activas > 0 ? `(${activas} activa${activas === 1 ? '' : 's'})` : '';
  el.style.color = '#f97316';
  el.style.fontWeight = '700';
};

// ── SUBIR LOGO ────────────────────────────────────────────
async function uploadVendorLogo(file) {
const url = await uploadSingleImage(file);
const res = await apiFetch({ action: 'actualizarLogoVendedor', vendorToken: vendorSession.token, logoUrl: url });
if (!res.ok) throw new Error(res.error || 'No se pudo guardar el logo');
vendorSession.logo = url;
localStorage.setItem('vendor_session', JSON.stringify(vendorSession));
return url;
}

// ── EDITAR / ELIMINAR PRODUCTO ───────────────────────────
window.editProduct = function(id) {
const p = (window._vendorProducts || []).find(x => String(x.id) === String(id));
if (!p) return;
document.getElementById('edit-product-id').value = id;
document.getElementById('pNombre').value = p.nombre || '';
document.getElementById('pPrecio').value = p.precio || '';
document.getElementById('pStock').value = p.stock || '';
document.getElementById('pCategoria').value = p.categoria || '';
document.getElementById('pTalla').value = p.talla || '';
document.getElementById('pDescripcion').value = p.descripcion || '';
[1,2,3].forEach(n => {
const imgUrl = p[`imagen${n}`] || '';
const slot = document.getElementById(`slot-${n}`);
if (imgUrl && slot) {
setSlotPreview(n, imgUrl);
uploadedImages[n] = imgUrl;
} else {
clearSlotPreview(n);
uploadedImages[n] = null;
}
});
document.getElementById('form-title').textContent = ' Editar producto';
document.getElementById('cancel-edit-btn').style.display = 'block';
document.getElementById('submit-product-btn').textContent = ' Guardar cambios';
switchTab('form');
};

window.deleteMyProduct = async function(id) {
const confirmed = await new Promise(resolve => {
if (typeof showCustomConfirm === 'function') {
showCustomConfirm({
title: ' Eliminar producto',
message: '¿Seguro que quieres eliminar este producto? Esta acción no se puede deshacer.',
icon: '', confirmText: 'Eliminar', cancelText: 'Cancelar',
onConfirm: () => resolve(true), onCancel: () => resolve(false)
});
} else {
resolve(confirm('¿Eliminar este producto?'));
}
});
if (!confirmed) return;
showLoader('Eliminando...');
try {
const res = await apiFetch({ action: 'deleteComunidad', id, vendorToken: vendorSession.token });
if (!res.ok) throw new Error(res.error);
showTemporaryMessage(' Producto eliminado', 'info');
window.invalidateVendorProductsCache();
loadMyProducts(true);
} catch (err) {
showTemporaryMessage(' ' + err.message, 'error');
} finally {
hideLoader();
}
};

function cancelEdit() {
document.getElementById('edit-product-id').value = '';
document.getElementById('form-title').textContent = ' Publicar producto';
document.getElementById('cancel-edit-btn').style.display = 'none';
document.getElementById('submit-product-btn').textContent = ' Publicar producto';
resetForm();
switchTab('products');
}

window.cancelEdit = cancelEdit;

function resetForm() {
['pNombre','pPrecio','pStock','pTalla','pDescripcion'].forEach(id => {
const el = document.getElementById(id);
if (el) el.value = '';
});
const cat = document.getElementById('pCategoria');
if (cat) cat.value = '';
[1,2,3].forEach(n => clearSlotPreview(n));
uploadedImages = { 1: null, 2: null, 3: null };
}

// ── SUBIR IMÁGENES ────────────────────────────────────────
window.triggerUpload = function(n) {
const sheet = document.getElementById('photo-source-sheet');
const input = document.getElementById(`file-${n}`);
if (!sheet || !input) {
    input?.click();
    return;
}
sheet.style.display = 'flex';
window.__photoSheetPick = function(choice) {
    sheet.style.display = 'none';
    window.__photoSheetPick = null;
    if (choice === 'cancel') return;
    if (choice === 'camera') {
        input.setAttribute('capture', 'environment');
    } else {
        input.removeAttribute('capture');
    }
    input.click();
};
};

async function compressImage(file) {
return new Promise((resolve) => {
const MAX = 800;
const QUALITY = 0.82;
const img = new Image();
const url = URL.createObjectURL(file);
img.onload = () => {
URL.revokeObjectURL(url);
let { width: w, height: h } = img;
if (w > MAX || h > MAX) {
if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
else        { w = Math.round(w * MAX / h); h = MAX; }
}
const canvas = document.createElement('canvas');
canvas.width = w; canvas.height = h;
canvas.getContext('2d').drawImage(img, 0, 0, w, h);
const mime = canvas.toDataURL('image/webp').startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg';
canvas.toBlob(blob => resolve(blob || file), mime, QUALITY);
};
img.onerror = () => resolve(file);
img.src = url;
});
}

window.handleFileSelect = function(n, input) {
    const files = input.files;
    if (!files || files.length === 0) return;

    const vendorUploadFn = async (file, slot) => {
        return await uploadSingleImage(file);
    };

    const onSuccess = (slot, url) => {
        uploadedImages[slot] = url;
        selectedFiles[slot] = null;
        console.log(`Imagen ${slot} subida, URL guardada en uploadedImages`);
    };

    const onProgress = (slot, percent) => {
        const progressId = `progress-image-upload-${slot}`;
        const progress = document.getElementById(progressId);
        if (progress) progress.style.width = percent + '%';
    };

    window.uploadImagesInQueue(files, n, vendorUploadFn, onProgress, onSuccess);
    input.value = '';
};

function setSlotPreview(n, src) {
const slot = document.getElementById(`slot-${n}`);
if (!slot) return;
let previewContainer = slot.querySelector('.slot-preview');
if (!previewContainer) {
previewContainer = document.createElement('div');
previewContainer.className = 'slot-preview';
previewContainer.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.05); pointer-events:none;';
slot.style.position = 'relative';
slot.appendChild(previewContainer);
}
let img = previewContainer.querySelector('img');
if (!img) {
img = document.createElement('img');
img.style.cssText = 'max-width:90%; max-height:90%; object-fit:contain; border-radius:8px;';
previewContainer.appendChild(img);
}
img.src = src;
slot.classList.add('has-img');
}

function clearSlotPreview(n) {
const slot = document.getElementById(`slot-${n}`);
if (!slot) return;
const previewContainer = slot.querySelector('.slot-preview');
if (previewContainer) previewContainer.remove();
slot.classList.remove('has-img');
}

window.removeImg = function(e, n) {
e.stopPropagation();
const fileInput = document.getElementById(`file-${n}`);
if (fileInput) fileInput.value = '';
clearSlotPreview(n);
uploadedImages[n] = null;
selectedFiles[n] = null;
};

async function uploadSingleImage(file) {
    const token = window.vendorSession?.token;
    if (!token) throw new Error('Sesión de vendedor no disponible');

    const compressed = await compressImage(file);
    const base64 = await fileToBase64(compressed);
    const mime = compressed.type || file.type;

    const formData = new URLSearchParams();
    formData.append('action', 'uploadImageVendedor');
    formData.append('data', base64);
    formData.append('mimeType', mime);
    formData.append('fileName', file.name.replace(/\.[^.]+$/, '') + (mime === 'image/webp' ? '.webp' : '.jpg'));
    formData.append('vendorToken', token);

    const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
    });
    const result = await res.json();
    if (!result.ok) throw new Error(result.error || 'Error al subir imagen');
    return result.url || `https://drive.google.com/file/d/${result.id}/view`;
}

function fileToBase64(file) {
return new Promise((resolve, reject) => {
const reader = new FileReader();
reader.onload = () => resolve(reader.result.split(',')[1]);
reader.onerror = reject;
reader.readAsDataURL(file);
});
}

// ── PUBLICAR PRODUCTO ─────────────────────────────────────
window.submitProduct = async function() {
if (!vendorSession || !vendorSession.token) {
  showTemporaryMessage(' Sesión expirada. Vuelve a iniciar sesión.', 'error');
  setTimeout(() => { window.location.reload(); }, 2000);
  return;
}
if (window.hasPendingImageUploads && window.hasPendingImageUploads()) {
  showTemporaryMessage(' Espera a que terminen de subir las imágenes...', 'error');
  return;
}
const editId = document.getElementById('edit-product-id')?.value;
if (!editId && (vendorSession.productosActuales || 0) >= (vendorSession.limiteProductos || 20)) {
const mensaje = vendorSession.plan === 'plus'
? `Llegaste al límite de ${vendorSession.limiteProductos} productos de tu plan Plus.`
: `Llegaste al límite de ${vendorSession.limiteProductos} productos del plan gratuito. Pide el plan Plus para subir hasta 200.`;
showTemporaryMessage(' ' + mensaje, 'error');
return;
}
const nombre = document.getElementById('pNombre')?.value.trim();
const precio = Number(document.getElementById('pPrecio')?.value);
const stock  = Number(document.getElementById('pStock')?.value);
if (!nombre || isNaN(precio) || precio < 0) {
showTemporaryMessage(' Nombre y precio son requeridos', 'error');
return;
}
showLoader('Subiendo imágenes...');
const btn = document.getElementById('submit-product-btn');
if (btn) btn.disabled = true;
try {
for (const n of [1, 2, 3]) {
const file = selectedFiles[n];
console.log(` Slot ${n}: archivo =`, file ? file.name : 'ninguno', '| uploadedImages previo =', uploadedImages[n]);
if (file && !uploadedImages[n]?.startsWith('http')) {
console.log(` Subiendo imagen ${n}...`);
uploadedImages[n] = await uploadSingleImage(file);
console.log(` Imagen ${n} subida: ${uploadedImages[n]}`);
} else {
console.log(`⏭ Slot ${n} no requiere subida`);
}
}
console.log(" Estado final de uploadedImages:", uploadedImages);
const productData = {
Nombre: document.getElementById('pNombre')?.value.trim(),
Precio: Number(document.getElementById('pPrecio')?.value),
Stock: Number(document.getElementById('pStock')?.value),
Descripcion: document.getElementById('pDescripcion')?.value.trim() || '',
Talla: document.getElementById('pTalla')?.value.trim() || '',
Categoria: document.getElementById('pCategoria')?.value || '',
Badge: '',
Imagen1: uploadedImages[1] || '',
Imagen2: uploadedImages[2] || '',
Imagen3: uploadedImages[3] || '',
vendorToken: vendorSession.token
};
if (editId) productData.id = editId;
console.log(" Enviando producto a la API:", productData);
showLoader('Guardando...');
const res = await apiFetch(
editId
? { action: 'updateComunidad', ...productData }
: { action: 'createComunidad', ...productData }
);
console.log(" Respuesta del servidor:", res);
if (!res.ok) throw new Error(res.error || 'Error del servidor');
showTemporaryMessage(editId ? ' Producto actualizado' : ' Producto publicado', 'success');
cancelEdit();
window.invalidateVendorProductsCache();
loadMyProducts(true);
} catch (err) {
console.error("Error en submitProduct:", err);
if(window.ZRMonitor) ZRMonitor.report('ERROR','vendedor.js','submitProduct',err.message||String(err));
showTemporaryMessage(' ' + err.message, 'error');
} finally {
hideLoader();
if (btn) btn.disabled = false;
}
};

window.switchTab = function(tab) {
const productsTab = document.getElementById('tab-products');
const formTab = document.getElementById('tab-form');
if (productsTab) productsTab.style.display = tab === 'products' ? 'block' : 'none';
if (formTab) formTab.style.display = tab === 'form' ? 'block' : 'none';
document.querySelectorAll('.vendor-tab').forEach((el, i) => {
el.classList.toggle('active', (tab === 'products' && i === 0) || (tab === 'form' && i === 1));
});
document.querySelectorAll('#bottom-nav-vendor .bottom-nav-item[data-vendor-page]').forEach(el => {
el.classList.toggle('active', el.dataset.vendorPage === tab);
});
};

// ── RECUPERAR SESIÓN ──────────────────────────────────────
let stored = localStorage.getItem('vendor_session');
if (!stored) {
stored = sessionStorage.getItem('vendor_session');
if (stored) {
localStorage.setItem('vendor_session', stored);
sessionStorage.removeItem('vendor_session');
}
}
if (stored) {
try {
vendorSession = JSON.parse(stored);
showPanel();
} catch (_) {
localStorage.removeItem('vendor_session');
}
}

const loginBtn = document.getElementById('login-btn');
if (loginBtn) loginBtn.addEventListener('click', vendorLogin);

const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) logoutBtn.addEventListener('click', vendorLogout);

const passInput = document.getElementById('login-password');
if (passInput) passInput.addEventListener('keypress', e => { if (e.key === 'Enter') vendorLogin(); });

const submitBtn = document.getElementById('submit-product-btn');
if (submitBtn) {
submitBtn.addEventListener('click', window.submitProduct);
}

const cancelBtn = document.getElementById('cancel-edit-btn');
if (cancelBtn) {
cancelBtn.addEventListener('click', window.cancelEdit);
}
} // fin initVendorPanel

// ──────────────────────────────────────────────
// INIT PENDING VENDORS (solo administración)
// ──────────────────────────────────────────────
function initPendingVendors() {
return;
const STYLES = `
<style id="vp-styles">
#vendors-pending-section {
margin: 0 0 24px 0;
}
.vp-card {
background: white;
border-radius: 18px;
padding: 20px;
margin-bottom: 20px;
box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.vp-card-header {
display: flex;
align-items: center;
justify-content: space-between;
gap: 12px;
background: linear-gradient(135deg, #3b1f5f, #6a3fa5);
color: white;
border-radius: 12px;
padding: 14px 16px;
margin-bottom: 16px;
}
.vp-card-header h2 {
margin: 0;
font-size: 16px;
font-weight: 700;
}
.vp-refresh-btn {
background: rgba(255,255,255,0.2);
border: none;
color: white;
width: 32px;
height: 32px;
border-radius: 50%;
font-size: 16px;
cursor: pointer;
display: flex;
align-items: center;
justify-content: center;
transition: background 0.2s;
flex-shrink: 0;
}
.vp-refresh-btn:hover { background: rgba(255,255,255,0.3); }
.vp-vendor-row {
display: flex;
align-items: center;
gap: 14px;
padding: 14px;
border-radius: 14px;
background: #f8f8fc;
margin-bottom: 10px;
flex-wrap: wrap;
border-left: 4px solid #3b1f5f;
}
.vp-vendor-avatar {
width: 48px;
height: 48px;
border-radius: 50%;
background: linear-gradient(135deg, #3b1f5f, #6a3fa5);
color: white;
display: flex;
align-items: center;
justify-content: center;
font-size: 20px;
font-weight: 700;
flex-shrink: 0;
}
.vp-vendor-info { flex: 1; min-width: 0; }
.vp-vendor-name {
font-weight: 700;
font-size: 15px;
margin-bottom: 4px;
color: #1a1a2e;
}
.vp-vendor-meta {
display: flex;
gap: 12px;
flex-wrap: wrap;
font-size: 12px;
color: #666;
align-items: center;
}
.vp-badge-pendiente {
display: inline-block;
padding: 3px 10px;
border-radius: 20px;
font-size: 11px;
font-weight: 700;
background: #fff8e1;
color: #f57f17;
}
.vp-wa-link {
color: #25d366;
font-weight: 600;
text-decoration: none;
font-size: 12px;
}
.vp-actions {
display: flex;
gap: 8px;
flex-shrink: 0;
}
.vp-btn-approve {
padding: 8px 18px;
border: none;
border-radius: 20px;
background: #e8f5e9;
color: #2e7d32;
font-size: 13px;
font-weight: 700;
cursor: pointer;
transition: background 0.2s;
}
.vp-btn-approve:hover { background: #c8e6c9; }
.vp-btn-reject {
padding: 8px 18px;
border: none;
border-radius: 20px;
background: #ffebee;
color: #c62828;
font-size: 13px;
font-weight: 700;
cursor: pointer;
transition: background 0.2s;
}
.vp-btn-reject:hover { background: #ffcdd2; }
.vp-empty {
text-align: center;
padding: 20px;
color: #aaa;
font-size: 14px;
}
.vp-btn-confiable {
padding: 8px 14px;
border: 1.5px solid #f0a500;
border-radius: 20px;
background: transparent;
color: #f0a500;
font-size: 13px;
font-weight: 700;
cursor: pointer;
transition: all 0.2s;
}
.vp-btn-confiable:hover { background: #fff8e1; }
.vp-btn-confiable.is-confiable {
background: #fff8e1;
color: #e65100;
border-color: #e65100;
}
.vp-badge-confiable {
display: inline-block;
padding: 2px 8px;
border-radius: 20px;
font-size: 11px;
font-weight: 700;
background: #fff8e1;
color: #e65100;
}
.vp-badge-count {
background: #ff4f81;
color: white;
border-radius: 20px;
padding: 2px 8px;
font-size: 11px;
font-weight: 700;
margin-left: 6px;
}
@media (max-width: 600px) {
.vp-vendor-row { flex-direction: column; align-items: flex-start; }
.vp-actions { width: 100%; justify-content: flex-end; }
}
</style>
`;
const SECTION_HTML = `
<div id="vendors-pending-section">
<div class="vp-card">
<div class="vp-card-header">
<h2>Vendedores pendientes de aprobación <span id="vp-count-badge" class="vp-badge-count" style="display:none"></span></h2>
<button class="vp-refresh-btn" id="vp-refresh-btn" title="Actualizar"><svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" aria-hidden="true"><use href="#ic-refresh"/></svg></button>
</div>
<div id="vp-vendors-list">
<div class="vp-empty">Cargando...</div>
</div>
</div>
</div>
`;
injectStyles('vp-styles', STYLES);
const notifContainer = document.getElementById('notifications');
if (notifContainer && !document.getElementById('vendors-pending-section')) {
notifContainer.insertAdjacentHTML('beforebegin', SECTION_HTML);
}
let currentVendors = [];
async function loadVendors() {
const list = document.getElementById('vp-vendors-list');
const badge = document.getElementById('vp-count-badge');
if (!list) return;
list.innerHTML = '<div class="vp-empty">Cargando...</div>';
try {
const token = getAdminToken();
if (!token) {
list.innerHTML = '<div class="vp-empty">Sin token de admin</div>';
return;
}
const data = await apiFetch({ action: 'vendedoresAdmin', token }, 'GET');
if (!data.ok) throw new Error(data.error || 'Error del servidor');
const vendors = data.vendors || [];
currentVendors = vendors;
const pending = vendors.filter(v => v.estado === 'pendiente');
if (badge) {
if (pending.length > 0) {
badge.textContent = pending.length;
badge.style.display = 'inline-block';
} else {
badge.style.display = 'none';
}
}
if (!vendors.length) {
list.innerHTML = '<div class="vp-empty">No hay vendedores registrados aún</div>';
return;
}
const toShow = [...pending, ...vendors.filter(v => v.estado !== 'pendiente')];
list.innerHTML = toShow.map(v => {
const inicial = (v.nombre || '?')[0].toUpperCase();
const fecha = v.fecha ? new Date(v.fecha).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' }) : '';
const waUrl = `https://wa.me/52${v.telefono}?text=${encodeURIComponent('Hola ' + v.nombre + ', tu cuenta de vendedor en Z&R ha sido aprobada. Ya puedes ingresar en: znr.com/vendedor.html')}`;
const confiableBadge = v.confiable ? '<span class="vp-badge-confiable">Confiable</span>' : '';
return `
<div class="vp-vendor-row" id="vprow-${escapeHtml(v.uid)}">
<div class="vp-vendor-avatar">${inicial}</div>
<div class="vp-vendor-info">
<div class="vp-vendor-name">${escapeHtml(v.nombre)}</div>
<div class="vp-vendor-meta">
<span> ${escapeHtml(v.telefono)}</span>
<a class="vp-wa-link" href="${waUrl}" target="_blank" rel="noopener">WhatsApp</a>
${v.estado === 'pendiente'
? '<span class="vp-badge-pendiente">⏳ pendiente</span>'
: '<span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;background:#e8f5e9;color:#2e7d32"> activo</span>'
}
${confiableBadge}
${fecha ? `<span> ${fecha}</span>` : ''}
</div>
</div>
<div class="vp-actions">
${v.estado === 'pendiente'
? `<button class="vp-btn-approve" data-uid="${escapeHtml(v.uid)}" data-nombre="${escapeHtml(v.nombre)}" data-tel="${escapeHtml(v.telefono)}"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-check"/></svg> Aprobar</button>`
: ''}
<button class="vp-btn-reject" data-uid="${escapeHtml(v.uid)}" data-nombre="${escapeHtml(v.nombre)}"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-x"/></svg> Rechazar
</button>
</div>
</div>
`;
}).join('');
document.querySelectorAll('.vp-btn-approve').forEach(btn => {
btn.addEventListener('click', async (e) => {
const uid = btn.dataset.uid;
const nombre = btn.dataset.nombre;
const telefono = btn.dataset.tel;
await aprobarVendor(uid, nombre, telefono);
});
});
document.querySelectorAll('.vp-btn-reject').forEach(btn => {
btn.addEventListener('click', async (e) => {
const uid = btn.dataset.uid;
const nombre = btn.dataset.nombre;
await rechazarVendor(uid, nombre);
});
});
document.querySelectorAll('.vp-btn-confiable').forEach(btn => {
btn.addEventListener('click', async (e) => {
const uid = btn.dataset.uid;
const nombre = btn.dataset.nombre;
const esConfiable = btn.dataset.confiable === 'true';
await toggleConfiableVendor(uid, nombre, esConfiable);
});
});
} catch (err) {
list.innerHTML = `<div class="vp-empty" style="color:#ef4444">Error: ${escapeHtml(err.message)}</div>`;
}
}
async function aprobarVendor(uid, nombre, telefono) {
const row = document.getElementById(`vprow-${uid}`);
if (row) row.style.opacity = '0.5';
try {
const res = await apiFetch({ action: 'aprobarVendedor', uid, token: getAdminToken() });
if (!res.ok) throw new Error(res.error);
const codigo = res.codigo;
const telefonoVendedor = res.telefono;
const mensaje = ` *¡Cuenta aprobada!* \n\nHola ${nombre}, tu cuenta de vendedor en Z&R Comunidad ha sido *aprobada*.\n\n*Tu contraseña temporal es:* ${codigo}\n\nPuedes cambiarla después de iniciar sesión.\n\n Accede aquí: znr.com/vendedor.html\n\n¡Bienvenido! `;
const waUrl = `https://wa.me/52${telefonoVendedor}?text=${encodeURIComponent(mensaje)}`;
window.open(waUrl, '_blank');
row.remove();
} catch (err) {
if (row) row.style.opacity = '1';
showTemporaryMessage(' ' + err.message, 'error');
}
}
async function rechazarVendor(uid, nombre) {
const row = document.getElementById(`vprow-${uid}`);
if (row) row.style.opacity = '0.5';
try {
const res = await apiFetch({ action: 'rechazarVendedor', uid, token: getAdminToken() });
if (!res.ok) throw new Error(res.error);
showTemporaryMessage(` ${nombre} rechazado`, 'info');
if (row) {
row.style.transition = 'opacity 0.3s';
row.style.opacity = '0';
setTimeout(() => { row.remove(); updatePendingBadge(); }, 300);
}
} catch (err) {
if (row) row.style.opacity = '1';
showTemporaryMessage(' ' + err.message, 'error');
}
}
async function toggleConfiableVendor(uid, nombre, esConfiableActual) {
try {
const nuevoValor = !esConfiableActual;
const res = await apiFetch({ action: 'marcarVendedorConfiable', uid, confiable: nuevoValor, token: getAdminToken() });
if (!res.ok) throw new Error(res.error);
const msg = nuevoValor
? ` ${nombre} marcado como confiable. Sus próximos productos se publicarán directo.`
: ` ${nombre} ya no es confiable.`;
showTemporaryMessage(msg, 'success');
loadVendors();
} catch (err) {
showTemporaryMessage(' ' + err.message, 'error');
}
}
function updatePendingBadge() {
const remaining = document.querySelectorAll('[id^="vprow-"]').length;
const badge = document.getElementById('vp-count-badge');
if (!badge) return;
if (remaining > 0) {
badge.textContent = remaining;
badge.style.display = 'inline-block';
} else {
badge.style.display = 'none';
const list = document.getElementById('vp-vendors-list');
if (list && list.innerHTML.includes('pendientes')) {
list.innerHTML = '<div class="vp-empty">No hay vendedores pendientes de aprobación</div>';
}
}
}
const refreshBtn = document.getElementById('vp-refresh-btn');
if (refreshBtn) refreshBtn.addEventListener('click', loadVendors);
loadVendors();
}

// ──────────────────────────────────────────────
// DOMContentLoaded
// ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
initVendorPanel();
initPendingVendors();

const submitBtn = document.getElementById('submit-product-btn');
if (submitBtn) {
  window.addEventListener('znr:uploads-status', (e) => {
    const pending = e.detail.pending > 0;
    submitBtn.disabled = pending;
    submitBtn.style.opacity = pending ? '0.6' : '';
    submitBtn.style.cursor = pending ? 'not-allowed' : '';
    if (pending) {
      submitBtn.dataset.originalLabel = submitBtn.dataset.originalLabel || submitBtn.innerHTML;
      submitBtn.innerHTML = ' Subiendo imágenes...';
    } else if (submitBtn.dataset.originalLabel) {
      submitBtn.innerHTML = submitBtn.dataset.originalLabel;
    }
  });
}
});

window.addEventListener('layoutChanged', (e) => {
  const container = document.getElementById('products-container');
  if (container) {
    const isGrid = e.detail.layout === 'grid';
    container.classList.toggle('layout-grid', isGrid);
    container.classList.toggle('layout-list', !isGrid);
  }
});

// ──────────────────────────────────────────────
// Funciones expuestas globalmente (onclick en HTML)
// ──────────────────────────────────────────────

window.openSettingsModal  = function() { openSettingsModal(); };
window.closeSettingsModal = function() { closeSettingsModal(); };
window.guardarPerfil      = function() { guardarPerfil(); };
window.guardarPassword    = function() { guardarPassword(); };
window.solicitarPlanPlus  = function() { solicitarPlanPlus(); };




// ──────────────────────────────────────────────
// Funciones de perfil / configuración
// ──────────────────────────────────────────────

function getInitials(nombre) {
if (!nombre) return '?';
const words = nombre.trim().split(/\s+/);
if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function updateVendorAvatar() {
  if (!vendorSession) return;
  const btn = document.getElementById('vendor-avatar-btn');
  const initEl = document.getElementById('vendor-avatar-initials');
  const imgEl  = document.getElementById('vendor-avatar-img');
  if (!btn || !initEl || !imgEl) return;

  btn.style.display = 'flex';
  const esPlus = vendorSession.plan === 'plus';
  const logo   = vendorSession.logo;

  const esUrlValida = logo && (logo.startsWith('http') || logo.startsWith('data:image'));

  if (esPlus && esUrlValida) {
    imgEl.src = logo;
    imgEl.style.display = 'block';
    initEl.style.display = 'none';
  } else {
    imgEl.style.display = 'none';
    initEl.style.display = 'flex';
    initEl.textContent = getInitials(vendorSession.nombre);
  }
}

function openSettingsModal() {
  if (!vendorSession) return;
  const modal = document.getElementById('settings-modal');
  if (!modal) return;

  document.getElementById('settings-nombre').value      = vendorSession.nombre || '';
  document.getElementById('settings-descripcion').value = vendorSession.descripcion || '';
  document.getElementById('settings-whatsapp').value    = vendorSession.whatsapp || '';
  const horarioInput = document.getElementById('settings-horario');
  if (horarioInput) horarioInput.value = vendorSession.horario || '';
  const catSel = document.getElementById('settings-categoria');
  if (catSel) catSel.value = vendorSession.categoria || '';

  const fbInput  = document.getElementById('settings-facebook');
  if (fbInput)  fbInput.value  = vendorSession.facebook  || '';
  const twInput  = document.getElementById('settings-twitter');
  if (twInput)  twInput.value  = vendorSession.twitter   || '';
  const igInput  = document.getElementById('settings-instagram');
  if (igInput)  igInput.value  = vendorSession.instagram || '';
  const ttInput  = document.getElementById('settings-tiktok');
  if (ttInput)  ttInput.value  = vendorSession.tiktok    || '';

  document.getElementById('settings-pwd-old').value     = '';
  document.getElementById('settings-pwd-new').value     = '';
  document.getElementById('settings-pwd-confirm').value = '';
  document.getElementById('settings-perfil-msg').textContent = '';
  document.getElementById('settings-pwd-msg').textContent    = '';

  const esPlus = vendorSession.plan === 'plus';

  const placeholderEl = document.getElementById('settings-avatar-placeholder');
  const photoEl       = document.getElementById('settings-avatar-photo');
  const changeBtn     = document.getElementById('settings-change-photo-btn');

  const logo = vendorSession.logo;
  const esUrlValida = logo && (logo.startsWith('http') || logo.startsWith('data:image'));

  if (esPlus && esUrlValida) {
    photoEl.src = logo;
    photoEl.style.display = 'block';
    placeholderEl.style.display = 'none';
  } else {
    placeholderEl.style.display = 'flex';
    placeholderEl.textContent   = getInitials(vendorSession.nombre);
    photoEl.style.display       = 'none';
  }
  if (changeBtn) changeBtn.style.display = esPlus ? 'flex' : 'none';

  document.getElementById('settings-header-name').textContent = vendorSession.nombre || '';
  const planEl = document.getElementById('settings-header-plan');
  if (esPlus) {
    const vence = vendorSession.planVence ? new Date(vendorSession.planVence).toLocaleDateString('es-MX', {day:'2-digit',month:'short',year:'numeric'}) : '—';
    planEl.innerHTML = '<span style="background:#a855f7;color:#fff;padding:2px 8px;border-radius:999px;font-size:.7rem;font-weight:700;">⭐ Plus</span> <span style="color:#aaa;font-size:.75rem;">· vence ' + vence + '</span>';
  } else {
    planEl.innerHTML = '<span style="background:#e5e7eb;color:#555;padding:2px 8px;border-radius:999px;font-size:.7rem;font-weight:600;">Free</span>';
  }

  const planInfoEl = document.getElementById('settings-plan-info');
  if (planInfoEl) {
    if (esPlus) {
      const vence = vendorSession.planVence ? new Date(vendorSession.planVence).toLocaleDateString('es-MX', {day:'2-digit',month:'long',year:'numeric'}) : '—';
      planInfoEl.innerHTML = '<div style="background:#f5f3ff;border-radius:10px;padding:12px 14px;">' +
        '<p style="margin:0;font-weight:700;color:#7c3aed;">⭐ Plan Plus activo</p>' +
        '<p style="margin:4px 0 0;color:#6b7280;font-size:.82rem;">Vence el ' + vence + '</p></div>';
    } else {
      planInfoEl.innerHTML = '<div style="background:#f9f9f9;border-radius:10px;padding:12px 14px;">' +
        '<p style="margin:0;color:#374151;font-size:.85rem;">Estás en el plan <strong>Free</strong>.</p>' +
        '<p style="margin:4px 0 0;font-size:.82rem;color:#6b7280;">Con Plus obtienes foto de perfil, destacado, logo y aprobación instantánea.</p>' +
        '<div id="settings-plus-notif" style="margin-top:10px;"><p style="color:#aaa;font-size:.78rem;margin:0;">Cargando…</p></div></div>';
      loadPlusSolicitudVendedor('settings-plus-notif');
    }
  }

  document.getElementById('si-productos').textContent = vendorSession.productosActuales ?? '—';
  document.getElementById('si-limite').textContent    = vendorSession.limiteProductos ?? '—';
  document.getElementById('si-uid').textContent       = vendorSession.uid || '—';
  const fechaEl = document.getElementById('si-fecha');
  if (fechaEl) {
    fechaEl.textContent = vendorSession.fechaRegistro
      ? new Date(vendorSession.fechaRegistro).toLocaleDateString('es-MX', {day:'2-digit',month:'short',year:'numeric'})
      : '—';
  }

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  if (typeof loadBeneficiarioDonaciones === 'function') loadBeneficiarioDonaciones();
  updateDonacionesBadge();

  const photoInput = document.getElementById('settings-photo-input');
  if (photoInput && !photoInput._wiredSettings) {
    photoInput._wiredSettings = true;
    photoInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      showLoader('Subiendo foto...');
      try {
        await uploadVendorLogo(file);
        showTemporaryMessage('✅ Foto actualizada', 'success');
        updateVendorAvatar();
        openSettingsModal();
      } catch(err) {
        showTemporaryMessage('⚠️ ' + err.message, 'error');
      } finally {
        hideLoader();
        photoInput.value = '';
      }
    });
  }
}

function closeSettingsModal() {
const modal = document.getElementById('settings-modal');
if (modal) modal.style.display = 'none';
document.body.style.overflow = '';
}

document.getElementById('settings-modal')?.addEventListener('click', function(e) {
if (e.target === this) closeSettingsModal();
});

async function guardarPerfil() {
  const btn = document.getElementById('btn-guardar-perfil');
  const msg = document.getElementById('settings-perfil-msg');
  if (!vendorSession) return;

  const nombre     = document.getElementById('settings-nombre').value.trim();
  const descripcion = document.getElementById('settings-descripcion').value.trim();
  const whatsapp   = document.getElementById('settings-whatsapp').value.trim();
  const categoria  = document.getElementById('settings-categoria').value;
  const horario    = document.getElementById('settings-horario')?.value.trim() || '';

  const facebook  = document.getElementById('settings-facebook').value.trim();
  const twitter   = document.getElementById('settings-twitter').value.trim();
  const instagram = document.getElementById('settings-instagram').value.trim();
  const tiktok    = document.getElementById('settings-tiktok').value.trim();

  if (!nombre || nombre.length < 2) {
    msg.style.color = '#dc2626'; msg.textContent = 'El nombre debe tener al menos 2 caracteres.';
    return;
  }

  btn.disabled = true; btn.textContent = 'Guardando...';
  msg.textContent = '';

  try {
    const res = await apiCall({
      action: 'actualizarPerfilVendedor',
      vendorToken: vendorSession.token,
      nombre,
      descripcion,
      whatsapp,
      categoria,
      horario,
      facebook,
      twitter,
      instagram,
      tiktok
    });

    if (!res.ok) {
      msg.style.color = '#dc2626';
      msg.textContent = res.error || 'Error al guardar.';
      return;
    }

    vendorSession.nombre      = nombre;
    vendorSession.descripcion = descripcion;
    vendorSession.whatsapp    = whatsapp;
    vendorSession.categoria   = categoria;
    vendorSession.horario     = horario;
    vendorSession.facebook    = facebook;
    vendorSession.twitter     = twitter;
    vendorSession.instagram   = instagram;
    vendorSession.tiktok      = tiktok;

    try { localStorage.setItem('vendor_session', JSON.stringify(vendorSession)); } catch(e) {}

    const nameHeader = document.getElementById('vendor-name-header');
    if (nameHeader) nameHeader.textContent = nombre;
    updateVendorAvatar();
    document.getElementById('settings-header-name').textContent = nombre;

    msg.style.color = '#16a34a';
    msg.textContent = '✅ Cambios guardados';

  } catch(e) {
    msg.style.color = '#dc2626';
    msg.textContent = 'Error de red.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar cambios';
  }
}
async function guardarPassword() {
const btn  = document.getElementById('btn-guardar-pwd');
const msg  = document.getElementById('settings-pwd-msg');
const oldP = document.getElementById('settings-pwd-old').value;
const newP = document.getElementById('settings-pwd-new').value;
const conf = document.getElementById('settings-pwd-confirm').value;

msg.textContent = '';
if (!oldP || !newP || !conf) { msg.style.color = '#dc2626'; msg.textContent = 'Completa todos los campos.'; return; }
if (newP.length < 6)         { msg.style.color = '#dc2626'; msg.textContent = 'La nueva contraseña debe tener al menos 6 caracteres.'; return; }
if (newP !== conf)           { msg.style.color = '#dc2626'; msg.textContent = 'Las contraseñas no coinciden.'; return; }

btn.disabled = true; btn.textContent = 'Cambiando...';
try {
const res = await apiCall({ action: 'cambiarPasswordVendedor', vendorToken: vendorSession.token, vendorUid: vendorSession.uid, oldPassword: oldP, newPassword: newP });
if (!res.ok) { msg.style.color = '#dc2626'; msg.textContent = res.error || 'Error al cambiar contraseña.'; return; }
msg.style.color = '#16a34a'; msg.textContent = '✅ Contraseña actualizada';
document.getElementById('settings-pwd-old').value = '';
document.getElementById('settings-pwd-new').value = '';
document.getElementById('settings-pwd-confirm').value = '';
} catch(e) {
msg.style.color = '#dc2626'; msg.textContent = 'Error de red.';
} finally {
btn.disabled = false; btn.textContent = 'Cambiar contraseña';
}
}

window.eliminarMiCuenta = async function() {
  if (!vendorSession || !vendorSession.token) return;

  const confirmar = (opts) => new Promise(resolve => {
    if (typeof showCustomConfirm === 'function') {
      showCustomConfirm(Object.assign({}, opts, {
        onConfirm: () => resolve(true),
        onCancel:  () => resolve(false)
      }));
    } else {
      resolve(confirm(opts.message));
    }
  });

  const paso1 = await confirmar({
    title: '⚠️ Eliminar mi cuenta',
    message: 'Esto borrará permanentemente tus productos, imágenes, sesiones en vivo, entregas y tu cuenta de vendedor. No hay forma de deshacerlo. ¿Deseas continuar?',
    icon: '', confirmText: 'Continuar', cancelText: 'Cancelar'
  });
  if (!paso1) return;

  const paso2 = await confirmar({
    title: '🚨 Última confirmación',
    message: 'Al confirmar, tu cuenta y todos tus datos se eliminarán de inmediato y no podrás recuperarlos. ¿Eliminar definitivamente?',
    icon: '', confirmText: 'Sí, eliminar todo', cancelText: 'Cancelar'
  });
  if (!paso2) return;

  showLoader('Eliminando tu cuenta...');
  try {
    const res = await apiCall({ action: 'eliminarCuentaVendedor', vendorToken: vendorSession.token, uid: vendorSession.uid });
    if (!res.ok) throw new Error(res.error || 'No se pudo eliminar la cuenta');
    showTemporaryMessage('🗑️ Tu cuenta fue eliminada por completo', 'info');
    setTimeout(() => { vendorLogout(); }, 1200);
  } catch (err) {
    showTemporaryMessage('❌ ' + err.message, 'error');
  } finally {
    hideLoader();
  }
};

window.verMisEstadisticas = async function() {
  if (!vendorSession || !vendorSession.token) return;

  let modal = document.getElementById('mis-stats-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'mis-stats-modal';
    modal.style.cssText = 'display:flex;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;align-items:center;justify-content:center;';
    modal.innerHTML = `
      <div style="background:#fff;border-radius:20px;padding:24px;max-width:420px;width:90%;max-height:82vh;overflow-y:auto;position:relative;">
        <button id="mis-stats-close" style="position:absolute;top:14px;right:14px;background:#f0f0f5;border:none;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer;color:#666;">✕</button>
        <h3 style="margin:0 0 16px;font-size:1.1rem;">📊 Mis estadísticas</h3>
        <div id="mis-stats-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
          <p style="grid-column:span 2;text-align:center;color:#aaa;">Cargando...</p>
        </div>
        <div id="mis-stats-rating"></div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#mis-stats-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  }
  modal.style.display = 'flex';

  const grid = document.getElementById('mis-stats-grid');
  const ratingSlot = document.getElementById('mis-stats-rating');
  grid.innerHTML = '<p style="grid-column:span 2;text-align:center;color:#aaa;">Cargando...</p>';
  ratingSlot.innerHTML = '';

  try {
    const url = `${window.API_URL}?${new URLSearchParams({
      action: 'listarComunidad',
      vendedor_uid: vendorSession.uid,
      vendorToken: vendorSession.token,
      limit: '200', page: '1'
    })}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Error al cargar');
    const all = data.products || [];
    const aprobados  = all.filter(p => p.estado === 'aprobado').length;
    const pendientes = all.filter(p => p.estado === 'pendiente').length;
    const stock = all.reduce((s, p) => s + (Number(p.stock) || 0), 0);

    grid.innerHTML = `
      <div style="background:#f0fff4;border-radius:14px;padding:14px;text-align:center;">
        <div style="font-size:22px;font-weight:800;color:#2e7d32;">${all.length}</div>
        <div style="font-size:11px;color:#555;">Productos</div>
      </div>
      <div style="background:#f5f3ff;border-radius:14px;padding:14px;text-align:center;">
        <div style="font-size:22px;font-weight:800;color:#7c3aed;">${stock}</div>
        <div style="font-size:11px;color:#555;">Stock total</div>
      </div>
      <div style="background:#eef2ff;border-radius:14px;padding:14px;text-align:center;">
        <div style="font-size:22px;font-weight:800;color:#4338ca;">${aprobados}</div>
        <div style="font-size:11px;color:#555;">Aprobados</div>
      </div>
      <div style="background:#fff8e1;border-radius:14px;padding:14px;text-align:center;">
        <div style="font-size:22px;font-weight:800;color:#f57f17;">${pendientes}</div>
        <div style="font-size:11px;color:#555;">Pendientes</div>
      </div>`;
  } catch (err) {
    grid.innerHTML = `<p style="grid-column:span 2;color:#ef4444;text-align:center;">Error: ${err.message}</p>`;
  }

  try {
    const rUrl = `${window.API_URL}?${new URLSearchParams({ action: 'obtenerCalificacionesVendedor', vendedor_uid: vendorSession.uid })}`;
    const rRes = await fetch(rUrl);
    const rData = await rRes.json();
    if (rData.ok && rData.total > 0) {
      ratingSlot.innerHTML = `
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:14px;padding:12px;text-align:center;">
          <div style="font-size:20px;font-weight:800;color:#b45309;">⭐ ${rData.promedio}</div>
          <div style="font-size:11px;color:#92400e;">${rData.total} calificación${rData.total === 1 ? '' : 'es'} de compradores</div>
        </div>`;
    } else {
      ratingSlot.innerHTML = `<p style="text-align:center;font-size:12px;color:#aaa;">Aún no tienes calificaciones</p>`;
    }
  } catch (e) { /* silencioso */ }
};

async function loadPlusSolicitudVendedor(targetAreaId) {
const areaId = targetAreaId || 'vendor-plus-notif-area';
const area = document.getElementById(areaId);
if (!area || !vendorSession) return;

try {
const res = await apiCall({ action: 'getPlusSolicitudVendedor', vendorToken: vendorSession.token });
const sol = res.solicitud;

if (!sol) {
area.innerHTML = `<button onclick="solicitarPlanPlus('${areaId}')" class="btn-solicitar-plus"
style="display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border-radius:999px;border:none;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;font-size:13px;font-weight:700;cursor:pointer;">
⭐ Solicitar plan Plus
</button>`;
return;
}

if (sol.estado === 'pending') {
area.innerHTML = `<div style="background:#f3e8ff;border-radius:10px;padding:10px 14px;font-size:12.5px;color:#7c3aed;font-weight:600;">
⏳ Solicitud enviada — en espera de aprobación del administrador.
</div>`;
return;
}

if (sol.estado === 'approved') {
let mpBtn = sol.mp_link
? `<a href="${sol.mp_link}" target="_blank" rel="noopener"
style="display:inline-flex;align-items:center;gap:6px;margin-top:8px;padding:8px 16px;border-radius:999px;background:#00b1ea;color:#fff;font-size:12.5px;font-weight:700;text-decoration:none;">
💳 Pagar $49 con Mercado Pago
</a>` : '';
area.innerHTML = `<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:12px 14px;">
<p style="margin:0 0 4px;color:#16a34a;font-weight:700;font-size:13px;">✅ ¡Plan Plus aprobado!</p>
<p style="margin:0 0 8px;color:#374151;font-size:12px;">Realiza tu pago para activarlo. El admin lo confirmará.</p>
<p style="margin:0 0 2px;color:#555;font-size:12px;">Clabe interbancaria:</p>
<p style="margin:0 0 8px;font-size:15px;font-weight:700;letter-spacing:.05em;color:#111;font-family:monospace;">${sol.clabe}</p>
<p style="margin:0;color:#888;font-size:11px;">Importe: $49 MXN · ${sol.dias} días</p>
${mpBtn}
</div>`;
return;
}

if (sol.estado === 'denied') {
const motivo = sol.motivo ? `<p style="margin:4px 0 0;color:#6b7280;font-size:12px;">Motivo: ${escapeHtml(sol.motivo)}</p>` : '';
area.innerHTML = `<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:12px;padding:12px 14px;">
<p style="margin:0;color:#dc2626;font-weight:700;font-size:13px;">❌ Solicitud rechazada</p>
${motivo}
<button onclick="solicitarPlanPlus('${areaId}')" style="margin-top:10px;display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:999px;border:none;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;font-size:12px;font-weight:700;cursor:pointer;">
Volver a solicitar
</button>
</div>`;
}
} catch(e) {
console.warn('loadPlusSolicitudVendedor:', e);
area.innerHTML = '<p style="color:#ef4444;font-size:.78rem;margin:0;">⚠️ No se pudo cargar. Cierra y vuelve a abrir esta sección.</p>';
}
}

async function solicitarPlanPlus(targetAreaId) {
const areaId = targetAreaId || 'vendor-plus-notif-area';
const btn = document.querySelector('#' + areaId + ' .btn-solicitar-plus');
if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }
try {
const res = await apiCall({ action: 'solicitarPlanPlus', vendorToken: vendorSession.token });
if (!res.ok) {
showTemporaryMessage('⚠️ ' + (res.error || 'Error al enviar'), 'error');
if (btn) { btn.disabled = false; btn.innerHTML = '⭐ Solicitar plan Plus'; }
return;
}
showTemporaryMessage('✅ Solicitud enviada', 'success');
loadPlusSolicitudVendedor(areaId);
} catch(e) {
showTemporaryMessage('⚠️ Error de red', 'error');
if (btn) { btn.disabled = false; btn.innerHTML = '⭐ Solicitar plan Plus'; }
}
}

async function apiCall(data) {
  const API_BASE = window.API_URL;
  if (!API_BASE) throw new Error('API_URL no está disponible');

  const params = new URLSearchParams();
  Object.entries(data || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null) params.append(k, v);
  });

  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (_) {
    throw new Error('La API devolvió una respuesta no válida');
  }
}

// ──────────────────────────────────────────────
// Secciones colapsables del panel de ajustes
// ──────────────────────────────────────────────
window.toggleSettingsSection = function(btn) {
  const body = btn.nextElementSibling;
  const open = btn.classList.toggle('open');
  body.style.display = open ? 'block' : 'none';
};

// ── Modal de gestión de donaciones ──────────────────────────
window.openDonarProductosModal = async function(productoId) {
  const prod = window._vendorProducts && window._vendorProducts.find(p => String(p.id) === String(productoId));
  if (!prod) { showTemporaryMessage('⚠️ Recarga tus productos primero', 'error'); return; }

  const donado = prod.donado === true || prod.donado === 'TRUE' || prod.donado === 'true';
  const esc = s => String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let imgUrl = null;
if (prod.imagen1) {
  imgUrl = typeof optimizeDriveUrl === 'function' ? optimizeDriveUrl(prod.imagen1, 56) : prod.imagen1;
}

  const old = document.getElementById('modal-donar-productos');
  if (old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-donar-productos';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:flex-end;justify-content:center;';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:20px 20px 0 0;width:100%;max-width:480px;padding:0 0 36px;">
      <div style="padding:16px 20px 12px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between;">
        <h2 style="margin:0;font-size:1rem;font-weight:800;">❤️ Donar producto</h2>
        <button id="btn-close-donar" style="background:none;border:none;font-size:22px;cursor:pointer;color:#888;line-height:1;">×</button>
      </div>
      <div style="padding:16px 20px 0;">

        <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#fafafa;border-radius:12px;border:1.5px solid #f97316;margin-bottom:16px;">
          ${imgUrl ? `<img src="${esc(imgUrl)}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{style:'width:48px;height:48px;background:#f5f5f8;border-radius:8px;flex-shrink:0;'}))" style="width:48px;height:48px;object-fit:cover;border-radius:8px;flex-shrink:0;">` : `<div style="width:48px;height:48px;background:#f5f5f8;border-radius:8px;flex-shrink:0;"></div>`}
          <div style="flex:1;min-width:0;">
            <div style="font-size:.88rem;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(prod.nombre||'')}</div>
            <div style="font-size:.75rem;color:#888;">$${Number(prod.precio||0).toLocaleString()} · Stock: ${prod.stock||0}</div>
            ${donado ? '<div style="font-size:.72rem;color:#f97316;margin-top:1px;">❤️ Donando actualmente</div>' : ''}
          </div>
        </div>

        <div id="donar-msg" style="display:none;padding:10px;border-radius:10px;margin-bottom:12px;font-size:.82rem;"></div>

        ${donado ? `
        <p style="font-size:.8rem;color:#555;margin:0 0 16px;line-height:1.5;">Este producto ya está asignado a un beneficiario. ¿Deseas quitar la donación?</p>
        <button id="btn-donar-quitar" style="width:100%;padding:13px;border:none;border-radius:12px;background:#fee2e2;color:#b91c1c;font-weight:700;font-size:.9rem;cursor:pointer;">
          Quitar donación
        </button>` : `
        <p style="font-size:.8rem;color:#888;margin:0 0 12px;line-height:1.5;">El comprador le pagará directamente al beneficiario.</p>
        <label style="font-size:.78rem;font-weight:700;color:#555;display:block;margin-bottom:6px;">Beneficiario destino</label>
        <select id="donar-ben-select" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #ddd;border-radius:10px;font-size:.88rem;background:#fff;margin-bottom:16px;outline:none;">
          <option value="">Cargando beneficiarios…</option>
        </select>
        <button id="btn-donar-asignar" style="width:100%;padding:13px;border:none;border-radius:12px;background:linear-gradient(135deg,#f97316,#ef4444);color:#fff;font-weight:800;font-size:.9rem;cursor:pointer;">
          ❤️ Asignar donación
        </button>`}

      </div>
    </div>`;
  document.body.appendChild(modal);

  document.getElementById('btn-close-donar').onclick = () => modal.remove();
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  const showMsg = (txt, ok) => {
    const el = document.getElementById('donar-msg');
    el.textContent = txt; el.style.display = 'block';
    el.style.background = ok ? '#dcfce7' : '#fee2e2';
    el.style.color = ok ? '#166534' : '#991b1b';
  };

  if (donado) {
    document.getElementById('btn-donar-quitar')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-donar-quitar');
      btn.disabled = true; btn.textContent = 'Quitando…';
      try {
        const data = await apiFetch({ action:'desasignarDonacion', producto_id: String(productoId), vendor_token: vendorSession.token });
        if (data.ok) { showMsg('✅ Donación removida', true); window.invalidateVendorProductsCache(); loadMyProducts(true); setTimeout(() => modal.remove(), 1400); }
        else { showMsg('⚠️ ' + (data.error||'Error'), false); btn.disabled = false; btn.textContent = 'Quitar donación'; }
      } catch(e) { showMsg('⚠️ Error de conexión', false); btn.disabled = false; btn.textContent = 'Quitar donación'; }
    });
  } else {
    const selEl = document.getElementById('donar-ben-select');
   const cargarBeneficiarios = async () => {
  window.debugPanel.log('DEBUG 1', 'Entró a cargarBeneficiarios()');

  selEl.innerHTML = '<option value="">Cargando beneficiarios…</option>';
  try {
    window.debugPanel.log('DEBUG 2', 'Antes de llamar apiFetch()');

const benData = await window.apiFetch({ action:'obtenerBeneficiariosAprobados' }, 'GET');
    window.debugPanel.log('DEBUG 3 - respuesta apiFetch', JSON.stringify(benData, null, 2));

    if (!benData.ok) {
      window.debugPanel.log('DEBUG 4', 'benData.ok = false');
      selEl.innerHTML = '<option value="">⚠️ No se pudo cargar — toca para reintentar</option>';
      return;
    }

    const beneficiarios = benData.beneficiarios || [];
    window.debugPanel.log('DEBUG 5 - cantidad beneficiarios', String(beneficiarios.length));

    if (beneficiarios.length === 0) {
      selEl.innerHTML = '<option value="">No hay beneficiarios aprobados aún</option>';
    } else {
      selEl.innerHTML =
        '<option value="">— Seleccionar beneficiario —</option>' +
        beneficiarios.map(b =>
          `<option value="${esc(b.id)}">${esc(b.nombre)}${b.organizacion ? ' — ' + esc(b.organizacion) : ''}</option>`
        ).join('');
      window.debugPanel.log('DEBUG 6', 'Select llenado correctamente');
    }
  } catch (e) {
    window.debugPanel.log('DEBUG ERROR', String(e && e.message ? e.message : e));
    selEl.innerHTML = '<option value="">⚠️ Error de conexión — toca para reintentar</option>';
  }
};
    await cargarBeneficiarios();

    document.getElementById('btn-donar-asignar')?.addEventListener('click', async () => {
      const benId = document.getElementById('donar-ben-select').value;
      if (!benId) return showMsg('Selecciona un beneficiario.', false);
      const btn = document.getElementById('btn-donar-asignar');
      btn.disabled = true; btn.textContent = 'Guardando…';
      try {
        const payload = { action:'asignarDonacion', producto_id: String(productoId), beneficiario_id: benId, vendor_token: vendorSession.token };
        window.debugPanel && window.debugPanel.log('DEBUG PAYLOAD', JSON.stringify(payload));
        const data = await apiFetch(payload);
        if (data.ok) { showMsg('✅ Donación asignada correctamente', true); window.invalidateVendorProductsCache(); loadMyProducts(true); setTimeout(() => modal.remove(), 1400); }
        else { showMsg('⚠️ ' + (data.error||'Error'), false); btn.disabled = false; btn.textContent = '❤️ Asignar donación'; }
      } catch(e) {
        window.debugPanel && window.debugPanel.log('DEBUG ERROR', e.message || String(e));
        showMsg('⚠️ Error de conexión: ' + (e.message||''), false);
        btn.disabled = false; btn.textContent = '❤️ Asignar donación';
      }
    });
  }
};

// ── "Gestionar donaciones" desde ajustes ──────────────────────
window.openGestionarDonacionesModal = async function() {
  const esc = s => String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const old = document.getElementById('modal-gestionar-donaciones');
  if (old) old.remove();
  const modal = document.createElement('div');
  modal.id = 'modal-gestionar-donaciones';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:flex-end;justify-content:center;';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:20px 20px 0 0;width:100%;max-width:480px;max-height:88vh;overflow-y:auto;padding:0 0 32px;">
      <div style="position:sticky;top:0;background:#fff;z-index:1;padding:16px 20px 12px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between;">
        <h2 style="margin:0;font-size:1rem;font-weight:800;">❤️ Gestionar donaciones</h2>
        <button id="btn-close-gestionar" style="background:none;border:none;font-size:22px;cursor:pointer;color:#888;line-height:1;">×</button>
      </div>
      <div id="gestionar-lista" style="padding:32px 20px;text-align:center;color:#aaa;">Actualizando productos…</div>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById('btn-close-gestionar').onclick = () => modal.remove();
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  const uid = vendorSession?.uid;
  const cached = uid ? window.getVendorProductsCache(uid) : null;
  if (cached) {
    window._vendorProducts = cached;
  } else {
    try { await loadMyProducts(); } catch(e) { /* usa lo que haya */ }
  }

  const productos = window._vendorProducts || [];
  const lista = document.getElementById('gestionar-lista');
  if (!lista) return;

  lista.style.padding = '14px 20px 0';
  lista.style.textAlign = '';
  lista.innerHTML = `
        <p style="font-size:.78rem;color:#888;margin:0 0 12px;line-height:1.5;">Toca ❤️ en cualquier producto para asignar o quitar una donación.</p>
        <div>
          ${productos.length === 0
            ? '<p style="color:#aaa;text-align:center;padding:24px 0;">No tienes productos en Comunidad.<br><small>Publica uno primero desde el formulario.</small></p>'
            : productos.map(p => {
                const donado = p.donado === true || p.donado === 'TRUE' || p.donado === 'true';
                const imgUrl = p.imagen1 ? (typeof optimizeDriveUrl === 'function' ? optimizeDriveUrl(p.imagen1, 48) : p.imagen1) : '';
                return `<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #f5f5f5;">
                  ${imgUrl ? `<img src="${esc(imgUrl)}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{style:'width:44px;height:44px;background:#f5f5f8;border-radius:8px;flex-shrink:0;'}))" style="width:44px;height:44px;object-fit:cover;border-radius:8px;flex-shrink:0;">` : `<div style="width:44px;height:44px;background:#f5f5f8;border-radius:8px;flex-shrink:0;"></div>`}
                  <div style="flex:1;min-width:0;">
                    <div style="font-size:.83rem;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(p.nombre||'')}</div>
                    <div style="font-size:.72rem;color:#888;">$${Number(p.precio||0).toLocaleString()} · Stock: ${p.stock||0}</div>
                    ${donado ? '<div style="font-size:.7rem;color:#f97316;margin-top:1px;">❤️ Donando</div>' : '<div style="font-size:.7rem;color:#bbb;margin-top:1px;">Sin asignar</div>'}
                  </div>
                  <button onclick="document.getElementById('modal-gestionar-donaciones').remove();openDonarProductosModal(${p.id})"
                    style="flex-shrink:0;width:36px;height:36px;border-radius:50%;border:none;
                    background:${donado ? 'linear-gradient(135deg,#f97316,#ef4444)' : '#f5f5f8'};
                    color:${donado ? '#fff' : '#aaa'};font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;">
                    ❤️
                  </button>
                </div>`;
              }).join('')
          }
        </div>`;
};

// ── Modal: entregas de mis transmisiones en vivo ─────────────
window.openEntregasLiveModal = async function() {
  const esc = s => String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const old = document.getElementById('modal-entregas-live');
  if (old) old.remove();
  const modal = document.createElement('div');
  modal.id = 'modal-entregas-live';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:flex-end;justify-content:center;';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:20px 20px 0 0;width:100%;max-width:480px;max-height:88vh;overflow-y:auto;padding:0 0 32px;">
      <div style="position:sticky;top:0;background:#fff;z-index:1;padding:16px 20px 12px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between;">
        <h2 style="margin:0;font-size:1rem;font-weight:800;">📦 Entregas de tus transmisiones</h2>
        <button id="btn-close-entregas-live" style="background:none;border:none;font-size:22px;cursor:pointer;color:#888;line-height:1;">×</button>
      </div>
      <div id="entregas-live-lista" style="padding:32px 20px;text-align:center;color:#aaa;">Cargando…</div>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById('btn-close-entregas-live').onclick = () => modal.remove();
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  const lista = document.getElementById('entregas-live-lista');
  if (!vendorSession) { lista.textContent = 'Inicia sesión para ver tus entregas.'; return; }

  try {
    const resp = await apiFetch({ action: 'obtenerMisEntregasLive', vendorToken: vendorSession.token }, 'GET');
    if (!resp.ok) { lista.textContent = 'Error: ' + (resp.error || 'no se pudo cargar'); return; }

    const lives = resp.lives || [];
    if (lives.length === 0) {
      lista.innerHTML = '<p style="color:#aaa;text-align:center;padding:12px 0;">Aún no has cerrado ninguna transmisión con ventas.<br><small>Al finalizar un live con productos vendidos, aparecerá aquí.</small></p>';
      return;
    }

    lista.style.padding = '14px 20px 0';
    lista.style.textAlign = '';
    lista.innerHTML = lives.map(l => {
      const total = l.grupos.length;
      const entregados = l.grupos.filter(g => g.estado === 'entregado').length;
      const url = `entregas-live.html?id=${encodeURIComponent(l.liveId)}`;
      const pct = total ? Math.round((entregados / total) * 100) : 0;
      return `<div style="padding:12px 0;border-bottom:1px solid #f5f5f5;">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">
          <strong style="font-size:.87rem;">${esc(l.liveTitulo || 'Transmisión')}</strong>
          <span style="font-size:.7rem;color:#aaa;white-space:nowrap;">${new Date(l.fecha).toLocaleDateString('es-MX')}</span>
        </div>
        <div style="font-size:.78rem;color:#888;margin:4px 0 8px;">${entregados}/${total} entregado(s) · ${pct}%</div>
        <a href="${esc(url)}" target="_blank" rel="noopener"
          style="display:inline-block;padding:8px 14px;border-radius:8px;background:#fff7ed;border:1.5px solid #fb923c;color:#c2410c;font-size:.8rem;font-weight:700;text-decoration:none;">
          Ver / actualizar entregas →
        </a>
      </div>`;
    }).join('');
  } catch (err) {
    lista.textContent = 'Error de conexión al cargar tus entregas.';
  }
};

// ── Busca el registro completo de beneficiario que corresponde a este vendedor,
// cruzando por teléfono contra la lista pública de beneficiarios aprobados.
// (No existe todavía un endpoint "obtenerMiBeneficiario"; esto evita depender
// de uno nuevo. Si el teléfono del vendedor cambió después de registrarse como
// beneficiario, el cruce puede fallar — en ese caso solo se ve el aviso genérico.)
async function buscarMiPerfilBeneficiario() {
  try {
    const res = await fetch(window.API_URL + '?' + new URLSearchParams({ action: 'obtenerBeneficiariosAprobados' }));
    const data = await res.json();
    if (!data.ok) return null;
    const miTel = String(vendorSession.telefono || '').replace(/\D/g, '');
    if (!miTel) return null;
    return (data.beneficiarios || []).find(b => String(b.telefono || '').replace(/\D/g, '') === miTel) || null;
  } catch (e) { return null; }
}

// ── Panel de beneficiario: perfil propio + donaciones recibidas ──
async function loadBeneficiarioDonaciones() {
  const area = document.getElementById('settings-donaciones-recibidas-area');
  if (!area || !vendorSession) return;
  const esc = s => String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  try {
    const data = await apiFetch({ action:'obtenerDonacionesRecibidas', vendor_uid: vendorSession.uid }, 'GET');
    if (!data.ok || !data.esBeneficiario) { area.style.display = 'none'; return; }
    const dons = data.donaciones || [];
    area.style.display = 'block';

    // Perfil de beneficiario (nombre, historia, cuenta, fotos)
    const miBen = await buscarMiPerfilBeneficiario();
    const perfilHtml = miBen ? `
      <div style="margin-top:12px;padding:12px;background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;">
        <p style="margin:0 0 6px;font-size:.78rem;font-weight:800;color:#c2410c;">❤️ Tu perfil de fundación</p>
        ${[miBen.imagen1, miBen.imagen2, miBen.imagen3].filter(Boolean).length
          ? `<div style="display:flex;gap:6px;overflow-x:auto;margin-bottom:8px;">${[miBen.imagen1, miBen.imagen2, miBen.imagen3].filter(Boolean).map(u=>`<img src="${esc(u)}" style="height:64px;border-radius:8px;object-fit:cover;flex-shrink:0;">`).join('')}</div>`
          : ''}
        <div style="font-size:.85rem;font-weight:700;">${esc(miBen.nombre)}</div>
        ${miBen.organizacion ? `<div style="font-size:.75rem;color:#888;margin-bottom:4px;">${esc(miBen.organizacion)}</div>` : ''}
        ${miBen.ubicacion ? `<div style="font-size:.75rem;color:#555;margin:2px 0;">📍 ${esc(miBen.ubicacion)}</div>` : ''}
        ${miBen.historia ? `<div style="font-size:.78rem;color:#555;margin:6px 0;line-height:1.5;">${esc(miBen.historia)}</div>` : ''}
        ${miBen.cuenta_bancaria ? `<div style="font-size:.78rem;font-family:monospace;background:#fff;border-radius:8px;padding:6px 8px;margin-top:4px;">💳 ${esc(miBen.cuenta_bancaria)}</div>` : ''}
        <div style="display:flex;gap:8px;margin-top:10px;">
          <button id="btn-editar-fundacion" style="flex:1;padding:8px;border-radius:9px;border:1.5px solid #f97316;background:#fff;color:#c2410c;font-weight:700;font-size:.78rem;cursor:pointer;">✏️ Editar información</button>
          <button id="btn-eliminar-fundacion" style="flex:1;padding:8px;border-radius:9px;border:1.5px solid #ef4444;background:#fff;color:#dc2626;font-weight:700;font-size:.78rem;cursor:pointer;">🗑️ Eliminar</button>
        </div>
        <div id="fundacion-accion-msg" style="display:none;margin-top:8px;padding:8px;border-radius:8px;font-size:.76rem;"></div>
        <p style="margin:8px 0 0;font-size:.7rem;color:#a16207;">Los cambios y la eliminación pasan por revisión del administrador antes de aplicarse.</p>
      </div>`
      : `<div style="margin-top:12px;padding:10px;background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;">
          <p style="margin:0;font-size:.78rem;color:#c2410c;">❤️ Estás registrado como fundación, pero no pudimos cargar el detalle completo de tu perfil ahora mismo.</p>
        </div>`;

    area.innerHTML = perfilHtml + `<div style="margin-top:12px;padding-top:12px;border-top:1px solid #f5f5f5;">
      <p style="margin:0 0 8px;font-size:.78rem;font-weight:800;color:#f97316;">Donaciones que recibes (${dons.length})</p>
      ${dons.length === 0
        ? '<p style="color:#aaa;font-size:.78rem;text-align:center;padding:6px 0;">Aún no hay donaciones activas para ti.</p>'
        : dons.map(d => `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid #f5f5f8;">
            ${d.producto_imagen ? `<img src="${esc(d.producto_imagen)}" alt="" style="width:36px;height:36px;object-fit:cover;border-radius:8px;flex-shrink:0;">` : `<div style="width:36px;height:36px;background:#f0f0f5;border-radius:8px;flex-shrink:0;"></div>`}
            <div style="flex:1;min-width:0;">
              <div style="font-size:.8rem;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(d.producto_nombre||d.producto_id)}</div>
              <div style="font-size:.72rem;color:#888;">De: ${esc(d.vendedor_nombre)}</div>
            </div>
            <span style="font-size:.7rem;padding:2px 7px;border-radius:20px;background:#dcfce7;color:#166534;font-weight:700;flex-shrink:0;">Activa</span>
          </div>`).join('')}
    </div>`;
    if (miBen) {
      document.getElementById('btn-editar-fundacion')?.addEventListener('click', () => abrirEditarFundacionVendedor(miBen));
      document.getElementById('btn-eliminar-fundacion')?.addEventListener('click', () => solicitarEliminarFundacionVendedor(miBen));
    }
  } catch(e) { area.style.display = 'none'; }
}

// ── Modal compacto para solicitar edición del perfil de beneficiario ──
function abrirEditarFundacionVendedor(miBen) {
  const old = document.getElementById('modal-editar-fundacion');
  if (old) old.remove();
  const esc = s => String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const escv = s => String(s||'').replace(/"/g,'&quot;');
  const modal = document.createElement('div');
  modal.id = 'modal-editar-fundacion';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:flex-end;justify-content:center;';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:20px 20px 0 0;width:100%;max-height:90%;overflow-y:auto;padding:24px 20px 36px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <h2 style="margin:0;font-size:1rem;font-weight:800;">Editar tu fundación</h2>
        <button id="btn-close-edit-fund" style="background:none;border:none;font-size:22px;cursor:pointer;line-height:1;">×</button>
      </div>
      <p style="font-size:.8rem;color:#888;margin:0 0 14px;">Estos cambios se enviarán como solicitud. El administrador comparará tu información actual con la nueva antes de aplicarla.</p>
      <div id="edit-fund-msg" style="display:none;padding:10px;border-radius:10px;margin-bottom:12px;font-size:.82rem;"></div>
      <label style="font-size:.78rem;font-weight:700;color:#888;display:block;margin-bottom:3px;">Nombre completo *</label>
      <input id="ef-nombre" type="text" value="${escv(miBen.nombre)}" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:10px;margin-bottom:10px;font-size:.88rem;">
      <label style="font-size:.78rem;font-weight:700;color:#888;display:block;margin-bottom:3px;">Organización (opcional)</label>
      <input id="ef-org" type="text" value="${escv(miBen.organizacion)}" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:10px;margin-bottom:10px;font-size:.88rem;">
      <label style="font-size:.78rem;font-weight:700;color:#888;display:block;margin-bottom:3px;">Ciudad / Estado *</label>
      <input id="ef-ubicacion" type="text" value="${escv(miBen.ubicacion)}" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:10px;margin-bottom:10px;font-size:.88rem;">
      <label style="font-size:.78rem;font-weight:700;color:#888;display:block;margin-bottom:3px;">Facebook (URL o usuario)</label>
      <input id="ef-facebook" type="text" value="${escv(miBen.facebook)}" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:10px;margin-bottom:10px;font-size:.88rem;">
      <label style="font-size:.78rem;font-weight:700;color:#888;display:block;margin-bottom:3px;">¿Para qué necesitas las donaciones? *</label>
      <textarea id="ef-historia" rows="3" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:10px;margin-bottom:10px;font-size:.88rem;resize:vertical;">${esc(miBen.historia)}</textarea>
      <label style="font-size:.78rem;font-weight:700;color:#888;display:block;margin-bottom:3px;">CLABE / Número de cuenta *</label>
      <input id="ef-cuenta" type="text" value="${escv(miBen.cuenta_bancaria)}" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:10px;margin-bottom:10px;font-size:.88rem;">
      <label style="font-size:.78rem;font-weight:700;color:#888;display:block;margin-bottom:3px;">WhatsApp (10 dígitos) *</label>
      <input id="ef-telefono" type="tel" value="${escv(miBen.telefono)}" maxlength="10" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:10px;margin-bottom:16px;font-size:.88rem;">
      <label style="font-size:.78rem;font-weight:700;color:#888;display:block;margin-bottom:3px;">Fotos (opcional, máx. 3)</label>
      <div style="display:flex;gap:8px;margin-bottom:16px;">
        ${[1,2,3].map(n => `
        <label style="flex:1;aspect-ratio:1;border:1.5px dashed #e0e0e0;border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;overflow:hidden;background:#fafafa;">
          <span id="ef-img-placeholder-${n}" style="font-size:1.4rem;display:${miBen['imagen'+n] ? 'none' : ''};">📷</span>
          <img id="ef-img-preview-${n}" src="${escv(miBen['imagen'+n]||'')}" style="display:${miBen['imagen'+n]?'block':'none'};width:100%;height:100%;object-fit:cover;">
          <input type="file" id="ef-img-${n}" accept="image/*" style="display:none;">
        </label>`).join('')}
      </div>
      <button id="btn-submit-edit-fund" style="width:100%;padding:13px;border:none;border-radius:12px;background:linear-gradient(135deg,#f97316,#ef4444);color:#fff;font-weight:800;font-size:.92rem;cursor:pointer;">Enviar cambios</button>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById('btn-close-edit-fund').onclick = () => modal.remove();
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  [1,2,3].forEach(n => {
    document.getElementById('ef-img-' + n)?.addEventListener('change', function() {
      const file = this.files && this.files[0];
      if (!file) return;
      const preview = document.getElementById('ef-img-preview-' + n);
      const placeholder = document.getElementById('ef-img-placeholder-' + n);
      const url = URL.createObjectURL(file);
      preview.src = url; preview.style.display = 'block';
      if (placeholder) placeholder.style.display = 'none';
    });
  });

  document.getElementById('btn-submit-edit-fund').addEventListener('click', async function() {
    const showMsg = (txt, ok) => {
      const el = document.getElementById('edit-fund-msg');
      el.textContent = txt; el.style.display = 'block';
      el.style.background = ok ? '#dcfce7' : '#fee2e2';
      el.style.color = ok ? '#166534' : '#991b1b';
    };
    const nombre = document.getElementById('ef-nombre').value.trim();
    const ubicacion = document.getElementById('ef-ubicacion').value.trim();
    const historia = document.getElementById('ef-historia').value.trim();
    const cuenta = document.getElementById('ef-cuenta').value.trim();
    const tel = document.getElementById('ef-telefono').value.replace(/\D/g,'');
    if (!nombre) return showMsg('El nombre es requerido.', false);
    if (!ubicacion) return showMsg('La ciudad/estado es requerida.', false);
    if (!historia) return showMsg('Cuéntanos tu propósito.', false);
    if (!cuenta) return showMsg('La cuenta bancaria es requerida.', false);
    if (tel.length !== 10) return showMsg('El WhatsApp debe tener 10 dígitos.', false);

    const btn = this;
    btn.disabled = true; btn.textContent = 'Enviando…';
    try {
      async function uploadImg(file) {
        const reader = new FileReader();
        const base64 = await new Promise((res, rej) => {
          reader.onload = () => res(reader.result.split(',')[1]);
          reader.onerror = rej;
          reader.readAsDataURL(file);
        });
        const r = await fetch(window.API_URL, {
          method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ action:'uploadImageVendedor', data: base64, mimeType: file.type, fileName: file.name, vendorToken: vendorSession.token }).toString()
        });
        const j = await r.json();
        if (!j.ok) throw new Error(j.error || 'Error al subir imagen');
        return j.url || '';
      }
      const imgUrls = [miBen.imagen1||'', miBen.imagen2||'', miBen.imagen3||''];
      for (let n = 1; n <= 3; n++) {
        const fileInput = document.getElementById('ef-img-' + n);
        if (fileInput && fileInput.files[0]) {
          btn.textContent = `Subiendo foto ${n}…`;
          imgUrls[n-1] = await uploadImg(fileInput.files[0]);
        }
      }
      btn.textContent = 'Enviando cambios…';
      const res = await fetch(window.API_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'solicitarEdicionBeneficiario',
          id_beneficiario: miBen.id,
          vendorToken: vendorSession.token,
          nombre, organizacion: document.getElementById('ef-org').value.trim(),
          ubicacion, facebook: document.getElementById('ef-facebook').value.trim(),
          historia, cuenta_bancaria: cuenta, telefono: tel,
          imagen1: imgUrls[0], imagen2: imgUrls[1], imagen3: imgUrls[2]
        }).toString()
      });
      const data = await res.json();
      if (data.ok) {
        showMsg('✅ Cambios enviados. El administrador los revisará.', true);
        setTimeout(() => modal.remove(), 2500);
      } else {
        showMsg('⚠️ ' + (data.error || 'Error al enviar'), false);
        btn.disabled = false; btn.textContent = 'Enviar cambios';
      }
    } catch (err) {
      showMsg('⚠️ Error de conexión: ' + err.message, false);
      btn.disabled = false; btn.textContent = 'Enviar cambios';
    }
  });
}

// ── Solicitar eliminación de la fundación (requiere aprobación del admin) ──
async function solicitarEliminarFundacionVendedor(miBen) {
  if (!confirm('¿Seguro que quieres solicitar la eliminación de tu fundación "' + (miBen.nombre||'') + '"? El administrador revisará tu solicitud antes de eliminarla.')) return;
  const msgEl = document.getElementById('fundacion-accion-msg');
  const showMsg = (txt, ok) => {
    if (!msgEl) return;
    msgEl.textContent = txt; msgEl.style.display = 'block';
    msgEl.style.background = ok ? '#dcfce7' : '#fee2e2';
    msgEl.style.color = ok ? '#166534' : '#991b1b';
  };
  try {
    const res = await fetch(window.API_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ action:'solicitarEliminacionBeneficiario', id_beneficiario: miBen.id, vendorToken: vendorSession.token }).toString()
    });
    const data = await res.json();
    if (data.ok) showMsg('✅ Solicitud de eliminación enviada. El administrador la revisará.', true);
    else showMsg('⚠️ ' + (data.error || 'Error al enviar'), false);
  } catch (e) {
    showMsg('⚠️ Error de conexión.', false);
  }
}

})(); // fin IIFE
