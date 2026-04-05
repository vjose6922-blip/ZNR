const API_URL = "https://script.google.com/macros/s/AKfycbzNshrt3zldBNiyoB8x36ktCEO02H0cKxebiTuK7UAbsgd5R9biaCW7W4ihm1aVOJG7ww/exec";
const WHATSAPP_NUMBER = "528671781272";

// ========== IMPORTAR/CONSISTENCIA CON script.js ==========
const CACHE_KEY = 'zr_products_cache';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutos

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
    return `https://drive.google.com/thumbnail?id=${id}&sz=w${size}`;
  }
  return url;
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

// ========== FUNCIONES DE CARRITO ==========
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
  renderCart();
}

window.changeCartQty = function(id, delta) {
  if (!localCart[id]) return;
  localCart[id].quantity += delta;
  if (localCart[id].quantity <= 0) {
    delete localCart[id];
  }
  saveCartToStorage();
  updateCartBadge();
  renderCart();
};

window.removeFromCart = function(id) {
  if (localCart[id]) {
    delete localCart[id];
    saveCartToStorage();
    updateCartBadge();
    renderCart();
  }
};

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

function animateCartAdd() {
  const btn = document.getElementById("floating-cart-btn");
  if (btn) {
    btn.style.transform = "translateY(-4px) scale(1.05)";
    setTimeout(() => btn.style.transform = "", 180);
  }
}

function openCartDrawer() {
  const drawer = document.getElementById("cart-drawer");
  const overlay = document.getElementById("overlay");
  if (drawer) drawer.classList.add("open");
  if (overlay) overlay.classList.add("visible");
}

function closeCartDrawer() {
  const drawer = document.getElementById("cart-drawer");
  const overlay = document.getElementById("overlay");
  if (drawer) drawer.classList.remove("open");
  if (overlay) overlay.classList.remove("visible");
}

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

// ========== CONFIGURACIÓN DE LOOKS ==========
const WEATHER_API_URL = "https://script.google.com/macros/s/AKfycbzNshrt3zldBNiyoB8x36ktCEO02H0cKxebiTuK7UAbsgd5R9biaCW7W4ihm1aVOJG7ww/exec";
let currentWeather = null;

// MAPA DE PRIORIDADES POR CLIMA - COMPLETO Y CORREGIDO
const WEATHER_PRIORITY_SCORES = {
  calor: {
    "look_verano_dama": 100,
    "look_verano_caballero": 100,
    "look_falda_dama": 95,
    "look_vestido_dama": 90,
    "look_casual_dama": 80,
    "look_casual_caballero": 80,
    "look_elegante_dama": 60,
    "look_elegante_caballero": 60,
    "look_confort_dama": 40,
    "look_confort_caballero": 40,
    "look_chamarra_dama": 10,
    "look_chamarra_caballero": 10
  },
  frio: {
    "look_chamarra_dama": 100,
    "look_chamarra_caballero": 100,
    "look_confort_dama": 95,
    "look_confort_caballero": 95,
    "look_casual_dama": 70,
    "look_casual_caballero": 70,
    "look_elegante_dama": 65,
    "look_elegante_caballero": 65,
    "look_vestido_dama": 50,
    "look_falda_dama": 40,
    "look_verano_dama": 10,
    "look_verano_caballero": 10
  },
  templado: {
    "look_casual_dama": 100,
    "look_casual_caballero": 100,
    "look_elegante_dama": 95,
    "look_elegante_caballero": 95,
    "look_vestido_dama": 90,
    "look_falda_dama": 85,
    "look_verano_dama": 70,
    "look_verano_caballero": 70,
    "look_confort_dama": 60,
    "look_confort_caballero": 60,
    "look_chamarra_dama": 50,
    "look_chamarra_caballero": 50
  },
  lluvioso: {
    "look_chamarra_dama": 100,
    "look_chamarra_caballero": 100,
    "look_confort_dama": 90,
    "look_confort_caballero": 90,
    "look_casual_dama": 70,
    "look_casual_caballero": 70,
    "look_elegante_dama": 60,
    "look_elegante_caballero": 60,
    "look_vestido_dama": 50,
    "look_falda_dama": 40,
    "look_verano_dama": 20,
    "look_verano_caballero": 20
  }
};

