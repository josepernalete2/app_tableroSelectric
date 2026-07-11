import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, Camera, Check, Search, PlusCircle, AlertCircle, Settings, ClipboardList } from 'lucide-react';

const AMP_OPTIONS = ['N/A', '10', '15', '20', '30', '40', '50', '60', '70', '80', '90', '100', '125', '150', '175', '200', '225', '250', '300', '350', '400', '500'];
const COND_OPTIONS = ['N/A', '14', '12', '10', '8', '6', '4', '2', '1/0', '2/0', '3/0', '4/0', '250', '350', '500 MCM', '2X12', '4X12', '3X8 TW', '1X500', 'SOLIDO # 4'];
const MARCA_OPTIONS = ['GE', 'EATON', 'ABB', 'INESLA', 'MG', 'SQUARE D', 'SIEMENS', 'CUTLER-HAMMER', 'N/A'];
const TIPO_OPTIONS = ['TQ', 'TQD', 'M35', 'A2C', 'NS', 'TED32', 'M51', 'TM250', 'QO', 'THQL', 'N/A'];

// Mock de elementos ya creados en el sistema para vincular (Sub-tableros, etc.)
const MOCK_ELEMENTOS_CREADOS = [
  { id: '10', nombre: 'Tablero de Imágenes Médicas (Sótano)', tipo: 'Tablero' },
  { id: '12', nombre: 'Sub-Tablero de Climatización Piso 1', tipo: 'Tablero' },
  { id: '13', nombre: 'Tablero de Emergencia Planta Eléctrica', tipo: 'Tablero' },
  { id: '14', nombre: 'Tablero de Fuerza Bombas de Agua', tipo: 'Tablero' },
  { id: '15', nombre: 'Tablero Iluminación Estacionamiento', tipo: 'Tablero' },
  { id: '16', nombre: 'Sub-Tablero Servidores (UPS)', tipo: 'Tablero' }
];

