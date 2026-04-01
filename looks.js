

const API_URL = "https://script.google.com/macros/s/AKfycbzNshrt3zldBNiyoB8x36ktCEO02H0cKxebiTuK7UAbsgd5R9biaCW7W4ihm1aVOJG7ww/exec";
const WHATSAPP_NUMBER = "528671781272";
// Caché persistente con localStorage
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
// Configuración de clima
const WEATHER_API_URL = "https://script.google.com/macros/s/AKfycbzNshrt3zldBNiyoB8x36ktCEO02H0cKxebiTuK7UAbsgd5R9biaCW7W4ihm1aVOJG7ww/exec";
let currentWeather = null;

// Puntuación de prioridad por tipo de clima (más alto = más prioridad)
const WEATHER_PRIORITY_SCORES = {
  // Looks para clima cálido (verano)
  calor: {
    "look_verano_dama": 100,
    "look_verano_caballero": 100,
    "look_falda_dama": 95,
    "look_casual_dama": 80,
    "look_casual_caballero": 80,
    "look_vestido_dama": 85,
    "look_elegante_dama": 60,
    "look_elegante_caballero": 60,
    "look_confort_dama": 40,
    "look_confort_caballero": 40,
    "look_chamarra_dama": 10,
    "look_chamarra_caballero": 10
  },
  // Looks para clima frío (invierno)
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
    "look_verano_dama": 10,
    "look_verano_caballero": 10,
    "look_falda_dama": 30
  },
  // Looks para clima templado (primavera/otoño)
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
  // Looks para clima lluvioso
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
    "look_verano_dama": 20,
    "look_verano_caballero": 20,
    "look_falda_dama": 40
  }
};

let allProducts = [];
let looks = [];

// Definición de looks con estructura de 3 prendas: torso, piernas, pies
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
      { type: "torso", categories: ["Chamarra para dama"], keywords: [], excludeKeywords: ["vestir", "formal"], required: true },
      { type: "piernas", categories: ["Pantalon para Dama"], keywords: ["pants"], excludeKeywords: ["vestir", "formal", "short"], required: true },
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
    name: "🧥 Abrigate",
    description: "Luce tu chamarra",
    category: "Hombre",
    slots: [
      { type: "torso", categories: ["Chamarra para Caballero"], keywords: [], excludeKeywords: ["vestir", "formal"], required: true },
      { type: "piernas", categories: ["Pantalon para Caballero"], keywords: ["pants"], excludeKeywords: ["vestir", "formal", "short"], required: true },
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

// Función para formatear moneda
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

// Función para verificar si un producto coincide con los criterios
function matchesProductCriteria(product, categories, keywords, excludeKeywords = []) {
  if (!product) return false;
  
  const matchesCategory = categories.length === 0 || categories.includes(product.Categoria);
  if (!matchesCategory) return false;
  
  const productName = (product.Nombre || "").toLowerCase();
  const parenthesisMatch = productName.match(/\(([^)]+)\)/);
  const textInParenthesis = parenthesisMatch ? parenthesisMatch[1].toLowerCase() : "";
  
  // Verificar keywords requeridas
  if (keywords && keywords.length > 0 && keywords[0] !== "") {
    const matchesKeyword = keywords.some(keyword => 
      productName.includes(keyword.toLowerCase()) || 
      textInParenthesis.includes(keyword.toLowerCase())
    );
    
    if (!matchesKeyword) return false;
  }
  
  // Verificar keywords de exclusión (si alguna coincide, se excluye el producto)
  if (excludeKeywords && excludeKeywords.length > 0) {
    const isExcluded = excludeKeywords.some(exclude => 
      productName.includes(exclude.toLowerCase()) || 
      textInParenthesis.includes(exclude.toLowerCase())
    );
    
    if (isExcluded) return false;
  }
  
  return true;
}

// Función para obtener productos que coinciden con un slot específico
function getProductsForSlot(products, slot) {
  return products.filter(p => 
    p.Stock > 0 && 
    matchesProductCriteria(p, slot.categories, slot.keywords, slot.excludeKeywords || [])
  );
}

