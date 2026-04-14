const PAGE_CACHE_KEY = 'zr_page_cache';
const PRODUCTS_CACHE_KEY_SESSION = 'zr_products_session';

function setSessionProductsCache(products) {
  try {
    sessionStorage.setItem(PRODUCTS_CACHE_KEY_SESSION, JSON.stringify({
      data: products,
      timestamp: Date.now()
    }));
  } catch(e) { console.warn('Error guardando caché de sesión:', e); }
}

function getSessionProductsCache(maxAge = 300000) {
  try {
    const cached = sessionStorage.getItem(PRODUCTS_CACHE_KEY_SESSION);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > maxAge) {
      sessionStorage.removeItem(PRODUCTS_CACHE_KEY_SESSION);
      return null;
    }
    return data;
  } catch(e) { return null; }
}

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

function preloadPage(pageUrl) {
  if (!pageUrl) return;
  
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

function isOfflineModeAvailable() {
  const sessionCached = getSessionProductsCache();
  const localCached = (() => {
    try {
      const cached = localStorage.getItem('zr_products_cache');
      if (!cached) return null;
      const { data } = JSON.parse(cached);
      return data;
    } catch(e) { return null; }
  })();
  return !!(sessionCached || localCached);
}

window.CacheManager = {
  setSessionProductsCache,
  getSessionProductsCache,
  savePageState,
  restorePageState,
  preloadPage,
  initPreloading,
  isOfflineModeAvailable
};
