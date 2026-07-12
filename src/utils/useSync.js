import { useEffect, useState, useRef } from 'react';
import useStore from '../store/useStore';

export function useSync() {
  const { syncQueue, removeFromQueue, companies } = useStore();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Flag de bloqueo mutable mediante ref para evitar ejecuciones concurrentes y bucles infinitos
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

  // Sincronizar de forma automática al detectar conexión si la cola tiene elementos
  useEffect(() => {
    if (isOnline && syncQueue.length > 0 && !isSyncingRef.current) {
      procesarColaSincronizacion();
    }
  }, [isOnline, syncQueue]);

  const procesarColaSincronizacion = async () => {
    // Activar bloqueo de sincronización
    isSyncingRef.current = true;
    setIsSyncing(true);

    // Iterar una copia de la cola actual en orden FIFO
    const queueCopy = [...syncQueue];
    
    for (const item of queueCopy) {
      if (!navigator.onLine) {
        setIsOnline(false);
        break; // Detener la sincronización si la conexión física se cae en el proceso
      }

      if (item.action === 'CREATE_TABLERO') {
        const company = companies.find((c) => c.id === item.companyId);
        const tableroCompleto = company?.tableros.find((t) => t.id === item.tableroId);

        if (tableroCompleto) {
          const res = await subirTableroServidor(item.companyId, tableroCompleto);
          
          if (res.success) {
            // Caso de Éxito (HTTP 200/201): Limpiar del store y persistir en IndexedDB
            removeFromQueue(item.tableroId);
          } else {
            // Manejo diferencial de errores para evitar bucles infinitos
            if (res.status === 'NETWORK_ERROR') {
              // Error de red temporal: detener procesamiento para reintentar cuando la red esté estable
              break;
            } else {
              // Error lógico/servidor definitivo (400, 422, 500, etc.)
              console.error(`Error definitivo en la sincronización (status: ${res.status}) del tablero: ${tableroCompleto.nombre}`);
              
              alert(`Error al sincronizar el tablero "${tableroCompleto.nombre}" con el servidor central.\n\nCódigo de error: ${res.status}\n\nDetalle: El elemento ha sido retirado de la cola de sincronización para evitar bucles de red. Por favor, verifique el contenido de la inspección.`);
              
              // Remover de la cola de sincronización para no atascar el flujo del resto de tableros
              removeFromQueue(item.tableroId);
            }
          }
        } else {
          // Si el tablero no se encuentra en el store, limpiarlo de la cola
          removeFromQueue(item.tableroId);
        }
      }
    }

    // Desactivar bloqueo de sincronización
    setIsSyncing(false);
    isSyncingRef.current = false;
  };

  const subirTableroServidor = async (empresaId, tablero) => {
    try {
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

      const backendUrl = `http://localhost:3001/api/empresas/${empresaId}/tableros`;
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        return { success: false, status: response.status };
      }

      return { success: true };
    } catch (error) {
      console.error('Error al sincronizar tablero:', error);
      return { success: false, status: 'NETWORK_ERROR' };
    }
  };

  return { isOnline, isSyncing, pendingCount: syncQueue.length, triggerSync: procesarColaSincronizacion };
}