// Modifica la función selectProductsForLook (aproximadamente línea 210-230 en looks.js)
// Asegúrate de incluir la talla al seleccionar productos:

function selectProductsForLook(lookConfig, productsWithImages, currentSelection = {}) {
  const selected = {};
  const usedProductIds = [];
  
  for (const slot of lookConfig.slots) {
    const slotKey = slot.type;
    const currentProductId = currentSelection[slotKey]?.id;
    
    if (currentProductId && !currentSelection._reloading) {
      const existingProduct = productsWithImages.find(p => p.ID === currentProductId);
      if (existingProduct && existingProduct.Stock > 0) {
        selected[slotKey] = {
          id: existingProduct.ID,
          name: existingProduct.Nombre,
          price: Number(existingProduct.Precio || 0),
          image: existingProduct.Imagen1 || existingProduct.Imagen2 || "",
          stock: existingProduct.Stock,
          category: existingProduct.Categoria,
          size: existingProduct.Talla || "" // <- Agregar talla
        };
        usedProductIds.push(existingProduct.ID);
        continue;
      }
    }
    
    const availableProducts = getProductsForSlot(productsWithImages, slot);
    const freshProducts = availableProducts.filter(p => !usedProductIds.includes(p.ID));
    
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
        size: product.Talla || "" // <- Agregar talla
      };
      usedProductIds.push(product.ID);
    }
  }
  
  return selected;
}



// Función para recargar un slot específico
// Modifica reloadSlot en looks.js:

function reloadSlot(lookId, slotType, event) {
  event.stopPropagation();
  
  const lookIndex = looks.findIndex(l => l.id === lookId);
  if (lookIndex === -1) return;
  
  const look = looks[lookIndex];
  const lookConfig = LOOKS_CONFIG.find(c => c.id === lookId);
  if (!lookConfig) return;
  
  const productsWithImages = allProducts.filter(p => (p.Imagen1 || p.Imagen2 || p.Imagen3) && p.Stock > 0);
  
  // Obtener los IDs de productos ya usados en otros slots
  const usedProductIds = [];
  for (const [key, product] of Object.entries(look.products)) {
    if (key !== slotType && product && product.id) {
      usedProductIds.push(product.id);
    }
  }
  
  const slot = lookConfig.slots.find(s => s.type === slotType);
  if (!slot) return;
  
  const availableProducts = getProductsForSlot(productsWithImages, slot);
  const freshProducts = availableProducts.filter(p => !usedProductIds.includes(p.ID));
  
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
      size: newProduct.Talla || "" // <- Agregar talla
    };
    
    if (slotType === "torso") {
      look.image = optimizeDriveUrl(newProduct.Imagen1 || newProduct.Imagen2 || "", 500);
    }
    
    renderLooks();
  } else {
    alert(`No hay más productos disponibles para esta prenda.`);
  }
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

async function loadProducts() {
  // 1. Mostrar caché inmediatamente
  const cached = getCachedProducts();
  if (cached && cached.length > 0) {
    allProducts = cached;
    await getWeather(); // Clima en paralelo
    buildLooksFromProducts();
    renderLooks();
    // Actualizar en segundo plano
    loadLooksInBackground();
    return;
  }
  
  // 2. Si no hay caché, cargar completo
  showLoader("Cargando productos...");
  
  try {
    await getWeather();
    
    const res = await fetch(API_URL);
    const data = await res.json();
    allProducts = data.products || data || [];
    
    setCachedProducts(allProducts);
    
    buildLooksFromProducts();
    renderLooks();
    addWeatherBadge();
    
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



// Construir looks - TODOS los looks disponibles, ordenados por prioridad según clima
function buildLooksFromProducts() {
  if (allProducts.length === 0) return;
  
  const productsWithImages = allProducts.filter(p => (p.Imagen1 || p.Imagen2 || p.Imagen3) && p.Stock > 0);
  
  // Construir TODOS los looks disponibles
  const allBuiltLooks = [];
  
  for (const config of LOOKS_CONFIG) {
    const selectedProducts = selectProductsForLook(config, productsWithImages);
    
    // Contar cuántos productos tiene este look
    const productCount = Object.keys(selectedProducts).length;
    
    // Solo crear el look si tiene al menos 1 producto
    if (productCount > 0) {
      // Obtener imagen principal (primer producto disponible)
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
  
  // Ordenar según prioridad del clima (mayor prioridad primero)
  if (currentWeather && currentWeather.weatherType) {
    const priorityScores = WEATHER_PRIORITY_SCORES[currentWeather.weatherType];
    
    if (priorityScores) {
      allBuiltLooks.sort((a, b) => {
        const scoreA = priorityScores[a.id] || 0;
        const scoreB = priorityScores[b.id] || 0;
        return scoreB - scoreA; // Mayor prioridad primero
      });
    }
  }
  
  looks = allBuiltLooks;
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
    
    // Orden: torso → piernas → pies (solo los que existen)
    const slotOrder = ["torso", "piernas", "pies"];
    
    const slotNames = {
      torso: " ",
      piernas: " ",
      pies: " "
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
      <button class="look-product-add" onclick="event.stopPropagation(); addSingleToCart({ID:'${product.id}', Nombre:'${escapeHtml(product.name)}', Precio:${product.price}, Imagen1:'${product.image}', Talla:'${escapeHtml(product.size || '')}'})">
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

function addLookToCart(lookId) {
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
      addToCartLocal({
        ID: product.id,      
        Nombre: product.name,
        Precio: product.price,
        Imagen1: product.image
      });
      addedCount++;
    }
  });
  
  if (addedCount > 0) {
    animateCartAdd();
  }
}


// Funciones de carrito
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

// En looks.js, modifica addSingleToCart y addToCartLocal:

function addSingleToCart(product) {
  // product ya tiene formato {ID, Nombre, Precio, Imagen1, Talla}
  addToCartLocal(product);
  animateCartAdd();
}

function addToCartLocal(product) {
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
      Talla: product.Talla || "" // <- Agregar talla
    };
  }
  localCart[id].quantity += 1;
  saveCartToStorage();
  updateCartBadge();
  renderCart();
}


function removeFromCartLocal(id) {
  if (localCart[id]) {
    delete localCart[id];
    saveCartToStorage();
    updateCartBadge();
    renderCart();
  }
}

function changeCartQtyLocal(id, delta) {
  if (!localCart[id]) return;
  localCart[id].quantity += delta;
  if (localCart[id].quantity <= 0) {
    delete localCart[id];
  }
  saveCartToStorage();
  updateCartBadge();
  renderCart();
}

function renderCart() {
  const container = document.getElementById("cart-items-container");
  if (!container) return;
  
  // Verificar si hay una solicitud pendiente o aprobada
  const pendingRequests = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('pending_purchase_')) {
      try {
        const request = JSON.parse(localStorage.getItem(key));
        if (request.status === 'approved' && request.paymentLink) {
          pendingRequests.push(request);
        }
      } catch(e) {}
    }
  }
  
  // Si hay una solicitud aprobada, mostrarla primero
  if (pendingRequests.length > 0) {
    const latestRequest = pendingRequests[pendingRequests.length - 1];
    showPaymentLinkInCart(latestRequest.paymentLink, latestRequest.id);
    return;
  }
  
  // Si no hay solicitud aprobada, mostrar el carrito normal
  container.innerHTML = "";
  const items = Object.values(Localcart);
  
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
    setTimeout(() => {
      btn.style.transform = "";
    }, 180);
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

function buildWhatsAppMessage() {
  const items = Object.values(localCart);
  if (items.length === 0) return "";
  
  let message = "Hola, quiero comprar:%0A%0A";
  items.forEach((item) => {
    message += `ID ${encodeURIComponent(item.id)} - ${item.quantity} pieza${item.quantity > 1 ? "s" : ""}%0A`;
  });
  
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  message += `%0ATotal: ${encodeURIComponent(formatCurrency(total))}`;
  return message;
}

