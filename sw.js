// ── sw.js — Z&R PWA (con rutas de Comunidad) ────────────────────────────────
// Cambios respecto a la versión anterior:
//   • Añadidas nuevas páginas de vendedor al caché estático
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_NAME    = 'zr-cache-v8';   // ← incrementado de v7
const DYNAMIC_CACHE = 'zr-dynamic-v8';
const OFFLINE_URL   = '/ZNR/offline.html';

const STATIC_ASSETS = [
  '/ZNR/',
  '/ZNR/index.html',
  '/ZNR/catalogo.html',
  '/ZNR/outfit.html',
  '/ZNR/admin.html',
  '/ZNR/notificaciones.html',
  '/ZNR/offline.html',
  '/ZNR/styles.css',
  '/ZNR/common.js',
  '/ZNR/script.js',
  '/ZNR/looks.js',
  '/ZNR/home.js',
  '/ZNR/admin.js',
  '/ZNR/user-preferences.js',
  '/ZNR/notifications-optimized.js',
  '/ZNR/offline-manager.js',
  '/ZNR/cache-manager.js',
  '/ZNR/manifest.json',
  // ── NUEVOS ──
  '/ZNR/vendedor.html',
  '/ZNR/vendedor.js',
  '/ZNR/registro-vendedor.html',
  '/ZNR/comunidad.js',
  '/ZNR/admin-comunidad.js',
];

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
const API_DOMAINS      = ['script.google.com', 'googleusercontent.com', 'wttr.in', 'openweathermap.org'];

// ─── Instalación ──────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.allSettled(
        STATIC_ASSETS.map(async asset => {
          try {
            const response = await fetch(asset);
            if (response.ok) await cache.put(asset, response);
          } catch {}
        })
      );
      const offlineRes = await fetch(OFFLINE_URL).catch(() => null);
      if (offlineRes?.ok) await cache.put(OFFLINE_URL, offlineRes);
      await self.skipWaiting();
    })()
  );
});

// ─── Activación ───────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter(n => n !== CACHE_NAME && n !== DYNAMIC_CACHE)
          .map(n => caches.delete(n))
      );
      await self.clients.claim();
      const clients = await self.clients.matchAll();
      clients.forEach(c => c.postMessage({ type: 'SW_ACTIVATED' }));
    })()
  );
});

// ─── Estrategias ──────────────────────────────────────────────────────────────
function getCacheStrategy(request) {
  const url = new URL(request.url);
  if (request.method === 'POST') return 'NETWORK_ONLY';
  if (IMAGE_EXTENSIONS.some(ext => url.pathname.toLowerCase().endsWith(ext))) return 'CACHE_FIRST';
  if (url.hostname.includes('wttr.in') || url.hostname.includes('openweathermap.org')) return 'NETWORK_ONLY';
  if (API_DOMAINS.some(d => url.hostname.includes(d))) return 'NETWORK_FIRST';
  if (['document','style','script'].includes(request.destination)) return 'STALE_WHILE_REVALIDATE';
  return 'CACHE_FIRST';
}

self.addEventListener('fetch', event => {
  if (event.request.url.startsWith('chrome-extension://')) return;
  const strategy = getCacheStrategy(event.request);
  const handlers = {
    CACHE_FIRST:            cacheFirst,
    NETWORK_ONLY:           networkOnly,
    NETWORK_FIRST:          networkFirst,
    STALE_WHILE_REVALIDATE: staleWhileRevalidate,
  };
  event.respondWith((handlers[strategy] || networkFirst)(event.request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const net = await fetch(request);
    if (net?.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, net.clone());
    }
    return net;
  } catch {
    if (request.mode === 'navigate') return caches.match(OFFLINE_URL);
    return new Response('Offline', { status: 404 });
  }
}

async function networkOnly(request) {
  try { return await fetch(request); }
  catch {
    return new Response(JSON.stringify(null), {
      status: 503, headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function networkFirst(request) {
  try {
    const net = await fetch(request);
    if (net?.status === 200) {
      const url    = new URL(request.url);
      const action = url.searchParams.get('action');
      const sensitive = ['login','loginVendedor','notifications','notificationsBatch',
                         'update','delete','create','uploadImage','createComunidad',
                         'updateComunidad','deleteComunidad','aprobarVendedor',
                         'rechazarVendedor','aprobarProductoComunidad','rechazarProductoComunidad'];
      if (!action || !sensitive.includes(action)) {
        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(request, net.clone());
      }
    }
    return net;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') return caches.match(OFFLINE_URL);
    throw new Error('Offline');
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request).then(net => {
    if (net?.status === 200) {
      caches.open(CACHE_NAME).then(c => c.put(request, net.clone()));
    }
    return net;
  }).catch(() => null);
  if (cached) { fetchPromise.catch(() => {}); return cached; }
  const net = await fetchPromise;
  if (net) return net;
  if (request.mode === 'navigate') return caches.match(OFFLINE_URL);
  return new Response('No disponible', { status: 404 });
}

// ─── Push, notificationclick, sync, periodicsync ─────────────────────────────
// (sin cambios respecto a la versión original — copiados para mantener integridad)

self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Z&R', {
      body:    data.body || '¡Novedades en Z&R!',
      icon:    '/ZNR/logo.svg',
      vibrate: [200, 100, 200],
      data:    { url: data.url || '/ZNR/' },
      actions: [{ action: 'open', title: 'Ver ahora' }, { action: 'close', title: 'Cerrar' }]
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'open' || !event.action) {
    const url = event.notification.data?.url || '/ZNR/';
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        for (const c of clients) {
          if (c.url === url && 'focus' in c) return c.focus();
        }
        return self.clients.openWindow?.(url);
      })
    );
  }
});

self.addEventListener('sync', event => {
  if (event.tag === 'sync-cart') {
    event.waitUntil(
      self.clients.matchAll().then(clients =>
        clients.forEach(c => c.postMessage({ type: 'SYNC_CART' }))
      )
    );
  }
});

self.addEventListener('periodicsync', event => {
  if (event.tag === 'update-products') {
    event.waitUntil(
      fetch('https://script.google.com/macros/s/AKfycbzNshrt3zldBNiyoB8x36ktCEO02H0cKxebiTuK7UAbsgd5R9biaCW7W4ihm1aVOJG7ww/exec')
        .then(async r => {
          if (r.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put('/ZNR/api/products', r.clone());
          }
        })
        .catch(() => {})
    );
  }
});