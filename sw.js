// ============================================
// sw.js - Service Worker para Z&R OFFLINE
// ============================================

const CACHE_NAME = 'zr-cache-v1';
const DYNAMIC_CACHE = 'zr-dynamic-v1';

// Recursos estáticos que siempre deben estar en caché
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/looks.html',
  '/admin.html',
  '/notificaciones.html',
  '/offline.html',
  '/styles.css',
  '/common.js',
  '/script.js',
  '/looks.js',
  '/admin.js',
  '/cache-manager.js'
];

// Extensiones de imágenes para caché dinámico
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

// Instalación del Service Worker
self.addEventListener('install', event => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cacheando assets estáticos');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activación - limpiar cachés viejos
self.addEventListener('activate', event => {
  console.log('[SW] Activando...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME && cache !== DYNAMIC_CACHE) {
            console.log('[SW] Eliminando caché viejo:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptar peticiones
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Estrategia: Cache First con fallback a network
  // Para imágenes: usar caché
  if (IMAGE_EXTENSIONS.some(ext => url.pathname.toLowerCase().endsWith(ext))) {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request)
            .then(networkResponse => {
              return caches.open(DYNAMIC_CACHE)
                .then(cache => {
                  cache.put(event.request, networkResponse.clone());
                  return networkResponse;
                });
            })
            .catch(() => {
              return caches.match('/offline.html');
            });
        })
    );
    return;
  }
  
  // Para API (Google Scripts) - Network First
  if (url.href.includes('script.google.com') || url.href.includes('googleusercontent.com')) {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          return caches.open(DYNAMIC_CACHE)
            .then(cache => {
              cache.put(event.request, networkResponse.clone());
              return networkResponse;
            });
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // Para HTML, CSS, JS - Cache First
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // Actualizar en segundo plano (stale-while-revalidate)
          fetch(event.request)
            .then(networkResponse => {
              return caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, networkResponse);
                });
            })
            .catch(() => {});
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then(networkResponse => {
            return caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, networkResponse.clone());
                return networkResponse;
              });
          })
          .catch(() => {
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/offline.html');
            }
            return new Response('Error de conexión', { status: 404 });
          });
      })
  );
});

// Notificar a los clientes sobre cambios de conexión
self.addEventListener('message', event => {
  if (event.data.type === 'GET_CONNECTION_STATUS') {
    event.ports[0].postMessage({
      type: 'CONNECTION_STATUS',
      isOnline: navigator.onLine
    });
  }
});
