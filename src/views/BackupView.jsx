import React, { useState, useRef } from 'react';
import useStore from '../store/useStore';
import { API_BASE_URL } from '../utils/api';
import { 
  ShieldCheck, 
  Download, 
  UploadCloud, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Layers, 
  Zap, 
  Clock, 
  FileCode,
  Sparkles,
  RefreshCw,
  HardDrive
} from 'lucide-react';

export const BackupView = () => {
  const { user, token, companies, importCompanies, showToast } = useStore();
  const fileInputRef = useRef(null);

  // Estados de exportación
  const [isExporting, setIsExporting] = useState(false);
  const [exportStats, setExportStats] = useState(null);

  // Estados de importación
  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState(null);

  // Estadísticas locales actuales
  const totalEmpresas = companies?.length || 0;
  const totalProyectos = companies?.reduce((acc, c) => acc + (c.proyectos?.length || 0), 0) || 0;
  const totalTableros = companies?.reduce((acc, c) => {
    const tabComp = c.tableros?.length || 0;
    const tabProy = c.proyectos?.reduce((pAcc, p) => pAcc + (p.tableros?.length || 0), 0) || 0;
    return acc + tabComp + tabProy;
  }, 0) || 0;
  const totalElementos = companies?.reduce((acc, c) => {
    const elComp = c.elementosUnifilares?.length || 0;
    const elProy = c.proyectos?.reduce((pAcc, p) => pAcc + (p.elementosUnifilares?.length || 0), 0) || 0;
    return acc + elComp + elProy;
  }, 0) || 0;

  /**
   * Manejador de exportación y descarga de archivo JSON (Stream/Blob en memoria)
   */
  const handleExportBackup = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportStats(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/backups/export`, {
        method: 'GET',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) {
        let errorMsg = 'Error al exportar la base de datos';
        try {
          const errData = await response.json();
          errorMsg = errData.error || errorMsg;
        } catch (_) {
          errorMsg = `Error del servidor (${response.status}): ${response.statusText}`;
        }
        throw new Error(errorMsg);
      }

      // Obtener el nombre del archivo desde las cabeceras o generar uno con timestamp
      let filename = `backup_selectric_${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.json`;
      const disposition = response.headers.get('content-disposition');
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      // Convertir la respuesta a Blob y disparar descarga
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      const sizeKb = (blob.size / 1024).toFixed(1);
      setExportStats({
        filename,
        size: `${sizeKb} KB`,
        timestamp: new Date().toLocaleTimeString()
      });

      if (showToast) showToast('Copia de seguridad descargada exitosamente.', 'success');
    } catch (err) {
      console.error('[BackupView] Error en exportación:', err);
      if (showToast) showToast(err.message || 'Error al descargar la copia de seguridad', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Manejador de selección de archivo JSON para restaurar base de datos
   */
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      if (showToast) showToast('Por favor selecciona un archivo con extensión .json', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const confirmRestore = window.confirm(
      `⚠️ ¿Estás seguro de que deseas restaurar la base de datos con el archivo "${file.name}"?\n\nEsta acción reemplazará la información existente en la base de datos.`
    );
    if (!confirmRestore) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsImporting(true);
    setImportStats(null);

    try {
      const text = await file.text();
      let parsedData;
      try {
        parsedData = JSON.parse(text);
      } catch (parseErr) {
        throw new Error('El archivo seleccionado no contiene un formato JSON válido.');
      }

      // Extraer datos si vienen envueltos en { data: [...] } o directamente [...]
      const payloadData = Array.isArray(parsedData) 
        ? parsedData 
        : (parsedData.data || parsedData.empresas || []);

      if (!Array.isArray(payloadData) || payloadData.length === 0) {
        throw new Error('El archivo no contiene registros de empresas o proyectos válidos.');
      }

      // Enviar al servidor para restaurar
      const response = await fetch(`${API_BASE_URL}/api/backups/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ data: payloadData })
      });

      const result = await response.json();
      if (!response.ok || !result.ok && !result.success) {
        throw new Error(result.error || 'Error al importar datos en el servidor.');
      }

      // Actualizar estado en cliente
      if (importCompanies) {
        importCompanies(payloadData);
      }

      setImportStats({
        filename: file.name,
        empresasRestauradas: payloadData.length,
        timestamp: new Date().toLocaleTimeString()
      });

      if (showToast) showToast('Base de datos restaurada correctamente.', 'success');
    } catch (err) {
      console.error('[BackupView] Error en importación:', err);
      if (showToast) showToast(err.message || 'Error al restaurar la copia de seguridad', 'error');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Encabezado Principal */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-xl">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/20 shrink-0">
              <Database className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                  Módulo de Copias de Seguridad
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  Nivel 1 JSON
                </span>
              </div>
              <p className="text-slate-400 text-sm mt-1 max-w-xl">
                Exporta y restaura toda la estructura de proyectos, tableros y circuitos eléctricos en memoria sin dependencias de disco ni pérdidas de datos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 px-3 py-2 rounded-2xl self-start md:self-auto text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Rol: <strong className="text-slate-200">{user?.role || 'ADMIN'}</strong></span>
          </div>
        </div>

        {/* Resumen de Datos Locales */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800">
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-3.5">
            <span className="text-xs text-slate-400">Empresas</span>
            <p className="text-xl font-bold text-white mt-0.5">{totalEmpresas}</p>
          </div>
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-3.5">
            <span className="text-xs text-slate-400">Proyectos</span>
            <p className="text-xl font-bold text-amber-400 mt-0.5">{totalProyectos}</p>
          </div>
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-3.5">
            <span className="text-xs text-slate-400">Tableros</span>
            <p className="text-xl font-bold text-cyan-400 mt-0.5">{totalTableros}</p>
          </div>
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-3.5">
            <span className="text-xs text-slate-400">Unifilares</span>
            <p className="text-xl font-bold text-emerald-400 mt-0.5">{totalElementos}</p>
          </div>
        </div>
      </div>

      {/* Grid de Acciones: Exportación e Importación */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tarjeta: Exportación */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-lg relative overflow-hidden">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Exportar Base de Datos</h3>
                <p className="text-xs text-slate-400">Descarga un archivo JSON estructurado con metadatos</p>
              </div>
            </div>

            <p className="text-slate-300 text-sm leading-relaxed mt-4">
              Genera una instantánea completa de la base de datos procesada en memoria. Compatible con entornos Serverless (Vercel) y contenedores (Railway).
            </p>

            {exportStats && (
              <div className="mt-4 p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1 text-xs text-slate-300">
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Última descarga completada</span>
                </div>
                <p className="text-slate-400 truncate">Archivo: {exportStats.filename}</p>
                <p className="text-slate-400">Tamaño: {exportStats.size} • {exportStats.timestamp}</p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-slate-800">
            <button
              onClick={handleExportBackup}
              disabled={isExporting}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-[0.98] disabled:opacity-50 text-slate-950 font-bold rounded-2xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Generando y descargando JSON...</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>Exportar / Descargar Copia (.json)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tarjeta: Importación y Restauración */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-lg relative overflow-hidden">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Restaurar Base de Datos</h3>
                <p className="text-xs text-slate-400">Cargar snapshot desde un archivo JSON local</p>
              </div>
            </div>

            <p className="text-slate-300 text-sm leading-relaxed mt-4">
              Restaura la estructura completa de proyectos eléctricos a partir de un respaldo previo. Las claves foráneas y relaciones se regeneran atómicamente.
            </p>

            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />

            {importStats && (
              <div className="mt-4 p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1 text-xs text-slate-300">
                <div className="flex items-center gap-1.5 text-cyan-400 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Restauración exitosa</span>
                </div>
                <p className="text-slate-400 truncate">Origen: {importStats.filename}</p>
                <p className="text-slate-400">{importStats.empresasRestauradas} empresas restauradas • {importStats.timestamp}</p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-slate-800">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-5 bg-slate-800 hover:bg-slate-700 hover:text-cyan-300 active:scale-[0.98] disabled:opacity-50 text-slate-200 font-bold rounded-2xl border border-slate-700 transition-all cursor-pointer"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                  <span>Restaurando datos...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-5 h-5 text-cyan-400" />
                  <span>Seleccionar archivo (.json)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tarjeta Informativa de Arquitectura */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 text-xs text-slate-400 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-slate-300 font-semibold">Arquitectura Serverless y Railway Ready</p>
          <p>
            El módulo de exportación transmite el volcado mediante Streams de Node.js en memoria sin invocar binarios nativos del sistema operativo ni escribir en disco, garantizando compatibilidad inmediata con Vercel y futuras migraciones a Railway.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BackupView;