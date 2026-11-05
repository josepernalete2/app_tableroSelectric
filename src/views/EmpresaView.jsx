import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { useConfirm } from '../context/ConfirmContext';
import { validarRifVenezolano, validarTelefono } from '../utils/syncService';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  AlertTriangle,
  FolderOpen,
  X,
  Building,
  Layers,
  Trash2,
  User,
  CheckSquare,
  Database,
  MapPin,
  Phone,
  Mail,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';

export const EmpresaView = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  
  const { 
    user,
    companies, 
    addProyecto, 
    deleteProyecto,
    updateEmpresa,
    showToast
  } = useStore();
  
  const company = companies.find((c) => c.id === companyId);
  const { alert: customAlert } = useConfirm();

  // Estado del modal de eliminación permanente de Proyecto (solo ADMIN)
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const closeDeleteModal = () => {
    if (isDeleting) return;
    setDeleteTarget(null);
    setDeletePassword('');
    setShowDeletePassword(false);
    setDeleteError('');
  };

  const handleConfirmDeleteProyecto = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!deleteTarget || isDeleting) return;
    if (!deletePassword) {
      setDeleteError('Ingresa tu contraseña de administrador.');
      return;
    }
    setIsDeleting(true);
    setDeleteError('');
    try {
      const targetIds = Array.isArray(deleteTarget.ids) ? deleteTarget.ids : [deleteTarget.id];
      for (const pid of targetIds) {
        const res = await deleteProyecto(companyId, pid, deletePassword);
        if (!res?.ok) {
          setDeleteError(res?.error || 'Contraseña de administrador incorrecta');
          setIsDeleting(false);
          return;
        }
      }
      setDeleteTarget(null);
      setDeletePassword('');
      setShowDeletePassword(false);
      if (deleteTarget.isBulk) {
        showToast?.(`Se eliminaron ${targetIds.length} proyectos correctamente`, 'success');
        setSelectedIds(new Set());
        setIsMultiSelectMode(false);
      } else {
        showToast?.('Proyecto y todos sus equipos eliminados correctamente', 'success');
      }
    } catch (err) {
      setDeleteError(err?.message || 'Error inesperado al eliminar el proyecto.');
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Estados para Edición de Empresa
  const [showEditEmpresaModal, setShowEditEmpresaModal] = useState(false);
  const [editNombre, setEditNombre] = useState('');
  const [editRif, setEditRif] = useState('');
  const [editDireccionFiscal, setEditDireccionFiscal] = useState('');
  const [editGerente1Nombre, setEditGerente1Nombre] = useState('');
  const [editGerente1Telefono, setEditGerente1Telefono] = useState('');
  const [editGerente1Email, setEditGerente1Email] = useState('');
  const [editGerente2Nombre, setEditGerente2Nombre] = useState('');
  const [editGerente2Telefono, setEditGerente2Telefono] = useState('');
  const [editGerente2Email, setEditGerente2Email] = useState('');
  const [editErrors, setEditErrors] = useState({});

  const handleUpdateEmpresaSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    const cleanNombre = editNombre.trim();
    if (!cleanNombre) {
      newErrors.nombre = "El nombre de la empresa es obligatorio";
    }

    const cleanRif = editRif.trim().toUpperCase();
    if (!cleanRif) {
      newErrors.rif = "El RIF de la empresa es obligatorio";
    } else if (!validarRifVenezolano(cleanRif)) {
      newErrors.rif = "Formato de RIF inválido (ej. J-12345678-9, V-12345678, G-...)";
    }

    if (editGerente1Telefono.trim() && !validarTelefono(editGerente1Telefono.trim())) {
      newErrors.gerente1Telefono = "El teléfono solo admite números, guiones o '+'";
    }

    if (editGerente2Telefono.trim() && !validarTelefono(editGerente2Telefono.trim())) {
      newErrors.gerente2Telefono = "El teléfono solo admite números, guiones o '+'";
    }

    if (Object.keys(newErrors).length > 0) {
      setEditErrors(newErrors);
      return;
    }

    setEditErrors({});
    await updateEmpresa(companyId, {
      nombre: cleanNombre,
      rif: cleanRif,
      direccionFiscal: editDireccionFiscal.trim() || 'No especificada',
      gerente1Nombre: editGerente1Nombre.trim() || null,
      gerente1Telefono: editGerente1Telefono.trim() || null,
      gerente1Email: editGerente1Email.trim() || null,
      gerente2Nombre: editGerente2Nombre.trim() || null,
      gerente2Telefono: editGerente2Telefono.trim() || null,
      gerente2Email: editGerente2Email.trim() || null
    });
    showToast?.("Datos de la empresa actualizados correctamente.", "success");
    setShowEditEmpresaModal(false);
  };

  // Modales y búsqueda
  const [showModal, setShowModal] = useState(false); // Modal Proyecto
  const [searchQuery, setSearchQuery] = useState('');

  // Estados de selección múltiple
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Limpiar selección cuando cambia la búsqueda
  useEffect(() => {
    setSelectedIds(new Set());
  }, [searchQuery]);

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const q = searchQuery.toLowerCase();
    const ids = (company?.proyectos || [])
      .filter((p) => p.nombre.toLowerCase().includes(q) || (p.descripcion && p.descripcion.toLowerCase().includes(q)))
      .map((p) => p.id);
    setSelectedIds(new Set(ids));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = () => {
    if (user?.role !== 'ADMIN') return;
    const selectedCount = selectedIds.size;
    if (selectedCount === 0) return;

    setDeleteTarget({
      ids: Array.from(selectedIds),
      nombre: `${selectedCount} ${selectedCount === 1 ? 'proyecto seleccionado' : 'proyectos seleccionados'}`,
      isBulk: true
    });
    setDeletePassword('');
    setShowDeletePassword(false);
    setDeleteError('');
  };

  const handleDeleteProyecto = (proyectoId, name) => {
    if (user?.role !== 'ADMIN') return;
    setDeleteTarget({
      id: proyectoId,
      ids: [proyectoId],
      nombre: name,
      isBulk: false
    });
    setDeletePassword('');
    setShowDeletePassword(false);
    setDeleteError('');
  };

  // Form states de Proyectos
  const [proyectoNombre, setProyectoNombre] = useState('');
  const [proyectoDescripcion, setProyectoDescripcion] = useState('');
  const [proyectoDireccion, setProyectoDireccion] = useState('');
  const [proyectoRespNombre, setProyectoRespNombre] = useState('');
  const [proyectoRespTelefono, setProyectoRespTelefono] = useState('');
  const [proyectoRespEmail, setProyectoRespEmail] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [projectNameRequiredError, setProjectNameRequiredError] = useState(false);


  if (!company) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 text-center space-y-4 font-sans">
        <AlertTriangle className="w-12 h-12 text-amber-500 animate-pulse" />
        <h2 className="text-lg font-bold">Empresa no encontrada</h2>
        <button onClick={() => navigate('/')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs rounded-xl font-bold transition-all shadow-md">
          Volver al Dashboard
        </button>
      </div>
    );
  }

  const proyectos = (company.proyectos || []).filter((p) => !p?.deleted && !p?.eliminado);

  const filteredProjects = proyectos.filter((p) =>
    (p.nombre || p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.descripcion && p.descripcion.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const currentCompanyId = companyId;
  const projectName = proyectoNombre;
  const isDuplicate = !isCreatingProject && projectName.trim() !== '' && proyectos.some(
    (p) =>
      (p.companyId || p.empresaId || currentCompanyId) === currentCompanyId &&
      (p.name || p.nombre || '')?.trim().toLowerCase() === projectName.trim().toLowerCase()
  );

  const handleOpenCreateProjectModal = () => {
    setProyectoNombre('');
    setProyectoDescripcion('');
    setProyectoDireccion(company?.direccion || company?.ubicacion || '');
    setProyectoRespNombre(company?.contactoPrincipal || company?.responsable || '');
    setProyectoRespTelefono(company?.telefono || '');
    setProyectoRespEmail(company?.email || '');
    setProjectNameRequiredError(false);
    setShowModal(true);
  };

  const handleCreateProyecto = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!projectName.trim()) {
      setProjectNameRequiredError(true);
      return;
    }
    if (isDuplicate || isCreatingProject) return;

    setIsCreatingProject(true);
    try {
      const finalDireccion = proyectoDireccion.trim() || company?.direccion || company?.ubicacion || '';
      const finalRespNombre = proyectoRespNombre.trim() || company?.contactoPrincipal || company?.responsable || '';
      const finalRespTelefono = proyectoRespTelefono.trim() || company?.telefono || '';
      const finalRespEmail = proyectoRespEmail.trim() || company?.email || '';

      const result = await addProyecto(
        proyectoNombre.trim(),
        proyectoDescripcion.trim(),
        companyId,
        {
          direccion: finalDireccion,
          ubicacion: finalDireccion,
          responsableNombre: finalRespNombre,
          responsableTelefono: finalRespTelefono,
          responsableEmail: finalRespEmail,
          responsable: {
            nombre: finalRespNombre,
            telefono: finalRespTelefono,
            email: finalRespEmail
          }
        }
      );

      if (result && result.success) {
        setProyectoNombre('');
        setProyectoDescripcion('');
        setProyectoDireccion('');
        setProyectoRespNombre('');
        setProyectoRespTelefono('');
        setProyectoRespEmail('');
        setShowModal(false);
        showToast?.('Proyecto registrado exitosamente', 'success');
      } else {
        customAlert(result?.error || 'No se pudo crear el proyecto.');
      }
    } catch (err) {
      console.error('Error al registrar proyecto:', err);
      customAlert(`Error inesperado al crear proyecto: ${err.message || 'Error del sistema'}`);
    } finally {
      setIsCreatingProject(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col antialiased font-sans">
      
      {/* Top Header */}
      <header className="bg-slate-950 border-b border-slate-800/80 px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl text-slate-450 hover:text-slate-200 transition-all border border-slate-800 active:scale-95 cursor-pointer"
            title="Volver al Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider block">
              Gestión de Empresa
            </span>
            <h1 className="text-lg font-bold text-slate-100 tracking-tight">{company.nombre}</h1>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-8">
        
        {/* CARD INFORMACION DE LA EMPRESA */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex justify-between items-start gap-4">
            <div>
              <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider block mb-1">Ficha Técnica</span>
              <h2 className="text-xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
                <Building className="w-5 h-5 text-amber-500" /> {company.nombre}
              </h2>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {user?.role === 'ADMIN' && (
                <button
                  onClick={() => {
                    setEditNombre(company.nombre);
                    setEditRif(company.rif || '');
                    setEditDireccionFiscal(company.direccionFiscal || '');
                    setEditGerente1Nombre(company.gerente1Nombre || '');
                    setEditGerente1Telefono(company.gerente1Telefono || '');
                    setEditGerente1Email(company.gerente1Email || '');
                    setEditGerente2Nombre(company.gerente2Nombre || '');
                    setEditGerente2Telefono(company.gerente2Telefono || '');
                    setEditGerente2Email(company.gerente2Email || '');
                    setShowEditEmpresaModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold rounded-lg text-slate-200 hover:text-slate-100 flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                >
                  Editar Empresa
                </button>
              )}
              <button
                onClick={() => navigate('/backups')}
                className="px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-bold rounded-lg text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                title="Ir al Centro de Resguardo y Copias de Seguridad"
              >
                <Database className="w-3.5 h-3.5" />
                Resguardo & Backups
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6 pt-6 border-t border-slate-900">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">RIF</span>
              <span className="text-sm font-semibold text-slate-200">{company.rif || 'J-N/D'}</span>
            </div>
            <div className="md:col-span-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Dirección Fiscal</span>
              <span className="text-sm font-semibold text-slate-200">{company.direccionFiscal || 'N/D'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Registro</span>
              <div className="text-[10px] text-slate-400 font-mono mt-1 space-y-0.5">
                <div>Creado: {company.createdAt ? new Date(company.createdAt).toLocaleString('es-ES') : 'N/D'}</div>
                <div>Actualizado: {company.updatedAt ? new Date(company.updatedAt).toLocaleString('es-ES') : 'N/D'}</div>
              </div>
            </div>
          </div>

          {user?.role === 'ADMIN' && (
            <div className="mt-6 pt-6 border-t border-slate-900">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <User className="w-4 h-4 text-sky-400" /> Contacto Gerencial (Solo Visible para Administradores)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Gerente 1 */}
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-900">
                  <span className="text-[10px] text-sky-400 font-bold uppercase block mb-2">Gerente Principal</span>
                  <div className="space-y-1.5 text-xs">
                    <div><strong className="text-slate-450">Nombre:</strong> <span className="text-slate-255 font-semibold">{company.gerente1Nombre || 'N/D'}</span></div>
                    <div><strong className="text-slate-450">Teléfono:</strong> <span className="text-slate-255 font-semibold">{company.gerente1Telefono || 'N/D'}</span></div>
                    <div><strong className="text-slate-450">Email:</strong> <span className="text-slate-255 font-semibold">{company.gerente1Email || 'N/D'}</span></div>
                  </div>
                </div>

                {/* Gerente 2 */}
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-900">
                  <span className="text-[10px] text-sky-400 font-bold uppercase block mb-2">Gerente Secundario</span>
                  <div className="space-y-1.5 text-xs">
                    <div><strong className="text-slate-450">Nombre:</strong> <span className="text-slate-255 font-semibold">{company.gerente2Nombre || 'N/D'}</span></div>
                    <div><strong className="text-slate-450">Teléfono:</strong> <span className="text-slate-255 font-semibold">{company.gerente2Telefono || 'N/D'}</span></div>
                    <div><strong className="text-slate-450">Email:</strong> <span className="text-slate-255 font-semibold">{company.gerente2Email || 'N/D'}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Actions panel */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 pb-6 border-b border-slate-800/80">
          <div className="input-search-container w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar proyecto..."
              className="input-search"
            />
            <Search className="w-4.5 h-4.5 absolute left-3.5 top-3 text-slate-500" />
          </div>

          {user?.role !== 'CLIENT' && (
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto justify-end">
              {/* Botón Selección Múltiple (Solo ADMIN para eliminación en lote) */}
              {user?.role === 'ADMIN' && (
                <button
                  onClick={() => {
                    setIsMultiSelectMode(!isMultiSelectMode);
                    setSelectedIds(new Set());
                  }}
                  className={`border font-semibold transition-all px-4 py-2.5 rounded-lg flex flex-row items-center justify-center gap-2 h-10 whitespace-nowrap w-full sm:w-auto cursor-pointer text-xs ${
                    isMultiSelectMode 
                      ? 'bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-400/30' 
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-600/60 shadow-sm hover:border-slate-400'
                  }`}
                >
                  <CheckSquare className={`w-4 h-4 ${isMultiSelectMode ? 'text-cyan-400' : 'text-slate-300'}`} /> {isMultiSelectMode ? 'Cancelar Selección' : 'Seleccionar Varios'}
                </button>
              )}

              {/* Botón Primario: + Crear Proyecto */}
              <button
                onClick={handleOpenCreateProjectModal}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 border border-amber-400/60 active:scale-98 transition-all px-4 py-2.5 rounded-lg flex flex-row items-center justify-center gap-2 h-10 whitespace-nowrap w-full sm:w-auto cursor-pointer text-xs"
              >
                <FolderOpen className="w-4 h-4 stroke-[2.2] text-slate-950" /> + Crear Proyecto
              </button>
            </div>
          )}
        </div>

        {isMultiSelectMode && (
          <div className="bg-slate-950 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn shadow-lg shadow-amber-500/5">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs text-slate-300 font-medium">
                Modo Selección Múltiple: <strong className="text-amber-500 font-bold">{selectedIds.size}</strong> {selectedIds.size === 1 ? 'proyecto seleccionado' : 'proyectos seleccionados'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={handleSelectAll}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-[11px] font-semibold text-slate-300 transition-all cursor-pointer hover:text-slate-100"
              >
                Seleccionar Todo
              </button>
              <button
                onClick={handleDeselectAll}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-[11px] font-semibold text-slate-300 transition-all cursor-pointer hover:text-slate-100"
              >
                Deseleccionar Todo
              </button>
              {selectedIds.size > 0 && user?.role === 'ADMIN' && (
                <button
                  onClick={handleDeleteSelected}
                  className="px-3.5 py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 rounded-xl text-[11px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar ({selectedIds.size})
                </button>
              )}
              <button
                onClick={() => {
                  setIsMultiSelectMode(false);
                  setSelectedIds(new Set());
                }}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-[11px] font-semibold text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* LISTADO DE PROYECTOS */}
        <div>
          <div className="mb-4">
            <h2 className="text-xl font-extrabold text-slate-100 tracking-wide flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-amber-500" /> Carpetas de Proyectos ({proyectos.length})
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Organiza las inspecciones en carpetas o proyectos técnicos independientes.
            </p>
          </div>

          {filteredProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => (isMultiSelectMode ? handleToggleSelect(proj.id) : navigate(`/empresa/${companyId}/proyecto/${proj.id}`))}
                  className={`bg-slate-950 border rounded-2xl shadow-md hover:shadow-xl p-5 flex flex-col justify-between cursor-pointer transition-all hover:translate-y-[-2px] group relative ${selectedIds.has(proj.id) ? 'border-amber-500/70 ring-1 ring-amber-500/40' : 'border-slate-800/80 hover:border-slate-700/60'}`}
                >
                  {isMultiSelectMode && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(proj.id)}
                      onChange={() => handleToggleSelect(proj.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-4 left-4 w-4 h-4 accent-amber-500 z-10 cursor-pointer"
                    />
                  )}
                  {user?.role === 'ADMIN' && !isMultiSelectMode && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProyecto(proj.id, proj.nombre);
                      }}
                      className="absolute top-4 right-4 p-2 bg-slate-900/90 hover:bg-red-950/40 border border-slate-800 hover:border-red-900/60 text-slate-400 hover:text-red-400 rounded-xl transition-all shadow-md z-10 cursor-pointer opacity-100"
                      title="Eliminar Proyecto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <div className="space-y-4 pr-12 min-w-0">
                    <div className="p-3 bg-slate-900 border border-slate-850 rounded-xl w-max shadow-inner text-amber-500 group-hover:scale-105 transition-transform">
                      <FolderOpen className="w-6 h-6" />
                    </div>
                    
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-100 group-hover:text-amber-400 transition-colors tracking-tight truncate">
                        {proj.nombre}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed min-h-[32px] font-sans">
                        {proj.descripcion || 'Sin descripción disponible.'}
                      </p>
                    </div>

                    {/* Ubicación y Responsable del Proyecto */}
                    {((proj.direccion || proj.ubicacion) || (proj.responsableNombre || (typeof proj.responsable === 'object' ? proj.responsable?.nombre : proj.responsable))) && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-900/50 text-[11px]">
                        {(proj.direccion || proj.ubicacion) && (
                          <div className="flex items-center gap-1.5 text-slate-400 truncate" title={proj.direccion || proj.ubicacion}>
                            <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="truncate">{proj.direccion || proj.ubicacion}</span>
                          </div>
                        )}
                        {(proj.responsableNombre || (typeof proj.responsable === 'object' ? proj.responsable?.nombre : proj.responsable)) && (
                          <div className="flex items-center gap-1.5 text-slate-400 truncate" title={proj.responsableNombre || (typeof proj.responsable === 'object' ? proj.responsable?.nombre : proj.responsable)}>
                            <User className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            <span className="truncate">{proj.responsableNombre || (typeof proj.responsable === 'object' ? proj.responsable?.nombre : proj.responsable)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-900/60 pt-4 mt-4 space-y-2.5">
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                      <div className="flex items-center gap-1.5 bg-slate-900/40 p-2 rounded-lg border border-slate-900/60 justify-center">
                        <Layers className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span className="font-mono font-bold text-slate-200">{(proj.elementosUnifilares || proj.tableros || []).length}</span> Equipos
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-900/40 p-2 rounded-lg border border-slate-900/60 justify-center">
                        <Building className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="font-mono font-bold text-slate-200">{(proj.inspeccionesSubestacion || proj.subestaciones || []).length}</span> Subestac.
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono">
                      <span>Creado:</span>
                      <span>{proj.createdAt ? new Date(proj.createdAt).toLocaleDateString('es-ES') : 'N/D'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-16 border-2 border-dashed border-slate-800 rounded-2xl text-center space-y-4 bg-slate-950/20">
              <FolderOpen className="w-12 h-12 text-slate-700 mx-auto" />
              <div className="space-y-1 font-sans">
                <h3 className="text-sm font-bold text-slate-400">No se encontraron proyectos</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Crea una nueva carpeta de proyecto para comenzar a registrar tableros e inspecciones.
                </p>
              </div>
            </div>
          )}
        </div>

      </main>

      {/* MODAL 1: REGISTRAR NUEVO PROYECTO */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200" />
          
          <div className="relative w-full max-w-lg bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 shrink-0">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-amber-500" />
                Registrar Nuevo Proyecto
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProyecto} className="mt-4 space-y-4 overflow-y-auto pr-1">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                  Nombre del Proyecto *
                </label>
                <input
                  type="text"
                  value={proyectoNombre}
                  onChange={(e) => {
                    setProyectoNombre(e.target.value);
                    if (projectNameRequiredError && e.target.value.trim()) {
                      setProjectNameRequiredError(false);
                    }
                  }}
                  placeholder="Ej. Inspecciones Planta Principal 2026"
                  className={`w-full px-3.5 py-2.5 bg-slate-900 border focus:ring-1 rounded-xl text-sm text-slate-100 focus:outline-none h-11 transition-all ${
                    isDuplicate || (projectNameRequiredError && !projectName.trim())
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                      : 'border-slate-800 focus:border-amber-500 focus:ring-amber-500'
                  }`}
                />
                {isDuplicate && (
                  <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 font-semibold flex items-center gap-2 mt-2">
                    <span>⚠️ Ya existe un proyecto con este nombre en esta empresa. Elige otro nombre.</span>
                  </p>
                )}
                {!isDuplicate && projectNameRequiredError && !projectName.trim() && (
                  <p className="text-xs text-rose-400 font-semibold flex items-center gap-1.5 mt-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> El nombre del proyecto es un campo requerido.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-500" /> Ubicación / Dirección de la Obra o Planta
                </label>
                <input
                  type="text"
                  value={proyectoDireccion}
                  onChange={(e) => setProyectoDireccion(e.target.value)}
                  placeholder="Ej. Galpón 4, Av. Industrial, Valencia"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-sm text-slate-100 focus:outline-none h-11 transition-all"
                />
              </div>

              <div className="bg-slate-900/40 p-3.5 rounded-xl border border-slate-800/80 space-y-3">
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-sky-400" /> Persona a Cargo / Responsable Técnico
                </span>

                <div>
                  <label className="block text-[9.5px] font-semibold text-slate-400 uppercase mb-1">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    value={proyectoRespNombre}
                    onChange={(e) => setProyectoRespNombre(e.target.value)}
                    placeholder="Ej. Ing. Carlos Mendoza"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-lg text-xs text-slate-100 focus:outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9.5px] font-semibold text-slate-400 uppercase mb-1 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" /> Teléfono
                    </label>
                    <input
                      type="text"
                      value={proyectoRespTelefono}
                      onChange={(e) => setProyectoRespTelefono(e.target.value)}
                      placeholder="+58 412 1234567"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-lg text-xs text-slate-100 focus:outline-none transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9.5px] font-semibold text-slate-400 uppercase mb-1 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" /> Correo
                    </label>
                    <input
                      type="email"
                      value={proyectoRespEmail}
                      onChange={(e) => setProyectoRespEmail(e.target.value)}
                      placeholder="carlos@empresa.com"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-lg text-xs text-slate-100 focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                  Descripción / Alcance (Opcional)
                </label>
                <textarea
                  value={proyectoDescripcion}
                  onChange={(e) => setProyectoDescripcion(e.target.value)}
                  placeholder="Describe brevemente el alcance de este proyecto..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-sm text-slate-100 focus:outline-none placeholder-slate-600 transition-all font-sans resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-900/60">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-xs font-bold rounded-xl text-slate-350 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isDuplicate || !projectName.trim() || isCreatingProject}
                  className="bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 active:scale-98 transition-all px-4 py-2.5 rounded-lg flex flex-row items-center justify-center gap-2 h-10 whitespace-nowrap text-xs cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingProject ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Creando Proyecto...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 stroke-[2.5] text-slate-950" />
                      <span>Crear Proyecto</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal de Edición de Empresa */}
      {showEditEmpresaModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Building className="w-5 h-5 text-amber-500" /> Editar Empresa
              </h3>
              <button 
                onClick={() => setShowEditEmpresaModal(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateEmpresaSubmit} className="space-y-4 font-sans text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nombre Comercial</label>
                <input 
                  type="text" 
                  value={editNombre} 
                  onChange={(e) => setEditNombre(e.target.value)} 
                  required 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">RIF <span className="text-rose-400">*</span></label>
                  <input 
                    type="text" 
                    value={editRif} 
                    onChange={(e) => {
                      setEditRif(e.target.value);
                      if (editErrors.rif) setEditErrors((prev) => ({ ...prev, rif: null }));
                    }} 
                    className={`w-full bg-slate-950 border rounded-lg px-3 py-2 text-slate-100 focus:outline-none uppercase ${
                      editErrors.rif ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-800 focus:border-amber-500'
                    }`}
                  />
                  {editErrors.rif && (
                    <p className="text-[10px] text-rose-400 mt-1 font-medium">{editErrors.rif}</p>
                  )}
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Dirección Fiscal</label>
                  <input 
                    type="text" 
                    value={editDireccionFiscal} 
                    onChange={(e) => setEditDireccionFiscal(e.target.value)} 
                    required 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4 mt-4 space-y-4">
                <h4 className="font-bold text-sky-400 uppercase tracking-wider text-[10px]">Gerente Principal</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="block text-slate-500 font-medium mb-1">Nombre</label>
                    <input 
                      type="text" 
                      value={editGerente1Nombre} 
                      onChange={(e) => setEditGerente1Nombre(e.target.value)} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-slate-500 font-medium mb-1">Teléfono</label>
                    <input 
                      type="text" 
                      value={editGerente1Telefono} 
                      onChange={(e) => {
                        setEditGerente1Telefono(e.target.value);
                        if (editErrors.gerente1Telefono) setEditErrors((prev) => ({ ...prev, gerente1Telefono: null }));
                      }} 
                      placeholder="Ej. +58-412-1234567"
                      className={`w-full bg-slate-950 border rounded-lg px-2.5 py-1.5 text-slate-100 focus:outline-none transition-colors ${
                        editErrors.gerente1Telefono ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-800 focus:border-amber-500'
                      }`}
                    />
                    {editErrors.gerente1Telefono && (
                      <p className="text-[9px] text-rose-400 mt-0.5 font-medium">{editErrors.gerente1Telefono}</p>
                    )}
                  </div>
                  <div className="col-span-1">
                    <label className="block text-slate-500 font-medium mb-1">Email</label>
                    <input 
                      type="email" 
                      value={editGerente1Email} 
                      onChange={(e) => setEditGerente1Email(e.target.value)} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4 mt-4 space-y-4">
                <h4 className="font-bold text-sky-400 uppercase tracking-wider text-[10px]">Gerente Secundario</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="block text-slate-500 font-medium mb-1">Nombre</label>
                    <input 
                      type="text" 
                      value={editGerente2Nombre} 
                      onChange={(e) => setEditGerente2Nombre(e.target.value)} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-slate-500 font-medium mb-1">Teléfono</label>
                    <input 
                      type="text" 
                      value={editGerente2Telefono} 
                      onChange={(e) => {
                        setEditGerente2Telefono(e.target.value);
                        if (editErrors.gerente2Telefono) setEditErrors((prev) => ({ ...prev, gerente2Telefono: null }));
                      }} 
                      placeholder="Ej. +58-412-1234567"
                      className={`w-full bg-slate-950 border rounded-lg px-2.5 py-1.5 text-slate-100 focus:outline-none transition-colors ${
                        editErrors.gerente2Telefono ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-800 focus:border-amber-500'
                      }`}
                    />
                    {editErrors.gerente2Telefono && (
                      <p className="text-[9px] text-rose-400 mt-0.5 font-medium">{editErrors.gerente2Telefono}</p>
                    )}
                  </div>
                  <div className="col-span-1">
                    <label className="block text-slate-500 font-medium mb-1">Email</label>
                    <input 
                      type="email" 
                      value={editGerente2Email} 
                      onChange={(e) => setEditGerente2Email(e.target.value)} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setShowEditEmpresaModal(false)}
                  className="px-4 py-2 border border-slate-700 text-slate-350 hover:bg-slate-800 hover:text-slate-200 rounded-lg font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-98 rounded-lg font-bold transition-all shadow-md cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Eliminación Permanente de Proyecto (solo ADMIN) */}
      {deleteTarget && user?.role === 'ADMIN' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={closeDeleteModal} className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" />
          <form
            onSubmit={handleConfirmDeleteProyecto}
            className="relative w-full max-w-md bg-slate-950 border border-red-900/60 rounded-2xl shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Eliminación de Proyecto</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Esta acción eliminará de forma irreversible el proyecto <strong>{deleteTarget.nombre}</strong> y todos sus equipos asociados. Ingresa tu contraseña de administrador para confirmar:
            </p>
            <div className="relative">
              <input
                type={showDeletePassword ? 'text' : 'password'}
                autoFocus
                value={deletePassword}
                onChange={(e) => { setDeletePassword(e.target.value); setDeleteError(''); }}
                placeholder="Contraseña de administrador"
                disabled={isDeleting}
                className="w-full pl-3 pr-10 py-2 bg-slate-900 border border-slate-700 focus:border-red-500 rounded-lg text-xs text-slate-100 focus:outline-none h-9"
              />
              <button
                type="button"
                onClick={() => setShowDeletePassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-400 p-1 cursor-pointer"
                title={showDeletePassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                tabIndex={-1}
              >
                {showDeletePassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {deleteError && (
              <p className="text-[11px] text-rose-400 font-medium">{deleteError}</p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-xs font-bold rounded-lg text-slate-300 cursor-pointer h-9 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs h-9 flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isDeleting ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Eliminando...</span></>) : 'Eliminar Proyecto'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default EmpresaView;
