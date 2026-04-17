const WEATHER_API_URL = API_URL;
const LOOKS_CACHE_KEY = 'zr_looks_generated_v2';
const MAX_WEATHER_ATTEMPTS = 2;

let cartRenderTimeout = null;
let isLoadingProducts = false;
let isGenerating = false;
let pendingRender = false;
let currentWeather = null;
let allProducts = [];
let looks = [];
let allLooks = [];
let currentLooksPage = 1;
let looksPerPage = 10;
let isGeneratingLooks = false;
let preloadedNextPage = null;
let lazyImageObserver = null;
let weatherData = null;
let weatherLoadStarted = false;
let weatherLoadPromise = null;
let weatherLoadAttempts = 0;
let preloadedPages = new Set();
let precomputedOrders = {
  calor: null,
  frio: null,
  templado: null,
  lluvioso: null
};
let isReordering = false;

if (typeof getGenderFromCategory === 'undefined') {
  console.warn("⚠️ getGenderFromCategory no está disponible, usando fallback");
  window.getGenderFromCategory = function(categoria) {
    if (!categoria) return null;
    const cat = categoria.toLowerCase();
    if (cat.includes('hombre') || cat.includes('caballero')) return 'HOMBRE';
    if (cat.includes('mujer') || cat.includes('dama')) return 'MUJER';
    return null;
  };
}



function precomputeAllOrders(looksArray) {
  const startTime = performance.now();
  
  for (const weather of ['calor', 'frio', 'templado', 'lluvioso']) {
    precomputedOrders[weather] = [...looksArray].sort((a, b) => 
      (WEATHER_PRIORITY_SCORES[weather]?.[b.id?.toLowerCase()] || 0) - 
      (WEATHER_PRIORITY_SCORES[weather]?.[a.id?.toLowerCase()] || 0)
    );
  }
  
  console.log(`📊 Órdenes de clima precalculadas en ${(performance.now() - startTime).toFixed(0)}ms`);
}

function applyWeatherOrderInstant(weatherType) {
  if (isReordering) return false;
  
  const newOrder = precomputedOrders[weatherType];
  if (!newOrder || newOrder.length === 0) return false;
  
  const currentIds = allLooks.map(l => l.id).join(',');
  const newIds = newOrder.map(l => l.id).join(',');
  if (currentIds === newIds) return false;
  
  console.log(`🌤️ Reordenando looks para clima: ${weatherType}`);
  isReordering = true;
  
  animateLooksReordering(newOrder).then(() => {
    allLooks = newOrder;
    looks = [...allLooks];
    currentLooksPage = 1;
    renderLooks();
    isReordering = false;
  });
  
  return true;
}

async function animateLooksReordering(newLooks) {
  const container = document.getElementById("looks-container");
  if (!container) return Promise.resolve();
  
  const cards = container.querySelectorAll('.look-card:not(.skeleton-card)');
  if (cards.length === 0) return Promise.resolve();
  
  cards.forEach(card => {
    card.style.transition = 'opacity 0.15s ease';
    card.style.opacity = '0';
  });
  
  await new Promise(resolve => setTimeout(resolve, 150));
  
  allLooks = newLooks;
  currentLooksPage = 1;
  renderLooks();
  
  setTimeout(() => {
    forceLazyImagesLoad();
    if (lazyImageObserver) {
      const lazyImages = document.querySelectorAll('.lazy');
      lazyImages.forEach(img => {
        if (img.getAttribute('data-src') && !img.src) {
          lazyImageObserver.observe(img);
        }
      });
    }
  }, 100);
  
  requestAnimationFrame(() => {
    const newCards = container.querySelectorAll('.look-card');
    newCards.forEach(card => {
      card.style.opacity = '0';
      card.style.transition = 'opacity 0.3s ease';
      requestAnimationFrame(() => {
        card.style.opacity = '1';
      });
    });
  });
  
  return Promise.resolve();
}

