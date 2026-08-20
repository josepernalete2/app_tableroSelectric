import { useState, useEffect, useCallback } from 'react';
import API_BASE_URL from '../utils/api';

/**
 * Convierte una clave VAPID en Base64 URL Safe a Uint8Array
 */
export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // 1. Comprobar soporte inicial y estado de suscripción
  const checkSubscription = useCallback(async () => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);

    if (!supported) {
      setStatusMessage('Las notificaciones push no son soportadas en este navegador.');
      return;
    }

    setPermission(Notification.permission);

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    } catch (err) {
      console.error('Error al consultar suscripción push:', err);
    }
  }, []);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // 2. Obtener clave VAPID pública desde el backend o env
  const fetchVapidPublicKey = async () => {
    if (import.meta.env.VITE_VAPID_PUBLIC_KEY) {
      return import.meta.env.VITE_VAPID_PUBLIC_KEY;
    }
    const response = await fetch(`${API_BASE_URL}/api/notifications/vapid-key`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo obtener la clave VAPID.');
    return data.publicKey;
  };

  // 3. Suscribirse a Notificaciones Push
  const subscribeUser = async () => {
    if (!isSupported) return false;
    setLoading(true);
    setStatusMessage('');

    try {
      // Solicitar permiso al usuario
      const permResult = await Notification.requestPermission();
      setPermission(permResult);

      if (permResult !== 'granted') {
        setStatusMessage('El usuario denegó el permiso para notificaciones.');
        setLoading(false);
        return false;
      }

      // Obtener registro del SW
      const reg = await navigator.serviceWorker.ready;

      // Obtener VAPID Public Key
      const vapidPublicKey = await fetchVapidPublicKey();
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

      // Crear suscripción mediante PushManager
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      // Enviar la suscripción al servidor Express
      const response = await fetch(`${API_BASE_URL}/api/notifications/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription })
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Error al guardar suscripción en backend.');

      setIsSubscribed(true);
      setStatusMessage('¡Suscrito con éxito a las notificaciones push nativas!');
      setLoading(false);
      return true;
    } catch (err) {
      console.error('Error al suscribir a push:', err);
      setStatusMessage(`Error: ${err.message}`);
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
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      if (sub) {
        // Enviar desuscripción al backend
        await fetch(`${API_BASE_URL}/api/notifications/unsubscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint })
        });

        // Cancelar suscripción en el navegador
        await sub.unsubscribe();
      }

      setIsSubscribed(false);
      setStatusMessage('Suscripción a notificaciones desactivada.');
      setLoading(false);
      return true;
    } catch (err) {
      console.error('Error al cancelar suscripción:', err);
      setStatusMessage(`Error: ${err.message}`);
      setLoading(false);
      return false;
    }
  };

  // 5. Enviar Notificación de Prueba desde el Cliente
  const sendTestNotification = async (payloadData = {}) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/send-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: payloadData.title || '⚡ Notificación de Prueba',
          body: payloadData.body || 'Prueba de alerta nativa push desde Selectric App.',
          icon: '/pwa-192x192.png',
          url: '/'
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error);

      setStatusMessage(`Notificación enviada: ${data.message}`);
      setLoading(false);
      return data;
    } catch (err) {
      console.error('Error enviando notificación de prueba:', err);
      setStatusMessage(`Error al probar: ${err.message}`);
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
    subscribeUser,
    unsubscribeUser,
    sendTestNotification,
    checkSubscription
  };
}

export default usePushNotifications;
