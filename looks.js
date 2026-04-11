
const WEATHER_API_URL = API_URL;

let currentWeather = null;
let allProducts = [];
let looks = [];
let allLooks = [];
let currentLooksPage = 1;
let looksPerPage = 10;


window.addEventListener('beforeunload', () => {
  sessionStorage.setItem('looks_scroll_position', window.scrollY);
});


const WEATHER_PRIORITY_SCORES = {
  calor: {
    "look_verano_dama": 100, "look_verano_caballero": 100,
    "look_falda_dama": 95, "look_vestido_dama": 90,
    "look_casual_dama": 80, "look_casual_caballero": 80,
    "look_elegante_dama": 60, "look_elegante_caballero": 60,
    "look_confort_dama": 40, "look_confort_caballero": 40,
    "look_chamarra_dama": 10, "look_chamarra_caballero": 10
  },
  frio: {
    "look_chamarra_dama": 100, "look_chamarra_caballero": 100,
    "look_confort_dama": 95, "look_confort_caballero": 95,
    "look_casual_dama": 70, "look_casual_caballero": 70,
    "look_elegante_dama": 65, "look_elegante_caballero": 65,
    "look_vestido_dama": 50, "look_falda_dama": 40,
    "look_verano_dama": 10, "look_verano_caballero": 10
  },
  templado: {
    "look_casual_dama": 100, "look_casual_caballero": 100,
    "look_elegante_dama": 95, "look_elegante_caballero": 95,
    "look_vestido_dama": 90, "look_falda_dama": 85,
    "look_verano_dama": 70, "look_verano_caballero": 70,
    "look_confort_dama": 60, "look_confort_caballero": 60,
    "look_chamarra_dama": 50, "look_chamarra_caballero": 50
  },
  lluvioso: {
    "look_chamarra_dama": 100, "look_chamarra_caballero": 100,
    "look_confort_dama": 90, "look_confort_caballero": 90,
    "look_casual_dama": 70, "look_casual_caballero": 70,
    "look_elegante_dama": 60, "look_elegante_caballero": 60,
    "look_vestido_dama": 50, "look_falda_dama": 40,
    "look_verano_dama": 20, "look_verano_caballero": 20
  }
};

