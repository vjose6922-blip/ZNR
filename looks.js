const WEATHER_API_URL = API_URL;
const LOOKS_CACHE_KEY = 'zr_looks_generated_v2';
const MAX_WEATHER_RETRIES = 5;
const RETRY_DELAYS = [1000, 3000, 5000, 10000, 30000];

let weatherRetryCount = 0;
let weatherRetryTimer = null;
let weatherUpdateInterval = null;
let currentWeather = null;
let allProducts = [];
let looks = [];
let allLooks = [];
let currentLooksPage = 1;
let looksPerPage = 10;
let isGeneratingLooks = false;
let preloadedNextPage = null;
let lazyImageObserver = null;
let isPreloading = false;

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
  { id: "look_casual_dama", name: "\u{1F45F} Casual", description: "Para tu d\u00EDa a d\u00EDa", category: "Mujer",
    slots: [
      { type: "torso", categories: ["Blusas"], keywords: [], excludeKeywords: ["vestir", "formal", "gala"], required: true },
      { type: "piernas", categories: ["Pantalon para Dama"], keywords: [], excludeKeywords: ["formal", "vestir"], required: true },
      { type: "pies", categories: ["Calzado para Dama"], keywords: ["Tenis"], excludeKeywords: ["formal", "tac\u00F3n", "zapato"], required: true }
    ] },
  { id: "look_elegante_dama", name: "\u{1F457} Elegancia Femenina", description: "Para ocasiones especiales", category: "Mujer",
    slots: [
      { type: "torso", categories: ["Blusas"], keywords: ["Vestir"], excludeKeywords: ["casual", "deportivo"], required: true },
      { type: "piernas", categories: ["Pantalon para Dama"], keywords: ["Vestir"], excludeKeywords: ["short", "jeans", "mezclilla"], required: true },
      { type: "pies", categories: ["Calzado para Dama"], keywords: ["Zapatos"], excludeKeywords: ["tenis", "sandalias", "deportivo"], required: true }
    ] },
  { id: "look_verano_dama", name: "\u2600\uFE0F Verano Fresco", description: "Fresco para d\u00EDas calurosos", category: "Mujer",
    slots: [
      { type: "torso", categories: ["Blusas"], keywords: [], excludeKeywords: ["vestir", "formal", "abrigo"], required: true },
      { type: "piernas", categories: ["Short para Dama"], keywords: [], excludeKeywords: ["formal", "vestir", "pantal\u00F3n"], required: true },
      { type: "pies", categories: ["Calzado para Dama"], keywords: ["Tenis", "sandalias"], excludeKeywords: ["formal", "tac\u00F3n"], required: true }
    ] },
  { id: "look_falda_dama", name: "\u{1F338} Luce una Falda", description: "Look fresco con falda", category: "Mujer",
    slots: [
      { type: "torso", categories: ["Blusas"], keywords: [], excludeKeywords: ["deportivo", "abrigo"], required: true },
      { type: "piernas", categories: ["Faldas"], keywords: [], excludeKeywords: ["short", "pantal\u00F3n"], required: true },
      { type: "pies", categories: ["Calzado para Dama"], keywords: ["Tenis", "sandalias"], excludeKeywords: ["formal", "tac\u00F3n"], required: true }
    ] },
  { id: "look_vestido_dama", name: "\u{1F483} Vestido Elegante", description: "Perfecto para citas", category: "Mujer",
    slots: [
      { type: "torso", categories: ["Vestidos"], keywords: [], excludeKeywords: ["casual", "deportivo"], required: true },
      { type: "pies", categories: ["Calzado para Dama"], keywords: ["tacones"], excludeKeywords: ["tenis", "deportivo", "sandalias"], required: true }
    ] },
  { id: "look_confort_dama", name: "\u{1F6CB}\uFE0F Confort en Casa", description: "Comodidad en casa", category: "Mujer",
    slots: [
      { type: "torso", categories: ["Sueter para Dama"], keywords: [], excludeKeywords: ["vestir", "formal"], required: true },
      { type: "piernas", categories: ["Pantalon para Dama"], keywords: ["pants"], excludeKeywords: ["vestir", "formal"], required: true },
      { type: "pies", categories: ["Calzado para Dama"], keywords: ["Pantunflas"], excludeKeywords: ["tenis", "tac\u00F3n"], required: true }
    ] },
  { id: "look_chamarra_dama", name: "\u{1F9E5}\u{1F7E3} Abrigate", description: "Ideal para d\u00EDas frescos", category: "Mujer",
    slots: [
      { type: "torso", categories: ["Chamarra para Dama"], keywords: [], excludeKeywords: ["vestir", "formal"], required: true },
      { type: "piernas", categories: ["Pantalon para Dama"], keywords: ["pants", "pantalon"], excludeKeywords: ["vestir", "formal", "short"], required: true },
      { type: "pies", categories: ["Calzado para Dama"], keywords: ["Pantunflas"], excludeKeywords: ["tenis", "tac\u00F3n"], required: true }
    ] },
  { id: "look_casual_caballero", name: "\u{1F454} Casual ", description: "Para el d\u00EDa a d\u00EDa", category: "Hombre",
    slots: [
      { type: "torso", categories: ["Playeras"], keywords: [], excludeKeywords: ["vestir", "formal", "camisa"], required: true },
      { type: "piernas", categories: ["Pantalon para Caballero"], keywords: [], excludeKeywords: ["formal", "vestir", "short"], required: true },
      { type: "pies", categories: ["Calzado para Caballero"], keywords: ["Tenis", "Botas"], excludeKeywords: ["formal", "zapato"], required: true }
    ] },
  { id: "look_elegante_caballero", name: "\u{1F935} Elegancia Masculina", description: "Formal para ocasiones especiales", category: "Hombre",
    slots: [
      { type: "torso", categories: ["Playeras"], keywords: ["Vestir"], excludeKeywords: ["casual", "deportivo"], required: true },
      { type: "piernas", categories: ["Pantalon para Caballero"], keywords: ["Vestir"], excludeKeywords: ["short", "jeans", "mezclilla"], required: true },
      { type: "pies", categories: ["Calzado para Caballero"], keywords: ["Zapatos"], excludeKeywords: ["tenis", "deportivo", "botas"], required: true }
    ] },
  { id: "look_verano_caballero", name: "\u{1F3D6}\uFE0F Verano Hombre", description: "Fresco para el calor", category: "Hombre",
    slots: [
      { type: "torso", categories: ["Playeras"], keywords: [], excludeKeywords: ["vestir", "formal", "camisa"], required: true },
      { type: "piernas", categories: ["Short para Caballero"], keywords: [], excludeKeywords: ["formal", "vestir", "pantal\u00F3n"], required: true },
      { type: "pies", categories: ["Calzado para Caballero"], keywords: ["Tenis", "sandalias"], excludeKeywords: ["formal", "zapato"], required: true }
    ] },
  { id: "look_chamarra_caballero", name: "\u{1F9E5}\u{1F535} Abrigate", description: "Luce tu chamarra", category: "Hombre",
    slots: [
      { type: "torso", categories: ["Chamarra para Caballero"], keywords: [], excludeKeywords: ["vestir", "formal"], required: true },
      { type: "piernas", categories: ["Pantalon para Caballero"], keywords: ["pants", "pantalon"], excludeKeywords: ["vestir", "formal", "short"], required: true },
      { type: "pies", categories: ["Calzado para Caballero"], keywords: ["Tenis"], excludeKeywords: ["formal", "zapato"], required: true }
    ] },
  { id: "look_confort_caballero", name: "\u{1F6CB}\uFE0F Confort Hombre", description: "Comodidad para el hogar", category: "Hombre",
    slots: [
      { type: "torso", categories: ["Sueter para Caballero"], keywords: [], excludeKeywords: ["vestir", "formal"], required: true },
      { type: "piernas", categories: ["Pantalon para Caballero"], keywords: ["pants"], excludeKeywords: ["vestir", "formal", "short"], required: true },
      { type: "pies", categories: ["Calzado para Caballero"], keywords: ["Tenis", "pantunflas"], excludeKeywords: ["formal", "zapato"], required: true }
    ] }
];

