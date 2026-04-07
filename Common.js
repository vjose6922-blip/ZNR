// ============================================
// COMMON.JS - Funciones compartidas entre todas las páginas
// ============================================

// ========== CONFIGURACIÓN GLOBAL ==========
const WHATSAPP_NUMBER = "528671781272";
const CACHE_KEY = 'zr_products_cache';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutos

// ========== INYECTAR ESTILOS GLOBALES ==========
function injectGlobalStyles() {
  if (document.querySelector('#global-styles')) return;
  
  const modalStyles = `
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
    
    .custom-alert-modal.closing {
      animation: modalFadeOut 0.15s ease forwards;
      pointer-events: none;
    }
    
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
    
    .custom-alert-modal.closing .custom-alert-content {
      animation: contentScaleOut 0.15s ease forwards;
    }
    
    .custom-alert-header {
      background: linear-gradient(135deg, #3b1f5f, #ff4f81);
      color: white;
      padding: 20px;
      text-align: center;
    }
    
    .custom-alert-icon {
      font-size: 40px;
      display: block;
      margin-bottom: 8px;
    }
    
    .custom-alert-header h3 {
      margin: 0;
      font-size: 18px;
    }
    
    .custom-alert-body {
      padding: 24px 20px;
      text-align: center;
      font-size: 15px;
      color: #333;
      line-height: 1.5;
    }
    
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
    
    .custom-alert-btn.confirm {
      background: linear-gradient(135deg, #22c55e, #16a34a);
      color: white;
    }
    
    .custom-alert-btn.cancel {
      background: #f5f5f8;
      color: #666;
      border: 1px solid #e0e0e0;
    }
    
    .custom-alert-btn.confirm:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(34, 197, 94, 0.4);
    }
    
    .custom-alert-btn.cancel:hover {
      background: #ffebee;
      color: #c62828;
      border-color: #ef9a9a;
    }
    
    .custom-alert-input {
      width: 100%;
      padding: 12px;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      font-size: 14px;
      margin-top: 12px;
      box-sizing: border-box;
    }
    
    .custom-alert-input:focus {
      outline: none;
      border-color: #ff4f81;
      box-shadow: 0 0 0 3px rgba(255, 79, 129, 0.1);
    }
    
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
    
    .global-loader.hidden {
      display: none;
    }
    
    .loader-spinner {
      width: 50px;
      height: 50px;
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ff4f81;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    
    .loader-text {
      margin-top: 16px;
      color: white;
      font-size: 14px;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    @keyframes modalFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes modalFadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
    
    @keyframes contentScaleIn {
      from {
        transform: scale(0.95);
        opacity: 0;
      }
      to {
        transform: scale(1);
        opacity: 1;
      }
    }
    
    @keyframes contentScaleOut {
      from {
        transform: scale(1);
        opacity: 1;
      }
      to {
        transform: scale(0.95);
        opacity: 0;
      }
    }
    
    @keyframes slideUp {
      from { opacity: 0; transform: translateX(-50%) translateY(20px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    
    @keyframes slideDown {
      from { opacity: 1; transform: translateX(-50%) translateY(0); }
      to { opacity: 0; transform: translateX(-50%) translateY(20px); }
    }
  `;
  
  const styleSheet = document.createElement("style");
  styleSheet.id = "global-styles";
  styleSheet.textContent = modalStyles;
  document.head.appendChild(styleSheet);
}

// ========== MODALES PERSONALIZADOS ==========
let activeModal = null;