let allProducts = [];
let looks = [];

const LOOKS_CONFIG = [
  // MUJER
  {
    id: "look_casual_dama",
    name: "👟 Casual",
    description: "Para tu día a día",
    category: "Mujer",
    slots: [
      { type: "torso", categories: ["Blusas"], keywords: [], excludeKeywords: ["vestir", "formal", "gala"], required: true },
      { type: "piernas", categories: ["Pantalon para Dama"], keywords: [], excludeKeywords: ["formal", "vestir"], required: true },
      { type: "pies", categories: ["Calzado para Dama"], keywords: ["Tenis"], excludeKeywords: ["formal", "tacón", "zapato"], required: true }
    ]
  },
  {
    id: "look_elegante_dama",
    name: "👗 Elegancia Femenina",
    description: "Para ocasiones especiales",
    category: "Mujer",
    slots: [
      { type: "torso", categories: ["Blusas"], keywords: ["Vestir"], excludeKeywords: ["casual", "deportivo"], required: true },
      { type: "piernas", categories: ["Pantalon para Dama"], keywords: ["Vestir"], excludeKeywords: ["short", "jeans", "mezclilla"], required: true },
      { type: "pies", categories: ["Calzado para Dama"], keywords: ["Zapatos"], excludeKeywords: ["tenis", "sandalias", "deportivo"], required: true }
    ]
  },
  {
    id: "look_verano_dama",
    name: "☀️ Verano Fresco",
    description: "Fresco para días calurosos",
    category: "Mujer",
    slots: [
      { type: "torso", categories: ["Blusas"], keywords: [], excludeKeywords: ["vestir", "formal", "abrigo"], required: true },
      { type: "piernas", categories: ["Short para Dama"], keywords: [], excludeKeywords: ["formal", "vestir", "pantalón"], required: true },
      { type: "pies", categories: ["Calzado para Dama"], keywords: ["Tenis", "sandalias"], excludeKeywords: ["formal", "tacón"], required: true }
    ]
  },
  {
    id: "look_falda_dama",
    name: "🌸 Luce una Falda",
    description: "Look fresco con falda",
    category: "Mujer",
    slots: [
      { type: "torso", categories: ["Blusas"], keywords: [], excludeKeywords: ["deportivo", "abrigo"], required: true },
      { type: "piernas", categories: ["Faldas"], keywords: [], excludeKeywords: ["short", "pantalón"], required: true },
      { type: "pies", categories: ["Calzado para Dama"], keywords: ["Tenis", "sandalias"], excludeKeywords: ["formal", "tacón"], required: true }
    ]
  },
  {
    id: "look_vestido_dama",
    name: "💃 Vestido Elegante",
    description: "Perfecto para citas",
    category: "Mujer",
    slots: [
      { type: "torso", categories: ["Vestidos"], keywords: [], excludeKeywords: ["casual", "deportivo"], required: true },
      { type: "pies", categories: ["Calzado para Dama"], keywords: ["tacones"], excludeKeywords: ["tenis", "deportivo", "sandalias"], required: true }
    ]
  },
  {
    id: "look_confort_dama",
    name: "🛋️ Confort en Casa",
    description: "Comodidad en casa",
    category: "Mujer",
    slots: [
      { type: "torso", categories: ["Sueter para Dama"], keywords: [], excludeKeywords: ["vestir", "formal"], required: true },
      { type: "piernas", categories: ["Pantalon para Dama"], keywords: ["pants"], excludeKeywords: ["vestir", "formal"], required: true },
      { type: "pies", categories: ["Calzado para Dama"], keywords: ["Pantunflas"], excludeKeywords: ["tenis", "tacón"], required: true }
    ]
  },
  {
    id: "look_chamarra_dama",
    name: "🧥 Abrigate",
    description: "Ideal para días frescos",
    category: "Mujer",
    slots: [
      { type: "torso", categories: ["Chamarra para Dama"], keywords: [], excludeKeywords: ["vestir", "formal"], required: true },
      { type: "piernas", categories: ["Pantalon para Dama"], keywords: ["pants", "pantalon"], excludeKeywords: ["vestir", "formal", "short"], required: true },
      { type: "pies", categories: ["Calzado para Dama"], keywords: ["Pantunflas"], excludeKeywords: ["tenis", "tacón"], required: true }
    ]
  },
  
  // HOMBRE
  {
    id: "look_casual_caballero",
    name: "👔 Casual Hombre",
    description: "Para el día a día",
    category: "Hombre",
    slots: [
      { type: "torso", categories: ["Playeras"], keywords: [], excludeKeywords: ["vestir", "formal", "camisa"], required: true },
      { type: "piernas", categories: ["Pantalon para Caballero"], keywords: [], excludeKeywords: ["formal", "vestir", "short"], required: true },
      { type: "pies", categories: ["Calzado para Caballero"], keywords: ["Tenis", "Botas"], excludeKeywords: ["formal", "zapato"], required: true }
    ]
  },
  {
    id: "look_elegante_caballero",
    name: "🤵 Elegancia Masculina",
    description: "Formal para ocasiones especiales",
    category: "Hombre",
    slots: [
      { type: "torso", categories: ["Playeras"], keywords: ["Vestir"], excludeKeywords: ["casual", "deportivo"], required: true },
      { type: "piernas", categories: ["Pantalon para Caballero"], keywords: ["Vestir"], excludeKeywords: ["short", "jeans", "mezclilla"], required: true },
      { type: "pies", categories: ["Calzado para Caballero"], keywords: ["Zapatos"], excludeKeywords: ["tenis", "deportivo", "botas"], required: true }
    ]
  },
  {
    id: "look_verano_caballero",
    name: "🏖️ Verano Hombre",
    description: "Fresco para el calor",
    category: "Hombre",
    slots: [
      { type: "torso", categories: ["Playeras"], keywords: [], excludeKeywords: ["vestir", "formal", "camisa"], required: true },
      { type: "piernas", categories: ["Short para Caballero"], keywords: [], excludeKeywords: ["formal", "vestir", "pantalón"], required: true },
      { type: "pies", categories: ["Calzado para Caballero"], keywords: ["Tenis", "sandalias"], excludeKeywords: ["formal", "zapato"], required: true }
    ]
  },
  {
    id: "look_chamarra_caballero",
    name: "🧥 Abrigate Hombre",
    description: "Luce tu chamarra",
    category: "Hombre",
    slots: [
      { type: "torso", categories: ["Chamarra para Caballero"], keywords: [], excludeKeywords: ["vestir", "formal"], required: true },
      { type: "piernas", categories: ["Pantalon para Caballero"], keywords: ["pants", "pantalon"], excludeKeywords: ["vestir", "formal", "short"], required: true },
      { type: "pies", categories: ["Calzado para Caballero"], keywords: ["Tenis"], excludeKeywords: ["formal", "zapato"], required: true }
    ]
  },
  {
    id: "look_confort_caballero",
    name: "🛋️ Confort Hombre",
    description: "Comodidad para el hogar",
    category: "Hombre",
    slots: [
      { type: "torso", categories: ["Sueter para Caballero"], keywords: [], excludeKeywords: ["vestir", "formal"], required: true },
      { type: "piernas", categories: ["Pantalon para Caballero"], keywords: ["pants"], excludeKeywords: ["vestir", "formal", "short"], required: true },
      { type: "pies", categories: ["Calzado para Caballero"], keywords: ["Tenis", "pantunflas"], excludeKeywords: ["formal", "zapato"], required: true }
    ]
  }
];

