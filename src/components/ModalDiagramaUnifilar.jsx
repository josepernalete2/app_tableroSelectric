import React, { useState, useEffect } from 'react';
import { 
  X, 
  ExternalLink, 
  Info, 
  Zap, 
  Trash2, 
  Link2, 
  Unlink, 
  Plus, 
  Check, 
  Cpu, 
  ShieldAlert, 
  FolderOpen 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DiagramaUnifilarBlueprint from './DiagramaUnifilarBlueprint';
import useStore from '../store/useStore';

export default function ModalDiagramaUnifilar({ 
  isOpen, 
  onClose, 
  elementos = [], 
  companyName, 
  projectName = 'SISTEMA ELÉCTRICO',
  proyectoId = null,
  companyId = null
}) {
  const navigate = useNavigate();
  const { addElementoUnifilar, updateElementoUnifilar, deleteElementoUnifilar, showToast } = useStore();

  const [selectedNode, setSelectedNode] = useState(null);
  
  // Estados de edición del nodo seleccionado
  const [editNombre, setEditNombre] = useState('');
  const [editTipo, setEditTipo] = useState('');
  const [editUbicacion, setEditUbicacion] = useState('');
  const [editAlimentadoPor, setEditAlimentadoPor] = useState('');
  const [editKva, setEditKva] = useState('');
  const [editFases, setEditFases] = useState('');
  const [editObservaciones, setEditObservaciones] = useState('');

  // Estados de Modo Conexión
  const [isConnectionMode, setIsConnectionMode] = useState(false);
  const [connectionSource, setConnectionSource] = useState(null); // Nodo origen

  // Sincronizar formulario cuando cambia el nodo seleccionado
  useEffect(() => {
    if (selectedNode) {
      setEditNombre(selectedNode.nombre || '');
      setEditTipo(selectedNode.tipoElemento || 'TABLERO');
      setEditUbicacion(selectedNode.ubicacion || '');
      setEditAlimentadoPor(selectedNode.alimentadoPor || '');
      setEditKva(selectedNode.datosTecnicos?.kva || selectedNode.datosTecnicos?.potenciaKva || '');
      setEditFases(selectedNode.datosTecnicos?.fases || selectedNode.maxPoles || '');
      setEditObservaciones(selectedNode.observacionesGenerales || '');
    } else {
      resetEditForm();
    }
  }, [selectedNode]);

  // Actualizar la referencia del nodo seleccionado si los elementos cambian (reactividad)
  useEffect(() => {
    if (selectedNode) {
      const updated = elementos.find(el => el.id === selectedNode.id);
      if (updated) {
        setSelectedNode(updated);
      } else {
        setSelectedNode(null);
      }
    }
  }, [elementos]);

  const resetEditForm = () => {
    setEditNombre('');
    setEditTipo('');
    setEditUbicacion('');
    setEditAlimentadoPor('');
    setEditKva('');
    setEditFases('');
    setEditObservaciones('');
  };

  if (!isOpen) return null;

  // Catálogo de símbolos eléctricos para el panel izquierdo
  const catalogOfSymbols = [
    { 
      type: 'TABLERO', 
      label: 'Tablero Eléctrico', 
      desc: 'Panel de distribución', 
      icon: <div className="w-5 h-4 border border-slate-400 bg-slate-950 flex items-center justify-center text-[7px]">⚡</div> 
    },
    { 
      type: 'TRANSFORMADOR', 
      label: 'Transformador', 
      desc: 'Reductor/Elevador', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" className="overflow-visible fill-none stroke-current text-violet-400">
          <circle cx="10" cy="7" r="5" strokeWidth="1.5" />
          <circle cx="10" cy="13" r="5" strokeWidth="1.5" />
        </svg>
      ) 
    },
    { 
      type: 'GENERADOR', 
      label: 'Generador / Planta', 
      desc: 'Generador auxiliar', 
      icon: <div className="w-5 h-5 rounded-full border border-amber-500 flex items-center justify-center text-[10px] font-bold text-amber-500 bg-amber-950/20">G</div> 
    },
    { 
      type: 'TRANSFER', 
      label: 'ATS / Transferencia', 
      desc: 'Conmutación de red', 
      icon: <div className="w-7 h-4 border border-emerald-500 rounded text-[7px] font-black text-center text-emerald-400 bg-emerald-950/20 leading-tight">ATS</div> 
    },
    { 
      type: 'PUESTA_TIERRA', 
      label: 'Puesta a Tierra', 
      desc: 'Malla / Electrodo', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 20 20" className="stroke-current text-teal-400" fill="none">
          <line x1="10" y1="2" x2="10" y2="12" strokeWidth="2" />
          <line x1="4" y1="12" x2="16" y2="12" strokeWidth="2" />
          <line x1="6" y1="15" x2="14" y2="15" strokeWidth="1.5" />
          <line x1="8" y1="18" x2="12" y2="18" strokeWidth="1" />
        </svg>
      ) 
    },
    { 
      type: 'SUBESTACION', 
      label: 'Celda / Subestación', 
      desc: 'Módulo de maniobra', 
      icon: <Cpu className="w-4 h-4 text-purple-400" /> 
    },
    { 
      type: 'OTRO', 
      label: 'Carga / Banco Cond.', 
      desc: 'Otros componentes', 
      icon: <Info className="w-4 h-4 text-sky-400" /> 
    }
  ];

  // Agregar nuevo símbolo al lienzo
  const handleAddSymbol = async (type) => {
    const defaultPositions = [
      { x: 250, y: 150 },
      { x: 350, y: 150 },
      { x: 450, y: 150 },
      { x: 550, y: 150 },
      { x: 250, y: 300 },
      { x: 450, y: 300 }
    ];
    // Evitar solapamientos iniciales burdos
    const randomPos = defaultPositions[Math.floor(Math.random() * defaultPositions.length)];
    
    const count = elementos.filter(el => el.tipoElemento === type).length + 1;
    const defaultNames = {
      TABLERO: `Tablero Distribución ${count}`,
      TRANSFORMADOR: `Transformador Principal ${count}`,
      GENERADOR: `Generador Emergencia ${count}`,
      TRANSFER: `ATS Transferencia ${count}`,
      PUESTA_TIERRA: `Malla de Tierra ${count}`,
      SUBESTACION: `Celda Subestación ${count}`,
      OTRO: `Equipo Especial ${count}`
    };

    const targetCompanyId = companyId || (elementos.length > 0 ? elementos[0].empresaId || elementos[0].companyId : null);

    const payload = {
      nombre: defaultNames[type] || `Equipo ${type} ${count}`,
      tipoElemento: type,
      ubicacion: 'Sala Eléctrica',
      alimentadoPor: '',
      observacionesGenerales: '',
      companyId: targetCompanyId,
      proyectoId: proyectoId,
      datosTecnicos: {
        positionX: randomPos.x,
        positionY: randomPos.y,
        kva: type === 'TRANSFORMADOR' || type === 'GENERADOR' ? '75' : '',
        fases: '3'
      }
    };

    const res = await addElementoUnifilar(proyectoId, payload);
    if (res && res.success) {
      showToast(`${type} agregado al diagrama correctamente.`, 'success');
      setSelectedNode(res.elemento);
    } else {
      showToast(res?.error || 'Error al agregar elemento.', 'error');
    }
  };

  // Guardar propiedades editadas
  const handleSaveProperties = async (e) => {
    if (e) e.preventDefault();
    if (!selectedNode) return;

    const updated = {
      nombre: editNombre.trim(),
      tipoElemento: editTipo,
      ubicacion: editUbicacion.trim(),
      alimentadoPor: editAlimentadoPor,
      observacionesGenerales: editObservaciones.trim(),
      datosTecnicos: {
        ...selectedNode.datosTecnicos,
        kva: editKva.trim(),
        fases: editFases.trim(),
        positionX: selectedNode.datosTecnicos?.positionX || 300,
        positionY: selectedNode.datosTecnicos?.positionY || 200
      }
    };

    await updateElementoUnifilar(proyectoId || selectedNode.proyectoId, selectedNode.id, updated);
    showToast('Propiedades del elemento actualizadas.', 'success');
  };

  // Eliminar elemento del diagrama
  const handleDeleteElement = async () => {
    if (!selectedNode) return;
    if (window.confirm(`¿Estás seguro de que deseas eliminar permanentemente el equipo "${selectedNode.nombre}" y desvincular todas sus conexiones?`)) {
      const idToDelete = selectedNode.id;
      
      // Desconectar huérfanos antes de eliminar para mantener coherencia en cascada
      elementos.forEach(async (el) => {
        if (el.alimentadoPor === selectedNode.nombre || el.alimentadoPor === selectedNode.id) {
          await updateElementoUnifilar(proyectoId || el.proyectoId, el.id, { alimentadoPor: '' });
        }
      });

      setSelectedNode(null);
      await deleteElementoUnifilar(proyectoId || selectedNode.proyectoId, idToDelete);
      showToast('Equipo eliminado del diagrama.', 'info');
    }
  };

  // Desconectar elemento seleccionado
  const handleDisconnectElement = async () => {
    if (!selectedNode) return;
    setEditAlimentadoPor('');
    await updateElementoUnifilar(proyectoId || selectedNode.proyectoId, selectedNode.id, { alimentadoPor: '' });
    showToast('Conexión de alimentación removida.', 'info');
  };

  // Manejar click en nodo del lienzo
  const handleNodeClick = (node) => {
    if (isConnectionMode) {
      // Flujo de Conexión
      if (!connectionSource) {
        // Seleccionar origen
        setConnectionSource(node);
        showToast(`Origen seleccionado: ${node.nombre}. Haz clic en el equipo destino para conectarlo.`, 'info');
      } else {
        // Seleccionar destino
        if (connectionSource.id === node.id) {
          showToast('No puedes conectar un equipo consigo mismo.', 'error');
          return;
        }
        
        // El destino es alimentado por el origen
        updateElementoUnifilar(proyectoId || node.proyectoId, node.id, { 
          alimentadoPor: connectionSource.nombre 
        });

        showToast(`Conexión establecida: ${connectionSource.nombre} ➔ ${node.nombre}`, 'success');
        
        // Resetear modo conexión
        setIsConnectionMode(false);
        setConnectionSource(null);
      }
    } else {
      setSelectedNode(node);
    }
  };

  // Lista de posibles alimentadores (excluye al nodo mismo para evitar bucles)
  const potentialFeeders = elementos.filter(el => selectedNode && el.id !== selectedNode.id);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose} />

        {/* Ventana Principal */}
        <div className="relative w-full max-w-7xl h-[95vh] bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
          
          {/* Cabecera */}
          <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-950/45 shrink-0 select-none">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-955 rounded-xl border border-amber-800/40 animate-pulse">
                <Zap className="w-5 h-5 text-amber-500 animate-bounce" style={{ animationDuration: '3s' }} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-100 font-mono flex items-center gap-2">
                  Editor de Diagrama Unifilar CAD <span className="text-[10px] text-amber-500 bg-amber-950/60 border border-amber-900 px-2 py-0.5 rounded-full font-sans lowercase">interactivo</span>
                </h3>
                <p className="text-[10px] text-slate-455 font-sans">
                  {companyName} — {projectName} • Arrastra equipos, haz doble clic para editar o usa el trazador de conexiones.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2.5 no-print">
              {/* Botón de Modo Conexión */}
              <button
                onClick={() => {
                  setIsConnectionMode(!isConnectionMode);
                  setConnectionSource(null);
                  if(!isConnectionMode) {
                    showToast('Modo de conexión activado. Haz clic en el equipo alimentador (origen).', 'info');
                  }
                }}
                className={`px-3 py-1.5 border text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
                  isConnectionMode 
                    ? 'bg-amber-500 border-amber-400 text-slate-950 hover:bg-amber-400 animate-pulse' 
                    : 'bg-slate-950 border-slate-800 text-slate-350 hover:text-white hover:border-slate-700'
                }`}
              >
                <Link2 className="w-4 h-4" /> 
                {isConnectionMode ? 'Conectando...' : 'Trazar Conexión'}
              </button>

              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 text-slate-355 hover:text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md hover:border-slate-700"
              >
                Imprimir Plano
              </button>
              
              <button 
                onClick={onClose}
                className="p-1.5 hover:bg-slate-855 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Banner informativo de Modo Conexión */}
          {isConnectionMode && (
            <div className="bg-amber-500 text-slate-950 font-bold px-5 py-2.5 text-xs text-center flex items-center justify-center gap-2.5 shrink-0 font-mono animate-slideDown select-none">
              <Zap className="w-4 h-4 fill-current animate-bounce" />
              <span>
                {connectionSource 
                  ? `[1/2] Origen seleccionado: ${connectionSource.nombre}. Ahora haz clic en el equipo de DESTINO para conectarlo.` 
                  : 'MODO CONEXIÓN ACTIVO: Haz clic en el equipo de ORIGEN (alimentador principal / tablero de distribución).'}
              </span>
              <button 
                onClick={() => {
                  setIsConnectionMode(false);
                  setConnectionSource(null);
                }}
                className="ml-4 px-2 py-0.5 border border-slate-950/40 rounded text-[9px] hover:bg-slate-950 hover:text-amber-500 font-bold transition-all uppercase"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Contenido Principal */}
          <div className="flex-1 flex overflow-hidden min-h-0">
            
            {/* 1. PALETA DE SÍMBOLOS (Izquierda) */}
            <div className="w-56 bg-slate-955/60 p-4 border-r border-slate-850/60 flex flex-col space-y-4 select-none shrink-0 no-print">
              <div>
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-2">Equipos & Símbolos</h4>
                <p className="text-[9.5px] text-slate-450 leading-relaxed">
                  Haz clic en cualquier símbolo para insertarlo en el plano interactivo.
                </p>
              </div>
              
              <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                {catalogOfSymbols.map(sym => (
                  <button
                    key={sym.type}
                    onClick={() => handleAddSymbol(sym.type)}
                    className="w-full p-2.5 bg-slate-900/40 hover:bg-slate-800/80 active:scale-98 border border-slate-850 hover:border-slate-700 rounded-xl flex items-center gap-3 transition-all text-left text-xs group cursor-pointer"
                  >
                    <div className="w-9 h-9 shrink-0 flex items-center justify-center bg-slate-950 rounded-xl text-slate-455 group-hover:text-amber-500 group-hover:bg-slate-900 border border-slate-855 transition-all shadow-inner">
                      {sym.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-200 group-hover:text-white transition-colors truncate">{sym.label}</div>
                      <div className="text-[9px] text-slate-500 truncate">{sym.desc}</div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-850/60 text-[9px] text-slate-500 leading-normal font-sans">
                💡 <strong>Consejo:</strong> Arrastra libremente los símbolos una vez colocados en el lienzo para organizar el diagrama.
              </div>
            </div>

            {/* 2. LIENZO (Centro) */}
            <div className="flex-1 overflow-hidden relative flex flex-col bg-slate-950">
              <div className="flex-1 overflow-hidden">
                <DiagramaUnifilarBlueprint
                  elementos={elementos}
                  companyName={companyName}
                  projectName={projectName}
                  interactive={true}
                  selectedNodeId={selectedNode?.id}
                  onNodeSelect={handleNodeClick}
                />
              </div>
            </div>

            {/* 3. PANEL DE PROPIEDADES (Derecha) */}
            <div className="w-80 bg-slate-955/60 p-5 overflow-y-auto shrink-0 flex flex-col justify-between border-l border-slate-850/60 no-print select-none">
              {selectedNode ? (
                <div className="space-y-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-5">
                    {/* Ficha técnica cabecera */}
                    <div className="space-y-1.5 pb-4 border-b border-slate-850">
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] font-mono font-bold text-slate-550 uppercase tracking-widest">FICHA TÉCNICA</span>
                        <span className="text-[9.5px] font-mono font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-500 uppercase">
                          {selectedNode.tipoElemento}
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-slate-100 tracking-wide font-mono uppercase truncate">{selectedNode.nombre}</h4>
                      <span className="text-[9.5px] font-mono font-bold text-slate-500">ID: {selectedNode.id}</span>
                    </div>

                    {/* Formulario de Edición */}
                    <form onSubmit={handleSaveProperties} className="space-y-4 text-xs font-mono">
                      <div>
                        <label className="block text-slate-450 font-bold mb-1 uppercase text-[9px] tracking-wider">Nombre del Equipo</label>
                        <input
                          type="text"
                          value={editNombre}
                          onChange={(e) => setEditNombre(e.target.value)}
                          placeholder="Ej. Tablero General A"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500 font-sans"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-450 font-bold mb-1 uppercase text-[9px] tracking-wider">Tipo de Equipo</label>
                        <select
                          value={editTipo}
                          onChange={(e) => setEditTipo(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500 font-sans cursor-pointer"
                        >
                          <option value="TABLERO">Tablero Eléctrico</option>
                          <option value="TRANSFORMADOR">Transformador</option>
                          <option value="GENERADOR">Generador / Planta</option>
                          <option value="TRANSFER">ATS / Transferencia</option>
                          <option value="PUESTA_TIERRA">Puesta a Tierra</option>
                          <option value="SUBESTACION">Celda Subestación</option>
                          <option value="OTRO">Otro Elemento</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-450 font-bold mb-1 uppercase text-[9px] tracking-wider">Ubicación Física</label>
                        <input
                          type="text"
                          value={editUbicacion}
                          onChange={(e) => setEditUbicacion(e.target.value)}
                          placeholder="Ej. Cuarto de Bombas"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500 font-sans"
                        />
                      </div>

                      {/* Dropdown de Alimentación */}
                      <div>
                        <label className="block text-slate-450 font-bold mb-1 uppercase text-[9px] tracking-wider">Alimentado por (Origen de Flujo)</label>
                        <div className="flex gap-1.5 items-center">
                          <select
                            value={editAlimentadoPor}
                            onChange={(e) => setEditAlimentadoPor(e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500 font-sans cursor-pointer text-xs min-w-0"
                          >
                            <option value="">Ninguno (Origen del Sistema)</option>
                            {potentialFeeders.map(el => (
                              <option key={el.id} value={el.nombre}>{el.nombre} ({el.id})</option>
                            ))}
                          </select>
                          {editAlimentadoPor && (
                            <button
                              type="button"
                              onClick={handleDisconnectElement}
                              title="Desconectar alimentación"
                              className="p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 rounded-lg cursor-pointer"
                            >
                              <Unlink className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-450 font-bold mb-1 uppercase text-[9px] tracking-wider">Capacidad / KVA</label>
                          <input
                            type="text"
                            value={editKva}
                            onChange={(e) => setEditKva(e.target.value)}
                            placeholder="Ej. 150 kVA"
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500 font-sans"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-450 font-bold mb-1 uppercase text-[9px] tracking-wider">Fases / Polos</label>
                          <input
                            type="text"
                            value={editFases}
                            onChange={(e) => setEditFases(e.target.value)}
                            placeholder="Ej. 3F / 42P"
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500 font-sans"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-450 font-bold mb-1 uppercase text-[9px] tracking-wider font-mono">Observaciones</label>
                        <textarea
                          value={editObservaciones}
                          onChange={(e) => setEditObservaciones(e.target.value)}
                          placeholder="Notas del equipo..."
                          rows="3"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500 font-sans resize-none text-[11px]"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 bg-amber-500 text-slate-950 font-black hover:bg-amber-400 active:scale-98 transition-all rounded-xl cursor-pointer text-center font-sans shadow-md flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-4 h-4" /> Guardar Cambios
                      </button>
                    </form>
                  </div>

                  {/* Acciones Rápidas del Nodo (Navegar y Eliminar) */}
                  <div className="space-y-2.5 pt-4 border-t border-slate-855 mt-6 shrink-0">
                    {selectedNode.tipoElemento === 'TABLERO' && (
                      <button
                        onClick={() => {
                          onClose();
                          navigate(`/empresa/${selectedNode.empresaId || companyId}/tablero/${selectedNode.id}`);
                        }}
                        className="w-full bg-slate-100 text-slate-950 font-black hover:bg-white active:scale-98 transition-all px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs cursor-pointer shadow-md"
                      >
                        Abrir Ficha de Polos <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                    
                    <button
                      onClick={handleDeleteElement}
                      className="w-full bg-red-950/20 hover:bg-red-900/30 border border-red-900/40 text-red-400 font-bold transition-all px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Eliminar Equipo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 space-y-3 flex-1 flex flex-col justify-center items-center">
                  <Info className="w-8 h-8 text-slate-700" />
                  <p className="text-[10px] text-slate-500 max-w-[200px] font-sans leading-relaxed">
                    Haz clic sobre cualquier equipo en el diagrama unifilar para ver o editar sus especificaciones técnicas, cambiar sus conexiones o eliminarlo.
                  </p>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>

      {/* Versión invisible para imprimir que se activa con el print CSS */}
      <div className="hidden print:block fixed inset-0 bg-white z-50 w-screen h-screen p-0 m-0">
        <DiagramaUnifilarBlueprint
          elementos={elementos}
          companyName={companyName}
          projectName={projectName}
          interactive={false}
        />
      </div>
    </>
  );
}
