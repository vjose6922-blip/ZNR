
const WHATSAPP_NUMBER = "528671781272";
const CACHE_KEY = 'zr_products_cache';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutos
const API_URL = "https://script.google.com/macros/s/AKfycbzNshrt3zldBNiyoB8x36ktCEO02H0cKxebiTuK7UAbsgd5R9biaCW7W4ihm1aVOJG7ww/exec";

let localCart = {};
let imageObserver = null;
let activeModal = null;
let connectionBanner = null;
let isOnline = navigator.onLine;

function injectGlobalStyles() {
  if (document.querySelector('#global-styles')) return;
  
  const modalStyles = `
    /* ===== MODALES PERSONALIZADOS ===== */
    .custom-alert-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
      z-index: 10001;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      animation: modalFadeIn 0.2s ease forwards;
    }
    .custom-alert-modal.closing { animation: modalFadeOut 0.15s ease forwards; pointer-events: none; }
    .custom-alert-content {
      background: white;
      border-radius: 28px;
      max-width: 380px;
      width: 85%;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      transform: scale(0.95);
      opacity: 0;
      animation: contentScaleIn 0.2s ease forwards;
    }
    .custom-alert-modal.closing .custom-alert-content { animation: contentScaleOut 0.15s ease forwards; }
    .custom-alert-header {
      background: linear-gradient(135deg, #3b1f5f, #ff4f81);
      color: white;
      padding: 20px;
      text-align: center;
    }
    .custom-alert-icon { font-size: 40px; display: block; margin-bottom: 8px; }
    .custom-alert-header h3 { margin: 0; font-size: 18px; }
    .custom-alert-body { padding: 24px 20px; text-align: center; font-size: 15px; color: #333; line-height: 1.5; }
    .custom-alert-footer {
      padding: 16px 20px 24px;
      display: flex;
      justify-content: center;
      gap: 12px;
      border-top: 1px solid #eee;
    }
    .custom-alert-btn {
      padding: 12px 28px;
      border: none;
      border-radius: 40px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 100px;
    }
    .custom-alert-btn.confirm { background: linear-gradient(135deg, #22c55e, #16a34a); color: white; }
    .custom-alert-btn.cancel { background: #f5f5f8; color: #666; border: 1px solid #e0e0e0; }
    .custom-alert-btn.confirm:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(34, 197, 94, 0.4); }
    .custom-alert-btn.cancel:hover { background: #ffebee; color: #c62828; border-color: #ef9a9a; }
    .custom-alert-input {
      width: 100%;
      padding: 12px;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      font-size: 14px;
      margin-top: 12px;
      box-sizing: border-box;
    }
    .custom-alert-input:focus { outline: none; border-color: #ff4f81; box-shadow: 0 0 0 3px rgba(255, 79, 129, 0.1); }
    
    /* ===== LOADER GLOBAL ===== */
    .global-loader {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      z-index: 10000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      transition: opacity 0.3s;
    }
    .global-loader.hidden { display: none; }
    .loader-spinner {
      width: 50px;
      height: 50px;
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ff4f81;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .loader-text { margin-top: 16px; color: white; font-size: 14px; }
    
    /* ===== ANIMACIONES ===== */
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes modalFadeOut { from { opacity: 1; } to { opacity: 0; } }
    @keyframes contentScaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    @keyframes contentScaleOut { from { transform: scale(1); opacity: 1; } to { transform: scale(0.95); opacity: 0; } }
    @keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
    @keyframes slideDown { from { opacity: 1; transform: translateX(-50%) translateY(0); } to { opacity: 0; transform: translateX(-50%) translateY(20px); } }
    
    /* ===== MODAL PRIVACIDAD ===== */
    .privacy-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.3s ease;
    }
    .privacy-modal-content {
      background: white;
      border-radius: 28px;
      max-width: 500px;
      width: 90%;
      max-height: 85vh;
      overflow-y: auto;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      animation: slideUpModal 0.3s ease;
    }
    .privacy-modal-header {
      background: linear-gradient(135deg, #3b1f5f, #ff4f81);
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 28px 28px 0 0;
    }
    .privacy-icon { font-size: 40px; display: block; margin-bottom: 8px; }
    .privacy-modal-header h2 { margin: 0; font-size: 20px; }
    .privacy-modal-body { padding: 20px; font-size: 13px; line-height: 1.5; color: #333; }
    .privacy-modal-body h3 { font-size: 14px; color: #3b1f5f; margin: 16px 0 8px 0; }
    .privacy-modal-body ul { margin: 8px 0; padding-left: 20px; }
    .privacy-modal-body li { margin: 6px 0; }
    .privacy-date { font-size: 10px; color: #999; text-align: center; margin-top: 16px; padding-top: 12px; border-top: 1px solid #eee; }
    .privacy-modal-footer { padding: 16px 20px 24px; display: flex; gap: 12px; border-top: 1px solid #eee; }
    .privacy-btn {
      flex: 1;
      padding: 12px;
      border: none;
      border-radius: 40px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .privacy-btn.accept { background: linear-gradient(135deg, #22c55e, #16a34a); color: white; }
    .privacy-btn.accept:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(34, 197, 94, 0.4); }
    .privacy-btn.reject { background: #f5f5f8; color: #666; border: 1px solid #e0e0e0; }
    .privacy-btn.reject:hover { background: #ffebee; color: #c62828; border-color: #ef9a9a; }
    @keyframes slideUpModal { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    
    /* ===== MENSAJE TEMPORAL ===== */
    .temporary-message {
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      border-radius: 50px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      animation: slideUpMsg 0.3s ease;
    }
    .temporary-message.info { background: #22c55e; color: white; }
    .temporary-message.error { background: #ef4444; color: white; }
    @keyframes slideUpMsg { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
  `;
  
  const styleSheet = document.createElement("style");
  styleSheet.id = "global-styles";
  styleSheet.textContent = modalStyles;
  document.head.appendChild(styleSheet);
}

