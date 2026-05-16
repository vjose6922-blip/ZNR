const WHATSAPP_NUMBER = "528671781272";
const CACHE_KEY = 'zr_products_cache';
const CACHE_EXPIRY = 5 * 60 * 1000; 
const API_URL = "https://script.google.com/macros/s/AKfycbzNshrt3zldBNiyoB8x36ktCEO02H0cKxebiTuK7UAbsgd5R9biaCW7W4ihm1aVOJG7ww/exec";
const RECENT_PRODUCTS_KEY = 'zr_recent_products';
const MAX_RECENT_PRODUCTS = 12;
const UP_KEY      = 'zr_user_prefs_v1';
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




function hasFreeShipping(price) {
  const numericPrice = Number(price) || 0;
  return numericPrice >= 300;
}

function getShippingBadge(price) {
  if (hasFreeShipping(price)) {
    return `<span class="shipping-badge" title="Envío a domicilio o punto intermedio">🚚</span>`;
  }
  return '';
}






function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '&#x5C;')    // backslash (primero para no escapar los siguientes)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;')      // backticks
    .replace(/\//g, '&#x2F;');   // forward slash
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

function escapeJsString(str) {
  return String(str)
    .replace(/\\/g, "\\\\")   
    .replace(/'/g, "\\'")     
    .replace(/"/g, '\\"')     
    .replace(/\n/g, "\\n")    
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replace(/\u2028/g, "\\u2028") 
    .replace(/\u2029/g, "\\u2029");
}


function optimizeDriveUrl(url, size = 400) {
  if (!url) return "";
  const match = url.match(/[-\w]{25,}/);
  if (match) {
    const id = match[0];
    // Tamaños responsivos según dispositivo real
    const screenWidth = window.innerWidth;
    let actualSize;
    
    if (screenWidth < 480) {
      actualSize = 300;   // Móvil pequeño
    } else if (screenWidth < 768) {
      actualSize = 400;   // Móvil grande/tablet
    } else if (screenWidth < 1200) {
      actualSize = 600;   // Desktop pequeño
    } else {
      actualSize = 800;   // Desktop grande
    }
    
    // Si la función fue llamada con un tamaño específico, respetarlo pero sin exceder 800
    if (size && size < actualSize) {
      actualSize = Math.min(size, 800);
    }
    
    return `https://drive.google.com/thumbnail?id=${id}&sz=w${actualSize}`;
  }
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

  // Mostrar dirección guardada si existe
  const addrContainer = document.getElementById("saved-address-container");
  const addrDisplay   = document.getElementById("saved-address-display");
  const savedAddress  = localStorage.getItem("client_address");
  if (addrContainer && addrDisplay) {
    if (savedAddress) {
      addrDisplay.textContent = savedAddress;
      addrContainer.style.display = "block";
    } else {
      addrContainer.style.display = "none";
    }
  }
}

async function changePhoneNumber() {
  
  const currentPhone = localStorage.getItem("client_phone") || "";
  const formattedCurrent = currentPhone && currentPhone.length === 10 
    ? `${currentPhone.slice(0,2)}-${currentPhone.slice(2,6)}-${currentPhone.slice(6)}` 
    : "no guardado";
  
  const newPhone = await new Promise((resolve) => {
    showCustomPrompt({
      title: "📱 Cambiar número de teléfono",
      message: `Número actual: ${formattedCurrent}\n\nIngresa tu nuevo número (10 dígitos):\nEjemplo: 8671234567\n\n⚠️ Solo números, sin espacios ni código país.`,
      icon: "📱",
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
        title: "🗑️ Eliminar número",
        message: "¿Eliminar tu número guardado? Deberás ingresarlo nuevamente en tu próxima compra.",
        icon: "⚠️",
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
      title: "❌ Número inválido",
      message: "El número debe tener exactamente 10 dígitos.\nEjemplo: 8671234567",
      icon: "❌",
      confirmText: "Entendido"
    });
    return;
  }
  
  localStorage.setItem("client_phone", cleanPhone);
  updateSavedPhoneDisplay();
  
  const formatted = `${cleanPhone.slice(0,2)}-${cleanPhone.slice(2,6)}-${cleanPhone.slice(6)}`;
  showCustomAlert({
    title: "✅ ¡Número actualizado!",
    message: `Tu nuevo número es: ${formatted}\n\nSe usará para futuras compras.`,
    icon: "📱",
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
        <div class="privacy-modal-header"><span class="privacy-icon">🔒</span><h2>Aviso de Privacidad</h2></div>
        <div class="privacy-modal-body">
          <p><strong>Z&R</strong>, con responsabilidad en el tratamiento de sus datos personales, le informa lo siguiente:</p>
          <h3>📱 Datos recopilados</h3><p>Para procesar tus compras, recopilamos tu <strong>número de teléfono</strong> (WhatsApp), <strong>dirección de envío</strong> y <strong>horario disponible para entrega</strong>.</p>
          <h3>🎯 Finalidad</h3><p>Tus datos serán utilizados EXCLUSIVAMENTE para:</p>
          <ul><li>✓ Confirmar tu identidad en las solicitudes de compra</li><li>✓ Enviarte el link de pago cuando el administrador confirme tu pedido</li><li>✓ Coordinar la entrega en tu dirección y horario indicados</li><li>✓ Comunicarnos contigo sobre el estado de tu compra</li></ul>
          <h3>🚫 No compartimos tus datos</h3><p>Tu número, dirección y horario NO serán vendidos, cedidos ni compartidos con terceros. Solo serán visibles para el administrador de Z&R para procesar y entregar tu pedido.</p>
          <h3>⏰ Conservación</h3><p>Tus datos se conservarán únicamente durante el tiempo necesario para cumplir con las finalidades descritas. Puedes eliminarlos en cualquier momento desde el panel de Preferencias.</p>
          <h3>✋ Tus derechos (ARCO)</h3><p>Puedes solicitar la eliminación de tus datos escribiendo a: <strong>contacto@zrtienda.com</strong></p>
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

function loadCartFromStorage() {
  try {
    const raw = JSON.parse(localStorage.getItem("cart") || "{}");
    localCart = {};

    for (const [key, item] of Object.entries(raw)) {
      // Validar que cada item tenga la estructura esperada y valores sensatos
      if (
        item && typeof item === 'object' &&
        item.id !== undefined &&
        typeof item.quantity === 'number' && item.quantity > 0 && item.quantity <= 99 &&
        typeof item.price === 'number' && item.price >= 0 && item.price <= 999999
      ) {
        localCart[key] = {
          id:       item.id,
          name:     String(item.name || '').slice(0, 200),
          price:    item.price,
          quantity: Math.floor(item.quantity),
          Imagen1:  String(item.Imagen1 || '').slice(0, 500),
          Talla:      String(item.Talla || '').slice(0, 50),
          _comunidad: item._comunidad || false,
          _vendedor:  String(item._vendedor  || '').slice(0, 100),
          _vendorTel: String(item._vendorTel || '').slice(0, 20)
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
  const countEl = document.getElementById("cart-count");
  if (countEl) { const totalQty = Object.values(localCart).reduce((sum, item) => sum + (item.quantity || 0), 0); countEl.textContent = totalQty; }
}

function addToCart(product) {
  const id = product.ID;
  if (!id) { console.error("Producto sin ID:", product); return; }
  if (!localCart[id]) {
    localCart[id] = { id: id, name: product.Nombre || "Producto", price: Number(product.Precio || 0), quantity: 0, Imagen1: product.Imagen1 || "", Talla: product.Talla || "", _comunidad: product._comunidad || false, _vendedor: product._vendedor || "", _vendorTel: product._vendorTel || "" };
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
  console.log("🔍 [CARRITO] Abriendo carrito...");
  
  const drawer = document.getElementById("cart-drawer");
  const overlay = document.getElementById("overlay");
  
  if (!drawer) {
    console.error("❌ [CARRITO] No existe #cart-drawer");
    return;
  }
  
  if (!overlay) {
    console.error("❌ [CARRITO] No existe #overlay");
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



// ========== FUNCIONES AUXILIARES GLOBALES PARA EL CARRITO ==========
// Definir ANTES de renderCart para que estén disponibles

window.changeCartQty = function(productId, delta) {
  if (!localCart[productId]) return;
  const newQty = localCart[productId].quantity + delta;
  if (newQty <= 0) {
    delete localCart[productId];
  } else {
    localCart[productId].quantity = Math.min(newQty, 99);
  }
  saveCartToStorage();
  updateCartBadge();
  renderCart();  // Re-renderizar carrito
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

// Handlers que usan las funciones globales
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

// ========== FUNCIÓN PRINCIPAL renderCart ==========
function renderCart() {
  console.log("🔄 [RENDER] renderCart() iniciada");
  
  const container = document.getElementById("cart-items-container");
  if (!container) {
    console.error("❌ [RENDER] No existe #cart-items-container");
    return;
  }
  
  container.innerHTML = "";
  const items = Object.values(localCart);
  
  if (items.length === 0) {
    container.innerHTML = `
      <div class="cart-empty-state">
        <div class="cart-empty-icon">🛍️</div>
        <p class="helper-text">Tu carrito está vacío.</p>
        <p class="cart-empty-hint">Agrega productos para comenzar</p>
      </div>`;
  } else {
    const znrItems       = items.filter(i => !i._comunidad);
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
             <span>👕</span>
           </div>`;
      const tallaBadge = item.Talla
        ? `<span class="cart-item-talla">Talla: ${escapeHtml(item.Talla)}</span>`
        : '';
      const vendorBadge = item._comunidad && item._vendedor
        ? `<span class="cart-item-vendor">🏪 ${escapeHtml(item._vendedor)}</span>`
        : '';
      row.innerHTML = `
        ${imgHtml}
        <div class="cart-item-info">
          <div class="cart-item-title">${escapeHtml(item.name || `ID ${item.id}`)}</div>
          ${tallaBadge}
          ${vendorBadge}
          <div class="cart-item-meta">${formatCurrency(item.price)} c/u</div>
          <div class="cart-item-actions">
            <button class="qty-btn" data-action="decrement" data-id="${item.id}">−</button>
            <span class="qty-value">${item.quantity}</span>
            <button class="qty-btn" data-action="increment" data-id="${item.id}">+</button>
            <button class="cart-item-remove" data-action="remove" data-id="${item.id}">🗑</button>
          </div>
        </div>
      `;
      container.appendChild(row);
    }

    // ── Sección Z&R ────────────────────────────────────────────
    if (znrItems.length > 0) {
      if (comunidadItems.length > 0) {
        const sep = document.createElement('div');
        sep.className = 'cart-section-header';
        sep.innerHTML = '<span>🏬 Z&R Tienda</span>';
        container.appendChild(sep);
      }
      znrItems.forEach(renderCartItem);
    }

    // ── Sección Comunidad ──────────────────────────────────────
    if (comunidadItems.length > 0) {
      const sep2 = document.createElement('div');
      sep2.className = 'cart-section-header cart-section-comunidad';
      sep2.innerHTML = '<span>🤝 Comunidad</span><small>Pago directo al vendedor vía WhatsApp</small>';
      container.appendChild(sep2);
      comunidadItems.forEach(renderCartItem);
    }
    
    // Asignar eventos DESPUÉS de que las funciones están definidas
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

  // ── Actualizar etiqueta del botón de compra según el tipo de items ──
  const _znrCount  = items.filter(i => !i._comunidad).length;
  const _commCount = items.filter(i =>  i._comunidad).length;
  const requestBtn = document.getElementById("request-purchase-btn");
  if (requestBtn) {
    if (_znrCount > 0 && _commCount > 0) {
      requestBtn.textContent = "📲 Enviar pedidos (Z&R + Comunidad)";
    } else if (_commCount > 0 && _znrCount === 0) {
      requestBtn.textContent = "💬 Contactar vendedor(es) por WhatsApp";
    } else {
      requestBtn.textContent = "📲 Solicitar por WhatsApp";
    }
  }
  
  // ========== 🚚 AGREGAR INFORMACIÓN DE ENVÍO EN EL CARRITO ==========
  const hasShippingItem = items.some(item => hasFreeShipping(item.price));
  const footer = document.querySelector('#cart-drawer .cart-footer');
  const existingShipping = footer ? footer.querySelector('.cart-shipping-info') : null;
  
  if (hasShippingItem && footer && !existingShipping) {
    const requestBtn = footer.querySelector('#request-purchase-btn');
    if (requestBtn) {
      const shippingHtml = `
        <div class="cart-shipping-info">
          <div class="shipping-badge-cart">🚚 Envío disponible</div>
          <p class="shipping-note">📦 Las entregas pueden variar dependiendo la distancia. Se puede realizar a domicilio o punto intermedio.</p>
        </div>
      `;
      requestBtn.insertAdjacentHTML('beforebegin', shippingHtml);
    }
  } else if (!hasShippingItem && existingShipping) {
    existingShipping.remove();
  }
  // ========== FIN AGREGADO ==========
  
  // Configurar botón de cambio de número
  setTimeout(() => {
    const changePhoneBtn = document.getElementById('change-phone-btn');
    if (changePhoneBtn) {
      console.log("📞 Configurando botón change-phone-btn");
      const newBtn = changePhoneBtn.cloneNode(true);
      changePhoneBtn.parentNode.replaceChild(newBtn, changePhoneBtn);
      
      newBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("🖱️ Click en botón Cambiar número");
        if (typeof window.changePhoneNumber === 'function') {
          await window.changePhoneNumber();
        } else if (typeof changePhoneNumber === 'function') {
          await changePhoneNumber();
        } else {
          console.error("❌ changePhoneNumber no está definida");
          if (typeof showCustomAlert === 'function') {
            showCustomAlert({
              title: "Error",
              message: "Función no disponible. Recarga la página.",
              icon: "❌",
              confirmText: "Aceptar"
            });
          }
        }
      });
    } else {
      console.warn("📞 No se encontró el botón change-phone-btn en el DOM");
    }
  }, 100);
  
  updateSavedPhoneDisplay();
}

// ── Image modal con efecto "pasar página" ──────────────────────
let _modalImages  = [];  // Array de URLs del producto actual
let _modalIndex   = 0;   // Imagen mostrada actualmente
let _modalTouchStartX = 0;

function openImageModal(url, productId = null, allImages = []) {
  const modal   = document.getElementById("image-modal");
  const overlay = document.getElementById("overlay");
  if (!modal) return;

  // Construir lista de imágenes: la URL actual + extras pasados
  _modalImages = [url, ...allImages.filter(u => u && u !== url)];
  _modalIndex  = 0;

  _renderModalImage(modal, 0, 'none');
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

  // Animación de salida/entrada estilo página
  if (direction !== 'none') {
    img.classList.add(direction === 'right' ? 'im-exit-left' : 'im-exit-right');
    setTimeout(() => {
      img.src = _modalImages[idx];
      img.classList.remove('im-exit-left','im-exit-right');
      img.classList.add(direction === 'right' ? 'im-enter-right' : 'im-enter-left');
      setTimeout(() => img.classList.remove('im-enter-right','im-enter-left'), 320);
    }, 220);
  } else {
    img.src = _modalImages[idx];
  }

  // Controles navegación
  if (prev) prev.style.display = _modalImages.length > 1 ? '' : 'none';
  if (next) next.style.display = _modalImages.length > 1 ? '' : 'none';

  // Dots indicadores
  if (dots) {
    dots.innerHTML = _modalImages.map((_, i) =>
      `<span class="im-dot${i === idx ? ' active' : ''}"></span>`
    ).join('');
  }
}

function _modalNav(dir) {
  if (_modalImages.length < 2) return;
  _modalIndex = (_modalIndex + dir + _modalImages.length) % _modalImages.length;
  const modal = document.getElementById("image-modal");
  if (modal) _renderModalImage(modal, _modalIndex, dir > 0 ? 'right' : 'left');
}

function closeImageModal() {
  const modal   = document.getElementById("image-modal");
  const overlay = document.getElementById("overlay");
  if (modal) modal.classList.remove("open");
  if (overlay) overlay.classList.remove("visible");
  _modalImages = []; _modalIndex = 0;
}

// Inicializar controles del modal (se llama una vez desde initApp)
function initImageModalControls() {
  const modal = document.getElementById("image-modal");
  if (!modal || modal.dataset.imInit) return;
  modal.dataset.imInit = '1';

  // Inyectar estructura extendida
  const closeBtn = modal.querySelector('.close-image-modal, #close-image-modal');
  modal.innerHTML = `
    <button class="im-close icon-button" aria-label="Cerrar">✕</button>
    <button class="im-prev" aria-label="Anterior">‹</button>
    <div class="im-wrapper">
      <img id="image-modal-img" alt="Vista de producto" />
    </div>
    <button class="im-next" aria-label="Siguiente">›</button>
    <div class="im-dots"></div>
  `;

  modal.querySelector('.im-close').addEventListener('click', closeImageModal);
  modal.querySelector('.im-prev').addEventListener('click', () => _modalNav(-1));
  modal.querySelector('.im-next').addEventListener('click', () => _modalNav(1));

  // Click en overlay (fuera del wrapper) cierra
  modal.addEventListener('click', e => {
    if (!e.target.closest('.im-wrapper') &&
        !e.target.closest('.im-prev') &&
        !e.target.closest('.im-next') &&
        !e.target.closest('.im-close')) closeImageModal();
  });

  // Swipe en móvil
  modal.addEventListener('touchstart', e => { _modalTouchStartX = e.touches[0].clientX; }, {passive:true});
  modal.addEventListener('touchend',   e => {
    const dx = e.changedTouches[0].clientX - _modalTouchStartX;
    if (Math.abs(dx) > 40) _modalNav(dx < 0 ? 1 : -1);
  }, {passive:true});

  // Teclado
  document.addEventListener('keydown', e => {
    if (!modal.classList.contains('open')) return;
    if (e.key === 'ArrowRight') _modalNav(1);
    if (e.key === 'ArrowLeft')  _modalNav(-1);
    if (e.key === 'Escape')     closeImageModal();
  });

  // Inyectar CSS del modal
  if (!document.getElementById('im-styles')) {
    const st = document.createElement('style');
    st.id = 'im-styles';
    st.textContent = `
      .image-modal{position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:8000;display:none;flex-direction:column;align-items:center;justify-content:center;gap:0}
      .image-modal.open{display:flex}
      .im-wrapper{position:relative;max-width:92vw;max-height:80dvh;overflow:hidden;border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.6)}
      .im-wrapper img{display:block;max-width:92vw;max-height:80dvh;object-fit:contain;transition:none}
      .im-close{position:fixed;top:16px;right:16px;z-index:10;background:rgba(255,255,255,.12);border:none;color:#fff;width:38px;height:38px;border-radius:50%;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center}
      .im-prev,.im-next{position:fixed;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.1);border:none;color:#fff;width:44px;height:44px;border-radius:50%;font-size:28px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s;z-index:10;backdrop-filter:blur(4px)}
      .im-prev{left:12px}.im-next{right:12px}
      .im-prev:hover,.im-next:hover{background:rgba(255,79,129,.35)}
      .im-dots{display:flex;gap:6px;margin-top:14px}
      .im-dot{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.3);transition:all .2s}
      .im-dot.active{background:#ff4f81;width:18px;border-radius:4px}
      @keyframes im-slide-in-right{from{opacity:0;transform:translateX(60px)}to{opacity:1;transform:translateX(0)}}
      @keyframes im-slide-in-left{from{opacity:0;transform:translateX(-60px)}to{opacity:1;transform:translateX(0)}}
      @keyframes im-slide-out-left{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(-60px)}}
      @keyframes im-slide-out-right{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(60px)}}
      .im-enter-right{animation:im-slide-in-right .3s ease forwards}
      .im-enter-left{animation:im-slide-in-left .3s ease forwards}
      .im-exit-left{animation:im-slide-out-left .22s ease forwards}
      .im-exit-right{animation:im-slide-out-right .22s ease forwards}
    `;
    document.head.appendChild(st);
  }
}

window.openImageModal  = openImageModal;
window.closeImageModal = closeImageModal;
window.initImageModalControls = initImageModalControls;



function shareProduct(id) {
  const url = `${window.location.origin}${window.location.pathname}#producto-${id}`;
  if (navigator.share) {
    navigator.share({ title: "Producto", text: "Mira este producto", url }).catch(() => {});
  } else {
    navigator.clipboard.writeText(url).then(() => alert("Enlace copiado")).catch(() => {});
  }
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

// Modal para recopilar dirección y horario de envío
function _collectAddressAndSchedule() {
  return new Promise(resolve => {
    const saved = localStorage.getItem('client_address') || '';
    const savedSch = localStorage.getItem('client_schedule') || '';

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);z-index:20000;display:flex;align-items:flex-end;justify-content:center';

    overlay.innerHTML = `
      <div style="background:var(--color-surface,#0e0a1a);border-radius:24px 24px 0 0;padding:28px 24px 40px;width:100%;max-width:500px;box-shadow:0 -10px 40px rgba(0,0,0,.4)">
        <div style="width:40px;height:4px;background:rgba(255,255,255,.15);border-radius:2px;margin:0 auto 20px"></div>
        <h3 style="margin:0 0 6px;font-size:18px;color:var(--color-text-primary,#fff)">📦 Datos de envío</h3>
        <p style="margin:0 0 20px;font-size:13px;color:#888">Necesitamos tu dirección y horario para coordinar la entrega.</p>

        <label style="display:block;font-size:12px;font-weight:600;color:#aaa;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">🏠 Dirección completa</label>
        <textarea id="_addr-input" rows="2" placeholder="Calle, número, colonia, ciudad…"
          style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:var(--color-text-primary,#fff);border-radius:12px;padding:12px;font-size:14px;font-family:inherit;resize:none;box-sizing:border-box;margin-bottom:16px">${escapeHtml(saved)}</textarea>

        <label style="display:block;font-size:12px;font-weight:600;color:#aaa;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">🕐 Horario disponible para recibir</label>
        <input id="_sch-input" type="text" placeholder="Ej: Lunes a viernes de 9am a 6pm"
          value="${escapeHtml(savedSch)}"
          style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:var(--color-text-primary,#fff);border-radius:12px;padding:12px;font-size:14px;font-family:inherit;box-sizing:border-box;margin-bottom:24px">

        <div style="display:flex;gap:10px">
          <button id="_addr-cancel" style="flex:1;padding:13px;background:rgba(255,255,255,.07);border:none;border-radius:14px;color:#aaa;font-size:14px;font-weight:600;cursor:pointer">Cancelar</button>
          <button id="_addr-confirm" style="flex:2;padding:13px;background:linear-gradient(135deg,#ff4f81,#ff7a4f);border:none;border-radius:14px;color:#fff;font-size:14px;font-weight:700;cursor:pointer">Confirmar dirección</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    setTimeout(() => overlay.querySelector('textarea').focus(), 100);

    overlay.querySelector('#_addr-cancel').addEventListener('click', () => {
      overlay.remove(); resolve(null);
    });
    overlay.querySelector('#_addr-confirm').addEventListener('click', () => {
      const address  = overlay.querySelector('#_addr-input').value.trim();
      const schedule = overlay.querySelector('#_sch-input').value.trim();
      if (!address) {
        overlay.querySelector('#_addr-input').style.borderColor = '#ef4444';
        overlay.querySelector('#_addr-input').focus();
        return;
      }
      overlay.remove();
      resolve({ address, schedule });
    });
  });
}

async function continueCheckout() {
  const items = Object.values(localCart);
  if (items.length === 0) return;

  // ── Separar items de Z&R y de Comunidad ──────────────────
  const znrItems       = items.filter(i => !i._comunidad);
  const comunidadItems = items.filter(i =>  i._comunidad);

  // Si hay una mezcla, procesar primero Z&R, luego comunidad
  // (en la práctica lo ideal es que el cliente no mezcle, pero lo manejamos bien)

  if (znrItems.length > 0) {
    await _checkoutZNR(znrItems, items);
  }

  if (comunidadItems.length > 0) {
    await _checkoutComunidad(comunidadItems);
  }
}

// ── Checkout Z&R (flujo original: WhatsApp admin + notificación API) ──────────
async function _checkoutZNR(znrItems, allItems) {

  // ── Teléfono ──────────────────────────────────────────────
  let clientPhone = localStorage.getItem("client_phone");
  if (!clientPhone) {
    clientPhone = await new Promise(resolve => {
      showCustomPrompt({
        title: "📱 Tu número de WhatsApp",
        message: "Para procesar tu compra necesitamos tu número (10 dígitos).\nEjemplo: 8671234567",
        icon: "📱",
        defaultValue: "",
        confirmText: "Continuar",
        cancelText: "Cancelar",
        onConfirm: v => resolve(v),
        onCancel: () => resolve(null)
      });
    });
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
    updateSavedPhoneDisplay();
  }

  // ── Dirección de envío ────────────────────────────────────
  let clientAddress  = localStorage.getItem("client_address")  || "";
  let clientSchedule = localStorage.getItem("client_schedule") || "";
  const hasShipping  = znrItems.some(i => hasFreeShipping(i.price));

  if (hasShipping && !clientAddress) {
    const addrData = await _collectAddressAndSchedule();
    if (!addrData) {
      showTemporaryMessage("⚠️ Dirección requerida para envío a domicilio", "error");
      return;
    }
    clientAddress  = addrData.address;
    clientSchedule = addrData.schedule;
    localStorage.setItem("client_address",  clientAddress);
    localStorage.setItem("client_schedule", clientSchedule);
    updateSavedPhoneDisplay();
  }

  showLoader("Enviando solicitud...");
  const requestId = generateRequestId();
  const total = znrItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  let adminMessage = "*🛍️ NUEVA SOLICITUD DE COMPRA*\n";
  adminMessage += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
  adminMessage += `👤 *Cliente:* +52 ${clientPhone}\n`;
  adminMessage += `🆔 *ID Solicitud:* ${requestId}\n`;
  adminMessage += `📅 *Fecha:* ${new Date().toLocaleString()}\n`;
  if (clientAddress)  adminMessage += `🏠 *Dirección:* ${clientAddress}\n`;
  if (clientSchedule) adminMessage += `🕐 *Horario:* ${clientSchedule}\n`;
  adminMessage += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
  adminMessage += "*📦 DETALLE DE PRODUCTOS:*\n\n";

  znrItems.forEach((item, index) => {
    const safeName  = String(item.name  || '').replace(/[\r\n]/g, ' ').trim();
    const safeTalla = String(item.Talla || 'No especificada').replace(/[\r\n]/g, ' ').trim();
    adminMessage += `┌──────────────────────────────┐\n`;
    adminMessage += `│ *${safeName}*\n`;
    adminMessage += `├──────────────────────────────┤\n`;
    adminMessage += `│ 🆔 ID: ${item.id}\n`;
    adminMessage += `│ 📏 Talla: ${safeTalla}\n`;
    adminMessage += `│ 🔢 Cantidad: ${item.quantity}\n`;
    adminMessage += `│ 💰 Precio: $${item.price.toLocaleString()} c/u\n`;
    adminMessage += `│ 💵 Subtotal: $${(item.price * item.quantity).toLocaleString()}\n`;
    if (hasFreeShipping(item.price)) adminMessage += `│ 🚚 Envío disponible\n`;
    adminMessage += `└──────────────────────────────┘\n`;
    if (index < znrItems.length - 1) adminMessage += `\n`;
  });

  adminMessage += "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
  adminMessage += `💰 *TOTAL: $${total.toLocaleString()} MXN*\n`;
  adminMessage += `🚚 *Envío:* ${hasShipping ? 'Disponible (consultar)' : 'No disponible'}\n`;
  adminMessage += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";

  if (typeof saveOrderToHistory === 'function') {
    saveOrderToHistory({
      requestId, timestamp: Date.now(), status: 'pendiente', total,
      items: znrItems.map(i => ({ name: i.name, quantity: i.quantity, price: i.price }))
    });
  }

  const whatsappAdminUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(adminMessage)}`;
  window.open(whatsappAdminUrl, '_blank');

  try {
    await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "saveClientPhone", requestId: requestId, phone: clientPhone })
    });

    const notificationItems = znrItems.map(item => ({
      productId: item.id,
      nombre:    item.name,
      cantidad:  item.quantity,
      imagen:    item.Imagen1 || "",
      talla:     item.Talla   || "",
      precio:    item.price   || 0
    }));

    await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "createNotification", items: notificationItems, requestId: requestId })
    });

    // Limpiar solo los items Z&R del carrito
    znrItems.forEach(i => delete localCart[i.id]);
    saveCartToStorage();
    updateCartBadge();
    renderCart();

    showTemporaryMessage(
      `✅ ¡Solicitud Z&R enviada! Recibirás el link de pago por WhatsApp cuando el administrador confirme.`,
      "success"
    );
    startSilentPolling(requestId, clientPhone);
  } catch(err) {
    console.error("Error checkout Z&R:", err);
    showTemporaryMessage("❌ Error al enviar la solicitud Z&R", "error");
  } finally {
    hideLoader();
  }
}

// ── Checkout Comunidad: un vendedor a la vez, agrupando sus productos ────────
async function _checkoutComunidad(comunidadItems) {

  // ── Teléfono del cliente ──────────────────────────────────
  let clientPhone = localStorage.getItem("client_phone") || "";
  if (!clientPhone) {
    clientPhone = await new Promise(resolve => {
      showCustomPrompt({
        title: "📱 Tu número de WhatsApp",
        message: "Para que el vendedor te contacte necesitamos tu número (10 dígitos).\nEjemplo: 8671234567",
        icon: "📱",
        defaultValue: "",
        confirmText: "Continuar",
        cancelText: "Cancelar",
        onConfirm: v => resolve(v),
        onCancel: () => resolve(null)
      });
    });
    if (!clientPhone) {
      showTemporaryMessage("❌ Necesitamos tu número para contactar al vendedor", "error");
      return;
    }
    clientPhone = clientPhone.replace(/[^0-9]/g, '');
    if (clientPhone.length !== 10) {
      showTemporaryMessage("❌ Número inválido. Debe tener 10 dígitos.", "error");
      return;
    }
    localStorage.setItem("client_phone", clientPhone);
    updateSavedPhoneDisplay();
  }

  // ── Agrupar por vendedor y tomar solo el primero ──────────
  const byVendor = new Map();
  comunidadItems.forEach(item => {
    const tel    = item._vendorTel || "";
    const nombre = item._vendedor  || "Vendedor";
    const key    = tel || nombre;
    if (!byVendor.has(key)) byVendor.set(key, { tel, nombre, items: [] });
    byVendor.get(key).items.push(item);
  });

  const vendors     = Array.from(byVendor.values());
  const firstVendor = vendors[0];
  const remaining   = vendors.length - 1;

  // ── Construir mensaje WhatsApp para el primer vendedor ────
  const { tel, nombre, items } = firstVendor;
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  let msg = "*\uD83D\uDED4 PEDIDO DESDE Z&R COMUNIDAD*\n";
  msg += "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n";
  msg += `\uD83D\uDC64 *Cliente:* +52 ${clientPhone}\n`;
  msg += `\uD83D\uDCC5 *Fecha:* ${new Date().toLocaleString()}\n`;
  msg += "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n";
  msg += "*\uD83D\uDCE6 PRODUCTOS SOLICITADOS:*\n\n";
  items.forEach((item, idx) => {
    const safeName  = String(item.name  || '').replace(/[\r\n]/g, ' ').trim();
    const safeTalla = String(item.Talla || 'No especificada').replace(/[\r\n]/g, ' ').trim();
    msg += "\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n";
    msg += `\u2502 *${safeName}*\n`;
    msg += "\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524\n";
    msg += `\u2502 \uD83D\uDCCF Talla: ${safeTalla}\n`;
    msg += `\u2502 \uD83D\uDD22 Cantidad: ${item.quantity}\n`;
    msg += `\u2502 \uD83D\uDCB0 Precio: $${item.price.toLocaleString()} c/u\n`;
    msg += `\u2502 \uD83D\uDCB5 Subtotal: $${(item.price * item.quantity).toLocaleString()}\n`;
    msg += "\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518\n";
    if (idx < items.length - 1) msg += "\n";
  });
  msg += "\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n";
  msg += `\uD83D\uDCB0 *TOTAL: $${subtotal.toLocaleString()} MXN*\n`;
  msg += "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n";
  msg += "_Pedido realizado a través de Z&R Comunidad_";

  const destTel = tel ? `52${tel}` : "";
  const waUrl   = destTel ? `https://wa.me/${destTel}?text=${encodeURIComponent(msg)}` : null;

  // ── Mostrar modal (espera a que el usuario pulse WhatsApp o vuelva) ────────
  const didOpen = await _showVendorCheckoutModal({ nombre, subtotal, items, waUrl, remaining });

  // Solo eliminar del carrito si el usuario pulsó "Abrir WhatsApp"
  if (didOpen) {
    items.forEach(i => delete localCart[i.id]);
    saveCartToStorage();
    updateCartBadge();
    renderCart();
    if (remaining === 0) closeCartDrawer();
  }
  // Si pulsó "Volver", no se elimina nada — el carrito queda igual.
}

// ── Modal de checkout por vendedor ────────────────────────────────────────────
function _showVendorCheckoutModal({ nombre, subtotal, items, waUrl, remaining }) {
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
          <div style="font-size:13px;font-weight:600;color:var(--color-text-primary,#fff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(i.name)}</div>
          <div style="font-size:12px;color:#aaa">${i.Talla ? '📏 ' + escapeHtml(i.Talla) + ' · ' : ''}🔢 ${i.quantity} × ${formatCurrency(i.price)}</div>
        </div>
        <div style="font-size:13px;font-weight:700;color:#ff4f81;white-space:nowrap">${formatCurrency(i.price * i.quantity)}</div>
      </div>
    `).join('');

    const remainingNote = remaining > 0
      ? `<p style="margin:14px 0 0;padding:10px 14px;background:rgba(249,115,22,.1);border-radius:10px;font-size:12px;color:#f97316;text-align:center;line-height:1.5">
           📋 Tienes artículos de <strong>${remaining}</strong> vendedor${remaining > 1 ? 'es' : ''} más en tu carrito.<br>
           Después de contactar a este, regresa para continuar.
         </p>`
      : '';

    modal.innerHTML = `
      <div style="
        background:var(--color-surface,#0e0a1a);
        border-radius:24px 24px 0 0;
        padding:24px 20px 40px;
        width:100%;max-width:480px;
        box-shadow:0 -10px 40px rgba(0,0,0,.5);
        max-height:85vh;overflow-y:auto;
      ">
        <div style="width:40px;height:4px;background:rgba(255,255,255,.15);border-radius:2px;margin:0 auto 20px"></div>

        <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px">
          <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#3b1f5f);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">🏪</div>
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

        <p style="font-size:12px;color:#888;text-align:center;margin:8px 0 0;line-height:1.5">
          💬 El vendedor coordinará contigo el método de pago directamente por WhatsApp.
        </p>

        ${remainingNote}

        <div style="display:flex;flex-direction:column;gap:10px;margin-top:20px">
          ${waUrl
            ? `<a href="${escapeHtml(waUrl)}" target="_blank" rel="noopener"
                 id="vcm-wa-btn"
                 style="display:flex;align-items:center;justify-content:center;gap:10px;
                        padding:15px;border-radius:16px;
                        background:linear-gradient(135deg,#25d366,#128c7e);
                        color:#fff;font-size:15px;font-weight:700;
                        text-decoration:none;-webkit-tap-highlight-color:transparent">
                 <span style="font-size:22px">💬</span>
                 Contactar a ${escapeHtml(nombre)}
               </a>`
            : `<div style="padding:14px;border-radius:16px;background:rgba(239,68,68,.12);color:#ef4444;text-align:center;font-size:13px;line-height:1.5">
                 ⚠️ Este vendedor no tiene número registrado.<br>Búscalo directamente en la sección Comunidad.
               </div>`
          }
          <button id="vcm-back-btn"
            style="padding:13px;border-radius:16px;background:rgba(255,255,255,.07);
                   border:1.5px solid rgba(255,255,255,.1);
                   color:#aaa;font-size:14px;font-weight:600;cursor:pointer;
                   -webkit-tap-highlight-color:transparent">
            ${remaining > 0
              ? `← Volver al carrito · ${remaining} vendedor${remaining > 1 ? 'es' : ''} más`
              : '← Volver al carrito'}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Pulsar el enlace de WhatsApp → marcar como "abierto" y cerrar modal
    const waBtn = modal.querySelector('#vcm-wa-btn');
    if (waBtn) {
      waBtn.addEventListener('click', () => {
        setTimeout(() => { modal.remove(); resolve(true); }, 350);
      });
    }

    // "Volver al carrito" → cerrar sin marcar como enviado
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
      console.warn(`⚠️ Se filtraron ${raw.length - products.length} productos inválidos`);
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

/**
 * Carga unificada de productos usada por home.js y script.js.
 * Maneja: caché instantáneo → render → refresh en background.
 *
 * @param {object} opts
 * @param {function} opts.onProducts  - cb(products, fromCache) llamado al tener datos
 * @param {function} [opts.onError]   - cb(err) en fallo sin caché
 * @param {boolean}  [opts.force]     - forzar fetch fresco (ignora caché)
 */
async function loadProductsUnified({ onProducts, onError, force = false } = {}) {
  const deliver = (products, fromCache) => {
    buildProductIndex(products);
    window.allProducts = products;
    onProducts(products, fromCache);
  };

  if (!force) {
    const cached = getCachedProducts();
    if (cached && cached.length > 0) {
      deliver(cached, true);
      // Refresh silencioso en background
      if (navigator.onLine) {
        fetch(API_URL)
          .then(r => r.json())
          .then(data => {
            const fresh = (data.products || data || []).slice(0, 500);
            if (JSON.stringify(fresh) !== JSON.stringify(cached)) {
              setCachedProducts(fresh);
              deliver(fresh, false);
            }
          })
          .catch(() => {});
      }
      return;
    }
  }

  if (!navigator.onLine) {
    const stale = (() => {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        return raw ? JSON.parse(raw).data : null;
      } catch { return null; }
    })();
    if (stale && stale.length) { deliver(stale, true); return; }
    if (onError) onError(new Error('offline'));
    return;
  }

  try {
    showLoader('Cargando productos...');
    const res = await fetch(API_URL);
    const data = await res.json();
    const products = (data.products || data || []).slice(0, 500);
    setCachedProducts(products);
    deliver(products, false);
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
    console.log('Error verificando modo offline:', err);
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
  createImageObserver();
  
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

  const changeAddrBtn = document.getElementById("change-address-btn");
  if (changeAddrBtn) {
    changeAddrBtn.addEventListener("click", async () => {
      const data = await _collectAddressAndSchedule();
      if (data) {
        localStorage.setItem("client_address",  data.address);
        localStorage.setItem("client_schedule", data.schedule);
        updateSavedPhoneDisplay();
      }
    });
  }
  
  // ===== OVERLAY ACTUALIZADO - CIERRA TODO =====
  const overlay = document.getElementById("overlay");
  if (overlay) {
    const newOverlay = overlay.cloneNode(true);
    overlay.parentNode.replaceChild(newOverlay, overlay);
    newOverlay.addEventListener("click", () => {
      // Cerrar carrito
      if (typeof closeCartDrawer === 'function') closeCartDrawer();
      
      // Cerrar wishlist de productos (index)
      const wishlistDrawer = document.getElementById("wishlist-drawer");
      if (wishlistDrawer && wishlistDrawer.classList.contains("open")) {
        wishlistDrawer.classList.remove("open");
      }
      
      // Cerrar wishlist de looks (looks.html)
      const looksWishlistDrawer = document.getElementById("wishlist-looks-drawer");
      if (looksWishlistDrawer && looksWishlistDrawer.classList.contains("open")) {
        looksWishlistDrawer.classList.remove("open");
      }
      
      // Cerrar modal de imagen
      if (typeof closeImageModal === 'function') closeImageModal();
      
      // Remover clase visible del overlay
      newOverlay.classList.remove("visible");
    });
  }
  
  // Inicializar modal de imagen con navegación
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
  
  // ===== EVENTOS GLOBALES =====
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
      deferTask(() => loadProductsInBackground());
    }
  });
});



// ========== TEMA CLARO/OSCURO ==========
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function updateThemeIcon(theme) {
  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) {
    toggleBtn.textContent = theme === 'dark' ? '🌙' : '☀️';
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcon(newTheme);
}

// Inicializar cuando el DOM esté listo
// Nota: el botón theme-toggle es reclamado por user-preferences.js como ⚙️.
// Solo aplicamos initTheme (que restaura el tema guardado en data-theme),
// pero NO añadimos el listener de click para no interferir con user-preferences.js.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
  });
} else {
  initTheme();
}
// Al final de common.js, agregar:
window.buildProductIndex = buildProductIndex;
window._commonBuildProductIndex = buildProductIndex; // referencia protegida para home.js
window.getProductsByCategoryIndexed = getProductsByCategoryIndexed;
window.getIndexedProducts = getIndexedProducts;
window.clearProductIndex = clearProductIndex;
window.loadProductsUnified = loadProductsUnified;
// Expose indexed products for wishlist button injection
Object.defineProperty(window, 'allProductsIndexed', { get: () => allProductsIndexed, configurable: true });

let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  console.log('📱 PWA instalable detectada');
  e.preventDefault();
  deferredPrompt = e;
  
  // Mostrar botón de instalación después de 2 segundos
  setTimeout(() => {
    showPWAInstallButton();
  }, 2000);
});

function showPWAInstallButton() {
  if (document.getElementById('pwa-install-btn')) return;
  
  const installBtn = document.createElement('button');
  installBtn.id = 'pwa-install-btn';
  installBtn.innerHTML = '📲 Instalar App Z&R';
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
    console.log(`Instalación: ${outcome}`);
    deferredPrompt = null;
  };
  
  document.body.appendChild(installBtn);
  
  // Ocultar después de 15 segundos
  setTimeout(() => {
    if (installBtn && installBtn.parentNode) {
      installBtn.style.opacity = '0';
      setTimeout(() => installBtn.remove(), 300);
    }
  }, 15000);
}

