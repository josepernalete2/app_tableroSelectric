import React, { useState, useEffect, useRef, useMemo } from 'react';
import useStore from '../store/useStore';
import { API_BASE_URL } from '../utils/api';
import { 
  ShieldCheck, 
  ShieldAlert,
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
  HardDrive,
  Building2,
  Send,
  Key,
  Copy,
  Check,
  Search,
  Filter,
  ExternalLink,
  ChevronRight,
  FileCheck,
  Info,
  X,
  Lock,
  Cpu
} from 'lucide-react';

export const BackupView = () => {
  const { user, token, companies, importCompanies, showToast } = useStore();
  const fileInputRef = useRef(null);

  // Estados de Navegación y Pestañas
  const [activeTab, setActiveTab] = useState('empresas'); // 'empresas' | 'global'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'VINCULADOS' | 'PENDIENTES'

  // Estados de Datos de Empresas (Resumen)
  const [empresasResumen, setEmpresasResumen] = useState([]);
  const [isLoadingEmpresas, setIsLoadingEmpresas] = useState(false);

  // Estados de Modales
  const [selectedPinModal, setSelectedPinModal] = useState(null); // { empresa, pin, isGenerating }
  const [selectedCertModal, setSelectedCertModal] = useState(null); // { ficha, isLoading }
  const [copiedPin, setCopiedPin] = useState(false);
  const [copiedCert, setCopiedCert] = useState(false);

  // Estados de Acciones Globales
  const [isExportingGlobal, setIsExportingGlobal] = useState(false);
  const [isExecutingGlobalPipeline, setIsExecutingGlobalPipeline] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState(null);
  const [exportStats, setExportStats] = useState(null);

  // Estado de descarga aislada por empresa
  const [downloadingEmpresaId, setDownloadingEmpresaId] = useState(null);

  /**
   * Cargar listado de empresas con métricas de resguardo desde la API
   */
  const fetchEmpresasResumen = async () => {
    setIsLoadingEmpresas(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/backup/resumen-empresas`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const data = await response.json();
      if (response.ok && data.ok) {
        setEmpresasResumen(data.data || []);
      }
    } catch (err) {
      console.error('Error al cargar resumen de empresas:', err);
    } finally {
      setIsLoadingEmpresas(false);
    }
  };

  useEffect(() => {
    fetchEmpresasResumen();
  }, [token]);

  // Cálculos consolidados para KPIs
  const totalEmpresas = empresasResumen.length || companies?.length || 0;
  const totalTableros = empresasResumen.reduce((acc, e) => acc + (e.totales?.tableros || 0), 0);
  const totalCircuitos = empresasResumen.reduce((acc, e) => acc + (e.totales?.circuitos || 0), 0);
  const totalActivosProtegidos = empresasResumen.reduce((acc, e) => acc + (e.totales?.totalActivos || 0), 0);
  const totalVinculadosTelegram = empresasResumen.filter(e => e.telegramChatId).length;

  // Filtrado de empresas
  const filteredEmpresas = useMemo(() => {
    return empresasResumen.filter(emp => {
      const matchesSearch = emp.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            emp.rif.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (statusFilter === 'VINCULADOS') return !!emp.telegramChatId;
      if (statusFilter === 'PENDIENTES') return !emp.telegramChatId;
      return true;
    });
  }, [empresasResumen, searchQuery, statusFilter]);

  /**
   * Dispara el pipeline global de respaldo (R2 + Telegram + PostgreSQL + Memoria)
   */
  const handleTriggerGlobalPipeline = async () => {
    if (isExecutingGlobalPipeline) return;
    setIsExecutingGlobalPipeline(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/backup/cloud`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          nombre: `Respaldo Ejecutivo ${new Date().toLocaleDateString('es-VE')}`,
          descripcion: 'Respaldo maestro disparado desde el Centro de Control Web'
        })
      });

      const resData = await response.json();
      if (!response.ok || !resData.ok) {
        throw new Error(resData.error || 'Error al ejecutar el respaldo');
      }

      if (showToast) {
        showToast('Respaldo maestro generado y distribuido exitosamente.', 'success');
      }
      fetchEmpresasResumen();
    } catch (err) {
      console.error('[BackupView] Error en pipeline maestro:', err);
      if (showToast) showToast(err.message || 'Fallo en la ejecución del respaldo', 'error');
    } finally {
      setIsExecutingGlobalPipeline(false);
    }
  };

  /**
   * Exportar y descargar el volcado JSON maestro en memoria
   */
  const handleExportGlobalJson = async () => {
    if (isExportingGlobal) return;
    setIsExportingGlobal(true);
    setExportStats(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/backups/export`, {
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
      });

      if (!response.ok) throw new Error('Error al generar archivo JSON maestro');

      let filename = `backup_maestro_selectric_${new Date().toISOString().slice(0, 10)}.json`;
      const disposition = response.headers.get('content-disposition');
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match?.[1]) filename = match[1];
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setExportStats({
        filename,
        size: `${(blob.size / 1024).toFixed(1)} KB`,
        timestamp: new Date().toLocaleTimeString('es-VE')
      });

      if (showToast) showToast('Archivo de respaldo maestro descargado.', 'success');
    } catch (err) {
      if (showToast) showToast(err.message || 'Error al descargar respaldo', 'error');
    } finally {
      setIsExportingGlobal(false);
    }
  };

  /**
   * Generar o mostrar PIN de enlace para Telegram de una empresa
   */
  const handleOpenPinModal = async (empresa) => {
    setSelectedPinModal({ empresa, pin: empresa.telegramBackupPin, isGenerating: false });
    if (!empresa.telegramBackupPin) {
      try {
        setSelectedPinModal(prev => ({ ...prev, isGenerating: true }));
        const response = await fetch(`${API_BASE_URL}/api/backup/generar-pin/${empresa.id}`, {
          method: 'POST',
          headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
        });
        const resData = await response.json();
        if (response.ok && resData.ok) {
          setSelectedPinModal({ empresa, pin: resData.data.telegramBackupPin, isGenerating: false });
          fetchEmpresasResumen();
        }
      } catch (err) {
        console.error('Error al generar PIN:', err);
      }
    }
  };

  /**
   * Abrir modal de Certificado Ejecutivo de Resguardo
   */
  const handleOpenCertModal = async (empresa) => {
    setSelectedCertModal({ ficha: null, isLoading: true });
    try {
      const response = await fetch(`${API_BASE_URL}/api/backup/empresa/${empresa.id}/estado`, {
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
      });
      const data = await response.json();
      if (response.ok && data.ok) {
        setSelectedCertModal({ ficha: data.data, isLoading: false });
      } else {
        throw new Error(data.error || 'No se pudo obtener el certificado');
      }
    } catch (err) {
      if (showToast) showToast(err.message, 'error');
      setSelectedCertModal(null);
    }
  };

  /**
   * Descargar snapshot aislado de una sola empresa
   */
  const handleDownloadEmpresaSnapshot = async (empresaId, empresaNombre) => {
    setDownloadingEmpresaId(empresaId);
    try {
      const response = await fetch(`${API_BASE_URL}/api/backup/empresa/${empresaId}/export`, {
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
      });

      if (!response.ok) throw new Error('Error al exportar datos de la empresa');

      const blob = await response.blob();
      const slug = empresaNombre.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const filename = `backup_${slug}_${new Date().toISOString().slice(0, 10)}.json`;

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      if (showToast) showToast(`Snapshot de ${empresaNombre} descargado con éxito.`, 'success');
      fetchEmpresasResumen();
    } catch (err) {
      if (showToast) showToast(err.message, 'error');
    } finally {
      setDownloadingEmpresaId(null);
    }
  };

  /**
   * Manejador de importación y restauración de base de datos
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
      `⚠️ ¿Estás seguro de que deseas restaurar la base de datos con "${file.name}"?\n\nEsta acción reemplazará la información existente en la base de datos.`
    );
    if (!confirmRestore) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsImporting(true);
    setImportStats(null);

    try {
      const text = await file.text();
      const parsedData = JSON.parse(text);
      const payloadData = Array.isArray(parsedData) 
        ? parsedData 
        : (parsedData.data || parsedData.empresas || []);

      if (!Array.isArray(payloadData) || payloadData.length === 0) {
        throw new Error('El archivo no contiene registros válidos de empresas o proyectos.');
      }

      const response = await fetch(`${API_BASE_URL}/api/backups/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ data: payloadData })
      });

      const result = await response.json();
      if (!response.ok || (!result.ok && !result.success)) {
        throw new Error(result.error || 'Error al restaurar datos en el servidor.');
      }

      if (importCompanies) importCompanies(payloadData);

      setImportStats({
        filename: file.name,
        empresasRestauradas: payloadData.length,
        timestamp: new Date().toLocaleTimeString('es-VE')
      });

      if (showToast) showToast('Base de datos restaurada correctamente.', 'success');
      fetchEmpresasResumen();
    } catch (err) {
      if (showToast) showToast(err.message || 'Error al restaurar', 'error');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16 px-2 sm:px-4">
      {/* ========================================================================= */}
      {/* 1. ENCABEZADO EJECUTIVO Y SELECTOR DE PESTAÑAS */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -top-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-xl shadow-amber-500/20 shrink-0">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                  Centro de Control & Resiliencia
                </h1>
                <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Sistema Protegido
                </span>
              </div>
              <p className="text-slate-400 text-sm mt-1 max-w-2xl leading-relaxed">
                Gestión integral de continuidad operativa, respaldos maestros en memoria, resguardo individual por empresa y certificación criptográfica de activos eléctricos.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleTriggerGlobalPipeline}
              disabled={isExecutingGlobalPipeline}
              className="flex items-center gap-2.5 py-3 px-5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-[0.98] disabled:opacity-50 text-slate-950 font-bold rounded-2xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer text-sm"
            >
              {isExecutingGlobalPipeline ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Ejecutando Respaldo Maestro...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-slate-950" />
                  <span>Respaldo Inmediato del Sistema</span>
                </>
              )}
            </button>

            <button
              onClick={fetchEmpresasResumen}
              disabled={isLoadingEmpresas}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-2xl border border-slate-700 transition-all cursor-pointer"
              title="Refrescar métricas"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingEmpresas ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. TARJETAS DE MÉTRICAS CLAVE (KPIS) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-8 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Empresas Auditadas</span>
              <Building2 className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="text-2xl font-black text-white mt-2">{totalEmpresas}</p>
            <span className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3 h-3" /> {totalEmpresas} con resguardo activo
            </span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Activos Eléctricos</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-amber-400 mt-2">{totalActivosProtegidos}</p>
            <span className="text-[11px] text-slate-400 mt-1">
              {totalTableros} tableros • {totalCircuitos} polos
            </span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Canales de Resguardo</span>
              <Send className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-2xl font-black text-indigo-400">{totalVinculadosTelegram}</span>
              <span className="text-xs text-slate-400">/ {totalEmpresas} chats</span>
            </div>
            <span className="text-[11px] text-indigo-300 mt-1 flex items-center gap-1">
              Bot @SelectricBackup_bot
            </span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Frecuencia Automática</span>
              <Clock className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-sm font-bold text-white mt-2">02:00 AM (UTC-4)</p>
            <span className="text-[11px] text-slate-400 mt-1">
              Nightly Cron + On-Demand
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* NAVEGACIÓN ENTRE PESTAÑAS */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-2 mt-8 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 w-fit">
          <button
            onClick={() => setActiveTab('empresas')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'empresas'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Control por Empresas ({empresasResumen.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('global')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'global'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Snapshots Maestros & Disaster Recovery</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PESTAÑA 1: CONTROL DE RESGUARDO POR EMPRESA */}
      {/* ========================================================================= */}
      {activeTab === 'empresas' && (
        <div className="space-y-6">
          {/* Barra de Filtros y Búsqueda */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar empresa por nombre o RIF..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              <Filter className="w-4 h-4 text-slate-500 shrink-0" />
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todas ({empresasResumen.length})
              </button>
              <button
                onClick={() => setStatusFilter('VINCULADOS')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  statusFilter === 'VINCULADOS'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Con Telegram ({totalVinculadosTelegram})
              </button>
              <button
                onClick={() => setStatusFilter('PENDIENTES')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  statusFilter === 'PENDIENTES'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sin Telegram ({totalEmpresas - totalVinculadosTelegram})
              </button>
            </div>
          </div>

          {/* Listado de Tarjetas de Empresas */}
          {isLoadingEmpresas ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Auditando fichas de resguardo por empresa...</p>
            </div>
          ) : filteredEmpresas.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
              <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="font-bold text-white">No se encontraron empresas</p>
              <p className="text-xs mt-1">Prueba con otro término de búsqueda o filtro.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredEmpresas.map((emp) => (
                <div
                  key={emp.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-3xl p-6 flex flex-col justify-between shadow-xl transition-all relative overflow-hidden group"
                >
                  <div className="space-y-4">
                    {/* Header de la Tarjeta */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 border border-slate-700 flex items-center justify-center text-amber-400 font-bold shrink-0">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-white group-hover:text-amber-400 transition-colors">
                            {emp.nombre}
                          </h3>
                          <p className="text-xs text-slate-400 font-mono">RIF: {emp.rif}</p>
                        </div>
                      </div>

                      {emp.telegramChatId ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center gap-1.5 shrink-0">
                          <Send className="w-3 h-3" />
                          Telegram Activo
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center gap-1.5 shrink-0">
                          <Key className="w-3 h-3" />
                          PIN Pendiente
                        </span>
                      )}
                    </div>

                    {/* Ficha de Activos Resguardados */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 text-xs">
                      <div className="text-center p-1.5">
                        <span className="text-slate-500 text-[11px] block">Proyectos</span>
                        <span className="font-bold text-white text-sm">{emp.totales?.proyectos || 0}</span>
                      </div>
                      <div className="text-center p-1.5 border-x border-slate-800">
                        <span className="text-slate-500 text-[11px] block">Tableros</span>
                        <span className="font-bold text-amber-400 text-sm">{emp.totales?.tableros || 0}</span>
                      </div>
                      <div className="text-center p-1.5">
                        <span className="text-slate-500 text-[11px] block">Total Equipos</span>
                        <span className="font-bold text-emerald-400 text-sm">{emp.totales?.totalActivos || 0}</span>
                      </div>
                    </div>

                    {/* Metadata de Resguardo */}
                    <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>
                          {emp.ultimoBackupAt 
                            ? `Último: ${new Date(emp.ultimoBackupAt).toLocaleDateString('es-VE')}`
                            : 'Resguardo pendiente'}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-500">
                        {emp.certificadoHash}
                      </span>
                    </div>
                  </div>

                  {/* Acciones de la Tarjeta */}
                  <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenCertModal(emp)}
                        className="flex items-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
                        title="Ver Certificado Ejecutivo de Resguardo"
                      >
                        <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Certificado</span>
                      </button>

                      <button
                        onClick={() => handleDownloadEmpresaSnapshot(emp.id, emp.nombre)}
                        disabled={downloadingEmpresaId === emp.id}
                        className="flex items-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                        title="Descargar snapshot JSON aislado"
                      >
                        {downloadingEmpresaId === emp.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                        ) : (
                          <Download className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        <span>JSON Aislado</span>
                      </button>
                    </div>

                    <button
                      onClick={() => handleOpenPinModal(emp)}
                      className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        emp.telegramChatId
                          ? 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      <Key className="w-3.5 h-3.5" />
                      <span>{emp.telegramChatId ? 'Re-vincular PIN' : 'Vincular Telegram'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 2: SNAPSHOTS MAESTROS Y DISASTER RECOVERY (ADMIN) */}
      {/* ========================================================================= */}
      {activeTab === 'global' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tarjeta: Exportar Maestro */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col justify-between shadow-xl relative overflow-hidden">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                    <Download className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">Snapshot Maestro en Memoria</h3>
                    <p className="text-xs text-slate-400">Descarga directa sin bloqueos de disco (Serverless & Docker)</p>
                  </div>
                </div>

                <p className="text-slate-300 text-sm leading-relaxed">
                  Genera el volcado total estructurado de la base de datos (empresas, proyectos, tableros, circuitos, alimentadores, mediciones, CCM y termografías) en un único archivo JSON compatible con Disaster Recovery.
                </p>

                {exportStats && (
                  <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1 text-xs text-slate-300">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Último snapshot maestro descargado</span>
                    </div>
                    <p className="text-slate-400 font-mono truncate">{exportStats.filename}</p>
                    <p className="text-slate-400">Tamaño: {exportStats.size} • {exportStats.timestamp}</p>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-slate-800">
                <button
                  onClick={handleExportGlobalJson}
                  disabled={isExportingGlobal}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 px-5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-[0.98] disabled:opacity-50 text-slate-950 font-bold rounded-2xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer text-sm"
                >
                  {isExportingGlobal ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Generando archivo JSON...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      <span>Descargar Snapshot Maestro (.json)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Tarjeta: Importación / Restauración */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col justify-between shadow-xl relative overflow-hidden">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">Restauración y Reconstrucción</h3>
                    <p className="text-xs text-slate-400">Recuperación completa atómica con integridad referencial</p>
                  </div>
                </div>

                <p className="text-slate-300 text-sm leading-relaxed">
                  Restaura la estructura completa de proyectos eléctricos a partir de un respaldo maestro previo. Regenera claves foráneas, circuitos y jerarquías sin inconsistencias.
                </p>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {importStats && (
                  <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1 text-xs text-slate-300">
                    <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Restauración completada con éxito</span>
                    </div>
                    <p className="text-slate-400 font-mono truncate">{importStats.filename}</p>
                    <p className="text-slate-400">{importStats.empresasRestauradas} empresas restauradas • {importStats.timestamp}</p>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-slate-800">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 px-5 bg-slate-800 hover:bg-slate-700 hover:text-cyan-300 active:scale-[0.98] disabled:opacity-50 text-slate-200 font-bold rounded-2xl border border-slate-700 transition-all cursor-pointer text-sm"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                      <span>Procesando restauración atómica...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-5 h-5 text-cyan-400" />
                      <span>Seleccionar Archivo de Respaldo (.json)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Información de Arquitectura Híbrida */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 text-xs text-slate-400 flex items-start gap-4">
            <Sparkles className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <p className="text-slate-200 font-bold text-sm">Arquitectura de Alta Disponibilidad</p>
              <p className="leading-relaxed">
                El sistema ejecuta la recolección de datos de Prisma 100% en memoria para evadir las restricciones de solo lectura (<code className="text-amber-300">EROFS</code>) en funciones serverless de Vercel. Al mismo tiempo, distribuye de forma asíncrona hacia <strong className="text-slate-300">Cloudflare R2</strong>, despacha alertas al canal de <strong className="text-slate-300">Telegram Bot</strong> y preserva metadatos livianos en PostgreSQL.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: GENERACIÓN Y VINCULACIÓN DE PIN TELEGRAM */}
      {/* ========================================================================= */}
      {selectedPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => {
                setSelectedPinModal(null);
                setCopiedPin(false);
              }}
              className="absolute right-5 top-5 text-slate-500 hover:text-white p-1 rounded-xl bg-slate-800/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Key className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Vincular Bot de Telegram</h3>
                <p className="text-xs text-slate-400">{selectedPinModal.empresa.nombre}</p>
              </div>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed mb-6">
              Este PIN temporal de 6 dígitos permite al cliente vincular su chat o canal de Telegram para recibir certificados de resguardo automáticos.
            </p>

            {selectedPinModal.isGenerating ? (
              <div className="py-8 text-center">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-400">Generando PIN criptográfico...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-950 border border-indigo-500/30 rounded-2xl p-5 text-center relative group">
                  <span className="text-[11px] text-indigo-400 uppercase font-bold tracking-wider block mb-1">
                    PIN de Activación
                  </span>
                  <p className="text-3xl font-black text-white tracking-widest font-mono">
                    {selectedPinModal.pin || '------'}
                  </p>

                  <button
                    onClick={() => {
                      if (selectedPinModal.pin) {
                        navigator.clipboard.writeText(selectedPinModal.pin);
                        setCopiedPin(true);
                        setTimeout(() => setCopiedPin(false), 2500);
                      }
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  >
                    {copiedPin ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar PIN</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-2">
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-indigo-400" /> Instrucciones para el usuario:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-400 pl-1">
                    <li>Abre Telegram y busca el bot <strong className="text-slate-200">@SelectricBackup_bot</strong></li>
                    <li>Envía el comando: <code className="text-amber-300 bg-slate-900 px-1.5 py-0.5 rounded">/vincular {selectedPinModal.pin}</code></li>
                    <li>¡Listo! El canal recibirá la certificación de resguardo.</li>
                  </ol>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setSelectedPinModal(null);
                  setCopiedPin(false);
                }}
                className="py-2.5 px-5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CERTIFICADO EJECUTIVO DE RESGUARDO */}
      {/* ========================================================================= */}
      {selectedCertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative overflow-hidden">
            <button
              onClick={() => {
                setSelectedCertModal(null);
                setCopiedCert(false);
              }}
              className="absolute right-5 top-5 text-slate-500 hover:text-white p-1 rounded-xl bg-slate-800/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {selectedCertModal.isLoading ? (
              <div className="py-12 text-center">
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-3" />
                <p className="text-xs text-slate-400">Generando certificado oficial de resguardo...</p>
              </div>
            ) : selectedCertModal.ficha ? (
              <div className="space-y-6">
                {/* Header del Certificado */}
                <div className="border-b border-slate-800 pb-5 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-3 shadow-lg shadow-emerald-500/10">
                    <FileCheck className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-black text-white uppercase tracking-wide">
                    Certificado de Resguardo Eléctrico
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    {selectedCertModal.ficha.certificado.codigo}
                  </p>
                </div>

                {/* Datos de la Empresa y Estado */}
                <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Empresa:</span>
                    <strong className="text-white font-semibold">{selectedCertModal.ficha.empresa.nombre}</strong>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">RIF:</span>
                    <span className="text-slate-200 font-mono">{selectedCertModal.ficha.empresa.rif}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Última Sincronización:</span>
                    <span className="text-amber-400 font-semibold">
                      {selectedCertModal.ficha.empresa.ultimoBackupAt 
                        ? new Date(selectedCertModal.ficha.empresa.ultimoBackupAt).toLocaleString('es-VE')
                        : 'En proceso'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400">Estado de Protección:</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      ✓ Snapshot Criptográfico Verificado
                    </span>
                  </div>
                </div>

                {/* Desglose de Activos Protegidos */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-300">Activos Eléctricos Resguardados:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 flex justify-between">
                      <span className="text-slate-400">Proyectos:</span>
                      <strong className="text-white">{selectedCertModal.ficha.totales.proyectos}</strong>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 flex justify-between">
                      <span className="text-slate-400">Tableros:</span>
                      <strong className="text-amber-400">{selectedCertModal.ficha.totales.tableros}</strong>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 flex justify-between">
                      <span className="text-slate-400">Circuitos:</span>
                      <strong className="text-cyan-400">{selectedCertModal.ficha.totales.circuitos}</strong>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 flex justify-between">
                      <span className="text-slate-400">Total Activos:</span>
                      <strong className="text-emerald-400">{selectedCertModal.ficha.totales.totalActivos}</strong>
                    </div>
                  </div>
                </div>

                {/* Footer del Modal */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <button
                    onClick={() => {
                      const textCert = `🛡️ CERTIFICADO DE RESGUARDO SELECTRIC\nEmpresa: ${selectedCertModal.ficha.empresa.nombre}\nCódigo: ${selectedCertModal.ficha.certificado.codigo}\nTotal Activos: ${selectedCertModal.ficha.totales.totalActivos}\nFecha: ${new Date().toLocaleDateString('es-VE')}`;
                      navigator.clipboard.writeText(textCert);
                      setCopiedCert(true);
                      setTimeout(() => setCopiedCert(false), 2500);
                    }}
                    className="flex items-center gap-1.5 py-2 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  >
                    {copiedCert ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Certificado</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setSelectedCertModal(null);
                      setCopiedCert(false);
                    }}
                    className="py-2 px-5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-amber-500/20"
                  >
                    Aceptar
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupView;