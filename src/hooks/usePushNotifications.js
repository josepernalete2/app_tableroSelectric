import { useState, useEffect, useCallback } from 'react';
import API_BASE_URL from '../utils/api';

// Clave pública VAPID oficial de respaldo para garantizar disponibilidad permanente en PWA / Offline
export const DEFAULT_VAPID_PUBLIC_KEY = 'BEvczk5jNzJMDSBNa_C__C-ZwvWwrdIJLiI9WRXpraE1XoEIuW5PyvLklmz4tPo2kotyBlYz6hwKqkP6cgg6u1g';

/**
 * Convierte una clave pública VAPID en Base64 URL Safe a Uint8Array de 65 bytes (P-256)
 * Sanitiza comillas, comillas simples, espacios y saltos de línea para evitar
 * el error "Registration failed - push service error" en navegadores Chromium/Android.
 */
export function urlBase64ToUint8Array(base64String) {
  if (!base64String || typeof base64String !== 'string') {
    throw new Error('La clave pública VAPID no es válida o está vacía.');
  }

  // 1. Sanitizar comillas circundantes y espacios en blanco
  const cleaned = base64String.trim().replace(/^["']|["']$/g, '').trim();

  // 2. Padding Base64 URL-Safe estándar
  const padding = '='.repeat((4 - (cleaned.length % 4)) % 4);
  const base64 = (cleaned + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  // Validación de punto no comprimido P-256 (65 bytes iniciando con 0x04)
  if (outputArray.length !== 65 || outputArray[0] !== 4) {
    console.warn(`[Push Notifications] Advertencia de formato VAPID: longitud ${outputArray.length} bytes, primer byte 0x${outputArray[0]?.toString(16)} (se esperaban 65 bytes iniciando con 0x04).`);
  }

  return outputArray;
}

/**
 * Traduce de forma amigable los códigos y mensajes de error del Push Service
 * para que el usuario entienda claramente lo sucedido sin romper la interfaz.
 */
export function formatPushErrorMessage(err) {
  if (!err) return 'No fue posible activar las notificaciones.';

  const msg = err.message || String(err);
  const name = err.name || '';

  if (msg.includes('push service error') || name === 'AbortError') {
    return 'El servicio de notificaciones del dispositivo (Google Push/FCM) tuvo un fallo de conexión temporal. Comprueba tu conexión a internet o reintenta en unos instantes.';
  }
  if (name === 'NotAllowedError' || msg.includes('permission denied') || msg.includes('denegado')) {
    return 'Permiso de notificaciones denegado. Habilítalo en la configuración de permisos del navegador o de tu tablet.';
  }
  if (name === 'InvalidStateError' || msg.includes('Service Worker')) {
    return 'El Service Worker se está inicializando o actualizando. Espera unos segundos y pulsa nuevamente.';
  }
  if (name === 'NotSupportedError' || msg.includes('not supported')) {
    return 'Las notificaciones push no son compatibles con este dispositivo o versión de navegador.';
  }
  if (msg.includes('incognito') || msg.includes('private')) {
    return 'Las notificaciones push están deshabilitadas en modo incógnito o navegación privada.';
  }
  if (msg.includes('applicationServerKey') || msg.includes('VAPID')) {
    return 'La clave de autenticación push (VAPID) es inválida o no coincide.';
  }
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return 'No se pudo conectar con el servidor para registrar la suscripción. Verifica la conexión de red.';
  }

  return `No se pudo activar: ${msg}`;
}

/**
 * Solicita permisos de notificación de forma resiliente tanto en navegadores modernos (Promise)
 * como en versiones anteriores de Android y Safari (Callback).
 */
async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  try {
    const permResult = await Notification.requestPermission();
    return permResult;
  } catch (err) {
    return new Promise((resolve) => {
      Notification.requestPermission((result) => {
        resolve(result);
      });
    });
  }
}

/**
 * Asegura que el Service Worker esté registrado y activo antes de cualquier operación push.
 */
async function ensureServiceWorkerReady() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Worker no soportado en este dispositivo.');
  }

  // Si no hay un registro existente, registrar /sw.js inmediatamente
  let registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  }

  // Esperar a que el Service Worker esté listo
  const readyReg = await navigator.serviceWorker.ready;

  // Si hay un worker nuevo instalándose, esperar un instante para su transición
  if (readyReg.installing) {
    await new Promise((resolve) => {
      const worker = readyReg.installing;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'activated' || worker.state === 'installed') {
          resolve();
        }
      });
      setTimeout(resolve, 2000); // timeout de seguridad
    });
  }

  return readyReg;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState('info'); // 'info' | 'success' | 'error' | 'warning'

  // 1. Comprobar soporte inicial y estado de suscripción
  const checkSubscription = useCallback(async () => {
    const supported = typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;

    setIsSupported(supported);

    if (!supported) {
      setStatusType('warning');
      setStatusMessage('Las notificaciones push no son soportadas en este navegador.');
      return;
    }

    setPermission(Notification.permission);

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    } catch (err) {
      console.warn('[Push] Error al consultar estado de suscripción inicial:', err);
    }
  }, []);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // 2. Obtener clave VAPID pública limpia desde env, endpoint o fallback seguro
  const fetchVapidPublicKey = async () => {
    // A. Prioridad 1: Variable de entorno Vite en cliente
    const envKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (envKey && typeof envKey === 'string' && envKey.trim().length > 20) {
      return envKey.trim().replace(/^["']|["']$/g, '').trim();
    }

    // B. Prioridad 2: Consulta al endpoint del servidor
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/vapid-key`);
      if (response.ok) {
        const data = await response.json();
        if (data.publicKey && typeof data.publicKey === 'string') {
          return data.publicKey.trim().replace(/^["']|["']$/g, '').trim();
        }
      }
    } catch (err) {
      console.warn('[Push] No se pudo obtener la clave VAPID desde el backend, usando clave de respaldo:', err.message);
    }

    // C. Prioridad 3: Clave preconfigurada de alta disponibilidad
    return DEFAULT_VAPID_PUBLIC_KEY;
  };

  // 3. Suscribirse a Notificaciones Push
  const subscribeUser = async () => {
    if (!isSupported) {
      setStatusType('warning');
      setStatusMessage('Las notificaciones no están soportadas en este entorno.');
      return false;
    }

    setLoading(true);
    setStatusMessage('');

    try {
      // Paso A: Solicitar permiso de forma compatible con móviles y tablets Android
      const permResult = await requestNotificationPermission();
      setPermission(permResult);

      if (permResult !== 'granted') {
        setStatusType('error');
        setStatusMessage('Permiso denegado. Para recibir alertas, habilita las notificaciones en los permisos del navegador.');
        setLoading(false);
        return false;
      }

      // Paso B: Asegurar que el Service Worker esté registrado y activo
      const reg = await ensureServiceWorkerReady();

      // Paso C: Obtener clave VAPID y convertirla de forma segura
      const vapidPublicKey = await fetchVapidPublicKey();
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

      // Paso D: Verificar si ya existe una suscripción previa (huérfana o desincronizada)
      // Esta es la causa principal de "Registration failed - push service error" en Chrome/Android:
      // Si existía una suscripción previa no sincronizada con FCM, desuscribirla primero limpia el canal.
      try {
        const existingSub = await reg.pushManager.getSubscription();
        if (existingSub) {
          console.log('[Push] Suscripción previa detectada, renovando canal para evitar conflictos FCM...');
          await existingSub.unsubscribe();
        }
      } catch (unsubErr) {
        console.warn('[Push] Aviso al verificar suscripción previa:', unsubErr.message);
      }

      // Paso E: Crear la nueva suscripción con PushManager
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      // Paso F: Enviar la suscripción al servidor Express / Backend
      try {
        const response = await fetch(`${API_BASE_URL}/api/notifications/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription })
        });

        if (!response.ok) {
          const resData = await response.json().catch(() => ({}));
          throw new Error(resData.error || 'Error al guardar suscripción en el servidor.');
        }
      } catch (backendErr) {
        // Si el backend falla por desconexión momentánea, la suscripción local del navegador sigue creada
        console.warn('[Push] Aviso: No se pudo registrar en backend de inmediato:', backendErr.message);
      }

      setIsSubscribed(true);
      setStatusType('success');
      setStatusMessage('¡Notificaciones push nativas activadas con éxito!');
      setLoading(false);
      return true;
    } catch (err) {
      console.error('[Push Notifications Error]:', err);
      setStatusType('error');
      setStatusMessage(formatPushErrorMessage(err));
      setLoading(false);
      return false;
    }
  };

  // 4. Cancelar suscripción Push
  const unsubscribeUser = async () => {
    if (!isSupported) return false;
    setLoading(true);
    setStatusMessage('');

    try {
      const reg = await ensureServiceWorkerReady();
      const sub = await reg.pushManager.getSubscription();

      if (sub) {
        // Notificar al backend de la desuscripción
        try {
          await fetch(`${API_BASE_URL}/api/notifications/unsubscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint })
          });
        } catch (backendErr) {
          console.warn('[Push] Aviso al notificar desuscripción a backend:', backendErr.message);
        }

        // Cancelar la suscripción local en el navegador
        await sub.unsubscribe();
      }

      setIsSubscribed(false);
      setStatusType('info');
      setStatusMessage('Notificaciones desactivadas en este dispositivo.');
      setLoading(false);
      return true;
    } catch (err) {
      console.error('[Push Unsubscribe Error]:', err);
      setStatusType('error');
      setStatusMessage(formatPushErrorMessage(err));
      setLoading(false);
      return false;
    }
  };

  // 5. Enviar Notificación de Prueba desde el Cliente
  const sendTestNotification = async (payloadData = {}) => {
    setLoading(true);
    try {
      // Obtener suscripción actual para enviarla como target específico si existe
      let currentSub = null;
      try {
        const reg = await navigator.serviceWorker.ready;
        currentSub = await reg.pushManager.getSubscription();
      } catch (e) {
        // ignorar
      }

      const response = await fetch(`${API_BASE_URL}/api/notifications/send-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: payloadData.title || '⚡ Notificación de Prueba',
          body: payloadData.body || 'Alerta nativa push recibida con éxito en Tablero Selectric.',
          icon: '/pwa-192x192.png',
          url: '/',
          subscription: currentSub ? currentSub.toJSON() : undefined
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || data.error || 'Error al enviar notificación');

      setStatusType('success');
      setStatusMessage(`Notificación enviada: ${data.message || 'Procesada con éxito'}`);
      setLoading(false);
      return data;
    } catch (err) {
      console.error('[Push Test Error]:', err);
      setStatusType('error');
      setStatusMessage(formatPushErrorMessage(err));
      setLoading(false);
      return null;
    }
  };

  return {
    isSupported,
    permission,
    isSubscribed,
    loading,
    statusMessage,
    statusType,
    subscribeUser,
    unsubscribeUser,
    sendTestNotification,
    checkSubscription
  };
}

export default usePushNotifications;