function forceLazyImagesLoad() {
  const lazyImages = document.querySelectorAll('.lazy:not(.loaded)');
  console.log(`🖼️ Forzando carga de ${lazyImages.length} imágenes lazy`);
  
  lazyImages.forEach(img => {
    const dataSrc = img.getAttribute('data-src');
    if (dataSrc && !img.src) {
      const tempImg = new Image();
      tempImg.onload = () => {
        img.src = dataSrc;
        img.classList.add('loaded');
        img.removeAttribute('data-src');
      };
      tempImg.onerror = () => {
        const optimizedUrl = optimizeDriveUrl(dataSrc, 200);
        if (optimizedUrl !== dataSrc) {
          const tempImg2 = new Image();
          tempImg2.onload = () => {
            img.src = optimizedUrl;
            img.classList.add('loaded');
            img.removeAttribute('data-src');
          };
          tempImg2.src = optimizedUrl;
        }
      };
      tempImg.src = dataSrc;
    }
  });
}
// Cargar clima sin bloquear
async function loadWeatherNonBlocking() {
  if (weatherLoadStarted) return weatherLoadPromise;
  weatherLoadStarted = true;
  
  weatherLoadPromise = (async () => {
    try {
      // Timeout de 2 segundos
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch(`${WEATHER_API_URL}?action=getWeather`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const data = await response.json();
      
      if (data.ok && data.weatherType) {
        weatherData = data;
        console.log("🌤️ Clima obtenido:", data.weatherType, data.temperature);
        
        // Reordenar looks instantáneamente
        if (precomputedOrders[data.weatherType]) {
          setTimeout(() => {
            applyWeatherOrderInstant(data.weatherType);
          }, 100);
        }
        
        addWeatherNotification(data);
        return data;
      }
    } catch (err) {
      console.log("⏱️ Clima timeout o error, usando default");
    }
    
    weatherData = { weatherType: 'templado', temperature: 22, city: 'Default' };
    return weatherData;
  })();
  
  return weatherLoadPromise;
}

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
  { id: "look_casual_caballero", name: "👔 Casual ", description: "Para el día a día", category: "Hombre",
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
    // Desconectar observer existente para reiniciar
    lazyImageObserver.disconnect();
    lazyImageObserver = null;
  }
  
  // Crear nuevo observer
  if ('IntersectionObserver' in window) {
    lazyImageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          const dataSrc = img.getAttribute('data-src');
          if (dataSrc) {
            img.src = dataSrc;
            img.classList.add('loaded');
            img.removeAttribute('data-src');
          }
          lazyImageObserver.unobserve(img);
        }
      });
    }, {
      rootMargin: '100px 0px',
      threshold: 0.01
    });
    
    lazyImages.forEach(img => {
      lazyImageObserver.observe(img);
    });
  } else {
    // Fallback: cargar todas las imágenes
    lazyImages.forEach(img => {
      const dataSrc = img.getAttribute('data-src');
      if (dataSrc) {
        img.src = dataSrc;
        img.classList.add('loaded');
        img.removeAttribute('data-src');
      }
    });
  }
  
  // También forzar carga de imágenes visibles inmediatamente
  setTimeout(() => forceVisibleLazyImages(), 50);
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
        console.log("⚡ Looks desde sessionStorage (instantáneo)");
        return decompressLooksData(compressed);
      }
    }
    
    const localCached = localStorage.getItem(LOOKS_CACHE_KEY);
    if (localCached) {
      const { looks: compressed, timestamp, productsHash } = JSON.parse(localCached);
      const currentHash = getProductsQuickHash();
      if (currentHash === productsHash && (Date.now() - timestamp) < 600000) {
        console.log("📦 Looks desde localStorage");
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
    console.warn("Error cargando caché de looks:", e);
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
    
    console.log(`💾 Looks guardados en caché`);
  } catch(e) {
    console.warn("Error guardando caché de looks:", e);
  }
}

function getProductsQuickHash() {
  if (!allProducts.length) return 'empty';
  return allProducts.slice(0, 100).map(p => `${p.ID}:${p.Stock}`).join('|');
}