// ========== FUNCIONES DE PRODUCTOS Y LOOKS ==========
function matchesProductCriteria(product, categories, keywords, excludeKeywords = []) {
  if (!product) return false;
  
  const matchesCategory = categories.length === 0 || categories.includes(product.Categoria);
  if (!matchesCategory) return false;
  
  const productName = (product.Nombre || "").toLowerCase();
  const parenthesisMatch = productName.match(/\(([^)]+)\)/);
  const textInParenthesis = parenthesisMatch ? parenthesisMatch[1].toLowerCase() : "";
  
  if (keywords && keywords.length > 0 && keywords[0] !== "") {
    const matchesKeyword = keywords.some(keyword => 
      productName.includes(keyword.toLowerCase()) || 
      textInParenthesis.includes(keyword.toLowerCase())
    );
    if (!matchesKeyword) return false;
  }
  
  if (excludeKeywords && excludeKeywords.length > 0) {
    const isExcluded = excludeKeywords.some(exclude => 
      productName.includes(exclude.toLowerCase()) || 
      textInParenthesis.includes(exclude.toLowerCase())
    );
    if (isExcluded) return false;
  }
  
  return true;
}

function getProductsForSlot(products, slot) {
  return products.filter(p => 
    p.Stock > 0 && 
    matchesProductCriteria(p, slot.categories, slot.keywords, slot.excludeKeywords || [])
  );
}

