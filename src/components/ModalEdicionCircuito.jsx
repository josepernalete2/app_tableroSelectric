import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, Camera, Check, Search, PlusCircle, AlertCircle, Settings, ClipboardList, Cpu, Zap } from 'lucide-react';

const normalizeText = (str) => {
  if (typeof str !== 'string' || !str) return str || '';
  return str.trim().replace(/\s+/g, ' ').toUpperCase();
};

// Mock de fallback para elementos disponibles
const MOCK_ELEMENTOS_CREADOS = [
  { id: 'TAB-1', nombre: 'TABLERO PRINCIPAL DE BAJA TENSIÓN', tipo: 'TABLERO' },
  { id: 'SUB-1', nombre: 'SUBESTACIÓN PRINCIPAL 13.8KV', tipo: 'SUBESTACION' },
  { id: 'ATS-1', nombre: 'TRANSFERENCIA AUTOMÁTICA SÓTANO', tipo: 'TRANSFER' },
  { id: 'CCM-1', nombre: 'CCM BOMBAS DE AGUA', tipo: 'CCM' }
];

export const ModalEdicionCircuito = ({
  isOpen,
  onClose,
  circuitData,
  onSave,
  elementosCreados = MOCK_ELEMENTOS_CREADOS,
  onAgregarPorCrear,
  tipoOrigen = 'TABLERO',
  modo = 'SALIDA'
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

  // Parámetros Físicos
  const [numPolos, setNumPolos] = useState(1);
  const [posicionPolo, setPosicionPolo] = useState(1);
  const [estado, setEstado] = useState('ACTIVO');

  // Ruta NO: Alimenta otro elemento
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLink, setSelectedLink] = useState(null);

  // Ruta Reserva / Rótulo
  const [rotulo, setRotulo] = useState('');
  const [fotoUrl, setFotoUrl] = useState(null);

  // Cargar datos cuando abre el modal
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

      setNumPolos(circuitData.poles?.length || circuitData.numPolos || 1);
      setPosicionPolo(circuitData.poles?.[0] || circuitData.posicionPolo || 1);
      setEstado(circuitData.estado || 'ACTIVO');

      if (circuitData.tipoDestino === 'ARTEFACTO') {
        setStep('FORMULARIO_ARTEFACTO');
      } else if (circuitData.tipoDestino === 'SUB_TABLERO' || circuitData.tipoDestino === 'ELEMENTO') {
        setStep('VINCULAR_EXISTENTE');
        const found = elementosCreados.find(el => el.nombre === circuitData.equipo || el.id === circuitData.vinculadoId);
        if (found) {
          setSelectedLink(found);
          setSearchQuery(found.nombre);
        } else {
          setSearchQuery(circuitData.equipo || '');
        }
      } else if (circuitData.tipoDestino === 'SUB_TABLERO_PENDIENTE' || circuitData.tipoDestino === 'ELEMENTO_PENDIENTE') {
        setStep('ALIMENTAR_POR_CREAR');
      } else {
        setStep('PREGUNTA_ES_ARTEFACTO');
      }
    }
  }, [circuitData, isOpen, elementosCreados]);

  if (!isOpen || !circuitData) return null;

  // Filtrado de equipos
  const filteredElements = (elementosCreados || []).filter((el) =>
    (el.nombre || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (el.id || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPolesArray = (startPole, n) => {
    const arr = [];
    for (let i = 0; i < n; i++) {
      arr.push(startPole + i * 2);
    }
    return arr;
  };

  const handleSaveArtefacto = () => {
    if (!nombreArtefacto.trim()) return alert('Por favor, ingresa el nombre del artefacto.');
    onSave(circuitData.id, {
      equipo: normalizeText(nombreArtefacto),
      tipoDestino: 'ARTEFACTO',
      breaker: {
        amp: normalizeText(breakerAmp),
        marca: normalizeText(breakerMarca),
        tipo: normalizeText(breakerTipo)
      },
      conductor: normalizeText(conductor),
      poles: getPolesArray(posicionPolo, numPolos),
      numPolos: numPolos,
      posicionPolo: posicionPolo,
      estado: estado,
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
      equipo: normalizeText(el.nombre),
      tipoDestino: 'SUB_TABLERO',
      vinculadoId: el.id,
      breaker: {
        amp: normalizeText(breakerAmp || circuitData.breaker?.amp),
        marca: normalizeText(breakerMarca || circuitData.breaker?.marca),
        tipo: normalizeText(breakerTipo || circuitData.breaker?.tipo)
      },
      conductor: normalizeText(conductor || circuitData.conductor),
      poles: getPolesArray(posicionPolo, numPolos),
      numPolos: numPolos,
      posicionPolo: posicionPolo,
      estado: estado
    });
    onClose();
  };

  const handleSavePorCrear = () => {
    const calculatedPoles = getPolesArray(posicionPolo, numPolos);
    const pendingName = `Equipo / Sub-Elemento (Polo ${calculatedPoles.join(', ')})`;
    if (onAgregarPorCrear) {
      onAgregarPorCrear({
        nombre: pendingName,
        circuitoId: circuitData.id,
      });
    }
    onSave(circuitData.id, {
      equipo: 'RESERVA (Pendiente por Crear)',
      tipoDestino: 'SUB_TABLERO_PENDIENTE',
      breaker: {
        amp: normalizeText(breakerAmp || circuitData.breaker?.amp),
        marca: normalizeText(breakerMarca || circuitData.breaker?.marca),
        tipo: normalizeText(breakerTipo || circuitData.breaker?.tipo)
      },
      conductor: normalizeText(conductor || circuitData.conductor),
      poles: calculatedPoles,
      numPolos: numPolos,
      posicionPolo: posicionPolo,
      estado: estado
    });
    onClose();
  };

  const handleSaveRotuloFoto = () => {
    onSave(circuitData.id, {
      equipo: normalizeText(rotulo) || 'RESERVA',
      tipoDestino: 'RESERVA',
      fotografia: fotoUrl,
      breaker: {
        amp: normalizeText(breakerAmp || circuitData.breaker?.amp),
        marca: normalizeText(breakerMarca || circuitData.breaker?.marca),
        tipo: normalizeText(breakerTipo || circuitData.breaker?.tipo)
      },
      conductor: normalizeText(conductor || circuitData.conductor),
      poles: getPolesArray(posicionPolo, numPolos),
      numPolos: numPolos,
      posicionPolo: posicionPolo,
      estado: estado
    });
    onClose();
  };

  const simularCapturaFoto = () => {
    const mockPhotos = [
      'https://images.unsplash.com/photo-1621905252507-b354bc25edac?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?auto=format&fit=crop&w=400&q=80',
    ];
    const randomPhoto = mockPhotos[Math.floor(Math.random() * mockPhotos.length)];
    setFotoUrl(randomPhoto);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Fondo difuminado */}
      <div 
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity" 
        onClick={onClose} 
      />

      {/* Contenedor del Modal */}
      <div className="relative w-full max-w-lg bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[90vh] text-slate-100 font-sans">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-500/10 to-amber-600/10 border-b border-slate-800">
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
                className="p-2 hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5 text-slate-300" />
              </button>
            )}
            <div>
              <h3 className="text-lg font-bold text-slate-100">
                {modo === 'ENTRADA' ? 'Configurar Fuente de Alimentación' : 'Configurar Salida / Circuito'}
              </h3>
              <p className="text-xs text-slate-400">
                Identificador: <span className="font-mono font-bold text-amber-400">{circuitData.nombre || circuitData.id || (circuitData.poles ? `Polo ${circuitData.poles.join(', ')}` : 'Salida')}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Contenido / Pantallas */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Parámetros Físicos del Breaker / Circuito */}
          <div className="bg-slate-950/60 p-4 border border-slate-800 rounded-xl space-y-4 font-sans text-xs">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-1">Polos</label>
                <select
                  value={numPolos}
                  onChange={(e) => setNumPolos(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg px-2 py-1.5 text-slate-100 font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  {[1, 2, 3].map(p => (
                    <option key={p} value={p}>{p === 1 ? '1 Polo (1P)' : p === 2 ? '2 Polos (2P)' : '3 Polos (3P)'}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-1">Polo Inicial</label>
                <input
                  type="number"
                  value={posicionPolo}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (val > 0) setPosicionPolo(val);
                  }}
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg px-2 py-1 text-slate-100 font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-1">Estado</label>
                <select
                  value={estado}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEstado(val);
                    if (val === 'RESERVA') {
                      setNombreArtefacto('RESERVA');
                      setRotulo('RESERVA');
                      setBreakerAmp('');
                      setDescArtefacto('');
                      setPotenciaWatts('');
                    } else if (val === 'DISPONIBLE') {
                      setNombreArtefacto('DISPONIBLE');
                      setRotulo('DISPONIBLE');
                      setBreakerAmp('');
                      setDescArtefacto('');
                      setPotenciaWatts('');
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg px-2 py-1 text-slate-100 font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="ACTIVO">ACTIVO</option>
                  <option value="RESERVA">RESERVA</option>
                  <option value="DISPONIBLE">DISPONIBLE</option>
                </select>
              </div>
            </div>

            {/* Acciones Rápidas */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setEstado('RESERVA');
                  setNombreArtefacto('RESERVA');
                  setRotulo('RESERVA');
                  setBreakerAmp('');
                  setDescArtefacto('');
                  setPotenciaWatts('');
                }}
                className="flex-1 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded font-bold text-[9px] transition-all cursor-pointer uppercase tracking-wider"
              >
                Set RESERVA
              </button>
              <button
                type="button"
                onClick={() => {
                  setEstado('DISPONIBLE');
                  setNombreArtefacto('DISPONIBLE');
                  setRotulo('DISPONIBLE');
                  setBreakerAmp('');
                  setDescArtefacto('');
                  setPotenciaWatts('');
                }}
                className="flex-1 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 rounded font-bold text-[9px] transition-all cursor-pointer uppercase tracking-wider"
              >
                Set DISPONIBLE
              </button>
            </div>
          </div>

          {/* 1. ¿Es un equipo o artefacto? */}
          {step === 'PREGUNTA_ES_ARTEFACTO' && (
            <div className="space-y-6">
              <div className="text-center">
                <Settings className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                <h4 className="text-base font-semibold text-slate-100">
                  ¿El circuito alimenta a un equipo o artefacto final?
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Selecciona la categoría del elemento alimentado por esta salida eléctrica.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setStep('FORMULARIO_ARTEFACTO')}
                  className="flex flex-col items-center justify-center p-6 h-36 rounded-xl border-2 border-slate-800 hover:border-amber-500 hover:bg-amber-500/5 transition-all text-center group cursor-pointer active:scale-95"
                >
                  <span className="text-3xl mb-2">🔌</span>
                  <span className="font-bold text-slate-200 group-hover:text-amber-400">Sí, es un Artefacto</span>
                  <span className="text-[10px] text-slate-400 mt-1">Luminarias, motores, tomacorrientes directos</span>
                </button>
                <button
                  onClick={() => setStep('PREGUNTA_ALIMENTA_OTRO')}
                  className="flex flex-col items-center justify-center p-6 h-36 rounded-xl border-2 border-slate-800 hover:border-amber-500 hover:bg-amber-500/5 transition-all text-center group cursor-pointer active:scale-95"
                >
                  <span className="text-3xl mb-2">⚡</span>
                  <span className="font-bold text-slate-200 group-hover:text-amber-400">No es un Artefacto</span>
                  <span className="text-[10px] text-slate-400 mt-1">Sub-tableros, reservas, derivaciones</span>
                </button>
              </div>
            </div>
          )}

          {/* 2A. Formulario Ficha Artefacto Final */}
          {step === 'FORMULARIO_ARTEFACTO' && (
            <div className="space-y-5">
              <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg flex gap-3 items-center mb-2">
                <ClipboardList className="w-5 h-5 text-amber-400" />
                <span className="text-xs text-amber-300 font-bold">Llenar Ficha del Artefacto Final</span>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Nombre del Equipo / Artefacto
                  </label>
                  <input
                    type="text"
                    value={nombreArtefacto}
                    onChange={(e) => setNombreArtefacto(e.target.value)}
                    placeholder="Ej. Extractor de Aire Sótano, Motor Bomba 1"
                    className="w-full px-3 py-2 text-sm border border-slate-700 rounded-lg bg-slate-950 text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Breaker (Amperaje)
                    </label>
                    <input
                      type="text"
                      list="list-amp-options"
                      value={breakerAmp}
                      onChange={(e) => setBreakerAmp(e.target.value)}
                      placeholder="Ej. 20, 30, 100, 225..."
                      className="w-full px-3 py-2 text-sm border border-slate-700 rounded-lg bg-slate-950 text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <datalist id="list-amp-options">
                      {AMP_OPTIONS.map(opt => <option key={opt} value={opt} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Conductor (Calibre)
                    </label>
                    <input
                      type="text"
                      list="list-cond-options"
                      value={conductor}
                      onChange={(e) => setConductor(e.target.value)}
                      placeholder="Ej. 12, 10, 8, 4/0..."
                      className="w-full px-3 py-2 text-sm border border-slate-700 rounded-lg bg-slate-950 text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <datalist id="list-cond-options">
                      {COND_OPTIONS.map(opt => <option key={opt} value={opt} />)}
                    </datalist>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Breaker (Marca)
                    </label>
                    <input
                      type="text"
                      list="list-marca-options"
                      value={breakerMarca}
                      onChange={(e) => setBreakerMarca(e.target.value)}
                      placeholder="Ej. GE, EATON, ABB, CHINT..."
                      className="w-full px-3 py-2 text-sm border border-slate-700 rounded-lg bg-slate-950 text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <datalist id="list-marca-options">
                      {MARCA_OPTIONS.map(opt => <option key={opt} value={opt} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Breaker (Tipo)
                    </label>
                    <input
                      type="text"
                      list="list-tipo-options"
                      value={breakerTipo}
                      onChange={(e) => setBreakerTipo(e.target.value)}
                      placeholder="Ej. TQ, TQD, M35..."
                      className="w-full px-3 py-2 text-sm border border-slate-700 rounded-lg bg-slate-950 text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <datalist id="list-tipo-options">
                      {TIPO_OPTIONS.map(opt => <option key={opt} value={opt} />)}
                    </datalist>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Potencia Estimada (Watts)
                  </label>
                  <input
                    type="number"
                    value={potenciaWatts}
                    onChange={(e) => setPotenciaWatts(e.target.value)}
                    placeholder="Ej. 1500"
                    className="w-full px-3 py-2 text-sm border border-slate-700 rounded-lg bg-slate-950 text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Ficha Técnica / Notas adicionales
                  </label>
                  <textarea
                    value={descArtefacto}
                    onChange={(e) => setDescArtefacto(e.target.value)}
                    placeholder="Detalles sobre marca, modelo del equipo, ubicación exacta..."
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-slate-700 rounded-lg bg-slate-950 text-white focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  onClick={handleSaveArtefacto}
                  className="px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-md transition-colors w-full cursor-pointer"
                >
                  Guardar Ficha
                </button>
              </div>
            </div>
          )}

          {/* 3. ¿El circuito alimenta a otro elemento? */}
          {step === 'PREGUNTA_ALIMENTA_OTRO' && (
            <div className="space-y-6">
              <div className="text-center">
                <Cpu className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                <h4 className="text-base font-semibold text-slate-100">
                  ¿El circuito alimenta a otro elemento del sistema?
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Por ejemplo: alimenta a un Sub-Tablero de distribución o tablero de control secundario.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setStep('PREGUNTA_CREADO')}
                  className="flex flex-col items-center justify-center p-6 h-32 rounded-xl border-2 border-slate-800 hover:border-amber-500 hover:bg-amber-500/5 transition-all cursor-pointer active:scale-95"
                >
                  <span className="text-2xl mb-1">🏢</span>
                  <span className="font-bold text-sm text-slate-200">Sí, alimenta a otro elemento</span>
                  <span className="text-[10px] text-slate-400 mt-1">Como un Sub-Tablero</span>
                </button>
                <button
                  onClick={() => setStep('ROTULAR_Y_FOTO')}
                  className="flex flex-col items-center justify-center p-6 h-32 rounded-xl border-2 border-slate-800 hover:border-amber-500 hover:bg-amber-500/5 transition-all cursor-pointer active:scale-95"
                >
                  <span className="text-2xl mb-1">🏷️</span>
                  <span className="font-bold text-sm text-slate-200">No, no alimenta otro elemento</span>
                  <span className="text-[10px] text-slate-400 mt-1">Es reserva o vacío</span>
                </button>
              </div>
            </div>
          )}

          {/* 4. ¿Está creado el elemento? */}
          {step === 'PREGUNTA_CREADO' && (
            <div className="space-y-6">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                <h4 className="text-base font-semibold text-slate-100">
                  ¿El elemento de destino ya está creado en el sistema?
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Confirma si el Sub-Tablero ya está registrado en tu listado de inspección.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setStep('VINCULAR_EXISTENTE')}
                  className="flex flex-col items-center justify-center p-6 h-32 rounded-xl border-2 border-slate-800 hover:border-amber-500 hover:bg-amber-500/5 transition-all cursor-pointer active:scale-95"
                >
                  <span className="text-2xl mb-1">🔗</span>
                  <span className="font-bold text-sm text-slate-200">Sí, ya está creado</span>
                  <span className="text-[10px] text-slate-400 mt-1">Buscar y vincular</span>
                </button>
                <button
                  onClick={() => setStep('ALIMENTAR_POR_CREAR')}
                  className="flex flex-col items-center justify-center p-6 h-32 rounded-xl border-2 border-slate-800 hover:border-amber-500 hover:bg-amber-500/5 transition-all cursor-pointer active:scale-95"
                >
                  <span className="text-2xl mb-1">📝</span>
                  <span className="font-bold text-sm text-slate-200">No está creado</span>
                  <span className="text-[10px] text-slate-400 mt-1">Añadir a pendientes</span>
                </button>
              </div>
            </div>
          )}

          {/* 5A. Vincular Existente */}
          {step === 'VINCULAR_EXISTENTE' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
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
                    placeholder="Escribe el nombre o ID del elemento..."
                    className="w-full pl-10 pr-4 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm"
                  />
                  <Search className="w-5 h-5 absolute left-3 top-2.5 text-slate-500" />
                </div>
              </div>

              <div className="border border-slate-800 rounded-lg max-h-48 overflow-y-auto divide-y divide-slate-800 bg-slate-950">
                {filteredElements.length > 0 ? (
                  filteredElements.map((el) => (
                    <button
                      key={el.id}
                      onClick={() => {
                        setSelectedLink(el);
                        setSearchQuery(el.nombre);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-900 flex justify-between items-center transition-colors cursor-pointer ${
                        selectedLink?.id === el.id ? 'bg-amber-500/10 hover:bg-amber-500/15' : ''
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-slate-200">{el.nombre}</p>
                        <p className="text-[10px] text-amber-500 font-mono">ID: {el.id}</p>
                      </div>
                      {selectedLink?.id === el.id && <Check className="w-4 h-4 text-amber-500" />}
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No se encontraron elementos con ese nombre.
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => handleSaveVinculo()}
                  disabled={!selectedLink}
                  className="px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-sm shadow-md transition-colors w-full cursor-pointer"
                >
                  Vincular y Guardar
                </button>
              </div>
            </div>
          )}

          {/* 5B. Agregar a la Lista por Crear */}
          {step === 'ALIMENTAR_POR_CREAR' && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto border border-amber-500/30">
                <PlusCircle className="w-10 h-10 text-amber-500" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-100">
                  ¿Agregar a la Lista de Elementos por Crear?
                </h4>
                <p className="text-xs text-slate-400 mt-2 px-4 leading-relaxed">
                  Al confirmar, se registrará una tarea pendiente para crear este nuevo Sub-Tablero. El circuito actual se rotulará como <span className="font-bold text-amber-400">"RESERVA (Pendiente por Crear)"</span> de manera provisional.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-800">
                <button
                  onClick={handleSavePorCrear}
                  className="px-6 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-md transition-colors w-full cursor-pointer active:scale-[0.98]"
                >
                  Agregar a la Lista de Pendientes
                </button>
              </div>
            </div>
          )}

          {/* 3B. Rotular y Foto */}
          {step === 'ROTULAR_Y_FOTO' && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Rótulo del Circuito
                </label>
                <input
                  type="text"
                  value={rotulo}
                  onChange={(e) => setRotulo(e.target.value)}
                  placeholder="Ej. RESERVA, VACÍO, SIN USAR"
                  className="w-full px-3 py-2 text-sm border border-slate-700 rounded-lg bg-slate-950 text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Conductor (Calibre opcional)
                </label>
                <select
                  value={conductor}
                  onChange={(e) => setConductor(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-700 rounded-lg bg-slate-950 text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  {COND_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  Agregar Fotografía
                </label>
                
                {fotoUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-800 max-h-48 flex justify-center items-center bg-slate-950">
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
                    className="w-full h-32 border-2 border-dashed border-slate-800 rounded-xl hover:border-amber-500 flex flex-col items-center justify-center text-slate-400 hover:text-amber-400 transition-all cursor-pointer bg-slate-950/40"
                  >
                    <Camera className="w-8 h-8 mb-2 text-amber-500" />
                    <span className="text-xs font-semibold">Capturar o Subir Foto</span>
                    <span className="text-[9px] mt-0.5 text-slate-500">Captura directa desde la tableta</span>
                  </button>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  onClick={handleSaveRotuloFoto}
                  className="px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-md transition-colors w-full cursor-pointer"
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