// Detectar si ya está instalada como app
if (window.matchMedia('(display-mode: standalone)').matches) {
  console.log('📱 Z&R ejecutándose como app instalada');
  document.body.classList.add('pwa-mode');
}

// Agregar animación
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
    
    // Remover si ya existe
    recent = recent.filter(id => String(id) !== String(productId));
    
    // Agregar al inicio
    recent.unshift(String(productId));
    
    // Limitar cantidad
    recent = recent.slice(0, MAX_RECENT_PRODUCTS);
    
    localStorage.setItem(RECENT_PRODUCTS_KEY, JSON.stringify(recent));
    console.log(`📌 Producto ${productId} agregado a recientes`);
    
    // Disparar evento para actualizar UI en home si está visible
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
    const product = allProductsArray.find(p => String(p.ID) === String(id));
    if (product && product.Stock > 0 && product.Stock !== "0") {
      recentProducts.push(product);
    }
  }
  
  return recentProducts;
}

function clearRecentProducts() {
  localStorage.removeItem(RECENT_PRODUCTS_KEY);
  window.dispatchEvent(new CustomEvent('recentProductsUpdated'));
  showTemporaryMessage('🗑️ Historial de productos recientes eliminado', 'info');
}









// ========== WISHLIST ==========
const WISHLIST_KEY = 'zr_wishlist';