// Agregar esta función para generar ID único
function generateRequestId() {
  return 'REQ_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
}

async function openWhatsAppCheckout() {
  const items = Object.values(Localcart);
  if (items.length === 0) {
    alert("No hay productos en el carrito");
    return;
  }
  
  // Limpiar solicitudes anteriores pendientes
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('pending_purchase_')) {
      const request = JSON.parse(localStorage.getItem(key));
      if (request.status !== 'approved') {
        localStorage.removeItem(key);
      }
    }
  }
  
  showLoader("Enviando solicitud...");
  
  const requestId = generateRequestId();
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const purchaseRequest = {
    id: requestId,
    items: items.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: item.Imagen1 || ""
    })),
    total: total,
    timestamp: Date.now(),
    status: 'pending',
    paymentLink: null
  };
  
  localStorage.setItem('pending_purchase_' + requestId, JSON.stringify(purchaseRequest));
  
  try {
    const notificationItems = items.map(item => ({
      productId: item.id,
      nombre: item.name,
      cantidad: item.quantity,
      imagen: item.Imagen1 || ""
    }));
    
    await fetch(SHEET_API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "createNotification",
        items: notificationItems,
        requestId: requestId
      })
    });
    
    // Limpiar carrito
    cart = {};
    saveCartToStorage();
    updateCartBadge();
    
    alert("✅ Solicitud enviada al administrador.\n\nEspera la confirmación. Cuando sea aprobada, el link de pago aparecerá automáticamente en tu carrito.");
    
    closeCartDrawer();
    startWaitingForConfirmation(requestId);
    
  } catch(err) {
    console.error("Error:", err);
    alert("Error al enviar la solicitud");
  } finally {
    hideLoader();
  }
}
function startWaitingForConfirmation(requestId) {
  activeRequestId = requestId;
  
  // No mostrar estado de espera si ya está aprobada
  const stored = localStorage.getItem('pending_purchase_' + requestId);
  if (stored) {
    const request = JSON.parse(stored);
    if (request.status === 'approved' && request.paymentLink) {
      showPaymentLinkInCart(request.paymentLink, requestId);
      return;
    }
  }
  
  showWaitingStatusInCart(requestId);
  
  if (pollingInterval) clearInterval(pollingInterval);
  
  pollingInterval = setInterval(async () => {
    if (!activeRequestId) {
      if (pollingInterval) clearInterval(pollingInterval);
      return;
    }
    
    try {
      const response = await fetch(`${SHEET_API_URL}?action=checkRequestStatus&requestId=${activeRequestId}`);
      const data = await response.json();
      
      console.log("Polling response:", data);
      
      if (data.ok && data.status === 'approved' && data.paymentLink) {
        clearInterval(pollingInterval);
        pollingInterval = null;
        
        const stored = localStorage.getItem('pending_purchase_' + activeRequestId);
        if (stored) {
          const request = JSON.parse(stored);
          request.status = 'approved';
          request.paymentLink = data.paymentLink;
          localStorage.setItem('pending_purchase_' + activeRequestId, JSON.stringify(request));
        }
        
        showPaymentLinkInCart(data.paymentLink, activeRequestId);
        activeRequestId = null;
      } else if (data.ok && data.status === 'rejected') {
        clearInterval(pollingInterval);
        pollingInterval = null;
        showRejectedStatus();
        activeRequestId = null;
      }
    } catch (err) {
      console.error("Error checking request status:", err);
    }
  }, 3000);
}

