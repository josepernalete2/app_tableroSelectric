import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore, { formatElementTitleWithId } from '../store/useStore';
import { API_BASE_URL } from '../utils/api';
import { 
  FileText, 
  TrendingUp, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  ExternalLink, 
  Building, 
  Layers, 
  Zap, 
  Cpu, 
  Activity, 
  FileCode, 
  Sparkles, 
  Printer, 
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';

export default function ReportesView() {
  const navigate = useNavigate();
  const { user, token, companies } = useStore();

  // Filtrar empresas si es CLIENT
  const availableCompanies = useMemo(() => {
    if (user?.role === 'CLIENT') {
      return companies.filter(c => c.id === user.companyId);
    }
    return companies;
  }, [companies, user]);

  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedProyectoId, setSelectedProyectoId] = useState('');
  const [activeTab, setActiveTab] = useState('informes'); // 'informes' | 'auditoria' | 'alarmas' | 'dxf' | 'ia'
  const [auditData, setAuditData] = useState(null);
  const [alarmasData, setAlarmasData] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // Inicializar empresa seleccionada
  useEffect(() => {
    if (availableCompanies.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(availableCompanies[0].id);
    }
  }, [availableCompanies, selectedCompanyId]);

  const currentCompany = useMemo(() => {
    return availableCompanies.find(c => c.id === selectedCompanyId) || availableCompanies[0];
  }, [availableCompanies, selectedCompanyId]);

  const currentProjects = useMemo(() => {
    return currentCompany?.proyectos || [];
  }, [currentCompany]);

  // Inicializar proyecto seleccionado
  useEffect(() => {
    if (currentProjects.length > 0 && (!selectedProyectoId || !currentProjects.find(p => p.id === selectedProyectoId))) {
      setSelectedProyectoId(currentProjects[0].id);
    } else if (currentProjects.length === 0) {
      setSelectedProyectoId('');
    }
  }, [currentProjects, selectedProyectoId]);

  const currentProyecto = useMemo(() => {
    return currentProjects.find(p => p.id === selectedProyectoId);
  }, [currentProjects, selectedProyectoId]);

  // Cargar datos de auditoría y alarmas desde el backend cuando cambia el proyecto
  useEffect(() => {
    if (!selectedProyectoId) {
      setAuditData(null);
      setAlarmasData([]);
      return;
    }

    let isMounted = true;
    setLoadingData(true);

    const fetchData = async () => {
      try {
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        
        // 1. Auditoría
        const resAudit = await fetch(`${API_BASE_URL}/api/auditoria/${selectedProyectoId}`, { headers });
        if (resAudit.ok) {
          const auditJson = await resAudit.json();
          if (isMounted) setAuditData(auditJson);
        }

        // 2. Alarmas
        const resAlarmas = await fetch(`${API_BASE_URL}/api/alarmas/proyecto/${selectedProyectoId}`, { headers });
        if (resAlarmas.ok) {
          const alarmasJson = await resAlarmas.json();
          if (isMounted) setAlarmasData(Array.isArray(alarmasJson) ? alarmasJson : []);
        }
      } catch (err) {
        console.error('Error al cargar auditoría y alarmas:', err);
      } finally {
        if (isMounted) setLoadingData(false);
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, [selectedProyectoId, token]);

  // Cálculos locales para el proyecto actual
  const elementos = currentProyecto?.elementosUnifilares || currentProyecto?.tableros || [];
  const tableros = elementos.filter(e => e.tipoElemento === 'TABLERO');
  const transformadores = elementos.filter(e => e.tipoElemento === 'TRANSFORMADOR');
  const generadores = elementos.filter(e => e.tipoElemento === 'GENERADOR');
  const subestaciones = currentProyecto?.inspeccionesSubestacion || currentProyecto?.subestaciones || [];

  // Descarga de DXF
  const handleDownloadDXF = async (tableroId, tableroNombre) => {
    try {
      const authToken = token || useStore.getState().token || localStorage.getItem('token');
      const headers = {
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
      };

      // 1. Intento primario vía GET por ID
      let res = await fetch(`${API_BASE_URL}/api/tableros/${tableroId}/dxf`, { headers });

      // 2. Si retorna 404, hacer fallback enviando los datos del tablero que ya están en memoria local
      if (!res.ok) {
        const localTablero = tableros.find(t => t.id === tableroId);
        if (localTablero) {
          res = await fetch(`${API_BASE_URL}/api/tableros/dxf/export-custom`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...headers
            },
            body: JSON.stringify({ tablero: localTablero })
          });
        }
      }

      if (!res.ok) {
        throw new Error(`El servidor respondió con estado ${res.status}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `unifilar_${(tableroNombre || 'tablero').toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_')}.dxf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al descargar DXF:', err);
      alert(`No se pudo descargar el archivo DXF: ${err.message}`);
    }
  };


  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight">
                Centro de Reportes y Auditoría Eléctrica
              </h1>
              <p className="text-xs text-slate-400">
                Informes técnicos compilados, auditoría de red, balance de cargas y exportación CAD
              </p>
            </div>
          </div>
        </div>

        {/* Selectores de Empresa y Proyecto */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-1.5 rounded-xl">
            <Building className="w-4 h-4 text-amber-500 ml-2" />
            <select
              value={selectedCompanyId}
              onChange={(e) => {
                setSelectedCompanyId(e.target.value);
                setSelectedProyectoId('');
              }}
              className="bg-transparent text-xs text-slate-200 font-bold outline-none pr-3 cursor-pointer"
            >
              {availableCompanies.map(c => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-1.5 rounded-xl">
            <Layers className="w-4 h-4 text-amber-500 ml-2" />
            <select
              value={selectedProyectoId}
              onChange={(e) => setSelectedProyectoId(e.target.value)}
              className="bg-transparent text-xs text-slate-200 font-bold outline-none pr-3 cursor-pointer"
              disabled={currentProjects.length === 0}
            >
              {currentProjects.length === 0 ? (
                <option value="" className="bg-slate-900 text-slate-400">Sin proyectos registrados</option>
              ) : (
                currentProjects.map(p => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                    {p.nombre}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Tarjetas KPI de Estado de Red */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Salud de Red */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-amber-400" /> Salud de Red
          </span>
          <div className="my-2">
            <span className={`text-2xl font-black ${
              (auditData?.saludRed || 100) >= 80 ? 'text-emerald-400' : (auditData?.saludRed || 100) >= 50 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {loadingData ? '...' : `${auditData?.saludRed ?? 100}%`}
            </span>
            <p className="text-[10px] text-slate-500">
              {auditData?.saludRed >= 80 ? 'Red en estado óptimo' : 'Requiere atención'}
            </p>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                (auditData?.saludRed || 100) >= 80 ? 'bg-emerald-500' : (auditData?.saludRed || 100) >= 50 ? 'bg-amber-500' : 'bg-red-500'
              }`} 
              style={{ width: `${auditData?.saludRed ?? 100}%` }}
            />
          </div>
        </div>

        {/* Tableros Activos */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-blue-400" /> Tableros
          </span>
          <div className="my-2">
            <span className="text-2xl font-black text-slate-100">{tableros.length}</span>
            <p className="text-[10px] text-slate-500">Tableros eléctricos registrados</p>
          </div>
          <span className="text-[9px] text-slate-400 font-mono">Capa 1 / Diagramas</span>
        </div>

        {/* Transformadores & Generadores */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-purple-400" /> Potencia / Suministro
          </span>
          <div className="my-2">
            <span className="text-2xl font-black text-slate-100">{transformadores.length + generadores.length}</span>
            <p className="text-[10px] text-slate-500">{transformadores.length} Trafos / {generadores.length} Gen</p>
          </div>
          <span className="text-[9px] text-slate-400 font-mono">Subestación / Acometida</span>
        </div>

        {/* Subestaciones */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-amber-400" /> Subestaciones
          </span>
          <div className="my-2">
            <span className="text-2xl font-black text-slate-100">{subestaciones.length}</span>
            <p className="text-[10px] text-slate-500">Inspecciones físicas</p>
          </div>
          <span className="text-[9px] text-slate-400 font-mono">Infraestructura</span>
        </div>

        {/* Alarmas Eléctricas Activas */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" /> Alarmas Activas
          </span>
          <div className="my-2">
            <span className={`text-2xl font-black ${alarmasData.length > 0 ? 'text-red-400' : 'text-slate-100'}`}>
              {alarmasData.length}
            </span>
            <p className="text-[10px] text-slate-500">
              {alarmasData.length > 0 ? 'Desbalances o sobrecargas' : 'Sin anomalías críticas'}
            </p>
          </div>
          <span className="text-[9px] text-slate-400 font-mono">Capa 8 / Alertas</span>
        </div>
      </div>

      {/* Tabs de Navegación de Reportes */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto text-xs font-semibold">
        {[
          { id: 'informes', label: 'Informes Técnicos PDF', icon: FileText, count: currentProjects.length },
          { id: 'auditoria', label: 'Auditoría de Red', icon: CheckCircle2, count: auditData?.totalInconsistencias || 0 },
          { id: 'alarmas', label: 'Alarmas y Desbalance', icon: AlertTriangle, count: alarmasData.length },
          { id: 'dxf', label: 'Planos AutoCAD (DXF)', icon: FileCode, count: tableros.length },
          { id: 'ia', label: 'Analíticas IA (Futuro)', icon: Sparkles }
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                active 
                  ? 'border-amber-500 text-amber-400 font-bold bg-amber-500/5' 
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && tab.count > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  tab.id === 'alarmas' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-800 text-slate-300'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* CONTENIDO DE PESTAÑAS */}

      {/* PESTAÑA 1: INFORMES TÉCNICOS PDF COMPILADOS */}
      {activeTab === 'informes' && (
        <div className="space-y-6">
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" />
                Informe Técnico Compilado de {currentProyecto?.nombre || 'Proyecto'}
              </h2>
              <p className="text-xs text-slate-400">
                Genera el documento consolidado oficial con portada ejecutiva, diagramas unifilares, fichas de equipos y cuadro de recomendaciones según norma CEN.
              </p>
            </div>
            {selectedProyectoId && (
              <button
                onClick={() => navigate(`/empresa/${selectedCompanyId}/proyecto/${selectedProyectoId}/informe`)}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md active:scale-95 shrink-0 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" /> Abrir Informe Completo
              </button>
            )}
          </div>

          {/* Lista de todos los proyectos de la empresa */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Proyectos Disponibles en {currentCompany?.nombre}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentProjects.map(proj => {
                const numTableros = (proj.elementosUnifilares || proj.tableros || []).filter(e => e.tipoElemento === 'TABLERO').length;
                const numSubestaciones = (proj.inspeccionesSubestacion || proj.subestaciones || []).length;
                return (
                  <div 
                    key={proj.id} 
                    className="p-5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-sm text-slate-200">{proj.nombre}</h4>
                        <p className="text-xs text-slate-400">{proj.direccion || 'Ubicación no especificada'}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-amber-400">
                        {numTableros} Tableros
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-900">
                      <span>{numSubestaciones} Subestaciones registradas</span>
                      <button
                        onClick={() => navigate(`/empresa/${selectedCompanyId}/proyecto/${proj.id}/informe`)}
                        className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        Ver Informe PDF →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: AUDITORÍA DE RED (CAPA 5) */}
      {activeTab === 'auditoria' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Diagnóstico de Integridad Eléctrica
              </h2>
              <p className="text-xs text-slate-400">
                Detección automática de inconsistencias jerárquicas, elementos huérfanos y tableros sin carga.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Índice de Salud:</span>
              <span className={`text-base font-black px-2.5 py-0.5 rounded-lg border ${
                (auditData?.saludRed || 100) >= 80 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}>
                {auditData?.saludRed ?? 100}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Equipos Huérfanos */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Equipos Huérfanos ({auditData?.huerfanos?.length || 0})
              </h3>
              {auditData?.huerfanos?.length > 0 ? (
                <div className="space-y-2">
                  {auditData.huerfanos.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
                      <div>
                        <strong className="text-slate-200 block">{item.nombre}</strong>
                        <span className="text-[10px] text-slate-500 font-mono">Tipo: {item.tipoElemento}</span>
                      </div>
                      <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded text-[10px] font-bold">
                        Sin conexión
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 text-center text-xs text-slate-500 italic">
                  ✓ No se detectaron equipos huérfanos en la red jerárquica.
                </div>
              )}
            </div>

            {/* Tableros Sin Carga */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-400" />
                Tableros Sin Carga Registrada ({auditData?.sinCarga?.length || 0})
              </h3>
              {auditData?.sinCarga?.length > 0 ? (
                <div className="space-y-2">
                  {auditData.sinCarga.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
                      <div>
                        <strong className="text-slate-200 block">{item.nombre}</strong>
                        <span className="text-[10px] text-slate-500">Ubicación: {item.ubicacion || 'No definida'}</span>
                      </div>
                      <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded text-[10px] font-bold">
                        0 VA / Sin Circuitos
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 text-center text-xs text-slate-500 italic">
                  ✓ Todos los tableros tienen circuitos o cargas operativas.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: ALARMAS Y DESBALANCE (CAPAS 4 Y 8) */}
      {activeTab === 'alarmas' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400" /> Registro de Anomalías y Desbalances Eléctricos
              </h2>
              <p className="text-xs text-slate-400">
                Monitoreo continuo de desbalances de fase &gt; 15% y sobrecargas en interruptores principales.
              </p>
            </div>
          </div>

          {alarmasData.length > 0 ? (
            <div className="space-y-3">
              {alarmasData.map((alarma) => (
                <div 
                  key={alarma.id}
                  className={`p-4 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-3 ${
                    alarma.severidad === 'CRITICAL' 
                      ? 'bg-red-950/20 border-red-800/40 text-red-300' 
                      : 'bg-amber-950/20 border-amber-800/40 text-amber-300'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                        alarma.severidad === 'CRITICAL' ? 'bg-red-500 text-slate-950' : 'bg-amber-500 text-slate-950'
                      }`}>
                        {alarma.severidad}
                      </span>
                      <strong className="text-xs text-slate-100">{alarma.tipo}</strong>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(alarma.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{alarma.mensaje}</p>
                  </div>

                  <span className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-300">
                    Estado: {alarma.estado}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-200">Red en Perfecto Balance</h4>
              <p className="text-xs text-slate-400">
                No se detectaron alarmas críticas ni desbalances mayores al 15% en los tableros del proyecto.
              </p>
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 4: PLANOS AUTOCAD DXF (CAPA 3) */}
      {activeTab === 'dxf' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-amber-500" /> Exportación Vectorial DXF (AutoCAD R12)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Descarga los diagramas unifilares individuales de cada tablero listos para editar en AutoCAD, LibreCAD o ZWCAD.
            </p>
          </div>

          {tableros.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tableros.map((tab) => (
                <div 
                  key={tab.id}
                  className="p-5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                      ID: {tab.id}
                    </span>
                    <h4 className="font-bold text-sm text-slate-200 mt-2">{tab.nombre}</h4>
                    <p className="text-xs text-slate-400">Ubicación: {tab.ubicacion || 'Sin especificar'}</p>
                  </div>

                  <button
                    onClick={() => handleDownloadDXF(tab.id, tab.nombre)}
                    className="w-full py-2 bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-slate-200 border border-slate-800 hover:border-amber-500 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" /> Descargar DXF
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-500 italic">
              No hay tableros eléctricos registrados en este proyecto para exportar.
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 5: ANALÍTICAS IA FUTURAS */}
      {activeTab === 'ia' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" /> Analíticas Predictivas y Machine Learning
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Próximas integraciones en desarrollo para mantenimiento preventivo y optimización de redes eléctricas:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-emerald-900/40 space-y-2">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">Predictivo</span>
              <h4 className="font-bold text-sm text-slate-200">Análisis Predictivo de Fallas</h4>
              <p className="text-xs text-slate-400">
                Cálculo de probabilidad de disparo de interruptores bajo condiciones de carga máxima sostenida.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/60 border border-sky-900/40 space-y-2">
              <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 text-[10px] font-bold">Termografía</span>
              <h4 className="font-bold text-sm text-slate-200">Evolución Térmica Temporal</h4>
              <p className="text-xs text-slate-400">
                Histogramas de variación de temperatura en bornes de conexión para detectar falsos contactos.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/60 border border-purple-900/40 space-y-2">
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 text-[10px] font-bold">Normativa</span>
              <h4 className="font-bold text-sm text-slate-200">Auditoría Automática CEN</h4>
              <p className="text-xs text-slate-400">
                Verificación de calibres de conductores y distancias de seguridad según Código Eléctrico Nacional.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