const LOOKS_CONFIG = [
  { id: "look_casual_dama", name: "👟 Casual", description: "Para tu día a día", category: "Mujer",
    slots: [
      { type: "torso", categories: ["Blusas"], keywords: [], excludeKeywords: ["vestir", "formal", "gala"], required: true },
      { type: "piernas", categories: ["Pantalon para Dama"], keywords: [], excludeKeywords: ["formal", "vestir"], required: true },
      { type: "pies", categories: ["Calzado para Dama"], keywords: ["Tenis"], excludeKeywords: ["formal", "tacón", "zapato"], required: true }
    ] },
  { id: "look_elegante_dama", name: "👗 Elegancia Femenina", description: "Para ocasiones especiales", category: "Mujer",
    slots: [
      { type: "torso", categories: ["Blusas"], keywords: ["Vestir"], excludeKeywords: ["casual", "deportivo"], required: true },
      { type: "piernas", categories: ["Pantalon para Dama"], keywords: ["Vestir"], excludeKeywords: ["short", "jeans", "mezclilla"], required: true },
      { type: "pies", categories: ["Calzado para Dama"], keywords: ["Zapatos"], excludeKeywords: ["tenis", "sandalias", "deportivo"], required: true }
    ] },
  { id: "look_verano_dama", name: "☀️ Verano Fresco", description: "Fresco para días calurosos", category: "Mujer",
    slots: [
      { type: "torso", categories: ["Blusas"], keywords: [], excludeKeywords: ["vestir", "formal", "abrigo"], required: true },
      { type: "piernas", categories: ["Short para Dama"], keywords: [], excludeKeywords: ["formal", "vestir", "pantalón"], required: true },
      { type: "pies", categories: ["Calzado para Dama"], keywords: ["Tenis", "sandalias"], excludeKeywords: ["formal", "tacón"], required: true }
    ] },
  { id: "look_falda_dama", name: "🌸 Luce una Falda", description: "Look fresco con falda", category: "Mujer",
    slots: [
      { type: "torso", categories: ["Blusas"], keywords: [], excludeKeywords: ["deportivo", "abrigo"], required: true },
      { type: "piernas", categories: ["Faldas"], keywords: [], excludeKeywords: ["short", "pantalón"], required: true },
      { type: "pies", categories: ["Calzado para Dama"], keywords: ["Tenis", "sandalias"], excludeKeywords: ["formal", "tacón"], required: true }
    ] },
  { id: "look_vestido_dama", name: "💃 Vestido Elegante", description: "Perfecto para citas", category: "Mujer",
    slots: [
      { type: "torso", categories: ["Vestidos"], keywords: [], excludeKeywords: ["casual", "deportivo"], required: true },
      { type: "pies", categories: ["Calzado para Dama"], keywords: ["tacones"], excludeKeywords: ["tenis", "deportivo", "sandalias"], required: true }
    ] },
  { id: "look_confort_dama", name: "🛋️ Confort en Casa", description: "Comodidad en casa", category: "Mujer",
    slots: [
      { type: "torso", categories: ["Sueter para Dama"], keywords: [], excludeKeywords: ["vestir", "formal"], required: true },
      { type: "piernas", categories: ["Pantalon para Dama"], keywords: ["pants"], excludeKeywords: ["vestir", "formal"], required: true },
      { type: "pies", categories: ["Calzado para Dama"], keywords: ["Pantunflas"], excludeKeywords: ["tenis", "tacón"], required: true }
    ] },
  { id: "look_chamarra_dama", name: "🧥🟣 Abrigate", description: "Ideal para días frescos", category: "Mujer",
    slots: [
      { type: "torso", categories: ["Chamarra para Dama"], keywords: [], excludeKeywords: ["vestir", "formal"], required: true },
      { type: "piernas", categories: ["Pantalon para Dama"], keywords: ["pants", "pantalon"], excludeKeywords: ["vestir", "formal", "short"], required: true },
      { type: "pies", categories: ["Calzado para Dama"], keywords: ["Pantunflas"], excludeKeywords: ["tenis", "tacón"], required: true }
    ] },
  { id: "look_casual_caballero", name: "👔 Casual Hombre", description: "Para el día a día", category: "Hombre",
    slots: [
      { type: "torso", categories: ["Playeras"], keywords: [], excludeKeywords: ["vestir", "formal", "camisa"], required: true },
      { type: "piernas", categories: ["Pantalon para Caballero"], keywords: [], excludeKeywords: ["formal", "vestir", "short"], required: true },
      { type: "pies", categories: ["Calzado para Caballero"], keywords: ["Tenis", "Botas"], excludeKeywords: ["formal", "zapato"], required: true }
    ] },
  { id: "look_elegante_caballero", name: "🤵 Elegancia Masculina", description: "Formal para ocasiones especiales", category: "Hombre",
    slots: [
      { type: "torso", categories: ["Playeras"], keywords: ["Vestir"], excludeKeywords: ["casual", "deportivo"], required: true },
      { type: "piernas", categories: ["Pantalon para Caballero"], keywords: ["Vestir"], excludeKeywords: ["short", "jeans", "mezclilla"], required: true },
      { type: "pies", categories: ["Calzado para Caballero"], keywords: ["Zapatos"], excludeKeywords: ["tenis", "deportivo", "botas"], required: true }
    ] },
  { id: "look_verano_caballero", name: "🏖️ Verano Hombre", description: "Fresco para el calor", category: "Hombre",
    slots: [
      { type: "torso", categories: ["Playeras"], keywords: [], excludeKeywords: ["vestir", "formal", "camisa"], required: true },
      { type: "piernas", categories: ["Short para Caballero"], keywords: [], excludeKeywords: ["formal", "vestir", "pantalón"], required: true },
      { type: "pies", categories: ["Calzado para Caballero"], keywords: ["Tenis", "sandalias"], excludeKeywords: ["formal", "zapato"], required: true }
    ] },
  { id: "look_chamarra_caballero", name: "🧥🔵 Abrigate", description: "Luce tu chamarra", category: "Hombre",
    slots: [
      { type: "torso", categories: ["Chamarra para Caballero"], keywords: [], excludeKeywords: ["vestir", "formal"], required: true },
      { type: "piernas", categories: ["Pantalon para Caballero"], keywords: ["pants", "pantalon"], excludeKeywords: ["vestir", "formal", "short"], required: true },
      { type: "pies", categories: ["Calzado para Caballero"], keywords: ["Tenis"], excludeKeywords: ["formal", "zapato"], required: true }
    ] },
  { id: "look_confort_caballero", name: "🛋️ Confort Hombre", description: "Comodidad para el hogar", category: "Hombre",
    slots: [
      { type: "torso", categories: ["Sueter para Caballero"], keywords: [], excludeKeywords: ["vestir", "formal"], required: true },
      { type: "piernas", categories: ["Pantalon para Caballero"], keywords: ["pants"], excludeKeywords: ["vestir", "formal", "short"], required: true },
      { type: "pies", categories: ["Calzado para Caballero"], keywords: ["Tenis", "pantunflas"], excludeKeywords: ["formal", "zapato"], required: true }
    ] }
];

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
      currentWeather = { weatherType: 'templado', temperature: 22, city: 'Default' };
      return currentWeather;
    }
  } catch (err) {
    console.error("Error obteniendo clima:", err);
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
  setTimeout(() => { if (notif && notif.parentNode) notif.remove(); }, 8000);
}