export const ModalEdicionCircuito = ({
  isOpen,
  onClose,
  circuitData,
  onSave,
  elementosCreados = MOCK_ELEMENTOS_CREADOS,
  onAgregarPorCrear,
}) => {
  const [step, setStep] = useState('PREGUNTA_ES_ARTEFACTO');

  // Ruta SI: Ficha de Artefacto
  const [breakerAmp, setBreakerAmp] = useState('');
  const [breakerMarca, setBreakerMarca] = useState('');
  const [breakerTipo, setBreakerTipo] = useState('');
  const [conductor, setConductor] = useState('');
  const [nombreArtefacto, setNombreArtefacto] = useState('');
  const [descArtefacto, setDescArtefacto] = useState('');
  const [potenciaWatts, setPotenciaWatts] = useState('');

  // Ruta NO: ¿Alimenta otro elemento?
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLink, setSelectedLink] = useState(null);

  // Ruta No alimenta otro: Rótulo y Foto
  const [rotulo, setRotulo] = useState('');
  const [fotoUrl, setFotoUrl] = useState(null);

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (circuitData && isOpen) {
      setBreakerAmp(circuitData.breaker?.amp || '');
      setBreakerMarca(circuitData.breaker?.marca || '');
      setBreakerTipo(circuitData.breaker?.tipo || '');
      setConductor(circuitData.conductor || '');
      setNombreArtefacto(circuitData.tipoDestino === 'ARTEFACTO' ? circuitData.equipo : '');
      setDescArtefacto(circuitData.ficha?.descripcion || '');
      setPotenciaWatts(circuitData.ficha?.potenciaWatts || '');
      setRotulo(circuitData.equipo || '');
      setFotoUrl(circuitData.fotografia || null);

      if (circuitData.tipoDestino === 'ARTEFACTO') {
        setStep('FORMULARIO_ARTEFACTO');
      } else if (circuitData.tipoDestino === 'SUB_TABLERO') {
        setStep('VINCULAR_EXISTENTE');
        const found = elementosCreados.find(el => el.nombre === circuitData.equipo || el.id === circuitData.vinculadoId);
        if (found) {
          setSelectedLink(found);
          setSearchQuery(found.nombre);
        } else {
          setSearchQuery(circuitData.equipo || '');
        }
      } else if (circuitData.tipoDestino === 'SUB_TABLERO_PENDIENTE') {
        setStep('ALIMENTAR_POR_CREAR');
      } else {
        setStep('PREGUNTA_ES_ARTEFACTO');
      }
    }
  }, [circuitData, isOpen, elementosCreados]);

  if (!isOpen || !circuitData) return null;

  // Filtrado de autocompletado
  const filteredElements = elementosCreados.filter((el) =>
    el.nombre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveArtefacto = () => {
    if (!nombreArtefacto.trim()) return alert('Por favor, ingresa el nombre del artefacto.');
    onSave(circuitData.id, {
      equipo: nombreArtefacto,
      tipoDestino: 'ARTEFACTO',
      breaker: { amp: breakerAmp, marca: breakerMarca, tipo: breakerTipo },
      conductor: conductor,
      ficha: {
        descripcion: descArtefacto,
        potenciaWatts: potenciaWatts ? parseFloat(potenciaWatts) : null,
      },
    });
    onClose();
  };

  const handleSaveVinculo = (linkElement) => {
    const el = linkElement || selectedLink;
    if (!el) return alert('Por favor, selecciona un elemento para vincular.');
    onSave(circuitData.id, {
      equipo: el.nombre,
      tipoDestino: 'SUB_TABLERO',
      vinculadoId: el.id,
      breaker: circuitData.breaker,
      conductor: circuitData.conductor,
    });
    onClose();
  };

  const handleSavePorCrear = () => {
    // Label as RESERVA and add to creating queue
    const pendingName = `Sub-Tablero en Polo ${circuitData.poles.join(', ')}`;
    if (onAgregarPorCrear) {
      onAgregarPorCrear({
        nombre: pendingName,
        circuitoId: circuitData.id,
      });
    }
    onSave(circuitData.id, {
      equipo: 'RESERVA (Pendiente por Crear)',
      tipoDestino: 'SUB_TABLERO_PENDIENTE',
      breaker: circuitData.breaker,
      conductor: circuitData.conductor,
    });
    onClose();
  };

  const handleSaveRotuloFoto = () => {
    onSave(circuitData.id, {
      equipo: rotulo.trim() || 'RESERVA',
      tipoDestino: 'RESERVA',
      fotografia: fotoUrl,
      breaker: circuitData.breaker,
      conductor: conductor || circuitData.conductor,
    });
    onClose();
  };

  // Simulación de toma de foto
  const simularCapturaFoto = () => {
    const mockPhotos = [
      'https://images.unsplash.com/photo-1621905252507-b354bc25edac?auto=format&fit=crop&w=400&q=80', // breakers
      'https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?auto=format&fit=crop&w=400&q=80', // cables
    ];
    const randomPhoto = mockPhotos[Math.floor(Math.random() * mockPhotos.length)];
    setFotoUrl(randomPhoto);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Fondo difuminado */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" 
        onClick={onClose} 
      />

      {/* Contenedor del Modal */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all flex flex-col max-h-[90vh]">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-500/10 to-amber-600/10 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            {step !== 'PREGUNTA_ES_ARTEFACTO' && (
              <button 
                onClick={() => {
                  if (step === 'FORMULARIO_ARTEFACTO' || step === 'PREGUNTA_ALIMENTA_OTRO') {
                    setStep('PREGUNTA_ES_ARTEFACTO');
                  } else if (step === 'PREGUNTA_CREADO' || step === 'ROTULAR_Y_FOTO') {
                    setStep('PREGUNTA_ALIMENTA_OTRO');
                  } else if (step === 'VINCULAR_EXISTENTE' || step === 'ALIMENTAR_POR_CREAR') {
                    setStep('PREGUNTA_CREADO');
                  }
                }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </button>
            )}
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Configurar Circuito
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Polos: <span className="font-mono font-bold text-amber-600">{circuitData.poles.join(', ')}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Contenido / Pantallas */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* 1. ¿Es un equipo o artefacto? */}
          {step === 'PREGUNTA_ES_ARTEFACTO' && (
            <div className="space-y-6">
              <div className="text-center">
                <Settings className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                  ¿El circuito alimenta a un equipo o artefacto final?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Selecciona la categoría del elemento alimentado por esta salida eléctrica.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setStep('FORMULARIO_ARTEFACTO')}
                  className="flex flex-col items-center justify-center p-6 h-36 rounded-xl border-2 border-slate-200 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-500 hover:bg-amber-500/5 transition-all text-center group cursor-pointer active:scale-95"
                >
                  <span className="text-3xl mb-2">🔌</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-600">Sí, es un Artefacto</span>
                  <span className="text-[10px] text-slate-400 mt-1">Luminarias, motores, tomacorrientes directos</span>
                </button>
                <button
                  onClick={() => setStep('PREGUNTA_ALIMENTA_OTRO')}
                  className="flex flex-col items-center justify-center p-6 h-36 rounded-xl border-2 border-slate-200 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-500 hover:bg-amber-500/5 transition-all text-center group cursor-pointer active:scale-95"
                >
                  <span className="text-3xl mb-2">⚡</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-600">No es un Artefacto</span>
                  <span className="text-[10px] text-slate-400 mt-1">Sub-tableros, reservas, derivaciones</span>
                </button>
              </div>
            </div>
          )}

          {/* 2A. Formulario de Ficha de Artefacto (SI) */}
          {step === 'FORMULARIO_ARTEFACTO' && (
            <div className="space-y-5">
              <div className="bg-amber-500/10 p-3 rounded-lg flex gap-3 items-center mb-2">
                <ClipboardList className="w-5 h-5 text-amber-600" />
                <span className="text-xs text-amber-800 dark:text-amber-200 font-medium">Llenar Ficha del Artefacto Final</span>
              </div>
              <div className="space-y-4">
                {/* Nombre */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nombre del Equipo / Artefacto
                  </label>
                  <input
                    type="text"
                    value={nombreArtefacto}
                    onChange={(e) => setNombreArtefacto(e.target.value)}
                    placeholder="Ej. Extractor de Aire Sótano, Motor Bomba 1"
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                {/* Breaker y Conductor */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Breaker (Amperaje)
                    </label>
                    <select
                      value={breakerAmp}
                      onChange={(e) => setBreakerAmp(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      {AMP_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Conductor (Calibre)
                    </label>
                    <select
                      value={conductor}
                      onChange={(e) => setConductor(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      {COND_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                </div>

                {/* Marca y Tipo Breaker */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Breaker (Marca)
                    </label>
                    <select
                      value={breakerMarca}
                      onChange={(e) => setBreakerMarca(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      {MARCA_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Breaker (Tipo)
                    </label>
                    <select
                      value={breakerTipo}
                      onChange={(e) => setBreakerTipo(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      {TIPO_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                </div>

                {/* Potencia Watts */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Potencia Estimada (Watts)
                  </label>
                  <input
                    type="number"
                    value={potenciaWatts}
                    onChange={(e) => setPotenciaWatts(e.target.value)}
                    placeholder="Ej. 1500"
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                {/* Descripción Ficha */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ficha Técnica / Notas adicionales
                  </label>
                  <textarea
                    value={descArtefacto}
                    onChange={(e) => setDescArtefacto(e.target.value)}
                    placeholder="Detalles sobre marca, modelo del equipo, ubicación exacta..."
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <button
                  onClick={handleSaveArtefacto}
                  className="px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition-colors w-full sm:w-auto cursor-pointer"
                >
                  Guardar Ficha
                </button>
              </div>
            </div>
          )}

          {/* 3. ¿El circuito alimenta a otro elemento? (NO) */}
          {step === 'PREGUNTA_ALIMENTA_OTRO' && (
            <div className="space-y-6">
              <div className="text-center">
                <Cpu className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                  ¿El circuito alimenta a otro elemento del sistema?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Por ejemplo: alimenta a un Sub-Tablero de distribución o tablero de control secundario.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setStep('PREGUNTA_CREADO')}
                  className="flex flex-col items-center justify-center p-6 h-32 rounded-xl border-2 border-slate-200 dark:border-slate-800 hover:border-amber-500 hover:bg-amber-500/5 transition-all cursor-pointer active:scale-95"
                >
                  <span className="text-2xl mb-1">🏢</span>
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Sí, alimenta a otro elemento</span>
                  <span className="text-[10px] text-slate-400 mt-1">Como un Sub-Tablero</span>
                </button>
                <button
                  onClick={() => setStep('ROTULAR_Y_FOTO')}
                  className="flex flex-col items-center justify-center p-6 h-32 rounded-xl border-2 border-slate-200 dark:border-slate-800 hover:border-amber-500 hover:bg-amber-500/5 transition-all cursor-pointer active:scale-95"
                >
                  <span className="text-2xl mb-1">🏷️</span>
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-200">No, no alimenta otro elemento</span>
                  <span className="text-[10px] text-slate-400 mt-1">Es reserva o vacío</span>
                </button>
              </div>
            </div>
          )}

          {/* 4. ¿Está creado el elemento? (SI) */}
          {step === 'PREGUNTA_CREADO' && (
            <div className="space-y-6">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                  ¿El elemento de destino ya está creado en el sistema?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Confirma si el Sub-Tablero ya está registrado en tu listado de inspección.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setStep('VINCULAR_EXISTENTE')}
                  className="flex flex-col items-center justify-center p-6 h-32 rounded-xl border-2 border-slate-200 dark:border-slate-800 hover:border-amber-500 hover:bg-amber-500/5 transition-all cursor-pointer active:scale-95"
                >
                  <span className="text-2xl mb-1">🔗</span>
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Sí, ya está creado</span>
                  <span className="text-[10px] text-slate-400 mt-1">Buscar y vincular</span>
                </button>
                <button
                  onClick={() => setStep('ALIMENTAR_POR_CREAR')}
                  className="flex flex-col items-center justify-center p-6 h-32 rounded-xl border-2 border-slate-200 dark:border-slate-800 hover:border-amber-500 hover:bg-amber-500/5 transition-all cursor-pointer active:scale-95"
                >
                  <span className="text-2xl mb-1">📝</span>
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-200">No está creado</span>
                  <span className="text-[10px] text-slate-400 mt-1">Añadir a pendientes</span>
                </button>
              </div>
            </div>
          )}

          {/* 5A. Autocompletado / Vincular Existente (SI) */}
          {step === 'VINCULAR_EXISTENTE' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Buscar Elemento Creado
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSelectedLink(null);
                    }}
                    placeholder="Escribe el nombre del sub-tablero..."
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <Search className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
                </div>
              </div>

              {/* Lista filtrada de autocompletado */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {filteredElements.length > 0 ? (
                  filteredElements.map((el) => (
                    <button
                      key={el.id}
                      onClick={() => {
                        setSelectedLink(el);
                        setSearchQuery(el.nombre);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 flex justify-between items-center transition-colors cursor-pointer ${
                        selectedLink?.id === el.id ? 'bg-amber-500/10 hover:bg-amber-500/15' : ''
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{el.nombre}</p>
                        <p className="text-[10px] text-slate-400">{el.tipo}</p>
                      </div>
                      {selectedLink?.id === el.id && <Check className="w-4 h-4 text-amber-500" />}
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                    No se encontraron elementos con ese nombre.
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => handleSaveVinculo()}
                  disabled={!selectedLink}
                  className="px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-colors w-full cursor-pointer"
                >
                  Vincular y Guardar
                </button>
              </div>
            </div>
          )}

          {/* 5B. Alimentar Lista por Crear (NO) */}
          {step === 'ALIMENTAR_POR_CREAR' && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto">
                <PlusCircle className="w-10 h-10 text-blue-500" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  ¿Agregar a la Lista de Elementos por Crear?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 px-4 leading-relaxed">
                  Al confirmar, se registrará una tarea pendiente para crear este nuevo Sub-Tablero. El circuito actual se rotulará como <span className="font-bold text-amber-600 dark:text-amber-500">"RESERVA (Pendiente por Crear)"</span> de manera provisional.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={handleSavePorCrear}
                  className="px-6 py-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm shadow-md transition-colors w-full cursor-pointer active:scale-[0.98]"
                >
                  Agregar a la Lista de Pendientes
                </button>
              </div>
            </div>
          )}

          {/* 3B. Rotular y Foto (NO ALIMENTA OTRO) */}
          {step === 'ROTULAR_Y_FOTO' && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Rótulo del Circuito
                </label>
                <input
                  type="text"
                  value={rotulo}
                  onChange={(e) => setRotulo(e.target.value)}
                  placeholder="Ej. RESERVA, VACÍO, SIN USAR"
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Conductor */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Conductor (Calibre opcional)
                </label>
                <select
                  value={conductor}
                  onChange={(e) => setConductor(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  {COND_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              {/* Agregar Fotografía */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Agregar Fotografía
                </label>
                
                {fotoUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-48 flex justify-center items-center bg-slate-900">
                    <img 
                      src={fotoUrl} 
                      alt="Circuito" 
                      className="object-contain max-h-48 w-full"
                    />
                    <button
                      onClick={() => setFotoUrl(null)}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-full shadow-lg transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={simularCapturaFoto}
                    className="w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:border-amber-500 flex flex-col items-center justify-center text-slate-400 hover:text-amber-500 transition-all cursor-pointer bg-slate-50 dark:bg-slate-800/40"
                  >
                    <Camera className="w-8 h-8 mb-2" />
                    <span className="text-xs font-semibold">Capturar o Subir Foto</span>
                    <span className="text-[9px] mt-0.5 text-slate-400">Captura directa desde la tableta</span>
                  </button>
                )}
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <button
                  onClick={handleSaveRotuloFoto}
                  className="px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition-colors w-full cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ModalEdicionCircuito;