function showSkeletonLooks() {
  const container = document.getElementById("looks-container");
  if (!container) return;
  
  const skeletonCards = [];
  const skeletonCount = Math.min(looksPerPage, 6);
  
  for (let i = 0; i < skeletonCount; i++) {
    skeletonCards.push(`
      <div class="look-card skeleton-card">
        <div class="skeleton-images-container">
          <div class="skeleton-image torso shimmer"></div>
          <div class="skeleton-image piernas shimmer"></div>
          <div class="skeleton-image pies shimmer"></div>
        </div>
        <div class="look-info">
          <div class="skeleton-category shimmer"></div>
          <div class="skeleton-title shimmer"></div>
          <div class="skeleton-text shimmer"></div>
          <div class="skeleton-products">
            <div class="skeleton-product shimmer"></div>
            <div class="skeleton-product shimmer"></div>
            <div class="skeleton-product shimmer"></div>
          </div>
          <div class="skeleton-button shimmer"></div>
        </div>
      </div>
    `);
  }
  
  container.innerHTML = skeletonCards.join('');
}

function hideSkeletonLooks() {
  const skeletons = document.querySelectorAll('.skeleton-card');
  skeletons.forEach(s => {
    s.style.opacity = '0';
    setTimeout(() => {
      if (s.parentNode) s.remove();
    }, 200);
  });
}

function initLazyLoading() {
  if ('IntersectionObserver' in window) {
    lazyImageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          const dataSrc = img.getAttribute('data-src');
          if (dataSrc) {
            const newImg = new Image();
            newImg.onload = () => {
              img.src = dataSrc;
              img.removeAttribute('data-src');
              img.classList.add('loaded');
            };
            newImg.src = dataSrc;
          }
          lazyImageObserver.unobserve(img);
        }
      });
    }, {
      rootMargin: '100px 0px',
      threshold: 0.01
    });
  }
}

function initLazyImagesAfterRender() {
  const lazyImages = document.querySelectorAll('.lazy');
  if (lazyImageObserver) {
    lazyImages.forEach(img => lazyImageObserver.observe(img));
  }
}

function compressLooksData(looks) {
  return looks.map(look => ({
    id: look.id,
    name: look.name,
    description: look.description,
    category: look.category,
    productCount: look.productCount,
    products: Object.entries(look.products).reduce((acc, [key, product]) => {
      if (product) {
        acc[key] = {
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          stock: product.stock,
          size: product.size
        };
      }
      return acc;
    }, {})
  }));
}

function decompressLooksData(compressed) {
  return compressed.map(look => ({
    ...look,
    config: LOOKS_CONFIG.find(c => c.id.toLowerCase() === look.id),
    products: look.products
  }));
}

function getCachedLooksOptimized() {
  try {
    const sessionCached = sessionStorage.getItem(LOOKS_CACHE_KEY);
    if (sessionCached) {
      const { looks: compressed, timestamp, productsHash } = JSON.parse(sessionCached);
      const currentHash = getProductsQuickHash();
      if (currentHash === productsHash && (Date.now() - timestamp) < 300000) {
        console.log("\u26A1 Looks desde sessionStorage (instant\u00E1neo)");
        return decompressLooksData(compressed);
      }
    }
    
    const localCached = localStorage.getItem(LOOKS_CACHE_KEY);
    if (localCached) {
      const { looks: compressed, timestamp, productsHash } = JSON.parse(localCached);
      const currentHash = getProductsQuickHash();
      if (currentHash === productsHash && (Date.now() - timestamp) < 600000) {
        console.log("\u{1F4E6} Looks desde localStorage");
        const decompressed = decompressLooksData(compressed);
        sessionStorage.setItem(LOOKS_CACHE_KEY, JSON.stringify({
          looks: compressed,
          productsHash,
          timestamp: Date.now()
        }));
        return decompressed;
      }
    }
    
    return null;
  } catch(e) {
    console.warn("Error cargando cach\u00E9 de looks:", e);
    return null;
  }
}

function saveLooksToCacheOptimized(looks) {
  try {
    const compressed = compressLooksData(looks);
    const productsHash = getProductsQuickHash();
    const cacheData = {
      looks: compressed,
      productsHash,
      timestamp: Date.now()
    };
    
    sessionStorage.setItem(LOOKS_CACHE_KEY, JSON.stringify(cacheData));
    localStorage.setItem(LOOKS_CACHE_KEY, JSON.stringify(cacheData));
    
    console.log(`\u{1F4BE} Looks guardados en cach\u00E9`);
  } catch(e) {
    console.warn("Error guardando cach\u00E9 de looks:", e);
  }
}