async function getWeather() {
  if (weatherLoadPromise) {
    console.log("🌤️ Esperando carga de clima existente...");
    return weatherLoadPromise;
  }
  
  weatherLoadAttempts++;
  
  weatherLoadPromise = (async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);
    
    try {
      console.log(`🌤️ Intentando obtener clima (intento ${weatherLoadAttempts})...`);
      const response = await fetch(`${WEATHER_API_URL}?action=getWeather`, {
        signal: controller.signal,
        cache: 'no-cache'
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      
      if (data.ok && data.weatherType) {
        console.log(`🌤️ Clima obtenido: ${data.weatherType} ${data.temperature}°C ${data.city || ''}`);
        currentWeather = data;
        return data;
      }
      throw new Error("Respuesta inválida");
    } catch (err) {
      console.log(`⏱️ Clima ${err.name === 'AbortError' ? 'timeout' : 'error'}, usando default`);
      
      if (weatherLoadAttempts === 1 && MAX_WEATHER_ATTEMPTS > 1) {
        console.log("🔄 Reintentando clima en 1 segundo...");
        await new Promise(resolve => setTimeout(resolve, 1000));
        weatherLoadPromise = null;
        return getWeather();
      }
      
      currentWeather = { weatherType: 'templado', temperature: 22, city: 'Default' };
      return currentWeather;
    } finally {
      setTimeout(() => {
        if (weatherLoadPromise === weatherLoadPromise) {
          weatherLoadPromise = null;
        }
      }, 1000);
    }
  })();
  
  return weatherLoadPromise;
}


function fetchWeatherInBackground() {
  if (weatherLoadPromise) return weatherLoadPromise;
  return getWeather().catch(() => null);
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
  if (isGenerating) {
    console.log("⏳ Ya generando looks, esperando...");
    pendingRender = true;
    return;
  }
  
  isGenerating = true;
  
  return new Promise((resolve) => {
    const startTime = performance.now();
    
    const productsWithImages = allProducts.filter(p => 
      (p.Imagen1 || p.Imagen2 || p.Imagen3) && Number(p.Stock || 0) > 0
    );
    
    const allBuiltLooks = [];
    let currentIndex = 0;
    let firstRenderDone = false;
    
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
      
      if (!firstRenderDone && allBuiltLooks.length > 0) {
        const neutralOrder = [...allBuiltLooks].sort((a, b) => a.id.localeCompare(b.id));
        allLooks = neutralOrder;
        looks = [...allLooks];
        renderLooks();
        initLazyImagesAfterRender();
        firstRenderDone = true;
      }
      
      if (currentIndex < LOOKS_CONFIG.length) {
        setTimeout(processBatch, 30);
      } else {
        if (currentWeather && currentWeather.weatherType) {
          allLooks = sortLooksByWeather(allBuiltLooks);
        } else {
          allLooks = [...allBuiltLooks].sort((a, b) => a.id.localeCompare(b.id));
        }
        
        looks = [...allLooks];
        precomputeAllOrders(allLooks);
        saveLooksToCacheOptimized(allLooks);
        
        if (JSON.stringify(allLooks) !== JSON.stringify(looks)) {
          renderLooks();
          initLazyImagesAfterRender();
        }
        
        preloadAdjacentPages();
        
        const endTime = performance.now();
        console.log(`✅ Looks generados en ${(endTime - startTime).toFixed(0)}ms`);
        
        isGenerating = false;
        if (pendingRender) {
          pendingRender = false;
          renderLooks();
        }
        resolve();
      }
    }
    
    processBatch();
  });
}

function preloadAdjacentPages() {
  const totalPages = Math.ceil(allLooks.length / looksPerPage);
  clearPreloadCache();
  
  if (currentLooksPage < totalPages) {
    preloadLooksPage(currentLooksPage + 1);
  }
}

function preloadLooksPage(pageNumber) {
  if (preloadedPages.has(pageNumber)) return;
  if (preloadedNextPage === pageNumber) return;
  
  const start = (pageNumber - 1) * looksPerPage;
  const end = start + looksPerPage;
  const pageLooks = allLooks.slice(start, end);
  
  if (pageLooks.length === 0) return;
  
  preloadedPages.add(pageNumber);
  preloadedNextPage = pageNumber;
  
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
      console.log(`🔮 Precargada página ${pageNumber} de looks`);
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
      console.log(`🔮 Precargada página ${pageNumber} de looks`);
    }, 100);
  }
}

function clearPreloadCache() {
  preloadedPages.clear();
  preloadedNextPage = null;
}