function showWaitingStatusInCart(requestId) {
  const container = document.getElementById("cart-items-container");
  if (!container) return;
  
  // Guardar estado actual del carrito para restaurar después
  const originalContent = container.innerHTML;
  
  container.innerHTML = `
    <div class="waiting-status" style="text-align: center; padding: 40px 20px;">
      <div class="loader-spinner" style="margin: 0 auto 16px;"></div>
      <h3>⏳ Esperando confirmación del administrador</h3>
      <p style="color: #666; font-size: 14px; margin-top: 8px;">
        Solicitud ID: <strong>${requestId}</strong><br>
        El admin verificará el stock y te dará respuesta en unos momentos.
      </p>
      <button onclick="cancelRequest('${requestId}')" class="primary-button secondary" style="margin-top: 16px;">
        Cancelar solicitud
      </button>
    </div>
  `;
}

function showPaymentLinkInCart(paymentLink, requestId) {
  const container = document.getElementById("cart-items-container");
  if (!container) return;
  
  // Guardar el link en localStorage para que persista
  const stored = localStorage.getItem('pending_purchase_' + requestId);
  if (stored) {
    const request = JSON.parse(stored);
    request.status = 'approved';
    request.paymentLink = paymentLink;
    localStorage.setItem('pending_purchase_' + requestId, JSON.stringify(request));
  }
  
  container.innerHTML = `
    <div style="text-align: center; padding: 30px 20px;">
      <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
      <h3 style="color: #22c55e;">¡Solicitud aprobada!</h3>
      <p style="color: #666; margin: 16px 0;">
        El administrador ha confirmado el stock. Tu pedido está listo para pagar.
      </p>
      <div style="background: #f0f0f8; border-radius: 12px; padding: 16px; margin: 16px 0;">
        <p style="font-size: 12px; color: #666; margin-bottom: 8px;">💰 Total a pagar:</p>
        <p style="font-size: 24px; font-weight: bold; color: #3b1f5f; margin: 8px 0;">
          ${formatCurrency(getTotalFromRequest(requestId))}
        </p>
        <p style="font-size: 12px; color: #666; margin-bottom: 8px;">🔗 Link de pago seguro:</p>
        <a href="${paymentLink}" target="_blank" 
           style="display: block; word-break: break-all; color: #009ee3; font-size: 12px; margin-bottom: 12px;">
          ${paymentLink}
        </a>
        <button onclick="window.open('${paymentLink}', '_blank')" 
                class="primary-button" style="width: 100%; background: linear-gradient(135deg, #009ee3, #00a3e8); margin-bottom: 8px;">
          💳 Pagar con Mercado Pago
        </button>
        <button onclick="navigator.clipboard.writeText('${paymentLink}')" 
                style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #ccc; background: white; cursor: pointer;">
          📋 Copiar enlace
        </button>
      </div>
      <p style="font-size: 11px; color: #999;">
        ⚠️ El enlace expira en 30 minutos. No cierres esta ventana hasta completar el pago.
      </p>
      <button onclick="closeCartDrawer()" class="text-button" style="margin-top: 12px;">
        Cerrar
      </button>
    </div>
  `;
}

// Función auxiliar para obtener el total de la solicitud
function getTotalFromRequest(requestId) {
  const stored = localStorage.getItem('pending_purchase_' + requestId);
  if (stored) {
    const request = JSON.parse(stored);
    return request.total || 0;
  }
  return 0;
}

function showRejectedStatus() {
  const container = document.getElementById("cart-items-container");
  if (!container) return;
  
  container.innerHTML = `
    <div style="text-align: center; padding: 40px 20px;">
      <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
      <h3 style="color: #ef4444;">Solicitud rechazada</h3>
      <p style="color: #666; margin: 16px 0;">
        Lo sentimos, no hay suficiente stock para completar tu compra.
      </p>
      <button onclick="location.reload()" class="primary-button">
        Volver al catálogo
      </button>
    </div>
  `;
}

function cancelRequest(requestId) {
  if (confirm("¿Cancelar esta solicitud de compra?")) {
    localStorage.removeItem('pending_purchase_' + requestId);
    renderCart(); // Restaurar carrito vacío
    alert("Solicitud cancelada");
  }
}

function removeWaitingStatus() {
  renderCart();
}

function removePendingRequest(requestId) {
  localStorage.removeItem('pending_purchase_' + requestId);
  renderCart();
}

