function getProductsQuickHash() {
  if (!allProducts.length) return 'empty';
  return allProducts.slice(0, 100).map(p => `${p.ID}:${p.Stock}`).join('|');
}

async function getWeather() {
  try {
    const response = await fetch(`${WEATHER_API_URL}?action=getWeather`);
    const data = await response.json();
    if (data.ok && data.weatherType) {
      currentWeather = data;
      console.log("\u{1F324}\uFE0F Clima actual:", data.weatherType, data.temperature, data.city);
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
  let weatherIcon = "\u{1F324}\uFE0F";
  let weatherText = "";
  let recommendation = "";
  switch(weather.weatherType) {
    case 'calor':
      weatherIcon = "\u2600\uFE0F\u{1F525}";
      weatherText = "\u00A1D\u00EDa caluroso!";
      recommendation = "Te recomendamos looks frescos para el calor \u2600\uFE0F";
      break;
    case 'frio':
      weatherIcon = "\u2744\uFE0F\u{1F976}";
      weatherText = "\u00A1D\u00EDa fr\u00EDo!";
      recommendation = "Te recomendamos looks abrigadores \u{1F9E5}";
      break;
    case 'lluvioso':
      weatherIcon = "\u{1F327}\uFE0F\u2614";
      weatherText = "\u00A1D\u00EDa lluvioso!";
      recommendation = "Te recomendamos looks con chamarra y calzado cerrado \u{1F9E5}\u{1F45F}";
      break;
    default:
      weatherIcon = "\u{1F324}\uFE0F";
      weatherText = "Clima templado";
      recommendation = "Looks casuales y elegantes para hoy \u2728";
  }
  const notif = document.createElement('div');
  notif.className = 'weather-notification';
  notif.innerHTML = `
    <div class="weather-notification-content">
      <div class="weather-icon">${weatherIcon}</div>
      <div class="weather-info">
        <div class="weather-text">${weatherText} ${weather.temperature ? `${weather.temperature}\u00B0C` : ''}</div>
        <div class="weather-recommendation">${recommendation}</div>
      </div>
      <button class="weather-close" onclick="this.closest('.weather-notification').remove()">\u2715</button>
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

async function generateLooksProgressive() {
  return new Promise((resolve) => {
    const startTime = performance.now();
    
    const productsWithImages = allProducts.filter(p => 
      (p.Imagen1 || p.Imagen2 || p.Imagen3) && Number(p.Stock || 0) > 0
    );
    
    const allBuiltLooks = [];
    let currentIndex = 0;
    
    function processBatch() {
      const batchSize = 3;
      const end = Math.min(currentIndex + batchSize, LOOKS_CONFIG.length);
      
      for (let i = currentIndex; i < end; i++) {
        const config = LOOKS_CONFIG[i];
        const selectedProducts = selectProductsForLook(config, productsWithImages);
        const productCount = Object.keys(selectedProducts).length;
        
        if (productCount > 0) {
          allBuiltLooks.push({
            id: config.id.toLowerCase(),
            name: config.name,
            description: config.description,
            category: config.category,
            products: selectedProducts,
            config: config,
            productCount: productCount
          });
        }
      }
      
      currentIndex = end;
      
      if (allBuiltLooks.length > 0) {
        const currentLooks = sortLooksByWeather([...allBuiltLooks]);
        allLooks = currentLooks;
        looks = [...allLooks];
        renderLooks();
        initLazyImagesAfterRender();
      }
      
      if (currentIndex < LOOKS_CONFIG.length) {
        setTimeout(processBatch, 50);
      } else {
        allLooks = sortLooksByWeather(allBuiltLooks);
        looks = [...allLooks];
        saveLooksToCacheOptimized(allLooks);
        renderLooks();
        initLazyImagesAfterRender();
        preloadAdjacentPages();
        
        const endTime = performance.now();
        console.log(`\u2705 Looks generados en ${(endTime - startTime).toFixed(0)}ms`);
        resolve();
      }
    }
    
    processBatch();
  });
}

function preloadAdjacentPages() {
  if (isPreloading) return; 
  isPreloading = true;
  
  const totalPages = Math.ceil(allLooks.length / looksPerPage);
  
  if (currentLooksPage < totalPages) {
    preloadLooksPage(currentLooksPage + 1);
  }
  
  if (currentLooksPage > 1) {
    preloadLooksPage(currentLooksPage - 1);
  }
  
  setTimeout(() => { isPreloading = false; }, 500);
}

function preloadLooksPage(pageNumber) {
  if (preloadedNextPage === pageNumber) return;
  
  const start = (pageNumber - 1) * looksPerPage;
  const end = start + looksPerPage;
  const pageLooks = allLooks.slice(start, end);
  
  if (pageLooks.length === 0) return;
  
  if (window.requestIdleCallback) {
    requestIdleCallback(() => {
      pageLooks.forEach(look => {
        Object.values(look.products).forEach(product => {
          if (product?.image) {
            const imgLink = document.createElement('link');
            imgLink.rel = 'preload';
            imgLink.as = 'image';
            imgLink.href = product.image;
            document.head.appendChild(imgLink);
          }
        });
      });
      
      preloadedNextPage = pageNumber;
      console.log(`\u{1F52E} Precargada p\u00E1gina ${pageNumber} de looks`);
    });
  } else {
    setTimeout(() => {
      pageLooks.forEach(look => {
        Object.values(look.products).forEach(product => {
          if (product?.image) {
            const img = new Image();
            img.src = product.image;
          }
        });
      });
      preloadedNextPage = pageNumber;
    }, 100);
  }
}

let isBackgroundServicesStarted = false;
let isLoadingProducts = false;

async function loadProducts() {
  if (isLoadingProducts) {
    console.log("\u23ED\uFE0F Carga de productos ya en progreso, omitiendo...");
    return;
  }
  
  isLoadingProducts = true;
  showSkeletonLooks();

  if (!navigator.onLine) {
    console.log('📡 Offline - Cargando looks desde caché');
    if (window.ConnectionMonitor?.showOfflineBanner) {
      window.ConnectionMonitor.showOfflineBanner();
    }
  }
  
  const ensureProductIndex = (products) => {
    if (!products?.length) return false;
    
    if (typeof window.buildProductIndex === "function") {
      window.buildProductIndex(products);
      return true;
    } else if (typeof buildProductIndex === "function") {
      buildProductIndex(products);
      return true;
    }
    return false;
  };

  const getCachedProductsUnified = () => {
    return window.CacheManager?.getSessionProductsCache?.() || getCachedProducts() || [];
  };

  const restoreScrollPosition = () => {
    const savedScroll = sessionStorage.getItem("looks_scroll_position");
    if (savedScroll) {
      setTimeout(() => window.scrollTo(0, parseInt(savedScroll)), 100);
      sessionStorage.removeItem("looks_scroll_position");
    }
  };

  const renderInitialLooks = () => {
    setTimeout(() => {
      renderLooks();
      initLazyImagesAfterRender();
      preloadAdjacentPages();
      hideSkeletonLooks();
    }, 50);
  };

  const startBackgroundServices = () => {
  if (isBackgroundServicesStarted) {
    console.log("⏭️ Servicios background ya iniciados previamente");
    return;
  }
  
  isBackgroundServicesStarted = true;
  console.log("🚀 Iniciando servicios en background...");
  
  // ✅ FORZAR ACTUALIZACIÓN INMEDIATA DEL CLIMA (ignorar caché)
  if (typeof fetchWeatherAndReorder === "function") {
    fetchWeatherAndReorder(true);  // ← true = forceRetry, ignora caché
  }
  
  if (typeof startWeatherMonitoring === "function") {
    startWeatherMonitoring();
  }
  
  if (navigator.onLine && !isGeneratingLooks && typeof loadFreshProductsInBackground === "function") {
    loadFreshProductsInBackground();
  }
};

  // En loadProducts(), encuentra la función initializeWeatherFromCache:

const initializeWeatherFromCache = () => {
  // Intentar cargar clima desde caché primero
  try {
    const cached = sessionStorage.getItem('zr_weather_cache');
    if (cached) {
      const { weatherType, temperature, city, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < 300000) { // 5 minutos
        currentWeather = { weatherType, temperature, city };
        console.log("🌤️ Clima cargado desde caché:", weatherType, temperature + "°C");
        return true;
      }
    }
  } catch(e) {
    console.warn("Error cargando clima desde caché:", e);
  }
  
  // ✅ NO usar valor por defecto, dejar como null para que muestre "Cargando..."
  // hasta que fetchWeatherAndReorder obtenga el clima real
  currentWeather = null;
  console.log("🌤️ Sin caché de clima - esperando API...");
  return false;
};

  // ===== INICIALIZAR CLIMA ANTES DE CUALQUIER RENDERIZADO =====
  initializeWeatherFromCache();
  updateWeatherWidget(); // Actualizar widget inmediatamente

  const cachedLooks = getCachedLooksOptimized();
  
  if (cachedLooks?.length > 0) {
    console.log("⚡⚡ LOOKS DESDE CACHÉ - INSTANTÁNEO");

    allLooks = cachedLooks;
    looks = [...allLooks];
    currentLooksPage = 1;

    const cachedProducts = getCachedProductsUnified();
    if (cachedProducts.length > 0) {
      allProducts = cachedProducts;
      ensureProductIndex(allProducts);
    }

    renderInitialLooks();
    restoreScrollPosition();
    startBackgroundServices();

    isLoadingProducts = false;
    return;
  }

  const cachedProducts = getCachedProductsUnified();
  
  if (cachedProducts.length > 0) {
    console.log("⚡ Productos desde caché, generando looks progresivamente...");

    allProducts = cachedProducts;
    ensureProductIndex(allProducts);

    await generateLooksProgressive();
    hideSkeletonLooks();
    restoreScrollPosition();
    startBackgroundServices();

    isLoadingProducts = false;
    return;
  }

  try {
    // Ya tenemos clima inicializado desde caché o por defecto
    console.log("🌐 Cargando productos desde red...");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(API_URL, { signal: controller.signal });
    clearTimeout(timeoutId);

    const data = await res.json();
    allProducts = data.products || data || [];
    setCachedProducts(allProducts);
    ensureProductIndex(allProducts);
    await generateLooksProgressive();
    hideSkeletonLooks();
    startBackgroundServices();

  } catch (err) {
    console.error("❌ Error cargando productos:", err);
    const container = document.getElementById("looks-container");
    if (container && !container.querySelector(".look-card")) {
      container.innerHTML = `
        <div class="empty-looks">
          <p>❌ Error al cargar los productos.</p>
          <p>Verifica tu conexión a internet e <a href="#" onclick="location.reload()">intenta nuevamente</a>.</p>
        </div>
      `;
    }

    hideSkeletonLooks();
  } finally {
    isLoadingProducts = false;
  }
}



function updateWeatherWidget() {
  const widget = document.getElementById('weather-widget');
  if (!widget) {
    console.log("⚠️ Widget de clima no encontrado en el DOM");
    return;
  }
  
  console.log("🌤️ Actualizando widget con:", currentWeather);
  
  // ✅ Si no hay clima o está cargando, mostrar indicador
  if (!currentWeather || !currentWeather.weatherType) {
    widget.innerHTML = `<span class="weather-icon">🌡️</span><span>Cargando...</span>`;
    widget.classList.add('loading');
    return;
  }
  
  let weatherIcon = "🌡️";
  let weatherText = "";
  
  switch(currentWeather.weatherType) {
    case 'calor':
      weatherIcon = "☀️🔥";
      weatherText = "Calor";
      break;
    case 'frio':
      weatherIcon = "❄️🥶";
      weatherText = "Frío";
      break;
    case 'lluvioso':
      weatherIcon = "🌧️☔";
      weatherText = "Lluvia";
      break;
    default:
      weatherIcon = "🌤️";
      weatherText = "Templado";
  }
  
  const temp = currentWeather.temperature ? `${Math.round(currentWeather.temperature)}°C` : '';
  
  widget.innerHTML = `
    <span class="weather-icon">${weatherIcon}</span>
    <span class="weather-temp">${weatherText} ${temp}</span>
  `;
  widget.classList.remove('loading');
  
  console.log(`✅ Widget actualizado: ${weatherText} ${temp}`);
}





async function fetchWeatherAndReorder(forceRetry = false) {
  // Verificar caché primero
  const cachedWeather = sessionStorage.getItem('zr_weather_cache');
  if (!forceRetry && cachedWeather) {
    try {
      const { weatherType, temperature, city, timestamp } = JSON.parse(cachedWeather);
      if (Date.now() - timestamp < 300000) { // 5 minutos
        console.log("🌤️ Clima desde caché:", weatherType, temperature);
        
        if (currentWeather?.weatherType !== weatherType) {
          currentWeather = { weatherType, temperature, city };
          reorderLooksDynamically();
          addWeatherNotification(currentWeather);
          updateWeatherWidget();
        } else if (!currentWeather) {
          currentWeather = { weatherType, temperature, city };
          updateWeatherWidget();
        }
        return;
      }
    } catch(e) {}
  }
  
  try {
    console.log("🌤️ Obteniendo clima actual del backend...");
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${WEATHER_API_URL}?action=getWeather`, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    const data = await response.json();
    
    if (data.ok && data.weatherType) {
      // Guardar en caché (sessionStorage)
      const cacheData = {
        weatherType: data.weatherType,
        temperature: data.temperature,
        city: data.city,
        timestamp: Date.now()
      };
      sessionStorage.setItem('zr_weather_cache', JSON.stringify(cacheData));
      
      weatherRetryCount = 0;
      if (weatherRetryTimer) clearTimeout(weatherRetryTimer);
      
      if (currentWeather?.weatherType !== data.weatherType) {
        console.log(`🌤️ Clima actualizado: ${currentWeather?.weatherType || 'ninguno'} → ${data.weatherType}`);
        currentWeather = data;
        reorderLooksDynamically();
        addWeatherNotification(data);
        updateWeatherWidget();
      } else {
        currentWeather = data;
        updateWeatherWidget();
      }
      
      return true;
    } else {
      throw new Error("Respuesta inválida del API");
    }
    
  } catch (err) {
    console.warn(`⚠️ Error obteniendo clima (intento ${weatherRetryCount + 1}/${MAX_WEATHER_RETRIES}):`, err.message);
    
    if (weatherRetryCount < MAX_WEATHER_RETRIES) {
      const delay = RETRY_DELAYS[weatherRetryCount] || 30000;
      console.log(`🔄 Reintentando clima en ${delay/1000} segundos...`);
      
      if (weatherRetryTimer) clearTimeout(weatherRetryTimer);
      weatherRetryTimer = setTimeout(() => {
        weatherRetryCount++;
        fetchWeatherAndReorder(true);
      }, delay);
    } else {
      console.log("❌ Máximos reintentos alcanzados para el clima. Usando orden por defecto.");
      weatherRetryCount = 0;
      
      // Intentar usar caché aunque esté expirada como fallback
      const expiredCache = sessionStorage.getItem('zr_weather_cache');
      if (expiredCache && !currentWeather) {
        try {
          const { weatherType, temperature, city } = JSON.parse(expiredCache);
          currentWeather = { weatherType, temperature, city };
          updateWeatherWidget();
          console.log("⚠️ Usando caché expirada como fallback");
        } catch(e) {}
      }
      
      if (!currentWeather) {
        currentWeather = { weatherType: 'templado', temperature: 22, city: 'Default' };
        updateWeatherWidget();
      }
      
      showTemporaryMessage("No se pudo obtener el clima. Mostrando orden estándar.", "info");
    }
    
    return false;
  }
}



function resetBackgroundServices() {
  isBackgroundServicesStarted = false;
  weatherRetryCount = 0;
  if (typeof stopWeatherMonitoring === "function") {
    stopWeatherMonitoring();
  }
  console.log("\u{1F504} Servicios background reiniciados");
}

window.resetBackgroundServices = resetBackgroundServices;




function startWeatherMonitoring() {
  if (weatherUpdateInterval) clearInterval(weatherUpdateInterval);
  
  // Actualización periódica cada 10 minutos (en lugar de 12)
  weatherUpdateInterval = setInterval(() => {
    console.log("🔄 Actualización periódica del clima...");
    fetchWeatherAndReorder(true);
  }, 600000); // 10 minutos
  
  window.addEventListener('online', () => {
    console.log("🟢 Conexión recuperada - actualizando clima...");
    fetchWeatherAndReorder(true);
  });
}

function stopWeatherMonitoring() {
  if (weatherUpdateInterval) {
    clearInterval(weatherUpdateInterval);
    weatherUpdateInterval = null;
  }
  if (weatherRetryTimer) {
    clearTimeout(weatherRetryTimer);
    weatherRetryTimer = null;
  }
}

function reorderLooksDynamically() {
  if (!allLooks.length) return;
  
  const newOrder = sortLooksByWeather([...allLooks]);
  
  const currentIds = looks.map(l => l.id).join(',');
  const newIds = newOrder.map(l => l.id).join(',');
  
  if (currentIds !== newIds && newOrder.length > 0) {
    looks = newOrder;
    allLooks = [...looks];
    
    const container = document.getElementById("looks-container");
    if (container && container.children.length > 0) {
      const currentPageLooks = looks.slice(
        (currentLooksPage - 1) * looksPerPage,
        currentLooksPage * looksPerPage
      );
      
      const cards = container.querySelectorAll('.look-card:not(.skeleton-card)');
      if (cards.length === currentPageLooks.length) {
        cards.forEach((card, index) => {
          if (currentPageLooks[index]) {
            card.style.transition = 'all 0.3s ease';
            card.style.opacity = '0';
            setTimeout(() => {
              const newCard = createLookCardWithLazy(currentPageLooks[index]);
              card.replaceWith(newCard);
              newCard.style.opacity = '0';
              newCard.style.transform = 'translateY(10px)';
              setTimeout(() => {
                newCard.style.opacity = '1';
                newCard.style.transform = '';
              }, 50);
              if (lazyImageObserver) {
                newCard.querySelectorAll('img.lazy').forEach(img => lazyImageObserver.observe(img));
              }
            }, 150);
          }
        });
      } else {
        renderLooks();
      }
    }
    
    saveLooksToCacheOptimized(allLooks);
  }
}

async function loadFreshProductsInBackground() {
  if (isGeneratingLooks) return;
  isGeneratingLooks = true;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); 
    
    const res = await fetch(API_URL, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    const data = await res.json();
    const freshProducts = data.products || data || [];
    
    if (JSON.stringify(freshProducts) !== JSON.stringify(allProducts)) {
      allProducts = freshProducts;
      setCachedProducts(allProducts);
      await generateLooksProgressive();
    }
  } catch (err) {
    console.log("Background update fall\u00F3 (timeout esperado):", err.message);
  } finally {
    isGeneratingLooks = false;
  }
}