function closeCurrentModal() {
  if (activeModal) {
    activeModal.classList.add("closing");
    setTimeout(() => {
      if (activeModal && activeModal.parentNode) {
        activeModal.remove();
      }
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
      <div class="custom-alert-header">
        <span class="custom-alert-icon">${escapeHtml(icon)}</span>
        <h3>${escapeHtml(title)}</h3>
      </div>
      <div class="custom-alert-body">
        <p>${escapeHtml(message)}</p>
      </div>
      <div class="custom-alert-footer">
        <button class="custom-alert-btn confirm">${escapeHtml(confirmText)}</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  activeModal = modal;
  
  const confirmBtn = modal.querySelector(".custom-alert-btn.confirm");
  
  const close = () => {
    if (!modal.parentNode) return;
    modal.classList.add("closing");
    setTimeout(() => {
      if (modal.parentNode) modal.remove();
      if (activeModal === modal) activeModal = null;
      if (onConfirm) onConfirm();
    }, 150);
  };
  
  confirmBtn.addEventListener("click", close);
  modal.addEventListener("click", (e) => {
    if (e.target === modal && !modal.classList.contains("closing")) {
      close();
    }
  });
}

function showCustomConfirm(options) {
  const { title, message, icon = "❓", confirmText = "Aceptar", cancelText = "Cancelar", onConfirm, onCancel } = options;
  
  const modal = document.createElement("div");
  modal.className = "custom-alert-modal";
  modal.innerHTML = `
    <div class="custom-alert-content">
      <div class="custom-alert-header">
        <span class="custom-alert-icon">${escapeHtml(icon)}</span>
        <h3>${escapeHtml(title)}</h3>
      </div>
      <div class="custom-alert-body">
        <p>${escapeHtml(message)}</p>
      </div>
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
    setTimeout(() => {
      if (modal.parentNode) modal.remove();
      if (activeModal === modal) activeModal = null;
      if (callback) callback();
    }, 150);
  };
  
  confirmBtn.addEventListener("click", () => close(onConfirm));
  cancelBtn.addEventListener("click", () => close(onCancel));
  
  modal.addEventListener("click", (e) => {
    if (e.target === modal && !modal.classList.contains("closing")) {
      close(onCancel);
    }
  });
}

function showCustomPrompt(options) {
  const { title, message, icon = "📝", defaultValue = "", confirmText = "Aceptar", cancelText = "Cancelar", onConfirm, onCancel } = options;
  
  const modal = document.createElement("div");
  modal.className = "custom-alert-modal";
  modal.innerHTML = `
    <div class="custom-alert-content">
      <div class="custom-alert-header">
        <span class="custom-alert-icon">${escapeHtml(icon)}</span>
        <h3>${escapeHtml(title)}</h3>
      </div>
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
    setTimeout(() => {
      if (modal.parentNode) modal.remove();
      if (activeModal === modal) activeModal = null;
      if (callback) callback(value);
    }, 150);
  };
  
  confirmBtn.addEventListener("click", () => close(onConfirm, input.value));
  cancelBtn.addEventListener("click", () => close(onCancel, null));
  
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      close(onConfirm, input.value);
    }
  });
  
  modal.addEventListener("click", (e) => {
    if (e.target === modal && !modal.classList.contains("closing")) {
      close(onCancel, null);
    }
  });
}

// Interceptar alert/confirm/prompt (solo una vez)
if (!window.alertIntercepted) {
  window.originalAlert = window.alert;
  window.alert = function(message) {
    return new Promise((resolve) => {
      closeCurrentModal();
      showCustomAlert({
        title: "Aviso",
        message: String(message),
        icon: "ℹ️",
        confirmText: "Aceptar",
        onConfirm: () => resolve()
      });
    });
  };
  
  window.originalConfirm = window.confirm;
  window.confirm = function(message) {
    return new Promise((resolve) => {
      closeCurrentModal();
      showCustomConfirm({
        title: "Confirmar",
        message: String(message),
        icon: "❓",
        confirmText: "Aceptar",
        cancelText: "Cancelar",
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      });
    });
  };
  
  window.originalPrompt = window.prompt;
  window.prompt = function(message, defaultValue = "") {
    return new Promise((resolve) => {
      closeCurrentModal();
      showCustomPrompt({
        title: "Ingresar información",
        message: String(message),
        icon: "📝",
        defaultValue: defaultValue,
        confirmText: "Aceptar",
        cancelText: "Cancelar",
        onConfirm: (value) => resolve(value),
        onCancel: () => resolve(null)
      });
    });
  };
  
  window.alertIntercepted = true;
}

// ========== FUNCIONES DE CACHÉ ==========
function getCachedProducts() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCachedProducts(products) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: products,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.warn("No se pudo guardar en caché:", e);
  }
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

// ========== FUNCIONES DE LOADER Y MENSAJES ==========
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
  messageDiv.style.cssText = `
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === "error" ? "#ef4444" : "#22c55e"};
    color: white;
    padding: 12px 24px;
    border-radius: 50px;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    animation: slideUp 0.3s ease;
  `;
  messageDiv.textContent = text;
  document.body.appendChild(messageDiv);
  
  setTimeout(() => {
    messageDiv.style.animation = "slideDown 0.3s ease";
    setTimeout(() => messageDiv.remove(), 300);
  }, 3000);
}

// ========== FUNCIONES DE WHATSAPP ==========
function generateRequestId() {
  return 'REQ_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
}

function buildWhatsAppMessage(items, total) {
  let message = "Hola, quiero comprar:%0A%0A";
  items.forEach((item) => {
    message += `${encodeURIComponent(item.name)} - ${item.quantity} pieza${item.quantity > 1 ? "s" : ""}%0A`;
  });
  message += `%0ATotal: ${encodeURIComponent(formatCurrency(total))}`;
  return message;
}

// ========== FUNCIONES DE CARRITO (compartidas) ==========
let localCart = {};

function loadCartFromStorage() {
  try {
    const raw = localStorage.getItem("cart");
    localCart = raw ? JSON.parse(raw) : {};
  } catch {
    localCart = {};
  }
  updateCartBadge();
}

function saveCartToStorage() {
  localStorage.setItem("cart", JSON.stringify(localCart));
}

function updateCartBadge() {
  const countEl = document.getElementById("cart-count");
  if (countEl) {
    const totalQty = Object.values(localCart).reduce((sum, item) => sum + (item.quantity || 0), 0);
    countEl.textContent = totalQty;
  }
}