// ========== LOADER ==========
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

// ========== MODALES PERSONALIZADOS ==========
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

// Interceptar alert/confirm/prompt
if (!window.alertIntercepted) {
  window.originalAlert = window.alert;
  window.alert = function(message) { return new Promise((resolve) => { closeCurrentModal(); showCustomAlert({ title: "Aviso", message: String(message), icon: "ℹ️", confirmText: "Aceptar", onConfirm: () => resolve() }); }); };
  window.originalConfirm = window.confirm;
  window.confirm = function(message) { return new Promise((resolve) => { closeCurrentModal(); showCustomConfirm({ title: "Confirmar", message: String(message), icon: "❓", confirmText: "Aceptar", cancelText: "Cancelar", onConfirm: () => resolve(true), onCancel: () => resolve(false) }); }); };
  window.originalPrompt = window.prompt;
  window.prompt = function(message, defaultValue = "") { return new Promise((resolve) => { closeCurrentModal(); showCustomPrompt({ title: "Ingresar información", message: String(message), icon: "📝", defaultValue: defaultValue, confirmText: "Aceptar", cancelText: "Cancelar", onConfirm: (value) => resolve(value), onCancel: () => resolve(null) }); }); };
  window.alertIntercepted = true;
}

// ========== FUNCIONES DE CACHÉ ==========
function getCachedProducts() {
  // PRIMERO: caché de sesión (entre páginas - MÁS RÁPIDO)
  if (window.CacheManager && window.CacheManager.getSessionProductsCache) {
    const sessionCached = window.CacheManager.getSessionProductsCache();
    if (sessionCached && sessionCached.length > 0) {
      console.log("✅ Usando caché de sesión (instantáneo)");
      return sessionCached;
    }
  }
  
  // SEGUNDO: caché persistente (localStorage)
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
  // Guardar en caché de sesión
  if (window.CacheManager && window.CacheManager.setSessionProductsCache) {
    window.CacheManager.setSessionProductsCache(products);
  }
  
  // Guardar en caché persistente
  try { 
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data: products, timestamp: Date.now() })); 
  } catch (e) { console.warn("No se pudo guardar en caché:", e); }
}