function renderLooks() {
  const container = document.getElementById("looks-container");
  if (!container) return;
  
  if (allLooks.length === 0) {
    if (!container.querySelector('.skeleton-card')) {
      container.innerHTML = `<div class="empty-looks"><p>\u2728 No disponibles en este momento.</p><p>Visita el <a href="index.html" style="color:#ff4f81;">cat\u00E1logo</a> para ver nuestros productos.</p></div>`;
    }
    renderLooksPagination();
    return;
  }
  
  const totalPages = Math.ceil(allLooks.length / looksPerPage);
  const start = (currentLooksPage - 1) * looksPerPage;
  const end = start + looksPerPage;
  const looksToRender = allLooks.slice(start, end);
  
  const fragment = document.createDocumentFragment();
  
  looksToRender.forEach(look => {
    const card = createLookCardWithLazy(look);
    fragment.appendChild(card);
  });
  
  const existingCards = container.querySelectorAll('.look-card:not(.skeleton-card)');
  existingCards.forEach(card => card.remove());
  
  container.appendChild(fragment);
  
  renderLooksPagination(totalPages);
  preloadAdjacentPages();
}

function createLookCardWithLazy(look) {
  let totalPrice = 0;
  let productsHtml = '';
  let productCount = 0;
  let imagesHtml = '';

  const slotOrder = ["torso", "piernas", "pies"];
  const slotNames = { torso: '👕 Superior', piernas: '👖 Inferior', pies: '👟 Calzado' };

  const safeLookName = escapeHtml(look.name || "Look");
  const safeLookDescription = escapeHtml(look.description || "");
  const safeLookCategory = escapeHtml(look.category || "");

  const wishlistActive = isLookInWishlist(look.id);
  const wishlistHtml = `<button class="look-wishlist-btn ${wishlistActive ? 'active' : ''}" data-look-id="${escapeJsString(look.id)}" onclick="toggleLookWishlist('${escapeJsString(look.id)}', event)">${wishlistActive ? '❤️' : '🤍'}</button>`;

  for (const slotKey of slotOrder) {
    const product = look.products[slotKey];
    if (!product) continue;

    productCount++;
    totalPrice += product.price;

    const optimizedImg = optimizeDriveUrl(product.image, 200);
    const optimizedModalImg = optimizeDriveUrl(product.image, 800);
    const slotName = slotNames[slotKey] || slotKey;

    imagesHtml += `
      <div class="look-slot-image" data-slot="${escapeHtml(slotKey)}"
           onclick="openImageModal('${escapeJsString(optimizedModalImg)}')">
        <img class="look-slot-img lazy"
             data-src="${escapeHtml(optimizedImg)}"
             src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E"
             alt="${escapeHtml(product.name)}"
             loading="lazy">
      </div>
    `;

    productsHtml += `
      <div class="look-product-item" data-slot="${escapeHtml(slotKey)}">
        <div class="look-product-info">
          <div class="look-product-name">${escapeHtml(product.name)}</div>
          <div class="look-product-price">${formatCurrency(product.price)}</div>
          <div class="look-product-size">${escapeHtml(product.size || 'Talla no especificada')}</div>
        </div>
        <div class="look-product-actions">
          <button class="look-product-add"
            onclick="addToCart({
              ID:'${escapeJsString(String(product.id))}',
              Nombre:'${escapeJsString(product.name)}',
              Precio:${product.price},
              Imagen1:'${escapeJsString(product.image)}',
              Talla:'${escapeJsString(product.size || '')}'
            })">🛒</button>
          <button class="look-product-reload"
            onclick="reloadSlot('${escapeJsString(look.id)}', '${escapeJsString(slotKey)}', event)"
            title="Cambiar esta prenda">⟳</button>
        </div>
      </div>
    `;
  }

  const card = document.createElement("div");
  card.className = "look-card";

  card.innerHTML = `
    <div class="look-images-container">
      ${imagesHtml || '<div class="look-slot-image empty">Sin imágenes</div>'}
    </div>

    <div class="look-info">
      <div class="look-header">
        <span class="look-category">${safeLookCategory}</span>
        <span class="look-item-count">${productCount} prenda${productCount !== 1 ? 's' : ''}</span>
        ${wishlistHtml}
      </div>

      <h2 class="look-title">${safeLookName}</h2>
      <p class="look-description">${safeLookDescription}</p>

      <div class="look-products">
        <div class="look-products-title"><span>✨ Este outfit incluye:</span></div>
        <div class="look-products-list">${productsHtml}</div>

        <div class="look-total">
          <span class="look-total-label">💵 Precio total:</span>
          <span class="look-total-price">${formatCurrency(totalPrice)}</span>
        </div>
      </div>

      <button class="buy-look-btn"
        onclick="addLookToCart('${escapeJsString(look.id)}')">🛒 Comprar todo</button>
    </div>
  `;

  return card;
}





