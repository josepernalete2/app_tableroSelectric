import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { useConfirm } from '../context/ConfirmContext';
import NotificationButton from '../components/NotificationButton';
import { 
  Folder, 
  FolderPlus, 
  Trash2, 
  Briefcase, 
  ChevronRight, 
  X, 
  Search,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { validarRifVenezolano, validarTelefono } from '../utils/syncService';


export const DashboardView = () => {
  const { user, companies, addCompany, deleteCompany, cargarDatosServidor, showToast } = useStore();
  const { confirm } = useConfirm();

  useEffect(() => {
    if (cargarDatosServidor) {
      cargarDatosServidor();
    }
  }, [cargarDatosServidor]);

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

  // Estados de validación y envío de formulario
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [apiError, setApiError] = useState('');

  const handleCreateCompany = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isSubmitting) return;

    setApiError('');
    const newErrors = {};

    // 1. Validar nombre no vacío ni con solo espacios en blanco
    const cleanNombre = newCompanyName.trim();
    if (!cleanNombre) {
      newErrors.nombre = "El nombre de la empresa es obligatorio";
    }

    // 2. Validar formato RIF venezolano
    const cleanRif = rif.trim().toUpperCase();
    if (!cleanRif) {
      newErrors.rif = "El RIF de la empresa es obligatorio";
    } else if (!validarRifVenezolano(cleanRif)) {
      newErrors.rif = "Formato de RIF inválido (ej. J-12345678-9, V-12345678, G-...)";
    }

    // 3. Validar teléfonos (solo números, guiones o '+')
    if (gerente1Telefono.trim() && !validarTelefono(gerente1Telefono.trim())) {
      newErrors.gerente1Telefono = "El teléfono solo admite números, guiones o '+'";
    }

    if (gerente2Telefono.trim() && !validarTelefono(gerente2Telefono.trim())) {
      newErrors.gerente2Telefono = "El teléfono solo admite números, guiones o '+'";
    }

    // Si hay errores de formato, no disparar la petición
    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);

    try {
      const res = await addCompany({
        nombre: cleanNombre,
        rif: cleanRif,
        direccionFiscal: direccionFiscal.trim() || 'No especificada',
        gerente1Nombre: gerente1Nombre.trim() || null,
        gerente1Telefono: gerente1Telefono.trim() || null,
        gerente1Email: gerente1Email.trim() || null,
        gerente2Nombre: gerente2Nombre.trim() || null,
        gerente2Telefono: gerente2Telefono.trim() || null,
        gerente2Email: gerente2Email.trim() || null
      });

      if (!res?.ok) {
        // En caso de error del backend (400, 409 o 500), mantener modal abierto y notificar
        const errorMsg = res?.error || "Error al procesar el registro de la empresa.";
        setApiError(errorMsg);
        if (showToast) {
          showToast(errorMsg, 'error');
        } else {
          alert(errorMsg);
        }
        setIsSubmitting(false);
        return;
      }

      // Respuesta exitosa (200/201): cerrar modal, limpiar formulario y notificar
      if (showToast) {
        showToast("Empresa registrada exitosamente", "success");
      }
      setNewCompanyName('');
      setRif('');
      setDireccionFiscal('');
      setGerente1Nombre('');
      setGerente1Telefono('');
      setGerente1Email('');
      setGerente2Nombre('');
      setGerente2Telefono('');
      setGerente2Email('');
      setFormErrors({});
      setApiError('');
      setShowModal(false);
    } catch (err) {
      console.error("Error al registrar empresa:", err);
      const errorMsg = err.message || "Error inesperado al registrar la empresa";
      setApiError(errorMsg);
      if (showToast) {
        showToast(errorMsg, 'error');
      } else {
        alert(errorMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
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

        {/* Panel de Notificaciones Push Nativas PWA */}
        <NotificationButton />


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
                    <div className="flex items-center gap-4 min-w-0 flex-1 mr-3">
                      <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors shrink-0">
                        <Folder className="w-8 h-8 fill-transparent group-hover:fill-slate-950" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-slate-100 group-hover:text-amber-400 transition-colors truncate">
                          {company.nombre}
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-1 truncate">
                          {(company.elementosUnifilares || []).length + (company.proyectos || []).reduce((acc, p) => acc + (p.elementosUnifilares || []).length, 0)} Equipos Registrados
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {user?.role !== 'CLIENT' && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const ok = await confirm({
                              title: 'Eliminar Empresa',
                              message: `¿Estás seguro de que deseas eliminar la empresa "${company.nombre}" y todos sus tableros y proyectos en cascada?`,
                              type: 'danger',
                              confirmText: 'Eliminar Empresa'
                            });
                            if (ok) {
                              deleteCompany(company.id);
                            }
                          }}
                          className="p-2 bg-slate-900/90 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-900/60 rounded-xl transition-all cursor-pointer opacity-100 shadow-xs"
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
          <div 
            onClick={() => {
              if (!isSubmitting) {
                setFormErrors({});
                setApiError('');
                setShowModal(false);
              }
            }} 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" 
          />
          
          <div className="relative w-full max-w-lg bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Registrar Nueva Empresa
              </h3>
              <button 
                disabled={isSubmitting}
                onClick={() => {
                  setFormErrors({});
                  setApiError('');
                  setShowModal(false);
                }}
                className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-500 hover:text-slate-300 cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCompany} className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1 text-xs">
              {/* Alerta de Error de la API o Servidor */}
              {apiError && (
                <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{apiError}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                  Nombre de la Empresa / Cliente <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={newCompanyName}
                  onChange={(e) => {
                    setNewCompanyName(e.target.value);
                    if (formErrors.nombre) setFormErrors((prev) => ({ ...prev, nombre: null }));
                  }}
                  placeholder="Ej. Farmatodo Sucursal Chacao"
                  className={`w-full px-3 py-2 bg-slate-900 border rounded-lg text-xs text-slate-100 focus:outline-none placeholder-slate-600 h-9 transition-colors ${
                    formErrors.nombre 
                      ? 'border-rose-500 ring-1 ring-rose-500' 
                      : 'border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
                  }`}
                />
                {formErrors.nombre && (
                  <p className="text-[10px] text-rose-400 mt-1 font-medium">{formErrors.nombre}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                    RIF <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={rif}
                    onChange={(e) => {
                      setRif(e.target.value);
                      if (formErrors.rif) setFormErrors((prev) => ({ ...prev, rif: null }));
                    }}
                    placeholder="Ej. J-12345678-9"
                    className={`w-full px-3 py-2 bg-slate-900 border rounded-lg text-xs text-slate-100 focus:outline-none placeholder-slate-600 h-9 transition-colors uppercase ${
                      formErrors.rif 
                        ? 'border-rose-500 ring-1 ring-rose-500' 
                        : 'border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
                    }`}
                  />
                  {formErrors.rif && (
                    <p className="text-[10px] text-rose-400 mt-1 font-medium">{formErrors.rif}</p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                    Dirección Fiscal <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={direccionFiscal}
                    onChange={(e) => {
                      setDireccionFiscal(e.target.value);
                      if (formErrors.direccionFiscal) setFormErrors((prev) => ({ ...prev, direccionFiscal: null }));
                    }}
                    placeholder="Ej. Av. Araure, San Román..."
                    className={`w-full px-3 py-2 bg-slate-900 border rounded-lg text-xs text-slate-100 focus:outline-none placeholder-slate-600 h-9 transition-colors ${
                      formErrors.direccionFiscal 
                        ? 'border-rose-500 ring-1 ring-rose-500' 
                        : 'border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
                    }`}
                  />
                  {formErrors.direccionFiscal && (
                    <p className="text-[10px] text-rose-400 mt-1 font-medium">{formErrors.direccionFiscal}</p>
                  )}
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
                      onChange={(e) => {
                        setGerente1Telefono(e.target.value);
                        if (formErrors.gerente1Telefono) setFormErrors((prev) => ({ ...prev, gerente1Telefono: null }));
                      }}
                      placeholder="Ej. +58-412-1234567"
                      className={`w-full px-2 py-1 bg-slate-900 border rounded text-xs text-slate-100 focus:outline-none transition-colors ${
                        formErrors.gerente1Telefono 
                          ? 'border-rose-500 ring-1 ring-rose-500' 
                          : 'border-slate-700 focus:border-amber-500'
                      }`}
                    />
                    {formErrors.gerente1Telefono && (
                      <p className="text-[9px] text-rose-400 mt-0.5 font-medium">{formErrors.gerente1Telefono}</p>
                    )}
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
                      onChange={(e) => {
                        setGerente2Telefono(e.target.value);
                        if (formErrors.gerente2Telefono) setFormErrors((prev) => ({ ...prev, gerente2Telefono: null }));
                      }}
                      placeholder="Ej. +58-412-1234567"
                      className={`w-full px-2 py-1 bg-slate-900 border rounded text-xs text-slate-100 focus:outline-none transition-colors ${
                        formErrors.gerente2Telefono 
                          ? 'border-rose-500 ring-1 ring-rose-500' 
                          : 'border-slate-700 focus:border-amber-500'
                      }`}
                    />
                    {formErrors.gerente2Telefono && (
                      <p className="text-[9px] text-rose-400 mt-0.5 font-medium">{formErrors.gerente2Telefono}</p>
                    )}
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
                  disabled={isSubmitting}
                  onClick={() => {
                    setFormErrors({});
                    setApiError('');
                    setShowModal(false);
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-xs font-bold rounded-lg text-slate-350 cursor-pointer h-9 disabled:opacity-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs shadow-md h-9 flex items-center justify-center gap-2 transition-all ${
                    isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-amber-600 cursor-pointer active:scale-95'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Registrando...</span>
                    </>
                  ) : (
                    'Registrar'
                  )}
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
