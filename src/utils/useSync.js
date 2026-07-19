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

      if (item.tipo === 'PROYECTO') {
        res = await sincronizarProyecto(item.companyId, item.payload);
      } else if (item.tipo === 'ELEMENTO_UNIFILAR' || item.tipo === 'TABLERO') {
        res = await sincronizarElementoUnifilar(item.companyId, item.payload);
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
            alert(`Error de validación al sincronizar el elemento con el servidor.\n\nCódigo de error: ${res.status}\n\nDetalle: Se removió de la cola para evitar atascos.`);
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

  const sincronizarProyecto = async (empresaId, proyecto) => {
    try {
      const payload = {
        id: proyecto.id,
        nombre: proyecto.nombre,
        descripcion: proyecto.descripcion || '',
        empresaId
      };

      const response = await fetch('http://localhost:3001/api/proyectos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        return { success: false, status: response.status };
      }

      return { success: true };
    } catch (error) {
      console.error('Error de red en sincronizarProyecto:', error);
      return { success: false, status: 'NETWORK_ERROR' };
    }
  };

  const sincronizarElementoUnifilar = async (empresaId, elemento) => {
    try {
      // Usar FormData para transferir el Blob binario offline
      const formData = new FormData();
      formData.append('id', elemento.id);
      formData.append('nombre', elemento.nombre);
      formData.append('tipoElemento', elemento.tipoElemento || 'TABLERO');
      formData.append('ubicacion', elemento.ubicacion || '');
      formData.append('alimentadoPor', elemento.alimentadoPor || '');
      formData.append('observacionesGenerales', elemento.observacionesGenerales || '');
      formData.append('proyectoId', elemento.proyectoId);
      if (empresaId) {
        formData.append('empresaId', empresaId);
      }

      // Convertir datosTecnicos a JSON String para que viaje vía FormData
      formData.append('datosTecnicos', JSON.stringify(elemento.datosTecnicos || {}));

      // Si existe fotoBlob binario (cargada offline), se adjunta
      if (elemento.fotoBlob) {
        const fileExt = elemento.fotoBlob.type ? elemento.fotoBlob.type.split('/')[1] : 'jpg';
        formData.append('foto', elemento.fotoBlob, `foto_${elemento.id}.${fileExt}`);
      } else if (elemento.foto) {
        formData.append('fotoUrl', elemento.foto);
      }

      const response = await fetch('http://localhost:3001/api/elementos-unifilares', {
        method: 'POST',
        // Nota: NO definir Content-Type, el navegador lo añade con el boundary adecuado de forma automática
        body: formData
      });

      if (!response.ok) {
        return { success: false, status: response.status };
      }

      const resJson = await response.json();
      // Si la carga fue exitosa y devolvió la URL de la imagen guardada en PostgreSQL
      if (resJson.data && resJson.data.foto) {
        useStore.getState().updateElementoUnifilar(elemento.proyectoId, elemento.id, {
          foto: `http://localhost:3001${resJson.data.foto}`, // URL absoluta de la foto en el servidor
          fotoBlob: null // Limpiamos el Blob temporal una vez sincronizado
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error de red en sincronizarElementoUnifilar:', error);
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
        proyectoId: subestacion.proyectoId,
        empresaId
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