// ========== FUNCIONES DE UTILIDAD ==========
function formatCurrency(value) {
  const num = Number(value) || 0;
  return `$${num.toLocaleString("es-MX", { minimumFractionDigits: 0 })}`;
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function optimizeDriveUrl(url, size = 400) {
  if (!url) return "";
  const match = url.match(/[-\w]{25,}/);
  if (match) {
    const id = match[0];
    const actualSize = window.innerWidth < 768 ? 400 : size;
    return `https://drive.google.com/thumbnail?id=${id}&sz=w${actualSize}`;
  }
  return url;
}

function generateRequestId() {
  return 'REQ_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
}

// ========== FUNCIONES DE TELÉFONO ==========
function updateSavedPhoneDisplay() {
  const container = document.getElementById("saved-phone-container");
  const display = document.getElementById("saved-phone-display");
  const savedPhone = localStorage.getItem("client_phone");
  if (container && display) {
    if (savedPhone && savedPhone.length === 10) {
      const formatted = `${savedPhone.slice(0,2)}-${savedPhone.slice(2,6)}-${savedPhone.slice(6)}`;
      display.textContent = formatted;
      container.style.display = "block";
    } else { container.style.display = "none"; }
  }
}

async function changePhoneNumber() {
  const currentPhone = localStorage.getItem("client_phone") || "";
  const formattedCurrent = currentPhone && currentPhone.length === 10 ? `${currentPhone.slice(0,2)}-${currentPhone.slice(2,6)}-${currentPhone.slice(6)}` : "no guardado";
  const newPhone = await prompt(`Número actual: ${formattedCurrent}\n\nIngresa tu nuevo número (10 dígitos):\nEjemplo: 8671234567\n\n⚠️ Solo números, sin espacios ni código país.`, currentPhone || "");
  if (newPhone === null) return;
  if (newPhone === "") {
    if (await confirm("¿Eliminar tu número guardado? Deberás ingresarlo nuevamente en tu próxima compra.")) {
      localStorage.removeItem("client_phone");
      updateSavedPhoneDisplay();
      await alert("📱 Número eliminado");
    }
    return;
  }
  let cleanPhone = newPhone.replace(/[^0-9]/g, '');
  if (cleanPhone.length !== 10) { await alert("❌ Número inválido. Debe tener 10 dígitos."); return; }
  localStorage.setItem("client_phone", cleanPhone);
  updateSavedPhoneDisplay();
  await alert("✅ ¡Número actualizado correctamente!");
}

// ========== MODAL DE PRIVACIDAD ==========
function showPrivacyModal(onAccept) {
  let modal = document.getElementById("privacy-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "privacy-modal";
    modal.className = "privacy-modal";
    modal.innerHTML = `
      <div class="privacy-modal-content">
        <div class="privacy-modal-header"><span class="privacy-icon">🔒</span><h2>Aviso de Privacidad</h2></div>
        <div class="privacy-modal-body">
          <p><strong>Z&R</strong>, con responsabilidad en el tratamiento de sus datos personales, le informa lo siguiente:</p>
          <h3>📱 Datos recopilados</h3><p>Para procesar tus compras, recopilamos tu <strong>número de teléfono</strong> (WhatsApp).</p>
          <h3>🎯 Finalidad</h3><p>Tu número será utilizado EXCLUSIVAMENTE para:</p>
          <ul><li>✓ Confirmar tu identidad en las solicitudes de compra</li><li>✓ Enviarte el link de pago cuando el administrador confirme tu pedido</li><li>✓ Comunicarme contigo sobre el estado de tu compra</li></ul>
          <h3>🚫 No compartimos tus datos</h3><p>Tu número de teléfono NO será vendido, cedido ni compartido con terceros. Solo será visible para el administrador de Z&R para procesar tu pedido.</p>
          <h3>⏰ Conservación</h3><p>Tus datos se conservarán únicamente durante el tiempo necesario para cumplir con las finalidades descritas.</p>
          <h3>✋ Tus derechos (ARCO)</h3><p>Puedes solicitar acceso, rectificación, cancelación u oposición de tus datos escribiendo a: <strong>zrstore@email.com</strong></p>
          <p class="privacy-date">Última actualización: Abril 2026</p>
        </div>
        <div class="privacy-modal-footer">
          <button id="reject-privacy-btn" class="privacy-btn reject">❌ Rechazar</button>
          <button id="accept-privacy-btn" class="privacy-btn accept">✅ Aceptar y continuar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  modal.style.display = "flex";
  const acceptBtn = document.getElementById("accept-privacy-btn");
  const rejectBtn = document.getElementById("reject-privacy-btn");
  const handleAccept = () => { localStorage.setItem("privacy_accepted", "true"); modal.style.display = "none"; if (onAccept) onAccept(); cleanup(); };
  const handleReject = () => { modal.style.display = "none"; showTemporaryMessage("❌ Debes aceptar el aviso de privacidad para continuar", "error"); cleanup(); };
  const cleanup = () => { if (acceptBtn) acceptBtn.removeEventListener("click", handleAccept); if (rejectBtn) rejectBtn.removeEventListener("click", handleReject); };
  if (acceptBtn) acceptBtn.addEventListener("click", handleAccept);
  if (rejectBtn) rejectBtn.addEventListener("click", handleReject);
}

// ========== FUNCIONES DE CARRITO ==========
function loadCartFromStorage() {
  try { localCart = JSON.parse(localStorage.getItem("cart") || "{}"); } catch { localCart = {}; }
  updateCartBadge();
}

function saveCartToStorage() { localStorage.setItem("cart", JSON.stringify(localCart)); }

function updateCartBadge() {
  const countEl = document.getElementById("cart-count");
  if (countEl) { const totalQty = Object.values(localCart).reduce((sum, item) => sum + (item.quantity || 0), 0); countEl.textContent = totalQty; }
}

function addToCart(product) {
  const id = product.ID;
  if (!id) { console.error("Producto sin ID:", product); return; }
  if (!localCart[id]) {
    localCart[id] = { id: id, name: product.Nombre || "Producto", price: Number(product.Precio || 0), quantity: 0, Imagen1: product.Imagen1 || "", Talla: product.Talla || "" };
  }
  localCart[id].quantity += 1;
  saveCartToStorage();
  updateCartBadge();
  animateCartAdd();
  window.dispatchEvent(new CustomEvent('cartUpdated', { detail: localCart }));
}

function animateCartAdd() {
  const btn = document.getElementById("floating-cart-btn");
  if (btn) { btn.style.transform = "translateY(-4px) scale(1.05)"; setTimeout(() => btn.style.transform = "", 180); }
}

window.changeCartQty = function(id, delta) {
  if (!localCart[id]) return;
  localCart[id].quantity += delta;
  if (localCart[id].quantity <= 0) delete localCart[id];
  saveCartToStorage();
  updateCartBadge();
  window.dispatchEvent(new CustomEvent('cartUpdated', { detail: localCart }));
};

window.removeFromCart = function(id) {
  if (localCart[id]) { delete localCart[id]; saveCartToStorage(); updateCartBadge(); window.dispatchEvent(new CustomEvent('cartUpdated', { detail: localCart })); }
};

// ========== FUNCIONES DE CARRITO DRAWER ==========
function openCartDrawer() {
  const drawer = document.getElementById("cart-drawer");
  const overlay = document.getElementById("overlay");
  if (drawer) drawer.classList.add("open");
  if (overlay) overlay.classList.add("visible");
  updateSavedPhoneDisplay();
}

function closeCartDrawer() {
  const drawer = document.getElementById("cart-drawer");
  const overlay = document.getElementById("overlay");
  if (drawer) drawer.classList.remove("open");
  if (overlay) overlay.classList.remove("visible");
}

function renderCart() {
  const container = document.getElementById("cart-items-container");
  if (!container) return;
  container.innerHTML = "";
  const items = Object.values(localCart);
  if (items.length === 0) {
    container.innerHTML = '<p class="helper-text">Tu carrito está vacío.</p>';
  } else {
    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "cart-item";
      row.innerHTML = `
        <div class="cart-item-info">
          <div class="cart-item-title">${escapeHtml(item.name || `ID ${item.id}`)}</div>
          <div class="cart-item-meta">${formatCurrency(item.price)} c/u</div>
          <div class="cart-item-actions">
            <button class="qty-btn" onclick="changeCartQty('${item.id}', -1)">−</button>
            <span class="qty-value">${item.quantity}</span>
            <button class="qty-btn" onclick="changeCartQty('${item.id}', 1)">+</button>
            <button class="cart-item-remove" onclick="removeFromCart('${item.id}')">Eliminar</button>
          </div>
        </div>
      `;
      container.appendChild(row);
    });
  }
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const subtotalEl = document.getElementById("cart-subtotal");
  const totalEl = document.getElementById("cart-total");
  if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
  if (totalEl) totalEl.textContent = formatCurrency(subtotal);
}

// ========== FUNCIONES DE MODAL IMAGEN ==========
function openImageModal(url) {
  const modal = document.getElementById("image-modal");
  const img = document.getElementById("image-modal-img");
  const overlay = document.getElementById("overlay");
  if (modal && img) {
    img.src = url;
    modal.classList.add("open");
    if (overlay) overlay.classList.add("visible");
  }
}

function closeImageModal() {
  const modal = document.getElementById("image-modal");
  const overlay = document.getElementById("overlay");
  if (modal) modal.classList.remove("open");
  if (overlay) overlay.classList.remove("visible");
}

function shareProduct(id) {
  const url = `${window.location.origin}${window.location.pathname}#producto-${id}`;
  if (navigator.share) {
    navigator.share({ title: "Producto", text: "Mira este producto", url }).catch(() => {});
  } else {
    navigator.clipboard.writeText(url).then(() => alert("Enlace copiado")).catch(() => {});
  }
}

// ========== IMAGE OBSERVER (Lazy Loading) ==========
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





// ========== CHECKOUT ==========
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

async function continueCheckout() {
  const items = Object.values(localCart);
  if (items.length === 0) return;
  
  let clientPhone = localStorage.getItem("client_phone");
  if (!clientPhone) {
    clientPhone = await prompt(
      "📱 Para procesar tu compra, ingresa tu número de WhatsApp (10 dígitos):\n\n⚠️ Solo números, sin espacios ni código país.\n🔒 Tus datos están protegidos (aceptaste el aviso de privacidad)",
      ""
    );
    if (!clientPhone) {
      showTemporaryMessage("❌ Necesitamos tu número para procesar la compra", "error");
      return;
    }
    clientPhone = clientPhone.replace(/[^0-9]/g, '');
    if (clientPhone.length !== 10) {
      showTemporaryMessage("❌ Número inválido. Debe tener 10 dígitos.", "error");
      return;
    }
    localStorage.setItem("client_phone", clientPhone);
  }
  
  showLoader("Enviando solicitud...");
  const requestId = generateRequestId();
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  let adminMessage = "*🛍️ NUEVA SOLICITUD DE COMPRA*\n\n";
  adminMessage += `*Cliente:* +52 ${clientPhone}\n`;
  adminMessage += `*Solicitud ID:* ${requestId}\n`;
  adminMessage += "━━━━━━━━━━━━━━━━━━━━\n";
  adminMessage += "*📦 Productos:*\n";
  items.forEach((item) => {
    adminMessage += `• ${item.name}\n`;
    adminMessage += `  Cantidad: ${item.quantity}\n`;
    adminMessage += `  Precio unitario: $${item.price.toLocaleString()}\n`;
    adminMessage += `  Subtotal: $${(item.price * item.quantity).toLocaleString()}\n`;
    adminMessage += "------------------------\n";
  });
  adminMessage += `*💰 Total: $${total.toLocaleString()} MXN*\n\n`;
  adminMessage += `_✅ Para continuar con el pago espera el mensaje de confirmacion_\n`;
  
  const whatsappAdminUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(adminMessage)}`;
  window.open(whatsappAdminUrl, '_blank');
  
  try {
    await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "saveClientPhone", requestId: requestId, phone: clientPhone })
    });
    
    const notificationItems = items.map(item => ({
      productId: item.id,
      nombre: item.name,
      cantidad: item.quantity,
      imagen: item.Imagen1 || "",
      talla: item.Talla || ""
    }));
    
    await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "createNotification", items: notificationItems, requestId: requestId })
    });
    
    localCart = {};
    saveCartToStorage();
    updateCartBadge();
    renderCart();
    showTemporaryMessage(`✅ ¡Solicitud enviada! Recibirás el link de pago por WhatsApp cuando el administrador confirme.`, "success");
    closeCartDrawer();
  } catch(err) {
    console.error("Error:", err);
    showTemporaryMessage("❌ Error al enviar la solicitud", "error");
  } finally {
    hideLoader();
  }
}






// ========== FUNCIONES DE PRODUCTOS (compartidas) ==========
async function fetchProductsAPI() {
  const cached = getCachedProducts();
  if (cached && cached.length > 0) return cached;
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    const products = data.products || data || [];
    setCachedProducts(products);
    return products;
  } catch (err) {
    console.error("Error fetching products:", err);
    return [];
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

// Mostrar banner de modo offline
function showOfflineBanner() {
  if (!connectionBanner) createConnectionBanner();
  
  connectionBanner.style.background = '#ffebee';
  connectionBanner.style.color = '#c62828';
  connectionBanner.style.borderBottom = '2px solid #ef5350';
  connectionBanner.innerHTML = `
    <span style="font-size: 20px;">📡</span>
    <span><strong>⚠️ Modo offline</strong> - Estás viendo una versión guardada del catálogo</span>
    <button id="dismiss-offline-btn" style="
      background: rgba(198, 40, 40, 0.1);
      border: 1px solid #ef5350;
      padding: 4px 12px;
      border-radius: 20px;
      color: #c62828;
      cursor: pointer;
      font-size: 12px;
    ">Entendido</button>
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

// Mostrar banner de vuelta online
function showOnlineBanner() {
  if (!connectionBanner) createConnectionBanner();
  
  connectionBanner.style.background = '#e8f5e9';
  connectionBanner.style.color = '#2e7d32';
  connectionBanner.style.borderBottom = '2px solid #4caf50';
  connectionBanner.innerHTML = `
    <span style="font-size: 20px;">✅</span>
    <span><strong>¡Conexión restablecida!</strong> La página se actualizará automáticamente</span>
    <button id="refresh-now-btn" style="
      background: #4caf50;
      border: none;
      padding: 6px 16px;
      border-radius: 20px;
      color: white;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
    ">Actualizar ahora</button>
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

// Agregar indicador visual flotante
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
  indicator.innerHTML = '📡 <span>Modo offline</span>';
  document.body.appendChild(indicator);
}

function removeOfflineIndicator() {
  const indicator = document.getElementById('offline-mode-indicator');
  if (indicator) indicator.remove();
}

// Verificar conexión periódicamente
function startConnectionMonitor() {
  setInterval(() => {
    const wasOnline = isOnline;
    isOnline = navigator.onLine;
    
    if (wasOnline !== isOnline) {
      if (!isOnline) {
        console.log('🔴 Conexión perdida - Activando modo offline');
        showOfflineBanner();
        window.dispatchEvent(new CustomEvent('connection:offline'));
      } else {
        console.log('🟢 Conexión recuperada');
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
    console.log('🟢 Navegador detectó conexión online');
    isOnline = true;
  });
  
  window.addEventListener('offline', () => {
    console.log('🔴 Navegador detectó conexión offline');
    isOnline = false;
    showOfflineBanner();
  });
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('⚠️ Service Worker no soportado');
    return false;
  }
  
  try {
    const registration = await navigator.serviceWorker.register('/ZNR/sw.js', {
      scope: '/ZNR/'
    });
    console.log('✅ Service Worker registrado:', registration.scope);
    
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data.type === 'CONNECTION_STATUS') {
        console.log('📡 Estado desde SW:', event.data.isOnline);
      }
    });
    
    return true;
  } catch (error) {
    console.error('❌ Error registrando SW:', error);
    return false;
  }
}

// Verificar si estamos en modo offline
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
    console.log('Error verificando modo offline:', err);
  }
  
  if (!navigator.onLine) {
    showOfflineBanner();
    return true;
  }
  return false;
}

// Exportar funciones
window.ConnectionMonitor = {
  showOfflineBanner,
  showOnlineBanner,
  startConnectionMonitor,
  registerServiceWorker,
  checkIfOfflineMode,
  isOnline: () => navigator.onLine
};







document.addEventListener('DOMContentLoaded', async () => {
  injectGlobalStyles();
  loadCartFromStorage();
  createImageObserver();
  
  // Inicializar precarga
  if (window.CacheManager && window.CacheManager.initPreloading) {
    window.CacheManager.initPreloading();
  }
  
  // Registrar Service Worker
  await registerServiceWorker();
  
  // Iniciar monitor de conexión
  startConnectionMonitor();
  
  // Verificar modo offline
  await checkIfOfflineMode();
  
  if (typeof renderCart === 'function') {
    renderCart();
    console.log("✅ Carrito renderizado al inicio");
  }
  
  const floatingCartBtn = document.getElementById("floating-cart-btn");
  if (floatingCartBtn) floatingCartBtn.addEventListener("click", openCartDrawer);
  
  const closeCartBtn = document.getElementById("close-cart-btn");
  if (closeCartBtn) closeCartBtn.addEventListener("click", closeCartDrawer);
  
  const changePhoneBtn = document.getElementById("change-phone-btn");
  if (changePhoneBtn) changePhoneBtn.addEventListener("click", changePhoneNumber);
  
  const overlay = document.getElementById("overlay");
  if (overlay) overlay.addEventListener("click", () => { closeCartDrawer(); closeImageModal(); });
  
  const closeImageBtn = document.getElementById("close-image-modal");
  if (closeImageBtn) closeImageBtn.addEventListener("click", closeImageModal);
  
  updateSavedPhoneDisplay();
  
  window.addEventListener('cartUpdated', () => {
    if (typeof renderCart === 'function') renderCart();
    updateCartBadge();
  });
  
  window.addEventListener('connection:offline', () => {
    console.log('📡 Evento: Conexión perdida');
  });
  
  window.addEventListener('connection:online', () => {
    console.log('📡 Evento: Conexión recuperada');
    if (typeof loadProductsInBackground === 'function') {
      loadProductsInBackground();
    }
  });
});
