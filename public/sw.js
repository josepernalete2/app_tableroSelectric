// Service Worker para TableroSelectric PWA
// Versión: 2.3.1 - Resiliencia Multidispositivo, Manifest y Cache Invalidation
const CACHE_NAME = 'tablero-selectric-v2.3.1';

// Inyección de manifiesto de precache de Workbox (VitePWA injectManifest)
const wbManifest = self.__WB_MANIFEST || [];

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-192x192.png',
  '/pwa-maskable-512x512.png'
];

// 1. Instalación: cachear assets básicos de forma resiliente y activar inmediatamente
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        STATIC_ASSETS.map((asset) =>
          cache.add(asset).catch((err) => {
            console.warn(`[SW] Aviso precaching ${asset}:`, err.message);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// 2. Activación: limpiar caches antiguas y tomar control de clientes inmediatamente
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Estrategia de Fetch:
// - Para llamadas /api/* y /socket.io: NETWORK ONLY (NUNCA cachear peticiones de API para evitar datos obsoletos o fallos de CORS)
// - Para assets estáticos y navegación: Network-first con fallback a cache
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass total de peticiones de API y WebSockets
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io') || event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html').then((indexResp) => {
              return indexResp || caches.match('/') || new Response('Offline', { status: 503, statusText: 'Offline' });
            });
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
      })
  );
});

// 4. Manejo de Notificaciones Push
self.addEventListener('push', (event) => {
  let data = { title: 'Selectric Alerta', body: 'Nueva actualización en tus inspecciones eléctricas.' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || data.mensaje,
    icon: '/pwa-192x192.png',
    badge: '/favicon.svg',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'TableroSelectric', options)
  );
});

// 5. Clic en Notificación Push
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
