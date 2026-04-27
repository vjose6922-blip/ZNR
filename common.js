const WHATSAPP_NUMBER = "528671781272";
const CACHE_KEY = 'zr_products_cache';
const CACHE_EXPIRY = 5 * 60 * 1000; 
const API_URL = "https://script.google.com/macros/s/AKfycbzNshrt3zldBNiyoB8x36ktCEO02H0cKxebiTuK7UAbsgd5R9biaCW7W4ihm1aVOJG7ww/exec";
const RECENT_PRODUCTS_KEY = 'zr_recent_products';
const MAX_RECENT_PRODUCTS = 12;

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
  
  console.log(`✅ Indexados ${products.length} productos en ${productsByCategoryMap.size - 1} categorías`);
}

function getProductsByCategoryIndexed(category) {
  if (!category || category === '') return allProductsIndexed;
  return productsByCategoryMap?.get(category) || [];
}

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

function showTemporaryMessage(text, type = "info") {
  const existing = document.querySelector('.temporary-message');
  if (existing) existing.remove();
  
  const messageDiv = document.createElement("div");
  messageDiv.className = `temporary-message ${type}`;
  messageDiv.textContent = text;
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
  const { title, message, icon = "ℹ️", confirmText = "Aceptar", onConfirm } = options;
  const modal = document.createElement("div");
  modal.className = "custom-alert-modal";
  modal.innerHTML = `
    <div class="custom-alert-content">
      <div class="custom-alert-header"><span class="custom-alert-icon">${escapeHtml(icon)}</span><h3>${escapeHtml(title)}</h3></div>
      <div class="custom-alert-body"><p>${escapeHtml(message)}</p></div>
      <div class="custom-alert-footer"><button class="custom-alert-btn confirm">${escapeHtml(confirmText)}</button></div>
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
  const { title, message, icon = "❓", confirmText = "Aceptar", cancelText = "Cancelar", onConfirm, onCancel } = options;
  const modal = document.createElement("div");
  modal.className = "custom-alert-modal";
  modal.innerHTML = `
    <div class="custom-alert-content">
      <div class="custom-alert-header"><span class="custom-alert-icon">${escapeHtml(icon)}</span><h3>${escapeHtml(title)}</h3></div>
      <div class="custom-alert-body"><p>${escapeHtml(message)}</p></div>
      <div class="custom-alert-footer">
        <button class="custom-alert-btn cancel">${escapeHtml(cancelText)}</button>
        <button class="custom-alert-btn confirm">${escapeHtml(confirmText)}</button>
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
  const { title, message, icon = "📝", defaultValue = "", confirmText = "Aceptar", cancelText = "Cancelar", onConfirm, onCancel } = options;
  const modal = document.createElement("div");
  modal.className = "custom-alert-modal";
  modal.innerHTML = `
    <div class="custom-alert-content">
      <div class="custom-alert-header"><span class="custom-alert-icon">${escapeHtml(icon)}</span><h3>${escapeHtml(title)}</h3></div>
      <div class="custom-alert-body">
        <p>${escapeHtml(message)}</p>
        <input type="text" class="custom-alert-input" id="custom-prompt-input" value="${escapeHtml(defaultValue)}" autocomplete="off">
      </div>
      <div class="custom-alert-footer">
        <button class="custom-alert-btn cancel">${escapeHtml(cancelText)}</button>
        <button class="custom-alert-btn confirm">${escapeHtml(confirmText)}</button>
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
  window.alert = function(message) { return new Promise((resolve) => { closeCurrentModal(); showCustomAlert({ title: "Aviso", message: String(message), icon: "ℹ️", confirmText: "Aceptar", onConfirm: () => resolve() }); }); };
  window.originalConfirm = window.confirm;
  window.confirm = function(message) { return new Promise((resolve) => { closeCurrentModal(); showCustomConfirm({ title: "Confirmar", message: String(message), icon: "❓", confirmText: "Aceptar", cancelText: "Cancelar", onConfirm: () => resolve(true), onCancel: () => resolve(false) }); }); };
  window.originalPrompt = window.prompt;
  window.prompt = function(message, defaultValue = "") { return new Promise((resolve) => { closeCurrentModal(); showCustomPrompt({ title: "Ingresar información", message: String(message), icon: "📝", defaultValue: defaultValue, confirmText: "Aceptar", cancelText: "Cancelar", onConfirm: (value) => resolve(value), onCancel: () => resolve(null) }); }); };
  window.alertIntercepted = true;
}

function getCachedProducts() {
  if (window.CacheManager && window.CacheManager.getSessionProductsCache) {
    const sessionCached = window.CacheManager.getSessionProductsCache();
    if (sessionCached && sessionCached.length > 0) {
      console.log("✅ Usando caché de sesión (instantáneo)");
      return sessionCached;
    }
  }
  
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_EXPIRY) { 
      localStorage.removeItem(CACHE_KEY); 
      return null; 
    }
    console.log("📦 Usando caché de localStorage");
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




const FREE_SHIPPING_THRESHOLD = 300;

/**
 * Determina si aplica envío gratuito.
 * Se evalúa sobre el TOTAL del carrito, no el precio unitario de un producto.
 * Para tarjetas individuales de producto se puede pasar el precio unitario
 * solo como referencia visual (el cálculo real siempre usa el total del carrito).
 */
function hasFreeShipping(priceOrTotal) {
  const numericValue = Number(priceOrTotal) || 0;
  return numericValue >= FREE_SHIPPING_THRESHOLD;
}

/**
 * Revisa si el total actual del carrito califica para envío gratuito.
 * Esta es la función que debe usarse en renderCart() y en el checkout.
 */
function cartQualifiesForFreeShipping() {
  const items = Object.values(localCart);
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  return total >= FREE_SHIPPING_THRESHOLD;
}

function getShippingBadge(price) {
  if (hasFreeShipping(price)) {
    return `<span class="shipping-badge" title="Envío disponible en productos $${FREE_SHIPPING_THRESHOLD}+">🚚</span>`;
  }
  return '';
}






function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  const s = String(str);
  // Usar el DOM como sanitizador primario — más seguro que regex manual
  if (typeof document !== 'undefined') {
    const el = document.createElement('span');
    el.textContent = s;
    let escaped = el.innerHTML;
    // Complementar con caracteres adicionales relevantes para atributos
    escaped = escaped
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/`/g, '&#96;')
      // Eliminar caracteres Unicode de control (U+0000–U+001F, U+007F, U+2028, U+2029)
      // que pueden romper parsers HTML aunque estén "escapados"
      .replace(/[
