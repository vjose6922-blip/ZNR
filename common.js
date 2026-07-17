// Nota: el sprite de iconos SVG (#ic-*) ya no vive aquí.
// Se movió a icons.js — cárgalo en el HTML ANTES que common.js:
//   <script src="icons.js" defer></script>
//   <script src="common.js" defer></script>


const CACHE_KEY = 'zr_products_cache';
const CACHE_EXPIRY = 5 * 60 * 1000;
const RECENT_PRODUCTS_KEY = 'zr_recent_products';
const MAX_RECENT_PRODUCTS = 12;
const UP_KEY  = 'zr_user_prefs_v1';
const ORDERS_KEY  = 'zr_orders_history';
let localCart = {};
let imageObserver = null;
let activeModal = null;
let connectionBanner = null;
let isOnline = navigator.onLine;
let productsByCategoryMap = null;
let allProductsIndexed = [];
let lastPhoneDisplayed = null;
function buildProductIndex(products) {
if (!products || products.length === 0) return;
allProductsIndexed = products;
productsByCategoryMap = new Map();
productsByCategoryMap.set('TODOS', products);
products.forEach(product => {
const category = product.Categoria;
if (!category) return;
if (!productsByCategoryMap.has(category)) {
productsByCategoryMap.set(category, []);
}
productsByCategoryMap.get(category).push(product);
});
}
function getProductsByCategoryIndexed(category) {
if (!category || category === '') return allProductsIndexed;
return productsByCategoryMap?.get(category) || [];
}



// ── Filtros globales (categorías y tallas) ──
window.globalCategories = [];
window.globalSizes = [];
const FILTER_OPTIONS_CACHE_KEY = 'zr_filter_options_cache';
const FILTER_OPTIONS_TTL = 60 * 60 * 1000; // 1 hora

async function fetchFilterOptions(force = false) {
  // 1. Intentar cargar desde localStorage (para modo offline y velocidad)
  if (!force) {
    try {
      const cached = localStorage.getItem(FILTER_OPTIONS_CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        // Validar que tenga timestamp y no esté expirado
        if (data.timestamp && (Date.now() - data.timestamp) < FILTER_OPTIONS_TTL) {
          window.globalCategories = data.categories || [];
          window.globalSizes = data.sizes || [];
          // Llenar los selects si ya existen en el DOM
          populateFilterSelects();
          return;
        }
      }
    } catch (e) {}
  }

  // 2. Si no hay caché o expiró, pedir al backend
  try {
    const url = new URL(API_URL);
    url.searchParams.set('action', 'getFilterOptions');
    const res = await fetch(url.toString());
    const data = await res.json();
    if (data.ok) {
      window.globalCategories = data.categories || [];
      window.globalSizes = data.sizes || [];
      // Guardar en localStorage con timestamp
      try {
        localStorage.setItem(FILTER_OPTIONS_CACHE_KEY, JSON.stringify({
          categories: window.globalCategories,
          sizes: window.globalSizes,
          timestamp: Date.now()
        }));
      } catch (e) {}
      populateFilterSelects();
    } else {
      console.warn('Error al obtener filtros:', data.error);
    }
  } catch (err) {
    console.warn('Error fetching filter options:', err);
    // Si falla la red y tenemos caché aunque sea vieja, la usamos
    try {
      const cached = localStorage.getItem(FILTER_OPTIONS_CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        window.globalCategories = data.categories || [];
        window.globalSizes = data.sizes || [];
        populateFilterSelects();
      }
    } catch (_) {}
  }
}

function populateFilterSelects() {
  populateCategoryFilterGlobal();
  populateSizeFilterGlobal();
}

function populateCategoryFilterGlobal() {
  const select = document.getElementById("category-filter");
  if (!select) return;
  const currentVal = select.value;
  // Solo reconstruir si hay datos globales
  if (window.globalCategories.length === 0) return;
  
  select.innerHTML = '<option value="">Categorías</option>';
  window.globalCategories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });
  // Restaurar selección si el valor sigue existiendo
  if (currentVal && window.globalCategories.includes(currentVal)) {
    select.value = currentVal;
  } else {
    select.value = "";
  }
}

function populateSizeFilterGlobal() {
  const select = document.getElementById("size-filter");
  if (!select) return;
  const currentVal = select.value;
  if (window.globalSizes.length === 0) return;
  
  select.innerHTML = '<option value="">Tallas</option>';
  window.globalSizes.forEach(sz => {
    const opt = document.createElement("option");
    opt.value = sz;
    opt.textContent = sz;
    select.appendChild(opt);
  });
  if (currentVal && window.globalSizes.includes(currentVal)) {
    select.value = currentVal;
  } else {
    select.value = "";
  }
}

// Exponer funciones al ámbito global
window.fetchFilterOptions = fetchFilterOptions;
window.populateFilterSelects = populateFilterSelects;

















function clearProductIndex() {
productsByCategoryMap = null;
allProductsIndexed = [];
}
function showLoader(text = "Cargando...") {
let loader = document.getElementById("global-loader");
if (!loader) {
loader = document.createElement("div");
loader.id = "global-loader";
loader.className = "global-loader";
loader.innerHTML = `<div class="loader-spinner"></div><div class="loader-text">${text}</div>`;
document.body.appendChild(loader);
} else {
const txt = loader.querySelector(".loader-text");
if (txt) txt.textContent = text;
loader.classList.remove("hidden");
}
}
function hideLoader() {
const loader = document.getElementById("global-loader");
if (loader) loader.classList.add("hidden");
}

// Feedback de carga POR BOTÓN (no bloquea toda la pantalla), para acciones
// puntuales como "Aprobar", "Enviar calificación", "Guardar", etc.
// Guarda el contenido original del botón, muestra spinner + texto opcional,
// deshabilita el botón, corre el async fn, y SIEMPRE restaura el estado
// (incluso si el propio fn ya quitó el botón del DOM).
async function withButtonLoading(btn, asyncFn, loadingText) {
  if (!btn) return asyncFn();
  const prevHTML = btn.innerHTML;
  const prevDisabled = btn.disabled;
  btn.dataset.loading = "true";
  btn.disabled = true;
  btn.innerHTML = `<span class="btn-inline-spinner"></span>${loadingText || btn.textContent.trim()}`;
  try {
    return await asyncFn();
  } finally {
    // Si el botón sigue en el DOM (la acción no lo removió/reemplazó su
    // contenedor), lo regresamos a su estado original.
    if (document.body.contains(btn)) {
      btn.innerHTML = prevHTML;
      btn.disabled = prevDisabled;
      delete btn.dataset.loading;
    }
  }
}
window.withButtonLoading = withButtonLoading;
const TOAST_ICON_BY_TYPE = { success: 'check', error: 'x', warning: 'error', info: 'bell' };
function showTemporaryMessage(text, type = "info") {
const existing = document.querySelector('.temporary-message');
if (existing) existing.remove();
const messageDiv = document.createElement("div");
messageDiv.className = `temporary-message ${type}`;
const iconName = TOAST_ICON_BY_TYPE[type] || 'bell';
messageDiv.innerHTML = (typeof Icon === 'function' ? Icon(iconName) : '') + ' <span></span>';
messageDiv.querySelector('span').textContent = text;
document.body.appendChild(messageDiv);
setTimeout(() => {
messageDiv.style.animation = "slideDown 0.3s ease";
setTimeout(() => messageDiv.remove(), 300);
}, 3000);
}
function closeCurrentModal() {
if (activeModal) {
activeModal.classList.add("closing");
setTimeout(() => {
if (activeModal && activeModal.parentNode) activeModal.remove();
activeModal = null;
}, 150);
}
}
function showCustomAlert(options) {
const { title, message, icon = "", confirmText = "Aceptar", onConfirm } = options;
const modal = document.createElement("div");
modal.className = "custom-alert-modal";
modal.innerHTML = `
<div class="custom-alert-content">
<div class="custom-alert-header"><span class="custom-alert-icon">${icon ? Icon(icon, {size:22}) : ''}</span><h3>${escapeHtml(title)}</h3></div>
<div class="custom-alert-body"><p>${escapeHtml(message)}</p></div>
<div class="custom-alert-footer"><button class="custom-alert-btn confirm"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-check"/></svg> ${escapeHtml(confirmText)}</button></div>
</div>
`;
document.body.appendChild(modal);
activeModal = modal;
const confirmBtn = modal.querySelector(".custom-alert-btn.confirm");
const close = () => {
if (!modal.parentNode) return;
modal.classList.add("closing");
setTimeout(() => { if (modal.parentNode) modal.remove(); if (activeModal === modal) activeModal = null; if (onConfirm) onConfirm(); }, 150);
};
confirmBtn.addEventListener("click", close);
modal.addEventListener("click", (e) => { if (e.target === modal && !modal.classList.contains("closing")) close(); });
}
function showCustomConfirm(options) {
const { title, message, icon = "", confirmText = "Aceptar", cancelText = "Cancelar", onConfirm, onCancel } = options;
const modal = document.createElement("div");
modal.className = "custom-alert-modal";
modal.innerHTML = `
<div class="custom-alert-content">
<div class="custom-alert-header"><span class="custom-alert-icon">${icon ? Icon(icon, {size:22}) : ''}</span><h3>${escapeHtml(title)}</h3></div>
<div class="custom-alert-body"><p>${escapeHtml(message)}</p></div>
<div class="custom-alert-footer">
<button class="custom-alert-btn cancel"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-x"/></svg> ${escapeHtml(cancelText)}</button>
<button class="custom-alert-btn confirm"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-check"/></svg> ${escapeHtml(confirmText)}</button>
</div>
</div>
`;
document.body.appendChild(modal);
activeModal = modal;
const confirmBtn = modal.querySelector(".custom-alert-btn.confirm");
const cancelBtn = modal.querySelector(".custom-alert-btn.cancel");
const close = (callback) => {
if (!modal.parentNode) return;
modal.classList.add("closing");
setTimeout(() => { if (modal.parentNode) modal.remove(); if (activeModal === modal) activeModal = null; if (callback) callback(); }, 150);
};
confirmBtn.addEventListener("click", () => close(onConfirm));
cancelBtn.addEventListener("click", () => close(onCancel));
modal.addEventListener("click", (e) => { if (e.target === modal && !modal.classList.contains("closing")) close(onCancel); });
}
function showCustomPrompt(options) {
const { title, message, icon = "", defaultValue = "", confirmText = "Aceptar", cancelText = "Cancelar", onConfirm, onCancel } = options;
const modal = document.createElement("div");
modal.className = "custom-alert-modal";
modal.innerHTML = `
<div class="custom-alert-content">
<div class="custom-alert-header"><span class="custom-alert-icon">${icon ? Icon(icon, {size:22}) : ''}</span><h3>${escapeHtml(title)}</h3></div>
<div class="custom-alert-body">
<p>${escapeHtml(message)}</p>
<input type="text" class="custom-alert-input" id="custom-prompt-input" value="${escapeHtml(defaultValue)}" autocomplete="off">
</div>
<div class="custom-alert-footer">
<button class="custom-alert-btn cancel"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-x"/></svg> ${escapeHtml(cancelText)}</button>
<button class="custom-alert-btn confirm"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-check"/></svg> ${escapeHtml(confirmText)}</button>
</div>
</div>
`;
document.body.appendChild(modal);
activeModal = modal;
const input = modal.querySelector("#custom-prompt-input");
const confirmBtn = modal.querySelector(".custom-alert-btn.confirm");
const cancelBtn = modal.querySelector(".custom-alert-btn.cancel");
setTimeout(() => input.focus(), 100);
const close = (callback, value = null) => {
if (!modal.parentNode) return;
modal.classList.add("closing");
setTimeout(() => { if (modal.parentNode) modal.remove(); if (activeModal === modal) activeModal = null; if (callback) callback(value); }, 150);
};
confirmBtn.addEventListener("click", () => close(onConfirm, input.value));
cancelBtn.addEventListener("click", () => close(onCancel, null));
input.addEventListener("keypress", (e) => { if (e.key === "Enter") { e.preventDefault(); close(onConfirm, input.value); } });
modal.addEventListener("click", (e) => { if (e.target === modal && !modal.classList.contains("closing")) close(onCancel, null); });
}
if (!window.alertIntercepted) {
window.originalAlert = window.alert;
window.alert = function(message) { return new Promise((resolve) => { closeCurrentModal(); showCustomAlert({ title: "Aviso", message: String(message), icon: "", confirmText: "Aceptar", onConfirm: () => resolve() }); }); };
window.originalConfirm = window.confirm;
window.confirm = function(message) { return new Promise((resolve) => { closeCurrentModal(); showCustomConfirm({ title: "Confirmar", message: String(message), icon: "", confirmText: "Aceptar", cancelText: "Cancelar", onConfirm: () => resolve(true), onCancel: () => resolve(false) }); }); };
window.originalPrompt = window.prompt;
window.prompt = function(message, defaultValue = "") { return new Promise((resolve) => { closeCurrentModal(); showCustomPrompt({ title: "Ingresar información", message: String(message), icon: "", defaultValue: defaultValue, confirmText: "Aceptar", cancelText: "Cancelar", onConfirm: (value) => resolve(value), onCancel: () => resolve(null) }); }); };
window.alertIntercepted = true;
}
function getCachedProducts() {
if (window.CacheManager && window.CacheManager.getSessionProductsCache) {
const sessionCached = window.CacheManager.getSessionProductsCache();
if (sessionCached && sessionCached.length > 0) {

return sessionCached;
}
}
try {
const cached = localStorage.getItem(CACHE_KEY);
if (!cached) return null;
const { data, timestamp } = JSON.parse(cached);
if (Date.now() - timestamp >CACHE_EXPIRY) {
localStorage.removeItem(CACHE_KEY);
return null;
}
return data;
} catch { return null; }
}
function setCachedProducts(products) {
if (window.CacheManager && window.CacheManager.setSessionProductsCache) {
window.CacheManager.setSessionProductsCache(products);
}
try {
localStorage.setItem(CACHE_KEY, JSON.stringify({ data: products, timestamp: Date.now() }));
} catch (e) { console.warn("No se pudo guardar en caché:", e); }
}
function formatCurrency(value) {
const num = Number(value) || 0;
return `$${num.toLocaleString("es-MX", { minimumFractionDigits: 0 })}`;
}
function hasFreeShipping(price) {
const numericPrice = Number(price) || 0;
return numericPrice >= 300;
}