function updateLookWishlistButtons(lookId, isActive) {
  document.querySelectorAll(`.look-wishlist-btn[data-look-id="${lookId}"]`).forEach(btn => {
    btn.classList.toggle('active', isActive);
    btn.textContent = isActive ? '❤️' : '🤍';
  });
}

function createLookCardMini(look) {
  const div = document.createElement('div');
  div.className = 'cart-item';
  
  let totalPrice = 0;
  let productsList = '';
  
  // Crear miniaturas de los productos para el wishlist
  for (const slot of ['torso', 'piernas', 'pies']) {
    const product = look.products[slot];
    if (product) {
      totalPrice += product.price;
      const productImg = optimizeDriveUrl(product.image, 60);
      productsList += `
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding: 4px 0; border-bottom: 1px solid #f0f0f0;">
          <img src="${escapeHtml(productImg)}" alt="${escapeHtml(product.name)}" 
               style="width: 40px; height: 40px; object-fit: contain; background: #f5f5f8; border-radius: 8px;">
          <div style="flex: 1;">
            <div style="font-size: 12px; font-weight: 500;">${escapeHtml(product.name)}</div>
            <div style="font-size: 11px; color: #ff4f81;">${formatCurrency(product.price)}</div>
            <div style="font-size: 10px; color: #888;">${escapeHtml(product.size || 'Talla no especificada')}</div>
          </div>
        </div>
      `;
    }
  }
  
  div.innerHTML = `
    <div class="cart-item-info" style="flex:1">
      <div class="cart-item-title" style="font-size: 16px; margin-bottom: 8px;">✨ ${escapeHtml(look.name)}</div>
      <div style="margin-bottom: 8px; max-height: 200px; overflow-y: auto;">
        ${productsList}
      </div>
      <div class="cart-item-meta" style="font-weight:bold; color:#ff4f81; margin: 8px 0;">
        Total: ${formatCurrency(totalPrice)}
      </div>
      <div class="cart-item-actions" style="margin-top: 8px; display: flex; gap: 8px;">
        <button class="add-look-to-cart" data-look-id="${look.id}" style="background:#e8e8ff; border:none; padding: 6px 12px; border-radius: 20px; cursor: pointer; font-size: 12px;">🛒 Agregar todo</button>
        <button class="remove-look-from-wishlist" data-look-id="${look.id}" style="background:#ffe8e8; border:none; padding: 6px 12px; border-radius: 20px; cursor: pointer; font-size: 12px;">🗑 Eliminar</button>
      </div>
    </div>
  `;
  
  // Botón "Agregar todo" - CORREGIDO
  div.querySelector('.add-look-to-cart')?.addEventListener('click', (e) => {
    e.stopPropagation();
    addLookToCart(look.id);
    showTemporaryMessage(`✅ ${look.name} agregado al carrito`, 'success');
  });
  
  // Botón "Eliminar" - CORREGIDO con actualización de badge
  div.querySelector('.remove-look-from-wishlist')?.addEventListener('click', (e) => {
    e.stopPropagation();
    let wishlist = JSON.parse(localStorage.getItem('zr_looks_wishlist') || '[]');
    wishlist = wishlist.filter(id => id !== look.id);
    localStorage.setItem('zr_looks_wishlist', JSON.stringify(wishlist));
    updateLookWishlistButtons(look.id, false);
    renderWishlistLooks();
    
    // ✅ Actualizar badge del wishlist flotante
    const badge = document.getElementById("wishlist-count-looks");
    if (badge) badge.textContent = wishlist.length;
    
    showTemporaryMessage('💔 Look eliminado de favoritos', 'info');
  });
  
  return div;
}