function getWishlist() {
  try { return JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]'); }
  catch { return []; }
}

function saveWishlist(list) {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
  updateWishlistBadge(); // ✅ Actualizar badge al guardar
  // ✅ Disparar evento para actualizar cualquier UI
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
    showTemporaryMessage('💔 Quitado de favoritos', 'info');
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
    showTemporaryMessage('❤️ Agregado a favoritos', 'success');
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
    btn.textContent = active ? '❤️' : '🤍';
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
  btn.textContent = active ? '❤️' : '🤍';
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    toggleWishlist(product);
  });
  return btn;
}

function openWishlistDrawer() {
  console.log("❤️ Abriendo wishlist drawer");
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
        <div class="cart-empty-icon">❤️</div>
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
        : `<div class="cart-item-img-wrap cart-item-img-placeholder"><span>👕</span></div>`;
      
      row.innerHTML = `
        ${imgHtml}
        <div class="cart-item-info">
          <div class="cart-item-title">${escapeHtml(item.name)}</div>
          <div class="cart-item-meta">${formatCurrency(item.price)}</div>
          <div class="cart-item-actions">
            <button class="add-to-cart-wishlist" data-id="${item.id}" data-name="${escapeHtml(item.name)}" data-price="${item.price}" data-img="${escapeHtml(item.Imagen1)}" data-talla="${escapeHtml(item.Talla || '')}">🛒 Agregar al carrito</button>
            <button class="remove-from-wishlist" data-id="${item.id}">🗑 Eliminar</button>
          </div>
        </div>
      `;
      container.appendChild(row);
    });
    
    // ✅ Usar manejadores separados para evitar problemas de eventos duplicados
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

