// ===== CLAVES UNIFICADAS =====
const CACHE_KEYS = {
  PAGE_STATE: 'zr_page_cache',      // Estado de páginas (sessionStorage)
  PRODUCTS: 'zr_products_data'      // Productos (sessionStorage + localStorage unificados)
};

// ===== PRODUCTOS CACHE (unificado) =====
function setProductsCache(products, persistent = false) {
  try {
    const cacheData = {
      data: products,
      timestamp: Date.now(),
      version: '1.0'
    };
    
    // Siempre guardar en sessionStorage (rápido, se limpia al cerrar)
    sessionStorage.setItem(CACHE_KEYS.PRODUCTS, JSON.stringify(cacheData));
    
    // Solo guardar en localStorage si se solicita persistencia
    if (persistent) {
      localStorage.setItem(CACHE_KEYS.PRODUCTS, JSON.stringify(cacheData));
    }
  } catch(e) { console.warn('Error guardando caché de productos:', e); }
}

function getProductsCache(maxAge = 300000, preferPersistent = false) {
  try {
    // Priorizar sessionStorage (más rápido)
    let cached = sessionStorage.getItem(CACHE_KEYS.PRODUCTS);
    let source = 'session';
    
    // Si no hay en sessionStorage o expiró, intentar localStorage
    if (!cached && preferPersistent) {
      cached = localStorage.getItem(CACHE_KEYS.PRODUCTS);
      source = 'local';
    }
    
    if (!cached) return null;
    
    const { data, timestamp, version } = JSON.parse(cached);
    
    // Verificar expiración
    if (Date.now() - timestamp > maxAge) {
      // Limpiar solo la fuente que expiró
      if (source === 'session') {
        sessionStorage.removeItem(CACHE_KEYS.PRODUCTS);
      } else {
        localStorage.removeItem(CACHE_KEYS.PRODUCTS);
      }
      return null;
    }
    
    // Si la versión es antigua, rechazar
    if (version !== '1.0') return null;
    
    console.log(`📦 Productos desde caché (${source})`);
    return data;
  } catch(e) { 
    console.warn('Error leyendo caché de productos:', e);
    return null; 
  }
}

// Mantener compatibilidad con funciones existentes
function setSessionProductsCache(products) {
  setProductsCache(products, false);
}

function getSessionProductsCache(maxAge = 300000) {
  return getProductsCache(maxAge, false);
}

// ===== PÁGINAS CACHE (sin cambios, ya está optimizado) =====
const PAGE_CACHE_KEY = CACHE_KEYS.PAGE_STATE;

function savePageState(pageName, state) {
  try {
    const allStates = JSON.parse(sessionStorage.getItem(PAGE_CACHE_KEY) || '{}');
    allStates[pageName] = {
      ...state,
      timestamp: Date.now()
    };
    sessionStorage.setItem(PAGE_CACHE_KEY, JSON.stringify(allStates));
  } catch(e) {}
}

function restorePageState(pageName) {
  try {
    const allStates = JSON.parse(sessionStorage.getItem(PAGE_CACHE_KEY) || '{}');
    const state = allStates[pageName];
    if (state && (Date.now() - state.timestamp) < 300000) {
      return state;
    }
    return null;
  } catch(e) { return null; }
}

// ===== PRELOADING (optimizado con límite de conexión) =====
function preloadPage(pageUrl) {
  if (!pageUrl) return;
  
  // No pre-cargar en conexiones lentas (2G/3G)
  if (navigator.connection && (navigator.connection.saveData || 
      navigator.connection.effectiveType === 'slow-2g' ||
      navigator.connection.effectiveType === '2g')) {
    console.log('📡 Conexión lenta, omitiendo prefetch');
    return;
  }
  
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = pageUrl;
  link.as = 'document';
  document.head.appendChild(link);
  
  const scriptMap = {
    'index.html': 'script.js',
    'looks.html': 'looks.js',
    'admin.html': 'admin.js',
    'notificaciones.html': null
  };
  
  const scriptName = scriptMap[pageUrl.split('/').pop()];
  if (scriptName) {
    const scriptLink = document.createElement('link');
    scriptLink.rel = 'prefetch';
    scriptLink.href = scriptName;
    scriptLink.as = 'script';
    document.head.appendChild(scriptLink);
  }
}

function initPreloading() {
  // Usar IntersectionObserver para pre-cargar solo enlaces visibles
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const link = entry.target;
          const href = link.getAttribute('href');
          if (href && href.includes('.html')) {
            preloadPage(href);
          }
          observer.unobserve(link);
        }
      });
    }, { rootMargin: '100px' });
    
    document.querySelectorAll('a[href*=".html"]').forEach(link => {
      observer.observe(link);
    });
  } else {
    // Fallback para navegadores sin IntersectionObserver
    document.querySelectorAll('a[href*=".html"]').forEach(link => {
      link.addEventListener('mouseenter', () => {
        preloadPage(link.getAttribute('href'));
      });
      
      let touchTimeout;
      link.addEventListener('touchstart', () => {
        clearTimeout(touchTimeout);
        touchTimeout = setTimeout(() => {
          preloadPage(link.getAttribute('href'));
        }, 100);
      });
    });
  }
}

function isOfflineModeAvailable() {
  const cached = getProductsCache(300000, true);
  return !!cached;
}

// ===== EXPORTAR API COMPATIBLE =====
window.CacheManager = {
  // Nuevas funciones unificadas
  setProductsCache,
  getProductsCache,
  
  // Funciones legacy (para compatibilidad con código existente)
  setSessionProductsCache,
  getSessionProductsCache,
  savePageState,
  restorePageState,
  preloadPage,
  initPreloading,
  isOfflineModeAvailable
};
