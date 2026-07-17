const CACHE_NAME    = 'zr-cache-v31';
const DYNAMIC_CACHE = 'zr-dynamic-v14';
const OFFLINE_URL   = '/ZNR/offline.html';

const STATIC_ASSETS = [
  '/ZNR/',
  '/ZNR/index.html',
  '/ZNR/catalogo.html',
  '/ZNR/outfit.html',
  '/ZNR/armar-outfit.html',
  '/ZNR/comunidad.html',
  '/ZNR/perfil-vendedor.html',
  '/ZNR/vendedor.html',
  '/ZNR/admin.html',
  '/ZNR/notificaciones.html',
  '/ZNR/offline.html',
  '/ZNR/styles.css',
  '/ZNR/api-config.js',
  '/ZNR/common.js',
  '/ZNR/script.js',
  '/ZNR/looks.js',
  '/ZNR/home.js',
  '/ZNR/admin.js',
  '/ZNR/comunidad.js',
  '/ZNR/vendedor-unificado.js',
  '/ZNR/notifications-optimized.js',
  '/ZNR/admin-comunidad.js',
  '/ZNR/offline-manager.js',
  '/ZNR/cache-manager.js',
  '/ZNR/error-monitor.js',
  '/ZNR/icons.js',
  '/ZNR/manifest.json',
  '/ZNR/manifest-admin.json',
  '/ZNR/placeholder.svg',
];

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
const API_DOMAINS      = ['script.google.com', 'wttr.in', 'openweathermap.org'];
const IMAGE_CDN_HOSTS  = ['lh3.googleusercontent.com', 'googleusercontent.com'];

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

function getCacheStrategy(request) {
  const url = new URL(request.url);
  if (request.method === 'POST') return 'NETWORK_ONLY';
  // Imágenes de productos en Google CDN → CACHE_FIamente)000000000
  if (IMAGE_CDN_HOSTS.some(h => url.hostname.includes(h))) return 'CACHE_FIRST';
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
                         'rechazarVendedor','aprobarProductoComunidad','rechazarProductoComunidad',
                         'verificarAdmin','vendedoresAdmin','productosPendientes',
                         'obtenerReportes','confirmGroupPurchase','cancelGroupPurchase'];
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
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request, { cache: 'reload' }).then(net => {
    if (net?.status === 200) {
      cache.put(request, net.clone());
    }
    return net;
  }).catch(() => null);
  if (cached) { fetchPromise.catch(() => {}); return cached; }
  const net = await fetchPromise;
  if (net) return net;
  if (request.mode === 'navigate') return caches.match(OFFLINE_URL);
  return new Response('No disponible', { status: 404 });
}

self.addEventListener('push', event => {
  const payload = event.data ? event.data.json() : {};
  // FCM entrega el título/cuerpo anidados en "notification",
  // no en el nivel superior del payload.0000
  const notif = payload.notification || {};
  const title = notif.title || 'Z&R';
  const body  = notif.body  || '¡Novedades en Z&R!';
  const url   = (payload.data && payload.data.url) || payload.fcmOptions?.link || '/ZNR/';

  event.waitUntil((async () => {
    await self.registration.showNotification(title, {
      body:    body,
      icon:    '/ZNR/logo.svg',
      vibrate: [200, 100, 200],
      data:    { url: url },
      actions: [{ action: 'open', title: 'Ver ahora' }, { action: 'close', title: 'Cerrar' }]
    });
    // 🔧 Antes lo hacía firebase-messaging-sw.js (un SW aparte, peleando por
    // el mismo scope que este). Ahora que ese registro se quitó, este es el
    // único push handler, así que avisamos aquí mismo a las pestañas
    // abiertas para que refresquen badges/listas (notification-center.js,
    // admin.js, notifications-optimized.js, vendedor-unificado.js).
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    clientList.forEach(c => c.postMessage({ type: 'znr-nueva-notificacion' }));
  })());
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