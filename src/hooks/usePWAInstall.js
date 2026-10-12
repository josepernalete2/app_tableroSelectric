import { useState, useEffect } from 'react';

/**
 * Hook para gestionar la instalación nativa de la PWA en Android/Chrome y tablets.
 */
export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
      if (isStandalone) {
        setIsInstalled(true);
      }
    }

    const handleBeforeInstallPrompt = (e) => {
      setInstallPrompt(e);
      setIsInstallable(true);
    };

    const handleCustomEvent = (e) => {
      if (e.detail) {
        setInstallPrompt(e.detail);
        setIsInstallable(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-installable', handleCustomEvent);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.deferredPrompt) {
      setInstallPrompt(window.deferredPrompt);
      setIsInstallable(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-installable', handleCustomEvent);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    const promptEvent = installPrompt || window.deferredPrompt;
    if (!promptEvent) return false;

    try {
      promptEvent.prompt();
      const choiceResult = await promptEvent.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
      }
      setInstallPrompt(null);
      window.deferredPrompt = null;
      return choiceResult.outcome === 'accepted';
    } catch (err) {
      console.warn('[PWA] Error al invocar prompt de instalación:', err);
      return false;
    }
  };

  return { isInstallable, isInstalled, promptInstall };
}

export default usePWAInstall;