function _refreshDeliveryBlock() {
const block  = document.getElementById('cart-delivery-block');
if (!block) return;
const savedAddress  = localStorage.getItem('client_address') || '';
const savedSchedule  = localStorage.getItem('client_schedule') || '';
const addrContainer  = document.getElementById('saved-address-container');
const addrDisplay  = document.getElementById('saved-address-display');
const addBtn  = document.getElementById('cart-add-address-btn');
const statusEl  = document.getElementById('cart-shipping-status');
const subtitleEl  = document.getElementById('cart-delivery-subtitle');
if (addrContainer && addrDisplay) {
if (savedAddress) {
addrDisplay.textContent = savedAddress + (savedSchedule ? ` · ${savedSchedule}` : '');
addrContainer.style.display = '';
if (addBtn) addBtn.style.display = 'none';
} else {
addrContainer.style.display = 'none';
if (addBtn) addBtn.style.display = '';
}
}
const items = Object.values(localCart || {});
const total = items.reduce((s, i) => s + (i.price * i.quantity), 0);
const hasShipping = items.some(i => hasFreeShipping(i.price));
if (statusEl) {
if (items.length === 0) {
statusEl.innerHTML = '';
} else if (hasShipping) {
statusEl.innerHTML = `<div class="cart-shipping-ok">Tu pedido califica para envío a domicilio</div>`;
if (subtitleEl) subtitleEl.textContent = 'Añade tu dirección para la entrega';
} else {
const missing = 300 - total;
if (missing > 0) {
statusEl.innerHTML = `<div class="cart-shipping-hint">Añade <strong>$${missing.toLocaleString()} más</strong> para calificar a envío a domicilio</div>`;
} else {
statusEl.innerHTML = '';
}
if (subtitleEl) subtitleEl.textContent = 'Opcional — para envío a domicilio';
}
}
}
// ── Reintenta una llamada async con backoff. Antes vivía duplicada en
// comunidad.js y home.js; centralizada aquí porque common.js siempre carga
// primero en las páginas que la usan. ────────────────────────────────────
async function fetchWithRetry(fn, maxAttempts = 3, delays = [2000, 5000, 10000]) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts - 1) throw err;
      await new Promise(r => setTimeout(r, delays[attempt]));
    }
  }
}
function escapeHtml(str) {
if (!str) return '';
return String(str)
.replace(/\\/g, '&#x5C;')
.replace(/&/g, '&amp;')
.replace(/</g, '&lt;')
.replace(/>/g, '&gt;')
.replace(/"/g, '&quot;')
.replace(/'/g, '&#39;')
.replace(/`/g, '&#96;')
.replace(/\n/g, '&#10;')
}
function escapeAttr(str) {
if (!str) return '';
return String(str)
.replace(/&/g, '&amp;')
.replace(/</g, '&lt;')
.replace(/>/g, '&gt;')
.replace(/"/g, '&quot;')
.replace(/'/g, '&#39;')
.replace(/`/g, '&#96;')
.replace(/\n/g, '&#10;')
.replace(/\r/g, '&#13;');
}
function safeHtml(strings, ...values) {
return strings.reduce((result, string, i) => {
const value = values[i];
const escaped = typeof value === 'string' ? escapeHtml(value) :
value === null || value === undefined ? '' :
String(value);
return result + string + escaped;
}, '');
}

function optimizeDriveUrl(url, size = 400) {
  if (!url) return "https://placehold.co/400x400/3b1f5f/white?text=Z%26R";
  
  // ✅ Si la URL no es http o data:image, devolver placeholder (evita que se intente cargar un HTML como imagen)
  if (!url.startsWith('http') && !url.startsWith('data:image')) {
    return "https://placehold.co/400x400/3b1f5f/white?text=Z%26R";
  }

  const screenWidth = window.innerWidth;
  let actualSize;
  if (screenWidth < 480) {
    actualSize = 300;
  } else if (screenWidth < 768) {
    actualSize = 400;
  } else if (screenWidth < 1200) {
    actualSize = 600;
  } else {
    actualSize = 800;
  }
  if (size && size < actualSize) {
    actualSize = Math.min(size, 800);
  }

  // Si ya viene en formato lh3.googleusercontent.com
  const lh3Match = url.match(/lh3\.googleusercontent\.com\/d\/([-\w]{25,})/);
  if (lh3Match) {
    return `https://lh3.googleusercontent.com/d/${lh3Match[1]}=w${actualSize}-h${actualSize}-rw`;
  }

  // Cualquier otro link de Drive (ej. /file/d/ o ?id=) → normalizar a lh3
  const match = url.match(/[-\w]{25,}/);
  if (match) {
    const id = match[0];
    return `https://lh3.googleusercontent.com/d/${id}=w${actualSize}-h${actualSize}-rw`;
  }

  // Si no se pudo procesar, devolver la URL original (aunque ya validamos al inicio)
  return url;
}

function generateRequestId() {
return 'REQ_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
}
function updateSavedPhoneDisplay() {
const container = document.getElementById("saved-phone-container");
const display = document.getElementById("saved-phone-display");
const savedPhone = localStorage.getItem("client_phone");
if (container && display) {
if (savedPhone && savedPhone.length === 10) {
const formatted = `${savedPhone.slice(0,2)}-${savedPhone.slice(2,6)}-${savedPhone.slice(6)}`;
if (lastPhoneDisplayed !== formatted) {
display.textContent = formatted;
container.style.display = "block";
container.style.setProperty('display', 'block', 'important');
lastPhoneDisplayed = formatted;
}
} else if (lastPhoneDisplayed !== null) {
container.style.display = "none";
lastPhoneDisplayed = null;
}
}
const addrContainer = document.getElementById("saved-address-container");
const addrDisplay  = document.getElementById("saved-address-display");
const savedAddress  = localStorage.getItem("client_address");
if (addrContainer && addrDisplay) {
if (savedAddress) {
addrDisplay.textContent = savedAddress;
addrContainer.style.display = "block";
} else {
addrContainer.style.display = "none";
}
}
_refreshDeliveryBlock();
}
async function changePhoneNumber() {
const currentPhone = localStorage.getItem("client_phone") || "";
const formattedCurrent = currentPhone && currentPhone.length === 10
? `${currentPhone.slice(0,2)}-${currentPhone.slice(2,6)}-${currentPhone.slice(6)}`
: "no guardado";
const newPhone = await new Promise((resolve) => {
showCustomPrompt({
title: " Cambiar número de teléfono",
message: `Número actual: ${formattedCurrent}\n\nIngresa tu nuevo número (10 dígitos):\nEjemplo: 8671234567\n\n Solo números, sin espacios ni código país.`,
icon: "",
defaultValue: currentPhone || "",
confirmText: "Guardar",
cancelText: "Cancelar",
onConfirm: (value) => resolve(value),
onCancel: () => resolve(null)
});
});
if (newPhone === null) {
return;
}
if (newPhone === "") {
const confirmDelete = await new Promise((resolve) => {
showCustomConfirm({
title: " Eliminar número",
message: "¿Eliminar tu número guardado? Deberás ingresarlo nuevamente en tu próxima compra.",
icon: "",
confirmText: "Sí, eliminar",
cancelText: "Cancelar",
onConfirm: () => resolve(true),
onCancel: () => resolve(false)
});
});
if (confirmDelete) {
localStorage.removeItem("client_phone");
updateSavedPhoneDisplay();
}
return;
}
let cleanPhone = newPhone.replace(/[^0-9]/g, '');
if (cleanPhone.length !== 10) {
showCustomAlert({
title: " Número inválido",
message: "El número debe tener exactamente 10 dígitos.\nEjemplo: 8671234567",
icon: "",
confirmText: "Entendido"
});
return;
}
localStorage.setItem("client_phone", cleanPhone);
updateSavedPhoneDisplay();
if (typeof window.solicitarPermisoNotificacionesSiFalta === 'function') {
  window.solicitarPermisoNotificacionesSiFalta('cliente', cleanPhone);
}
const formatted = `${cleanPhone.slice(0,2)}-${cleanPhone.slice(2,6)}-${cleanPhone.slice(6)}`;
showCustomAlert({
title: " ¡Número actualizado!",
message: `Tu nuevo número es: ${formatted}\n\nSe usará para futuras compras.`,
icon: "",
confirmText: "Aceptar"
});
}
function showPrivacyModal(onAccept) {
let modal = document.getElementById("privacy-modal");
if (!modal) {
modal = document.createElement("div");
modal.id = "privacy-modal";
modal.className = "privacy-modal";
modal.innerHTML = `
<div class="privacy-modal-content">
<div class="privacy-modal-header"><span class="privacy-icon"></span><h2>Aviso de Privacidad</h2></div>
<div class="privacy-modal-body">
<p><strong>Z&R</strong>, con responsabilidad en el tratamiento de sus datos personales, le informa lo siguiente:</p>
<h3>Datos recopilados</h3><p>Para procesar tus compras, recopilamos tu <strong>número de teléfono</strong> (WhatsApp), <strong>dirección de envío</strong> y <strong>horario disponible para entrega</strong>.</p>
<h3>Finalidad</h3><p>Tus datos serán utilizados EXCLUSIVAMENTE para:</p>
<ul><li>Confirmar tu identidad en las solicitudes de compra</li><li>Enviarte el link de pago cuando el administrador confirme tu pedido</li><li>Coordinar la entrega en tu dirección y horario indicados</li><li>Comunicarnos contigo sobre el estado de tu compra</li></ul>
<h3>No compartimos tus datos</h3><p>Tu número, dirección y horario NO serán vendidos, cedidos ni compartidos con terceros. Solo serán visibles para el administrador de Z&R para procesar y entregar tu pedido.</p>
<h3>${Icon('clock')} Conservación</h3><p>Tus datos se conservarán únicamente durante el tiempo necesario para cumplir con las finalidades descritas. Puedes eliminarlos en cualquier momento desde el panel de Preferencias.</p>
<h3>Tus derechos (ARCO)</h3><p>Puedes solicitar la eliminación de tus datos escribiendo a: <strong>znrcomunity@gmail.com</strong></p>
<p class="privacy-date">Última actualización: Abril 2026</p>
</div>
<div class="privacy-modal-footer">
<button id="reject-privacy-btn" class="privacy-btn reject"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-x"/></svg> Rechazar</button>
<button id="accept-privacy-btn" class="privacy-btn accept"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-check"/></svg> Aceptar y continuar</button>
</div>
</div>
`;
document.body.appendChild(modal);
}
modal.style.display = "flex";
const acceptBtn = document.getElementById("accept-privacy-btn");
const rejectBtn = document.getElementById("reject-privacy-btn");
const handleAccept = () => { localStorage.setItem("privacy_accepted", "true"); modal.style.display = "none"; if (onAccept) onAccept(); cleanup(); };
const handleReject = () => { modal.style.display = "none"; showTemporaryMessage(" Debes aceptar el aviso de privacidad para continuar", "error"); cleanup(); };
const cleanup = () => { if (acceptBtn) acceptBtn.removeEventListener("click", handleAccept); if (rejectBtn) rejectBtn.removeEventListener("click", handleReject); };
if (acceptBtn) acceptBtn.addEventListener("click", handleAccept);
if (rejectBtn) rejectBtn.addEventListener("click", handleReject);
}
function loadCartFromStorage() {
try {
const raw = JSON.parse(localStorage.getItem("cart") || "{}");
localCart = {};
for (const [key, item] of Object.entries(raw)) {
if (
item && typeof item === 'object' &&
item.id !== undefined &&
typeof item.quantity === 'number' && item.quantity > 0 && item.quantity <= 99 &&
typeof item.price === 'number' && item.price >= 0 && item.price <= 999999
) {
localCart[key] = {
id:  item.id,
name:  String(item.name || '').slice(0, 200),
price:  item.price,
quantity: Math.floor(item.quantity),
Imagen1:  String(item.Imagen1 || '').slice(0, 500),
Talla:  String(item.Talla || '').slice(0, 50),
_comunidad: item._comunidad || false,
_vendedor:  String(item._vendedor  || '').slice(0, 100),
_vendorTel: String(item._vendorTel || '').slice(0, 20),
_vendorLogo: String(item._vendorLogo || '').slice(0, 500),
_vendorPlan: String(item._vendorPlan || '').slice(0, 20),
_vendorUid: String(item._vendorUid || '').slice(0, 100),
_donacion: item._donacion === true,
_beneficiario: (item._beneficiario && typeof item._beneficiario === 'object') ? {
id:  String(item._beneficiario.id  || '').slice(0, 50),
nombre:  String(item._beneficiario.nombre  || '').slice(0, 100),
cuenta_bancaria: String(item._beneficiario.cuenta_bancaria || '').slice(0, 60)
} : null
};
}
}
} catch {
localCart = {};
}
updateCartBadge();
}
function saveCartToStorage() { localStorage.setItem("cart", JSON.stringify(localCart)); }
function updateCartBadge() {
const totalQty = Object.values(localCart).reduce((sum, item) => sum + (item.quantity || 0), 0);
const countEl = document.getElementById("cart-count");
if (countEl) countEl.textContent = totalQty;
const bottomBadge = document.getElementById("bottom-cart-count");
if (bottomBadge) {
bottomBadge.textContent = totalQty;
bottomBadge.style.display = totalQty > 0 ? '' : 'none';
}
}
function addToCart(product) {
const id = product.ID;
if (!id) { console.error("Producto sin ID:", product); return; }
if (!localCart[id]) {
localCart[id] = { id: id, name: product.Nombre || "Producto", price: Number(product.Precio || 0), quantity: 0, stock: Number(product.Stock || product.stock || 99), Imagen1: product.Imagen1 || "", Talla: product.Talla || "", _comunidad: product._comunidad || false, _vendedor: product._vendedor || "", _vendorTel: product._vendorTel || "", _vendorLogo: product._vendorLogo || "", _vendorPlan: product._vendorPlan || "", _vendorUid: product._vendorUid || "", _donacion: product._donacion || false, _beneficiario: product._beneficiario || null };
}
const maxStock = Number(localCart[id].stock || 99);
if (localCart[id].quantity >= maxStock) {
showTemporaryMessage(` Solo hay ${maxStock} pieza${maxStock === 1 ? '' : 's'} disponible${maxStock === 1 ? '' : 's'}`, 'error');
return;
}
localCart[id].quantity += 1;
saveCartToStorage();
updateCartBadge();
animateCartAdd();
let wishlist = getWishlist();
const existedInWishlist = wishlist.some(item => item.id === String(id));
if (existedInWishlist) {
wishlist = wishlist.filter(item => item.id !== String(id));
saveWishlist(wishlist);
updateAllWishlistButtons(id, false);
if (typeof renderWishlist === 'function') renderWishlist();
} else {
}
window.dispatchEvent(new CustomEvent('cartUpdated', { detail: localCart }));
}
function animateCartAdd() {
const btn = document.getElementById("floating-cart-btn");
if (btn) { btn.style.transform = "translateY(-4px) scale(1.05)"; setTimeout(() => btn.style.transform = "", 180); }
}
function openCartDrawer() {
const drawer = document.getElementById("cart-drawer");
const overlay = document.getElementById("overlay");
if (!drawer) {
console.error(" [CARRITO] No existe #cart-drawer");
return;
}
if (!overlay) {
console.error(" [CARRITO] No existe #overlay");
return;
}
drawer.classList.add("open");
overlay.classList.add("visible");
if (typeof renderCart === 'function') {
renderCart();
}
if (typeof updateSavedPhoneDisplay === 'function') {
updateSavedPhoneDisplay();
}
}
function closeCartDrawer() {
const drawer = document.getElementById("cart-drawer");
const overlay = document.getElementById("overlay");
if (drawer) drawer.classList.remove("open");
if (overlay) overlay.classList.remove("visible");
}
window.changeCartQty = function(productId, delta) {
if (!localCart[productId]) return;
const newQty = localCart[productId].quantity + delta;
if (newQty <= 0) {
delete localCart[productId];
} else {

const maxStock = Number(localCart[productId].stock || localCart[productId].Stock || 99);
if (delta > 0 && localCart[productId].quantity >= maxStock) {
showTemporaryMessage(` Solo hay ${maxStock} pieza${maxStock === 1 ? '' : 's'} disponible${maxStock === 1 ? '' : 's'}`, 'error');
return;
}
localCart[productId].quantity = Math.min(newQty, maxStock);
}
saveCartToStorage();
updateCartBadge();
renderCart();
window.dispatchEvent(new CustomEvent('cartUpdated'));
};
window.removeFromCart = function(productId) {
if (localCart[productId]) {
delete localCart[productId];
saveCartToStorage();
updateCartBadge();
renderCart();
window.dispatchEvent(new CustomEvent('cartUpdated'));
}
};
function handleDecrement(e) {
e.stopPropagation();
const id = e.currentTarget.getAttribute('data-id');
if (id && window.changeCartQty) {
window.changeCartQty(id, -1);
}
}
function handleIncrement(e) {
e.stopPropagation();
const id = e.currentTarget.getAttribute('data-id');
if (id && window.changeCartQty) {
window.changeCartQty(id, 1);
}
}
function handleRemove(e) {
e.stopPropagation();
const id = e.currentTarget.getAttribute('data-id');
if (id && window.removeFromCart) {
window.removeFromCart(id);
}
}
function renderCart() {

const container = document.getElementById("cart-items-container");
if (!container) {
  // Es normal que esto pase en páginas sin carrito (ej: admin.html),
  // así que no lo tratamos como error real.
  console.warn(" [RENDER] No existe #cart-items-container (normal si esta página no tiene carrito)");
  return;
}
container.innerHTML = "";
const items = Object.values(localCart);
if (items.length === 0) {
container.innerHTML = `
<div class="cart-empty-state">
<div class="cart-empty-icon"></div>
<p class="helper-text">Tu carrito está vacío.</p>
<p class="cart-empty-hint">Agrega productos para comenzar</p>
</div>`;
} else {
const znrItems  = items.filter(i => !i._comunidad);
const comunidadItems = items.filter(i =>  i._comunidad);
function renderCartItem(item) {
const row = document.createElement("div");
row.className = "cart-item";
const imgUrl = item.Imagen1 ? optimizeDriveUrl(item.Imagen1, 120) : '';
const imgHtml = imgUrl
? `<div class="cart-item-img-wrap">
<img class="cart-item-img" src="${escapeHtml(imgUrl)}" alt="${escapeHtml(item.name)}" loading="lazy" onerror="this.parentElement.style.display='none'">
</div>`
: `<div class="cart-item-img-wrap cart-item-img-placeholder">
<span></span>
</div>`;
const tallaBadge = item.Talla
? `<span class="cart-item-talla">${item._comunidad ? 'Info' : 'Talla'}: ${escapeHtml(item.Talla)}</span>`
: '';
const vendorBadge = item._comunidad && item._vendedor
? `<span class="cart-item-vendor"> ${escapeHtml(item._vendedor)}</span>`
: '';
const donationBadge = item._donacion
? `<span style="display:inline-block;background:rgba(249,115,22,.12);color:#f97316;font-size:10.5px;font-weight:700;border-radius:20px;padding:2px 8px;margin:2px 0;">${Icon('heart-fill')} Donativo${item._beneficiario && item._beneficiario.nombre ? ' · se paga a ' + escapeHtml(item._beneficiario.nombre) : ''}</span>`
: '';
row.innerHTML = `
${imgHtml}
<div class="cart-item-info">
<div class="cart-item-title">${escapeHtml(item.name || `ID ${item.id}`)}</div>
${tallaBadge}
${vendorBadge}
${donationBadge}
<div class="cart-item-meta">${formatCurrency(item.price)} c/u</div>
<div class="cart-item-actions">
<button class="qty-btn" data-action="decrement" data-id="${item.id}">−</button>
<span class="qty-value">${item.quantity}</span>
<button class="qty-btn" data-action="increment" data-id="${item.id}">+</button>
<button class="cart-item-remove" data-action="remove" data-id="${item.id}"></button>
</div>
</div>
`;
container.appendChild(row);
}
if (znrItems.length > 0) {
if (comunidadItems.length > 0) {
const sep = document.createElement('div');
sep.className = 'cart-section-header';
sep.innerHTML = '<span>Z&R Tienda</span>';
container.appendChild(sep);
}
znrItems.forEach(renderCartItem);
}
if (comunidadItems.length > 0) {
const sep2 = document.createElement('div');
sep2.className = 'cart-section-header cart-section-comunidad';
sep2.innerHTML = '<span>Comunidad</span><small>Pago directo al vendedor vía WhatsApp</small>';
container.appendChild(sep2);
comunidadItems.forEach(renderCartItem);
}
document.querySelectorAll('.qty-btn[data-action="decrement"]').forEach(btn => {
btn.removeEventListener('click', handleDecrement);
btn.addEventListener('click', handleDecrement);
});
document.querySelectorAll('.qty-btn[data-action="increment"]').forEach(btn => {
btn.removeEventListener('click', handleIncrement);
btn.addEventListener('click', handleIncrement);
});
document.querySelectorAll('.cart-item-remove[data-action="remove"]').forEach(btn => {
btn.removeEventListener('click', handleRemove);
btn.addEventListener('click', handleRemove);
});
}
const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
const subtotalEl = document.getElementById("cart-subtotal");
const totalEl = document.getElementById("cart-total");
if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
if (totalEl) totalEl.textContent = formatCurrency(subtotal);
const _znrCount  = items.filter(i => !i._comunidad).length;
const _commCount = items.filter(i =>  i._comunidad).length;
const requestBtn = document.getElementById("request-purchase-btn");
if (requestBtn) {
if (_znrCount > 0 && _commCount > 0) {
requestBtn.textContent = " Enviar pedidos (Z&R + Comunidad)";
} else if (_commCount > 0 && _znrCount === 0) {
requestBtn.textContent = " Contactar vendedor(es) por WhatsApp";
} else {
requestBtn.textContent = " Solicitar por WhatsApp";
}
}
_refreshDeliveryBlock();
setTimeout(() => {
const changePhoneBtn = document.getElementById('change-phone-btn');
if (changePhoneBtn) {
const newBtn = changePhoneBtn.cloneNode(true);
changePhoneBtn.parentNode.replaceChild(newBtn, changePhoneBtn);
newBtn.addEventListener('click', async function(e) {
e.preventDefault();
e.stopPropagation();
if (typeof window.changePhoneNumber === 'function') {
await window.changePhoneNumber();
} else if (typeof changePhoneNumber === 'function') {
await changePhoneNumber();
} else {
console.error(" changePhoneNumber no está definida");
if (typeof showCustomAlert === 'function') {
showCustomAlert({
title: "Error",
message: "Función no disponible. Recarga la página.",
icon: "",
confirmText: "Aceptar"
});
}
}
});
} else {
console.warn(" No se encontró el botón change-phone-btn en el DOM");
}
}, 100);
updateSavedPhoneDisplay();
}
let _modalImages  = [];
let _modalIndex  = 0;
let _modalTouchStartX = 0;
let _modalProduct  = null;
function openImageModal(url, productId = null, allImages = [], productData = null) {
  const modal  = document.getElementById("image-modal");
  const overlay = document.getElementById("overlay");
  if (!modal) return;
  const hiResUrl = getModalImageUrl(url);
  const hiResAll = allImages.filter(u => u && u !== url).map(getModalImageUrl);
  _modalImages = [hiResUrl, ...hiResAll];
_modalIndex  = 0;
_modalProduct = productData;
initImageModalControls();
_renderModalImage(modal, 0, 'none');
_renderProductInfo(modal);
_renderVendorRow(modal);
_renderMagazinePanel(modal);
modal.classList.add("open");
if (overlay) overlay.classList.add("visible");
if (productId && typeof addToRecentProducts === 'function') {
addToRecentProducts(productId);
}
}
function _renderModalImage(modal, idx, direction) {
const img  = modal.querySelector('#image-modal-img');
const dots = modal.querySelector('.im-dots');
const prev = modal.querySelector('.im-prev');
const next = modal.querySelector('.im-next');
if (!img) return;
if (direction !== 'none') {
img.classList.add(direction === 'right' ? 'im-exit-left' : 'im-exit-right');
setTimeout(() => {
img.src = _modalImages[idx];
img.classList.remove('im-exit-left', 'im-exit-right');
img.classList.add(direction === 'right' ? 'im-enter-right' : 'im-enter-left');
setTimeout(() => img.classList.remove('im-enter-right', 'im-enter-left'), 320);
}, 220);
} else {
img.src = _modalImages[idx];
}
if (prev) prev.style.display = _modalImages.length > 1 ? '' : 'none';
if (next) next.style.display = _modalImages.length > 1 ? '' : 'none';
if (dots) {
dots.innerHTML = _modalImages.map((_, i) =>
`<span class="im-dot${i === idx ? ' active' : ''}"></span>`
).join('');
}
}
function _renderProductInfo(modal) {
const el = modal.querySelector('#im-product-info');
if (!el) return;
const p = _modalProduct;
if (!p) { el.innerHTML = ''; el.style.display = 'none'; return; }
const nombre  = p.Nombre  || p.nombre  || '';
const precio  = p.Precio  || p.precio  || 0;
const talla  = p.Talla  || p.talla  || '';
const desc  = p.Descripcion || p.descripcion || '';
const categoria = p.Categoria || p.categoria || '';
const stock  = Number(p.Stock ?? p.stock ?? -1);
const badge  = p.Badge  || p.badge  || '';
const fmtPrecio = typeof formatCurrency === 'function'
? formatCurrency(precio)
: `$${Number(precio).toLocaleString()}`;
const stockHtml = stock < 0 ? '' :
stock === 0
? `<span class="im-info-stock out">Sin stock</span>`
: `<span class="im-info-stock ok"> ${stock} disponibles</span>`;
const badgeHtml  = badge  ? `<span class="im-info-badge">${escapeHtml(badge)}</span>` : '';
const catHtml  = categoria ? `<span class="im-info-cat">${escapeHtml(categoria)}</span>` : '';
const tallaHtml  = talla  ? `<div class="im-info-talla">${p.vendedor_uid ? 'Info' : 'Talla'}: <strong>${escapeHtml(talla)}</strong></div>` : '';
const descHtml  = desc  ? `<p class="im-info-desc">${escapeHtml(desc)}</p>` : '';
const sinStock = stock === 0;
const buyBtnHtml = `
<button class="im-buy-btn"${sinStock ? ' disabled' : ''} id="im-buy-btn">
${sinStock
? 'Sin stock'
: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" aria-hidden="true"><use href="#ic-cart"/></svg>Añadir al carrito'}
</button>`;
el.style.display = '';
el.innerHTML = `
<div class="im-info-top">
<div class="im-info-name">${escapeHtml(nombre)}</div>
<div class="im-info-price">${fmtPrecio}</div>
</div>
<div class="im-info-meta">
${catHtml}${badgeHtml}${stockHtml}
</div>
${tallaHtml}
${descHtml}
${buyBtnHtml}
`;
const buyBtn = el.querySelector('#im-buy-btn');
if (buyBtn && !sinStock) {
buyBtn.addEventListener('click', (e) => {
e.stopPropagation();
_handleModalBuyClick(p);
});
}
}

// Dado el id de un beneficiario, trae su nombre y cuenta bancaria desde la API.
// Se usa en cualquier punto donde se añada al carrito un artículo donado
// (modal de producto, botón directo en la tarjeta de comunidad, etc.) para
// que el checkout siempre muestre la cuenta real, sin depender de campos
// que no vienen incluidos en el producto.
window.resolveBeneficiario = async function(beneficiarioId) {
const beneficiario = { id: beneficiarioId || '', nombre: '', cuenta_bancaria: '' };
if (!beneficiarioId || !window.API_URL) return beneficiario;
try {
const res  = await fetch(window.API_URL + '?' + new URLSearchParams({ action: 'obtenerBeneficiario', id: beneficiarioId }));
const data = await res.json();
if (data.ok && data.beneficiario) {
beneficiario.nombre = data.beneficiario.nombre || '';
beneficiario.cuenta_bancaria = data.beneficiario.cuenta_bancaria || '';
}
} catch (err) { /* si falla, se agrega igual y se coordina con el vendedor */ }
return beneficiario;
};

async function _handleModalBuyClick(p) {
if (typeof window.addToCart !== 'function') return;
const esComunidad = p._comunidad === true;
const id  = p.ID  || p.id  || '';
const nombre = p.Nombre || p.nombre || '';
const precio = Number(p.Precio || p.precio || 0);
const talla  = p.Talla  || p.talla  || '';
const imagen = p.Imagen1 || p.imagen1 || (_modalImages && _modalImages[0]) || '';
if (esComunidad) {
const donado = p._donado === true || p.donado === true || p.donado === 'TRUE' || p.donado === 'true';
const beneficiarioId = p._beneficiarioId || p.beneficiario_id || '';
const beneficiario = donado ? await window.resolveBeneficiario(beneficiarioId) : null;
window.addToCart({
ID: id, Nombre: nombre, Precio: precio, Imagen1: imagen, Talla: talla,
_comunidad: true,
_vendedor: p._vendedorNombre || p.vendedor_nombre || '',
_vendorTel: p._vendedorTel || p.vendedor_tel || '',
_vendorLogo: p._vendedorLogo || p.vendedor_logo || '',
_vendorPlan: p._vendedorPlan || p.vendedor_plan || '',
_vendorUid: p._vendedorUid || p.vendedor_uid || '',
_donacion: donado,
_beneficiario: beneficiario
});
} else {
const stock = Number(p.Stock ?? p.stock ?? 0);
window.addToCart({
ID: id, Nombre: nombre, Precio: precio, Stock: stock, Imagen1: imagen, Talla: talla
});
}
if (typeof window.showTemporaryMessage === 'function') {
window.showTemporaryMessage(` ${nombre} agregado`, 'success');
}
}
function _renderVendorRow(modal) {
const el = modal.querySelector('#im-vendor-row');
if (!el) return;
const p = _modalProduct;
if (!p) { el.innerHTML = ''; return; }
const esComunidad = p._comunidad === true;
const vendorName = p._vendedorNombre || p.vendedor_nombre || '';
const vendorLogo = p._vendedorLogo || p.vendedor_logo || '';
const vendorPlan = p._vendedorPlan || p.vendedor_plan || '';
const vendorUid  = p._vendedorUid || p.vendedor_uid || '';
const donado = p._donado === true || p.donado === true || p.donado === 'TRUE' || p.donado === 'true';
const beneficiarioId = p._beneficiarioId || p.beneficiario_id || '';
const vendorInitials = vendorName ? vendorName.trim().split(/\s+/).map(w => w[0]).slice(0,2).join('').toUpperCase() : 'ZR';
const vendorAvatarHtml = (vendorPlan === 'plus' && vendorLogo)
? `<img src="${escapeAttr(vendorLogo)}" alt="" style="width:16px;height:16px;border-radius:50%;object-fit:cover;flex-shrink:0;" onerror="this.style.display='none'">`
: `<span style="width:16px;height:16px;border-radius:50%;background:rgba(255,255,255,.2);font-size:8px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">${escapeHtml(vendorInitials)}</span>`;
const vendorPillHtml = esComunidad && vendorName
? `<a href="perfil-vendedor.html?vendedor=${escapeAttr(vendorUid)}" class="im-vendor-pill">${vendorAvatarHtml}<span>${escapeHtml(vendorName)}</span></a>`
: `<span class="im-vendor-pill im-vendor-pill-znr">Z&amp;R</span>`;
const donationHtml = donado
? `<span class="im-donation-badge"> Donativo</span>${beneficiarioId && typeof window.openBeneficiarioModal === 'function' ? `<button class="im-ver-beneficiario-btn" data-ben-id="${escapeAttr(beneficiarioId)}"> Ver beneficiario</button>` : ''}`
: '';
el.innerHTML = `${vendorPillHtml}${donationHtml}`;
const benBtn = el.querySelector('.im-ver-beneficiario-btn');
if (benBtn) {
benBtn.addEventListener('click', (e) => {
e.stopPropagation();
window.openBeneficiarioModal?.(benBtn.dataset.benId);
});
}
}

function _renderMagazinePanel(modal) {
  const panel = modal.querySelector('.im-magazine-panel');
  if (!panel) return;
  const current = _modalProduct;
  const isComunidad = current && (current._comunidad === true);
  let rawPool;
  if (isComunidad) {
    rawPool = window.allCommunityProductsIndexed || [];
  } else {
    rawPool = (typeof allProductsIndexed !== 'undefined' ? allProductsIndexed : []);
  }
  const pool = rawPool.map(p => ({
    _raw:  p,
    _id:  String(p.ID  || p.id  || ''),
    _nombre:  p.Nombre  || p.nombre  || '',
    _precio:  p.Precio  || p.precio  || 0,
    _categoria:  p.Categoria  || p.categoria  || '',
    _stock:  Number(p.Stock || p.stock || 0),
    _talla:  p.Talla  || p.talla  || '',
    _descripcion:p.Descripcion || p.descripcion || '',
    _badge:  p.Badge  || p.badge  || '',
    _imagen1:  p.Imagen1  || p.imagen1  || '',
    _imagen2:  p.Imagen2  || p.imagen2  || '',
    _imagen3:  p.Imagen3  || p.imagen3  || '',
    _comunidad:  isComunidad,
    _vendedorNombre: p.vendedor_nombre || p._vendedorNombre || '',
    _vendedorUid: p.vendedor_uid || p._vendedorUid || '',
    _vendedorLogo: p.vendedor_logo || p._vendedorLogo || '',
    _vendedorPlan: p.vendedor_plan || p._vendedorPlan || '',
    _donado: p.donado === true || p.donado === 'TRUE' || p.donado === 'true',
    _beneficiarioId: p.beneficiario_id || p._beneficiarioId || '',
  }));
  const currentId  = current ? String(current.ID || current.id || '') : '';
  const currentCat = current ? (current.Categoria || current.categoria || '') : '';
  let related = [];
  if (current && pool.length) {
    const otherCat = pool.filter(p =>
      p._id !== currentId &&
      p._categoria !== currentCat &&
      p._stock > 0
    );
    related = otherCat.sort(() => Math.random() - 0.5).slice(0, 3);
    if (related.length < 3) {
      // Si no hay suficientes de otras categorías, rellenamos con lo que haya
      // (incluyendo la misma categoría) para no dejar el panel vacío.
      const others = pool.filter(p =>
        p._id !== currentId &&
        p._stock > 0 &&
        !related.find(r => r._id === p._id)
      ).sort(() => Math.random() - 0.5);
      related = [...related, ...others].slice(0, 3);
    }
  }
  if (related.length === 0) {
    panel.style.display = 'none';
    modal.querySelector('.im-magazine-layout').classList.add('im-no-panel');
    return;
  }
  panel.style.display = '';
  modal.querySelector('.im-magazine-layout').classList.remove('im-no-panel');
  panel.innerHTML = `
    ${related.map(p => {
      const thumbImg = typeof optimizeDriveUrl === 'function'
        ? optimizeDriveUrl(p._imagen1, 200)
        : (p._imagen1 || '');
      const fullImg = getModalImageUrl(p._imagen1);
      const name = (p._nombre || 'Producto').substring(0, 28);
      const price = typeof formatCurrency === 'function'
        ? formatCurrency(p._precio)
        : `$${p._precio}`;
      const safeImg     = thumbImg ? escapeAttr(thumbImg) : 'https://placehold.co/200x200/3b1f5f/white?text=Z%26R';
      const safeFullImg = fullImg  ? escapeAttr(fullImg)  : safeImg;
      const safeName  = typeof escapeHtml === 'function' ? escapeHtml(name) : name;
      const safeId  = escapeAttr(p._id);
      const allImg  = [p._imagen1, p._imagen2, p._imagen3]
  .map(u => u ? getModalImageUrl(u) : '')
  .filter(Boolean);
      const allImgEncoded = escapeAttr(JSON.stringify(allImg));
      const safeNombre  = escapeAttr(p._nombre  || '');
      const safePrecio  = escapeAttr(String(p._precio  || 0));
      const safeCat  = escapeAttr(p._categoria  || '');
      const safeTalla  = escapeAttr(p._talla  || '');
      const safeDesc  = escapeAttr(p._descripcion || '');
      const safeStock  = escapeAttr(String(p._stock ?? -1));
      const safeBadge  = escapeAttr(p._badge  || '');
      const safeImg1  = escapeAttr(p._imagen1  || '');
      const safeImg2  = escapeAttr(p._imagen2  || '');
      const safeImg3  = escapeAttr(p._imagen3  || '');
      const safeComunidad = p._comunidad ? '1' : '0';
      const safeVendNombre = escapeAttr(p._vendedorNombre || '');
      const safeVendUid  = escapeAttr(p._vendedorUid  || '');
      const safeVendLogo  = escapeAttr(p._vendedorLogo  || '');
      const safeVendPlan  = escapeAttr(p._vendedorPlan  || '');
      const safeDonado  = p._donado ? '1' : '0';
      const safeBenId  = escapeAttr(p._beneficiarioId || '');
      return `
        <button class="im-related-card"
          data-id="${safeId}"
          data-img="${safeFullImg}"
          data-all-images="${allImgEncoded}"
          data-nombre="${safeNombre}"
          data-precio="${safePrecio}"
          data-categoria="${safeCat}"
          data-talla="${safeTalla}"
          data-descripcion="${safeDesc}"
          data-stock="${safeStock}"
          data-badge="${safeBadge}"
          data-imagen1="${safeImg1}"
          data-imagen2="${safeImg2}"
          data-imagen3="${safeImg3}"
          data-comunidad="${safeComunidad}"
          data-vendedor-nombre="${safeVendNombre}"
          data-vendedor-uid="${safeVendUid}"
          data-vendedor-logo="${safeVendLogo}"
          data-vendedor-plan="${safeVendPlan}"
          data-donado="${safeDonado}"
          data-ben-id="${safeBenId}"
          aria-label="Ver ${safeName}">
          <div class="im-related-img-wrap">
            <img src="${safeImg}" alt="${safeName}" loading="lazy" />
          </div>
          <div class="im-related-info">
            <span class="im-related-name">${safeName}</span>
            <span class="im-related-price">${price}</span>
          </div>
        </button>`;
    }).join('')}
  `;
  panel.querySelectorAll('.im-related-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const img1  = btn.dataset.img;
      const allImgs = JSON.parse(btn.dataset.allImages || '[]');
      const pData  = {
        ID:  btn.dataset.id,
        Nombre:  btn.dataset.nombre,
        Precio:  btn.dataset.precio,
        Categoria:  btn.dataset.categoria,
        Talla:  btn.dataset.talla  || '',
        Descripcion: btn.dataset.descripcion || '',
        Stock:  btn.dataset.stock !== undefined ? Number(btn.dataset.stock) : -1,
        Badge:  btn.dataset.badge  || '',
        Imagen1:  btn.dataset.imagen1,
        Imagen2:  btn.dataset.imagen2,
        Imagen3:  btn.dataset.imagen3,
        _comunidad:  btn.dataset.comunidad === '1',
        _vendedorNombre: btn.dataset.vendedorNombre || '',
        _vendedorUid: btn.dataset.vendedorUid || '',
        _vendedorLogo: btn.dataset.vendedorLogo || '',
        _vendedorPlan: btn.dataset.vendedorPlan || '',
        _donado: btn.dataset.donado === '1',
        _beneficiarioId: btn.dataset.benId || '',
      };
      _modalImages  = [img1, ...allImgs.filter(u => u && u !== img1)];
      _modalIndex  = 0;
      _modalProduct = pData;
      const modal2 = document.getElementById("image-modal");
      if (modal2) {
        _renderModalImage(modal2, 0, 'right');
        _renderProductInfo(modal2);
        _renderVendorRow(modal2);
        _renderMagazinePanel(modal2);
      }
    });
  });
}
function _modalNav(dir) {
if (_modalImages.length < 2) return;
_modalIndex = (_modalIndex + dir + _modalImages.length) % _modalImages.length;
const modal = document.getElementById("image-modal");
if (modal) _renderModalImage(modal, _modalIndex, dir > 0 ? 'right' : 'left');
}
function closeImageModal() {
const modal  = document.getElementById("image-modal");
const overlay = document.getElementById("overlay");
if (modal) modal.classList.remove("open");
if (overlay) overlay.classList.remove("visible");
_modalImages = []; _modalIndex = 0; _modalProduct = null;
}
function initImageModalControls() {
  const modal = document.getElementById("image-modal");
  if (!modal || modal.dataset.imInit) return;
  modal.dataset.imInit = '1';

  // --- Variables para el auto-slide ---
  let _autoSlideTimer = null;
  const _SLIDE_INTERVAL = 4000; // 4 segundos

  // --- Funciones de control del auto-slide ---
  function _startAutoSlide() {
    _stopAutoSlide();
    // Solo inicia si hay más de 1 imagen (detectado por la cantidad de dots)
    const dots = modal.querySelectorAll('.im-dot');
    if (dots.length <= 1) return;
    
    _autoSlideTimer = setInterval(() => {
      // Solo avanza si el modal sigue abierto
      if (modal.classList.contains('open')) {
        // Llama a la navegación existente (asumo que _modalNav está definida globalmente)
        if (typeof _modalNav === 'function') {
          _modalNav(1);
        }
      }
    }, _SLIDE_INTERVAL);
  }

  function _stopAutoSlide() {
    if (_autoSlideTimer) {
      clearInterval(_autoSlideTimer);
      _autoSlideTimer = null;
    }
  }

  function _resetAutoSlide() {
    _stopAutoSlide();
    _startAutoSlide();
  }

  // --- Inyección del nuevo HTML (con Top Bar) ---
  modal.innerHTML = `
    <div class="im-magazine-layout">
      
      <!-- NUEVA BARRA SUPERIOR: Vendor Row + Botón Cerrar -->
      <div class="im-top-bar">
        <div class="im-vendor-row" id="im-vendor-row"></div>
        <button class="im-close icon-button" aria-label="Cerrar">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" aria-hidden="true"><use href="#ic-x"/></svg>
        </button>
      </div>

      <!-- Columna principal (solo la imagen y navegación) -->
      <div class="im-hero-col">
        <button class="im-prev" aria-label="Anterior">‹</button>
        <div class="im-wrapper">
          <img id="image-modal-img" alt="Vista de producto" />
        </div>
        <button class="im-next" aria-label="Siguiente">›</button>
        <div class="im-dots"></div>
      </div>

      <!-- Franja de detalles del producto -->
      <div class="im-product-info" id="im-product-info"></div>

      <!-- Panel de relacionados -->
      <aside class="im-magazine-panel"></aside>
    </div>
  `;

  // --- Asignación de Eventos ---
  const closeBtn = modal.querySelector('.im-close');
  const prevBtn = modal.querySelector('.im-prev');
  const nextBtn = modal.querySelector('.im-next');

  closeBtn.addEventListener('click', closeImageModal);
  
  // Al hacer clic en navegación, reiniciamos el auto-slide
  prevBtn.addEventListener('click', () => {
    if (typeof _modalNav === 'function') _modalNav(-1);
    _resetAutoSlide();
  });
  
  nextBtn.addEventListener('click', () => {
    if (typeof _modalNav === 'function') _modalNav(1);
    _resetAutoSlide();
  });

  // Cerrar al hacer clic en el fondo
  modal.addEventListener('click', e => {
    if (e.target === modal) closeImageModal();
  });

  // Gestos táctiles (Swipe)
  let _modalTouchStartX = 0;
  modal.addEventListener('touchstart', e => {
    _modalTouchStartX = e.touches[0].clientX;
  }, { passive: true });

  modal.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - _modalTouchStartX;
    if (Math.abs(dx) > 40) {
      if (typeof _modalNav === 'function') _modalNav(dx < 0 ? 1 : -1);
      _resetAutoSlide(); // Reiniciamos al deslizar
    }
  }, { passive: true });

  // Teclado
  document.addEventListener('keydown', e => {
    if (!modal.classList.contains('open')) return;
    if (e.key === 'ArrowRight') {
      if (typeof _modalNav === 'function') _modalNav(1);
      _resetAutoSlide();
    }
    if (e.key === 'ArrowLeft') {
      if (typeof _modalNav === 'function') _modalNav(-1);
      _resetAutoSlide();
    }
    if (e.key === 'Escape') closeImageModal();
  });

  // --- Observador para detectar apertura/cierre del modal ---
  const observer = new MutationObserver(() => {
    if (modal.classList.contains('open')) {
      _startAutoSlide(); // Al abrir, arranca el auto-slide
    } else {
      _stopAutoSlide(); // Al cerrar, lo detiene
    }
  });
  observer.observe(modal, { attributes: true, attributeFilter: ['class'] });

  // --- Estilos CSS Mejorados ---
  if (!document.getElementById('im-styles')) {
    const st = document.createElement('style');
    st.id = 'im-styles';
    st.textContent = `
      .image-modal {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.88);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  z-index: 8000;
  display: none;
  align-items: center;
  justify-content: center;
  padding: 12px;
  box-sizing: border-box;
}
.image-modal.open { display: flex; }

.im-magazine-layout {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: min(480px, 96vw);
  max-height: 92dvh;
  background: #0d0d14;
  border-radius: 22px;
  overflow: hidden;
  box-shadow: 0 32px 80px rgba(0,0,0,.75);
  animation: im-fade-in .22s ease;
}
@keyframes im-fade-in { from { opacity:0; transform:scale(.96); } to { opacity:1; transform:scale(1); } }

.im-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 14px;
  background: #0d0d14;
  width: 100%;
  box-sizing: border-box;
  min-height: 62px;
  border-bottom: 1px solid rgba(255,255,255,.06);
  flex-shrink: 0;
}

.im-vendor-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
}
.im-vendor-pill {
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,.08);
  backdrop-filter: blur(6px);
  color: #fff;
  font-size: 14px;   
  font-weight: 700;
  padding: 6px 14px 6px 6px;
  border-radius: 30px;
  text-decoration: none;
  max-width: 260px;  
  transition: background .2s;
}
.im-vendor-pill span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.im-vendor-pill-znr {
  padding: 6px 14px; 
  background: linear-gradient(135deg,#ff4f81,#a855f7);
}
.im-donation-badge {
  display: inline-flex; align-items: center; gap: 4px;
  background: linear-gradient(135deg,#f97316,#ef4444);
  color: #fff;
  font-size: 13px;   
  font-weight: 700;
  padding: 6px 14px;
  border-radius: 30px;
  white-space: nowrap;
}
.im-ver-beneficiario-btn {
  background: rgba(255,255,255,.08);
  border: none;
  color: #ffd9b3;
  font-size: 13px;   
  font-weight: 700;
  padding: 6px 14px;
  border-radius: 30px;
  cursor: pointer;
  white-space: nowrap;
  transition: background .2s;
}
.im-ver-beneficiario-btn:hover { background: rgba(249,115,22,.45); color: #fff; }

.im-close {
  background: rgba(255,255,255,.13);
  border: none;
  color: #fff;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background .2s;
  flex-shrink: 0;
}
.im-close:hover { background: rgba(255,79,129,.4); }

.im-hero-col {
  position: relative;
  width: 100%;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #111118;
  min-height: 0;
  overflow: hidden;
}
.im-prev, .im-next {
  position: absolute; top: 50%; transform: translateY(-50%);
  background: rgba(0,0,0,.45);
  border: none; color: #fff;
  width: 36px; height: 36px;
  border-radius: 50%; font-size: 24px;
  cursor: pointer; display: flex;
  align-items: center; justify-content: center;
  transition: background .2s; z-index: 4;
  backdrop-filter: blur(6px);
}
.im-prev { left: 10px; } .im-next { right: 10px; }
.im-prev:hover, .im-next:hover { background: rgba(255,79,129,.55); }

.im-wrapper {
  width: 100%;
  height: 50dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #111118;
  overflow: hidden;
}
.im-wrapper img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.im-dots {
  position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%);
  display: flex; gap: 5px; z-index: 3;
}
.im-dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,.35); transition: all .2s; }
.im-dot.active { background: #ff4f81; width: 16px; border-radius: 3px; }

/* ── SECCIÓN CORREGIDA ── */
.im-product-info {
  width: 100%;
  margin: 0;
  background: #252831;
  border-top: 1px solid rgba(255,255,255,.07);
  border-bottom: 1px solid rgba(255,255,255,.07);
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-sizing: border-box;
}
.im-info-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}
.im-info-name {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  line-height: 1.3;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 180px;
}
.im-info-price {
  font-size: 17px;
  font-weight: 800;
  color: #ff4f81;
  white-space: nowrap;
  background: rgba(255,79,129,.12);
  padding: 2px 6px;
  border-radius: 10px;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
}
.im-info-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.im-info-cat {
  background: rgba(255,255,255,.08);
  color: rgba(255,255,255,.7);
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: .4px;
}
.im-info-badge {
  background: linear-gradient(135deg,#ff4f81,#ff7a4f);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: .4px;
}
.im-info-stock {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 20px;
}
.im-info-stock.ok  { background: rgba(34,197,94,.15); color: #4ade80; }
.im-info-stock.out { background: rgba(239,68,68,.15);  color: #f87171; }
.im-info-talla {
  font-size: 12px;
  color: rgba(255,255,255,.65);
}
.im-info-talla strong { color: rgba(255,255,255,.9); }
.im-info-desc {
  font-size: 13px;
  color: rgba(255,255,255,.5);
  margin: 4px 0 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.im-buy-btn {
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: auto;
  margin: -40px 10px 0 auto;
  padding: 8px;
  font-size: 13px;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg,#ff4f81,#a855f7);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: transform .15s ease, box-shadow .15s ease;
  box-shadow: 0 6px 18px rgba(255,79,129,.25);
}
.im-buy-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 22px rgba(255,79,129,.35); }
.im-buy-btn:active { transform: translateY(0); }
.im-buy-btn:disabled {
  background: rgba(255,255,255,.08);
  color: rgba(255,255,255,.4);
  cursor: not-allowed;
  box-shadow: none;
}
/* ── FIN SECCIÓN CORREGIDA ── */

.im-magazine-panel {
  flex: 0 0 auto;
  width: 100%;
  display: flex;
  flex-direction: row;
  gap: 0;
  background: #0d0d14;
  border-top: 1px solid rgba(255,255,255,.07);
  overflow: hidden;           
  scrollbar-width: none;
  justify-content: flex-start;
  margin: 0;
}

.im-related-card {
  flex: 0 0 33.333%;         
  max-width: 33.333%;
  display: flex;
  flex-direction: column;
  background: transparent;
  border: none;
  border-right: 1px solid rgba(255,255,255,.06);
  cursor: pointer;
  padding: 0;
  color: #fff;
  transition: background .18s;
  position: relative;
  overflow: hidden;
}

.im-magazine-panel::-webkit-scrollbar { display: none; }
.im-related-card:last-child { border-right: none; }
.im-related-card:hover { background: rgba(255,79,129,.08); }
.im-related-card::after { content: ''; position: absolute; inset: 0; border: 2px solid transparent; border-radius: 0; transition: border-color .18s; pointer-events: none; }
.im-related-card:hover::after { border-color: rgba(255,79,129,.4); }
.im-related-img-wrap { width: 100%; aspect-ratio: 1/1; overflow: hidden; background: #1a1a28; }
.im-related-img-wrap img { width: 100%; height: 100%; object-fit: contain; transition: transform .3s; }
.im-related-card:hover .im-related-img-wrap img { transform: scale(1.08); }
.im-related-info { padding: 5px 6px 7px; display: flex; flex-direction: column; gap: 1px; background: rgba(0,0,0,.55); }
.im-related-name { font-size: 10px; font-weight: 600; color: rgba(255,255,255,.8); line-height: 1.25; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.im-related-price { font-size: 12px; font-weight: 800; color: #ff4f81; margin-top: 1px; }

.im-magazine-layout.im-no-panel .im-hero-col { flex: 1 1 auto; }
.im-magazine-layout.im-no-panel .im-wrapper { height: 82dvh; }

@keyframes im-slide-in-right  { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }
@keyframes im-slide-in-left  { from{opacity:0;transform:translateX(-40px)} to{opacity:1;transform:translateX(0)} }
@keyframes im-slide-out-left  { from{opacity:1;transform:translateX(0)} to{opacity:0;transform:translateX(-40px)} }
@keyframes im-slide-out-right { from{opacity:1;transform:translateX(0)} to{opacity:0;transform:translateX(40px)} }
.im-enter-right { animation: im-slide-in-right  .28s ease forwards; }
.im-enter-left  { animation: im-slide-in-left  .28s ease forwards; }
.im-exit-left  { animation: im-slide-out-left  .2s ease forwards; }
.im-exit-right  { animation: im-slide-out-right .2s ease forwards; }

/* Responsive */
@media (min-width: 600px) {
  .im-magazine-layout { width: min(520px, 92vw); }
  .im-wrapper { height: 54dvh; }
}

/* ── Tema claro ── */
[data-theme="light"] .im-magazine-layout { background: #ffffff; box-shadow: 0 32px 80px rgba(0,0,0,.25); }
[data-theme="light"] .im-top-bar { background: #ffffff; border-bottom-color: rgba(0,0,0,.08); }
[data-theme="light"] .im-vendor-pill { background: rgba(0,0,0,.06); color: #222; }
[data-theme="light"] .im-ver-beneficiario-btn { background: rgba(0,0,0,.06); color: #b45309; }
[data-theme="light"] .im-ver-beneficiario-btn:hover { background: rgba(249,115,22,.15); color: #9a3412; }
[data-theme="light"] .im-close { background: rgba(0,0,0,.07); color: #333; }
[data-theme="light"] .im-close:hover { background: rgba(255,79,129,.15); color: #e11d6a; }
[data-theme="light"] .im-hero-col,
[data-theme="light"] .im-wrapper { background: #f2f3f6; }
[data-theme="light"] .im-dot { background: rgba(0,0,0,.18); }
[data-theme="light"] .im-prev, [data-theme="light"] .im-next { background: rgba(255,255,255,.75); color: #333; }
[data-theme="light"] .im-prev:hover, [data-theme="light"] .im-next:hover { background: rgba(255,79,129,.5); color: #fff; }
[data-theme="light"] .im-product-info { background: #ffffff; border-top-color: rgba(0,0,0,.08); border-bottom-color: rgba(0,0,0,.08); }
[data-theme="light"] .im-info-name { color: #111318; }
[data-theme="light"] .im-info-cat { background: rgba(0,0,0,.06); color: #555; }
[data-theme="light"] .im-info-talla { color: #666; }
[data-theme="light"] .im-info-talla strong { color: #222; }
[data-theme="light"] .im-info-desc { color: #777; }
[data-theme="light"] .im-buy-btn:disabled { background: rgba(0,0,0,.07); color: rgba(0,0,0,.35); }
[data-theme="light"] .im-magazine-panel { background: #ffffff; border-top-color: rgba(0,0,0,.08); }
[data-theme="light"] .im-related-card { color: #111318; border-right-color: rgba(0,0,0,.08); }
[data-theme="light"] .im-related-card:hover { background: rgba(255,79,129,.06); }
[data-theme="light"] .im-related-img-wrap { background: #eef0f4; }
[data-theme="light"] .im-related-info { background: rgba(255,255,255,.92); }
[data-theme="light"] .im-related-name { color: #333; }
    `;
document.head.appendChild(st);
const _btnSvgSt=document.createElement('style');_btnSvgSt.textContent='button svg{vertical-align:middle;margin-right:4px;flex-shrink:0}';document.head.appendChild(_btnSvgSt);
}
}
window.shareContent = shareContent;
window.shareProduct = shareProduct;
window.highlightSharedElement = highlightSharedElement;
window.openImageModal  = openImageModal;
window.applyLayoutGlobal = applyLayoutGlobal;
window.applyTheme = applyTheme;
window.toggleTheme = toggleTheme;
window.closeImageModal = closeImageModal;
window.initImageModalControls = initImageModalControls;

