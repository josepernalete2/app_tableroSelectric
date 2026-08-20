import { precacheAndRoute } from 'workbox-precaching'

// Precargar y enrutar los assets estáticos generados por la build de Vite
precacheAndRoute(self.__WB_MANIFEST || [])

// Capturar eventos Push nativos
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Evento Push recibido:', event)
  
  let data = {}
  if (event.data) {
    try {
      data = event.data.json()
    } catch (err) {
      data = {
        title: 'App Tableros Selectric',
        body: event.data.text()
      }
    }
  }

  const title = data.title || '⚡ Alerta de Tableros Selectric'
  const options = {
    body: data.body || 'Tienes una actualización importante en tu sistema de tableros eléctricos.',
    icon: data.icon || '/pwa-192x192.png',
    badge: '/favicon.svg',
    vibrate: [100, 50, 100, 50, 100],
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'open', title: 'Abrir App' },
      { action: 'close', title: 'Descartar' }
    ]
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// Manejar clic en la notificación mostrada en la barra de estado/pantalla
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Clic en notificación:', event.notification)
  event.notification.close()

  if (event.action === 'close') return

  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Buscar si ya existe una pestaña abierta con la app
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus()
        }
      }
      // Abrir nueva ventana si no está enfocada
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})
