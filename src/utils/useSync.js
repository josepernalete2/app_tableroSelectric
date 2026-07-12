import { useEffect, useState, useRef } from 'react';
import useStore from '../store/useStore';

export function useSync() {
  const { syncQueue, removeFromQueue } = useStore();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Semáforo de bloqueo para impedir la ejecución concurrente de la cola de sincronización
  const isSyncingRef = useRef(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Disparar sincronización automática cuando cambie la red o la cola de elementos
  useEffect(() => {
    if (isOnline && syncQueue.length > 0 && !isSyncingRef.current) {
      procesarColaSincronizacion();
    }
  }, [isOnline, syncQueue]);

  const procesarColaSincronizacion = async () => {
    isSyncingRef.current = true;
    setIsSyncing(true);

    const queueCopy = [...syncQueue];

    for (const item of queueCopy) {
      if (!navigator.onLine) {
        setIsOnline(false);
        break; // Detener la sincronización si la red física se desconecta en pleno envío
      }

      let res = null;

      if (item.tipo === 'TABLERO') {
        res = await sincronizarTablero(item.companyId, item.payload);
      } else if (item.tipo === 'SUBESTACION') {
        res = await sincronizarSubestacion(item.companyId, item.payload);
      }

      if (res) {
        if (res.success) {
          // Éxito: borrar inmediatamente de la cola en Zustand + IndexedDB
          removeFromQueue(item.id);
        } else {
          if (res.status === 'NETWORK_ERROR') {
            // Error temporal de conexión: detener la cola para reintentar más tarde
            break;
          } else {
            // Error definitivo del servidor (400, 422, 500, etc.): retirar y notificar
            console.error(`Error definitivo (HTTP ${res.status}) al sincronizar elemento con ID: ${item.id}`);
            alert(`Error de validación al sincronizar la inspección con el servidor.\n\nCódigo de error: ${res.status}\n\nDetalle: Se removió de la cola para evitar atascos.`);
            removeFromQueue(item.id);
          }
        }
      } else {
        // En caso de que no coincida ningún tipo de operación, limpiar de la cola
        removeFromQueue(item.id);
      }
    }

    setIsSyncing(false);
    isSyncingRef.current = false;
  };

  const sincronizarTablero = async (empresaId, tablero) => {
    try {
      // Traducir el Blob a base64 solo para el envío
      let fotoBase64 = null;
      if (tablero.fotoBlob) {
        fotoBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(tablero.fotoBlob);
        });
      }

      const payload = {
        id: tablero.id,
        nombre: tablero.nombre,
        ubicacion: tablero.ubicacion,
        alimentadoPor: tablero.alimentadoPor,
        tipo: tablero.tipo,
        foto: fotoBase64 || tablero.foto || null,
        ia: tablero.barrasPrincipales?.ia || '0',
        ib: tablero.barrasPrincipales?.ib || '0',
        ic: tablero.barrasPrincipales?.ic || '0',
        va: tablero.voltaje?.va || '208',
        vb: tablero.voltaje?.vb || '205',
        vc: tablero.voltaje?.vc || '205',
        acometida: tablero.acometida || '',
        neutroCalibre: tablero.neutroLlegada?.calibre || '',
        neutroObservaciones: tablero.neutroLlegada?.observaciones || '',
        tierraCalibre: tablero.puestaTierra?.calibre || '',
        tierraObservaciones: tablero.puestaTierra?.observaciones || '',
        observacionesGenerales: tablero.observacionesGenerales || '',
        empresaId, // Enviado directamente en el cuerpo del request
        circuitos: (tablero.circuits || []).map((circ) => {
          const poloNum = circ.poles && circ.poles.length > 0 ? circ.poles[0] : 1;
          return {
            numeroPolo: poloNum,
            equipo: circ.equipo || 'RESERVA',
            breakerMarca: circ.breaker?.marca || '',
            breakerTipo: circ.breaker?.tipo || '',
            breakerAmperaje: circ.breaker?.amp ? String(circ.breaker.amp) : '',
            conductorCalibre: circ.conductor || ''
          };
        })
      };

      const response = await fetch('http://localhost:3001/api/tableros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        return { success: false, status: response.status };
      }

      return { success: true };
    } catch (error) {
      console.error('Error de red en sincronizarTablero:', error);
      return { success: false, status: 'NETWORK_ERROR' };
    }
  };

  const sincronizarSubestacion = async (empresaId, subestacion) => {
    try {
      const payload = {
        id: subestacion.id,
        nombre: subestacion.nombre,
        ubicacion: subestacion.ubicacion,
        fecha: subestacion.fecha,
        hora: subestacion.hora,
        inspector: subestacion.inspector,
        nivelTension: subestacion.nivelTension,
        estadoEntorno: subestacion.estadoEntorno,
        obrasCiviles: subestacion.obrasCiviles,
        equiposPrincipales: subestacion.equiposPrincipales,
        puestaTierra: subestacion.puestaTierra,
        edificioControl: subestacion.edificioControl,
        firmaInspector: subestacion.firmaInspector || null,
        firmaSupervisor: subestacion.firmaSupervisor || null,
        empresaId // Enviado en el payload
      };

      const response = await fetch('http://localhost:3001/api/subestaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        return { success: false, status: response.status };
      }

      return { success: true };
    } catch (error) {
      console.error('Error de red en sincronizarSubestacion:', error);
      return { success: false, status: 'NETWORK_ERROR' };
    }
  };

  return { isOnline, isSyncing, pendingCount: syncQueue.length, triggerSync: procesarColaSincronizacion };
}