function sortLooksByWeather(looksArray) {
  if (!currentWeather || !currentWeather.weatherType) return looksArray;
  const weatherType = currentWeather.weatherType.toLowerCase();
  const priorityScores = WEATHER_PRIORITY_SCORES[weatherType];
  if (!priorityScores) return looksArray;
  return [...looksArray].sort((a, b) => (priorityScores[b.id?.toLowerCase()] || 0) - (priorityScores[a.id?.toLowerCase()] || 0));
}

// ========== FUNCIONES DE PRODUCTOS PARA LOOKS ==========
function matchesProductCriteria(product, categories, keywords, excludeKeywords = []) {
  if (!product) return false;
  const productCategory = (product.Categoria || "").toLowerCase();
  const matchesCategory = categories.length === 0 || categories.some(cat => cat.toLowerCase() === productCategory);
  if (!matchesCategory) return false;
  const productName = (product.Nombre || "").toLowerCase();
  const parenthesisMatch = productName.match(/\(([^)]+)\)/);
  const textInParenthesis = parenthesisMatch ? parenthesisMatch[1].toLowerCase() : "";
  if (keywords && keywords.length > 0 && keywords[0] !== "") {
    const matchesKeyword = keywords.some(keyword => productName.includes(keyword.toLowerCase()) || textInParenthesis.includes(keyword.toLowerCase()));
    if (!matchesKeyword) return false;
  }
  if (excludeKeywords && excludeKeywords.length > 0) {
    const isExcluded = excludeKeywords.some(exclude => productName.includes(exclude.toLowerCase()) || textInParenthesis.includes(exclude.toLowerCase()));
    if (isExcluded) return false;
  }
  return true;
}

function getProductsForSlot(products, slot) {
  return products.filter(p => {
    if (!p.Stock || p.Stock <= 0 || p.Stock === "0") return false;
    const matchesCategory = slot.categories.length === 0 || slot.categories.includes(p.Categoria);
    if (!matchesCategory) return false;
    const productName = (p.Nombre || "").toLowerCase();
    const parenthesisMatch = productName.match(/\(([^)]+)\)/);
    const textInParenthesis = parenthesisMatch ? parenthesisMatch[1].toLowerCase() : "";
    if (slot.keywords && slot.keywords.length > 0 && slot.keywords[0] !== "") {
      const matchesKeyword = slot.keywords.some(keyword => productName.includes(keyword.toLowerCase()) || textInParenthesis.includes(keyword.toLowerCase()));
      if (!matchesKeyword) return false;
    }
    if (slot.excludeKeywords && slot.excludeKeywords.length > 0) {
      const isExcluded = slot.excludeKeywords.some(exclude => productName.includes(exclude.toLowerCase()) || textInParenthesis.includes(exclude.toLowerCase()));
      if (isExcluded) return false;
    }
    return true;
  });
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
        size: product.Talla ? "Talla: " + product.Talla : "Talla:"
      };
      usedProductIds.push(String(product.ID));
    }
  }
  return selected;
}