function selectProductsForLook(lookConfig, productsWithImages, currentSelection = {}) {
  const selected = {};
  const usedProductIds = [];
  
  for (const slot of lookConfig.slots) {
    const slotKey = slot.type;
    const currentProductId = currentSelection[slotKey]?.id;
    
    if (currentProductId && !currentSelection._reloading) {
      const existingProduct = productsWithImages.find(p => p.ID == currentProductId);
      if (existingProduct && existingProduct.Stock > 0) {
        selected[slotKey] = {
          id: existingProduct.ID,
          name: existingProduct.Nombre,
          price: Number(existingProduct.Precio || 0),
          image: existingProduct.Imagen1 || existingProduct.Imagen2 || "",
          stock: existingProduct.Stock,
          category: existingProduct.Categoria,
          size: existingProduct.Talla || ""
        };
        usedProductIds.push(String(existingProduct.ID));
        continue;
      }
    }
    
    const availableProducts = getProductsForSlot(productsWithImages, slot);
    const freshProducts = availableProducts.filter(p => !usedProductIds.includes(String(p.ID)));
    
    if (freshProducts.length > 0) {
      const randomIndex = Math.floor(Math.random() * freshProducts.length);
      const product = freshProducts[randomIndex];
      selected[slotKey] = {
        id: product.ID,
        name: product.Nombre,
        price: Number(product.Precio || 0),
        image: product.Imagen1 || product.Imagen2 || "",
        stock: product.Stock,
        category: product.Categoria,
        size: product.Talla || ""
      };
      usedProductIds.push(String(product.ID));
    }
  }
  
  return selected;
}

window.reloadSlot = function(lookId, slotType, event) {
  event.stopPropagation();
  
  const lookIndex = looks.findIndex(l => l.id === lookId);
  if (lookIndex === -1) return;
  
  const look = looks[lookIndex];
  const lookConfig = LOOKS_CONFIG.find(c => c.id === lookId);
  if (!lookConfig) return;
  
  const productsWithImages = allProducts.filter(p => (p.Imagen1 || p.Imagen2 || p.Imagen3) && p.Stock > 0);
  
  const usedProductIds = [];
  for (const [key, product] of Object.entries(look.products)) {
    if (key !== slotType && product && product.id) {
      usedProductIds.push(String(product.id));
    }
  }
  
  const slot = lookConfig.slots.find(s => s.type === slotType);
  if (!slot) return;
  
  const availableProducts = getProductsForSlot(productsWithImages, slot);
  const freshProducts = availableProducts.filter(p => !usedProductIds.includes(String(p.ID)));
  
  if (freshProducts.length > 0) {
    const randomIndex = Math.floor(Math.random() * freshProducts.length);
    const newProduct = freshProducts[randomIndex];
    
    look.products[slotType] = {
      id: newProduct.ID,
      name: newProduct.Nombre,
      price: Number(newProduct.Precio || 0),
      image: newProduct.Imagen1 || newProduct.Imagen2 || "",
      stock: newProduct.Stock,
      category: newProduct.Categoria,
      size: newProduct.Talla || ""
    };
    
    if (slotType === "torso") {
      look.image = optimizeDriveUrl(newProduct.Imagen1 || newProduct.Imagen2 || "", 500);
    }
    
    renderLooks();
  } else {
    alert(`No hay más productos disponibles para esta prenda.`);
  }
};