function isLookInWishlist(lookId) {
  const wishlist = JSON.parse(localStorage.getItem('zr_looks_wishlist') || '[]');
  return wishlist.includes(lookId);
}

function toggleLookWishlist(lookId, event) {
  if (event) event.stopPropagation();
  let wishlist = JSON.parse(localStorage.getItem('zr_looks_wishlist') || '[]');
  const idx = wishlist.indexOf(lookId);
  if (idx >= 0) {
    wishlist.splice(idx, 1);
    showTemporaryMessage('💔 Look eliminado de favoritos', 'info');
  } else {
    wishlist.push(lookId);
    showTemporaryMessage('❤️ Look agregado a favoritos', 'success');
  }
  localStorage.setItem('zr_looks_wishlist', JSON.stringify(wishlist));
  updateLookWishlistButtons(lookId, idx === -1);
  renderWishlistLooks();
  
  // ✅ Actualizar badge del wishlist flotante
  const badge = document.getElementById("wishlist-count-looks");
  if (badge) badge.textContent = wishlist.length;
}


function renderWishlistLooks() {
  const container = document.getElementById("wishlist-looks-container");
  if (!container) return;
  const wishlistIds = JSON.parse(localStorage.getItem('zr_looks_wishlist') || '[]');
  const wishlistLooks = allLooks.filter(look => wishlistIds.includes(look.id));
  
  if (wishlistLooks.length === 0) {
    container.innerHTML = '<div class="cart-empty-state"><div class="cart-empty-icon">❤️</div><p class="helper-text">No hay looks guardados</p><p class="cart-empty-hint">❤️ Agrega looks que te gusten</p></div>';
  } else {
    container.innerHTML = '';
    wishlistLooks.forEach(look => {
      const card = createLookCardMini(look);
      container.appendChild(card);
    });
  }
  
  // ✅ Actualizar badge del wishlist flotante
  const badge = document.getElementById("wishlist-count-looks");
  if (badge) badge.textContent = wishlistIds.length;
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
   
  let startPage = Math.max(1, currentLooksPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);
  if (endPage - startPage < 4 && startPage > 1) startPage = Math.max(1, endPage - 4);
  
  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = createPaginationButton(i.toString(), () => {
      currentLooksPage = i;
      renderLooks();
      initLazyImagesAfterRender();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    if (i === currentLooksPage) pageBtn.classList.add("active-page");
    paginationDiv.appendChild(pageBtn);
  }
  
  if (currentLooksPage < totalPages) {
    const nextBtn = createPaginationButton("Siguiente \u2192", () => {
      currentLooksPage++;
      renderLooks();
      initLazyImagesAfterRender();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    paginationDiv.appendChild(nextBtn);
  }
  
  container.parentNode.insertBefore(paginationDiv, container.nextSibling);
}

function createPaginationButton(text, onClick) {
  const btn = document.createElement("button");
  btn.textContent = text;
  btn.onclick = onClick;
  
  if (text === "Siguiente \u2192" && currentLooksPage < Math.ceil(allLooks.length / looksPerPage)) {
    btn.addEventListener('mouseenter', () => {
      preloadLooksPage(currentLooksPage + 1);
    });
  } else if (text === "\u2190 Anterior" && currentLooksPage > 1) {
    btn.addEventListener('mouseenter', () => {
      preloadLooksPage(currentLooksPage - 1);
    });
  }
  
  return btn;
}

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
  
  const productsWithImages = allProducts.filter(p => 
    (p.Imagen1 || p.Imagen2 || p.Imagen3) && p.Stock > 0 && p.Stock !== "0"
  );
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
  
  const oldPrice = look.products[slotType]?.price || 0;
  const priceDifference = updatedProduct.price - oldPrice;
  
  look.products[slotType] = updatedProduct;
  
  looks[lookIndex] = { ...look };
  allLooks = [...looks];
  saveLooksToCacheOptimized(allLooks);
  updateSingleLookInDOM(look, lookIndex, slotType, updatedProduct, priceDifference);
};

function updateSingleLookInDOM(look, lookIndex, changedSlotType, newProduct, priceDifference) {
  const lookCards = document.querySelectorAll('.look-card');
  let targetCard = null;
  
  for (const card of lookCards) {
    const titleEl = card.querySelector('.look-title');
    if (titleEl && titleEl.textContent === look.name) {
      targetCard = card;
      break;
    }
  }
  
  if (!targetCard) {
    renderLooks();
    return;
  }
  
  const slotImageContainer = targetCard.querySelector(`.look-slot-image[data-slot="${changedSlotType}"]`);
  if (slotImageContainer) {
    const slotImg = slotImageContainer.querySelector('.look-slot-img');
    const newImageUrl = optimizeDriveUrl(newProduct.image, 150);
    if (slotImg) {
      slotImg.style.opacity = '0.5';
      const newImg = new Image();
      newImg.onload = () => {
        slotImg.src = newImageUrl;
        slotImg.style.opacity = '1';
        slotImg.classList.add('loaded');
      };
      newImg.src = newImageUrl;
      slotImg.setAttribute('data-src', newImageUrl);
    }
    slotImageContainer.setAttribute('onclick', `openImageModal('${optimizeDriveUrl(newProduct.image, 800)}')`);
  }
  
  const productItems = targetCard.querySelectorAll('.look-product-item');
  let targetProductItem = null;
  const slotOrder = ["torso", "piernas", "pies"];
  const slotIndex = slotOrder.indexOf(changedSlotType);
  
  if (productItems[slotIndex]) {
    targetProductItem = productItems[slotIndex];
  } else {
    for (const item of productItems) {
      if (item.getAttribute('data-slot') === changedSlotType) {
        targetProductItem = item;
        break;
      }
    }
  }
  
  if (!targetProductItem) {
    renderLooks();
    return;
  }
  
  const totalPriceEl = targetCard.querySelector('.look-total-price');
  let oldTotalPrice = 0;
  if (totalPriceEl) {
    oldTotalPrice = parseFloat(totalPriceEl.textContent.replace(/[^0-9.-]/g, '')) || 0;
  }
  
  const productImg = targetProductItem.querySelector('.look-product-img');
  const newImageUrl = optimizeDriveUrl(newProduct.image, 150);
  if (productImg) {
    productImg.style.opacity = '0.5';
    const newImg = new Image();
    newImg.onload = () => {
      productImg.src = newImageUrl;
      productImg.style.opacity = '1';
      productImg.classList.add('loaded');
    };
    newImg.src = newImageUrl;
    productImg.setAttribute('data-src', newImageUrl);
  }
  
  const productNameEl = targetProductItem.querySelector('.look-product-name');
  if (productNameEl) productNameEl.textContent = escapeHtml(newProduct.name);
  
  const productPriceEl = targetProductItem.querySelector('.look-product-price');
  if (productPriceEl) {
    productPriceEl.textContent = formatCurrency(newProduct.price);
    productPriceEl.classList.add('price-changed');
    setTimeout(() => productPriceEl.classList.remove('price-changed'), 300);
  }
  
  const productSizeEl = targetProductItem.querySelector('.look-product-size');
  if (productSizeEl) productSizeEl.textContent = escapeHtml(newProduct.size || 'Talla no especificada');
  
  const addBtn = targetProductItem.querySelector('.look-product-add');
  if (addBtn) {
    const newOnClick = `addToCart({ID:'${newProduct.id}', Nombre:'${escapeHtml(newProduct.name)}', Precio:${newProduct.price}, Imagen1:'${newProduct.image}', Talla:'${escapeHtml(newProduct.size || '')}'})`;
    addBtn.setAttribute('onclick', newOnClick);
  }
  
  if (totalPriceEl) {
    const newTotalPrice = oldTotalPrice + priceDifference;
    totalPriceEl.textContent = formatCurrency(newTotalPrice);
    totalPriceEl.classList.add('price-changed');
    setTimeout(() => totalPriceEl.classList.remove('price-changed'), 300);
  }
  
  const buyBtn = targetCard.querySelector('.buy-look-btn');
  if (buyBtn) buyBtn.setAttribute('onclick', `addLookToCart('${look.id}')`);
}

window.addLookToCart = function(lookId) {
  const look = looks.find(l => l.id.toLowerCase() === lookId.toLowerCase());
  if (!look) return;
  const products = Object.values(look.products).filter(p => p !== null);
  if (products.length === 0) { 
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
    }
  });
  
  let lookWishlist = JSON.parse(localStorage.getItem('zr_looks_wishlist') || '[]');
  const wasInWishlist = lookWishlist.includes(lookId);
  if (wasInWishlist) {
    lookWishlist = lookWishlist.filter(id => id !== lookId);
    localStorage.setItem('zr_looks_wishlist', JSON.stringify(lookWishlist));
    updateLookWishlistButtons(lookId, false);
    if (typeof renderWishlistLooks === 'function') renderWishlistLooks();
  } else {
  }
  
  animateCartAdd();
};
function initLooksLayoutToggle() {
  const looksContainer = document.getElementById("looks-container");
  const toggleBtn = document.getElementById("layout-toggle-looks");
  if (!looksContainer || !toggleBtn) return;
  const savedLayout = localStorage.getItem("looks_layout");
  if (savedLayout === "grid") {
    looksContainer.classList.add("layout-grid");
    toggleBtn.textContent = "\u25A6";
  } else {
    toggleBtn.textContent = "\u2261";
  }
  toggleBtn.addEventListener("click", () => {
    looksContainer.classList.toggle("layout-grid");
    const isGrid = looksContainer.classList.contains("layout-grid");
    localStorage.setItem("looks_layout", isGrid ? "grid" : "list");
    toggleBtn.textContent = isGrid ? "\u25A6" : "\u2261";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initLazyLoading();
  loadProducts();
  
  const refreshBtn = document.getElementById("refresh-looks");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      localStorage.removeItem(LOOKS_CACHE_KEY);
      sessionStorage.removeItem(LOOKS_CACHE_KEY);
      loadProducts();
    });
  }
  
  initLooksLayoutToggle();
  window.addEventListener('cartUpdated', () => updateCartBadge());
  
  const requestBtn = document.getElementById("request-purchase-btn");
  if (requestBtn) requestBtn.addEventListener("click", openWhatsAppCheckout);
});


