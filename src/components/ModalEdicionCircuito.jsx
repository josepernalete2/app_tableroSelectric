import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowLeft, 
  Camera, 
  Check, 
  Search, 
  PlusCircle, 
  AlertCircle, 
  Settings, 
  ClipboardList, 
  Cpu, 
  Zap, 
  Activity, 
  ShieldCheck, 
  Layers, 
  Building2, 
  Gauge, 
  Radio 
} from 'lucide-react';
import { AMP_OPTIONS, COND_OPTIONS, MARCA_OPTIONS, TIPO_OPTIONS } from '../utils/constants';

const normalizeText = (str) => {
  if (typeof str !== 'string' || !str) return str || '';
  return str.trim().replace(/\s+/g, ' ').toUpperCase();
};

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
  const isTablero = !tipoOrigen || tipoOrigen === 'TABLERO';

  const [step, setStep] = useState('PREGUNTA_ES_ARTEFACTO');

  // Campos Tablero / Artefacto
  const [breakerAmp, setBreakerAmp] = useState('');
  const [breakerMarca, setBreakerMarca] = useState('');
  const [breakerTipo, setBreakerTipo] = useState('');
  const [conductor, setConductor] = useState('');
  const [nombreArtefacto, setNombreArtefacto] = useState('');
  const [descArtefacto, setDescArtefacto] = useState('');
  const [potenciaWatts, setPotenciaWatts] = useState('');

  // Parámetros Físicos Tablero
  const [numPolos, setNumPolos] = useState(1);
  const [posicionPolo, setPosicionPolo] = useState(1);
  const [estado, setEstado] = useState('ACTIVO');

  // Búsqueda y vinculación
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLink, setSelectedLink] = useState(null);

  // Rótulo y foto
  const [rotulo, setRotulo] = useState('');
  const [fotoUrl, setFotoUrl] = useState(null);

  // Campos Equipos de Potencia / Trafo / Gen / ATS / CCM / Punto Medicion / Puesta Tierra
  const [nivelMT, setNivelMT] = useState('13.8 kV');
  const [fusibleMT, setFusibleMT] = useState('15A Curva K');
  const [pararrayos, setPararrayos] = useState('Sí');
  const [canalizacion, setCanalizacion] = useState('Bandeja Portacables');
  const [esquemaArranque, setEsquemaArranque] = useState('Directo (DOL)');
  const [hpKw, setHpKw] = useState('25 HP');
  const [corrienteNominal, setCorrienteNominal] = useState('32 A');
  const [proteccion, setProteccion] = useState('Guardamotor 32A + Contactor');
  const [redComms, setRedComms] = useState('Modbus RTU');
  const [tipoConmutador, setTipoConmutador] = useState('Motorizado Interlocked');
  const [relacionTc, setRelacionTc] = useState('800/5A');
  const [relacionTp, setRelacionTp] = useState('N/A (Medición Directa)');
  const [resistenciaOhms, setResistenciaOhms] = useState('2.5 Ω');
  const [senalArranque, setSenalArranque] = useState('Sí - Cableado 24VDC');
  const [potenciaKvaKw, setPotenciaKvaKw] = useState('500 kVA / 400 kW');
  const [tensionSecundaria, setTensionSecundaria] = useState('208/120V');
  const [interruptorAguasAbajo, setInterruptorAguasAbajo] = useState('1600 A');

  // Cargar datos al abrir modal
  useEffect(() => {
    if (circuitData && isOpen) {
      setBreakerAmp(circuitData.breaker?.amp || '');
      setBreakerMarca(circuitData.breaker?.marca || '');
      setBreakerTipo(circuitData.breaker?.tipo || '');
      setConductor(circuitData.conductor || '');
      setNombreArtefacto(circuitData.tipoDestino === 'ARTEFACTO' ? circuitData.equipo : '');
      setDescArtefacto(circuitData.ficha?.descripcion || '');
      setPotenciaWatts(circuitData.ficha?.potenciaWatts || '');
      setRotulo(circuitData.equipo || circuitData.nombre || '');
      setFotoUrl(circuitData.fotografia || null);

      setNumPolos(circuitData.poles?.length || circuitData.numPolos || 1);
      setPosicionPolo(circuitData.poles?.[0] || circuitData.posicionPolo || 1);
      setEstado(circuitData.estado || 'ACTIVO');

      const dt = circuitData.detallesTecnicos || {};
      if (dt.nivelMT) setNivelMT(dt.nivelMT);
      if (dt.fusibleMT) setFusibleMT(dt.fusibleMT);
      if (dt.pararrayos) setPararrayos(dt.pararrayos);
      if (dt.canalizacion) setCanalizacion(dt.canalizacion);
      if (dt.esquemaArranque) setEsquemaArranque(dt.esquemaArranque);
      if (dt.hpKw) setHpKw(dt.hpKw);
      if (dt.corrienteNominal) setCorrienteNominal(dt.corrienteNominal);
      if (dt.proteccion) setProteccion(dt.proteccion);
      if (dt.redComms) setRedComms(dt.redComms);
      if (dt.tipoConmutador) setTipoConmutador(dt.tipoConmutador);
      if (dt.relacionTc) setRelacionTc(dt.relacionTc);
      if (dt.relacionTp) setRelacionTp(dt.relacionTp);
      if (dt.resistenciaOhms) setResistenciaOhms(dt.resistenciaOhms);
      if (dt.senalArranque) setSenalArranque(dt.senalArranque);
      if (dt.potenciaKvaKw) setPotenciaKvaKw(dt.potenciaKvaKw);
      if (dt.tensionSecundaria) setTensionSecundaria(dt.tensionSecundaria);
      if (dt.interruptorAguasAbajo) setInterruptorAguasAbajo(dt.interruptorAguasAbajo);

      // Selección de paso según tipoOrigen y modo
      if (isTablero) {
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
      } else {
        if (tipoOrigen === 'TRANSFORMADOR') {
          if (modo === 'ENTRADA' || modo === 'PRIMARIA') setStep('PREGUNTA_ORIGEN_MT');
          else setStep('PREGUNTA_DESTINO_BT');
        } else if (tipoOrigen === 'GENERADOR') {
          setStep('PREGUNTA_DESTINO_GEN');
        } else if (tipoOrigen === 'TRANSFER') {
          if (modo === 'ENTRADA_1' || modo === 'ENTRADA') setStep('PREGUNTA_FUENTE_ATS1');
          else if (modo === 'ENTRADA_2') setStep('PREGUNTA_FUENTE_ATS2');
          else setStep('PREGUNTA_DESTINO_ATS');
        } else if (tipoOrigen === 'CCM') {
          setStep('PREGUNTA_CARGA_CCM');
        } else if (tipoOrigen === 'PUNTO_MEDICION') {
          setStep('PREGUNTA_ORIGEN_MEDICION');
        } else if (tipoOrigen === 'PUESTA_TIERRA') {
          setStep('PREGUNTA_CONEXION_TIERRA');
        } else {
          setStep('VINCULAR_EXISTENTE');
        }
      }
    }
  }, [circuitData, isOpen, elementosCreados, isTablero, tipoOrigen, modo]);

  if (!isOpen || !circuitData) return null;

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

  const getHeaderTitle = () => {
    if (isTablero) {
      return modo === 'ENTRADA' ? 'Configurar Fuente de Alimentación' : 'Configurar Salida / Circuito';
    }
    if (tipoOrigen === 'TRANSFORMADOR') {
      return (modo === 'ENTRADA' || modo === 'PRIMARIA')
        ? 'Configurar Alimentación Primaria MT (Lado Primario)'
        : 'Configurar Salida / Distribución BT (Lado Secundario)';
    }
    if (tipoOrigen === 'GENERADOR') {
      return 'Configurar Salida de Generación / Respaldo';
    }
    if (tipoOrigen === 'TRANSFER') {
      if (modo === 'ENTRADA_1' || modo === 'ENTRADA') return 'Configurar Fuente 1 (Red Principal / Normal)';
      if (modo === 'ENTRADA_2') return 'Configurar Fuente 2 (Emergencia / Generador)';
      return 'Configurar Salida / Cargas Respaldo';
    }
    if (tipoOrigen === 'CCM') {
      return 'Configurar Gaveta / Bucket CCM';
    }
    if (tipoOrigen === 'PUNTO_MEDICION') {
      return 'Configurar Entrada de Acometida / Suministro';
    }
    if (tipoOrigen === 'PUESTA_TIERRA') {
      return 'Configurar Conexión a Malla / Puesta a Tierra';
    }
    return `Configurar Conexión - ${tipoOrigen}`;
  };

  const handleSaveEquipment = (equipoName, tipoDestinoVal, extra = {}) => {
    const finalEquipo = normalizeText(equipoName || extra.equipo || rotulo || 'EQUIPO DE POTENCIA');
    onSave(circuitData.id, {
      equipo: finalEquipo,
      tipoDestino: tipoDestinoVal || 'SUB_TABLERO',
      vinculadoId: selectedLink?.id || extra.vinculadoId || null,
      breaker: {
        amp: normalizeText(breakerAmp || extra.breakerAmp),
        marca: normalizeText(breakerMarca),
        tipo: normalizeText(breakerTipo)
      },
      conductor: normalizeText(conductor || extra.conductor),
      poles: isTablero ? getPolesArray(posicionPolo, numPolos) : [1, 2, 3],
      numPolos: isTablero ? numPolos : 3,
      posicionPolo: isTablero ? posicionPolo : 1,
      estado: estado,
      ficha: {
        descripcion: descArtefacto,
        potenciaWatts: potenciaWatts ? parseFloat(potenciaWatts) : null,
      },
      fotografia: fotoUrl,
      detallesTecnicos: {
        nivelMT,
        fusibleMT,
        pararrayos,
        canalizacion,
        esquemaArranque,
        hpKw,
        corrienteNominal,
        proteccion,
        redComms,
        tipoConmutador,
        relacionTc,
        relacionTp,
        resistenciaOhms,
        senalArranque,
        potenciaKvaKw,
        tensionSecundaria,
        interruptorAguasAbajo,
        ...extra
      }
    });
    onClose();
  };

  const handleSaveArtefacto = () => {
    if (!nombreArtefacto.trim()) return alert('Por favor, ingresa el nombre del artefacto.');
    handleSaveEquipment(nombreArtefacto, 'ARTEFACTO');
  };

  const handleSaveVinculo = (linkElement) => {
    const el = linkElement || selectedLink;
    if (!el) return alert('Por favor, selecciona un elemento para vincular.');
    handleSaveEquipment(`${el.nombre} (ID: ${el.id})`, 'SUB_TABLERO', { vinculadoId: el.id });
  };

  const handleSavePorCrear = () => {
    const calculatedPoles = getPolesArray(posicionPolo, numPolos);
    const pendingName = `Equipo / Sub-Elemento (${isTablero ? `Polo ${calculatedPoles.join(', ')}` : 'Provisional'})`;
    if (onAgregarPorCrear) {
      onAgregarPorCrear({
        nombre: pendingName,
        circuitoId: circuitData.id,
      });
    }
    handleSaveEquipment('RESERVA (Pendiente por Crear)', 'SUB_TABLERO_PENDIENTE');
  };

  const handleSaveRotuloFoto = () => {
    handleSaveEquipment(rotulo || 'RESERVA', 'RESERVA');
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
      <div 
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity" 
        onClick={onClose} 
      />

      <div className="relative w-full max-w-lg bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[90vh] text-slate-100 font-sans">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-500/10 to-amber-600/10 border-b border-slate-800">
          <div className="flex items-center gap-3">
            {step !== 'PREGUNTA_ES_ARTEFACTO' && step !== 'PREGUNTA_ORIGEN_MT' && step !== 'PREGUNTA_DESTINO_BT' && step !== 'PREGUNTA_DESTINO_GEN' && step !== 'PREGUNTA_FUENTE_ATS1' && step !== 'PREGUNTA_CARGA_CCM' && (
              <button 
                onClick={() => {
                  if (isTablero) {
                    if (step === 'FORMULARIO_ARTEFACTO' || step === 'PREGUNTA_ALIMENTA_OTRO') setStep('PREGUNTA_ES_ARTEFACTO');
                    else if (step === 'PREGUNTA_CREADO' || step === 'ROTULAR_Y_FOTO') setStep('PREGUNTA_ALIMENTA_OTRO');
                    else if (step === 'VINCULAR_EXISTENTE' || step === 'ALIMENTAR_POR_CREAR') setStep('PREGUNTA_CREADO');
                  } else {
                    if (step === 'FORMULARIO_POTENCIA_TRANSFO_MT') setStep('PREGUNTA_ORIGEN_MT');
                    else if (step === 'FORMULARIO_POTENCIA_TRANSFO_BT') setStep('PREGUNTA_DESTINO_BT');
                    else if (step === 'FORMULARIO_POTENCIA_GEN') setStep('PREGUNTA_DESTINO_GEN');
                    else if (step === 'FORMULARIO_POTENCIA_ATS' || step === 'FORMULARIO_POTENCIA_ATS_SALIDA') setStep('PREGUNTA_FUENTE_ATS1');
                    else if (step === 'FORMULARIO_GAVETA_CCM') setStep('PREGUNTA_CARGA_CCM');
                    else if (step === 'FORMULARIO_MEDICION') setStep('PREGUNTA_ORIGEN_MEDICION');
                    else if (step === 'FORMULARIO_TIERRA') setStep('PREGUNTA_CONEXION_TIERRA');
                    else setStep('VINCULAR_EXISTENTE');
                  }
                }}
                className="p-2 hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5 text-slate-300" />
              </button>
            )}
            <div>
              <h3 className="text-lg font-bold text-slate-100">
                {getHeaderTitle()}
              </h3>
              <p className="text-xs text-slate-400">
                Identificador: <span className="font-mono font-bold text-amber-400">{circuitData.nombre || circuitData.id || 'Salida'}</span>
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

        {/* Contenido principal */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Parámetros Físicos del Breaker (SOLO PARA TABLEROS) */}
          {isTablero && (
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
                      if (val === 'RESERVA' || val === 'DISPONIBLE') {
                        setNombreArtefacto(val);
                        setRotulo(val);
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
          )}

          {/* ============================================================== */}
          {/* FLOW TABLERO COMPONENT */}
          {/* ============================================================== */}
          {isTablero && step === 'PREGUNTA_ES_ARTEFACTO' && (
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

          {isTablero && step === 'FORMULARIO_ARTEFACTO' && (
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

          {isTablero && step === 'PREGUNTA_ALIMENTA_OTRO' && (
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

          {isTablero && step === 'PREGUNTA_CREADO' && (
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

          {/* ============================================================== */}
          {/* FLOW TRANSFORMADOR (PRIMARIO MT) */}
          {/* ============================================================== */}
          {!isTablero && tipoOrigen === 'TRANSFORMADOR' && (step === 'PREGUNTA_ORIGEN_MT' || modo === 'ENTRADA' || modo === 'PRIMARIA') && (
            <div className="space-y-6">
              <div className="text-center">
                <Zap className="w-12 h-12 text-amber-500 mx-auto mb-2" />
                <h4 className="text-base font-bold text-slate-100">
                  ¿Desde dónde se alimenta el Lado Primario (MT)?
                </h4>
                <p className="text-xs text-slate-400">Selecciona la fuente de Media Tensión de este Transformador.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRotulo('RED PÚBLICA / POSTE CORPOELEC');
                    setStep('FORMULARIO_POTENCIA_TRANSFO_MT');
                  }}
                  className="p-4 rounded-xl border border-slate-800 hover:border-amber-500 bg-slate-950/60 text-left hover:bg-amber-500/5 transition-all cursor-pointer"
                >
                  <span className="text-xl block mb-1">⚡</span>
                  <span className="font-bold text-xs text-slate-200 block">Red Pública / CORPOELEC</span>
                  <span className="text-[9px] text-slate-500">Acometida Aérea / Poste MT</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRotulo('SUBESTACIÓN PRINCIPAL MT');
                    setStep('FORMULARIO_POTENCIA_TRANSFO_MT');
                  }}
                  className="p-4 rounded-xl border border-slate-800 hover:border-amber-500 bg-slate-950/60 text-left hover:bg-amber-500/5 transition-all cursor-pointer"
                >
                  <span className="text-xl block mb-1">🏢</span>
                  <span className="font-bold text-xs text-slate-200 block">Subestación Principal MT</span>
                  <span className="text-[9px] text-slate-500">Barra / Celda de MT</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRotulo('CELDA DE SECCIONAMIENTO MT');
                    setStep('FORMULARIO_POTENCIA_TRANSFO_MT');
                  }}
                  className="p-4 rounded-xl border border-slate-800 hover:border-amber-500 bg-slate-950/60 text-left hover:bg-amber-500/5 transition-all cursor-pointer"
                >
                  <span className="text-xl block mb-1">🔌</span>
                  <span className="font-bold text-xs text-slate-200 block">Celda Seccionamiento MT</span>
                  <span className="text-[9px] text-slate-500">Interruptor SF6 / Vacío</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep('VINCULAR_EXISTENTE')}
                  className="p-4 rounded-xl border border-slate-800 hover:border-amber-500 bg-slate-950/60 text-left hover:bg-amber-500/5 transition-all cursor-pointer"
                >
                  <span className="text-xl block mb-1">🔗</span>
                  <span className="font-bold text-xs text-slate-200 block">Vincular Elemento Creado</span>
                  <span className="text-[9px] text-slate-500">Buscar en la lista del proyecto</span>
                </button>
              </div>
            </div>
          )}

          {!isTablero && step === 'FORMULARIO_POTENCIA_TRANSFO_MT' && (
            <div className="space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-bold text-amber-300">Parámetros de Alimentación Primaria MT</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Nivel Tensión MT</label>
                  <select
                    value={nivelMT}
                    onChange={(e) => setNivelMT(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  >
                    <option value="13.8 kV">13.8 kV</option>
                    <option value="24 kV">24 kV</option>
                    <option value="34.5 kV">34.5 kV</option>
                    <option value="4.16 kV">4.16 kV</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Calibre Conductor MT</label>
                  <input
                    type="text"
                    value={conductor}
                    onChange={(e) => setConductor(e.target.value)}
                    placeholder="Ej. 1/0 XLPE 15kV"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Fusible MT (Capacidad/Curva)</label>
                  <input
                    type="text"
                    value={fusibleMT}
                    onChange={(e) => setFusibleMT(e.target.value)}
                    placeholder="Ej. 15A Curva K"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Pararrayos MT Instalado</label>
                  <select
                    value={pararrayos}
                    onChange={(e) => setPararrayos(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  >
                    <option value="Sí">Sí</option>
                    <option value="No">No</option>
                  </select>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSaveEquipment(rotulo || 'ALIMENTACIÓN MT CORPOELEC', 'SUBESTACION')}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-sm transition-colors cursor-pointer mt-4"
              >
                Guardar Configuración MT
              </button>
            </div>
          )}

          {/* ============================================================== */}
          {/* FLOW TRANSFORMADOR (SECUNDARIO BT) */}
          {/* ============================================================== */}
          {!isTablero && tipoOrigen === 'TRANSFORMADOR' && (step === 'PREGUNTA_DESTINO_BT' || modo === 'SECUNDARIA') && (
            <div className="space-y-6">
              <div className="text-center">
                <Activity className="w-12 h-12 text-amber-500 mx-auto mb-2" />
                <h4 className="text-base font-bold text-slate-100">
                  ¿Hacia dónde entrega la potencia el Lado Secundario (BT)?
                </h4>
                <p className="text-xs text-slate-400">Selecciona el destino de Baja Tensión alimentado por el Transformador.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRotulo('TABLERO GENERAL DE BT (TG)');
                    setStep('FORMULARIO_POTENCIA_TRANSFO_BT');
                  }}
                  className="p-4 rounded-xl border border-slate-800 hover:border-amber-500 bg-slate-950/60 text-left hover:bg-amber-500/5 transition-all cursor-pointer"
                >
                  <span className="text-xl block mb-1">🏢</span>
                  <span className="font-bold text-xs text-slate-200 block">Tablero General (TG)</span>
                  <span className="text-[9px] text-slate-500">Distribución BT</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRotulo('TRANSFERENCIA AUTOMÁTICA (ATS)');
                    setStep('FORMULARIO_POTENCIA_TRANSFO_BT');
                  }}
                  className="p-4 rounded-xl border border-slate-800 hover:border-amber-500 bg-slate-950/60 text-left hover:bg-amber-500/5 transition-all cursor-pointer"
                >
                  <span className="text-xl block mb-1">🔄</span>
                  <span className="font-bold text-xs text-slate-200 block">Transferencia (ATS)</span>
                  <span className="text-[9px] text-slate-500">Entrada Fuente Normal</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRotulo('CENTRO CONTROL DE MOTORES (CCM)');
                    setStep('FORMULARIO_POTENCIA_TRANSFO_BT');
                  }}
                  className="p-4 rounded-xl border border-slate-800 hover:border-amber-500 bg-slate-950/60 text-left hover:bg-amber-500/5 transition-all cursor-pointer"
                >
                  <span className="text-xl block mb-1">⚙️</span>
                  <span className="font-bold text-xs text-slate-200 block">CCM Industrial</span>
                  <span className="text-[9px] text-slate-500">Alimentación de Motores</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep('VINCULAR_EXISTENTE')}
                  className="p-4 rounded-xl border border-slate-800 hover:border-amber-500 bg-slate-950/60 text-left hover:bg-amber-500/5 transition-all cursor-pointer"
                >
                  <span className="text-xl block mb-1">🔗</span>
                  <span className="font-bold text-xs text-slate-200 block">Vincular Elemento Creado</span>
                  <span className="text-[9px] text-slate-500">Buscar en el proyecto</span>
                </button>
              </div>
            </div>
          )}

          {!isTablero && step === 'FORMULARIO_POTENCIA_TRANSFO_BT' && (
            <div className="space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-bold text-amber-300">Parámetros de Distribución BT (Secundario)</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Tensión Secundaria BT</label>
                  <select
                    value={tensionSecundaria}
                    onChange={(e) => setTensionSecundaria(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  >
                    <option value="208/120V">208/120 V</option>
                    <option value="480/277V">480/277 V</option>
                    <option value="380/220V">380/220 V</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Configuración Conductores</label>
                  <input
                    type="text"
                    value={conductor}
                    onChange={(e) => setConductor(e.target.value)}
                    placeholder="Ej. 3(4x500 MCM)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Canalización de Salida</label>
                  <select
                    value={canalizacion}
                    onChange={(e) => setCanalizacion(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  >
                    <option value="Bandeja Portacables">Bandeja Portacables</option>
                    <option value="Tubería Conduit">Tubería Conduit</option>
                    <option value="Trinchera Subterránea">Trinchera Subterránea</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Capacidad Breaker Aguas Abajo</label>
                  <input
                    type="text"
                    value={interruptorAguasAbajo}
                    onChange={(e) => setInterruptorAguasAbajo(e.target.value)}
                    placeholder="Ej. 1600 A"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSaveEquipment(rotulo || 'SALIDA SECUNDARIA BT', 'TABLERO')}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-sm transition-colors cursor-pointer mt-4"
              >
                Guardar Configuración BT
              </button>
            </div>
          )}

          {/* ============================================================== */}
          {/* FLOW GENERADOR */}
          {/* ============================================================== */}
          {!isTablero && tipoOrigen === 'GENERADOR' && (step === 'PREGUNTA_DESTINO_GEN' || step === 'FORMULARIO_POTENCIA_GEN') && (
            <div className="space-y-6">
              {step === 'PREGUNTA_DESTINO_GEN' && (
                <>
                  <div className="text-center">
                    <Radio className="w-12 h-12 text-amber-500 mx-auto mb-2" />
                    <h4 className="text-base font-bold text-slate-100">
                      ¿A qué equipo alimenta el respaldo del Generador?
                    </h4>
                    <p className="text-xs text-slate-400">Define el destino de la potencia de emergencia.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setRotulo('TRANSFERENCIA AUTOMÁTICA (ATS)');
                        setStep('FORMULARIO_POTENCIA_GEN');
                      }}
                      className="p-4 rounded-xl border border-slate-800 hover:border-amber-500 bg-slate-950/60 text-left hover:bg-amber-500/5 transition-all cursor-pointer"
                    >
                      <span className="text-xl block mb-1">🔄</span>
                      <span className="font-bold text-xs text-slate-200 block">Transferencia ATS</span>
                      <span className="text-[9px] text-slate-500">Conmutación Automática</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRotulo('TRANSFERENCIA MANUAL (MTS)');
                        setStep('FORMULARIO_POTENCIA_GEN');
                      }}
                      className="p-4 rounded-xl border border-slate-800 hover:border-amber-500 bg-slate-950/60 text-left hover:bg-amber-500/5 transition-all cursor-pointer"
                    >
                      <span className="text-xl block mb-1">🔀</span>
                      <span className="font-bold text-xs text-slate-200 block">Transferencia Manual (MTS)</span>
                      <span className="text-[9px] text-slate-500">Conmutación Manual</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRotulo('TABLERO DE EMERGENCIA');
                        setStep('FORMULARIO_POTENCIA_GEN');
                      }}
                      className="p-4 rounded-xl border border-slate-800 hover:border-amber-500 bg-slate-950/60 text-left hover:bg-amber-500/5 transition-all cursor-pointer"
                    >
                      <span className="text-xl block mb-1">⚡</span>
                      <span className="font-bold text-xs text-slate-200 block">Tablero Emergencia</span>
                      <span className="text-[9px] text-slate-500">Alimentación Directa</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep('VINCULAR_EXISTENTE')}
                      className="p-4 rounded-xl border border-slate-800 hover:border-amber-500 bg-slate-950/60 text-left hover:bg-amber-500/5 transition-all cursor-pointer"
                    >
                      <span className="text-xl block mb-1">🔗</span>
                      <span className="font-bold text-xs text-slate-200 block">Vincular Elemento Creado</span>
                      <span className="text-[9px] text-slate-500">Buscar en el proyecto</span>
                    </button>
                  </div>
                </>
              )}

              {step === 'FORMULARIO_POTENCIA_GEN' && (
                <div className="space-y-4">
                  <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg flex items-center gap-2">
                    <Radio className="w-5 h-5 text-amber-400" />
                    <span className="text-xs font-bold text-amber-300">Parámetros del Generador / Respaldo</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Capacidad Breaker Generador</label>
                      <input
                        type="text"
                        value={breakerAmp}
                        onChange={(e) => setBreakerAmp(e.target.value)}
                        placeholder="Ej. 800 A"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Conductor de Fuerza Respaldo</label>
                      <input
                        type="text"
                        value={conductor}
                        onChange={(e) => setConductor(e.target.value)}
                        placeholder="Ej. 2(3x500 MCM)"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Señal Arranque Cableada</label>
                      <select
                        value={senalArranque}
                        onChange={(e) => setSenalArranque(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      >
                        <option value="Sí - Cableado 24VDC">Sí - Cableado 24VDC</option>
                        <option value="Sí - Modbus/Comms">Sí - Modbus/Comms</option>
                        <option value="No - Arranque Manual">No - Arranque Manual</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Potencia Respaldo (kVA/kW)</label>
                      <input
                        type="text"
                        value={potenciaKvaKw}
                        onChange={(e) => setPotenciaKvaKw(e.target.value)}
                        placeholder="Ej. 580 kVA / 460 kW"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveEquipment(rotulo || 'SALIDA PLANTA GENERACIÓN', 'GENERADOR')}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-sm transition-colors cursor-pointer mt-4"
                  >
                    Guardar Configuración Generador
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* FLOW TRANSFERENCIA (ATS) */}
          {/* ============================================================== */}
          {!isTablero && tipoOrigen === 'TRANSFER' && (
            <div className="space-y-6">
              {(step === 'PREGUNTA_FUENTE_ATS1' || step === 'PREGUNTA_FUENTE_ATS2' || step === 'PREGUNTA_DESTINO_ATS') && (
                <>
                  <div className="text-center">
                    <ShieldCheck className="w-12 h-12 text-amber-500 mx-auto mb-2" />
                    <h4 className="text-base font-bold text-slate-100">
                      Configuración de Conexión de Transferencia (ATS)
                    </h4>
                    <p className="text-xs text-slate-400">Selecciona la fuente o carga a configurar en el conmutador.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setRotulo('FUENTE 1 - RED PRINCIPAL');
                        setStep('FORMULARIO_POTENCIA_ATS');
                      }}
                      className="p-4 rounded-xl border border-slate-800 hover:border-amber-500 bg-slate-950/60 text-left hover:bg-amber-500/5 transition-all cursor-pointer"
                    >
                      <span className="text-xl block mb-1">⚡</span>
                      <span className="font-bold text-xs text-slate-200 block">Fuente 1 (Red Normal)</span>
                      <span className="text-[9px] text-slate-500">Transformador / Subestación</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRotulo('FUENTE 2 - GENERADOR RESPALDO');
                        setStep('FORMULARIO_POTENCIA_ATS');
                      }}
                      className="p-4 rounded-xl border border-slate-800 hover:border-amber-500 bg-slate-950/60 text-left hover:bg-amber-500/5 transition-all cursor-pointer"
                    >
                      <span className="text-xl block mb-1">📻</span>
                      <span className="font-bold text-xs text-slate-200 block">Fuente 2 (Emergencia)</span>
                      <span className="text-[9px] text-slate-500">Planta Eléctrica</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRotulo('SALIDA A CARGAS RESPALDADAS');
                        setStep('FORMULARIO_POTENCIA_ATS_SALIDA');
                      }}
                      className="p-4 rounded-xl border border-slate-800 hover:border-amber-500 bg-slate-950/60 text-left hover:bg-amber-500/5 transition-all cursor-pointer"
                    >
                      <span className="text-xl block mb-1">🏢</span>
                      <span className="font-bold text-xs text-slate-200 block">Salida a Cargas</span>
                      <span className="text-[9px] text-slate-500">Tablero Principal / CCM</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep('VINCULAR_EXISTENTE')}
                      className="p-4 rounded-xl border border-slate-800 hover:border-amber-500 bg-slate-950/60 text-left hover:bg-amber-500/5 transition-all cursor-pointer"
                    >
                      <span className="text-xl block mb-1">🔗</span>
                      <span className="font-bold text-xs text-slate-200 block">Vincular Elemento Creado</span>
                      <span className="text-[9px] text-slate-500">Buscar en el proyecto</span>
                    </button>
                  </div>
                </>
              )}

              {step === 'FORMULARIO_POTENCIA_ATS' && (
                <div className="space-y-4">
                  <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-amber-400" />
                    <span className="text-xs font-bold text-amber-300">Parámetros de Fuente ATS</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Conductor de Acometida</label>
                      <input
                        type="text"
                        value={conductor}
                        onChange={(e) => setConductor(e.target.value)}
                        placeholder="Ej. 3x500 MCM"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Tipo de Conmutador</label>
                      <select
                        value={tipoConmutador}
                        onChange={(e) => setTipoConmutador(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      >
                        <option value="Motorizado Interlocked">Motorizado Interlocked</option>
                        <option value="Contactores Mecánicos">Contactores Mecánicos</option>
                        <option value="Estático STS">Estático STS</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveEquipment(rotulo || 'FUENTE ATS', 'TRANSFER')}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-sm transition-colors cursor-pointer mt-4"
                  >
                    Guardar Fuente ATS
                  </button>
                </div>
              )}

              {step === 'FORMULARIO_POTENCIA_ATS_SALIDA' && (
                <div className="space-y-4">
                  <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-amber-400" />
                    <span className="text-xs font-bold text-amber-300">Parámetros de Salida / Cargas ATS</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Corriente Nominal ATS</label>
                      <input
                        type="text"
                        value={breakerAmp}
                        onChange={(e) => setBreakerAmp(e.target.value)}
                        placeholder="Ej. 1600 A"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Enclavamiento Verificado</label>
                      <select
                        value={pararrayos}
                        onChange={(e) => setPararrayos(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      >
                        <option value="Mecánico y Eléctrico">Mecánico y Eléctrico</option>
                        <option value="Solo Eléctrico">Solo Eléctrico</option>
                        <option value="Pendiente">Pendiente</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveEquipment(rotulo || 'SALIDA ATS A CARGAS', 'TABLERO')}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-sm transition-colors cursor-pointer mt-4"
                  >
                    Guardar Salida ATS
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* FLOW CCM (CENTRO CONTROL DE MOTORES) */}
          {/* ============================================================== */}
          {!isTablero && tipoOrigen === 'CCM' && (step === 'PREGUNTA_CARGA_CCM' || step === 'FORMULARIO_GAVETA_CCM') && (
            <div className="space-y-6">
              {step === 'PREGUNTA_CARGA_CCM' && (
                <>
                  <div className="text-center">
                    <Layers className="w-12 h-12 text-amber-500 mx-auto mb-2" />
                    <h4 className="text-base font-bold text-slate-100">
                      ¿Qué tipo de carga industrial acciona esta Gaveta / Bucket?
                    </h4>
                    <p className="text-xs text-slate-400">Selecciona el uso del motor o carga alimentada.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setRotulo('BOMBA DE AGUAPOTABLE / PROCESO');
                        setStep('FORMULARIO_GAVETA_CCM');
                      }}
                      className="p-4 rounded-xl border border-slate-800 hover:border-amber-500 bg-slate-950/60 text-left hover:bg-amber-500/5 transition-all cursor-pointer"
                    >
                      <span className="text-xl block mb-1">🚰</span>
                      <span className="font-bold text-xs text-slate-200 block">Bomba de Agua</span>
                      <span className="text-[9px] text-slate-500">Hidroneumático / Proceso</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRotulo('COMPRESOR DE AIRE');
                        setStep('FORMULARIO_GAVETA_CCM');
                      }}
                      className="p-4 rounded-xl border border-slate-800 hover:border-amber-500 bg-slate-950/60 text-left hover:bg-amber-500/5 transition-all cursor-pointer"
                    >
                      <span className="text-xl block mb-1">🌀</span>
                      <span className="font-bold text-xs text-slate-200 block">Compresor</span>
                      <span className="text-[9px] text-slate-500">Neumático / Frío</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRotulo('EXTRACTOR / VENTILACIÓN');
                        setStep('FORMULARIO_GAVETA_CCM');
                      }}
                      className="p-4 rounded-xl border border-slate-800 hover:border-amber-500 bg-slate-950/60 text-left hover:bg-amber-500/5 transition-all cursor-pointer"
                    >
                      <span className="text-xl block mb-1">💨</span>
                      <span className="font-bold text-xs text-slate-200 block">Extractor / Ventilación</span>
                      <span className="text-[9px] text-slate-500">Tiro Forzado</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRotulo('BANDA TRANSPORTADORA');
                        setStep('FORMULARIO_GAVETA_CCM');
                      }}
                      className="p-4 rounded-xl border border-slate-800 hover:border-amber-500 bg-slate-950/60 text-left hover:bg-amber-500/5 transition-all cursor-pointer"
                    >
                      <span className="text-xl block mb-1">⚙️</span>
                      <span className="font-bold text-xs text-slate-200 block">Banda / Agitador</span>
                      <span className="text-[9px] text-slate-500">Proceso Continuo</span>
                    </button>
                  </div>
                </>
              )}

              {step === 'FORMULARIO_GAVETA_CCM' && (
                <div className="space-y-4">
                  <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg flex items-center gap-2">
                    <Layers className="w-5 h-5 text-amber-400" />
                    <span className="text-xs font-bold text-amber-300">Ficha Técnica de Gaveta CCM</span>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Tag / Nombre del Equipo</label>
                      <input
                        type="text"
                        value={rotulo}
                        onChange={(e) => setRotulo(e.target.value)}
                        placeholder="Ej. Bomba de Agua 1"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Esquema de Arranque</label>
                        <select
                          value={esquemaArranque}
                          onChange={(e) => setEsquemaArranque(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                        >
                          <option value="Directo (DOL)">Directo (DOL)</option>
                          <option value="Estrella-Triángulo">Estrella-Triángulo</option>
                          <option value="Variador de Frecuencia (VFD)">Variador de Frecuencia (VFD)</option>
                          <option value="Arrancador Suave (Soft Starter)">Arrancador Suave (Soft Starter)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Potencia Motor (HP/kW)</label>
                        <input
                          type="text"
                          value={hpKw}
                          onChange={(e) => setHpKw(e.target.value)}
                          placeholder="Ej. 25 HP"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Protección / Guardamotor</label>
                        <input
                          type="text"
                          value={proteccion}
                          onChange={(e) => setProteccion(e.target.value)}
                          placeholder="Ej. Guardamotor 32A"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Red / Comms Control</label>
                        <input
                          type="text"
                          value={redComms}
                          onChange={(e) => setRedComms(e.target.value)}
                          placeholder="Ej. Modbus RTU / Ethernet"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveEquipment(rotulo || 'GAVETA MOTOR', 'ARTEFACTO', { esquemaArranque, hpKw, proteccion, redComms })}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-sm transition-colors cursor-pointer mt-4"
                  >
                    Guardar Ficha Gaveta CCM
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* FLOW PUNTO MEDICIÓN */}
          {/* ============================================================== */}
          {!isTablero && tipoOrigen === 'PUNTO_MEDICION' && (step === 'PREGUNTA_ORIGEN_MEDICION' || step === 'FORMULARIO_MEDICION') && (
            <div className="space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg flex items-center gap-2">
                <Gauge className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-bold text-amber-300">Configuración Acometida Medida</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Relación TCs (Corriente)</label>
                  <input
                    type="text"
                    value={relacionTc}
                    onChange={(e) => setRelacionTc(e.target.value)}
                    placeholder="Ej. 800/5A"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Relación TPs (Tensión)</label>
                  <input
                    type="text"
                    value={relacionTp}
                    onChange={(e) => setRelacionTp(e.target.value)}
                    placeholder="Ej. 13800/120V o N/A"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSaveEquipment('PUNTO DE CONEXIÓN PCC / ACOMETIDA', 'PUNTO_MEDICION', { relacionTc, relacionTp })}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-sm transition-colors cursor-pointer mt-4"
              >
                Guardar Acometida Medición
              </button>
            </div>
          )}

          {/* ============================================================== */}
          {/* FLOW PUESTA A TIERRA */}
          {/* ============================================================== */}
          {!isTablero && tipoOrigen === 'PUESTA_TIERRA' && (
            <div className="space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-bold text-amber-300">Conexión a Malla de Puesta a Tierra</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Conductor de Tierra</label>
                  <input
                    type="text"
                    value={conductor}
                    onChange={(e) => setConductor(e.target.value)}
                    placeholder="Ej. 4/0 AWG Desnudo"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Resistencia Medida (Ω)</label>
                  <input
                    type="text"
                    value={resistenciaOhms}
                    onChange={(e) => setResistenciaOhms(e.target.value)}
                    placeholder="Ej. 2.5 Ω"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSaveEquipment('MALLA PUESTA A TIERRA', 'PUESTA_TIERRA', { resistenciaOhms })}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-sm transition-colors cursor-pointer mt-4"
              >
                Guardar Conexión Tierra
              </button>
            </div>
          )}

          {/* ============================================================== */}
          {/* BUSCADOR DE ELEMENTOS EXISTENTES (COMPARTIDO) */}
          {/* ============================================================== */}
          {step === 'VINCULAR_EXISTENTE' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Buscar Elemento Creado en el Proyecto
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
                        <p className="text-[10px] text-amber-500 font-mono">ID: {el.id} {el.tipo ? `• [${el.tipo}]` : ''}</p>
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

          {/* ============================================================== */}
          {/* AGREGAR A LA LISTA POR CREAR (COMPARTIDO) */}
          {/* ============================================================== */}
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
                  Al confirmar, se registrará una tarea pendiente para crear este nuevo Sub-Elemento en el proyecto.
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

          {/* ============================================================== */}
          {/* ROTULAR Y FOTO (COMPARTIDO PARA TABLEROS) */}
          {/* ============================================================== */}
          {isTablero && step === 'ROTULAR_Y_FOTO' && (
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