function addToCart(product) {
  const id = product.ID;
  if (!id) {
    console.error("Producto sin ID:", product);
    return;
  }
  
  if (!localCart[id]) {
    localCart[id] = {
      id: id,
      name: product.Nombre || "Producto",
      price: Number(product.Precio || 0),
      quantity: 0,
      Imagen1: product.Imagen1 || "",
      Talla: product.Talla || ""
    };
  }
  localCart[id].quantity += 1;
  saveCartToStorage();
  updateCartBadge();
  animateCartAdd();
  
  // Disparar evento personalizado para que otras páginas actualicen su carrito
  window.dispatchEvent(new CustomEvent('cartUpdated', { detail: localCart }));
}

function animateCartAdd() {
  const btn = document.getElementById("floating-cart-btn");
  if (btn) {
    btn.style.transform = "translateY(-4px) scale(1.05)";
    setTimeout(() => btn.style.transform = "", 180);
  }
}

window.changeCartQty = function(id, delta) {
  if (!localCart[id]) return;
  localCart[id].quantity += delta;
  if (localCart[id].quantity <= 0) {
    delete localCart[id];
  }
  saveCartToStorage();
  updateCartBadge();
  window.dispatchEvent(new CustomEvent('cartUpdated', { detail: localCart }));
};

window.removeFromCart = function(id) {
  if (localCart[id]) {
    delete localCart[id];
    saveCartToStorage();
    updateCartBadge();
    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: localCart }));
  }
};

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
    } else {
      container.style.display = "none";
    }
  }
}

async function changePhoneNumber() {
  const currentPhone = localStorage.getItem("client_phone") || "";
  const formattedCurrent = currentPhone && currentPhone.length === 10 
    ? `${currentPhone.slice(0,2)}-${currentPhone.slice(2,6)}-${currentPhone.slice(6)}` 
    : "no guardado";
  
  const newPhone = await prompt(
    `Número actual: ${formattedCurrent}\n\nIngresa tu nuevo número (10 dígitos):\nEjemplo: 8671234567\n\n⚠️ Solo números, sin espacios ni código país.`,
    currentPhone || ""
  );
  
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
  if (cleanPhone.length !== 10) {
    await alert("❌ Número inválido. Debe tener 10 dígitos.");
    return;
  }
  
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
        <div class="privacy-modal-header">
          <span class="privacy-icon">🔒</span>
          <h2>Aviso de Privacidad</h2>
        </div>
        <div class="privacy-modal-body">
          <p><strong>Z&R</strong>, con responsabilidad en el tratamiento de sus datos personales, le informa lo siguiente:</p>
          
          <h3>📱 Datos recopilados</h3>
          <p>Para procesar tus compras, recopilamos tu <strong>número de teléfono</strong> (WhatsApp).</p>
          
          <h3>🎯 Finalidad</h3>
          <p>Tu número será utilizado EXCLUSIVAMENTE para:</p>
          <ul>
            <li>✓ Confirmar tu identidad en las solicitudes de compra</li>
            <li>✓ Enviarte el link de pago cuando el administrador confirme tu pedido</li>
            <li>✓ Comunicarme contigo sobre el estado de tu compra</li>
          </ul>
          
          <h3>🚫 No compartimos tus datos</h3>
          <p>Tu número de teléfono NO será vendido, cedido ni compartido con terceros. Solo será visible para el administrador de Z&R para procesar tu pedido.</p>
          
          <h3>⏰ Conservación</h3>
          <p>Tus datos se conservarán únicamente durante el tiempo necesario para cumplir con las finalidades descritas.</p>
          
          <h3>✋ Tus derechos (ARCO)</h3>
          <p>Puedes solicitar acceso, rectificación, cancelación u oposición de tus datos escribiendo a: <strong>zrstore@email.com</strong></p>
          
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
  
  const handleAccept = () => {
    localStorage.setItem("privacy_accepted", "true");
    modal.style.display = "none";
    if (onAccept) onAccept();
    cleanup();
  };
  
  const handleReject = () => {
    modal.style.display = "none";
    showTemporaryMessage("❌ Debes aceptar el aviso de privacidad para continuar", "error");
    cleanup();
  };
  
  const cleanup = () => {
    if (acceptBtn) acceptBtn.removeEventListener("click", handleAccept);
    if (rejectBtn) rejectBtn.removeEventListener("click", handleReject);
  };
  
  if (acceptBtn) acceptBtn.addEventListener("click", handleAccept);
  if (rejectBtn) rejectBtn.addEventListener("click", handleReject);
}

// ========== INICIALIZACIÓN AUTOMÁTICA ==========
document.addEventListener('DOMContentLoaded', () => {
  injectGlobalStyles();
  loadCartFromStorage();
  
  // Configurar botón flotante del carrito si existe
  const floatingCartBtn = document.getElementById("floating-cart-btn");
  if (floatingCartBtn && typeof openCartDrawer === 'function') {
    floatingCartBtn.addEventListener("click", openCartDrawer);
  }
  
  // Configurar botón de cambiar número si existe
  const changePhoneBtn = document.getElementById("change-phone-btn");
  if (changePhoneBtn) {
    changePhoneBtn.addEventListener("click", changePhoneNumber);
  }
  
  // Actualizar display del teléfono
  updateSavedPhoneDisplay();
});