// ========== FUNCIONES DE CLIMA ==========
async function getWeather() {
  try {
    const response = await fetch(`${WEATHER_API_URL}?action=getWeather`);
    const data = await response.json();
    
    if (data.ok && data.weatherType) {
      currentWeather = data;
      console.log("🌤️ Clima actual:", data.weatherType, data.temperature, data.city);
      addWeatherNotification(data);
      return data;
    } else {
      // Si no hay clima, usar templado por defecto
      currentWeather = { weatherType: 'templado', temperature: 22, city: 'Default' };
      console.log("⚠️ No se pudo obtener clima, usando 'templado' por defecto");
      return currentWeather;
    }
  } catch (err) {
    console.error("Error obteniendo clima:", err);
    // Usar templado por defecto si hay error
    currentWeather = { weatherType: 'templado', temperature: 22, city: 'Default' };
    return currentWeather;
  }
}

function addWeatherNotification(weather) {
  const existing = document.querySelector('.weather-notification');
  if (existing) existing.remove();
  
  let weatherIcon = "🌤️";
  let weatherText = "";
  let recommendation = "";
  
  switch(weather.weatherType) {
    case 'calor':
      weatherIcon = "☀️🔥";
      weatherText = "¡Día caluroso!";
      recommendation = "Te recomendamos looks frescos para el calor ☀️";
      break;
    case 'frio':
      weatherIcon = "❄️🥶";
      weatherText = "¡Día frío!";
      recommendation = "Te recomendamos looks abrigadores 🧥";
      break;
    case 'lluvioso':
      weatherIcon = "🌧️☔";
      weatherText = "¡Día lluvioso!";
      recommendation = "Te recomendamos looks con chamarra y calzado cerrado 🧥👟";
      break;
    default:
      weatherIcon = "🌤️";
      weatherText = "Clima templado";
      recommendation = "Looks casuales y elegantes para hoy ✨";
  }
  
  const notif = document.createElement('div');
  notif.className = 'weather-notification';
  notif.innerHTML = `
    <div class="weather-notification-content">
      <div class="weather-icon">${weatherIcon}</div>
      <div class="weather-info">
        <div class="weather-text">${weatherText} ${weather.temperature ? `${weather.temperature}°C` : ''}</div>
        <div class="weather-recommendation">${recommendation}</div>
      </div>
      <button class="weather-close" onclick="this.closest('.weather-notification').remove()">✕</button>
    </div>
  `;
  
  document.body.insertBefore(notif, document.body.firstChild);
  
  setTimeout(() => {
    if (notif && notif.parentNode) notif.remove();
  }, 8000);
}



// ========== FUNCIÓN PRINCIPAL DE ORDENAMIENTO ==========
function sortLooksByWeather(looksArray) {
  if (!currentWeather || !currentWeather.weatherType) {
    console.log("No hay clima disponible, mostrando looks sin ordenar");
    return looksArray;
  }
  
  const weatherType = currentWeather.weatherType;
  const priorityScores = WEATHER_PRIORITY_SCORES[weatherType];
  
  if (!priorityScores) {
    console.log(`No hay puntuaciones para clima: ${weatherType}`);
    return looksArray;
  }
  
  console.log(`🎯 Ordenando looks para clima: ${weatherType}`);
  console.log("Puntuaciones:", priorityScores);
  
  const sortedLooks = [...looksArray].sort((a, b) => {
    const scoreA = priorityScores[a.id] || 0;
    const scoreB = priorityScores[b.id] || 0;
    console.log(`  ${a.id}: ${scoreA} | ${b.id}: ${scoreB}`);
    return scoreB - scoreA;
  });
  
  return sortedLooks;
}

