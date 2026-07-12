import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { 
  Folder, 
  FolderPlus, 
  Plus, 
  Trash2, 
  LogOut, 
  Zap, 
  Briefcase,
  ChevronRight,
  User,
  X,
  Search,
  Settings,
  Database,
  UploadCloud,
  Download,
  Cloud,
  RefreshCw
} from 'lucide-react';

export const DashboardView = () => {
  const { user, companies, addCompany, deleteCompany, logout, importCompanies } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Estados para configuración de Google Drive simplificado
  const [gdriveEmail, setGdriveEmail] = useState(() => localStorage.getItem('tableroselectrico_gdrive_email') || '');
  const [autoBackup, setAutoBackup] = useState(() => localStorage.getItem('tableroselectrico_gdrive_autoBackup') === 'true');
  const [syncStatus, setSyncStatus] = useState('Listo para respaldar');
  const [lastSyncTime, setLastSyncTime] = useState(() => localStorage.getItem('tableroselectrico_gdrive_lastSyncTime') || 'Nunca');
  const [isSyncing, setIsSyncing] = useState(false);

  const navigate = useNavigate();

  // Guardar configuración de Drive en LocalStorage
  const handleSaveGDriveConfig = (e) => {
    e.preventDefault();
    localStorage.setItem('tableroselectrico_gdrive_email', gdriveEmail.trim());
    localStorage.setItem('tableroselectrico_gdrive_autoBackup', autoBackup ? 'true' : 'false');
    alert("Configuración de Google Drive guardada con éxito.");
    setShowSettingsModal(false);
  };

  // Exportar base de datos PostgreSQL completa en JSON
  const handleExportDb = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/backup/export');
      const result = await res.json();
      if (result.ok) {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result.data, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `respaldo_inspecciones_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
      } else {
        alert("Error al exportar base de datos: " + result.error);
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al servidor backend para exportar.");
    }
  };

  // Importar archivo JSON para restaurar en PostgreSQL y Zustand
  const handleImportDb = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!window.confirm("¿Está seguro de que desea importar este archivo? Se SOBRESCRIBIRÁ por completo la base de datos PostgreSQL.")) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result);

        const res = await fetch('http://localhost:3001/api/backup/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: parsed })
        });
        const result = await res.json();

        if (result.ok) {
          alert("Base de datos importada y restaurada con éxito.");
          importCompanies(parsed);
          window.location.reload();
        } else {
          alert("Fallo al importar datos: " + result.error);
        }
      } catch (err) {
        console.error(err);
        alert("El archivo seleccionado no contiene una estructura JSON de respaldo válida.");
      }
    };
    reader.readAsText(file);
  };

  // Sincronizar respaldo manual a Google Drive
  const handleManualGDriveSync = async () => {
    if (!gdriveEmail.trim()) {
      alert("Debe ingresar un correo electrónico válido de Google Drive.");
      return;
    }

    setIsSyncing(true);
    setSyncStatus('Sincronizando...');
    try {
      const res = await fetch('http://localhost:3001/api/backup/gdrive-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: gdriveEmail.trim()
        })
      });
      const result = await res.json();

      if (result.ok) {
        const time = new Date().toLocaleTimeString();
        setSyncStatus('Sincronizado con éxito');
        setLastSyncTime(time);
        localStorage.setItem('tableroselectrico_gdrive_lastSyncTime', time);
        alert(result.message || "Respaldo cargado y compartido en Google Drive.");
      } else {
        setSyncStatus('Fallo en sincronización');
        alert("Error al sincronizar con Google Drive: " + result.error);
      }
    } catch (err) {
      console.error(err);
      setSyncStatus('Error de conexión');
      alert("Error de conexión al sincronizar con Google Drive.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Sincronización automática de fondo al cambiar el estado
  React.useEffect(() => {
    const isAutoOn = localStorage.getItem('tableroselectrico_gdrive_autoBackup') === 'true';
    const email = localStorage.getItem('tableroselectrico_gdrive_email');

    if (isAutoOn && email) {
      const doAutoSync = async () => {
        try {
          const res = await fetch('http://localhost:3001/api/backup/gdrive-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: email.trim()
            })
          });
          const result = await res.json();
          if (result.ok) {
            console.log("Respaldo automático en Google Drive completado.");
            const time = new Date().toLocaleTimeString();
            setLastSyncTime(time);
            setSyncStatus('Sincronizado con éxito');
            localStorage.setItem('tableroselectrico_gdrive_lastSyncTime', time);
          } else {
            console.warn("Fallo el respaldo automático a Google Drive:", result.error);
            setSyncStatus('Error en respaldo automático: ' + result.error);
          }
        } catch (err) {
          console.error("Error de red en respaldo automático:", err);
          setSyncStatus('Error de conexión automática');
        }
      };

      const timer = setTimeout(doAutoSync, 4000); // debounce de 4 segundos
      return () => clearTimeout(timer);
    }
  }, [companies]);

  const handleCreateCompany = (e) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;
    addCompany(newCompanyName);
    setNewCompanyName('');
    setShowModal(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col antialiased">
      
      {/* Top Navbar */}
      <header className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 text-slate-950 p-2 rounded-lg shadow-md">
            <Zap className="w-5 h-5 fill-slate-950" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">
              TableroSelectric Pro
            </h1>
            <p className="text-[10px] text-slate-400">Panel de Inspecciones Eléctricas</p>
          </div>
        </div>

        {/* User Status / Logout */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl">
            <User className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-300">{user?.email}</span>
          </div>
          
          {/* Botón Configuración de Respaldos */}
          <button 
            onClick={() => setShowSettingsModal(true)}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-amber-400 border border-slate-800 rounded-xl transition-all cursor-pointer"
            title="Configuración de Respaldo y Base de Datos"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button 
            onClick={handleLogout}
            className="p-2.5 bg-slate-900 hover:bg-red-950/40 hover:text-red-400 border border-slate-800 hover:border-red-900/60 rounded-xl transition-all cursor-pointer"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-6">
        
        {/* Dashboard Title / Action */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-extrabold text-slate-100 tracking-wide flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-amber-500" /> Mis Empresas Inspeccionadas
            </h2>
            <p className="text-xs text-slate-400 mt-1">Selecciona una empresa para gestionar sus tableros eléctricos o registra una nueva.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Buscador de Empresas */}
            <div className="relative w-full md:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar empresa..."
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none h-10"
              />
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-600" />
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-md active:scale-95 transition-all cursor-pointer w-full md:w-auto"
            >
              <FolderPlus className="w-4 h-4" /> Registrar Empresa
            </button>
          </div>
        </div>

        {/* Empresas Folder Grid */}
        {(() => {
          const filteredCompanies = companies.filter((c) =>
            c.nombre.toLowerCase().includes(searchQuery.toLowerCase())
          );

          if (filteredCompanies.length > 0) {
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCompanies.map((company) => (
                  <div
                    key={company.id}
                    onClick={() => navigate(`/empresa/${company.id}`)}
                    className="bg-slate-950 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl shadow-md hover:shadow-lg flex items-center justify-between cursor-pointer transition-all hover:translate-y-[-2px] group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                        <Folder className="w-8 h-8 fill-transparent group-hover:fill-slate-950" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-100 group-hover:text-amber-400 transition-colors">
                          {company.nombre}
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {company.tableros?.length || 0} Tableros Registrados
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`¿Estás seguro de que deseas eliminar la empresa "${company.nombre}" y todos sus tableros?`)) {
                            deleteCompany(company.id);
                          }
                        }}
                        className="p-2 hover:bg-red-950/40 text-slate-500 hover:text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Eliminar Empresa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-slate-300 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            );
          }

          if (searchQuery.trim() !== '') {
            return (
              <div className="p-12 border-2 border-dashed border-slate-800 rounded-2xl text-center space-y-3">
                <Search className="w-12 h-12 text-slate-700 mx-auto" />
                <h3 className="text-sm font-bold text-slate-400">No se encontraron empresas</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">No hay registros que coincidan con la búsqueda "{searchQuery}".</p>
              </div>
            );
          }

          return (
            <div className="p-12 border-2 border-dashed border-slate-800 rounded-2xl text-center space-y-3">
              <Folder className="w-12 h-12 text-slate-700 mx-auto" />
              <h3 className="text-sm font-bold text-slate-400">No hay empresas registradas</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">Comienza registrando tu primera empresa contratante para inspeccionar sus tableros eléctricos.</p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Registrar Ahora
              </button>
            </div>
          );
        })()}
      </main>

      {/* Modal Nueva Empresa */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          
          <div className="relative w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Registrar Nueva Empresa
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCompany} className="mt-4 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                  Nombre de la Empresa / Cliente
                </label>
                <input
                  type="text"
                  required
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="Ej. Farmatodo Sucursal Chacao"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg text-sm text-slate-100 focus:outline-none placeholder-slate-600 h-10"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-xs font-bold rounded-lg text-slate-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs cursor-pointer shadow-md"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ajustes del Sistema (Respaldos JSON y Google Drive) */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowSettingsModal(false)} />
          
          <div className="relative w-full max-w-lg bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Database className="w-4 h-4 text-amber-500" />
                Mantenimiento y Respaldos
              </h3>
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto pr-1 py-4 space-y-6 flex-1 scrollbar">
              
              {/* Sección 1: Exportar / Importar JSON */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide border-l-2 border-amber-500 pl-2">
                  Gestión Local de Base de Datos
                </h4>
                <p className="text-[11px] text-slate-400">
                  Descarga una copia completa de los datos de PostgreSQL en formato JSON, o restaura un archivo previamente exportado.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {/* Exportar */}
                  <button
                    onClick={handleExportDb}
                    className="flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-semibold cursor-pointer shadow transition-colors"
                  >
                    <Download className="w-4 h-4 text-amber-500" />
                    Exportar JSON
                  </button>
                  {/* Importar */}
                  <label className="flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-semibold cursor-pointer shadow transition-colors">
                    <UploadCloud className="w-4 h-4 text-amber-500" />
                    Importar JSON
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportDb}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Sección 2: Configuración Google Drive */}
              <form onSubmit={handleSaveGDriveConfig} className="space-y-4 pt-2 border-t border-slate-900">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide border-l-2 border-amber-500 pl-2">
                  Google Drive Administrador (Respaldo en Nube)
                </h4>
                <p className="text-[11px] text-slate-400">
                  Ingresa tu correo electrónico asociado a Google. El sistema generará el respaldo de manera automática y lo compartirá con tu cuenta para que puedas visualizarlo en "Compartido Conmigo".
                </p>

                {/* Correo Electrónico */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                    Correo Electrónico de Google
                  </label>
                  <input
                    type="email"
                    required
                    value={gdriveEmail}
                    onChange={(e) => setGdriveEmail(e.target.value)}
                    placeholder="ejemplo@gmail.com"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg text-xs text-slate-100 focus:outline-none placeholder-slate-600 h-9"
                  />
                </div>

                {/* Toggle de Respaldo Automático */}
                <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-slate-200">Respaldo Automático</span>
                    <span className="text-[10px] text-slate-500">Sincronizar cambios en la nube al instante</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoBackup}
                      onChange={(e) => setAutoBackup(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 peer-checked:after:bg-slate-950 peer-checked:after:border-slate-950"></div>
                  </label>
                </div>

                {/* Estado de Sincronización */}
                <div className="flex items-center justify-between p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs">
                  <div className="space-y-1">
                    <p className="text-slate-400 font-medium">Estado del Respaldo:</p>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${syncStatus.includes('éxito') ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                      <span className="font-bold text-slate-200 font-mono text-[10px]">{syncStatus}</span>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-slate-400 font-medium">Último Respaldo:</p>
                    <p className="font-bold text-slate-300 font-mono text-[10px]">{lastSyncTime}</p>
                  </div>
                </div>

                {/* Botones de configuración */}
                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={handleManualGDriveSync}
                    disabled={isSyncing}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer shadow transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-amber-500 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Respaldar Ahora</span>
                  </button>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowSettingsModal(false)}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-xs font-bold rounded-lg text-slate-300 cursor-pointer"
                    >
                      Cerrar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs cursor-pointer shadow-md"
                    >
                      Guardar Ajustes
                    </button>
                  </div>
                </div>

              </form>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DashboardView;