async function loadProducts() {
  if (isLoadingProducts) {
    console.log("⏳ Ya cargando productos, omitiendo...");
    return;
  }
  
  isLoadingProducts = true;
  showSkeletonLooks();
  
  const weatherPromise = fetchWeatherInBackground();
  
  const cachedLooks = getCachedLooksOptimized();
  if (cachedLooks && cachedLooks.length > 0) {
    console.log("⚡⚡ LOOKS DESDE CACHÉ - INSTANTÁNEO");
    
    const neutralOrder = [...cachedLooks].sort((a, b) => a.id.localeCompare(b.id));
    allLooks = neutralOrder;
    looks = [...allLooks];
    currentLooksPage = 1;
    precomputeAllOrders(allLooks);
    
    const cachedProducts = getCachedProducts();
    if (cachedProducts && cachedProducts.length > 0) {
      allProducts = cachedProducts;
      if (typeof window.indexProducts === 'function') {
        window.indexProducts(allProducts);
      }
    }
    
    renderLooks();
    initLazyImagesAfterRender();
    preloadAdjacentPages();
    hideSkeletonLooks();
    
    const weather = await weatherPromise;
    if (weather && weather.weatherType && precomputedOrders[weather.weatherType]) {
      applyWeatherOrderInstant(weather.weatherType);
    }
    
    if (navigator.onLine && !isGeneratingLooks) {
      loadFreshProductsInBackground();
    }
    
    isLoadingProducts = false;
    return;
  }
  
  // Si no hay caché, cargar desde red
  try {
    await getWeather();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const res = await fetch(API_URL, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    const data = await res.json();
    allProducts = data.products || data || [];
    if (typeof window.indexProducts === 'function') {
      window.indexProducts(allProducts);
    }
    setCachedProducts(allProducts);
    await generateLooksProgressive();
    hideSkeletonLooks();
  } catch (err) {
    console.error("Error cargando productos:", err);
    const container = document.getElementById("looks-container");
    if (container && !container.querySelector('.look-card')) {
      container.innerHTML = '<div class="empty-looks">❌ Error al cargar los productos. Intenta de nuevo.</div>';
    }
    hideSkeletonLooks();
  } finally {
    isLoadingProducts = false;
  }
}




function generateNeutralLooksOrder(products) {
  const productsWithImages = products.filter(p => 
    (p.Imagen1 || p.Imagen2 || p.Imagen3) && Number(p.Stock || 0) > 0
  );
  
  const quickLooks = [];
  const maxQuickLooks = 6;
  
  for (let i = 0; i < Math.min(maxQuickLooks, LOOKS_CONFIG.length); i++) {
    const config = LOOKS_CONFIG[i];
    const selectedProducts = selectProductsForLook(config, productsWithImages);
    const productCount = Object.keys(selectedProducts).length;
    
    if (productCount > 0) {
      quickLooks.push({
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
  
  return quickLooks.sort((a, b) => a.id.localeCompare(b.id));
}






async function loadFreshProductsInBackground() {
  if (isGeneratingLooks) return;
  isGeneratingLooks = true;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const res = await fetch(API_URL, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    const data = await res.json();
    const freshProducts = data.products || data || [];
    
    if (JSON.stringify(freshProducts) !== JSON.stringify(allProducts)) {
      allProducts = freshProducts;
      setCachedProducts(allProducts);
      await generateLooksProgressive();
      showTemporaryMessage("✨ Outfits actualizados", "info");
    }
  } catch (err) {
    console.log("Background update falló:", err.message);
  } finally {
    isGeneratingLooks = false;
  }
}

function renderLooks() {
  const container = document.getElementById("looks-container");
  if (!container) return;
  
  if (allLooks.length === 0) {
    if (!container.querySelector('.skeleton-card')) {
      container.innerHTML = `<div class="empty-looks"><p>✨ No disponibles en este momento.</p><p>Visita el <a href="index.html" style="color:#ff4f81;">catálogo</a> para ver nuestros productos.</p></div>`;
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
  
  setTimeout(() => {
    initLazyImagesAfterRender();
    forceVisibleLazyImages();
  }, 50);
}

// NUEVA FUNCIÓN: Cargar solo imágenes visibles en viewport
function forceVisibleLazyImages() {
  const lazyImages = document.querySelectorAll('.lazy:not(.loaded)');
  const viewportHeight = window.innerHeight;
  
  lazyImages.forEach(img => {
    const rect = img.getBoundingClientRect();
    const isVisible = rect.top < viewportHeight + 100 && rect.bottom > -100;
    
    if (isVisible) {
      const dataSrc = img.getAttribute('data-src');
      if (dataSrc) {
        img.src = dataSrc;
        img.classList.add('loaded');
        img.removeAttribute('data-src');
      }
    }
  });
}

function createLookCardWithLazy(look) {
  let totalPrice = 0;
  let productsHtml = '';
  let productCount = 0;
  let imagesHtml = '';
  const slotOrder = ["torso", "piernas", "pies"];
  
  for (const slotKey of slotOrder) {
    const product = look.products[slotKey];
    if (!product) continue;
    productCount++;
    totalPrice += product.price;
    const productImgOptimized = optimizeDriveUrl(product.image, 200);
    
    // Mejorado: Asegurar que la imagen tiene data-src y un placeholder
    imagesHtml += `
      <div class="look-slot-image" data-slot="${slotKey}" onclick="openImageModal('${optimizeDriveUrl(product.image, 800)}')">
        <img class="look-slot-img lazy" 
             data-src="${productImgOptimized}" 
             src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E" 
             alt="${escapeHtml(product.name)}"
             loading="lazy">
      </div>
    `;
    
    productsHtml += `
      <div class="look-product-item" data-slot="${slotKey}">
        <div class="look-product-info">
          <div class="look-product-name">${escapeHtml(product.name)}</div>
          <div class="look-product-price">${formatCurrency(product.price)}</div>
          <div class="look-product-size">${escapeHtml(product.size || 'Talla no especificada')}</div>
        </div>
        <div class="look-product-actions">
          <button class="look-product-add" onclick="addToCart({ID:'${product.id}', Nombre:'${escapeHtml(product.name)}', Precio:${product.price}, Imagen1:'${product.image}', Talla:'${escapeHtml(product.size || '')}'})">🛒</button>
          <button class="look-product-reload" onclick="reloadSlot('${look.id}', '${slotKey}', event)" title="Cambiar esta prenda">⟳</button>
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
  
  return card;
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
  
  // Botón anterior
  if (currentLooksPage > 1) {
    const prevBtn = createPaginationButton("← Anterior", () => {
      currentLooksPage--;
      renderLooks();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => forceVisibleLazyImages(), 300);
    });
    paginationDiv.appendChild(prevBtn);
  }
  
  // Números de página
  let startPage = Math.max(1, currentLooksPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);
  if (endPage - startPage < 4 && startPage > 1) startPage = Math.max(1, endPage - 4);
  
  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = createPaginationButton(i.toString(), () => {
      currentLooksPage = i;
      renderLooks();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => forceVisibleLazyImages(), 300);
    });
    if (i === currentLooksPage) pageBtn.classList.add("active-page");
    paginationDiv.appendChild(pageBtn);
  }
  
  // Botón siguiente
  if (currentLooksPage < totalPages) {
    const nextBtn = createPaginationButton("Siguiente →", () => {
      currentLooksPage++;
      renderLooks();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => forceVisibleLazyImages(), 300);
    });
    
    nextBtn.addEventListener('mouseenter', () => {
      if (currentLooksPage + 1 <= totalPages) {
        preloadLooksPage(currentLooksPage + 1);
      }
    });
    
    paginationDiv.appendChild(nextBtn);
  }
  
  container.parentNode.insertBefore(paginationDiv, container.nextSibling);
}

function createPaginationButton(text, onClick) {
  const btn = document.createElement("button");
  btn.textContent = text;
  btn.onclick = onClick;
  
  if (text === "Siguiente →" && currentLooksPage < Math.ceil(allLooks.length / looksPerPage)) {
    btn.addEventListener('mouseenter', () => {
      preloadLooksPage(currentLooksPage + 1);
    });
  } else if (text === "← Anterior" && currentLooksPage > 1) {
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
  
  // Scroll listener para lazy loading
  let scrollTimeout;
  window.addEventListener('scroll', function() {
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      forceVisibleLazyImages();
    }, 100);
  });
});

// También cuando se cambia de página en la paginación
function goToLooksPage(page) {
  currentLooksPage = page;
  renderLooks();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  // Forzar carga después del scroll
  setTimeout(() => forceVisibleLazyImages(), 300);
}