// ========== CARGA DE PRODUCTOS Y CONSTRUCCIÓN DE LOOKS ==========
async function loadProducts() {
  const cached = getCachedProducts();
  if (cached && cached.length > 0) {
    allProducts = cached;
    await getWeather();  // Esperar a tener el clima
    buildLooksFromProducts();
    // No renderizar aquí, se hace al final
    loadLooksInBackground();
    return;
  }
  
  showLoader("Cargando productos...");
  
  try {
    await getWeather();  // Esperar a tener el clima ANTES de construir looks
    
    const res = await fetch(API_URL);
    const data = await res.json();
    allProducts = data.products || data || [];
    
    setCachedProducts(allProducts);
    
    buildLooksFromProducts();
    
  } catch (err) {
    console.error("Error cargando productos:", err);
    const container = document.getElementById("looks-container");
    if (container) {
      container.innerHTML = '<div class="empty-looks">❌ Error al cargar los productos. Intenta de nuevo.</div>';
    }
  } finally {
    hideLoader();
  }
}

async function loadLooksInBackground() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    const freshProducts = data.products || data || [];
    
    if (JSON.stringify(freshProducts) !== JSON.stringify(allProducts)) {
      allProducts = freshProducts;
      setCachedProducts(allProducts);
      buildLooksFromProducts();
      renderLooks();
    }
  } catch (err) {
    console.error("Error en carga background:", err);
  }
}

function buildLooksFromProducts() {
  if (allProducts.length === 0) return;
  
  const productsWithImages = allProducts.filter(p => (p.Imagen1 || p.Imagen2 || p.Imagen3) && p.Stock > 0);
  
  const allBuiltLooks = [];
  
  for (const config of LOOKS_CONFIG) {
    const selectedProducts = selectProductsForLook(config, productsWithImages);
    
    const productCount = Object.keys(selectedProducts).length;
    
    if (productCount > 0) {
      const firstProductKey = Object.keys(selectedProducts)[0];
      let lookImage = "https://placehold.co/600x800/3b1f5f/ffffff?text=Z&R";
      
      if (selectedProducts[firstProductKey] && selectedProducts[firstProductKey].image) {
        lookImage = optimizeDriveUrl(selectedProducts[firstProductKey].image, 500);
      }
      
      allBuiltLooks.push({
        id: config.id,
        name: config.name,
        description: config.description,
        category: config.category,
        image: lookImage,
        products: selectedProducts,
        config: config,
        productCount: productCount
      });
    }
  }
  
  // APLICAR ORDENAMIENTO POR CLIMA
  console.log(`🌡️ Clima actual para ordenamiento: ${currentWeather?.weatherType || 'no disponible'}`);
  looks = sortLooksByWeather(allBuiltLooks);
  
  console.log(`📋 Looks ordenados (${looks.length} totales):`);
  looks.forEach((look, idx) => {
    console.log(`  ${idx + 1}. ${look.name} (${look.id})`);
  });
  
  // Renderizar después de ordenar
  renderLooks();
}