// ✅ Manejadores separados para el wishlist
function handleAddFromWishlist(e) {
  const btn = e.currentTarget;
  const id = btn.dataset.id;
  const name = btn.dataset.name;
  const price = parseFloat(btn.dataset.price);
  const img = btn.dataset.img;
  const talla = btn.dataset.talla;
  
  addToCart({ ID: id, Nombre: name, Precio: price, Imagen1: img, Talla: talla });
  showTemporaryMessage(`✅ ${name} agregado al carrito`, 'success');
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
    showTemporaryMessage(`💔 ${removedItem.name} eliminado de favoritos`, 'info');
  }
}
function updateWishlistBadge() {
  const count = getWishlist().length;
  const badge = document.getElementById("wishlist-count");
  if (badge) badge.textContent = count;
  console.log("❤️ Wishlist badge actualizado:", count);
}

// ✅ Exponer funciones globalmente
window.openWishlistDrawer = openWishlistDrawer;
window.closeWishlistDrawer = closeWishlistDrawer;
window.renderWishlist = renderWishlist;
window.addAllWishlistToCart = addAllWishlistToCart;
window.updateWishlistBadge = updateWishlistBadge;

// Auto-inject wishlist buttons
(function watchProductCards() {
  function injectWishlistBtn(card) {
    if (card.querySelector('.wishlist-btn')) return;
    const slider = card.querySelector('.product-slider');
    if (!slider) return;
    const id = card.id?.replace('producto-', '') || '';
    if (!id) return;
    let product = null;
    if (window.allProductsIndexed && Array.isArray(window.allProductsIndexed)) {
      product = window.allProductsIndexed.find(p => String(p.ID) === id);
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
    document.querySelectorAll('.product-card').forEach(injectWishlistBtn);
  }
  
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mut => {
      mut.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        if (node.classList?.contains('product-card')) {
          injectWishlistBtn(node);
        } else {
          node.querySelectorAll?.('.product-card').forEach(injectWishlistBtn);
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
    label:'Torso', icon:'👕',
    hint:'Playeras, camisas, sudaderas, chamarras…',
    keywords:['camisa','playera','camiseta','blusa','sudadera','chamarra','hoodie',
              'jacket','top','saco','blazer','sweater','suéter','torso','buzo',
              'polo','crop','manga','camisola'],
    sizes:['XS','S','M','L','XL','XXL','XXXL']
  },
  piernas: {
    label:'Piernas', icon:'👖',
    hint:'Pantalones, jeans, shorts, faldas…',
    keywords:['pantalon','pantalón','jean','jeans','short','falda','leggins',
              'legging','bermuda','jogger','cargo','trouser','pant','skirt'],
    sizes:['XS','S','M','L','XL','XXL','XXXL',
           '26','27','28','29','30','31','32','33','34','36','38','40']
  },
  pies: {
    label:'Pies', icon:'👟',
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
window.saveOrderToHistory = saveOrder;


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
window.getSizeScore    = getSizeScore;
window.detectSection   = detectSection;


function currentTheme() {
  return localStorage.getItem('theme') || document.documentElement.getAttribute('data-theme') || 'dark';
}
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.body.className = document.body.className.replace(/theme-\S+/g,'').trim();
  document.body.classList.add('theme-aeromexico');
  localStorage.setItem('theme', theme);
}


function renderOrders() {
  const orders = loadOrders();
  if (!orders.length) return `
    <div class="up-empty-state">
      <div class="up-empty-icon">🛍️</div>
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
    const statusColor = {pendiente:'#f59e0b',confirmado:'#22c55e',cancelado:'#ef4444'}[o.status]||'#888';
    return `
      <div class="up-order-card">
        <div class="up-order-header">
          <div>
            <span class="up-order-id">${_upEsc(o.requestId||'—')}</span>
            <span class="up-order-date">${date}</span>
          </div>
          <span class="up-order-status" style="color:${statusColor}">
            ${o.status==='confirmado'?'✅':o.status==='cancelado'?'❌':'⏳'} ${_upEsc(o.status||'pendiente')}
          </span>
        </div>
        <div class="up-order-items">${items}</div>
        <div class="up-order-total">Total: <strong>$${(o.total||0).toLocaleString()}</strong></div>
      </div>`;
  }).join('');
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
      <button class="up-close" id="up-close-btn" aria-label="Cerrar">✕</button>
    </div>

    
    <div class="up-tabs" role="tablist">
      <button class="up-tab active" data-tab="apariencia" role="tab">🎨 Apariencia</button>
      <button class="up-tab" data-tab="tallas" role="tab">📏 Tallas</button>
      <button class="up-tab" data-tab="pedidos" role="tab">🛍️ Pedidos</button>
      <button class="up-tab" data-tab="privacidad" role="tab">🔒 Privacidad</button>
    </div>

    <div class="up-body">

      
      <section class="up-tab-content active" data-content="apariencia">
        <h3 class="up-section-title">Tema visual</h3>
        <div class="up-theme-row">
          <button class="up-theme-btn ${theme==='dark'?'active':''}" data-theme="dark">🌙 Oscuro</button>
          <button class="up-theme-btn ${theme==='light'?'active':''}" data-theme="light">☀️ Claro</button>
        </div>

        <h3 class="up-section-title" style="margin-top:24px">Vista del catálogo</h3>
        <div class="up-theme-row">
          <button class="up-layout-btn ${layout==='list'?'active':''}" data-layout="list">☰ Lista</button>
          <button class="up-layout-btn ${layout==='grid'?'active':''}" data-layout="grid">▦ Cuadrícula</button>
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
                      data-section="${key}" data-size="">✕ Quitar</button>
            </div>
          </div>
        `).join('')}
        <button class="up-save-btn" id="up-save-sizes-btn">Guardar tallas</button>
      </section>

      
      <section class="up-tab-content" data-content="pedidos">
        <h3 class="up-section-title">Mis pedidos</h3>
        <div id="up-orders-list">${renderOrders()}</div>
      </section>

      
      <section class="up-tab-content" data-content="privacidad">
        <h3 class="up-section-title">Mis datos guardados</h3>

        <div class="up-privacy-item">
          <div class="up-privacy-info">
            <span class="up-privacy-icon">📱</span>
            <div>
              <strong>Número de teléfono</strong>
              <span class="up-privacy-value">${savedPhone ? '+52 '+_upEsc(savedPhone) : 'No guardado'}</span>
            </div>
          </div>
          ${savedPhone?`<button class="up-danger-btn" id="up-delete-phone-btn">Eliminar</button>`:''}
        </div>

        <div class="up-privacy-item">
          <div class="up-privacy-info">
            <span class="up-privacy-icon">🏠</span>
            <div>
              <strong>Dirección de envío</strong>
              <span class="up-privacy-value">${savedAddress ? _upEsc(savedAddress) : 'No guardada'}</span>
            </div>
          </div>
          ${savedAddress?`<button class="up-danger-btn" id="up-delete-address-btn">Eliminar</button>`:''}
        </div>

        <div class="up-divider"></div>
        <p class="up-privacy-note">
          Tus datos se guardan únicamente en este dispositivo y se usan solo para agilizar
          el proceso de compra. Puedes eliminarlos en cualquier momento.
          Para solicitar eliminación de datos en nuestros registros escríbenos a
          <strong>contacto@zrtienda.com</strong>
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
    });
  });

  
  panel.querySelectorAll('.up-theme-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      panel.querySelectorAll('.up-theme-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      applyTheme(btn.dataset.theme);
    });
  });

  
  panel.querySelectorAll('.up-layout-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      panel.querySelectorAll('.up-layout-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const layout = btn.dataset.layout;
      localStorage.setItem('products_layout', layout);
      
      const container = document.getElementById('products-container');
      const layoutBtn  = document.getElementById('layout-toggle-btn');
      if (container) {
        if (layout==='grid') { container.classList.add('layout-grid'); if(layoutBtn) layoutBtn.textContent='▦'; }
        else { container.classList.remove('layout-grid'); if(layoutBtn) layoutBtn.textContent='📱'; }
      }
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
      saveBtn.textContent='✅ ¡Guardado!';
      saveBtn.classList.add('saved');
      setTimeout(()=>{ saveBtn.textContent=orig; saveBtn.classList.remove('saved'); }, 1400);
    });
  }

  
  const delPhone = panel.querySelector('#up-delete-phone-btn');
  if (delPhone) {
    delPhone.addEventListener('click',()=>{
      if (typeof showCustomConfirm==='function') {
        showCustomConfirm({
          title:'🗑️ Eliminar teléfono',
          message:'¿Eliminar el número guardado? Tendrás que ingresarlo de nuevo al comprar.',
          icon:'📱', confirmText:'Sí, eliminar', cancelText:'Cancelar',
          onConfirm:()=>{ localStorage.removeItem('client_phone'); closePanel(); buildPanel(); }
        });
      } else {
        localStorage.removeItem('client_phone');
        closePanel(); buildPanel();
      }
    });
  }

  
  const delAddr = panel.querySelector('#up-delete-address-btn');
  if (delAddr) {
    delAddr.addEventListener('click',()=>{
      if (typeof showCustomConfirm==='function') {
        showCustomConfirm({
          title:'🗑️ Eliminar dirección',
          message:'¿Eliminar la dirección guardada?',
          icon:'🏠', confirmText:'Sí, eliminar', cancelText:'Cancelar',
          onConfirm:()=>{ localStorage.removeItem('client_address'); localStorage.removeItem('client_schedule'); closePanel(); buildPanel(); }
        });
      } else {
        localStorage.removeItem('client_address');
        localStorage.removeItem('client_schedule');
        closePanel(); buildPanel();
      }
    });
  }
}