function shareContent({ id, title, text, url }) {
  const shareUrl = url || `${window.location.origin}${window.location.pathname}${id ? '#producto-' + id : ''}`;
  const shareTitle = title || 'Z&R';
  const shareText = text || shareTitle;

  const copyToClipboard = () => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(`${shareText}\n${shareUrl}`)
        .then(() => showTemporaryMessage('Enlace copiado', 'success'))
        .catch(() => showTemporaryMessage('Enlace: ' + shareUrl, 'info'));
    } else {
      showTemporaryMessage('Enlace: ' + shareUrl, 'info');
    }
  };

  const canUseShareAPI = navigator.share &&
    window.isSecureContext &&
    window.location.protocol !== 'file:';

  if (canUseShareAPI) {
    navigator.share({ title: shareTitle, text: shareText, url: shareUrl })
      .catch(err => {
        if (err.name !== 'AbortError') copyToClipboard();
      });
  } else {
    copyToClipboard();
  }
}

function shareProduct(id, nombre, precio) {
  const title = nombre || 'Producto Z&R';
  const text = precio
    ? `${title} — $${Number(precio).toLocaleString()} MXN\n¡Míralo en Z&R!`
    : `${title}\n¡Míralo en Z&R!`;
  shareContent({ id, title, text });
}