function renderLooks() {
  const container = document.getElementById("looks-container");
  if (!container) return;
  
  if (looks.length === 0) {
    container.innerHTML = `
      <div class="empty-looks">
        <p>✨ No disponibles en este momento.</p>
        <p>Visita el <a href="index.html" style="color:#ff4f81;">catálogo</a> para ver nuestros productos.</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = "";
  
  looks.forEach(look => {
    let totalPrice = 0;
    let productsHtml = '';
    let productCount = 0;
    
    const slotOrder = ["torso", "piernas", "pies"];
    
    const slotNames = {
      : "",
      : "",
      : ""
    };
    
    const slotIcons = {
      torso: "👕",
      piernas: "👖",
      pies: "👟"
    };
    
    for (const slotKey of slotOrder) {
      const product = look.products[slotKey];
      
      if (!product) continue;
      
      productCount++;
      totalPrice += product.price;
      
      const productImg = optimizeDriveUrl(product.image, 150);
      const slotName = slotNames[slotKey] || slotKey;
      const slotIcon = slotIcons[slotKey] || "🛍️";
      
      productsHtml += `
        <div class="look-product-item" data-slot="${slotKey}">
          <div class="look-product-slot-badge">${slotIcon} ${slotName}</div>
          <img class="look-product-img" src="${productImg}" alt="${escapeHtml(product.name)}" onerror="this.src='https://placehold.co/70x70/eee/999?text=No+img'">
          <div class="look-product-info">
            <div class="look-product-name">${escapeHtml(product.name)}</div>
            <div class="look-product-price">${formatCurrency(product.price)}</div>
            <div class="look-product-category">${escapeHtml(product.category || '')}</div>
            <div class="look-product-size">${escapeHtml(product.size || 'Talla no especificada')}</div>
          </div>
          <div class="look-product-actions">
            <button class="look-product-add" onclick="addToCart({ID:'${product.id}', Nombre:'${escapeHtml(product.name)}', Precio:${product.price}, Imagen1:'${product.image}', Talla:'${escapeHtml(product.size || '')}'})">
              + Agregar
            </button>
            <button class="look-product-reload" onclick="reloadSlot('${look.id}', '${slotKey}', event)" title="Cambiar esta prenda">
              🔄
            </button>
          </div>
        </div>
      `;
    }
    
    const card = document.createElement("div");
    card.className = "look-card";
    
    card.innerHTML = `
      <div class="look-image-container" onclick="openImageModal('${optimizeDriveUrl(look.image, 800)}')">
        <img class="look-image" src="${optimizeDriveUrl(look.image, 500)}" alt="${escapeHtml(look.name)}">
      </div>
      <div class="look-info">
        <div class="look-header">
          <span class="look-category">${escapeHtml(look.category)}</span>
          <span class="look-item-count">${productCount} prenda${productCount !== 1 ? 's' : ''}</span>
        </div>
        <h2 class="look-title">${escapeHtml(look.name)}</h2>
        <p class="look-description">${escapeHtml(look.description)}</p>
        <div class="look-products">
          <div class="look-products-title">
            <span>🛍️ Este look incluye:</span>
          </div>
          <div class="look-products-list">
            ${productsHtml}
          </div>
          <div class="look-total">
            <span class="look-total-label">Precio total:</span>
            <span class="look-total-price">${formatCurrency(totalPrice)}</span>
          </div>
        </div>
        <button class="buy-look-btn" onclick="addLookToCart('${look.id}')">
          🛒 Comprar este look
        </button>
      </div>
    `;
    
    container.appendChild(card);
  });
}

window.addLookToCart = function(lookId) {
  const look = looks.find(l => l.id === lookId);
  if (!look) return;
  
  let addedCount = 0;
  const products = Object.values(look.products).filter(p => p !== null);
  
  if (products.length === 0) {
    alert("❌ No hay prendas disponibles.");
    return;
  }
  
  products.forEach(product => {
    if (product.stock > 0) {
      addToCart({
        ID: product.id,      
        Nombre: product.name,
        Precio: product.price,
        Imagen1: product.image,
        Talla: product.size
      });
      addedCount++;
    }
  });
  
  if (addedCount > 0) {
    animateCartAdd();
  }
};

// ========== FUNCIONES DE WHATSAPP ==========
function buildWhatsAppMessage() {
  const items = Object.values(localCart);
  if (items.length === 0) return "";
  
  let message = "Hola, quiero comprar:%0A%0A";
  items.forEach((item) => {
    message += `${encodeURIComponent(item.name)} - ${item.quantity} pieza${item.quantity > 1 ? "s" : ""}%0A`;
  });
  
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  message += `%0ATotal: ${encodeURIComponent(formatCurrency(total))}`;
  return message;
}

function generateRequestId() {
  return 'REQ_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
}

let activeRequestId = null;
let pollingInterval = null;

window.openWhatsAppCheckout = async function() {
  const items = Object.values(localCart);
  if (items.length === 0) {
    showTemporaryMessage("No hay productos en el carrito", "error");
    return;
  }
  
  let clientPhone = localStorage.getItem("client_phone");
  
  if (!clientPhone) {
    clientPhone = prompt(
      "📱 Para procesar tu compra, ingresa tu número de WhatsApp (10 dígitos):\n\n" +
      "⚠️ Solo números, sin espacios ni código país.",
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
  adminMessage += `_✅ Para continuar con el pago espera el mensaje de confirmacion\n`;
  
  const whatsappAdminUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(adminMessage)}`;
  window.open(whatsappAdminUrl, '_blank');
  
  try {
    await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "saveClientPhone",
        requestId: requestId,
        phone: clientPhone
      })
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
      body: JSON.stringify({
        action: "createNotification",
        items: notificationItems,
        requestId: requestId
      })
    });
    
    localCart = {};
    saveCartToStorage();
    updateCartBadge();
    renderCart();
    
    showTemporaryMessage(`✅ ¡Solicitud enviada! Recibirás el link de pago por WhatsApp cuando el administrador confirme.`, "success");
    
    closeCartDrawer();
    
    startSilentPolling(requestId, clientPhone);
    
  } catch(err) {
    console.error("Error:", err);
    showTemporaryMessage("❌ Error al enviar la solicitud", "error");
  } finally {
    hideLoader();
  }
};