function closePanel() {
  const panel = document.getElementById('up-panel');
  const ov    = document.getElementById('up-overlay');
  if (!panel) return;
  panel.classList.remove('visible');
  ov.classList.remove('visible');
  setTimeout(()=>{ panel.remove(); ov.remove(); }, 280);
}

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
    #up-panel{position:fixed;top:0;right:0;height:100dvh;width:min(390px,100vw);background:var(--color-surface,#0e0a1a);border-left:1px solid rgba(255,255,255,.07);z-index:9001;display:flex;flex-direction:column;transform:translateX(100%);transition:transform .28s cubic-bezier(.4,0,.2,1);overflow:hidden;box-shadow:-8px 0 40px rgba(0,0,0,.4)}
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
    .up-size-btn{border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:var(--color-text-secondary,#aaa);padding:6px 12px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;transition:all .15s}
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
    .up-header-dot{position:absolute;top:-2px;right:-2px;width:8px;height:8px;background:#ff4f81;border-radius:50%;border:1.5px solid var(--color-surface,#0e0a1a);pointer-events:none}
    [data-theme="light"] #up-panel{background:#fff;border-left-color:rgba(0,0,0,.08)}
    [data-theme="light"] .up-header,[data-theme="light"] .up-tabs,[data-theme="light"] .up-divider{border-color:rgba(0,0,0,.08)}
    [data-theme="light"] .up-theme-btn,[data-theme="light"] .up-layout-btn,[data-theme="light"] .up-size-btn{border-color:rgba(0,0,0,.12);background:rgba(0,0,0,.03);color:#555}
    [data-theme="light"] .up-order-card,[data-theme="light"] .up-privacy-item{background:rgba(0,0,0,.03);border-color:rgba(0,0,0,.08)}
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





window.API_URL = API_URL;
window.escapeHtml = escapeHtml;
window.escapeAttr = escapeAttr;
window.safeHtml = safeHtml;

// ── Estilos para secciones del carrito (Z&R / Comunidad) ─────────────────────
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
})();