// ========== CARGA Y RENDERIZADO DE LOOKS ==========
async function loadProducts() {
  // Si estamos offline, mostrar mensaje
  if (!navigator.onLine) {
    console.log('📡 Offline - Cargando looks desde caché');
    if (window.ConnectionMonitor && window.ConnectionMonitor.showOfflineBanner) {
      window.ConnectionMonitor.showOfflineBanner();
    }
  }
  
  // CARGA INSTANTÁNEA desde caché
  const cached = (window.CacheManager && window.CacheManager.getSessionProductsCache) 
    ? window.CacheManager.getSessionProductsCache() 
    : getCachedProducts();
  
  if (cached && cached.length > 0) {
    console.log("⚡ CARGA INSTANTÁNEA de looks desde caché");
    allProducts = cached;
    await getWeather();
    buildLooksFromProducts();
    
    const savedScroll = sessionStorage.getItem('looks_scroll_position');
    if (savedScroll) {
      setTimeout(() => window.scrollTo(0, parseInt(savedScroll)), 100);
      sessionStorage.removeItem('looks_scroll_position');
    }
    
    if (navigator.onLine) {
      loadLooksInBackground();
    }
    return;
  }
  
  // Sin caché: carga normal
  showLoader("Cargando productos...");
  try {
    await getWeather();
    const res = await fetch(API_URL);
    const data = await res.json();
    allProducts = data.products || data || [];
    setCachedProducts(allProducts);
    buildLooksFromProducts();
  } catch (err) {
    console.error("Error cargando productos:", err);
    const container = document.getElementById("looks-container");
    if (container) container.innerHTML = '<div class="empty-looks">❌ Error al cargar los productos. Intenta de nuevo.</div>';
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
        id: config.id.toLowerCase(),
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
  allLooks = sortLooksByWeather(allBuiltLooks);
  looks = [...allLooks];
  currentLooksPage = 1;
  renderLooks();
}

function renderLooks() {
  const container = document.getElementById("looks-container");
  if (!container) return;
  if (allLooks.length === 0) {
    container.innerHTML = `<div class="empty-looks"><p>✨ No disponibles en este momento.</p><p>Visita el <a href="index.html" style="color:#ff4f81;">catálogo</a> para ver nuestros productos.</p></div>`;
    renderLooksPagination();
    return;
  }
  const totalPages = Math.ceil(allLooks.length / looksPerPage);
  const start = (currentLooksPage - 1) * looksPerPage;
  const end = start + looksPerPage;
  const looksToRender = allLooks.slice(start, end);
  container.innerHTML = "";
  looksToRender.forEach(look => {
    let totalPrice = 0;
    let productsHtml = '';
    let productCount = 0;
    const slotOrder = ["torso", "piernas", "pies"];
    for (const slotKey of slotOrder) {
      const product = look.products[slotKey];
      if (!product) continue;
      productCount++;
      totalPrice += product.price;
      const productImg = optimizeDriveUrl(product.image, 150);
      productsHtml += `
        <div class="look-product-item" data-slot="${slotKey}">
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
            <button class="look-product-reload" onclick="reloadSlot('${look.id}', '${slotKey}', event)" title="Cambiar esta prenda">Cambiar</button>
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
          <div class="look-products-title"><span>Este outfit incluye:</span></div>
          <div class="look-products-list">${productsHtml}</div>
          <div class="look-total">
            <span class="look-total-label">Precio total:</span>
            <span class="look-total-price">${formatCurrency(totalPrice)}</span>
          </div>
        </div>
        <button class="buy-look-btn" onclick="addLookToCart('${look.id}')">🛒 Comprar todo</button>
      </div>
    `;
    container.appendChild(card);
  });
  renderLooksPagination(totalPages);
}

function renderLooksPagination(totalPages) {
  const container = document.getElementById("looks-container");
  if (!container) return;
  const existingPagination = document.querySelector(".looks-pagination");
  if (existingPagination) existingPagination.remove();
  if (totalPages <= 1) return;
  const paginationDiv = document.createElement("div");
  paginationDiv.className = "looks-pagination admin-pagination";
  paginationDiv.style.cssText = "display: flex; justify-content: center; gap: 8px; margin-top: 20px; flex-wrap: wrap;";
  if (currentLooksPage > 1) {
    const prevBtn = document.createElement("button");
    prevBtn.textContent = "← Anterior";
    prevBtn.onclick = () => { currentLooksPage--; renderLooks(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    paginationDiv.appendChild(prevBtn);
  }
  let startPage = Math.max(1, currentLooksPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);
  if (endPage - startPage < 4 && startPage > 1) startPage = Math.max(1, endPage - 4);
  for (let i = startPage; i <= endPage; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    if (i === currentLooksPage) btn.classList.add("active-page");
    btn.onclick = () => { currentLooksPage = i; renderLooks(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    paginationDiv.appendChild(btn);
  }
  if (currentLooksPage < totalPages) {
    const nextBtn = document.createElement("button");
    nextBtn.textContent = "Siguiente →";
    nextBtn.onclick = () => { currentLooksPage++; renderLooks(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    paginationDiv.appendChild(nextBtn);
  }
  container.parentNode.insertBefore(paginationDiv, container.nextSibling);
}

// ========== FUNCIONES DE RECARGA DE SLOTS ==========
window.reloadSlot = async function(lookId, slotType, event) {
  if (event) event.stopPropagation();
  const lookIndex = looks.findIndex(l => String(l.id).toLowerCase() === String(lookId).toLowerCase());
  if (lookIndex === -1) return;
  const look = looks[lookIndex];
  const lookConfig = LOOKS_CONFIG.find(c => c.id.toLowerCase() === lookId.toLowerCase());
  if (!lookConfig) return;
  const slot = lookConfig.slots.find(s => s.type === slotType);
  if (!slot) return;
  const currentProduct = look.products[slotType];
  const currentProductId = currentProduct ? String(currentProduct.id) : null;
  const productsWithImages = allProducts.filter(p => (p.Imagen1 || p.Imagen2 || p.Imagen3) && p.Stock > 0 && p.Stock !== "0");
  if (productsWithImages.length === 0) return;
  const excludedProductIds = [];
  if (currentProductId) excludedProductIds.push(currentProductId);
  for (const [key, product] of Object.entries(look.products)) {
    if (key !== slotType && product && product.id) {
      const productId = String(product.id);
      if (!excludedProductIds.includes(productId)) excludedProductIds.push(productId);
    }
  }
  let availableProducts = getProductsForSlot(productsWithImages, slot);
  let freshProducts = availableProducts.filter(p => !excludedProductIds.includes(String(p.ID)));
  if (freshProducts.length === 0 && currentProductId) {
    freshProducts = availableProducts.filter(p => String(p.ID) !== currentProductId);
  }
  if (freshProducts.length === 0) {
    showTemporaryMessage("⚠️ No hay más productos disponibles", "error");
    return;
  }
  let randomIndex = Math.floor(Math.random() * freshProducts.length);
  let newProduct = freshProducts[randomIndex];
  if (currentProductId && String(newProduct.ID) === currentProductId) {
    const otherProducts = freshProducts.filter(p => String(p.ID) !== currentProductId);
    if (otherProducts.length > 0) newProduct = otherProducts[Math.floor(Math.random() * otherProducts.length)];
  }
  const updatedProduct = {
    id: newProduct.ID,
    name: newProduct.Nombre,
    price: Number(newProduct.Precio || 0),
    image: newProduct.Imagen1 || newProduct.Imagen2 || newProduct.Imagen3 || "",
    stock: newProduct.Stock,
    category: newProduct.Categoria,
    size: newProduct.Talla ? "Talla: " + newProduct.Talla : "Talla no especificada"
  };
  look.products[slotType] = updatedProduct;
  if (slotType === "torso" && updatedProduct.image) look.image = optimizeDriveUrl(updatedProduct.image, 500);
  looks[lookIndex] = { ...look };
  allLooks = [...looks];
  renderLooks();
};

window.addLookToCart = function(lookId) {
  const look = looks.find(l => l.id.toLowerCase() === lookId.toLowerCase());
  if (!look) return;
  const products = Object.values(look.products).filter(p => p !== null);
  if (products.length === 0) { alert("❌ No hay prendas disponibles."); return; }
  products.forEach(product => { if (product.stock > 0) addToCart({ ID: product.id, Nombre: product.name, Precio: product.price, Imagen1: product.image, Talla: product.size }); });
  animateCartAdd();
};

function initLooksLayoutToggle() {
  const looksContainer = document.getElementById("looks-container");
  const toggleBtn = document.getElementById("layout-toggle-looks");
  if (!looksContainer || !toggleBtn) return;
  const savedLayout = localStorage.getItem("looks_layout");
  if (savedLayout === "grid") {
    looksContainer.classList.add("layout-grid");
    toggleBtn.textContent = "▦";
  } else {
    toggleBtn.textContent = "≡";
  }
  toggleBtn.addEventListener("click", () => {
    looksContainer.classList.toggle("layout-grid");
    const isGrid = looksContainer.classList.contains("layout-grid");
    localStorage.setItem("looks_layout", isGrid ? "grid" : "list");
    toggleBtn.textContent = isGrid ? "▦" : "≡";
  });
}

// ========== INICIALIZACIÓN ==========
document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
  
  const refreshBtn = document.getElementById("refresh-looks");
  if (refreshBtn) refreshBtn.addEventListener("click", () => loadProducts());
  
  initLooksLayoutToggle();
  
  // Escuchar cambios en el carrito
  window.addEventListener('cartUpdated', () => updateCartBadge());
  
  // ========== AGREGAR ESTO ==========
  const requestBtn = document.getElementById("request-purchase-btn");
  if (requestBtn) {
    requestBtn.addEventListener("click", openWhatsAppCheckout);
    console.log("✅ Botón solicitar compra configurado");
  } else {
    console.log("❌ Botón request-purchase-btn no encontrado");
  }
  
  // Verificar que openWhatsAppCheckout existe
  if (typeof openWhatsAppCheckout === 'function') {
    console.log("✅ openWhatsAppCheckout existe");
  } else {
    console.log("❌ openWhatsAppCheckout NO existe");
  }
});