function startSilentPolling(requestId, clientPhone) {
  let interval = setInterval(async () => {
    try {
      const response = await fetch(`${API_URL}?action=checkRequestStatus&requestId=${requestId}`);
      const data = await response.json();
      
      if (data.ok && data.status === 'approved' && data.paymentLink) {
        clearInterval(interval);
        
        let message = `✅ *¡TU PEDIDO HA SIDO CONFIRMADO!*\n\n`;
        message += `*💰 TOTAL A PAGAR: $${(data.totalAmount || 0).toLocaleString()} MXN*\n\n`;
        message += `🔗 *LINK DE PAGO SEGURO:*\n${data.paymentLink}\n\n`;
        message += `⚠️ *El enlace expira en 30 minutos*\n`;
        message += `¡Gracias por tu compra! 🛍️`;
        
        let cleanPhone = String(clientPhone).replace(/[^0-9]/g, '');
        if (cleanPhone.length === 10) cleanPhone = "52" + cleanPhone;
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
        
        localStorage.removeItem('pending_purchase_' + requestId);
      }
    } catch (err) {
      console.error("Error:", err);
    }
  }, 5000);
  
  setTimeout(() => {
    clearInterval(interval);
    localStorage.removeItem('pending_purchase_' + requestId);
  }, 600000);
}

// ========== INICIALIZACIÓN ==========
document.addEventListener("DOMContentLoaded", () => {
  loadCartFromStorage();
  loadProducts();
  renderCart();
  
  const cartBtn = document.getElementById("floating-cart-btn");
  if (cartBtn) cartBtn.addEventListener("click", openCartDrawer);
  
  const closeCartBtn = document.getElementById("close-cart-btn");
  if (closeCartBtn) closeCartBtn.addEventListener("click", closeCartDrawer);
  
  const overlay = document.getElementById("overlay");
  if (overlay) overlay.addEventListener("click", () => {
    closeCartDrawer();
    closeImageModal();
  });
  
  const closeImageBtn = document.getElementById("close-image-modal");
  if (closeImageBtn) closeImageBtn.addEventListener("click", closeImageModal);
  
  const refreshBtn = document.getElementById("refresh-looks");
  if (refreshBtn) refreshBtn.addEventListener("click", () => loadProducts());
  
  const requestBtn = document.getElementById("request-purchase-btn");
  if (requestBtn) requestBtn.addEventListener("click", openWhatsAppCheckout);
});

// Estilos toast
if (!document.querySelector('#toast-styles')) {
  const style = document.createElement("style");
  style.id = "toast-styles";
  style.textContent = `
    @keyframes slideUp {
      from { opacity: 0; transform: translateX(-50%) translateY(20px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @keyframes slideDown {
      from { opacity: 1; transform: translateX(-50%) translateY(0); }
      to { opacity: 0; transform: translateX(-50%) translateY(20px); }
    }
  `;
  document.head.appendChild(style);
    }
