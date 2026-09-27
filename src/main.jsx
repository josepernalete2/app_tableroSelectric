import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Registro del Service Worker para PWA y Notificaciones Push
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // Forzar chequeo de actualización al cargar
      reg.update().catch(() => {});
      
      reg.onupdatefound = () => {
        const installingWorker = reg.installing;
        if (installingWorker) {
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🔄 Nueva versión PWA v2.3.0 disponible. Recargando para actualizar scripts...');
            }
          };
        }
      };
    }).catch((err) => {
      console.warn('⚠️ No se pudo registrar el Service Worker:', err);
    });
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)


