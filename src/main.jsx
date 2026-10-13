import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Registro del Service Worker para PWA y Notificaciones Push
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const registerServiceWorker = () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((reg) => {
      console.log('✅ [PWA] Service Worker registrado exitosamente con ámbito:', reg.scope);
      // Forzar chequeo de actualización al cargar
      reg.update().catch(() => {});
      
      reg.onupdatefound = () => {
        const installingWorker = reg.installing;
        if (installingWorker) {
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🔄 [PWA] Nueva versión disponible en cache.');
            }
          };
        }
      };
    }).catch((err) => {
      console.warn('⚠️ [PWA] No se pudo registrar el Service Worker:', err);
    });
  };

  if (document.readyState === 'complete') {
    registerServiceWorker();
  } else {
    window.addEventListener('load', registerServiceWorker);
  }

  // Capturar evento beforeinstallprompt para soporte en tablets Android y Chrome
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('📱 [PWA] Evento beforeinstallprompt detectado: la aplicación cumple todos los criterios de instalación.');
    window.deferredPrompt = e;
    window.dispatchEvent(new CustomEvent('pwa-installable', { detail: e }));
  });

  window.addEventListener('appinstalled', () => {
    console.log('🎉 [PWA] Tablero Selectric instalado exitosamente en el sistema.');
    window.deferredPrompt = null;
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)


