import webpush from 'web-push';

// Función para sanitizar claves VAPID (remover comillas, espacios y caracteres de escape)
const cleanKey = (val) => (typeof val === 'string' ? val.trim().replace(/^["']|["']$/g, '').trim() : '');

const DEFAULT_SERVER_VAPID_PUBLIC_KEY = 'BEvczk5jNzJMDSBNa_C__C-ZwvWwrdIJLiI9WRXpraE1XoEIuW5PyvLklmz4tPo2kotyBlYz6hwKqkP6cgg6u1g';
const DEFAULT_SERVER_VAPID_PRIVATE_KEY = 'qTORyOyE70hMrBbw-L1rZR65iyzW-2Qo7GBCvj_3PME';

// Configurar llaves VAPID desde variables de entorno o respaldo seguro
const VAPID_PUBLIC_KEY = cleanKey(process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY) || DEFAULT_SERVER_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = cleanKey(process.env.VAPID_PRIVATE_KEY) || DEFAULT_SERVER_VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = cleanKey(process.env.VAPID_SUBJECT) || 'mailto:soporte@selectric.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    console.log('✅ WebPush VAPID configurado correctamente en el servidor.');
  } catch (err) {
    console.error('❌ Error al inicializar web-push con VAPID:', err.message);
  }
} else {
  console.warn('⚠️ Advertencia: VAPID keys no encontradas en las variables de entorno.');
}

// Almacenamiento en memoria para suscripciones (key: endpoint string)
const subscriptionsMap = new Map();

/**
 * Obtener la Clave Pública VAPID
 * GET /api/notifications/vapid-key
 */
export const getVapidPublicKey = (req, res) => {
  if (!VAPID_PUBLIC_KEY) {
    return res.status(500).json({ error: 'La clave VAPID pública no está configurada en el servidor.' });
  }
  res.json({ publicKey: VAPID_PUBLIC_KEY });
};

/**
 * Registrar / Almacenar una suscripción Push
 * POST /api/notifications/subscribe
 */
export const subscribe = (req, res) => {
  try {
    const { subscription, userId } = req.body;
    const subObj = subscription || req.body;

    if (!subObj || !subObj.endpoint || !subObj.keys) {
      return res.status(400).json({ error: 'Objeto PushSubscription inválido o incompleto.' });
    }

    const key = subObj.endpoint;
    subscriptionsMap.set(key, {
      subscription: subObj,
      userId: userId || 'anonymous',
      createdAt: new Date()
    });

    console.log(`📲 Nueva suscripción registrada (${subscriptionsMap.size} activas). Endpoint: ${subObj.endpoint.slice(0, 40)}...`);

    res.status(201).json({
      success: true,
      message: 'Suscripción a notificaciones push registrada con éxito.'
    });
  } catch (error) {
    console.error('❌ Error guardando suscripción push:', error);
    res.status(500).json({ error: 'Error al registrar la suscripción', detalle: error.message });
  }
};

/**
 * Cancelar una suscripción Push
 * POST /api/notifications/unsubscribe
 */
export const unsubscribe = (req, res) => {
  try {
    const { endpoint } = req.body;
    if (endpoint && subscriptionsMap.has(endpoint)) {
      subscriptionsMap.delete(endpoint);
      console.log(`🔕 Suscripción eliminada. Quedan ${subscriptionsMap.size} activas.`);
    }
    res.json({ success: true, message: 'Suscripción anulada correctamente.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al desuscribir', detalle: error.message });
  }
};

/**
 * Enviar notificación de prueba
 * POST /api/notifications/send-test
 */
export const sendTestNotification = async (req, res) => {
  try {
    const { title, body, icon, url, subscription } = req.body;

    const payload = JSON.stringify({
      title: title || '⚡ Alerta de Tableros Selectric',
      body: body || 'Prueba exitosa de Notificaciones Push Nativas en PWA.',
      icon: icon || '/pwa-192x192.png',
      url: url || '/'
    });

    // Si se proporciona una suscripción específica en el body
    const targets = [];
    if (subscription && subscription.endpoint) {
      targets.push(subscription);
    } else {
      for (const item of subscriptionsMap.values()) {
        targets.push(item.subscription);
      }
    }

    if (targets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No hay dispositivos suscritos actualmente para recibir notificaciones.'
      });
    }

    let successCount = 0;
    let failureCount = 0;

    await Promise.all(
      targets.map(async (sub) => {
        try {
          await webpush.sendNotification(sub, payload);
          successCount++;
        } catch (err) {
          failureCount++;
          console.error(`❌ Error enviando a endpoint (${err.statusCode}):`, err.message);
          
          // Limpiar suscripciones caducadas o expiradas (410 Gone / 404 Not Found)
          if (err.statusCode === 410 || err.statusCode === 404) {
            subscriptionsMap.delete(sub.endpoint);
            console.log(`🧹 Suscripción obsoleta eliminada: ${sub.endpoint.slice(0, 40)}...`);
          }
        }
      })
    );

    res.json({
      success: true,
      message: `Proceso finalizado. Enviadas con éxito: ${successCount}, fallidas: ${failureCount}`,
      sentCount: successCount,
      failedCount: failureCount,
      activeSubscriptions: subscriptionsMap.size
    });
  } catch (error) {
    console.error('❌ Error enviando notificación de prueba:', error);
    res.status(500).json({ error: 'Error al procesar el envío de la notificación', detalle: error.message });
  }
};