// Resalta temporalmente un elemento (artículo compartido) cuando se abre desde un link directo.
// Hace scroll hasta el elemento y le agrega un brillo/pulso de 2 segundos.
function highlightSharedElement(el, duration = 2000) {
  if (!el) return;
  try {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('shared-highlight');
    setTimeout(() => el.classList.remove('shared-highlight'), duration);
  } catch (_) {}
}
function createImageObserver() {
if ("IntersectionObserver" in window) {
imageObserver = new IntersectionObserver((entries) => {
entries.forEach((entry) => {
if (entry.isIntersecting) {
const img = entry.target;
const dataSrc = img.getAttribute("data-src");
if (dataSrc) {
const newImg = new Image();
newImg.onload = () => { img.src = dataSrc; img.removeAttribute("data-src"); };
newImg.src = dataSrc;
}
imageObserver.unobserve(img);
}
});
}, { rootMargin: "50px 0px", threshold: 0.01 });
}
return imageObserver;
}
async function openWhatsAppCheckout() {
const items = Object.values(localCart);
if (items.length === 0) {
showTemporaryMessage("No hay productos en el carrito", "error");
return;
}
const hasAcceptedPrivacy = localStorage.getItem("privacy_accepted") === "true";
if (!hasAcceptedPrivacy) {
showPrivacyModal(() => continueCheckout());
return;
}
continueCheckout();
}
function _collectAddressAndSchedule() {
return new Promise(resolve => {
const saved  = localStorage.getItem('client_address')  || '';
const savedDays = localStorage.getItem('client_days')  || '';
const savedFrom = localStorage.getItem('client_hour_from')|| '';
const savedTo  = localStorage.getItem('client_hour_to')  || '';
const savedNote = localStorage.getItem('client_note')  || '';
const DAYS  = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const HOURS = ['7:00 AM','8:00 AM','9:00 AM','10:00 AM','11:00 AM','12:00 PM',
'1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM','6:00 PM',
'7:00 PM','8:00 PM','9:00 PM'];
const savedDayArr = savedDays ? savedDays.split(',') : [];
const dayBtns = DAYS.map(d => {
const active = savedDayArr.includes(d);
return `<button type="button" class="_day-btn${active?' _day-active':''}" data-day="${d}"
style="padding:6px 10px;border-radius:20px;border:1.5px solid ${active?'#ff4f81':'rgba(255,255,255,.15)'};
background:${active?'rgba(255,79,129,.18)':'transparent'};color:${active?'#ff4f81':'#aaa'};
font-size:12px;font-weight:600;cursor:pointer;transition:all .15s">${d}</button>`;
}).join('');
const hourOpts = (sel) =>HOURS.map(h =>
`<option value="${h}"${sel===h?' selected':''}>${h}</option>`
).join('');
const selectStyle = 'width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;font-family:inherit;box-sizing:border-box;appearance:none;cursor:pointer';
const overlay = document.createElement('div');
overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);z-index:20000;display:flex;align-items:flex-end;justify-content:center;overflow-y:auto';
overlay.innerHTML = `
<div style="background:var(--color-surface,#252831);border-radius:24px 24px 0 0;padding:24px 20px 40px;width:100%;max-width:500px;box-shadow:0 -10px 40px rgba(0,0,0,.5)">
<div style="width:40px;height:4px;background:rgba(255,255,255,.15);border-radius:2px;margin:0 auto 18px"></div>
<h3 style="margin:0 0 4px;font-size:18px;color:var(--color-text-primary,#fff)">Datos de entrega</h3>
<p style="margin:0 0 18px;font-size:13px;color:#888">Para coordinar tu pedido de la mejor manera.</p>
<!-- ADDRESS -->
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
<label style="font-size:12px;font-weight:600;color:#aaa;text-transform:uppercase;letter-spacing:.05em">Dirección</label>
<button type="button" id="_gps-btn" style="background:rgba(255,79,129,.12);border:1px solid rgba(255,79,129,.3);color:#ff4f81;border-radius:20px;padding:4px 12px;font-size:11px;font-weight:600;cursor:pointer"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/></svg> Usar GPS</button>
</div>
<textarea id="_addr-input" rows="2" placeholder="Calle, número, colonia, ciudad…"
style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:var(--color-text-primary,#fff);border-radius:12px;padding:12px;font-size:14px;font-family:inherit;resize:none;box-sizing:border-box;margin-bottom:16px">${escapeHtml(saved)}</textarea>
<!-- DAYS -->
<label style="display:block;font-size:12px;font-weight:600;color:#aaa;margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em">Días disponibles</label>
<div id="_days-row" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px">
${dayBtns}
</div>
<!-- HOURS -->
<label style="display:block;font-size:12px;font-weight:600;color:#aaa;margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em">Horario</label>
<div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;margin-bottom:16px">
<select id="_hour-from" style="${selectStyle}">
<option value="">Desde</option>${hourOpts(savedFrom)}
</select>
<span style="color:#aaa;font-size:13px">a</span>
<select id="_hour-to" style="${selectStyle}">
<option value="">Hasta</option>${hourOpts(savedTo)}
</select>
</div>
<!-- NOTES -->
<label style="display:block;font-size:12px;font-weight:600;color:#aaa;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Comentarios o instrucciones</label>
<textarea id="_note-input" rows="2" placeholder="Ej: Tocar el timbre 2 veces, preguntar por Juan, dejar con el vecino…"
style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:var(--color-text-primary,#fff);border-radius:12px;padding:12px;font-size:13px;font-family:inherit;resize:none;box-sizing:border-box;margin-bottom:20px">${escapeHtml(savedNote)}</textarea>
<div style="display:flex;gap:10px">
<button id="_addr-cancel" style="flex:1;padding:13px;background:rgba(255,255,255,.07);border:none;border-radius:14px;color:#aaa;font-size:14px;font-weight:600;cursor:pointer"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-x"/></svg> Cancelar</button>
<button id="_addr-confirm" style="flex:2;padding:13px;background:linear-gradient(135deg,#ff4f81,#ff7a4f);border:none;border-radius:14px;color:#fff;font-size:14px;font-weight:700;cursor:pointer"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-check"/></svg> Confirmar</button>
</div>
</div>
`;
document.body.appendChild(overlay);
setTimeout(() => overlay.querySelector('textarea').focus(), 100);
const prevLat = localStorage.getItem('client_gps_lat');
const prevLng = localStorage.getItem('client_gps_lng');
if (prevLat && prevLng && saved) {
const mapsUrl  = `https://www.google.com/maps?q=${prevLat},${prevLng}`;
const mapsLink = document.createElement('a');
mapsLink.id  = '_maps-link';
mapsLink.href  = mapsUrl;
mapsLink.target = '_blank';
mapsLink.rel  = 'noopener noreferrer';
mapsLink.style.cssText = 'display:inline-flex;align-items:center;gap:5px;font-size:12px;color:#ff4f81;text-decoration:none;font-weight:600;margin-bottom:16px';
mapsLink.innerHTML = ' Ver ubicación en Google Maps';
overlay.querySelector('#_addr-input').insertAdjacentElement('afterend', mapsLink);
}
overlay.querySelectorAll('._day-btn').forEach(btn => {
btn.addEventListener('click', () => {
const active = btn.classList.toggle('_day-active');
btn.style.border  = `1.5px solid ${active ? '#ff4f81' : 'rgba(255,255,255,.15)'}`;
btn.style.background  = active ? 'rgba(255,79,129,.18)' : 'transparent';
btn.style.color  = active ? '#ff4f81' : '#aaa';
});
});
overlay.querySelector('#_gps-btn').addEventListener('click', () => {
const gpsBtn = overlay.querySelector('#_gps-btn');
gpsBtn.innerHTML = Icon('clock') + ' Obteniendo…';
gpsBtn.disabled = true;
if (!navigator.geolocation) {
gpsBtn.textContent = ' Sin GPS';
return;
}
navigator.geolocation.getCurrentPosition(
async (pos) => {
const { latitude: lat, longitude: lng } = pos.coords;
overlay._gpsLat = lat;
overlay._gpsLng = lng;
localStorage.setItem('client_gps_lat', lat);
localStorage.setItem('client_gps_lng', lng);
let addr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
try {
const res  = await fetch(
`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`,
{ headers: { 'Accept-Language': 'es' } }
);
if (res.ok) {
const data = await res.json();
if (data.display_name) addr = data.display_name;
}
} catch {  }
overlay.querySelector('#_addr-input').value = addr;
gpsBtn.textContent = ' Ubicación obtenida';
const mapsUrl  = `https://www.google.com/maps?q=${lat},${lng}`;
let mapsLink = overlay.querySelector('#_maps-link');
if (!mapsLink) {
mapsLink = document.createElement('a');
mapsLink.id  = '_maps-link';
mapsLink.target = '_blank';
mapsLink.rel  = 'noopener noreferrer';
mapsLink.style.cssText = 'display:inline-flex;align-items:center;gap:5px;font-size:12px;color:#ff4f81;text-decoration:none;font-weight:600;margin-bottom:16px';
overlay.querySelector('#_addr-input').insertAdjacentElement('afterend', mapsLink);
}
mapsLink.href  = mapsUrl;
mapsLink.innerHTML = ' Ver ubicación en Google Maps';
gpsBtn.disabled = false;
},
() => {
gpsBtn.textContent = ' Sin permiso';
gpsBtn.disabled = false;
},
{ enableHighAccuracy: true, timeout: 10000 }
);
});
overlay.querySelector('#_addr-cancel').addEventListener('click', () => {
overlay.remove(); resolve(null);
});
overlay.querySelector('#_addr-confirm').addEventListener('click', () => {
const address = overlay.querySelector('#_addr-input').value.trim();
if (!address) {
overlay.querySelector('#_addr-input').style.borderColor = '#ef4444';
overlay.querySelector('#_addr-input').focus();
return;
}
const selectedDays = [...overlay.querySelectorAll('._day-active')].map(b => b.dataset.day);
const hourFrom = overlay.querySelector('#_hour-from').value;
const hourTo  = overlay.querySelector('#_hour-to').value;
const note  = overlay.querySelector('#_note-input').value.trim();
let schedule = '';
if (selectedDays.length) schedule += selectedDays.join(', ');
if (hourFrom && hourTo)  schedule += (schedule ? ' · ' : '') + `${hourFrom} – ${hourTo}`;
else if (hourFrom)  schedule += (schedule ? ' · ' : '') + `desde ${hourFrom}`;
else if (hourTo)  schedule += (schedule ? ' · ' : '') + `hasta ${hourTo}`;
localStorage.setItem('client_days',  selectedDays.join(','));
localStorage.setItem('client_hour_from', hourFrom);
localStorage.setItem('client_hour_to',  hourTo);
overlay.remove();
resolve({ address, schedule, note });
});
});
}
async function continueCheckout() {
const items = Object.values(localCart);
if (items.length === 0) return;
const znrItems  = items.filter(i => !i._comunidad);
const comunidadItems = items.filter(i =>  i._comunidad);
if (znrItems.length > 0) {
await _checkoutZNR(znrItems, items);
}
if (comunidadItems.length > 0) {
await _checkoutComunidad(comunidadItems);
}
}
async function _checkoutZNR(znrItems, allItems) {
let clientPhone = localStorage.getItem("client_phone");
if (!clientPhone) {
clientPhone = await new Promise(resolve => {
showCustomPrompt({
title: " Tu número de WhatsApp",
message: "Para procesar tu compra necesitamos tu número (10 dígitos).\nEjemplo: 8671234567",
icon: "",
defaultValue: "",
confirmText: "Continuar",
cancelText: "Cancelar",
onConfirm: v => resolve(v),
onCancel: () => resolve(null)
});
});
if (!clientPhone) {
showTemporaryMessage(" Necesitamos tu número para procesar la compra", "error");
return;
}
clientPhone = clientPhone.replace(/[^0-9]/g, '');
if (clientPhone.length !== 10) {
showTemporaryMessage(" Número inválido. Debe tener 10 dígitos.", "error");
return;
}
localStorage.setItem("client_phone", clientPhone);
updateSavedPhoneDisplay();
if (typeof window.solicitarPermisoNotificacionesSiFalta === 'function') {
  window.solicitarPermisoNotificacionesSiFalta('cliente', clientPhone);
}
}
let clientAddress  = localStorage.getItem("client_address")  || "";
let clientSchedule = localStorage.getItem("client_schedule") || "";
const hasShipping  = znrItems.some(i => hasFreeShipping(i.price));
if (!clientAddress) {
const addrData = await _collectAddressAndSchedule();
if (addrData) {
clientAddress  = addrData.address;
clientSchedule = addrData.schedule;
localStorage.setItem("client_address",  clientAddress);
localStorage.setItem("client_schedule", clientSchedule);
if (addrData.note !== undefined) localStorage.setItem("client_note", addrData.note);
updateSavedPhoneDisplay();
}
}
showLoader("Enviando solicitud...");
const requestId = generateRequestId();
const total = znrItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
let adminMessage = "* NUEVA SOLICITUD DE COMPRA*\n";
adminMessage += "\n";
adminMessage += ` *Cliente:* +52 ${clientPhone}\n`;
adminMessage += ` *ID Solicitud:* ${requestId}\n`;
adminMessage += ` *Fecha:* ${new Date().toLocaleString()}\n`;
if (clientAddress)  adminMessage += ` *Dirección:* ${clientAddress}\n`;
const clientGpsLat = localStorage.getItem("client_gps_lat");
const clientGpsLng = localStorage.getItem("client_gps_lng");
if (clientGpsLat && clientGpsLng) {
adminMessage += ` *Ubicación:* https://www.google.com/maps?q=${clientGpsLat},${clientGpsLng}\n`;
}
if (clientSchedule) adminMessage += ` *Horario:* ${clientSchedule}\n`;
const clientNote = localStorage.getItem("client_note") || "";
if (clientNote)  adminMessage += ` *Instrucciones:* ${clientNote}\n`;
adminMessage += "\n";
adminMessage += "* DETALLE DE PRODUCTOS:*\n\n";
znrItems.forEach((item, index) => {
const safeName  = String(item.name  || '').replace(/[\r\n]/g, ' ').trim();
const safeTalla = String(item.Talla || 'No especificada').replace(/[\r\n]/g, ' ').trim().replace(/^talla:\s*/i, '');
adminMessage += `\n`;
adminMessage += ` *${safeName}*\n`;
adminMessage += `\n`;
adminMessage += `  ID: ${item.id}\n`;
adminMessage += `  Talla: ${safeTalla}\n`;
adminMessage += `  Cantidad: ${item.quantity}\n`;
adminMessage += `  Precio: $${item.price.toLocaleString()} c/u\n`;
adminMessage += `  Subtotal: $${(item.price * item.quantity).toLocaleString()}\n`;
if (hasFreeShipping(item.price)) adminMessage += `  Envío disponible\n`;
adminMessage += `\n`;
if (index < znrItems.length - 1) adminMessage += `\n`;
});
adminMessage += "\n\n";
adminMessage += ` *TOTAL: $${total.toLocaleString()} MXN*\n`;
adminMessage += ` *Envío:* ${hasShipping ? 'Disponible (consultar)' : 'No disponible'}\n`;
adminMessage += "\n";
if (typeof saveOrderToHistory === 'function') {
saveOrderToHistory({
requestId, timestamp: Date.now(), status: 'pendiente', total,
items: znrItems.map(i => ({ name: i.name, quantity: i.quantity, price: i.price }))
});
}
// El administrador ya recibe una notificación push automática (ver más abajo,
// action: "createNotification"). Ya NO abrimos WhatsApp en paralelo aquí:
// WhatsApp queda como respaldo y solo se ofrece si el push no llega
// (eso lo maneja el propio backend / centro de notificaciones).
try {
await fetch(API_URL, {
method: "POST",
body: JSON.stringify({ action: "saveClientPhone", requestId: requestId, phone: clientPhone })
});
const notificationItems = znrItems.map(item => ({
productId: item.id,
nombre:  item.name,
cantidad:  item.quantity,
imagen:  item.Imagen1 || "",
talla:  item.Talla  || "",
precio:  item.price  || 0
}));
await fetch(API_URL, {
method: "POST",
body: JSON.stringify({ action: "createNotification", items: notificationItems, requestId: requestId })
});
znrItems.forEach(i => delete localCart[i.id]);
saveCartToStorage();
updateCartBadge();
renderCart();
showTemporaryMessage(
` ¡Solicitud Z&R enviada! Te notificaremos en cuanto el administrador confirme tu pedido.`,
"success"
);
} catch(err) {
console.error("Error checkout Z&R:", err);
showTemporaryMessage(" Error al enviar la solicitud Z&R", "error");
} finally {
hideLoader();
}
}
async function _checkoutComunidad(comunidadItems) {
let clientPhone = localStorage.getItem("client_phone") || "";
if (!clientPhone) {
clientPhone = await new Promise(resolve => {
showCustomPrompt({
title: " Tu número de WhatsApp",
message: "Para que el vendedor te contacte necesitamos tu número (10 dígitos).\nEjemplo: 8671234567",
icon: "",
defaultValue: "",
confirmText: "Continuar",
cancelText: "Cancelar",
onConfirm: v => resolve(v),
onCancel: () => resolve(null)
});
});
if (!clientPhone) {
showTemporaryMessage(" Necesitamos tu número para contactar al vendedor", "error");
return;
}
clientPhone = clientPhone.replace(/[^0-9]/g, '');
if (clientPhone.length !== 10) {
showTemporaryMessage(" Número inválido. Debe tener 10 dígitos.", "error");
return;
}
localStorage.setItem("client_phone", clientPhone);
updateSavedPhoneDisplay();
if (typeof window.solicitarPermisoNotificacionesSiFalta === 'function') {
  window.solicitarPermisoNotificacionesSiFalta('cliente', clientPhone);
}
}
const byVendor = new Map();
comunidadItems.forEach(item => {
const tel  = item._vendorTel || "";
const nombre = item._vendedor  || "Vendedor";
const logo  = item._vendorLogo || "";
const plan  = item._vendorPlan || "";
const vendorUid = item._vendorUid || "";
const key  = tel || nombre;
if (!byVendor.has(key)) byVendor.set(key, { tel, nombre, logo, plan, vendorUid, items: [] });
byVendor.get(key).items.push(item);
});
const vendors  = Array.from(byVendor.values());
const firstVendor = vendors[0];
const remaining  = vendors.length - 1;
const { tel, nombre, logo, plan, vendorUid, items } = firstVendor;
const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

// Agrupar los artículos donados de este vendedor por beneficiario: ese dinero se paga directo a su cuenta, no al vendedor
const donationGroups = new Map();
items.forEach(item => {
if (item._donacion && item._beneficiario && item._beneficiario.id) {
const bid = item._beneficiario.id;
if (!donationGroups.has(bid)) donationGroups.set(bid, { beneficiario: item._beneficiario, items: [], total: 0 });
const g = donationGroups.get(bid);
g.items.push(item);
g.total += item.price * item.quantity;
}
});
const donationList = Array.from(donationGroups.values());

let msg = "* PEDIDO DESDE Z&R COMUNIDAD*\n";
msg += "\n";
msg += ` *Cliente:* +52 ${clientPhone}\n`;
msg += ` *Fecha:* ${new Date().toLocaleString()}\n`;
const _cAddr2  = localStorage.getItem("client_address")  || "";
const _cSchedule2 = localStorage.getItem("client_schedule") || "";
const _cNote2  = localStorage.getItem("client_note")  || "";
const _cLat2  = localStorage.getItem("client_gps_lat");
const _cLng2  = localStorage.getItem("client_gps_lng");
if (_cAddr2)  msg += ` *Dirección:* ${_cAddr2}\n`;
if (_cLat2 && _cLng2) msg += ` *Ubicación:* https://www.google.com/maps?q=${_cLat2},${_cLng2}\n`;
if (_cSchedule2)  msg += ` *Horario:* ${_cSchedule2}\n`;
if (_cNote2)  msg += ` *Instrucciones:* ${_cNote2}\n`;
msg += "\n";
msg += "*\uD83D\uDCE6 PRODUCTOS SOLICITADOS:*\n\n";
items.forEach((item, idx) => {
const safeName  = String(item.name  || '').replace(/[\r\n]/g, ' ').trim();
const safeTalla = String(item.Talla || 'No especificada').replace(/[\r\n]/g, ' ').trim().replace(/^talla:\s*/i, '');
msg += "\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n";
msg += `\u2502 *${safeName}*${item._donacion ? ' \u2764\uFE0F Donativo' : ''}\n`;
msg += "\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524\n";
msg += `\u2502 \uD83D\uDCCF Info: ${safeTalla}\n`;
msg += `\u2502 \uD83D\uDD22 Cantidad: ${item.quantity}\n`;
msg += `\u2502 \uD83D\uDCB0 Precio: $${item.price.toLocaleString()} c/u\n`;
msg += `\u2502 \uD83D\uDCB5 Subtotal: $${(item.price * item.quantity).toLocaleString()}\n`;
msg += "\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518\n";
if (idx < items.length - 1) msg += "\n";
});
msg += "\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n";
msg += `\uD83D\uDCB0 *TOTAL: $${subtotal.toLocaleString()} MXN*\n`;
msg += "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n";
if (donationList.length > 0) {
msg += "\n\u2764\uFE0F *Este pedido incluye producto(s) donado(s).*\n";
msg += "El pago de esos artículos se transfiere directo al beneficiario, no al vendedor:\n\n";
donationList.forEach(g => {
msg += ` *${g.beneficiario.nombre || 'Beneficiario'}* — $${g.total.toLocaleString()} MXN\n`;
if (g.beneficiario.cuenta_bancaria) msg += ` Cuenta: ${g.beneficiario.cuenta_bancaria}\n`;
});
msg += "\n";
}
msg += "_Pedido realizado a través de Z&R Comunidad_";
const destTel = tel ? `52${tel}` : "";
const waUrl  = destTel ? `https://wa.me/${destTel}?text=${encodeURIComponent(msg)}` : null;
const requestId = generateRequestId();
const notifItems = items.map(i => ({
productId: i.id, nombre: i.name, cantidad: i.quantity,
talla: i.Talla || '', precio: i.price || 0, imagen: i.Imagen1 || ''
}));
const didOpen = await _showVendorCheckoutModal({
nombre, logo, plan, subtotal, items, waUrl, remaining, donationList,
vendorUid, requestId, notifItems, clientPhone: localStorage.getItem("client_phone") || ""
});
if (didOpen) {
items.forEach(i => delete localCart[i.id]);
saveCartToStorage();
updateCartBadge();
renderCart();
if (remaining === 0) {
closeCartDrawer();
} else {
// Sigue automáticamente con el siguiente vendedor, igual que se hace
// entre Z&R y Comunidad, en vez de dejarlo esperando a un segundo clic.
const nextItems = Object.values(localCart).filter(i => i._comunidad);
if (nextItems.length > 0) {
await _checkoutComunidad(nextItems);
}
}
}
}
function _showVendorCheckoutModal({ nombre, logo, plan, subtotal, items, waUrl, remaining, donationList = [], vendorUid, requestId, notifItems, clientPhone }) {
return new Promise(resolve => {
const old = document.getElementById('vendor-checkout-modal');
if (old) old.remove();
const modal = document.createElement('div');
modal.id = 'vendor-checkout-modal';
modal.style.cssText = `
position:fixed;inset:0;
background:rgba(0,0,0,.65);
backdrop-filter:blur(6px);
z-index:99999;
display:flex;align-items:flex-end;justify-content:center;
`;
const itemsHtml = items.map(i => `
<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.07)">
<div style="flex:1;min-width:0">
<div style="font-size:13px;font-weight:600;color:var(--color-text-primary,#fff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(i.name)}${i._donacion ? ` <span style="color:#f97316;font-weight:700;">${Icon('heart-fill')} Donativo</span>` : ''}</div>
<div style="font-size:12px;color:#aaa">${i.Talla ? ' ' + escapeHtml(i.Talla) + ' · ' : ''} ${i.quantity} × ${formatCurrency(i.price)}</div>
</div>
<div style="font-size:13px;font-weight:700;color:#ff4f81;white-space:nowrap">${formatCurrency(i.price * i.quantity)}</div>
</div>
`).join('');
const remainingNote = remaining > 0
? `<p style="margin:14px 0 0;padding:10px 14px;background:rgba(249,115,22,.1);border-radius:10px;font-size:12px;color:#f97316;text-align:center;line-height:1.5">Tienes artículos de <strong>${remaining}</strong> vendedor${remaining > 1 ? 'es' : ''} más en tu carrito.<br>Después de contactar a este, regresa para continuar.
</p>`
: '';
const hasDonations = donationList.length > 0;
const allDonated = hasDonations && items.every(i => i._donacion);
const donationHtml = hasDonations ? `
<div style="background:rgba(249,115,22,.1);border:1px solid rgba(249,115,22,.25);border-radius:14px;padding:14px;margin-bottom:8px">
<div style="font-size:12.5px;font-weight:700;color:#f97316;margin-bottom:8px;">${Icon('heart-fill')} Pago de artículo(s) donado(s)</div>
<p style="font-size:11.5px;color:#fdba74;margin:0 0 10px;line-height:1.5">Este dinero se transfiere directo al beneficiario, no al vendedor.</p>
${donationList.map((g, gi) => `
<div style="background:rgba(0,0,0,.18);border-radius:10px;padding:10px 12px;${gi > 0 ? 'margin-top:8px;' : ''}">
<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
<span style="font-size:13px;font-weight:700;color:#fff;">${escapeHtml(g.beneficiario.nombre || 'Beneficiario')}</span>
<span style="font-size:13px;font-weight:800;color:#f97316;white-space:nowrap;">${formatCurrency(g.total)}</span>
</div>
${g.beneficiario.cuenta_bancaria ? `
<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:6px;background:rgba(255,255,255,.06);border-radius:8px;padding:7px 10px;">
<span style="font-size:12.5px;color:#fed7aa;letter-spacing:.02em;word-break:break-all;">${escapeHtml(g.beneficiario.cuenta_bancaria)}</span>
<button class="vcm-copy-cuenta" data-cuenta="${escapeHtml(g.beneficiario.cuenta_bancaria)}" style="flex-shrink:0;background:#f97316;color:#fff;border:none;border-radius:8px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer;">Copiar</button>
</div>` : `<div style="font-size:11.5px;color:#fdba74;margin-top:4px;">Sin cuenta registrada — coordina el pago con el vendedor.</div>`}
</div>
`).join('')}
</div>
` : '';
modal.innerHTML = `
<div style="
background:var(--color-surface,#252831);
border-radius:24px 24px 0 0;
padding:24px 20px 40px;
width:100%;max-width:480px;
box-shadow:0 -10px 40px rgba(0,0,0,.5);
max-height:85vh;overflow-y:auto;
">
<div style="width:40px;height:4px;background:rgba(255,255,255,.15);border-radius:2px;margin:0 auto 20px"></div>
<div style="display:flex;align-items:center;gap:12px;margin-bottom:18px">
<div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#3b1f5f);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden">${(plan === 'plus' && logo)
  ? `<img src="${escapeAttr(logo)}" alt="" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'; this.parentElement.textContent='${escapeAttr(String(nombre || '').trim().split(/\s+/).map(w => w[0]).slice(0,2).join('').toUpperCase() || '?')}';">`
  : `<span style="font-size:16px;font-weight:800;color:#fff">${escapeHtml(String(nombre || '').trim().split(/\s+/).map(w => w[0]).slice(0,2).join('').toUpperCase() || '?')}</span>`}</div>
<div>
<div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px">Pedido para</div>
<div style="font-size:17px;font-weight:700;color:var(--color-text-primary,#fff)">${escapeHtml(nombre)}</div>
</div>
</div>
<div style="background:rgba(255,255,255,.04);border-radius:14px;padding:12px 14px;margin-bottom:8px">
${itemsHtml}
<div style="display:flex;justify-content:space-between;align-items:center;padding-top:10px;margin-top:6px">
<span style="font-size:13px;color:#aaa">Total a coordinar</span>
<span style="font-size:18px;font-weight:800;color:#ff4f81">${formatCurrency(subtotal)}</span>
</div>
</div>
${donationHtml}
<p style="font-size:12px;color:#888;text-align:center;margin:8px 0 0;line-height:1.5">${allDonated
? 'El vendedor solo coordinará contigo la entrega; el pago va directo al beneficiario.'
: hasDonations
? 'El vendedor coordinará la entrega y el pago de lo que no es donativo; lo donado se paga directo al beneficiario.'
: 'El vendedor coordinará contigo el método de pago y la entrega.'}
</p>
${remainingNote}
<div id="vcm-status" style="display:none;padding:12px 14px;border-radius:14px;font-size:12.5px;text-align:center;line-height:1.5;margin-top:14px;"></div>
<div style="display:flex;flex-direction:column;gap:10px;margin-top:20px">
${vendorUid || waUrl
? `<button id="vcm-send-btn"
style="display:flex;align-items:center;justify-content:center;gap:10px;
padding:15px;border-radius:16px;border:none;
background:linear-gradient(135deg,#ff4f81,#7c3aed);
color:#fff;font-size:15px;font-weight:700;
cursor:pointer;-webkit-tap-highlight-color:transparent">
${Icon('bell', {size:20})}Enviar pedido a ${escapeHtml(nombre)}
</button>`
: `<div style="padding:14px;border-radius:16px;background:rgba(239,68,68,.12);color:#ef4444;text-align:center;font-size:13px;line-height:1.5">Este vendedor no tiene forma de contacto registrada.<br>Búscalo directamente en la sección Comunidad.
</div>`
}
<button id="vcm-back-btn"
style="padding:13px;border-radius:16px;background:rgba(255,255,255,.07);
border:1.5px solid rgba(255,255,255,.1);
color:#aaa;font-size:14px;font-weight:600;cursor:pointer;
-webkit-tap-highlight-color:transparent">
${remaining > 0
? `${Icon('arrow-left')} Volver al carrito · ${remaining} vendedor${remaining > 1 ? 'es' : ''} más`
: `${Icon('arrow-left')} Volver al carrito`}
</button>
</div>
</div>
`;
document.body.appendChild(modal);
modal.querySelectorAll('.vcm-copy-cuenta').forEach(btn => {
btn.addEventListener('click', () => {
const cuenta = btn.dataset.cuenta || '';
if (navigator.clipboard && window.isSecureContext) {
navigator.clipboard.writeText(cuenta).then(() => showTemporaryMessage(' Cuenta copiada', 'success'));
} else {
showTemporaryMessage(cuenta, 'info');
}
});
});
const statusBox = modal.querySelector('#vcm-status');
const showStatus = (text, kind) => {
if (!statusBox) return;
const colors = {
success: { bg: 'rgba(34,197,94,.12)', fg: '#22c55e' },
info:  { bg: 'rgba(255,255,255,.06)', fg: '#ccc' },
error: { bg: 'rgba(239,68,68,.12)', fg: '#ef4444' }
};
const c = colors[kind] || colors.info;
statusBox.style.display = 'block';
statusBox.style.background = c.bg;
statusBox.style.color = c.fg;
statusBox.textContent = text;
};
const sendBtn = modal.querySelector('#vcm-send-btn');
if (sendBtn) {
sendBtn.addEventListener('click', async () => {
sendBtn.disabled = true;
sendBtn.style.opacity = '.7';
sendBtn.textContent = 'Enviando notificación…';
let enviados = 0;
let ok = false;
try {
if (vendorUid && window.API_URL) {
const res = await fetch(window.API_URL, {
method: "POST",
body: JSON.stringify({
action: "crearNotificacionVentaComunidad",
vendor_uid: vendorUid,
requestId: requestId,
clientPhone: clientPhone || "",
items: notifItems
})
});
const data = await res.json();
ok = !!(data && data.ok);
enviados = (data && data.enviados) || 0;
}
} catch (err) {
console.error("No se pudo notificar al vendedor:", err);
}
if (ok && enviados > 0) {
// Push entregado: WhatsApp NO se usa, es solo respaldo.
showStatus(` Notificamos a ${nombre}. Te avisaremos aquí mismo en cuanto confirme.`, 'success');
setTimeout(() => { modal.remove(); resolve(true); }, 1200);
} else if (waUrl) {
// Respaldo: el push no llegó a ningún dispositivo del vendedor.
showStatus(' No pudimos notificar a este vendedor por la app, así que se abrirá WhatsApp para contactarlo directo.', 'info');
window.open(waUrl, '_blank');
setTimeout(() => { modal.remove(); resolve(true); }, 900);
} else {
showStatus(' No pudimos notificar a este vendedor. Intenta de nuevo más tarde o búscalo en Comunidad.', 'error');
sendBtn.disabled = false;
sendBtn.style.opacity = '1';
sendBtn.innerHTML = `${Icon('bell')} Enviar pedido a ${nombre}`;
}
});
}
modal.querySelector('#vcm-back-btn').addEventListener('click', () => {
modal.remove();
resolve(false);
});
});
}
async function fetchProductsAPI(shouldIndex = false) {
const cached = getCachedProducts();
if (cached && cached.length > 0) {
if (shouldIndex) buildProductIndex(cached);
return cached;
}
try {
const res = await fetch(API_URL);
const data = await res.json();
const raw = data.products || data || [];
const products = raw.filter(validateProduct);
if (products.length < raw.length) {
console.warn(` Se filtraron ${raw.length - products.length} productos inválidos`);
}
setCachedProducts(products);
if (shouldIndex) buildProductIndex(products);
return products;
} catch (err) {
console.error("Error fetching products:", err);
return [];
}
}
async function getIndexedProducts(forceRefresh = false) {
if (forceRefresh || !allProductsIndexed.length) {
await fetchProductsAPI(true);
}
return allProductsIndexed;
}
async function loadProductsUnified({ onProducts, onError, force = false, page = 1, limit = 10, filters = {} } = {}) {
  // Determinar si esta es una petición con filtros/paginación o una carga simple
  const hasPagination = page > 1 || limit !== 10 || Object.keys(filters).length > 0;

  // Construir URL con todos los parámetros
  function buildUrl() {
    const url = new URL(API_URL);
    url.searchParams.set('action', 'list');
    url.searchParams.set('page', page);
    url.searchParams.set('limit', limit);
    Object.entries(filters).forEach(([k, v]) => { if (v) url.searchParams.set(k, v); });
    return url.toString();
  }

  const deliver = (products, fromCache, meta) => {
    buildProductIndex(products);
    window.allProducts = products;
    onProducts(products, fromCache, meta || null);
  };

  // Solo usamos caché cuando es la carga inicial sin filtros ni paginación
  if (!force && !hasPagination) {
    const cached = getCachedProducts();
    if (cached && cached.length > 0) {
      // Fabricar un meta aproximado para la primera carga desde caché
      const cachedMeta = { page: 1, totalPages: 1, total: cached.length };
      deliver(cached, true, cachedMeta);
      // Actualizar en background si hay conexión
      if (navigator.onLine) {
        fetch(buildUrl())
          .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
          .then(data => {
            const fresh = data.products || [];
            const meta = { page: data.page || 1, totalPages: data.totalPages || 1, total: data.total || fresh.length };
            if (JSON.stringify(fresh) !== JSON.stringify(cached)) {
              setCachedProducts(fresh);
              deliver(fresh, false, meta);
            }
          })
          .catch(() => {});
      }
      return;
    }
  }

  // Sin conexión: intentar datos guardados (solo para carga inicial)
  if (!navigator.onLine) {
    const stale = (() => {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        return raw ? JSON.parse(raw).data : null;
      } catch { return null; }
    })();
    if (stale && stale.length) {
      deliver(stale, true, { page: 1, totalPages: 1, total: stale.length });
      return;
    }
    if (onError) onError(new Error('offline'));
    return;
  }

  // Petición real al backend con page/limit/filters
  try {
    showLoader('Cargando productos...');
    const res = await fetch(buildUrl());
    const data = await res.json();
    const products = data.products || [];
    const meta = {
      page: data.page || page,
      totalPages: data.totalPages || 1,
      total: data.total || products.length
    };
    // Solo guardamos en caché la primera página sin filtros
    if (page === 1 && Object.keys(filters).length === 0) {
      setCachedProducts(products);
    }
    deliver(products, false, meta);
  } catch (err) {
    console.error('loadProductsUnified error:', err);
    if (onError) onError(err);
  } finally {
    hideLoader();
  }
}
function createConnectionBanner() {
if (connectionBanner) return;
connectionBanner = document.createElement('div');
connectionBanner.id = 'connection-banner';
connectionBanner.style.cssText = `
position: fixed;
top: 0;
left: 0;
right: 0;
z-index: 10001;
padding: 12px 16px;
text-align: center;
font-size: 14px;
font-weight: 500;
transform: translateY(-100%);
transition: transform 0.3s ease;
display: flex;
align-items: center;
justify-content: center;
gap: 12px;
flex-wrap: wrap;
`;
document.body.insertBefore(connectionBanner, document.body.firstChild);
}
function showOfflineBanner() {
if (!connectionBanner) createConnectionBanner();
connectionBanner.style.background = '#ffebee';
connectionBanner.style.color = '#c62828';
connectionBanner.style.borderBottom = '2px solid #ef5350';
connectionBanner.innerHTML = `
<span style="font-size: 20px;"></span>
<span><strong>Modo offline</strong> - Estás viendo una versión guardada del catálogo</span>
<button id="dismiss-offline-btn" style="
background: rgba(198, 40, 40, 0.1);
border: 1px solid #ef5350;
padding: 4px 12px;
border-radius: 20px;
color: #c62828;
cursor: pointer;
font-size: 12px;
"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-check"/></svg> Entendido</button>
`;
connectionBanner.style.transform = 'translateY(0)';
connectionBanner.style.display = 'flex';
const dismissBtn = document.getElementById('dismiss-offline-btn');
if (dismissBtn) {
dismissBtn.onclick = () => {
connectionBanner.style.transform = 'translateY(-100%)';
sessionStorage.setItem('offline_banner_dismissed', Date.now().toString());
setTimeout(() => {
if (connectionBanner) connectionBanner.style.display = 'none';
}, 300);
};
}
addOfflineIndicator();
}
function showOnlineBanner() {
if (!connectionBanner) createConnectionBanner();
connectionBanner.style.background = '#e8f5e9';
connectionBanner.style.color = '#2e7d32';
connectionBanner.style.borderBottom = '2px solid #4caf50';
connectionBanner.innerHTML = `
<span style="font-size: 20px;"></span>
<span><strong>¡Conexión restablecida!</strong>La página se actualizará automáticamente</span>
<button id="refresh-now-btn" style="
background: #4caf50;
border: none;
padding: 6px 16px;
border-radius: 20px;
color: white;
cursor: pointer;
font-size: 12px;
font-weight: 500;
"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-refresh"/></svg> Actualizar ahora</button>
`;
connectionBanner.style.transform = 'translateY(0)';
connectionBanner.style.display = 'flex';
setTimeout(() => {
if (connectionBanner && connectionBanner.style.transform !== 'translateY(-100%)') {
connectionBanner.style.transform = 'translateY(-100%)';
setTimeout(() => {
if (connectionBanner) connectionBanner.style.display = 'none';
}, 300);
}
}, 5000);
const refreshBtn = document.getElementById('refresh-now-btn');
if (refreshBtn) {
refreshBtn.onclick = () => {
window.location.reload();
};
}
removeOfflineIndicator();
}
function addOfflineIndicator() {
let indicator = document.getElementById('offline-mode-indicator');
if (indicator) return;
indicator = document.createElement('div');
indicator.id = 'offline-mode-indicator';
indicator.style.cssText = `
position: fixed;
bottom: 70px;
left: 16px;
background: rgba(0, 0, 0, 0.75);
backdrop-filter: blur(8px);
padding: 6px 12px;
border-radius: 20px;
font-size: 11px;
color: #ffeb3b;
z-index: 1000;
display: flex;
align-items: center;
gap: 6px;
font-weight: 500;
pointer-events: none;
`;
indicator.innerHTML = ' <span>Modo offline</span>';
document.body.appendChild(indicator);
}
function removeOfflineIndicator() {
const indicator = document.getElementById('offline-mode-indicator');
if (indicator) indicator.remove();
}
function startConnectionMonitor() {
setInterval(() => {
const wasOnline = isOnline;
isOnline = navigator.onLine;
if (wasOnline !== isOnline) {
if (!isOnline) {
showOfflineBanner();
window.dispatchEvent(new CustomEvent('connection:offline'));
} else {
showOnlineBanner();
window.dispatchEvent(new CustomEvent('connection:online'));
if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname === '') {
if (typeof fetchProducts === 'function') {
fetchProducts(true);
}
} else if (window.location.pathname.includes('looks.html')) {
if (typeof loadProducts === 'function') {
loadProducts();
}
}
}
}
}, 3000);
window.addEventListener('online', () => {
isOnline = true;
});
window.addEventListener('offline', () => {
isOnline = false;
showOfflineBanner();
});
}
async function registerServiceWorker() {
if (!('serviceWorker' in navigator)) {
return false;
}
try {
const registration = await navigator.serviceWorker.register('/ZNR/sw.js', {
scope: '/ZNR/'
});
navigator.serviceWorker.addEventListener('message', event => {
if (event.data.type === 'CONNECTION_STATUS') {
}
});
return true;
} catch (error) {
console.error(' Error registrando SW:', error);
return false;
}
}
window.changePhoneNumber = changePhoneNumber;
window.updateSavedPhoneDisplay = updateSavedPhoneDisplay;
window.openCartDrawer = openCartDrawer;
window.closeCartDrawer = closeCartDrawer;
window.renderCart = renderCart;
window.addToCart = addToCart;
window.escapeHtml = escapeHtml;
async function checkIfOfflineMode() {
if (!('serviceWorker' in navigator)) return false;
try {
const registration = await navigator.serviceWorker.ready;
const cache = await caches.open('zr-cache-v1');
const cachedResponse = await cache.match(window.location.href);
if (cachedResponse && !navigator.onLine) {
showOfflineBanner();
return true;
}
} catch (err) {
}
if (!navigator.onLine) {
showOfflineBanner();
return true;
}
return false;
}
window.ConnectionMonitor = {
showOfflineBanner,
showOnlineBanner,
startConnectionMonitor,
registerServiceWorker,
checkIfOfflineMode,
isOnline: () => navigator.onLine
};
document.addEventListener('DOMContentLoaded', async () => {
loadCartFromStorage();
if (typeof updateWishlistBadge === 'function') updateWishlistBadge();
createImageObserver();
if (typeof renderCart === 'function') {
renderCart();
}
const floatingCartBtn = document.getElementById("floating-cart-btn");
if (floatingCartBtn) floatingCartBtn.addEventListener("click", openCartDrawer);
const closeCartBtn = document.getElementById("close-cart-btn");
if (closeCartBtn) closeCartBtn.addEventListener("click", closeCartDrawer);
const requestPurchaseBtn = document.getElementById("request-purchase-btn");
if (requestPurchaseBtn) requestPurchaseBtn.addEventListener("click", () => {
if (typeof window.openWhatsAppCheckout === 'function') window.openWhatsAppCheckout();
});
const changePhoneBtn = document.getElementById("change-phone-btn");
if (changePhoneBtn) changePhoneBtn.addEventListener("click", changePhoneNumber);
const changeAddrBtn  = document.getElementById("change-address-btn");
const addAddrBtn  = document.getElementById("cart-add-address-btn");
async function _handleAddressEdit() {
const data = await _collectAddressAndSchedule();
if (data) {
localStorage.setItem("client_address",  data.address);
localStorage.setItem("client_schedule", data.schedule);
if (data.note !== undefined) localStorage.setItem("client_note", data.note);
updateSavedPhoneDisplay();
}
}
if (changeAddrBtn) changeAddrBtn.addEventListener("click", _handleAddressEdit);
if (addAddrBtn)  addAddrBtn.addEventListener("click",  _handleAddressEdit);
const overlay = document.getElementById("overlay");
if (overlay) {
const newOverlay = overlay.cloneNode(true);
overlay.parentNode.replaceChild(newOverlay, overlay);
newOverlay.addEventListener("click", () => {
if (typeof closeCartDrawer === 'function') closeCartDrawer();
const wishlistDrawer = document.getElementById("wishlist-drawer");
if (wishlistDrawer && wishlistDrawer.classList.contains("open")) {
wishlistDrawer.classList.remove("open");
}
const looksWishlistDrawer = document.getElementById("wishlist-looks-drawer");
if (looksWishlistDrawer && looksWishlistDrawer.classList.contains("open")) {
looksWishlistDrawer.classList.remove("open");
}
if (typeof closeImageModal === 'function') closeImageModal();
newOverlay.classList.remove("visible");
});
}
initImageModalControls();
updateSavedPhoneDisplay();
const deferTask = (task) => {
if (window.requestIdleCallback) {
requestIdleCallback(task, { timeout: 3000 });
} else {
setTimeout(task, 100);
}
};
deferTask(() => {
if (window.CacheManager && window.CacheManager.initPreloading) {
window.CacheManager.initPreloading();
}
});
deferTask(async () => {
await registerServiceWorker();
});
deferTask(() => {
startConnectionMonitor();
});
deferTask(async () => {
await checkIfOfflineMode();
});
window.addEventListener('cartUpdated', () => {
if (typeof renderCart === 'function') renderCart();
updateCartBadge();
});
window.addEventListener('connection:offline', () => {
});
window.addEventListener('connection:online', () => {
if (typeof loadProductsInBackground === 'function') {
deferTask(() => loadProductsInBackground());
}
});
});
function initTheme() {
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);
const savedLayout = localStorage.getItem('products_layout') || 'list';
applyLayoutGlobal(savedLayout);
}
function updateThemeIcon(theme) {
const moonSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" aria-hidden="true"><use href="#ic-moon"/></svg>';
const sunSvg  = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" aria-hidden="true"><use href="#ic-sun"/></svg>';
document.querySelectorAll('#theme-toggle').forEach(btn => {
btn.innerHTML = theme === 'dark' ? moonSvg : sunSvg;
});
document.querySelectorAll('.up-theme-btn').forEach(btn => {
btn.classList.toggle('active', btn.dataset.theme === theme);
});
}
function toggleTheme() {
const currentTheme = document.documentElement.getAttribute('data-theme');
const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
document.documentElement.setAttribute('data-theme', newTheme);
localStorage.setItem('theme', newTheme);
updateThemeIcon(newTheme);
}
function applyLayoutGlobal(layout) {
const isGrid = layout === 'grid';
const productsContainer = document.getElementById('products-container');
if (productsContainer) {
productsContainer.classList.toggle('layout-grid', isGrid);
}
const layoutBtn = document.getElementById('layout-toggle-btn');
if (layoutBtn) layoutBtn.textContent = isGrid ? '' : '';
const looksContainer = document.getElementById('looks-container');
if (looksContainer) {
looksContainer.classList.toggle('layout-grid', isGrid);
localStorage.setItem('looks_layout', layout);
}
const layoutLooksBtn = document.getElementById('layout-toggle-looks');
if (layoutLooksBtn) layoutLooksBtn.textContent = isGrid ? '' : '≡';
const comunidadGrid = document.getElementById('comunidad-grid');
if (comunidadGrid) {
comunidadGrid.classList.toggle('layout-list', !isGrid);
const ltComBtn = document.getElementById('layout-toggle-comunidad');
if (ltComBtn) ltComBtn.textContent = isGrid ? '' : '≡';
}
const homeComGrid = document.getElementById('home-comunidad-grid');
if (homeComGrid) {
homeComGrid.classList.toggle('layout-list', !isGrid);
homeComGrid.classList.toggle('layout-grid', isGrid);
homeComGrid.style.gridTemplateColumns = isGrid ? '' : '1fr';
}
const featuredGrid = document.getElementById('featured-products');
if (featuredGrid) {
featuredGrid.classList.toggle('layout-list', !isGrid);
}
document.querySelectorAll('.up-layout-btn').forEach(btn => {
btn.classList.toggle('active', btn.dataset.layout === layout);
});
window.dispatchEvent(new CustomEvent('layoutChanged', { detail: { layout } }));
}
if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', () => {
initTheme();
});
} else {
initTheme();
}
window.buildProductIndex = buildProductIndex;
window._commonBuildProductIndex = buildProductIndex;
window.getProductsByCategoryIndexed = getProductsByCategoryIndexed;
window.getIndexedProducts = getIndexedProducts;
window.clearProductIndex = clearProductIndex;
window.loadProductsUnified = loadProductsUnified;
Object.defineProperty(window, 'allProductsIndexed', { get: () => allProductsIndexed, configurable: true });
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
e.preventDefault();
deferredPrompt = e;
setTimeout(() => {
showPWAInstallButton();
}, 2000);
});
function showPWAInstallButton() {
if (document.getElementById('pwa-install-btn')) return;
const installBtn = document.createElement('button');
installBtn.id = 'pwa-install-btn';
installBtn.innerHTML = ' Instalar App Z&R';
installBtn.style.cssText = `
position: fixed;
bottom: 90px;
left: 16px;
background: linear-gradient(135deg, #ff4f81, #ff7a4f);
color: white;
border: none;
border-radius: 50px;
padding: 12px 20px;
font-size: 14px;
font-weight: 600;
cursor: pointer;
z-index: 9999;
box-shadow: 0 4px 15px rgba(0,0,0,0.2);
display: flex;
align-items: center;
gap: 8px;
animation: slideInLeft 0.3s ease;
`;
installBtn.onclick = async () => {
if (!deferredPrompt) return;
installBtn.style.display = 'none';
deferredPrompt.prompt();
const { outcome } = await deferredPrompt.userChoice;
deferredPrompt = null;
};
document.body.appendChild(installBtn);
setTimeout(() => {
if (installBtn && installBtn.parentNode) {
installBtn.style.opacity = '0';
setTimeout(() => installBtn.remove(), 300);
}
}, 15000);
}
if (window.matchMedia('(display-mode: standalone)').matches) {
document.body.classList.add('pwa-mode');
}
const style = document.createElement('style');
style.textContent = `
@keyframes slideInLeft {
from {
opacity: 0;
transform: translateX(-100px);
}
to {
opacity: 1;
transform: translateX(0);
}
}
`;
document.head.appendChild(style);
function addToRecentProducts(productId) {
if (!productId) return;
try {
let recent = JSON.parse(localStorage.getItem(RECENT_PRODUCTS_KEY) || '[]');
recent = recent.filter(id =>String(id) !== String(productId));
recent.unshift(String(productId));
recent = recent.slice(0, MAX_RECENT_PRODUCTS);
localStorage.setItem(RECENT_PRODUCTS_KEY, JSON.stringify(recent));

window.dispatchEvent(new CustomEvent('recentProductsUpdated'));
} catch(e) {
console.warn('Error guardando producto reciente:', e);
}
}
function getRecentProductIds() {
try {
return JSON.parse(localStorage.getItem(RECENT_PRODUCTS_KEY) || '[]');
} catch(e) {
return [];
}
}
function getRecentProducts(allProductsArray) {
const recentIds = getRecentProductIds();
const recentProducts = [];
for (const id of recentIds) {
const product = allProductsArray.find(p =>String(p.ID) === String(id));
if (product && product.Stock > 0 && product.Stock !== "0") {
recentProducts.push(product);
}
}
return recentProducts;
}
function clearRecentProducts() {
localStorage.removeItem(RECENT_PRODUCTS_KEY);
window.dispatchEvent(new CustomEvent('recentProductsUpdated'));
showTemporaryMessage(' Historial de productos recientes eliminado', 'info');
}
const WISHLIST_KEY = 'zr_wishlist';
function getWishlist() {
try { return JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]'); }
catch { return []; }
}
function saveWishlist(list) {
localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
updateWishlistBadge();
window.dispatchEvent(new CustomEvent('wishlistUpdated'));
}
function isInWishlist(productId) {
return getWishlist().some(item => item.id === String(productId));
}
function toggleWishlist(product) {
const id = String(product.ID || product.id);
let list = getWishlist();
const idx = list.findIndex(item => item.id === id);
if (idx >= 0) {
list.splice(idx, 1);
saveWishlist(list);
updateAllWishlistButtons(id, false);
showTemporaryMessage(' Quitado de favoritos', 'info');
} else {
list.push({
id,
name: product.Nombre || product.name || 'Producto',
price: Number(product.Precio || product.price || 0),
Imagen1: product.Imagen1 || '',
Talla: product.Talla || '',
addedAt: Date.now()
});
saveWishlist(list);
updateAllWishlistButtons(id, true);
showTemporaryMessage(' Agregado a favoritos', 'success');
}
}
function addAllWishlistToCart() {
const list = getWishlist();
if (list.length === 0) {
showTemporaryMessage("No hay productos en tu lista de deseos", "info");
return;
}
list.forEach(item => {
addToCart({
ID: item.id,
Nombre: item.name,
Precio: item.price,
Imagen1: item.Imagen1,
Talla: item.Talla
});
});
saveWishlist([]);
if (typeof renderWishlist === 'function') renderWishlist();
updateWishlistBadge();
}
function updateAllWishlistButtons(id, active) {
document.querySelectorAll(`.wishlist-btn[data-id="${id}"]`).forEach(btn => {
btn.classList.toggle('active', active);
btn.setAttribute('aria-pressed', active);
btn.innerHTML = active
  ? '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" aria-hidden="true"><use href="#ic-heart-fill"/></svg>'
  : '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" aria-hidden="true"><use href="#ic-heart"/></svg>';
});
}
function createWishlistButton(product) {
const id = String(product.ID || product.id);
const active = isInWishlist(id);
const btn = document.createElement('button');
btn.className = `wishlist-btn${active ? ' active' : ''}`;
btn.setAttribute('data-id', id);
btn.setAttribute('aria-label', active ? 'Quitar de favoritos' : 'Agregar a favoritos');
btn.setAttribute('aria-pressed', active);
btn.innerHTML = active
  ? '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" aria-hidden="true"><use href="#ic-heart-fill"/></svg>'
  : '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" aria-hidden="true"><use href="#ic-heart"/></svg>';
btn.addEventListener('click', (e) => {
e.stopPropagation();
e.preventDefault();
toggleWishlist(product);
});
return btn;
}
function openWishlistDrawer() {
const drawer = document.getElementById("wishlist-drawer");
const overlay = document.getElementById("overlay");
if (drawer) drawer.classList.add("open");
if (overlay) overlay.classList.add("visible");
renderWishlist();
}
function closeWishlistDrawer() {
const drawer = document.getElementById("wishlist-drawer");
const overlay = document.getElementById("overlay");
if (drawer) drawer.classList.remove("open");
if (overlay) overlay.classList.remove("visible");
}
function renderWishlist() {
const container = document.getElementById("wishlist-items-container");
if (!container) return;
const items = getWishlist();
container.innerHTML = "";
if (items.length === 0) {
container.innerHTML = `
<div class="cart-empty-state">
<div class="cart-empty-icon"></div>
<p class="helper-text">Tu lista de deseos está vacía.</p>
<p class="cart-empty-hint">Agrega productos que te gusten</p>
</div>`;
} else {
items.forEach((item) => {
const row = document.createElement("div");
row.className = "cart-item";
const imgUrl = item.Imagen1 ? optimizeDriveUrl(item.Imagen1, 120) : '';
const imgHtml = imgUrl
? `<div class="cart-item-img-wrap"><img class="cart-item-img" src="${escapeHtml(imgUrl)}" alt="${escapeHtml(item.name)}" loading="lazy"></div>`
: `<div class="cart-item-img-wrap cart-item-img-placeholder"><span></span></div>`;
row.innerHTML = `
${imgHtml}
<div class="cart-item-info">
<div class="cart-item-title">${escapeHtml(item.name)}</div>
<div class="cart-item-meta">${formatCurrency(item.price)}</div>
<div class="cart-item-actions">
<button class="add-to-cart-wishlist" data-id="${item.id}" data-name="${escapeHtml(item.name)}" data-price="${item.price}" data-img="${escapeHtml(item.Imagen1)}" data-talla="${escapeHtml(item.Talla || '')}"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-cart"/></svg>Agregar al carrito</button>
<button class="remove-from-wishlist" data-id="${item.id}"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-trash"/></svg><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-trash"/></svg> Eliminar</button>
</div>
</div>
`;
container.appendChild(row);
});
document.querySelectorAll('.add-to-cart-wishlist').forEach(btn => {
btn.removeEventListener('click', handleAddFromWishlist);
btn.addEventListener('click', handleAddFromWishlist);
});
document.querySelectorAll('.remove-from-wishlist').forEach(btn => {
btn.removeEventListener('click', handleRemoveFromWishlist);
btn.addEventListener('click', handleRemoveFromWishlist);
});
}
updateWishlistBadge();
}
function handleAddFromWishlist(e) {
const btn = e.currentTarget;
const id = btn.dataset.id;
const name = btn.dataset.name;
const price = parseFloat(btn.dataset.price);
const img = btn.dataset.img;
const talla = btn.dataset.talla;
addToCart({ ID: id, Nombre: name, Precio: price, Imagen1: img, Talla: talla });
showTemporaryMessage(` ${name} agregado al carrito`, 'success');
}
function handleRemoveFromWishlist(e) {
const btn = e.currentTarget;
const id = btn.dataset.id;
let list = getWishlist();
const removedItem = list.find(i => i.id === id);
list = list.filter(i => i.id !== id);
saveWishlist(list);
updateAllWishlistButtons(id, false);
renderWishlist();
if (removedItem) {
showTemporaryMessage(` ${removedItem.name} eliminado de favoritos`, 'info');
}
}
function updateWishlistBadge() {
const count = getWishlist().length;
const badge = document.getElementById("wishlist-count");
if (badge) badge.textContent = count;
const bottomBadge = document.getElementById("bottom-wishlist-count");
if (bottomBadge) {
bottomBadge.textContent = count;
bottomBadge.style.display = count > 0 ? '' : 'none';
}
}
window.addEventListener('wishlistUpdated', updateWishlistBadge);
window.openWishlistDrawer = openWishlistDrawer;
window.closeWishlistDrawer = closeWishlistDrawer;
window.renderWishlist = renderWishlist;
window.addAllWishlistToCart = addAllWishlistToCart;
window.updateWishlistBadge = updateWishlistBadge;
(function watchProductCards() {
if (/\/comunidad\.html/i.test(window.location.pathname)) return;
function injectWishlistBtn(card) {
if (/\/comunidad\.html/i.test(window.location.pathname)) return;
if (card.querySelector('.wishlist-btn')) return;
const slider = card.querySelector('.product-slider');
if (!slider) return;
const id = card.id?.replace('producto-', '') || '';
if (!id) return;
let product = null;
if (window.allProductsIndexed && Array.isArray(window.allProductsIndexed)) {
product = window.allProductsIndexed.find(p =>String(p.ID) === id);
}
if (!product) {
const nameEl = card.querySelector('.product-name');
const priceEl = card.querySelector('.product-price');
product = {
ID: id,
Nombre: nameEl?.textContent || '',
Precio: priceEl?.textContent?.replace(/[^0-9]/g, '') || 0,
Imagen1: card.querySelector('img')?.src || ''
};
}
const btn = createWishlistButton(product);
slider.style.position = 'relative';
slider.appendChild(btn);
}
function injectAll() {
  document.querySelectorAll('.product-card').forEach(card => {
    if (card.closest('#panel-section')) return;
    injectWishlistBtn(card);
  });
}
const observer = new MutationObserver(mutations => {
  mutations.forEach(mut => {
    mut.addedNodes.forEach(node => {
      if (node.nodeType !== 1) return;
      if (node.classList?.contains('product-card')) {
        // Solo inyectamos si no está dentro del panel de vendedor
        if (!node.closest('#panel-section')) {
          injectWishlistBtn(node);
        }
      } else {
        node.querySelectorAll?.('.product-card').forEach(card => {
          if (!card.closest('#panel-section')) {
            injectWishlistBtn(card);
          }
        });
      }
    });
  });
});

if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', () => {
injectAll();
observer.observe(document.body, { childList: true, subtree: true });
});
} else {
injectAll();
observer.observe(document.body, { childList: true, subtree: true });
}
})();
function _upEsc(str) {
const fn = window.escapeHtml;
if (typeof fn === 'function') return fn(str);
return String(str)
.replace(/&/g,'&amp;').replace(/</g,'&lt;')
.replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
const SIZE_SECTIONS = {
torso: {
label:'Torso', icon:'',
hint:'Playeras, camisas, sudaderas, chamarras…',
keywords:['camisa','playera','camiseta','blusa','sudadera','chamarra','hoodie',
'jacket','top','saco','blazer','sweater','suéter','torso','buzo',
'polo','crop','manga','camisola'],
sizes:['XS','S','M','L','XL','XXL','XXXL']
},
piernas: {
label:'Piernas', icon:'',
hint:'Pantalones, jeans, shorts, faldas…',
keywords:['pantalon','pantalón','jean','jeans','short','falda','leggins',
'legging','bermuda','jogger','cargo','trouser','pant','skirt'],
sizes:['XS','S','M','L','XL','XXL','XXXL',
'26','27','28','29','30','31','32','33','34','36','38','40']
},
pies: {
label:'Pies', icon:'',
hint:'Tenis, botas, sandalias, zapatos…',
keywords:['tenis','zapato','bota','sandalia','zapatilla','mocasin','mocasín',
'sneaker','boot','shoe','calzado','loafer','flat'],
sizes:['22','23','24','24.5','25','25.5','26','26.5','27','27.5',
'28','28.5','29','30','31','32']
}
};
function loadPrefs() {
try { return JSON.parse(localStorage.getItem(UP_KEY)) || {torso:'',piernas:'',pies:''}; }
catch { return {torso:'',piernas:'',pies:''}; }
}
function savePrefs(p) {
try { localStorage.setItem(UP_KEY, JSON.stringify(p)); } catch {}
}
window.getUserPrefs = loadPrefs;
function loadOrders() {
try { return JSON.parse(localStorage.getItem(ORDERS_KEY)) || []; }
catch { return []; }
}
function saveOrder(order) {
try {
const orders = loadOrders();
orders.unshift(order);
if (orders.length > 50) orders.length = 50;
localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
} catch {}
}
function saveOrders(orders) {
try { localStorage.setItem(ORDERS_KEY, JSON.stringify(orders)); } catch {}
}
window.saveOrderToHistory = saveOrder;

async function refreshOrderStatuses() {
try {
const orders = loadOrders();
if (!orders.length) return;
const toCheck = orders.filter(o => o.status === 'pendiente' || o.status === 'pending');
if (!toCheck.length) return;
// 🔧 Antes: una llamada GAS por pedido pendiente (N+1). Ahora: un solo
// checkRequestStatusBatch con todos los requestId de una vez.
const ids = toCheck.map(o => o.requestId);
const res  = await fetch(`${API_URL}?action=checkRequestStatusBatch&requestIds=${encodeURIComponent(JSON.stringify(ids))}`);
const data = await res.json();
if (!data.ok || !data.statuses) return;
const map = { pending:'pendiente', approved:'confirmado', cancelled:'cancelled', rejected:'rejected' };
const all = loadOrders();
let changed = false;
toCheck.forEach(o => {
const entry = data.statuses[o.requestId];
if (!entry) return;
const newStatus = map[entry.status] || entry.status;
if (newStatus !== o.status) {
  const idx = all.findIndex(x => x.requestId === o.requestId);
  if (idx !== -1) { all[idx].status = newStatus; changed = true; }
}
});
if (changed) saveOrders(all);
} catch {}
}
function detectSection(product) {
const hay = [product.Nombre||'', product.Categoria||'', product.Descripcion||'']
.join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
for (const [k,cfg] of Object.entries(SIZE_SECTIONS))
if (cfg.keywords.some(kw => hay.includes(kw))) return k;
return null;
}
function sizeMatches(talla, user) {
if (!talla||!user) return false;
const h = talla.toLowerCase(), n = user.toLowerCase();
return h===n || h.split(/[\s,\/\-]+/).some(t=>t.trim()===n);
}
function getSizeScore(p, prefs) {
const s = detectSection(p); if (!s||!prefs[s]) return 0;
return sizeMatches(p.Talla||p.talla||'', prefs[s]) ? 1 : 0;
}
function sortByUserSize(products) {
const prefs = loadPrefs();
if (!Object.values(prefs).some(v=>v)) return products;
return [...products].sort((a,b)=>getSizeScore(b,prefs)-getSizeScore(a,prefs));
}
window.sortByUserSize  = sortByUserSize;
window.getSizeScore  = getSizeScore;
window.detectSection  = detectSection;
function currentTheme() {
return localStorage.getItem('theme') || document.documentElement.getAttribute('data-theme') || 'dark';
}
function applyTheme(theme) {
document.documentElement.setAttribute('data-theme', theme);
document.body.className = document.body.className.replace(/theme-\S+/g,'').trim();
document.body.classList.add('theme-aeromexico');
localStorage.setItem('theme', theme);
updateThemeIcon(theme);
window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
}
function renderOrders() {
const orders = loadOrders();
if (!orders.length) return `
<div class="up-empty-state">
<div class="up-empty-icon"></div>
<p>Aún no tienes pedidos registrados.<br>
<small>Tus compras aparecerán aquí una vez que las solicites.</small>
</p>
</div>`;
return orders.map(o=>{
const date = new Date(o.timestamp||Date.now()).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'});
const items = (o.items||[]).map(i=>`
<div class="up-order-item">
<span>${_upEsc(i.name||'Producto')}</span>
<span class="up-order-qty">x${i.quantity||1} · $${(i.price||0).toLocaleString()}</span>
</div>`).join('');

const statusMap = {
  pendiente:  { color:'#f59e0b', icon: Icon('clock'), label:'pendiente'       },
  confirmado: { color:'#22c55e', icon: Icon('check'), label:'confirmado'       },
  cancelled:  { color:'#ef4444', icon: Icon('x'), label:'Cancelación'      },
  rejected:   { color:'#9ca3af', icon: Icon('ban'), label:'Cancelado'        },
  cancelado:  { color:'#9ca3af', icon: Icon('ban'), label:'Cancelado'        }
};
const st = statusMap[o.status] || { color:'#f59e0b', icon: Icon('clock'), label: o.status||'pendiente' };

let actionBtn = '';
if (o.status === 'pendiente') {
  actionBtn = `<button class="up-order-cancel-btn" data-request-id="${_upEsc(o.requestId)}" style="margin-top:10px;width:100%;padding:8px;border:none;border-radius:10px;background:#fee2e2;color:#dc2626;font-size:13px;font-weight:600;cursor:pointer;">${Icon('x')} Cancelar pedido</button>`;
} else if (o.status === 'confirmado') {
  const adminPhone = (typeof WHATSAPP_NUMBER !== 'undefined' ? WHATSAPP_NUMBER : '');
  const itemsList  = (o.items||[]).map(i=>`• ${i.name} x${i.quantity}`).join('\n');
  const msg = encodeURIComponent(`Hola, quisiera solicitar la *cancelación* de mi pedido:\n\n*ID:* ${o.requestId||''}\n*Productos:*\n${itemsList}\n*Total:* $${(o.total||0).toLocaleString()}\n\nEste pedido ya fue confirmado. ¿Es posible cancelarlo?`);
  actionBtn = `<a href="https://wa.me/${adminPhone}?text=${msg}" target="_blank" style="display:block;margin-top:10px;padding:8px;border-radius:10px;background:#fff3cd;color:#92400e;font-size:13px;font-weight:600;text-align:center;text-decoration:none;">${Icon('mail')} Solicitar cancelación al admin</a>`;
}
return `
<div class="up-order-card" data-order-id="${_upEsc(o.requestId||'')}">
<div class="up-order-header">
<div>
<span class="up-order-id">${_upEsc(o.requestId||'—')}</span>
<span class="up-order-date">${date}</span>
</div>
<span class="up-order-status" style="color:${st.color};font-weight:600;">
${st.icon} ${st.label}
</span>
</div>
<div class="up-order-items">${items}</div>
<div class="up-order-total">Total: <strong>$${(o.total||0).toLocaleString()}</strong></div>
${actionBtn}
</div>`;
}).join('');
}

async function clientCancelOrder(requestId) {
  const phone = localStorage.getItem('client_phone') || '';
  if (!phone) {
    showTemporaryMessage('No se encontró tu número de teléfono. Intenta de nuevo desde el carrito.', 'error');
    return;
  }

  showCustomConfirm({
    title: '¿Cancelar pedido?',
    message: '¿Estás seguro de que deseas cancelar el pedido ' + requestId + '? Esta acción no se puede deshacer.',
    icon: 'trash',
    confirmText: 'Sí, cancelar',
    cancelText: 'No',
    onConfirm: async () => {
      try {
        showLoader('Cancelando pedido...');

        const orders = loadOrders();
        const idx = orders.findIndex(o => o.requestId === requestId);
        const prevStatus = idx !== -1 ? orders[idx].status : null;
        if (idx !== -1) { orders[idx].status = 'cancelled'; saveOrders(orders); }
        const list = document.getElementById('up-orders-list');
        if (list) list.innerHTML = renderOrders();
        attachOrderCancelListeners();

        let gasOk = false;
        try {
          const res = await fetch(API_URL, {
  method: 'POST',
  body: JSON.stringify({ action: 'clientCancelRequest', requestId, phone })
});

          const responseText = await res.text();

          let data;
          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            console.error('❌ No se pudo parsear JSON:', responseText);
            throw new Error('El servidor devolvió: ' + responseText.substring(0, 200));
          }
          if (!data) {
            throw new Error('Sin conexión con el servidor. Intenta de nuevo.');
          }
          
          if (data && data.ok && data.cancelled) {
            gasOk = true;
          } else if (data && data.ok && data.alreadyConfirmed) {

            if (idx !== -1 && prevStatus) {
              const all = loadOrders();
              const i2 = all.findIndex(o => o.requestId === requestId);
              if (i2 !== -1) { all[i2].status = 'confirmado'; saveOrders(all); }
              if (list) list.innerHTML = renderOrders();
              attachOrderCancelListeners();
            }
            hideLoader();
            showTemporaryMessage('Tu pedido ya fue confirmado. Usa el botón de WhatsApp para solicitar la cancelación al admin.', 'warning', 6000);
            return;
          } else {

            throw new Error(data?.error || ('Respuesta inesperada: ' + JSON.stringify(data)));
          }

        } catch (fetchErr) {

          if (idx !== -1 && prevStatus) {
            const all = loadOrders();
            const i2 = all.findIndex(o => o.requestId === requestId);
            if (i2 !== -1) { all[i2].status = prevStatus; saveOrders(all); }
            if (list) list.innerHTML = renderOrders();
            attachOrderCancelListeners();
          }
          hideLoader();
          showTemporaryMessage('Error al cancelar: ' + fetchErr.message, 'error');
          return;
        }

        hideLoader();
        if (gasOk) showTemporaryMessage('Pedido cancelado correctamente.', 'success');

      } catch (err) {
        hideLoader();
        showTemporaryMessage('Error inesperado: ' + err.message, 'error');
      }
    }
  });
}

function attachOrderCancelListeners() {
  document.querySelectorAll('.up-order-cancel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const requestId = btn.getAttribute('data-request-id');
      if (requestId) clientCancelOrder(requestId);
    });
  });
}
function buildPanel() {
if (document.getElementById('up-panel')) return;
const prefs = loadPrefs();
const theme = currentTheme();
const savedPhone = localStorage.getItem('client_phone')||'';
const savedAddress = localStorage.getItem('client_address')||'';
const layout = localStorage.getItem('products_layout')||'list';
const overlay = document.createElement('div');
overlay.id = 'up-overlay';
overlay.addEventListener('click', closePanel);
const panel = document.createElement('div');
panel.id = 'up-panel';
panel.setAttribute('role','dialog');
panel.setAttribute('aria-modal','true');
panel.innerHTML = `
<div class="up-header">
<div class="up-title-row">
<span class="up-logo">Z&R</span>
<h2 class="up-title">Preferencias</h2>
</div>
<button class="up-close" id="up-close-btn" aria-label="Cerrar"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" aria-hidden="true"><use href="#ic-x"/></svg></button>
</div>
<div class="up-tabs" role="tablist">
<button class="up-tab active" data-tab="apariencia" role="tab"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-refresh"/></svg> Apariencia</button>
<button class="up-tab" data-tab="tallas" role="tab"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.595.33a18.095 18.095 0 005.223-5.223c.542-.815.369-1.896-.33-2.595L9.568 3z"/></svg> Tallas</button>
<button class="up-tab" data-tab="pedidos" role="tab"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"/></svg> Pedidos</button>
<button class="up-tab" data-tab="privacidad" role="tab"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/></svg> Privacidad</button>
</div>
<div class="up-body">
<section class="up-tab-content active" data-content="apariencia">
<h3 class="up-section-title">Tema visual</h3>
<div class="up-theme-row">
<button class="up-theme-btn ${theme==='dark'?'active':''}" data-theme="dark"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-moon"/></svg> Oscuro</button>
<button class="up-theme-btn ${theme==='light'?'active':''}" data-theme="light"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-sun"/></svg> Claro</button>
</div>
<h3 class="up-section-title" style="margin-top:24px">Vista del catálogo</h3>
<div class="up-theme-row">
<button class="up-layout-btn ${layout==='list'?'active':''}" data-layout="list"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-list"/></svg> Lista</button>
<button class="up-layout-btn ${layout==='grid'?'active':''}" data-layout="grid"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-grid"/></svg> Cuadrícula</button>
</div>
</section>
<section class="up-tab-content" data-content="tallas">
<p class="up-section-hint">Selecciona tu talla en cada sección para ver primero los productos que te quedan.</p>
${Object.entries(SIZE_SECTIONS).map(([key,cfg])=>`
<div class="up-size-block">
<div class="up-size-label">
<span class="up-size-icon">${cfg.icon}</span>
<div>
<strong>${cfg.label}</strong>
<span class="up-size-hint">${cfg.hint}</span>
</div>
${prefs[key]?`<span class="up-size-badge" data-badge="${key}">${_upEsc(prefs[key])}</span>`:`<span class="up-size-badge" data-badge="${key}" style="display:none"></span>`}
</div>
<div class="up-size-grid">
${cfg.sizes.map(sz=>`
<button class="up-size-btn${prefs[key]===sz?' selected':''}"
data-section="${key}" data-size="${sz}">${sz}</button>
`).join('')}
<button class="up-size-btn up-size-clear${!prefs[key]?' hidden':''}"
data-section="${key}" data-size=""><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-trash"/></svg> Quitar</button>
</div>
</div>
`).join('')}
<button class="up-save-btn" id="up-save-sizes-btn"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> Guardar tallas</button>
</section>
<section class="up-tab-content" data-content="pedidos">
<h3 class="up-section-title">Mis pedidos</h3>
<div id="up-orders-list">${renderOrders()}</div>
</section>
<section class="up-tab-content" data-content="privacidad">
<h3 class="up-section-title">Mis datos guardados</h3>
<div class="up-privacy-item">
<div class="up-privacy-info">
<span class="up-privacy-icon"></span>
<div>
<strong>Número de teléfono</strong>
<span class="up-privacy-value">${savedPhone ? '+52 '+_upEsc(savedPhone) : 'No guardado'}</span>
</div>
</div>
${savedPhone?`<button class="up-danger-btn" id="up-delete-phone-btn"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-trash"/></svg> Eliminar</button>`:''}
</div>
<div class="up-privacy-item">
<div class="up-privacy-info">
<span class="up-privacy-icon"></span>
<div>
<strong>Dirección de envío</strong>
<span class="up-privacy-value">${savedAddress ? _upEsc(savedAddress) : 'No guardada'}</span>
</div>
</div>
<div style="display:flex;gap:6px;flex-shrink:0">
<button class="up-secondary-btn" id="up-edit-address-btn">${savedAddress ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-edit"/></svg> Editar' : '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-plus"/></svg> Añadir'}</button>
${savedAddress?`<button class="up-danger-btn" id="up-delete-address-btn"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-trash"/></svg> Eliminar</button>`:''}
</div>
</div>
</div>
<div class="up-divider"></div>
<p class="up-privacy-note">Tus datos se guardan únicamente en este dispositivo y se usan solo para agilizar
el proceso de compra. Puedes eliminarlos en cualquier momento.
Para solicitar eliminación de datos en nuestros registros escríbenos a
<strong>znrcomunity@gmail.com</strong>
</p>
</section>
</div>
`;
document.body.appendChild(overlay);
document.body.appendChild(panel);
attachPanelEvents(panel);
requestAnimationFrame(()=>{
overlay.classList.add('visible');
panel.classList.add('visible');
});
}
function attachPanelEvents(panel) {
panel.querySelector('#up-close-btn').addEventListener('click', closePanel);
panel.querySelectorAll('.up-tab').forEach(tab=>{
tab.addEventListener('click',()=>{
panel.querySelectorAll('.up-tab').forEach(t=>t.classList.remove('active'));
panel.querySelectorAll('.up-tab-content').forEach(c=>c.classList.remove('active'));
tab.classList.add('active');
panel.querySelector(`[data-content="${tab.dataset.tab}"]`).classList.add('active');
if (tab.dataset.tab === 'pedidos') {
  const list = document.getElementById('up-orders-list');
  if (list) {
    list.innerHTML = `<p style="text-align:center;color:var(--color-text-muted);padding:20px;font-size:13px;">${Icon('clock')} Actualizando pedidos...</p>`;
    refreshOrderStatuses()
      .catch(() => {})
      .finally(() => {
        list.innerHTML = renderOrders();
        attachOrderCancelListeners();
      });
  }
}
});
});

attachOrderCancelListeners();
panel.querySelectorAll('.up-theme-btn').forEach(btn=>{
btn.addEventListener('click',()=>{
panel.querySelectorAll('.up-theme-btn').forEach(b=>b.classList.remove('active'));
btn.classList.add('active');
applyTheme(btn.dataset.theme);
});
});
panel.querySelectorAll('.up-layout-btn').forEach(btn=>{
btn.addEventListener('click',()=>{
const layout = btn.dataset.layout;
localStorage.setItem('products_layout', layout);
localStorage.setItem('comunidad_layout', layout);
localStorage.setItem('home_layout', layout);
applyLayoutGlobal(layout);
});
});
panel.querySelectorAll('.up-size-btn').forEach(btn=>{
btn.addEventListener('click',()=>{
const sec  = btn.dataset.section;
const size = btn.dataset.size;
panel.querySelectorAll(`.up-size-btn[data-section="${sec}"]`).forEach(b=>{
b.classList.remove('selected');
});
if (size) btn.classList.add('selected');
const clear = panel.querySelector(`.up-size-clear[data-section="${sec}"]`);
if (clear) clear.classList.toggle('hidden', !size);
const badge = panel.querySelector(`[data-badge="${sec}"]`);
if (badge) { badge.textContent=size; badge.style.display=size?'':'none'; }
});
});
const saveBtn = panel.querySelector('#up-save-sizes-btn');
if (saveBtn) {
saveBtn.addEventListener('click',()=>{
const prefs = {torso:'',piernas:'',pies:''};
panel.querySelectorAll('.up-size-btn.selected').forEach(b=>{
if (b.dataset.size) prefs[b.dataset.section]=b.dataset.size;
});
savePrefs(prefs);
if (typeof applyFilters==='function') applyFilters();
const orig = saveBtn.textContent;
saveBtn.textContent=' ¡Guardado!';
saveBtn.classList.add('saved');
setTimeout(()=>{ saveBtn.textContent=orig; saveBtn.classList.remove('saved'); }, 1400);
});
}
const delPhone = panel.querySelector('#up-delete-phone-btn');
if (delPhone) {
delPhone.addEventListener('click',()=>{
if (typeof showCustomConfirm==='function') {
showCustomConfirm({
title:' Eliminar teléfono',
message:'¿Eliminar el número guardado? Tendrás que ingresarlo de nuevo al comprar.',
icon:'', confirmText:'Sí, eliminar', cancelText:'Cancelar',
onConfirm:()=>{ localStorage.removeItem('client_phone'); closePanel(); buildPanel(); }
});
} else {
localStorage.removeItem('client_phone');
closePanel(); buildPanel();
}
});
}
const delAddr = panel.querySelector('#up-delete-address-btn');
const editAddr = panel.querySelector('#up-edit-address-btn');
if (editAddr) {
editAddr.addEventListener('click', async () => {
const data = await _collectAddressAndSchedule();
if (data) {
localStorage.setItem('client_address',  data.address);
localStorage.setItem('client_schedule', data.schedule);
if (data.note !== undefined) localStorage.setItem('client_note', data.note);
updateSavedPhoneDisplay();
closePanel(); buildPanel();
}
});
}
if (delAddr) {
delAddr.addEventListener('click',()=>{
if (typeof showCustomConfirm==='function') {
showCustomConfirm({
title:' Eliminar dirección',
message:'¿Eliminar la dirección guardada?',
icon:'', confirmText:'Sí, eliminar', cancelText:'Cancelar',
onConfirm:()=>{ localStorage.removeItem('client_address'); localStorage.removeItem('client_schedule'); localStorage.removeItem('client_note'); localStorage.removeItem('client_days'); localStorage.removeItem('client_hour_from'); localStorage.removeItem('client_hour_to'); localStorage.removeItem('client_gps_lat'); localStorage.removeItem('client_gps_lng'); closePanel(); buildPanel(); }
});
} else {
localStorage.removeItem('client_address');
localStorage.removeItem('client_schedule');
localStorage.removeItem('client_note');
localStorage.removeItem('client_days');
localStorage.removeItem('client_hour_from');
localStorage.removeItem('client_hour_to');
closePanel(); buildPanel();
}
});
}
}
function closePanel() {
const panel = document.getElementById('up-panel');
const ov  = document.getElementById('up-overlay');
if (!panel) return;
panel.classList.remove('visible');
ov.classList.remove('visible');
setTimeout(()=>{ panel.remove(); ov.remove(); }, 280);
}

function openPanelOnTab(tabName) {

  const existing = document.getElementById('up-panel');
  if (existing) {
    closePanel();
    setTimeout(() => _buildAndActivateTab(tabName), 320);
  } else {
    _buildAndActivateTab(tabName);
  }
}

function _buildAndActivateTab(tabName) {
  buildPanel();

  requestAnimationFrame(() => {
    const panel = document.getElementById('up-panel');
    if (!panel) return;
    const targetTab = panel.querySelector(`.up-tab[data-tab="${tabName}"]`);
    if (!targetTab) return;
    panel.querySelectorAll('.up-tab').forEach(t => t.classList.remove('active'));
    panel.querySelectorAll('.up-tab-content').forEach(c => c.classList.remove('active'));
    targetTab.classList.add('active');
    const content = panel.querySelector(`[data-content="${tabName}"]`);
    if (content) content.classList.add('active');
    if (tabName === 'pedidos') {
      const list = document.getElementById('up-orders-list');
      if (!list) return;
      list.innerHTML = `<p style="text-align:center;color:var(--color-text-muted);padding:20px;font-size:13px;">${Icon('clock')} Actualizando pedidos...</p>`;

      refreshOrderStatuses()
        .catch(() => {})
        .finally(() => {
          list.innerHTML = renderOrders();
          attachOrderCancelListeners();
        });
    }
  });
}
window.openPanelOnTab = openPanelOnTab;
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closePanel(); });
function wirePrefsButton() {
if (location.pathname.includes('admin') || location.pathname.includes('notificaciones')) return;
const btn = document.getElementById('up-open-btn');
if (!btn) return;
btn.addEventListener('click', buildPanel);
refreshHeaderDot(btn);
}
function refreshHeaderDot(btn) {
if (!btn) btn = document.getElementById('up-open-btn');
if (!btn) return;
const prefs = loadPrefs();
const hasSizes = Object.values(prefs).some(v=>v);
btn.style.position = 'relative';
let dot = btn.querySelector('.up-header-dot');
if (hasSizes && !dot) {
dot = document.createElement('span'); dot.className='up-header-dot'; btn.appendChild(dot);
} else if (!hasSizes && dot) dot.remove();
}
function patchScriptFilters() {
if (window._upPatched) return; window._upPatched = true;
const orig = window.applyFilters;
if (typeof orig!=='function') return;
window.applyFilters = function(...args) {
orig.apply(this, args);
if (typeof filteredProducts!=='undefined' && filteredProducts.length) {
const sorted = sortByUserSize(filteredProducts);
if (sorted.some((p,i)=>p!==filteredProducts[i])) {
filteredProducts.length=0; sorted.forEach(p=>filteredProducts.push(p));
if (typeof renderProductsPage==='function') renderProductsPage(true);
}
}
};
}
function injectStyles() {
if (document.getElementById('up-styles')) return;
const s = document.createElement('style');
s.id = 'up-styles';
s.textContent = `
#up-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);z-index:9000;opacity:0;transition:opacity .28s ease}
#up-overlay.visible{opacity:1}
#up-panel{position:fixed;top:0;right:0;height:100dvh;width:min(390px,100vw);background:var(--color-surface,#252831);border-left:1px solid var(--color-border-subtle,rgba(255,255,255,.07));z-index:9001;display:flex;flex-direction:column;transform:translateX(100%);transition:transform .28s cubic-bezier(.4,0,.2,1);overflow:hidden;box-shadow:-8px 0 40px rgba(0,0,0,.4)}
#up-panel.visible{transform:translateX(0)}
.up-header{display:flex;align-items:center;justify-content:space-between;padding:18px 20px 14px;border-bottom:1px solid rgba(255,255,255,.07);flex-shrink:0}
.up-title-row{display:flex;align-items:center;gap:10px}
.up-logo{font-size:12px;font-weight:800;letter-spacing:.05em;color:#ff4f81;background:rgba(255,79,129,.12);padding:3px 8px;border-radius:6px}
.up-title{font-size:16px;font-weight:700;margin:0;color:var(--color-text-primary,#fff)}
.up-close{background:rgba(255,255,255,.07);border:none;color:var(--color-text-secondary,#aaa);width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:background .2s,color .2s}
.up-close:hover{background:rgba(255,79,129,.15);color:#ff4f81}
.up-tabs{display:flex;gap:4px;padding:12px 16px 0;border-bottom:1px solid rgba(255,255,255,.07);flex-shrink:0;overflow-x:auto;scrollbar-width:none}
.up-tabs::-webkit-scrollbar{display:none}
.up-tab{flex-shrink:0;background:none;border:none;border-bottom:2px solid transparent;color:var(--color-text-secondary,#888);font-size:12px;font-weight:600;padding:8px 12px;cursor:pointer;transition:color .2s,border-color .2s;white-space:nowrap}
.up-tab.active{color:#ff4f81;border-bottom-color:#ff4f81}
.up-body{flex:1;overflow-y:auto;padding:20px;scrollbar-width:thin;scrollbar-color:rgba(255,79,129,.3) transparent}
.up-tab-content{display:none}
.up-tab-content.active{display:block}
.up-section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--color-text-secondary,#888);margin:0 0 12px}
.up-theme-row{display:flex;gap:8px;margin-bottom:8px}
.up-theme-btn,.up-layout-btn{flex:1;padding:10px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:var(--color-text-secondary,#aaa);border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s}
.up-theme-btn.active,.up-layout-btn.active{background:rgba(255,79,129,.18);border-color:#ff4f81;color:#ff4f81}
.up-section-hint{font-size:12px;color:var(--color-text-secondary,#888);line-height:1.5;margin:0 0 18px}
.up-size-block{margin-bottom:22px}
.up-size-label{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.up-size-icon{font-size:20px;flex-shrink:0}
.up-size-label strong{display:block;font-size:14px;font-weight:600;color:var(--color-text-primary,#fff);line-height:1.2}
.up-size-hint{display:block;font-size:11px;color:var(--color-text-secondary,#888);margin-top:2px}
.up-size-badge{margin-left:auto;background:rgba(255,79,129,.15);color:#ff4f81;border:1px solid rgba(255,79,129,.3);padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;flex-shrink:0}
.up-size-grid{display:flex;flex-wrap:wrap;gap:7px}
.up-size-btn{border:1px solid var(--color-border-subtle,rgba(255,255,255,.1));background:var(--color-surface-2,rgba(255,255,255,.04));color:var(--color-text-muted,#aaa);padding:6px 12px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;transition:all .15s}
.up-size-btn:hover{border-color:rgba(255,79,129,.5);color:#ff4f81}
.up-size-btn.selected{background:rgba(255,79,129,.18);border-color:#ff4f81;color:#ff4f81;font-weight:700}
.up-size-clear{font-size:11px;color:var(--color-text-secondary,#777)}
.up-size-btn.hidden{display:none}
.up-save-btn{width:100%;padding:13px;background:linear-gradient(135deg,#ff4f81,#ff7a4f);border:none;border-radius:14px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;margin-top:12px;transition:opacity .2s}
.up-save-btn:hover{opacity:.9}
.up-save-btn.saved{background:linear-gradient(135deg,#22c55e,#16a34a)}
.up-divider{height:1px;background:rgba(255,255,255,.07);margin:20px 0}
.up-empty-state{text-align:center;padding:40px 20px;color:var(--color-text-secondary,#888)}
.up-empty-icon{font-size:48px;margin-bottom:12px}
.up-empty-state small{font-size:12px;opacity:.7}
.up-order-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:14px;margin-bottom:12px}
.up-order-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;gap:8px}
.up-order-id{display:block;font-size:10px;font-family:monospace;color:var(--color-text-secondary,#888)}
.up-order-date{display:block;font-size:12px;font-weight:600;color:var(--color-text-primary,#fff);margin-top:2px}
.up-order-status{font-size:12px;font-weight:700;flex-shrink:0}
.up-order-items{border-top:1px solid rgba(255,255,255,.06);padding-top:8px;margin-top:4px}
.up-order-item{display:flex;justify-content:space-between;font-size:12px;color:var(--color-text-secondary,#aaa);padding:3px 0}
.up-order-qty{color:#ff4f81;font-weight:600;white-space:nowrap}
.up-order-total{text-align:right;font-size:13px;color:var(--color-text-primary,#fff);margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.06)}
.up-privacy-item{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:14px;margin-bottom:10px}
.up-privacy-info{display:flex;align-items:center;gap:12px;min-width:0}
.up-privacy-icon{font-size:22px;flex-shrink:0}
.up-privacy-info strong{display:block;font-size:13px;color:var(--color-text-primary,#fff)}
.up-privacy-value{display:block;font-size:11px;color:var(--color-text-secondary,#888);margin-top:2px;word-break:break-all}
.up-danger-btn{flex-shrink:0;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:#ef4444;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap}
.up-danger-btn:hover{background:rgba(239,68,68,.2)}
.up-privacy-note{font-size:11px;color:var(--color-text-secondary,#888);line-height:1.6}
.up-header-dot{position:absolute;top:-2px;right:-2px;width:8px;height:8px;background:#ff4f81;border-radius:50%;border:1.5px solid var(--color-surface,#252831);pointer-events:none}
[data-theme="light"] #up-panel{background:#fff;border-left-color:rgba(0,0,0,.08)}
[data-theme="light"] .up-theme-btn,[data-theme="light"] .up-layout-btn,[data-theme="light"] .up-size-btn{border-color:#c5c8d0;background:#f4f5f8;color:#333;font-weight:500}
[data-theme="light"] .up-theme-btn.active,[data-theme="light"] .up-layout-btn.active{background:rgba(255,79,129,.12);border-color:#ff4f81;color:#ff4f81}
[data-theme="light"] .up-size-btn:hover{border-color:#ff4f81;color:#ff4f81;background:#fff0f5}
[data-theme="light"] .up-size-btn.selected{background:#fff0f5;border-color:#ff4f81;color:#e11d6a;font-weight:700}
[data-theme="light"] .up-order-card,[data-theme="light"] .up-privacy-item{background:#f4f5f8;border-color:#dde0e8}
[data-theme="light"] .up-header,[data-theme="light"] .up-tabs{border-color:#e2e4ea}
[data-theme="light"] .up-divider{background:#e2e4ea}
[data-theme="light"] .up-close{background:#f0f1f5;color:#555}
[data-theme="light"] .up-close:hover{background:#fff0f5;color:#ff4f81}
[data-theme="light"] .up-section-title,[data-theme="light"] .up-size-hint,[data-theme="light"] .up-privacy-note,[data-theme="light"] .up-section-hint{color:#6b7280}
[data-theme="light"] .up-title,[data-theme="light"] .up-size-label strong,[data-theme="light"] .up-order-date,[data-theme="light"] .up-privacy-info strong{color:#111318}
@media(max-width:400px){#up-panel{width:100vw;border-left:none}}
`;
document.head.appendChild(s);
}
function initUserPreferences() {
injectStyles();
wirePrefsButton();
if (typeof applyFilters === 'function') patchScriptFilters();
}
document.addEventListener('DOMContentLoaded', initUserPreferences);
window.escapeHtml = escapeHtml;
window.escapeAttr = escapeAttr;

window.fetchWithRetry = async function(fn, maxAttempts = 3, delays = [2000, 5000, 10000]) {
for (let attempt = 0; attempt < maxAttempts; attempt++) {
try { return await fn(); }
catch(err) {
if (attempt === maxAttempts - 1) throw err;
await new Promise(r => setTimeout(r, delays[attempt]));
}
}
};
window.safeHtml = safeHtml;
(function injectCartSectionStyles() {
if (document.getElementById('cart-section-styles')) return;
const style = document.createElement('style');
style.id = 'cart-section-styles';
style.textContent = `
.cart-section-header {
display: flex;
align-items: center;
gap: 8px;
padding: 8px 4px 4px;
margin: 10px 0 6px;
font-size: 12px;
font-weight: 700;
text-transform: uppercase;
letter-spacing: 0.06em;
color: var(--color-text-secondary, #888);
border-bottom: 1px solid rgba(255,255,255,0.07);
}
.cart-section-comunidad {
color: #7c3aed;
border-bottom-color: rgba(124,58,237,0.2);
flex-direction: column;
align-items: flex-start;
gap: 2px;
}
.cart-section-comunidad small {
font-size: 11px;
font-weight: 400;
text-transform: none;
letter-spacing: 0;
color: #25d366;
opacity: 0.9;
}
.cart-item-vendor {
display: inline-block;
font-size: 11px;
color: #7c3aed;
font-weight: 600;
margin-top: 2px;
}
`;
document.head.appendChild(style);





// En common.js, después de las funciones auxiliares

/**
 * Sube múltiples archivos en cola.
 * @param {FileList} files - Archivos seleccionados.
 * @param {number} startSlot - Índice del primer slot (1-3).
 * @param {Function} uploadFn - Función asíncrona que recibe (file, slotIndex) y devuelve la URL.
 * @param {Function} onProgress - Opcional: callback (slotIndex, progress) para actualizar barras.
 * @param {Function} onSuccess - Opcional: callback (slotIndex, url) al terminar cada archivo.
 */
// --- Control global de subidas pendientes ---
// Cualquier página (admin, vendedor, etc.) puede escuchar 'znr:uploads-status'
// para deshabilitar su botón de "Guardar" mientras haya imágenes subiéndose,
// y así evitar que se envíe el formulario con campos de imagen aún vacíos.
window._znrPendingUploads = window._znrPendingUploads || 0;

function _znrNotifyUploadStatus() {
    window.dispatchEvent(new CustomEvent('znr:uploads-status', {
        detail: { pending: window._znrPendingUploads }
    }));
}

// Helper público para que cualquier formulario verifique antes de enviar.
window.hasPendingImageUploads = function() {
    return window._znrPendingUploads > 0;
};

window.uploadImagesInQueue = async function(files, startSlot = 1, uploadFn, onProgress, onSuccess) {
    const maxFiles = 3;
    const filesArray = Array.from(files).slice(0, maxFiles);
    if (filesArray.length === 0) return;

    // Determinar slots a usar (empezando por startSlot, sobrescribiendo si es necesario)
    const slots = [];
    for (let i = startSlot; i <= maxFiles; i++) {
        slots.push(i);
    }
    // Si hay más archivos que slots disponibles, truncar
    const assignments = [];
    for (let i = 0; i < Math.min(filesArray.length, slots.length); i++) {
        assignments.push({ slot: slots[i], file: filesArray[i] });
    }

    // Marcar estas imágenes como "subiendo" para bloquear el botón de guardar
    window._znrPendingUploads += assignments.length;
    _znrNotifyUploadStatus();

    // Mostrar previsualizaciones inmediatamente
    assignments.forEach(({ slot, file }) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            // Admin: previsualización en #preview-image-upload-{slot}
            const previewAdmin = document.getElementById(`preview-image-upload-${slot}`);
            if (previewAdmin) {
                previewAdmin.src = e.target.result;
                previewAdmin.style.display = 'block';
            }
            // Vendedor: previsualización en #slot-{slot} (dentro de .img-upload-slot)
            const slotDiv = document.getElementById(`slot-${slot}`);
            if (slotDiv) {
                let img = slotDiv.querySelector('img');
                if (!img) {
                    img = document.createElement('img');
                    img.style.cssText = 'max-width:90%; max-height:90%; object-fit:contain; border-radius:8px;';
                    slotDiv.appendChild(img);
                }
                img.src = e.target.result;
                slotDiv.classList.add('has-img');
                // Mostrar botón de eliminar (ya existe en el HTML)
            }
        };
        reader.readAsDataURL(file);
    });

    // Subir en cola
    for (const { slot, file } of assignments) {
        const progressId = `progress-image-upload-${slot}`;
        const progress = document.getElementById(progressId);
        if (progress) progress.style.width = '10%';

        try {
            if (typeof onProgress === 'function') onProgress(slot, 10);
            const url = await uploadFn(file, slot);
            // Actualizar campo de texto (si existe)
            const textInput = document.getElementById(`product-image${slot}`) || document.getElementById(`Imagen${slot}`);
            if (textInput) textInput.value = url;
            if (progress) progress.style.width = '100%';
            if (typeof onProgress === 'function') onProgress(slot, 100);
            if (typeof onSuccess === 'function') onSuccess(slot, url);
            showTemporaryMessage(`Imagen ${slot} subida correctamente`, 'success');
        } catch (err) {
            console.error(`Error subiendo imagen ${slot}:`, err);
            showTemporaryMessage(`Error en imagen ${slot}: ${err.message}`, 'error');
            if (progress) progress.style.width = '0%';
            if (typeof onProgress === 'function') onProgress(slot, -1);
        } finally {
            // Esta imagen ya terminó (con éxito o error): liberar el contador
            window._znrPendingUploads = Math.max(0, window._znrPendingUploads - 1);
            _znrNotifyUploadStatus();
        }
    }
};

window.uploadSingleImage = async function(file, slotIndex) {
    throw new Error('uploadSingleImage no está implementada. Debes asignarla en admin o vendedor.');
};

if ('serviceWorker' in navigator) {
    if (!sessionStorage.getItem('sw_reloaded')) {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            sessionStorage.setItem('sw_reloaded', 'true');
            try { showTemporaryMessage('Actualizando a la última versión…', 'info'); } catch {}
            setTimeout(() => window.location.reload(), 800);
        });
    }
}

// Versión de alta resolución, pensada específicamente para el modal grande.
// Ignora los topes de optimizeDriveUrl y pide el tamaño real necesario en pantalla.
function getModalImageUrl(url) {
  if (!url) return "https://placehold.co/900x900/3b1f5f/white?text=Z%26R";
  if (!url.startsWith('http') && !url.startsWith('data:image')) {
    return "https://placehold.co/900x900/3b1f5f/white?text=Z%26R";
  }
  const dpr = window.devicePixelRatio || 1;
  const targetW = Math.round(Math.min(window.innerWidth, 900) * dpr);
  const w = Math.max(targetW, 800); // nunca menos de 800px reales

  const lh3Match = url.match(/lh3\.googleusercontent\.com\/d\/([-\w]{25,})/);
  if (lh3Match) return `https://lh3.googleusercontent.com/d/${lh3Match[1]}=w${w}`;

  const match = url.match(/[-\w]{25,}/);
  if (match) return `https://lh3.googleusercontent.com/d/${match[0]}=w${w}`;

  return url;
}
window.getModalImageUrl = getModalImageUrl;


})();
