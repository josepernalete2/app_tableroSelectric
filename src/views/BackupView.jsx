import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { Zap, ShieldCheck, Download, Trash, Clock } from 'lucide-react';

export const BackupView = () => {
  const navigate = useNavigate();
  const { user } = useStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [backupType, setBackupType] = useState('completo');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  const [backups, setBackups] = useState([]);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Cargar backups al montar el componente
  useEffect(() => {
    cargarBackups();
  }, []);

  const cargarBackups = async () => {
    try {
      const lista = await useStore().listarBackupsLocales();
      setBackups(lista);
    } catch (e) {
      console.error('Error cargando backups:', e);
      setMessage('Error al cargar la lista de backups');
      setMessageType('error');
    }
  };

  const generarBackup = async (tipo) => {
    setIsGenerating(true);
    setMessage('');
    
    const result = await useStore().backupDatos(tipo);
    
    setIsGenerating(false);
    
    if (result.success) {
      setMessage(`Backup ${tipo} guardado: ${result.filename}`);
      setMessageType('success');
      cargarBackups(); // Actualizar lista
    } else {
      setMessage(`Error: ${result.error || 'unknown'}`);
      setMessageType('error');
    }
  };

  const eliminarBackup = async (nombre) => {
    setDeleting(true);
    await useStore().eliminarBackupLocal(nombre);
    setDeleting(false);
    cargarBackups();
    setMessage(`Backup ${nombre} eliminado`);
    setMessageType('success');
  };

  const descargarBackup = async (nombre, contenidoBase64) => {
    try {
      // Decodificar base64 y crear blob
      const byteCharacters = atob(contenidoBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/json' });
      
      // Crear enlace de descarga
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setMessage(`Descargando ${nombre}`);
    } catch (e) {
      console.error('Error descargando backup:', e);
      setMessage('Error al descargar el archivo');
      setMessageType('error');
    }
  };

  // Manejar mensaje temporal
  useEffect(() => {
    if (message) {
      const timeout = setTimeout(() => {
        setMessage('');
        setMessageType('success');
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [message]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6 p-6 bg-slate-900 rounded-2xl border border-slate-700 shadow-lg">
          <div className="flex items-start space-x-3">
            <ShieldCheck className="w-8 h-8 text-amber-500 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-bold">Backup y Restauración</h2>
              <p className="text-slate-400 text-sm mt-1">
                Copia de seguridad local de tu información de inspecciones
              </p>
            </div>
          </div>
        </div>

        {/* Sección: Generar Backup */}
        <div className="mb-6 bg-slate-900 rounded-2xl border border-slate-700 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-200 mb-4">Generar Nuevo Backup</h3>
          
          <div className="space-y-3">
            <button
              onClick={() => generarBackup('completo')}
              className={`w-full py-3 px-4 rounded-xl text-sm font-medium transition-colors ${
                backupType === 'completo' 
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-600' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              disabled={isGenerating}
            >
              <Clock className="mr-2 w-4 h-4" /> Backup Completo
              {(isGenerando && tipo === 'completo') && <span className="ml-2 text-amber-400">Generando...</span>}
            </button>

            <button
              onClick={() => generarBackup('resumido')}
              className={`w-full py-3 px-4 rounded-xl text-sm font-medium transition-colors ${
                backupType === 'resumido'
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-600' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              disabled={isGenerating}
            >
              <Download className="mr-2 w-4 h-4" /> Backup Resumido
            </button>
          </div>

          {isGenerating && (
            <div className="mt-3 text-center text-amber-400 text-sm">
              <span className="mr-1" /> Generando backup {backupType}...
            </div>
          )}

          {message && (
            <p className={`mt-3 text-${messageType === 'success' ? 'green-400' : 'red-400'} text-sm ${messageType === 'success' ? 'font-medium' : ''}`}>
              {message}
            </p>
          )}
        </div>

        {/* Sección: Mis Backups */}
        <div className="mt-6 bg-slate-900 rounded-2xl border border-slate-700 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-200 mb-4">Mis Backups Locales</h3>
          
          {backups.length === 0 ? (
            <p className="text-slate-500 text-sm">
              No hay backups guardados. Genera tu primer backup arriba.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-600">
                    <th className="text-left text-slate-400 font-medium py-3 px-2">Archivo</th>
                    <th className="text-left text-slate-400 font-medium py-3 px-2">Fecha</th>
                    <th className="text-left text-slate-400 font-medium py-3 px-2">Tamaño</th>
                    <th className="text-left text-slate-400 font-medium py-3 px-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((backup) => {
                    const fecha = backup.fecha || 'desconocida';
                    const tamano = backup.size 
                      ? (backup.size / 1024).toFixed(1) + ' KB' 
                      : '—';
                    
                    return (
                      <tr key={backup.nombre} className="border-b border-slate-600 hover:bg-slate-950">
                        <td className="py-3 px-2 font-medium">
                          {backup.nombre}
                        </td>
                        <td className="py-3 px-2 text-slate-400 text-xs">
                          {fecha}
                        </td>
                        <td className="py-3 px-2 text-slate-400 text-xs">
                          {tamano}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex space-x-2">
                            <button
                              onClick =() => descargarBackup(backup.nombre, backup.archivo)
                              className="text-amber-400 hover:text-amber-300 transition-colors"
                              title="Descargar"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick =() => eliminarBackup(backup.nombre)
                              className="text-red-400 hover:text-red-300 transition-colors"
                              title="Eliminar"
                              disabled={deleting}
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BackupView;