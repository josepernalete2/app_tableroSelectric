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
  X
} from 'lucide-react';

export const DashboardView = () => {
  const { user, companies, addCompany, deleteCompany, logout } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const navigate = useNavigate();

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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-extrabold text-slate-100 tracking-wide flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-amber-500" /> Mis Empresas Inspeccionadas
            </h2>
            <p className="text-xs text-slate-400 mt-1">Selecciona una empresa para gestionar sus tableros eléctricos o registra una nueva.</p>
          </div>
          
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" /> Registrar Empresa
          </button>
        </div>

        {/* Empresas Folder Grid */}
        {companies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((company) => (
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
        ) : (
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
        )}
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
    </div>
  );
};

export default DashboardView;
