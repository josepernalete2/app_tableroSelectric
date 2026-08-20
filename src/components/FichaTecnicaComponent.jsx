import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Edit3, 
  Camera, 
  Printer,
  Settings,
  Zap
} from 'lucide-react';
import useStore from '../store/useStore';
import ModalEdicionCircuito from './ModalEdicionCircuito';

// Componente para renderizar Blobs de imagen de forma segura
const SafeImage = ({ blob, src, alt, className }) => {
  const [objectUrl, setObjectUrl] = useState(null);

  useEffect(() => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      setObjectUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setObjectUrl(null);
    }
  }, [blob]);

  const finalSrc = objectUrl || src;
  if (!finalSrc) return null;

  return <img src={finalSrc} alt={alt} className={className} />;
};

export default function FichaTecnicaComponent({ elementoData, onUpdate, readOnly }) {
  const [isEditing, setIsEditing] = useState(false);
  const companies = useStore((state) => state.companies || []);

  const allFeeders = React.useMemo(() => {
    const list = [];
    const compId = elementoData?.empresaId || elementoData?.companyId;
    const company = companies.find(c => c.id === compId);
    if (!company) {
      companies.forEach(c => {
        if (c.elementosUnifilares) {
          list.push(...c.elementosUnifilares);
        }
        if (c.proyectos) {
          c.proyectos.forEach(p => {
            const elList = p.elementosUnifilares || p.tableros || [];
            list.push(...elList);
          });
        }
      });
      return list.filter(e => e.id !== elementoData?.id);
    }

    if (company.elementosUnifilares) {
      list.push(...company.elementosUnifilares);
    }
    if (company.proyectos) {
      company.proyectos.forEach(p => {
        const elList = p.elementosUnifilares || p.tableros || [];
        list.push(...elList);
      });
    }
    return list.filter(e => e.id !== elementoData?.id);
  }, [companies, elementoData]);

  // Campos principales
  const [nombre, setNombre] = useState(elementoData?.nombre || '');
  const [ubicacion, setUbicacion] = useState(elementoData?.ubicacion || '');
  const [alimentadoPor, setAlimentadoPor] = useState(elementoData?.alimentadoPor || '');
  const [observacionesGenerales, setObservacionesGenerales] = useState(elementoData?.observacionesGenerales || '');
  const [fotoBlob, setFotoBlob] = useState(elementoData?.fotoBlob || null);
  const [fotoSrc, setFotoSrc] = useState(elementoData?.foto || null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // datosTecnicos JSON
  const [dt, setDt] = useState(elementoData?.datosTecnicos || {});

  // Wizard Modal Jerarquía
  const { crearElementoProvisional } = useStore();
  const [modalJerarquiaOpen, setModalJerarquiaOpen] = useState(false);
  const [circuitDataWizard, setCircuitDataWizard] = useState(null);
  const [wizardModo, setWizardModo] = useState('SALIDA');

  // Restringir a las opciones permitidas: TABLERO, TRANSFER, GENERADOR, TRANSFORMADOR
  const tipoElemento = elementoData?.tipoElemento || 'TABLERO';

  if (!elementoData) {
    return <div className="text-center p-8 text-slate-400 font-sans">No hay datos del elemento seleccionados.</div>;
  }

  const handleDtChange = (key, value) => {
    if (readOnly) return;
    setDt((prev) => ({ ...prev, [key]: value }));
  };

  const handleNestedDtChange = (parentKey, key, value) => {
    if (readOnly) return;
    setDt((prev) => ({
      ...prev,
      [parentKey]: {
        ...(prev[parentKey] || {}),
        [key]: value
      }
    }));
  };

  const handleSptChange = (key, value) => {
    if (readOnly) return;
    setDt((prev) => ({
      ...prev,
      spt: {
        ...(prev.spt || {}),
        [key]: value
      }
    }));
  };

  const handleAcometidaChange = (seccion, key, value) => {
    if (readOnly) return;
    setDt((prev) => ({
      ...prev,
      acometidas: {
        ...(prev.acometidas || {}),
        [seccion]: {
          ...((prev.acometidas && prev.acometidas[seccion]) || {}),
          [key]: value
        }
      }
    }));
  };

  const handleImageChange = (e) => {
    if (readOnly) return;
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("La imagen es demasiado grande. Por favor elija una de menos de 2MB.");
      return;
    }
    setFotoBlob(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (readOnly) return;
    if (onUpdate) {
      onUpdate({
        ...elementoData,
        nombre,
        ubicacion,
        alimentadoPor,
        observacionesGenerales,
        fotoBlob,
        foto: fotoSrc,
        datosTecnicos: dt
      });
    }
    setIsEditing(false);
  };

  const renderElementWithId = (nombreText, fallbackId) => {
    if (!nombreText) return <span className="opacity-40">—</span>;
    let cleanName = nombreText;
    let elementId = fallbackId || null;

    const match = String(nombreText).match(/^(.*?)(?:\s*\((?:ID:\s*)?([A-Z0-9_-]+)\))?$/i);
    if (match) {
      if (match[1]) cleanName = match[1].trim();
      if (match[2] && !elementId) elementId = match[2].trim();
    }

    return (
      <span className="inline-flex items-center gap-1.5 flex-wrap">
        <span className="font-semibold text-slate-100 print:text-black">{cleanName}</span>
        {elementId && (
          <span className="inline-flex items-center font-mono font-bold text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded shadow-sm">
            ID: {elementId}
          </span>
        )}
      </span>
    );
  };

  const renderBadge = () => {
    switch (tipoElemento) {
      case 'TRANSFORMADOR':
        return <span className="px-3.5 py-1 bg-amber-950/90 text-amber-500 border border-amber-800/50 rounded-full text-xs font-bold font-mono">⚡ TRANSFORMADOR ELÉCTRICO</span>;
      case 'GENERADOR':
        return <span className="px-3.5 py-1 bg-amber-950/90 text-amber-500 border border-amber-800/50 rounded-full text-xs font-bold font-mono">⚡ GENERADOR</span>;
      case 'TRANSFER':
        return <span className="px-3.5 py-1 bg-amber-950/90 text-amber-500 border border-amber-800/50 rounded-full text-xs font-bold font-mono">🔄 TRANSFERENCIA (ATS / MTS)</span>;
      case 'BANCO_CONDENSADOR':
        return <span className="px-3.5 py-1 bg-amber-950/90 text-amber-500 border border-amber-800/50 rounded-full text-xs font-bold font-mono">⚡ BANCO DE CONDENSADORES</span>;
      case 'PUESTA_TIERRA':
        return <span className="px-3.5 py-1 bg-amber-950/90 text-amber-500 border border-amber-800/50 rounded-full text-xs font-bold font-mono">🛡️ MALLA PUESTA A TIERRA</span>;
      case 'TABLERO':
      default:
        return <span className="px-3.5 py-1 bg-amber-950/90 text-amber-500 border border-amber-800/50 rounded-full text-xs font-bold font-mono">⚡ PANEL ELÉCTRICO</span>;
    }
  };

  return (
    <div className={`max-w-5xl mx-auto space-y-6 animate-fade-in font-sans pb-12 print-card print:p-0 print:m-0 ${readOnly ? 'pointer-events-none opacity-90' : ''}`}>
      
      {/* Botones de control superior (Ocultos en impresión) */}
      <div className="flex justify-between items-center no-print">
        <div className="flex items-center gap-2">
          {renderBadge()}
          <span className="inline-flex items-center justify-center font-mono font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30 text-xs shadow-sm">
            ID: {elementoData.id}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3.5 py-2 rounded-lg flex items-center gap-2 text-xs transition-all cursor-pointer shadow-sm"
            title="Guardar como PDF o Imprimir esta Plantilla Individual"
          >
            <Printer className="w-4 h-4" /> Guardar PDF
          </button>

          {!readOnly && (
            <>
              {isEditing ? (
                <button
                  onClick={handleSave}
                  className="bg-slate-100 text-slate-950 font-black hover:bg-white active:scale-98 transition-all px-4 py-2 rounded-lg flex items-center gap-2 text-xs cursor-pointer shadow-md"
                >
                  <Save className="w-4 h-4 text-emerald-600" /> Guardar Cambios
                </button>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 font-semibold px-4 py-2 rounded-lg flex items-center gap-2 text-xs transition-all cursor-pointer"
                >
                  <Edit3 className="w-4 h-4 text-amber-500" /> Editar Plantilla
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. PLANTILLA: PANEL ELÉCTRICO / TABLERO ("INFORMACIÓN GENERAL DE TABLERO No. X") */}
      {/* ========================================================================= */}
      {tipoElemento === 'TABLERO' && (
        <div className="bg-slate-950 border-2 border-slate-700 rounded-xl overflow-hidden shadow-2xl print:border-black print:bg-white print:text-black">
          
          {/* Título Principal */}
          <div className="bg-slate-900 border-b-2 border-slate-700 p-3.5 text-center print:bg-gray-200 print:border-black">
            <h2 className="text-base md:text-lg font-black tracking-wide text-slate-100 uppercase font-mono print:text-black">
              {isEditing ? (
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="bg-slate-950 border border-slate-600 rounded px-3 py-1 text-center w-full focus:outline-none focus:border-amber-500 text-slate-100 font-bold"
                />
              ) : (
                `INFORMACIÓN GENERAL DE TABLERO ${nombre ? 'No. ' + nombre : 'No. 20'}`
              )}
            </h2>
          </div>

          {/* Fila 1: Ubicación */}
          <div className="border-b border-slate-700 p-3 bg-slate-900/60 font-mono text-xs text-slate-100 print:bg-white print:text-black print:border-black">
            <span className="font-bold uppercase text-slate-400 print:text-black mr-2">UBICACIÓN:</span>
            {isEditing ? (
              <input
                type="text"
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 w-3/4"
              />
            ) : (
              <span className="font-semibold">{ubicacion || 'SOTANO SALA DE TABLEROS'}</span>
            )}
          </div>

          {/* Fila 2: Alimentado Por */}
          <div className="border-b border-slate-700 p-3 bg-slate-900/40 font-mono text-xs text-slate-100 print:bg-white print:text-black print:border-black flex items-center justify-between">
            <div>
              <span className="font-bold uppercase text-slate-400 print:text-black mr-2">TABLERO ALIMENTADO POR:</span>
              <button
                type="button"
                onClick={() => {
                  setWizardModo('ENTRADA');
                  setCircuitDataWizard({
                    id: 'ALIMENTACION_PRINCIPAL',
                    nombre: 'Acometida / Fuente Principal',
                    equipo: alimentadoPor || '',
                    poles: [1],
                    breaker: { amp: '', marca: '', tipo: '' }
                  });
                  setModalJerarquiaOpen(true);
                }}
                className="no-print inline-flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all"
                title="Configurar Origen de Alimentación (Wizard)"
              >
                <Settings className="w-3 h-3 text-amber-400" /> Configurar Jerarquía
              </button>
            </div>
            {isEditing ? (
              <div className="flex flex-col sm:flex-row gap-2.5 items-start sm:items-center w-full sm:w-3/4 inline-flex">
                <input
                  type="text"
                  value={alimentadoPor}
                  onChange={(e) => setAlimentadoPor(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 flex-1 w-full"
                  placeholder="Escriba el origen de la alimentación o seleccione de la lista..."
                />
                {allFeeders.length > 0 && (
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        const selectedFeeder = allFeeders.find(f => f.nombre === e.target.value || f.id === e.target.value);
                        if (selectedFeeder) {
                          setAlimentadoPor(`${selectedFeeder.nombre} (ID: ${selectedFeeder.id})`);
                        } else {
                          setAlimentadoPor(e.target.value);
                        }
                      }
                    }}
                    value={allFeeders.some(f => f.nombre === alimentadoPor || `${f.nombre} (ID: ${f.id})` === alimentadoPor) ? alimentadoPor : ''}
                    className="bg-slate-900 border border-slate-700 text-slate-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500 w-full sm:w-auto min-w-[200px]"
                  >
                    <option value="">-- Seleccionar Equipo --</option>
                    {allFeeders.map((f) => (
                      <option key={f.id} value={`${f.nombre} (ID: ${f.id})`}>
                        [{f.id}] {f.nombre}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : (
              renderElementWithId(alimentadoPor || 'ATS SOTANO (ID: ATS-1)', elementoData?.alimentadoPorId)
            )}
          </div>

          {/* Fila 3: Tipo de Tablero & Barras / Breaker Principal */}
          <table className="w-full text-xs text-center border-collapse border-b-2 border-slate-700 font-mono print:border-black">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-700 font-bold text-slate-300 uppercase print:bg-gray-200 print:text-black print:border-gray-400">
                <th colSpan="3" className="p-2 border-r border-slate-700 print:border-black">TIPO DE TABLERO</th>
                <th colSpan="3" className="p-2 border-r border-slate-700 print:border-black">BREAKER PRINCIPAL</th>
                <th rowSpan="2" className="p-2 border-r border-slate-700 print:border-black">VOLTAJE</th>
                <th rowSpan="2" className="p-2">ACOMETIDA</th>
              </tr>
              <tr className="bg-slate-900/50 border-b border-slate-700 font-bold text-slate-400 uppercase print:bg-gray-100 print:text-black print:border-gray-400">
                <th colSpan="2" className="p-1.5 border-r border-slate-700 print:border-black">SUPERFICIAL</th>
                <th className="p-1.5 border-r border-slate-700 print:border-black">EMPOTRADO</th>
                <th className="p-1.5 border-r border-slate-700 print:border-black">MARCA</th>
                <th className="p-1.5 border-r border-slate-700 print:border-black">TIPO</th>
                <th className="p-1.5 border-r border-slate-700 print:border-black">AMP</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-800 print:border-black">
                <td colSpan="2" className="p-2 font-bold text-slate-200 border-r border-slate-800 print:text-black print:border-gray-300">
                  {dt.tipoTablero === 'EMPOTRADO' ? '[  ]' : '[ X ]'}
                </td>
                <td className="p-2 font-bold text-slate-200 border-r border-slate-800 print:text-black print:border-gray-300">
                  {dt.tipoTablero === 'EMPOTRADO' ? '[ X ]' : '[  ]'}
                </td>
                <td className="p-2 font-bold text-slate-100 border-r border-slate-800 print:text-black print:border-gray-300">
                  {dt.breakerPrincipal?.marca || 'SIN BREAKER'}
                </td>
                <td className="p-2 font-bold text-slate-100 border-r border-slate-800 print:text-black print:border-gray-300">
                  {dt.breakerPrincipal?.tipo || '-'}
                </td>
                <td className="p-2 font-bold text-amber-400 border-r border-slate-800 print:text-black print:border-gray-300">
                  {dt.breakerPrincipal?.amp || '-'}
                </td>
                <td className="p-2 font-bold text-slate-100 border-r border-slate-800 print:text-black print:border-gray-300">
                  IA: {dt.voltaje?.va || dt.barrasPrincipales?.ia || '211,5'}<br/>
                  IB: {dt.voltaje?.vb || dt.barrasPrincipales?.ib || '207,4'}<br/>
                  IC: {dt.voltaje?.vc || dt.barrasPrincipales?.ic || '208,6'}
                </td>
                <td className="p-2 font-bold text-slate-100 print:text-black">
                  {dt.acometida || '3X500 MCM'}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Filas de Neutro y Tierra */}
          <table className="w-full text-xs text-left border-collapse border-b-2 border-slate-700 font-mono print:border-black">
            <tbody className="divide-y divide-slate-800 print:divide-black">
              <tr>
                <td className="w-1/4 bg-slate-900/90 font-bold p-2.5 text-slate-300 uppercase border-r border-slate-800 print:bg-gray-100 print:text-black print:border-black">
                  NEUTRO DE LLEGADA
                </td>
                <td className="w-1/4 p-2.5 border-r border-slate-800 print:border-black">
                  <span className="text-[10px] text-slate-500 block font-bold">CALIB COND.</span>
                  <span className="font-bold text-slate-100 print:text-black">{dt.neutroLlegada?.calibre || '1X500'}</span>
                </td>
                <td className="p-2.5">
                  <span className="text-[10px] text-slate-500 block font-bold">OBSERVACIONES:</span>
                  <span className="text-slate-300 print:text-black">{dt.neutroLlegada?.observaciones || 'CABLE ROJO EN TABLERO'}</span>
                </td>
              </tr>
              <tr>
                <td className="bg-slate-900/90 font-bold p-2.5 text-slate-300 uppercase border-r border-slate-800 print:bg-gray-100 print:text-black print:border-black">
                  PUESTA A TIERRA
                </td>
                <td className="p-2.5 border-r border-slate-800 print:border-black">
                  <span className="text-[10px] text-slate-500 block font-bold">CALIB COND.</span>
                  <span className="font-bold text-slate-100 print:text-black">{dt.puestaTierra?.calibre || 'SOLIDO #4'}</span>
                </td>
                <td className="p-2.5">
                  <span className="text-[10px] text-slate-500 block font-bold">OBSERVACIONES:</span>
                  <span className="text-slate-300 print:text-black">{dt.puestaTierra?.observaciones || 'LLEGA SOLIDO #4. BUSCAR TANQUILLA DE MALLA A TIERRA'}</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Caja Amarilla de Observaciones Generales */}
          <div className="bg-amber-950/40 border-b-2 border-amber-800/60 p-4 font-mono text-xs text-amber-200 print:bg-yellow-100 print:text-black print:border-black">
            <span className="font-black uppercase text-amber-400 block mb-1 print:text-black">OBSERVACIÓN GENERAL:</span>
            {isEditing ? (
              <textarea
                value={observacionesGenerales}
                onChange={(e) => setObservacionesGenerales(e.target.value)}
                rows={3}
                className="w-full bg-slate-900 border border-amber-600 rounded p-2 text-slate-100 text-xs resize-none"
              />
            ) : (
              <p className="leading-relaxed font-medium">
                {observacionesGenerales || 'SALEN ACOMETIDAS 1 X 500 Y 1X250 MCM DE LA BARRA PARTE INFERIOR. LA ACOMETIDA 250 MCM VA A CAJA CON UN BREAKER AL LADO DEL TABLERO PRINCIPAL. INTERRUPTOR EATON, Ki400, 350 A. SALEN UNA ACOMETIDA 4/0 QUE ALIMENTA TRANSFERENCIA 160. LA ACOMETIDA 500 MCM VA A UNA CAJA AL LADO DEL TABLERO PRINCIPAL. INTERRUPTOR ABB, TIPO 6520, 400 A, SALEN 2X500 Y ALIMENTAN TABLERO EN PRIMER PISO.'}
              </p>
            )}
          </div>

          {/* Imagen adjunta del tablero (Parte inferior de la plantilla) */}
          <div className="p-4 bg-slate-900/30 text-center print:bg-white">
            {fotoBlob || fotoSrc || previewUrl ? (
              <div className="max-w-md mx-auto rounded-xl overflow-hidden border border-slate-700 shadow-lg print:border-black">
                <SafeImage blob={fotoBlob} src={previewUrl || fotoSrc} alt="Tablero Eléctrico" className="w-full h-auto max-h-96 object-cover" />
              </div>
            ) : (
              <div className="p-6 border-2 border-dashed border-slate-800 rounded-xl text-center space-y-2 no-print">
                <Camera className="w-8 h-8 text-slate-600 mx-auto" />
                <span className="text-xs text-slate-500 font-mono block">Sin fotografía adjunta del panel eléctrico</span>
                <label className="inline-block px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold rounded-lg cursor-pointer transition-colors">
                  Adjuntar Foto
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PLANTILLA: GENERADOR ("GENERADOR No. X DATOS DE PLACA") */}
      {/* ========================================================================= */}
      {tipoElemento === 'GENERADOR' && (
        <div className="bg-slate-950 border-2 border-slate-700 rounded-xl overflow-hidden shadow-2xl print:border-black print:bg-white print:text-black">
          
          {/* Header oficial del cuadro */}
          <div className="bg-slate-900 border-b-2 border-slate-700 p-3.5 text-center print:bg-gray-200 print:border-black">
            <h2 className="text-base md:text-lg font-black tracking-wide text-slate-100 uppercase font-mono print:text-black">
              {isEditing ? (
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="bg-slate-950 border border-slate-600 rounded px-3 py-1 text-center w-full focus:outline-none focus:border-amber-500 text-slate-100 font-bold"
                />
              ) : (
                nombre || 'GENERADOR No. 1 DOMOSA 580 KVA'
              )}
            </h2>
          </div>

          {/* Cuadro de Destino y Ubicación */}
          <table className="w-full text-xs text-left border-collapse border-b border-slate-700 font-mono print:border-black">
            <tbody>
              <tr className="border-b border-slate-800 print:border-gray-300">
                <td className="w-1/3 bg-slate-900/90 font-bold p-3 text-slate-300 uppercase border-r border-slate-800 print:bg-gray-100 print:text-black print:border-gray-300 flex items-center justify-between">
                  <span>GENERADOR ALIMENTA A:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setWizardModo('SALIDA');
                      setCircuitDataWizard({
                        id: 'GENERADOR_SALIDA',
                        nombre: 'Salida del Generador',
                        equipo: alimentadoPor || '',
                        poles: [3],
                        breaker: { amp: dt.amperaje || '1600', marca: dt.marca || '', tipo: '' }
                      });
                      setModalJerarquiaOpen(true);
                    }}
                    className="no-print inline-flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all"
                    title="Configurar Equipo Alimentado (Wizard)"
                  >
                    <Settings className="w-3 h-3 text-amber-400" /> Configurar Jerarquía
                  </button>
                </td>
                <td className="p-3 text-slate-100 font-semibold print:text-black">
                  {isEditing ? (
                    <input
                      type="text"
                      value={alimentadoPor}
                      onChange={(e) => setAlimentadoPor(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                    />
                  ) : (
                    renderElementWithId(alimentadoPor || 'TRANSFERENCIA DOMOSA (ID: ATS-1)')
                  )}
                </td>
              </tr>
              <tr>
                <td className="bg-slate-900/90 font-bold p-3 text-slate-300 uppercase border-r border-slate-800 print:bg-gray-100 print:text-black print:border-gray-300">
                  UBICACIÓN:
                </td>
                <td className="p-3 text-slate-100 font-semibold print:text-black">
                  {isEditing ? (
                    <input
                      type="text"
                      value={ubicacion}
                      onChange={(e) => setUbicacion(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                    />
                  ) : (
                    ubicacion || 'ESTACIONAMIENTO'
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Sub-Header: Datos de Placa */}
          <div className="bg-slate-900/80 border-b border-slate-700 p-2 text-center font-bold text-xs uppercase tracking-wider text-amber-400 font-mono print:bg-gray-200 print:text-black print:border-black">
            Datos de placa
          </div>

          {/* Cuadro de Datos de Placa */}
          <table className="w-full text-xs text-left border-collapse border-b-2 border-slate-700 font-mono print:border-black">
            <thead>
              <tr className="bg-slate-900/50 border-b border-slate-800 font-bold text-slate-400 uppercase print:bg-gray-100 print:text-black print:border-gray-300">
                <th className="p-2.5 border-r border-slate-800 w-1/3 print:border-gray-300">PARÁMETRO</th>
                <th className="p-2.5 border-r border-slate-800 w-1/3 text-center print:border-gray-300">VALOR</th>
                <th className="p-2.5 w-1/3 text-center">UNIDAD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 print:divide-gray-300">
              <tr>
                <td className="p-2.5 bg-slate-900/40 font-bold text-slate-300 border-r border-slate-800 print:bg-gray-50 print:text-black print:border-gray-300">MARCA</td>
                <td className="p-2.5 border-r border-slate-800 text-center font-bold text-slate-100 print:text-black print:border-gray-300">
                  {isEditing ? <input type="text" value={dt.marca || ''} onChange={(e) => handleDtChange('marca', e.target.value)} className="w-full text-center bg-slate-900 border border-slate-700 rounded text-slate-100" /> : (dt.marca || 'DOMOSA')}
                </td>
                <td className="p-2.5 text-center text-slate-400 print:text-black">PLACA</td>
              </tr>
              <tr>
                <td className="p-2.5 bg-slate-900/40 font-bold text-slate-300 border-r border-slate-800 print:bg-gray-50 print:text-black print:border-gray-300">FASES</td>
                <td className="p-2.5 border-r border-slate-800 text-center font-bold text-slate-100 print:text-black print:border-gray-300">
                  {isEditing ? <input type="text" value={dt.fases || ''} onChange={(e) => handleDtChange('fases', e.target.value)} className="w-full text-center bg-slate-900 border border-slate-700 rounded text-slate-100" /> : (dt.fases || '3')}
                </td>
                <td className="p-2.5 text-center text-slate-400 print:text-black">FASE</td>
              </tr>
              <tr>
                <td className="p-2.5 bg-slate-900/40 font-bold text-slate-300 border-r border-slate-800 print:bg-gray-50 print:text-black print:border-gray-300">POTENCIA</td>
                <td className="p-2.5 border-r border-slate-800 text-center font-extrabold text-amber-400 print:text-black print:border-gray-300">
                  {isEditing ? <input type="text" value={dt.kva || dt.potenciaKva || ''} onChange={(e) => handleDtChange('kva', e.target.value)} className="w-full text-center bg-slate-900 border border-slate-700 rounded text-amber-400" /> : (dt.kva || dt.potenciaKva || '580')}
                </td>
                <td className="p-2.5 text-center text-slate-400 print:text-black">KVA</td>
              </tr>
              <tr>
                <td className="p-2.5 bg-slate-900/40 font-bold text-slate-300 border-r border-slate-800 print:bg-gray-50 print:text-black print:border-gray-300">VOLTAJE</td>
                <td className="p-2.5 border-r border-slate-800 text-center font-bold text-slate-100 print:text-black print:border-gray-300">
                  {isEditing ? <input type="text" value={dt.voltajeGeneracion || dt.voltaje || ''} onChange={(e) => handleDtChange('voltajeGeneracion', e.target.value)} className="w-full text-center bg-slate-900 border border-slate-700 rounded text-slate-100" /> : (dt.voltajeGeneracion || dt.voltaje || '208')}
                </td>
                <td className="p-2.5 text-center text-slate-400 print:text-black">VOL</td>
              </tr>
              <tr>
                <td className="p-2.5 bg-slate-900/40 font-bold text-slate-300 border-r border-slate-800 print:bg-gray-50 print:text-black print:border-gray-300">AMPERAJE</td>
                <td className="p-2.5 border-r border-slate-800 text-center font-bold text-slate-100 print:text-black print:border-gray-300">
                  {isEditing ? <input type="text" value={dt.amperaje || ''} onChange={(e) => handleDtChange('amperaje', e.target.value)} className="w-full text-center bg-slate-900 border border-slate-700 rounded text-slate-100" /> : (dt.amperaje || '800')}
                </td>
                <td className="p-2.5 text-center text-slate-400 print:text-black">AMP</td>
              </tr>
              <tr>
                <td className="p-2.5 bg-slate-900/40 font-bold text-slate-300 border-r border-slate-800 print:bg-gray-50 print:text-black print:border-gray-300">FP (FACTOR POTENCIA)</td>
                <td className="p-2.5 border-r border-slate-800 text-center font-bold text-slate-100 print:text-black print:border-gray-300">
                  {isEditing ? <input type="text" value={dt.fp || ''} onChange={(e) => handleDtChange('fp', e.target.value)} className="w-full text-center bg-slate-900 border border-slate-700 rounded text-slate-100" /> : (dt.fp || '-')}
                </td>
                <td className="p-2.5 text-center text-slate-400 print:text-black">%</td>
              </tr>
              <tr>
                <td className="p-2.5 bg-slate-900/40 font-bold text-slate-300 border-r border-slate-800 print:bg-gray-50 print:text-black print:border-gray-300">COMBUSTIBLE</td>
                <td className="p-2.5 border-r border-slate-800 text-center font-bold text-slate-100 print:text-black print:border-gray-300">
                  {isEditing ? <input type="text" value={dt.combustible || ''} onChange={(e) => handleDtChange('combustible', e.target.value)} className="w-full text-center bg-slate-900 border border-slate-700 rounded text-slate-100" /> : (dt.combustible || 'DIÉSEL / GASOIL')}
                </td>
                <td className="p-2.5 text-center text-slate-400 print:text-black">GALONES</td>
              </tr>
            </tbody>
          </table>

          {/* Sub-Header: Interruptor Generador */}
          <div className="bg-slate-900/80 border-b border-slate-700 p-2 text-center font-bold text-xs uppercase tracking-wider text-amber-400 font-mono print:bg-gray-200 print:text-black print:border-black">
            INTERRUPTOR GENERADOR
          </div>

          {/* Cuadro del Interruptor */}
          <table className="w-full text-xs text-center border-collapse border-b-2 border-slate-700 font-mono print:border-black">
            <thead>
              <tr className="bg-slate-900/50 border-b border-slate-800 font-bold text-slate-400 uppercase print:bg-gray-100 print:text-black print:border-gray-300">
                <th className="p-2 border-r border-slate-800 print:border-gray-300">INTERRUPTOR</th>
                <th className="p-2 border-r border-slate-800 print:border-gray-300">MARCA</th>
                <th className="p-2 border-r border-slate-800 print:border-gray-300">TIPO</th>
                <th className="p-2 border-r border-slate-800 print:border-gray-300">AMP</th>
                <th className="p-2 border-r border-slate-800 print:border-gray-300">COND. FASE</th>
                <th className="p-2">COND. NEUTRO</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 font-bold text-slate-300 border-r border-slate-800 bg-slate-900/40 print:bg-gray-50 print:text-black print:border-gray-300">GENERADOR</td>
                <td className="p-3 font-bold text-slate-100 border-r border-slate-800 print:text-black print:border-gray-300">
                  {isEditing ? <input type="text" value={dt.interruptor?.marca || dt.interruptorMarca || ''} onChange={(e) => handleNestedDtChange('interruptor', 'marca', e.target.value)} className="w-full text-center bg-slate-900 border border-slate-700 rounded text-slate-100" /> : (dt.interruptor?.marca || dt.interruptorMarca || 'CHINT')}
                </td>
                <td className="p-3 font-bold text-slate-100 border-r border-slate-800 print:text-black print:border-gray-300">
                  {isEditing ? <input type="text" value={dt.interruptor?.tipo || dt.interruptorTipo || ''} onChange={(e) => handleNestedDtChange('interruptor', 'tipo', e.target.value)} className="w-full text-center bg-slate-900 border border-slate-700 rounded text-slate-100" /> : (dt.interruptor?.tipo || dt.interruptorTipo || '-')}
                </td>
                <td className="p-3 font-extrabold text-amber-400 border-r border-slate-800 print:text-black print:border-gray-300">
                  {isEditing ? <input type="text" value={dt.interruptor?.amp || dt.interruptorAmp || ''} onChange={(e) => handleNestedDtChange('interruptor', 'amp', e.target.value)} className="w-full text-center bg-slate-900 border border-slate-700 rounded text-amber-400" /> : (dt.interruptor?.amp || dt.interruptorAmp || '1600')}
                </td>
                <td className="p-3 font-bold text-slate-100 border-r border-slate-800 print:text-black print:border-gray-300">
                  {isEditing ? <input type="text" value={dt.interruptor?.condFase || dt.condFase || ''} onChange={(e) => handleNestedDtChange('interruptor', 'condFase', e.target.value)} className="w-full text-center bg-slate-900 border border-slate-700 rounded text-slate-100" /> : (dt.interruptor?.condFase || dt.condFase || '2(3X500)')}
                </td>
                <td className="p-3 font-bold text-slate-100 print:text-black">
                  {isEditing ? <input type="text" value={dt.interruptor?.condNeutro || dt.condNeutro || ''} onChange={(e) => handleNestedDtChange('interruptor', 'condNeutro', e.target.value)} className="w-full text-center bg-slate-900 border border-slate-700 rounded text-slate-100" /> : (dt.interruptor?.condNeutro || dt.condNeutro || '500')}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Imagen del Generador (Parte inferior del cuadro) */}
          <div className="p-4 bg-slate-900/30 text-center print:bg-white">
            {fotoBlob || fotoSrc || previewUrl ? (
              <div className="max-w-md mx-auto rounded-xl overflow-hidden border border-slate-700 shadow-lg print:border-black">
                <SafeImage blob={fotoBlob} src={previewUrl || fotoSrc} alt="Generador de Emergencia" className="w-full h-auto max-h-96 object-cover" />
              </div>
            ) : (
              <div className="p-6 border-2 border-dashed border-slate-800 rounded-xl text-center space-y-2 no-print">
                <Camera className="w-8 h-8 text-slate-600 mx-auto" />
                <span className="text-xs text-slate-500 font-mono block">Sin fotografía adjunta del generador</span>
                <label className="inline-block px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold rounded-lg cursor-pointer transition-colors">
                  Adjuntar Foto
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PLANTILLA: TRANSFERENCIA ("INFORMACIÓN GENERAL TRANSFERENCIA 580") */}
      {/* ========================================================================= */}
      {tipoElemento === 'TRANSFER' && (
        <div className="bg-slate-950 border-2 border-slate-700 rounded-xl overflow-hidden shadow-2xl print:border-black print:bg-white print:text-black">
          
          {/* Header oficial del cuadro */}
          <div className="bg-slate-900 border-b-2 border-slate-700 p-3.5 text-center print:bg-gray-200 print:border-black">
            <h2 className="text-base md:text-lg font-black tracking-wide text-slate-100 uppercase font-mono print:text-black">
              {isEditing ? (
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="bg-slate-950 border border-slate-600 rounded px-3 py-1 text-center w-full focus:outline-none focus:border-amber-500 text-slate-100 font-bold"
                />
              ) : (
                `INFORMACIÓN GENERAL TRANSFERENCIA ${nombre ? nombre : '580'}`
              )}
            </h2>
          </div>

          {/* Cuadro de Datos Generales de la Transferencia */}
          <table className="w-full text-xs text-left border-collapse border-b border-slate-700 font-mono print:border-black">
            <tbody>
              <tr className="border-b border-slate-800 print:border-gray-300">
                <td className="w-1/3 bg-slate-900/90 font-bold p-3 text-slate-300 uppercase border-r border-slate-800 print:bg-gray-100 print:text-black print:border-gray-300">
                  UBICACIÓN:
                </td>
                <td className="p-3 text-slate-100 font-semibold print:text-black">
                  {isEditing ? (
                    <input
                      type="text"
                      value={ubicacion}
                      onChange={(e) => setUbicacion(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                    />
                  ) : (
                    ubicacion || 'ESTACIONAMIENTO / SÓTANO SALA TÉCNICA'
                  )}
                </td>
              </tr>
              <tr className="border-b border-slate-800 print:border-gray-300">
                <td className="bg-slate-900/90 font-bold p-3 text-slate-300 uppercase border-r border-slate-800 print:bg-gray-100 print:text-black print:border-gray-300 flex items-center justify-between">
                  <span>TABLERO ALIMENTADO POR:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setWizardModo('ENTRADA');
                      setCircuitDataWizard({
                        id: 'ATS_ALIMENTACION',
                        nombre: 'Fuente de Alimentación de Transferencia',
                        equipo: alimentadoPor || '',
                        poles: [3],
                        breaker: { amp: dt.amperaje || '3200', marca: dt.modelo || '', tipo: '' }
                      });
                      setModalJerarquiaOpen(true);
                    }}
                    className="no-print inline-flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all"
                    title="Configurar Origen de Alimentación (Wizard)"
                  >
                    <Settings className="w-3 h-3 text-amber-400" /> Configurar Jerarquía
                  </button>
                </td>
                <td className="p-3 text-slate-100 font-semibold print:text-black">
                  {isEditing ? (
                    <input
                      type="text"
                      value={alimentadoPor}
                      onChange={(e) => setAlimentadoPor(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                    />
                  ) : (
                    renderElementWithId(alimentadoPor || 'GENERADOR DOMOSA 1 (ID: GEN-1)')
                  )}
                </td>
              </tr>
              <tr>
                <td className="bg-slate-900/90 font-bold p-3 text-slate-300 uppercase border-r border-slate-800 print:bg-gray-100 print:text-black print:border-gray-300">
                  MODELO:
                </td>
                <td className="p-3 text-slate-100 font-semibold print:text-black">
                  {isEditing ? (
                    <input
                      type="text"
                      value={dt.modelo || ''}
                      onChange={(e) => handleDtChange('modelo', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                    />
                  ) : (
                    dt.modelo || 'DOMOSA'
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Sub-Header: Transferencia */}
          <div className="bg-slate-900/80 border-b border-slate-700 p-2 text-center font-bold text-xs uppercase tracking-wider text-emerald-400 font-mono print:bg-gray-200 print:text-black print:border-black">
            TRANSFERENCIA
          </div>

          {/* Cuadro de Medición de Transferencia */}
          <table className="w-full text-xs text-left border-collapse border-b border-slate-700 font-mono print:border-black">
            <thead>
              <tr className="bg-slate-900/50 border-b border-slate-800 font-bold text-slate-400 uppercase print:bg-gray-100 print:text-black print:border-gray-300">
                <th className="p-2.5 border-r border-slate-800 w-1/4 print:border-gray-300">TIPO</th>
                <th className="p-2.5 border-r border-slate-800 w-1/6 text-center print:border-gray-300">AMP</th>
                <th className="p-2.5 border-r border-slate-800 w-1/4 text-center print:border-gray-300">VOLTAJE</th>
                <th className="p-2.5 w-1/3">OBSERVACIÓN</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 font-bold text-slate-100 border-r border-slate-800 print:text-black print:border-gray-300">
                  {isEditing ? <input type="text" value={dt.tipoTransferencia || ''} onChange={(e) => handleDtChange('tipoTransferencia', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded text-slate-100" /> : (dt.tipoTransferencia || 'YUYE-YES1 3200/4P')}
                </td>
                <td className="p-3 font-extrabold text-emerald-400 text-center border-r border-slate-800 print:text-black print:border-gray-300">
                  {isEditing ? <input type="text" value={dt.amperaje || dt.capacidadAmperios || ''} onChange={(e) => handleDtChange('amperaje', e.target.value)} className="w-full text-center bg-slate-900 border border-slate-700 rounded text-emerald-400" /> : (dt.amperaje || dt.capacidadAmperios || '3200')}
                </td>
                <td className="p-3 border-r border-slate-800 print:border-gray-300">
                  <div className="space-y-1 text-slate-200 print:text-black">
                    <div className="flex justify-between"><span className="text-slate-500 font-bold">VAB:</span> <span>{dt.voltaje?.vab || dt.vab || '211'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500 font-bold">VAC:</span> <span>{dt.voltaje?.vac || dt.vac || '208'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500 font-bold">VBC:</span> <span>{dt.voltaje?.vbc || dt.vbc || '209'}</span></div>
                  </div>
                </td>
                <td className="p-3 text-slate-300 text-xs print:text-black">
                  {isEditing ? <textarea value={dt.observacionTransferencia || ''} onChange={(e) => handleDtChange('observacionTransferencia', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-slate-100" /> : (dt.observacionTransferencia || 'TRANSFERENCIA ALIMENTADA POR LOS DOS GENERADORES')}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Cuadro de Conductores y Alimentación */}
          <table className="w-full text-xs text-left border-collapse border-b-2 border-slate-700 font-mono print:border-black">
            <thead>
              <tr className="bg-slate-900/50 border-b border-slate-800 font-bold text-slate-400 uppercase print:bg-gray-100 print:text-black print:border-gray-300">
                <th className="p-2.5 border-r border-slate-800 w-1/3 print:border-gray-300">ALIMENTACIÓN / LÍNEA</th>
                <th className="p-2.5 border-r border-slate-800 w-1/3 text-center print:border-gray-300">CALIBRE / CONDUCTOR</th>
                <th className="p-2.5 w-1/3">OBSERVACIÓN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 print:divide-gray-300">
              <tr>
                <td className="p-2.5 bg-slate-900/40 font-bold text-slate-300 border-r border-slate-800 print:bg-gray-50 print:text-black print:border-gray-300">
                  <div className="flex items-center justify-between gap-1">
                    <span>ALIMENTACIÓN GENERADOR 1 / CORPOELEC</span>
                    <button
                      type="button"
                      onClick={() => {
                        setWizardModo('ENTRADA');
                        setCircuitDataWizard({
                          id: 'ATS_GEN1',
                          nombre: 'Fuente Normal (A) - Generador 1 / Corpoelec',
                          equipo: dt.alimentacionGenerador1 || '',
                          poles: [3],
                          breaker: { amp: '', marca: '', tipo: '' }
                        });
                        setModalJerarquiaOpen(true);
                      }}
                      className="no-print p-1 hover:bg-emerald-500/20 text-emerald-400 rounded transition-all cursor-pointer"
                      title="Configurar Fuente Normal (Wizard)"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
                <td className="p-2.5 border-r border-slate-800 text-center font-bold text-slate-100 print:text-black print:border-gray-300">
                  {isEditing ? <input type="text" value={dt.alimentacionGenerador1 || dt.alimentacionCorpoelec || ''} onChange={(e) => handleDtChange('alimentacionGenerador1', e.target.value)} className="w-full text-center bg-slate-900 border border-slate-700 rounded text-slate-100" /> : (dt.alimentacionGenerador1 || dt.alimentacionCorpoelec || '2(3X500)')}
                </td>
                <td className="p-2.5 text-slate-400 print:text-black">-</td>
              </tr>
              <tr>
                <td className="p-2.5 bg-slate-900/40 font-bold text-slate-300 border-r border-slate-800 print:bg-gray-50 print:text-black print:border-gray-300">
                  <div className="flex items-center justify-between gap-1">
                    <span>ALIMENTACIÓN GENERADOR 2 / TRANSF DOMOSA</span>
                    <button
                      type="button"
                      onClick={() => {
                        setWizardModo('ENTRADA');
                        setCircuitDataWizard({
                          id: 'ATS_GEN2',
                          nombre: 'Fuente Emergencia (B) - Generador 2 / Transf',
                          equipo: dt.alimentacionGenerador2 || '',
                          poles: [3],
                          breaker: { amp: '', marca: '', tipo: '' }
                        });
                        setModalJerarquiaOpen(true);
                      }}
                      className="no-print p-1 hover:bg-emerald-500/20 text-emerald-400 rounded transition-all cursor-pointer"
                      title="Configurar Fuente Emergencia (Wizard)"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
                <td className="p-2.5 border-r border-slate-800 text-center font-bold text-slate-100 print:text-black print:border-gray-300">
                  {isEditing ? <input type="text" value={dt.alimentacionGenerador2 || dt.alimentacionTransfDomosa || ''} onChange={(e) => handleDtChange('alimentacionGenerador2', e.target.value)} className="w-full text-center bg-slate-900 border border-slate-700 rounded text-slate-100" /> : (dt.alimentacionGenerador2 || dt.alimentacionTransfDomosa || '2(3X500)')}
                </td>
                <td className="p-2.5 text-slate-400 print:text-black">-</td>
              </tr>
              <tr>
                <td className="p-2.5 bg-slate-900/40 font-bold text-slate-300 border-r border-slate-800 print:bg-gray-50 print:text-black print:border-gray-300">
                  <div className="flex items-center justify-between gap-1">
                    <span>CARGA</span>
                    <button
                      type="button"
                      onClick={() => {
                        setWizardModo('SALIDA');
                        setCircuitDataWizard({
                          id: 'ATS_CARGA',
                          nombre: 'Salida a Carga (C)',
                          equipo: dt.carga || '',
                          poles: [3],
                          breaker: { amp: dt.amperaje || '3200', marca: '', tipo: '' }
                        });
                        setModalJerarquiaOpen(true);
                      }}
                      className="no-print p-1 hover:bg-emerald-500/20 text-emerald-400 rounded transition-all cursor-pointer"
                      title="Configurar Salida a Carga (Wizard)"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
                <td className="p-2.5 border-r border-slate-800 text-center font-bold text-slate-100 print:text-black print:border-gray-300">
                  {isEditing ? <input type="text" value={dt.carga || ''} onChange={(e) => handleDtChange('carga', e.target.value)} className="w-full text-center bg-slate-900 border border-slate-700 rounded text-slate-100" /> : (dt.carga || '2(3X500)')}
                </td>
                <td className="p-2.5 text-slate-400 print:text-black">-</td>
              </tr>
              <tr>
                <td className="p-2.5 bg-slate-900/40 font-bold text-slate-300 border-r border-slate-800 print:bg-gray-50 print:text-black print:border-gray-300">NEUTRO</td>
                <td className="p-2.5 border-r border-slate-800 text-center font-bold text-slate-100 print:text-black print:border-gray-300">
                  {isEditing ? <input type="text" value={dt.neutro || ''} onChange={(e) => handleDtChange('neutro', e.target.value)} className="w-full text-center bg-slate-900 border border-slate-700 rounded text-slate-100" /> : (dt.neutro || '500')}
                </td>
                <td className="p-2.5 text-slate-300 font-semibold print:text-black">PASA DIRECTAMENTE AL TABLERO .</td>
              </tr>
              <tr>
                <td className="p-2.5 bg-slate-900/40 font-bold text-slate-300 border-r border-slate-800 print:bg-gray-50 print:text-black print:border-gray-300">TIERRA</td>
                <td className="p-2.5 border-r border-slate-800 text-center font-bold text-slate-100 print:text-black print:border-gray-300">
                  {isEditing ? <input type="text" value={dt.tierra || ''} onChange={(e) => handleDtChange('tierra', e.target.value)} className="w-full text-center bg-slate-900 border border-slate-700 rounded text-slate-100" /> : (dt.tierra || 'NO')}
                </td>
                <td className="p-2.5 text-slate-400 print:text-black">-</td>
              </tr>
            </tbody>
          </table>

          {/* Imagen de la Transferencia (Parte inferior del cuadro) */}
          <div className="p-4 bg-slate-900/30 text-center print:bg-white">
            {fotoBlob || fotoSrc || previewUrl ? (
              <div className="max-w-md mx-auto rounded-xl overflow-hidden border border-slate-700 shadow-lg print:border-black">
                <SafeImage 
                  blob={fotoBlob} 
                  src={previewUrl || fotoSrc} 
                  alt="Transferencia Automática" 
                  className="w-full object-cover" 
                  style={{ maxHeight: `${dt.fotoScale || 280}px` }}
                />
              </div>
            ) : (
              <div className="p-6 border-2 border-dashed border-slate-800 rounded-xl text-center space-y-2 no-print">
                <Camera className="w-8 h-8 text-slate-600 mx-auto" />
                <span className="text-xs text-slate-500 font-mono block">Sin fotografía adjunta de la transferencia</span>
                <label className="inline-block px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold rounded-lg cursor-pointer transition-colors">
                  Adjuntar Foto
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              </div>
            )}

            {/* Slider de ajuste de tamaño (solo en pantalla si hay imagen) */}
            {(fotoBlob || fotoSrc || previewUrl) && (
              <div className="no-print mt-3 max-w-xs mx-auto space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                  <span>Ajustar tamaño en PDF</span>
                  <span className="text-amber-500 font-mono">{dt.fotoScale || 280}px</span>
                </div>
                <input
                  type="range"
                  min="120"
                  max="380"
                  value={dt.fotoScale || 280}
                  onChange={(e) => handleDtChange('fotoScale', parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. PLANTILLA: TRANSFORMADOR ("INFORMACIÓN GENERAL DE TRANSFORMADOR No. X") */}
      {/* ========================================================================= */}
      {tipoElemento === 'TRANSFORMADOR' && (
        <div className="bg-slate-950 border-2 border-slate-700 rounded-xl overflow-hidden shadow-2xl print:border-black print:bg-white print:text-black">
          
          {/* Título Principal */}
          <div className="bg-slate-900 border-b-2 border-slate-700 p-3.5 text-center print:bg-gray-200 print:border-black">
            <h2 className="text-base md:text-lg font-black tracking-wide text-slate-100 uppercase font-mono print:text-black">
              {isEditing ? (
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="bg-slate-950 border border-slate-600 rounded px-3 py-1 text-center w-full focus:outline-none focus:border-violet-500 text-slate-100 font-bold"
                />
              ) : (
                `INFORMACIÓN GENERAL DE TRANSFORMADOR No. ${nombre || '—'}`
              )}
            </h2>
          </div>

          {/* Fila 1: ID Elemento, Alimentado Por y Ubicación */}
          <div className="border-b border-slate-700 p-3 bg-slate-900/60 font-mono text-xs text-slate-100 print:bg-white print:text-black print:border-black flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <span className="font-bold uppercase text-slate-400 print:text-black mr-1.5">ID ELEMENTO:</span>
                <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 print:text-black print:border-black">
                  {elementoData.id || '—'}
                </span>
              </div>
              <div>
                <span className="font-bold uppercase text-slate-400 print:text-black mr-1.5">ALIMENTADO POR:</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={alimentadoPor}
                    onChange={(e) => setAlimentadoPor(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 focus:outline-none focus:border-violet-500"
                    placeholder="Ej. PCC / Acometida 1"
                  />
                ) : (
                  <span className="font-semibold">{alimentadoPor || '—'}</span>
                )}
              </div>
            </div>
            <div>
              <span className="font-bold uppercase text-slate-400 print:text-black mr-1.5">UBICACIÓN:</span>
              {isEditing ? (
                <input
                  type="text"
                  value={ubicacion}
                  onChange={(e) => setUbicacion(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 focus:outline-none focus:border-violet-500"
                />
              ) : (
                <span className="font-semibold">{ubicacion || '—'}</span>
              )}
            </div>
          </div>

          {/* Tabla de Especificaciones */}
          <table className="w-full text-xs text-left border-collapse border-b border-slate-700 font-mono print:border-black">
            <tbody>
              <tr className="border-b border-slate-800 print:border-gray-300">
                <td className="w-1/3 bg-slate-900/90 font-bold p-3 text-slate-300 uppercase border-r border-slate-800 print:bg-gray-100 print:text-black print:border-gray-300">MARCA</td>
                <td className="p-3 text-slate-100 font-semibold print:text-black">
                  {isEditing ? (
                    <input
                      type="text"
                      value={dt.marca || ''}
                      onChange={(e) => handleDtChange('marca', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 focus:outline-none focus:border-violet-500"
                    />
                  ) : (
                    dt.marca || '—'
                  )}
                </td>
              </tr>
              <tr className="border-b border-slate-800 print:border-gray-300">
                <td className="bg-slate-900/90 font-bold p-3 text-slate-300 uppercase border-r border-slate-800 print:bg-gray-100 print:text-black print:border-gray-300">FASES</td>
                <td className="p-3 text-slate-100 font-semibold print:text-black">
                  {isEditing ? (
                    <input
                      type="text"
                      value={dt.fases || ''}
                      onChange={(e) => handleDtChange('fases', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 focus:outline-none focus:border-violet-500"
                    />
                  ) : (
                    dt.fases || '—'
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Cuadro de Datos de Placa */}
          <table className="w-full text-xs text-left border-collapse border-b-2 border-slate-700 font-mono print:border-black">
            <thead>
              <tr className="bg-slate-900/50 border-b border-slate-800 font-bold text-slate-400 uppercase print:bg-gray-100 print:text-black print:border-gray-300">
                <th className="p-2.5 border-r border-slate-800 w-1/3 print:border-gray-300">PARÁMETRO</th>
                <th className="p-2.5 border-r border-slate-800 w-1/3 text-center print:border-gray-300">VALOR</th>
                <th className="p-2.5 w-1/3 text-center">UNIDAD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 print:divide-gray-300">
              <tr>
                <td className="p-2.5 bg-slate-900/40 font-bold text-slate-300 border-r border-slate-800 print:bg-gray-50 print:text-black print:border-gray-300">POTENCIA</td>
                <td className="p-2.5 border-r border-slate-800 text-center font-extrabold text-violet-400 print:text-black print:border-gray-300">
                  {isEditing ? (
                    <input
                      type="text"
                      maxLength={4}
                      value={dt.potenciaKva || dt.kva || ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                        handleDtChange('potenciaKva', val);
                        handleDtChange('kva', val);
                      }}
                      placeholder="Ej. 500"
                      className="w-full text-center bg-slate-900 border border-slate-700 rounded text-violet-400 focus:outline-none focus:border-violet-500"
                    />
                  ) : (
                    dt.potenciaKva || dt.kva || '—'
                  )}
                </td>
                <td className="p-2.5 text-center text-slate-400 print:text-black">
                  {isEditing ? (
                    <select
                      value={dt.unidadPotencia || 'kVA'}
                      onChange={(e) => handleDtChange('unidadPotencia', e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded text-slate-100 text-xs p-1 focus:outline-none focus:border-violet-500 text-center"
                    >
                      <option value="kVA">kVA</option>
                      <option value="MVA">MVA</option>
                    </select>
                  ) : (
                    dt.unidadPotencia || 'kVA'
                  )}
                </td>
              </tr>
              <tr>
                <td className="p-2.5 bg-slate-900/40 font-bold text-slate-300 border-r border-slate-800 print:bg-gray-50 print:text-black print:border-gray-300">IMPEDANCIA</td>
                <td className="p-2.5 border-r border-slate-800 print:border-gray-300" colSpan="2">
                  <div className="grid grid-cols-3 gap-2 text-center items-center">
                    <div className="flex items-center gap-1 justify-center">
                      {isEditing ? (
                        <input
                          type="text"
                          value={dt.impedanciaPct || ''}
                          onChange={(e) => handleDtChange('impedanciaPct', e.target.value)}
                          placeholder="%"
                          className="w-16 bg-slate-900 border border-slate-700 rounded text-slate-100 text-center text-xs p-1 focus:outline-none focus:border-violet-500"
                        />
                      ) : (
                        <span className="font-bold text-slate-100 print:text-black">{dt.impedanciaPct || '—'}</span>
                      )}
                      <span className="text-[10px] text-slate-500 font-bold">%</span>
                    </div>
                    <div className="flex items-center gap-1 justify-center border-l border-slate-850 print:border-gray-300">
                      {isEditing ? (
                        <input
                          type="text"
                          value={dt.impedanciaAmp || ''}
                          onChange={(e) => handleDtChange('impedanciaAmp', e.target.value)}
                          placeholder="A"
                          className="w-16 bg-slate-900 border border-slate-700 rounded text-slate-100 text-center text-xs p-1 focus:outline-none focus:border-violet-500"
                        />
                      ) : (
                        <span className="font-bold text-slate-100 print:text-black">{dt.impedanciaAmp || '—'}</span>
                      )}
                      <span className="text-[10px] text-slate-500 font-bold">A</span>
                    </div>
                    <div className="flex items-center gap-1 justify-center border-l border-slate-850 print:border-gray-300">
                      {isEditing ? (
                        <input
                          type="text"
                          value={dt.impedanciaTemp || ''}
                          onChange={(e) => handleDtChange('impedanciaTemp', e.target.value)}
                          placeholder="°C"
                          className="w-16 bg-slate-900 border border-slate-700 rounded text-slate-100 text-center text-xs p-1 focus:outline-none focus:border-violet-500"
                        />
                      ) : (
                        <span className="font-bold text-slate-100 print:text-black">{dt.impedanciaTemp || '—'}</span>
                      )}
                      <span className="text-[10px] text-slate-500 font-bold">°C</span>
                    </div>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="p-2.5 bg-slate-900/40 font-bold text-slate-300 border-r border-slate-800 print:bg-gray-50 print:text-black print:border-gray-300">TENSIÓN PRIMARIA</td>
                <td className="p-2.5 border-r border-slate-800 text-center font-bold text-slate-100 print:text-black print:border-gray-300">
                  {isEditing ? (
                    <input
                      type="text"
                      value={dt.tensionPrimaria || dt.voltajePrimario || ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                        handleDtChange('tensionPrimaria', val);
                        handleDtChange('voltajePrimario', val);
                      }}
                      placeholder="Ej. 13.8"
                      className="w-full text-center bg-slate-900 border border-slate-700 rounded text-slate-100 focus:outline-none focus:border-violet-500"
                    />
                  ) : (
                    dt.tensionPrimaria || dt.voltajePrimario || '—'
                  )}
                </td>
                <td className="p-2.5 text-center text-slate-400 print:text-black">
                  {isEditing ? (
                    <select
                      value={dt.unidadTensionPrimaria || 'kV'}
                      onChange={(e) => handleDtChange('unidadTensionPrimaria', e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded text-slate-100 text-xs p-1 focus:outline-none focus:border-violet-500 text-center"
                    >
                      <option value="kV">kV</option>
                      <option value="V">V</option>
                    </select>
                  ) : (
                    dt.unidadTensionPrimaria || 'kV'
                  )}
                </td>
              </tr>
              <tr>
                <td className="p-2.5 bg-slate-900/40 font-bold text-slate-300 border-r border-slate-800 print:bg-gray-50 print:text-black print:border-gray-300">TENSIÓN SECUNDARIA</td>
                <td className="p-2.5 border-r border-slate-800 text-center font-bold text-slate-100 print:text-black print:border-gray-300">
                  {isEditing ? (
                    <input
                      type="text"
                      value={dt.tensionSecundaria || dt.voltajeSecundario || ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9/]/g, '');
                        handleDtChange('tensionSecundaria', val);
                        handleDtChange('voltajeSecundario', val);
                      }}
                      placeholder="Ej. 208/120"
                      className="w-full text-center bg-slate-900 border border-slate-700 rounded text-slate-100 focus:outline-none focus:border-violet-500"
                    />
                  ) : (
                    dt.tensionSecundaria || dt.voltajeSecundario || '—'
                  )}
                </td>
                <td className="p-2.5 text-center text-slate-400 print:text-black">V</td>
              </tr>
              <tr>
                <td className="p-2.5 bg-slate-900/40 font-bold text-slate-300 border-r border-slate-800 print:bg-gray-50 print:text-black print:border-gray-300">AMPERIOS SEC.</td>
                <td className="p-2.5 border-r border-slate-800 text-center font-bold text-slate-100 print:text-black print:border-gray-300">
                  {isEditing ? (
                    <input
                      type="text"
                      value={dt.amperiosSecundaria || ''}
                      onChange={(e) => handleDtChange('amperiosSecundaria', e.target.value)}
                      className="w-full text-center bg-slate-900 border border-slate-700 rounded text-slate-100 focus:outline-none focus:border-violet-500"
                    />
                  ) : (
                    dt.amperiosSecundaria || '—'
                  )}
                </td>
                <td className="p-2.5 text-center text-slate-400 print:text-black">AMP</td>
              </tr>
            </tbody>
          </table>

          {/* Sub-Header: Acometidas */}
          <div className="bg-slate-900/80 border-b border-slate-700 p-2 text-center font-bold text-xs uppercase tracking-wider text-violet-400 font-mono print:bg-gray-200 print:text-black print:border-black">
            ACOMETIDAS
          </div>

          <table className="w-full text-[10px] md:text-xs text-center border-collapse border-b-2 border-slate-700 font-mono print:border-black">
            <thead>
              <tr className="bg-slate-900/50 border-b border-slate-800 font-bold text-slate-400 uppercase print:bg-gray-100 print:text-black print:border-gray-300">
                <th className="p-2 border-r border-slate-800 print:border-gray-300 w-20" rowSpan="2">ACOMETIDAS</th>
                <th className="p-2 border-r border-slate-800 print:border-gray-300 w-24" colSpan="2">TIPO</th>
                <th className="p-2 border-r border-slate-800 print:border-gray-300" colSpan="3">CONDUCTOR</th>
                <th className="p-2 border-r border-slate-800 print:border-gray-300" colSpan="2">PROTECCIONES</th>
                <th className="p-2 print:text-black" rowSpan="2">OBSERVACIONES</th>
              </tr>
              <tr className="bg-slate-900/30 border-b border-slate-800 font-bold text-slate-500 uppercase print:bg-gray-50 print:text-black print:border-gray-300">
                <th className="p-1 border-r border-slate-800 print:border-gray-350">AEREA</th>
                <th className="p-1 border-r border-slate-800 print:border-gray-350">SUB-TERR</th>
                <th className="p-1 border-r border-slate-800 print:border-gray-350">CALIB</th>
                <th className="p-1 border-r border-slate-800 print:border-gray-350">TIPO</th>
                <th className="p-1 border-r border-slate-800 print:border-gray-350">TERMINAL</th>
                <th className="p-1 border-r border-slate-800 print:border-gray-350">FUSIBLE</th>
                <th className="p-1 border-r border-slate-800 print:border-gray-350">PARARRAYO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 print:divide-gray-300">
              {['primaria', 'secundaria'].map((seccion) => {
                const ac = dt.acometidas?.[seccion] || { aerea: false, subterranea: false, calibre: '', tipo: '', terminal: '', fusible: '', pararrayo: '', observaciones: '' };
                return (
                  <tr key={seccion} className="print:text-black">
                    <td className="p-2 font-bold bg-slate-900/40 border-r border-slate-800 uppercase print:bg-gray-50 print:border-gray-300 text-slate-350 print:text-black">
                      <div className="flex items-center justify-between gap-1">
                        <span>{seccion}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const isEntrada = seccion === 'primaria';
                            setWizardModo(isEntrada ? 'ENTRADA' : 'SECUNDARIA');
                            setCircuitDataWizard({
                              id: `TRANSFORMADOR_${seccion.toUpperCase()}`,
                              nombre: `Transformador - Acometida ${seccion.toUpperCase()}`,
                              equipo: isEntrada ? alimentadoPor : (ac.observaciones || ''),
                              poles: [3],
                              breaker: { amp: '', marca: '', tipo: '' }
                            });
                            setModalJerarquiaOpen(true);
                          }}
                          className="no-print p-1 hover:bg-violet-500/20 text-violet-400 rounded transition-all cursor-pointer"
                          title={`Configurar Jerarquía (${seccion})`}
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="p-2 border-r border-slate-800 print:border-gray-300 text-center">
                      {isEditing ? (
                        <input
                          type="checkbox"
                          checked={ac.aerea || false}
                          onChange={(e) => handleAcometidaChange(seccion, 'aerea', e.target.checked)}
                          className="w-4 h-4 cursor-pointer accent-violet-500"
                        />
                      ) : (
                        ac.aerea ? '[ X ]' : '[   ]'
                      )}
                    </td>
                    <td className="p-2 border-r border-slate-800 print:border-gray-300 text-center">
                      {isEditing ? (
                        <input
                          type="checkbox"
                          checked={ac.subterranea || false}
                          onChange={(e) => handleAcometidaChange(seccion, 'subterranea', e.target.checked)}
                          className="w-4 h-4 cursor-pointer accent-violet-500"
                        />
                      ) : (
                        ac.subterranea ? '[ X ]' : '[   ]'
                      )}
                    </td>
                    <td className="p-2 border-r border-slate-800 print:border-gray-300">
                      {isEditing ? (
                        <input
                          type="text"
                          value={ac.calibre || ''}
                          onChange={(e) => handleAcometidaChange(seccion, 'calibre', e.target.value)}
                          className="w-full text-center bg-slate-900 border border-slate-700 rounded text-slate-100 text-xs p-1 focus:outline-none focus:border-violet-500"
                        />
                      ) : (
                        ac.calibre || '—'
                      )}
                    </td>
                    <td className="p-2 border-r border-slate-800 print:border-gray-300">
                      {isEditing ? (
                        <input
                          type="text"
                          value={ac.tipo || ''}
                          onChange={(e) => handleAcometidaChange(seccion, 'tipo', e.target.value)}
                          className="w-full text-center bg-slate-900 border border-slate-700 rounded text-slate-100 text-xs p-1 focus:outline-none focus:border-violet-500"
                        />
                      ) : (
                        ac.tipo || '—'
                      )}
                    </td>
                    <td className="p-2 border-r border-slate-800 print:border-gray-300">
                      {isEditing ? (
                        <input
                          type="text"
                          value={ac.terminal || ''}
                          onChange={(e) => handleAcometidaChange(seccion, 'terminal', e.target.value)}
                          className="w-full text-center bg-slate-900 border border-slate-700 rounded text-slate-100 text-xs p-1 focus:outline-none focus:border-violet-500"
                        />
                      ) : (
                        ac.terminal || '—'
                      )}
                    </td>
                    <td className="p-2 border-r border-slate-800 print:border-gray-300">
                      {isEditing ? (
                        <input
                          type="text"
                          value={ac.fusible || ''}
                          onChange={(e) => handleAcometidaChange(seccion, 'fusible', e.target.value)}
                          className="w-full text-center bg-slate-900 border border-slate-700 rounded text-slate-100 text-xs p-1 focus:outline-none focus:border-violet-500"
                        />
                      ) : (
                        ac.fusible || '—'
                      )}
                    </td>
                    <td className="p-2 border-r border-slate-800 print:border-gray-300">
                      {isEditing ? (
                        <input
                          type="text"
                          value={ac.pararrayo || ''}
                          onChange={(e) => handleAcometidaChange(seccion, 'pararrayo', e.target.value)}
                          className="w-full text-center bg-slate-900 border border-slate-700 rounded text-slate-100 text-xs p-1 focus:outline-none focus:border-violet-500"
                        />
                      ) : (
                        ac.pararrayo || '—'
                      )}
                    </td>
                    <td className="p-2 text-left">
                      {isEditing ? (
                        <input
                          type="text"
                          value={ac.observaciones || ''}
                          onChange={(e) => handleAcometidaChange(seccion, 'observaciones', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded text-slate-100 text-xs p-1 focus:outline-none focus:border-violet-500"
                        />
                      ) : (
                        ac.observaciones || '—'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Sub-Header: SPT */}
          <div className="bg-slate-900/80 border-b border-slate-700 p-2 text-center font-bold text-xs uppercase tracking-wider text-violet-400 font-mono print:bg-gray-200 print:text-black print:border-black">
            SISTEMA DE PUESTA A TIERRA (SPT)
          </div>

          <table className="w-full text-[10px] md:text-xs text-center border-collapse border-b-2 border-slate-700 font-mono print:border-black">
            <thead>
              <tr className="bg-slate-900/50 border-b border-slate-800 font-bold text-slate-400 uppercase print:bg-gray-100 print:text-black print:border-gray-300">
                <th className="p-2 border-r border-slate-800 print:border-gray-300 w-20" rowSpan="2">SPT</th>
                <th className="p-2 border-r border-slate-800 print:border-gray-300" colSpan="3">BARILLA (VARILLA)</th>
                <th className="p-2 border-r border-slate-800 print:border-gray-300" colSpan="2">CONDUCTOR</th>
                <th className="p-2 border-r border-slate-800 print:border-gray-300 w-24" rowSpan="2">RESISTENCIA</th>
                <th className="p-2 print:text-black" rowSpan="2">FECHA DE MEDICIÓN</th>
              </tr>
              <tr className="bg-slate-900/30 border-b border-slate-800 font-bold text-slate-500 uppercase print:bg-gray-50 print:text-black print:border-gray-300">
                <th className="p-1 border-r border-slate-800 print:border-gray-350">CALIBRE</th>
                <th className="p-1 border-r border-slate-800 print:border-gray-350">CANTIDAD</th>
                <th className="p-1 border-r border-slate-800 print:border-gray-350">CONFIGURACIÓN</th>
                <th className="p-1 border-r border-slate-800 print:border-gray-350">CALIBRE</th>
                <th className="p-1 border-r border-slate-800 print:border-gray-350">TIPO SOLD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 print:divide-gray-300">
              <tr className="print:text-black">
                <td className="p-3 font-bold bg-slate-900/40 border-r border-slate-800 print:bg-gray-50 print:border-gray-300 text-slate-350 print:text-black">
                  MEDIDA
                </td>
                <td className="p-2 border-r border-slate-800 print:border-gray-300">
                  {isEditing ? (
                    <input
                      type="text"
                      value={dt.spt?.barillaCalibre || ''}
                      onChange={(e) => handleSptChange('barillaCalibre', e.target.value)}
                      className="w-full text-center bg-slate-900 border border-slate-700 rounded text-slate-100 text-xs p-1 focus:outline-none focus:border-violet-500"
                    />
                  ) : (
                    dt.spt?.barillaCalibre || '—'
                  )}
                </td>
                <td className="p-2 border-r border-slate-800 print:border-gray-300">
                  {isEditing ? (
                    <input
                      type="text"
                      value={dt.spt?.barillaCantidad || ''}
                      onChange={(e) => handleSptChange('barillaCantidad', e.target.value)}
                      className="w-full text-center bg-slate-900 border border-slate-700 rounded text-slate-100 text-xs p-1 focus:outline-none focus:border-violet-500"
                    />
                  ) : (
                    dt.spt?.barillaCantidad || '—'
                  )}
                </td>
                <td className="p-2 border-r border-slate-800 print:border-gray-300">
                  {isEditing ? (
                    <input
                      type="text"
                      value={dt.spt?.barillaConfiguracion || ''}
                      onChange={(e) => handleSptChange('barillaConfiguracion', e.target.value)}
                      className="w-full text-center bg-slate-900 border border-slate-700 rounded text-slate-100 text-xs p-1 focus:outline-none focus:border-violet-500"
                    />
                  ) : (
                    dt.spt?.barillaConfiguracion || '—'
                  )}
                </td>
                <td className="p-2 border-r border-slate-800 print:border-gray-300">
                  {isEditing ? (
                    <input
                      type="text"
                      value={dt.spt?.conductorCalibre || ''}
                      onChange={(e) => handleSptChange('conductorCalibre', e.target.value)}
                      className="w-full text-center bg-slate-900 border border-slate-700 rounded text-slate-100 text-xs p-1 focus:outline-none focus:border-violet-500"
                    />
                  ) : (
                    dt.spt?.conductorCalibre || '—'
                  )}
                </td>
                <td className="p-2 border-r border-slate-800 print:border-gray-300">
                  {isEditing ? (
                    <input
                      type="text"
                      value={dt.spt?.conductorTipoSold || ''}
                      onChange={(e) => handleSptChange('conductorTipoSold', e.target.value)}
                      className="w-full text-center bg-slate-900 border border-slate-700 rounded text-slate-100 text-xs p-1 focus:outline-none focus:border-violet-500"
                    />
                  ) : (
                    dt.spt?.conductorTipoSold || '—'
                  )}
                </td>
                <td className="p-2 border-r border-slate-800 print:border-gray-300">
                  {isEditing ? (
                    <input
                      type="text"
                      value={dt.spt?.resistencia || ''}
                      onChange={(e) => handleSptChange('resistencia', e.target.value)}
                      className="w-full text-center bg-slate-900 border border-slate-700 rounded text-slate-100 text-xs p-1 focus:outline-none focus:border-violet-500"
                    />
                  ) : (
                    dt.spt?.resistencia || '—'
                  )}
                </td>
                <td className="p-2">
                  {isEditing ? (
                    <input
                      type="text"
                      value={dt.spt?.fechaMedicion || ''}
                      onChange={(e) => handleSptChange('fechaMedicion', e.target.value)}
                      className="w-full text-center bg-slate-900 border border-slate-700 rounded text-slate-100 text-xs p-1 focus:outline-none focus:border-violet-500"
                    />
                  ) : (
                    dt.spt?.fechaMedicion || '—'
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Caja de Observaciones Generales */}
          <div className="bg-slate-900/60 border-b border-slate-700 p-4 font-mono text-xs text-slate-200 print:bg-white print:text-black print:border-black">
            <span className="font-black uppercase text-slate-400 block mb-1 print:text-black">OBSERVACIONES:</span>
            {isEditing ? (
              <textarea
                value={observacionesGenerales}
                onChange={(e) => setObservacionesGenerales(e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 text-xs resize-none focus:outline-none focus:border-violet-500"
              />
            ) : (
              <p className="leading-relaxed font-medium text-slate-350 print:text-black">
                {observacionesGenerales || 'Sin observaciones registradas.'}
              </p>
            )}
          </div>

          {/* Leyenda */}
          <div className="p-4 bg-slate-950 text-[10px] text-slate-500 font-mono leading-relaxed border-b border-slate-700 print:bg-white print:text-black print:border-black print:text-[8px]">
            <p><strong>LEYENDA:</strong> <strong>BB</strong> BARRA EN BUEN ESTADO, <strong>BD</strong> BARRA DEFECTUOSA, <strong>SB</strong> SIN BARRA, <strong>CB</strong> CONDUCTOR EN BUEN ESTADO, <strong>CS</strong> CONDUCTOR SULFATADO, <strong>SC</strong> SIN CONDUCTOR, <strong>IB</strong> INTERRUPTOR EN BUEN ESTADO, <strong>ID</strong> INTERRUPTOR DEFECTUOSO, <strong>IS</strong> INTERRUPTOR SULFATADO, <strong>AT</strong> ALTA TEMPERATURA, <strong>CTB</strong> COPA TERMINAL BUEN ESTADO, <strong>CTD</strong> COPA TERMINAL DEFECTUOSA, <strong>SCT</strong> SIN COPA, <strong>FB</strong> FUSIBLE EN BUEN ESTADO, <strong>FD</strong> FUSIBLE DEFECTUOSO, <strong>SF</strong> SIN FUSIBLE, <strong>PB</strong> PARARRAYO EN BUEN ESTADO, <strong>PD</strong> PARARRAYO DEFECTUOSO, <strong>SP</strong> SIN PARARRAYO. <strong>SE</strong> SOLDADURA EXOTÉRMICA, <strong>KS</strong> CONECTORES EN BARRA DE TIERRA.</p>
          </div>

          {/* Imagen del Transformador (Parte inferior del cuadro) */}
          <div className="p-4 bg-slate-900/30 text-center print:bg-white">
            {fotoBlob || fotoSrc || previewUrl ? (
              <div className="max-w-md mx-auto rounded-xl overflow-hidden border border-slate-700 shadow-lg print:border-black">
                <SafeImage 
                  blob={fotoBlob} 
                  src={previewUrl || fotoSrc} 
                  alt="Transformador Eléctrico" 
                  className="w-full object-cover" 
                  style={{ maxHeight: `${dt.fotoScale || 280}px` }}
                />
              </div>
            ) : (
              <div className="p-6 border-2 border-dashed border-slate-800 rounded-xl text-center space-y-2 no-print">
                <Camera className="w-8 h-8 text-slate-600 mx-auto" />
                <span className="text-xs text-slate-500 font-mono block">Sin fotografía adjunta del transformador</span>
                <label className="inline-block px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-violet-400 text-xs font-bold rounded-lg cursor-pointer transition-colors">
                  Adjuntar Foto
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              </div>
            )}

            {/* Slider de ajuste de tamaño (solo en pantalla si hay imagen) */}
            {(fotoBlob || fotoSrc || previewUrl) && (
              <div className="no-print mt-3 max-w-xs mx-auto space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                  <span>Ajustar tamaño en PDF</span>
                  <span className="text-violet-400 font-mono">{dt.fotoScale || 280}px</span>
                </div>
                <input
                  type="range"
                  min="120"
                  max="380"
                  value={dt.fotoScale || 280}
                  onChange={(e) => handleDtChange('fotoScale', parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
                />
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. PLANTILLA: BANCO DE CONDENSADORES (COMPENSACIÓN DE POTENCIA REACTIVA) */}
      {/* ========================================================================= */}
      {tipoElemento === 'BANCO_CONDENSADOR' && (
        <div className="bg-slate-950 border-2 border-slate-700 rounded-xl overflow-hidden shadow-2xl print:border-black print:bg-white print:text-black">
          
          {/* Título Principal */}
          <div className="bg-slate-900 border-b-2 border-slate-700 p-3.5 text-center print:bg-gray-200 print:border-black">
            <h2 className="text-base md:text-lg font-black tracking-wide text-slate-100 uppercase font-mono print:text-black">
              {isEditing ? (
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="bg-slate-950 border border-slate-600 rounded px-3 py-1 text-center w-full focus:outline-none focus:border-amber-500 text-slate-100 font-bold"
                />
              ) : (
                `FICHA TÉCNICA - BANCO DE COMPENSACIÓN DE POTENCIA REACTIVA: ${nombre || 'BC-1'}`
              )}
            </h2>
          </div>

          <div className="p-4 md:p-6 space-y-6">

            {/* SECCIÓN 1: DATOS GENERALES */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-amber-500 uppercase tracking-wider border-b border-slate-900 pb-1.5 print:text-slate-800 print:border-gray-200">
                1. Datos Generales
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block font-semibold mb-1 print:text-slate-600">Código / Tag:</span>
                  <span className="font-mono text-slate-300 font-bold bg-slate-900 border border-slate-850 px-2.5 py-1.5 rounded-lg block print:bg-white print:border-gray-300 print:text-slate-900">
                    {elementoData.id}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block font-semibold mb-1 print:text-slate-600">Ubicación / Planta:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={ubicacion}
                      onChange={(e) => setUbicacion(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  ) : (
                    <span className="text-slate-200 font-medium px-2.5 py-1.5 bg-slate-900/50 rounded-lg border border-slate-900 block truncate print:bg-white print:border-gray-200 print:text-slate-800">
                      {ubicacion || '—'}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block font-semibold mb-1 print:text-slate-600">Alimentador:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={dt.alimentador || ''}
                      onChange={(e) => handleDtChange('alimentador', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  ) : (
                    <span className="text-slate-200 font-medium px-2.5 py-1.5 bg-slate-900/50 rounded-lg border border-slate-900 block truncate print:bg-white print:border-gray-200 print:text-slate-800">
                      {dt.alimentador || '—'}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block font-semibold mb-1 print:text-slate-600">Calibre del Conductor:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={dt.calibreConductor || ''}
                      onChange={(e) => handleDtChange('calibreConductor', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  ) : (
                    <span className="text-slate-200 font-medium px-2.5 py-1.5 bg-slate-900/50 rounded-lg border border-slate-900 block truncate print:bg-white print:border-gray-200 print:text-slate-800">
                      {dt.calibreConductor || '—'}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block font-semibold mb-1 print:text-slate-600">Marca / Modelo:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={dt.marca || ''}
                      onChange={(e) => handleDtChange('marca', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  ) : (
                    <span className="text-slate-200 font-medium px-2.5 py-1.5 bg-slate-950/50 rounded-lg border border-slate-900 block truncate print:bg-white print:border-gray-200 print:text-slate-800">
                      {dt.marca || '—'}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block font-semibold mb-1 print:text-slate-600">Fabricante:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={dt.fabricante || ''}
                      onChange={(e) => handleDtChange('fabricante', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  ) : (
                    <span className="text-slate-200 font-medium px-2.5 py-1.5 bg-slate-900/50 rounded-lg border border-slate-900 block truncate print:bg-white print:border-gray-200 print:text-slate-800">
                      {dt.fabricante || '—'}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block font-semibold mb-1 print:text-slate-600">Año de Fabricación:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={dt.anioFabricacion || ''}
                      onChange={(e) => handleDtChange('anioFabricacion', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  ) : (
                    <span className="text-slate-200 font-medium px-2.5 py-1.5 bg-slate-900/50 rounded-lg border border-slate-900 block truncate print:bg-white print:border-gray-200 print:text-slate-800">
                      {dt.anioFabricacion || '—'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: PARÁMETROS ELÉCTRICOS NOMINALES DE LA RED */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-amber-500 uppercase tracking-wider border-b border-slate-900 pb-1.5 print:text-slate-800 print:border-gray-200">
                2. Parámetros Eléctricos Nominales de la Red
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block font-semibold mb-1 print:text-slate-600">Tensión Nominal (V / kV):</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={dt.tensionNominal || ''}
                      onChange={(e) => handleDtChange('tensionNominal', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-amber-500"
                    />
                  ) : (
                    <span className="text-slate-200 font-bold px-2.5 py-1.5 bg-slate-900/50 rounded-lg block print:text-black print:bg-white">{dt.tensionNominal || '—'}</span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block font-semibold mb-1 print:text-slate-600">Tensión Registrada (V / kV):</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={dt.tensionRegistrada || ''}
                      onChange={(e) => handleDtChange('tensionRegistrada', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-amber-500"
                    />
                  ) : (
                    <span className="text-slate-200 font-bold px-2.5 py-1.5 bg-slate-900/50 rounded-lg block print:text-black print:bg-white">{dt.tensionRegistrada || '—'}</span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block font-semibold mb-1 print:text-slate-600">Frecuencia:</span>
                  {isEditing ? (
                    <select
                      value={dt.frecuencia || '60 Hz'}
                      onChange={(e) => handleDtChange('frecuencia', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-amber-500 h-9"
                    >
                      <option value="50 Hz">50 Hz</option>
                      <option value="60 Hz">60 Hz</option>
                    </select>
                  ) : (
                    <span className="text-slate-200 px-2.5 py-1.5 bg-slate-900/50 rounded-lg block print:text-black print:bg-white">{dt.frecuencia || '—'}</span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block font-semibold mb-1 print:text-slate-600">Potencia Reactiva Total (kVAR):</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={dt.potenciaReactivaTotal || ''}
                      onChange={(e) => handleDtChange('potenciaReactivaTotal', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-amber-500"
                    />
                  ) : (
                    <span className="text-slate-200 font-bold px-2.5 py-1.5 bg-slate-900/50 rounded-lg block print:text-black print:bg-white">{dt.potenciaReactivaTotal || '—'}</span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block font-semibold mb-1 print:text-slate-600">Corriente Nominal Total (A):</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={dt.corrienteNominalTotal || ''}
                      onChange={(e) => handleDtChange('corrienteNominalTotal', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-amber-500"
                    />
                  ) : (
                    <span className="text-slate-200 font-bold px-2.5 py-1.5 bg-slate-900/50 rounded-lg block print:text-black print:bg-white">{dt.corrienteNominalTotal || '—'}</span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block font-semibold mb-1 print:text-slate-600">Nro. Fases:</span>
                  {isEditing ? (
                    <select
                      value={dt.numFases || 'Trifásico'}
                      onChange={(e) => handleDtChange('numFases', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-amber-500 h-9"
                    >
                      <option value="Monofásico">Monofásico</option>
                      <option value="Bifásico">Bifásico</option>
                      <option value="Trifásico">Trifásico</option>
                    </select>
                  ) : (
                    <span className="text-slate-200 px-2.5 py-1.5 bg-slate-900/50 rounded-lg block print:text-black print:bg-white">{dt.numFases || '—'}</span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block font-semibold mb-1 print:text-slate-600">Conexión:</span>
                  {isEditing ? (
                    <select
                      value={dt.conexion || 'Estrella'}
                      onChange={(e) => handleDtChange('conexion', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-amber-500 h-9"
                    >
                      <option value="Delta">Delta</option>
                      <option value="Estrella">Estrella</option>
                    </select>
                  ) : (
                    <span className="text-slate-200 px-2.5 py-1.5 bg-slate-900/50 rounded-lg block print:text-black print:bg-white">{dt.conexion || '—'}</span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block font-semibold mb-1 print:text-slate-600">Nivel de Aislamiento BIL (kV):</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={dt.nivelAislamientoBIL || ''}
                      onChange={(e) => handleDtChange('nivelAislamientoBIL', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-amber-500"
                    />
                  ) : (
                    <span className="text-slate-200 px-2.5 py-1.5 bg-slate-900/50 rounded-lg block print:text-black print:bg-white">{dt.nivelAislamientoBIL || '—'}</span>
                  )}
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: CONFIGURACIÓN Y PASOS */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-amber-500 uppercase tracking-wider border-b border-slate-900 pb-1.5 print:text-slate-800 print:border-gray-200">
                3. Configuración y Pasos de Compensación
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block font-semibold mb-1 print:text-slate-600">Tipo de Compensación:</span>
                  {isEditing ? (
                    <select
                      value={dt.tipoCompensacion || 'Automática (Pasos)'}
                      onChange={(e) => handleDtChange('tipoCompensacion', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-amber-500 h-9"
                    >
                      <option value="Fija">Fija</option>
                      <option value="Automática (Pasos)">Automática (Pasos)</option>
                      <option value="Dinámica (Tiristores/SVG)">Dinámica (Tiristores/SVG)</option>
                    </select>
                  ) : (
                    <span className="text-slate-200 font-bold px-2.5 py-1.5 bg-slate-900/50 rounded-lg block print:text-black print:bg-white">{dt.tipoCompensacion || '—'}</span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block font-semibold mb-1 print:text-slate-600">Nro. Total de Pasos:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={dt.numPasos || ''}
                      onChange={(e) => handleDtChange('numPasos', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-amber-500"
                    />
                  ) : (
                    <span className="text-slate-200 px-2.5 py-1.5 bg-slate-900/50 rounded-lg block print:text-black print:bg-white">{dt.numPasos || '—'}</span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block font-semibold mb-1 print:text-slate-600">Secuencia de Pasos (kVAR):</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={dt.secuenciaPasosKvar || ''}
                      onChange={(e) => handleDtChange('secuenciaPasosKvar', e.target.value)}
                      placeholder="Ej. 50+50+100+100 kVAR"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-amber-500"
                    />
                  ) : (
                    <span className="text-slate-200 px-2.5 py-1.5 bg-slate-900/50 rounded-lg block print:text-black print:bg-white font-mono">{dt.secuenciaPasosKvar || '—'}</span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block font-semibold mb-1 print:text-slate-600">Tipo de Conmutación:</span>
                  {isEditing ? (
                    <select
                      value={dt.tipoConmutacion || 'Contactores dedicados'}
                      onChange={(e) => handleDtChange('tipoConmutacion', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-amber-500 h-9"
                    >
                      <option value="Contactores dedicados">Contactores dedicados</option>
                      <option value="Interruptores estáticos">Interruptores estáticos</option>
                    </select>
                  ) : (
                    <span className="text-slate-200 px-2.5 py-1.5 bg-slate-900/50 rounded-lg block print:text-black print:bg-white">{dt.tipoConmutacion || '—'}</span>
                  )}
                </div>
              </div>
            </div>

            {/* SECCIÓN 4: UNIDADES DE CONDENSADORES (MÓDULOS) */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-amber-500 uppercase tracking-wider border-b border-slate-900 pb-1.5 print:text-slate-800 print:border-gray-200">
                4. Unidades de Condensadores (Módulos)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block font-semibold mb-1 print:text-slate-600">Potencia Individual (kVAR):</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={dt.potenciaIndividual || ''}
                      onChange={(e) => handleDtChange('potenciaIndividual', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-amber-500"
                    />
                  ) : (
                    <span className="text-slate-200 px-2.5 py-1.5 bg-slate-900/50 rounded-lg block print:text-black print:bg-white">{dt.potenciaIndividual || '—'}</span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block font-semibold mb-1 print:text-slate-600">Capacitancia (µF):</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={dt.capacitanciaMuf || ''}
                      onChange={(e) => handleDtChange('capacitanciaMuf', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-amber-500"
                    />
                  ) : (
                    <span className="text-slate-200 px-2.5 py-1.5 bg-slate-900/50 rounded-lg block print:text-black print:bg-white">{dt.capacitanciaMuf || '—'}</span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block font-semibold mb-1 print:text-slate-600">Tensión del Condensador (V):</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={dt.tensionCondensador || ''}
                      onChange={(e) => handleDtChange('tensionCondensador', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-amber-500"
                    />
                  ) : (
                    <span className="text-slate-200 px-2.5 py-1.5 bg-slate-900/50 rounded-lg block print:text-black print:bg-white">{dt.tensionCondensador || '—'}</span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block font-semibold mb-1 print:text-slate-600">Tecnología Dieléctrica:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={dt.tecnologiaDielectrica || 'Polipropileno metalizado'}
                      onChange={(e) => handleDtChange('tecnologiaDielectrica', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-amber-500"
                    />
                  ) : (
                    <span className="text-slate-200 px-2.5 py-1.5 bg-slate-900/50 rounded-lg block print:text-black print:bg-white">{dt.tecnologiaDielectrica || '—'}</span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block font-semibold mb-1 print:text-slate-600">Resistencia de Descarga:</span>
                  {isEditing ? (
                    <select
                      value={dt.resistenciaDescarga || 'Sí'}
                      onChange={(e) => handleDtChange('resistenciaDescarga', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-amber-500 h-9"
                    >
                      <option value="Sí">Sí (&lt;50V en &lt;60s)</option>
                      <option value="No">No</option>
                    </select>
                  ) : (
                    <span className="text-slate-200 px-2.5 py-1.5 bg-slate-900/50 rounded-lg block print:text-black print:bg-white">{dt.resistenciaDescarga || '—'}</span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block font-semibold mb-1 print:text-slate-600">Seguridad:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={dt.seguridad || 'Desconectador por sobrepresión'}
                      onChange={(e) => handleDtChange('seguridad', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-amber-500"
                    />
                  ) : (
                    <span className="text-slate-200 px-2.5 py-1.5 bg-slate-900/50 rounded-lg block print:text-black print:bg-white">{dt.seguridad || '—'}</span>
                  )}
                </div>
              </div>
            </div>

            {/* SECCIÓN 5: REACTANCIAS ANTIHARMÓNICAS / FILTROS */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-amber-500 uppercase tracking-wider border-b border-slate-900 pb-1.5 print:text-slate-800 print:border-gray-200">
                5. Reactancias Antiharmónicas / Filtros
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block font-semibold mb-1 print:text-slate-600">Factor de Desintonización (p%):</span>
                  {isEditing ? (
                    <select
                      value={dt.factorDesintonizacion || 'N/A'}
                      onChange={(e) => handleDtChange('factorDesintonizacion', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-amber-500 h-9"
                    >
                      <option value="7% (189 Hz)">7% (189 Hz)</option>
                      <option value="14% (134 Hz)">14% (134 Hz)</option>
                      <option value="N/A">N/A</option>
                    </select>
                  ) : (
                    <span className="text-slate-200 px-2.5 py-1.5 bg-slate-900/50 rounded-lg block print:text-black print:bg-white">{dt.factorDesintonizacion || '—'}</span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block font-semibold mb-1 print:text-slate-600">Tipo de Núcleo:</span>
                  {isEditing ? (
                    <select
                      value={dt.tipoNucleo || 'Núcleo de Hierro con Entrehierro'}
                      onChange={(e) => handleDtChange('tipoNucleo', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-amber-500 h-9"
                    >
                      <option value="Núcleo de Hierro con Entrehierro">Núcleo de Hierro con Entrehierro</option>
                      <option value="Aire">Aire</option>
                    </select>
                  ) : (
                    <span className="text-slate-200 px-2.5 py-1.5 bg-slate-900/50 rounded-lg block print:text-black print:bg-white">{dt.tipoNucleo || '—'}</span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block font-semibold mb-1 print:text-slate-600">Aislamiento Térmico:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={dt.claseAislamientoTermico || 'Clase H (180°C)'}
                      onChange={(e) => handleDtChange('claseAislamientoTermico', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-amber-500"
                    />
                  ) : (
                    <span className="text-slate-200 px-2.5 py-1.5 bg-slate-900/50 rounded-lg block print:text-black print:bg-white">{dt.claseAislamientoTermico || '—'}</span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block font-semibold mb-1 print:text-slate-600">Protección Térmica:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={dt.proteccionTermica || 'Sensor Bimetálico / PT100 integrado'}
                      onChange={(e) => handleDtChange('proteccionTermica', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-amber-500"
                    />
                  ) : (
                    <span className="text-slate-200 px-2.5 py-1.5 bg-slate-900/50 rounded-lg block print:text-black print:bg-white">{dt.proteccionTermica || '—'}</span>
                  )}
                </div>
              </div>
            </div>

            {/* SECCIÓN 6: REGULADOR Y PROTECCIONES */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-amber-500 uppercase tracking-wider border-b border-slate-900 pb-1.5 print:text-slate-800 print:border-gray-200">
                6. Regulador y Protecciones
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
                <div className="lg:col-span-2">
                  <span className="text-slate-500 block font-semibold mb-1 print:text-slate-600">Regulador de FP (Marca / Modelo / Rango):</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={dt.reguladorMarcaModelo || ''}
                      onChange={(e) => handleDtChange('reguladorMarcaModelo', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-amber-500"
                    />
                  ) : (
                    <span className="text-slate-200 px-2.5 py-1.5 bg-slate-900/50 rounded-lg block print:text-black print:bg-white">{dt.reguladorMarcaModelo || '—'}</span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block font-semibold mb-1 print:text-slate-600">Relación de TC Requerida:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={dt.relacionTc || ''}
                      onChange={(e) => handleDtChange('relacionTc', e.target.value)}
                      placeholder="Ej. 1600/5A"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-amber-500"
                    />
                  ) : (
                    <span className="text-slate-200 px-2.5 py-1.5 bg-slate-900/50 rounded-lg block print:text-black print:bg-white font-mono">{dt.relacionTc || '—'}</span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block font-semibold mb-1 print:text-slate-600">Puerto de Comunicación:</span>
                  {isEditing ? (
                    <select
                      value={dt.puertoComunicacion || 'RS-485 (Modbus RTU)'}
                      onChange={(e) => handleDtChange('puertoComunicacion', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-amber-500 h-9"
                    >
                      <option value="RS-485 (Modbus RTU)">RS-485 (Modbus RTU)</option>
                      <option value="Ethernet (Modbus TCP)">Ethernet (Modbus TCP)</option>
                      <option value="Ninguno">Ninguno</option>
                    </select>
                  ) : (
                    <span className="text-slate-200 px-2.5 py-1.5 bg-slate-900/50 rounded-lg block print:text-black print:bg-white">{dt.puertoComunicacion || '—'}</span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block font-semibold mb-1 print:text-slate-600">Interruptor Principal (A):</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={dt.interruptorPrincipalAmp || ''}
                      onChange={(e) => handleDtChange('interruptorPrincipalAmp', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-amber-500"
                    />
                  ) : (
                    <span className="text-slate-200 font-bold px-2.5 py-1.5 bg-slate-900/50 rounded-lg block print:text-black print:bg-white">{dt.interruptorPrincipalAmp ? dt.interruptorPrincipalAmp + ' A' : '—'}</span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block font-semibold mb-1 print:text-slate-600">Protección de Pasos:</span>
                  {isEditing ? (
                    <select
                      value={dt.proteccionPasos || 'Fusibles'}
                      onChange={(e) => handleDtChange('proteccionPasos', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-amber-500 h-9"
                    >
                      <option value="Fusibles">Fusibles</option>
                      <option value="Breakers">Breakers</option>
                    </select>
                  ) : (
                    <span className="text-slate-200 px-2.5 py-1.5 bg-slate-900/50 rounded-lg block print:text-black print:bg-white">{dt.proteccionPasos || '—'}</span>
                  )}
                </div>
              </div>
            </div>

            {/* SECCIÓN 7: GABINETE Y ENTORNO DE OPERACIÓN */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-amber-500 uppercase tracking-wider border-b border-slate-900 pb-1.5 print:text-slate-800 print:border-gray-200">
                7. Gabinete y Entorno de Operación
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block font-semibold mb-1 print:text-slate-600">Grado de Protección Envolvente:</span>
                  {isEditing ? (
                    <select
                      value={dt.gradoProteccionEnvolvente || 'IP54'}
                      onChange={(e) => handleDtChange('gradoProteccionEnvolvente', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-amber-500 h-9"
                    >
                      <option value="IP41">IP41</option>
                      <option value="IP54">IP54</option>
                      <option value="NEMA 3R">NEMA 3R</option>
                    </select>
                  ) : (
                    <span className="text-slate-200 px-2.5 py-1.5 bg-slate-900/50 rounded-lg block print:text-black print:bg-white">{dt.gradoProteccionEnvolvente || '—'}</span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block font-semibold mb-1 print:text-slate-600">Dimensiones (Al x An x Pr):</span>
                  {isEditing ? (
                    <div className="flex gap-1.5 items-center">
                      <input
                        type="text"
                        value={dt.dimensionesAlto || ''}
                        onChange={(e) => handleDtChange('dimensionesAlto', e.target.value)}
                        placeholder="Al"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-100 focus:border-amber-500 text-center"
                      />
                      <span>x</span>
                      <input
                        type="text"
                        value={dt.dimensionesAncho || ''}
                        onChange={(e) => handleDtChange('dimensionesAncho', e.target.value)}
                        placeholder="An"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-amber-500 text-center"
                      />
                      <span>x</span>
                      <input
                        type="text"
                        value={dt.dimensionesProf || ''}
                        onChange={(e) => handleDtChange('dimensionesProf', e.target.value)}
                        placeholder="Pr"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-amber-500 text-center"
                      />
                      <span className="text-[10px]">mm</span>
                    </div>
                  ) : (
                    <span className="text-slate-200 px-2.5 py-1.5 bg-slate-900/50 rounded-lg block print:text-black print:bg-white font-mono">
                      {dt.dimensionesAlto || '—'} x {dt.dimensionesAncho || '—'} x {dt.dimensionesProf || '—'} mm
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block font-semibold mb-1 print:text-slate-600">Sistema de Enfriamiento:</span>
                  {isEditing ? (
                    <select
                      value={dt.sistemaEnfriamiento || 'Ventilación Forzada'}
                      onChange={(e) => handleDtChange('sistemaEnfriamiento', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-amber-500 h-9"
                    >
                      <option value="Ventilación Natural">Ventilación Natural</option>
                      <option value="Ventilación Forzada">Ventilación Forzada</option>
                      <option value="Extractores y Filtros">Extractores y Filtros</option>
                    </select>
                  ) : (
                    <span className="text-slate-200 px-2.5 py-1.5 bg-slate-900/50 rounded-lg block print:text-black print:bg-white">{dt.sistemaEnfriamiento || '—'}</span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block font-semibold mb-1 print:text-slate-600">Temperatura / Humedad:</span>
                  {isEditing ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={dt.temperaturaC || ''}
                        onChange={(e) => handleDtChange('temperaturaC', e.target.value)}
                        placeholder="°C"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-amber-500 text-center"
                      />
                      <input
                        type="text"
                        value={dt.humedadPct || ''}
                        onChange={(e) => handleDtChange('humedadPct', e.target.value)}
                        placeholder="%"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-amber-500 text-center"
                      />
                    </div>
                  ) : (
                    <span className="text-slate-200 px-2.5 py-1.5 bg-slate-900/50 rounded-lg block print:text-black print:bg-white font-mono">
                      {dt.temperaturaC ? dt.temperaturaC + ' °C' : '—'} / {dt.humedadPct ? dt.humedadPct + ' %' : '—'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* SECCIÓN DE OBSERVACIONES PARTICULARES */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide print:text-slate-700">Observaciones Generales y Recomendaciones</span>
              {isEditing ? (
                <textarea
                  value={observacionesGenerales}
                  onChange={(e) => setObservacionesGenerales(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-sans resize-none"
                  placeholder="Escriba las condiciones del banco de compensación, problemas en celdas, desbalance en corriente de condensadores, estado de contactores..."
                />
              ) : (
                <p className="text-xs leading-relaxed text-slate-300 font-sans italic bg-slate-900/40 p-4 rounded-xl border border-slate-900 print:text-black print:bg-white print:border-gray-300">
                  {observacionesGenerales || 'No se han registrado observaciones específicas para este banco de condensadores.'}
                </p>
              )}
            </div>

            {/* SECCIÓN FOTOGRÁFICA */}
            <div className="pt-4 border-t border-slate-900/60 flex flex-col items-center gap-4">
              {(fotoBlob || fotoSrc || previewUrl) ? (
                <div className="relative group rounded-xl overflow-hidden border border-slate-800 shadow-lg max-w-sm">
                  <SafeImage
                    blob={fotoBlob}
                    src={fotoSrc}
                    alt={nombre}
                    className="object-contain w-full rounded-xl"
                    style={{ maxHeight: `${dt.fotoScale || 280}px` }}
                  />
                </div>
              ) : (
                <div className="p-6 border-2 border-dashed border-slate-800 rounded-xl text-center space-y-2 no-print">
                  <Camera className="w-8 h-8 text-slate-600 mx-auto" />
                  <span className="text-xs text-slate-500 font-mono block">Sin fotografía adjunta del banco de condensadores</span>
                  <label className="inline-block px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold rounded-lg cursor-pointer transition-colors">
                    Adjuntar Foto
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                </div>
              )}

              {/* Ajuste de escala fotográfica */}
              {(fotoBlob || fotoSrc || previewUrl) && (
                <div className="no-print mt-3 max-w-xs mx-auto space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                    <span>Ajustar tamaño en PDF</span>
                    <span className="text-cyan-400 font-mono">{dt.fotoScale || 280}px</span>
                  </div>
                  <input
                    type="range"
                    min="120"
                    max="380"
                    value={dt.fotoScale || 280}
                    onChange={(e) => handleDtChange('fotoScale', parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* Cierre / Firmas */}
      <div className="mt-8 bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 space-y-4 print:bg-slate-50 print:border-gray-200 print:mt-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-900 pb-2.5 print:text-slate-700 print:border-gray-200">
          Firma y Cierre de Inspección
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Firma Inspector */}
          <div className="flex flex-col gap-1.5 items-center text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide print:text-slate-600">Firma del Inspector</span>
            {isEditing ? (
              <>
                <input
                  type="text"
                  value={dt.firmaInspector || ''}
                  onChange={(e) => handleDtChange('firmaInspector', e.target.value)}
                  className="w-full max-w-xs bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all text-center no-print"
                  placeholder="Nombre del Inspector"
                />
                <span className="hidden print:block text-xs font-bold text-slate-900 mt-1 h-6">
                  {dt.firmaInspector || '___________________________'}
                </span>
              </>
            ) : (
              <span className="text-xs text-slate-100 font-bold print:text-slate-900">{dt.firmaInspector || '—'}</span>
            )}
            <div className="hidden print:block w-48 border-b border-gray-300 mt-6 h-1"></div>
          </div>

          {/* Firma / Sello de la Empresa */}
          <div className="flex flex-col gap-1.5 items-center text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide print:text-slate-600">Firma / Sello de la Empresa</span>
            {isEditing ? (
              <>
                <input
                  type="text"
                  value={dt.firmaSupervisor || ''}
                  onChange={(e) => handleDtChange('firmaSupervisor', e.target.value)}
                  className="w-full max-w-xs bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all text-center no-print"
                  placeholder="Nombre / Sello de la Empresa"
                />
                <span className="hidden print:block text-xs font-bold text-slate-900 mt-1 h-6">
                  {dt.firmaSupervisor || '___________________________'}
                </span>
              </>
            ) : (
              <span className="text-xs text-slate-100 font-bold print:text-slate-900">{dt.firmaSupervisor || '—'}</span>
            )}
            <div className="hidden print:block w-48 border-b border-gray-300 mt-6 h-1"></div>
          </div>
        </div>
      </div>

      <ModalEdicionCircuito
        isOpen={modalJerarquiaOpen}
        onClose={() => setModalJerarquiaOpen(false)}
        circuitData={circuitDataWizard}
        modo={wizardModo}
        tipoOrigen={tipoElemento}
        elementosCreados={allFeeders}
        onSave={(idSalida, updated) => {
          const isEntradaOrPrimaria = wizardModo === 'ENTRADA' || wizardModo === 'PRIMARIA' || idSalida.includes('PRIMARIA');

          let newAlimentadoPor = alimentadoPor;
          if (isEntradaOrPrimaria && updated.equipo) {
            newAlimentadoPor = updated.equipo;
            setAlimentadoPor(updated.equipo);
          }

          let newDt = { ...dt };

          // 1. Transformador Acometidas y tensiones
          if (tipoElemento === 'TRANSFORMADOR') {
            const seccionKey = isEntradaOrPrimaria ? 'primaria' : 'secundaria';
            const prevAc = dt.acometidas?.[seccionKey] || {};

            newDt = {
              ...newDt,
              acometidas: {
                ...(newDt.acometidas || {}),
                [seccionKey]: {
                  ...prevAc,
                  calibre: updated.conductor || prevAc.calibre || '',
                  fusible: updated.detallesTecnicos?.fusibleMT || prevAc.fusible || '',
                  pararrayo: updated.detallesTecnicos?.pararrayos || prevAc.pararrayo || '',
                  observaciones: updated.equipo || prevAc.observaciones || '',
                  ...(isEntradaOrPrimaria && updated.equipo?.includes('POSTE') ? { aerea: true } : {})
                }
              }
            };

            if (updated.detallesTecnicos?.nivelMT) {
              newDt.tensionPrimaria = updated.detallesTecnicos.nivelMT;
              newDt.voltajePrimario = updated.detallesTecnicos.nivelMT;
            }
            if (updated.detallesTecnicos?.tensionSecundaria) {
              newDt.tensionSecundaria = updated.detallesTecnicos.tensionSecundaria;
              newDt.voltajeSecundario = updated.detallesTecnicos.tensionSecundaria;
            }
          }

          // 2. Generador / Planta Eléctrica
          if (tipoElemento === 'GENERADOR') {
            if (updated.breaker?.amp) newDt.amperaje = updated.breaker.amp;
            if (updated.detallesTecnicos?.potenciaKvaKw) newDt.potenciaKva = updated.detallesTecnicos.potenciaKvaKw;
          }

          // 3. Transfer (ATS)
          if (tipoElemento === 'TRANSFER') {
            if (idSalida.includes('ATS_GEN1')) {
              newDt.alimentacionGenerador1 = updated.conductor || updated.equipo || newDt.alimentacionGenerador1;
            } else if (idSalida.includes('ATS_GEN2')) {
              newDt.alimentacionGenerador2 = updated.conductor || updated.equipo || newDt.alimentacionGenerador2;
            } else if (idSalida.includes('ATS_CARGA')) {
              newDt.carga = updated.conductor || updated.equipo || newDt.carga;
            }
          }

          // Merge additional technical details
          if (updated.detallesTecnicos) {
            newDt = { ...newDt, ...updated.detallesTecnicos };
          }

          setDt(newDt);

          // Persistir inmediatamente en el Store
          if (onUpdate) {
            onUpdate({
              ...elementoData,
              alimentadoPor: newAlimentadoPor,
              datosTecnicos: newDt
            });
          }

          // Elemento provisional pendiente
          if (updated.tipoDestino === 'SUB_TABLERO_PENDIENTE' && elementoData?.proyectoId) {
            crearElementoProvisional(elementoData.proyectoId, {
              nombre: updated.equipo,
              tipoElemento: 'TABLERO',
              circuitoOrigen: idSalida
            });
          }
        }}
      />

    </div>
  );
}
