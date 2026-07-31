import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { 
  Folder, 
  FolderPlus, 
  Trash2, 
  Briefcase, 
  ChevronRight, 
  X, 
  Search 
} from 'lucide-react';

export const DashboardView = () => {
  const { user, companies, addCompany, deleteCompany } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [rif, setRif] = useState('');
  const [direccionFiscal, setDireccionFiscal] = useState('');
  const [gerente1Nombre, setGerente1Nombre] = useState('');
  const [gerente1Telefono, setGerente1Telefono] = useState('');
  const [gerente1Email, setGerente1Email] = useState('');
  const [gerente2Nombre, setGerente2Nombre] = useState('');
  const [gerente2Telefono, setGerente2Telefono] = useState('');
  const [gerente2Email, setGerente2Email] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    if (!newCompanyName.trim() || !rif.trim() || !direccionFiscal.trim()) return;

    await addCompany({
      nombre: newCompanyName.trim(),
      rif: rif.trim(),
      direccionFiscal: direccionFiscal.trim(),
      gerente1Nombre: gerente1Nombre.trim() || null,
      gerente1Telefono: gerente1Telefono.trim() || null,
      gerente1Email: gerente1Email.trim() || null,
      gerente2Nombre: gerente2Nombre.trim() || null,
      gerente2Telefono: gerente2Telefono.trim() || null,
      gerente2Email: gerente2Email.trim() || null
    });

    setNewCompanyName('');
    setRif('');
    setDireccionFiscal('');
    setGerente1Nombre('');
    setGerente1Telefono('');
    setGerente1Email('');
    setGerente2Nombre('');
    setGerente2Telefono('');
    setGerente2Email('');
    setShowModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col antialiased">
      
      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-6">
        
        {/* Dashboard Title / Action */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 pb-6 border-b border-slate-800/80">
          <div>
            <h2 className="text-xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-amber-500" /> Mis Empresas Inspeccionadas
            </h2>
            <p className="text-xs text-slate-400 mt-1">Selecciona una empresa para gestionar sus tableros eléctricos o registra una nueva.</p>
          </div>
          
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 justify-end w-full sm:w-auto">
            {/* Buscador de Empresas */}
            <div className="input-search-container w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar empresa..."
                className="input-search"
              />
              <Search className="w-4.5 h-4.5 absolute left-3.5 top-3 text-slate-500" />
            </div>

            {user?.role !== 'CLIENT' && (
              <button
                onClick={() => setShowModal(true)}
                className="bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 active:scale-98 transition-all px-4 py-2.5 rounded-lg flex flex-row items-center justify-center gap-2 h-10 whitespace-nowrap w-full sm:w-auto cursor-pointer text-xs"
              >
                <FolderPlus className="w-4.5 h-4.5" /> + Registrar Empresa
              </button>
            )}
          </div>
        </div>

        {/* Empresas Folder Grid */}
        {(() => {
          const filteredCompanies = companies.filter((c) => {
            if (user?.role === 'CLIENT') {
              return c.id === user.companyId;
            }
            return c.nombre.toLowerCase().includes(searchQuery.toLowerCase());
          });

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
                          {(company.elementosUnifilares || []).length + (company.proyectos || []).reduce((acc, p) => acc + (p.elementosUnifilares || []).length, 0)} Equipos Registrados
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {user?.role !== 'CLIENT' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`¿Estás seguro de que deseas eliminar la empresa "${company.nombre}" y todos sus tableros?`)) {
                              deleteCompany(company.id);
                            }
                          }}
                          className="p-2 hover:bg-red-955/20 text-slate-500 hover:text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer animate-in fade-in duration-200"
                          title="Eliminar Empresa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-slate-350 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            );
          }

          if (searchQuery.trim() !== '') {
            return (
              <div className="p-12 border-2 border-dashed border-slate-800 rounded-2xl text-center space-y-3">
                <Search className="w-12 h-12 text-slate-700 mx-auto animate-pulse" />
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
                className="mt-2 bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 active:scale-98 transition-all px-4 py-2.5 rounded-lg flex flex-row items-center justify-center gap-2 h-10 whitespace-nowrap mx-auto cursor-pointer"
              >
                <FolderPlus className="w-4.5 h-4.5" /> + Registrar Empresa
              </button>
            </div>
          );
        })()}
      </main>

      {/* Modal Nueva Empresa */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowModal(false)} />
          
          <div className="relative w-full max-w-lg bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200">
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

            <form onSubmit={handleCreateCompany} className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1 text-xs">
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
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg text-xs text-slate-100 focus:outline-none placeholder-slate-600 h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                    RIF
                  </label>
                  <input
                    type="text"
                    required
                    value={rif}
                    onChange={(e) => setRif(e.target.value)}
                    placeholder="Ej. J-12345678-9"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg text-xs text-slate-100 focus:outline-none placeholder-slate-600 h-9"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                    Dirección Fiscal
                  </label>
                  <input
                    type="text"
                    required
                    value={direccionFiscal}
                    onChange={(e) => setDireccionFiscal(e.target.value)}
                    placeholder="Ej. Av. Araure, San Román..."
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg text-xs text-slate-100 focus:outline-none placeholder-slate-600 h-9"
                  />
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3 mt-3">
                <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider block mb-2">Contacto Gerente Principal</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Nombre</label>
                    <input
                      type="text"
                      value={gerente1Nombre}
                      onChange={(e) => setGerente1Nombre(e.target.value)}
                      placeholder="Nombre"
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 focus:border-amber-500 rounded text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Teléfono</label>
                    <input
                      type="text"
                      value={gerente1Telefono}
                      onChange={(e) => setGerente1Telefono(e.target.value)}
                      placeholder="Teléfono"
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 focus:border-amber-500 rounded text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Email</label>
                    <input
                      type="email"
                      value={gerente1Email}
                      onChange={(e) => setGerente1Email(e.target.value)}
                      placeholder="Email"
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 focus:border-amber-500 rounded text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3 mt-3">
                <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider block mb-2">Contacto Gerente Secundario</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Nombre</label>
                    <input
                      type="text"
                      value={gerente2Nombre}
                      onChange={(e) => setGerente2Nombre(e.target.value)}
                      placeholder="Nombre"
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 focus:border-amber-500 rounded text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Teléfono</label>
                    <input
                      type="text"
                      value={gerente2Telefono}
                      onChange={(e) => setGerente2Telefono(e.target.value)}
                      placeholder="Teléfono"
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 focus:border-amber-500 rounded text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Email</label>
                    <input
                      type="email"
                      value={gerente2Email}
                      onChange={(e) => setGerente2Email(e.target.value)}
                      placeholder="Email"
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 focus:border-amber-500 rounded text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-xs font-bold rounded-lg text-slate-350 cursor-pointer h-9"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs cursor-pointer shadow-md h-9"
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
