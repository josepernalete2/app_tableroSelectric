import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  RefreshCw, 
  Save, 
  Edit3, 
  Printer, 
  Camera, 
  CheckCircle2,
  Sliders,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { exportElementoToExcel } from '../utils/excelExport';

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

export default function FichaTecnicaComponent({ elementoData, onUpdate }) {
  if (!elementoData) {
    return <div className="text-center p-8 text-slate-400 font-sans">No hay datos del elemento seleccionados.</div>;
  }

  const [isEditing, setIsEditing] = useState(false);

  // Campos principales
  const [nombre, setNombre] = useState(elementoData.nombre || '');
  const [ubicacion, setUbicacion] = useState(elementoData.ubicacion || '');
  const [alimentadoPor, setAlimentadoPor] = useState(elementoData.alimentadoPor || '');
  const [observacionesGenerales, setObservacionesGenerales] = useState(elementoData.observacionesGenerales || '');
  const [fotoBlob, setFotoBlob] = useState(elementoData.fotoBlob || null);
  const [fotoSrc, setFotoSrc] = useState(elementoData.foto || null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // datosTecnicos JSON
  const [dt, setDt] = useState(elementoData.datosTecnicos || {});

  // Restringir a las 3 opciones permitidas: TABLERO, TRANSFER, GENERADOR
  const tipoElemento = elementoData.tipoElemento || 'TABLERO';

  const handleDtChange = (key, value) => {
    setDt((prev) => ({ ...prev, [key]: value }));
  };

  const handleNestedDtChange = (parentKey, key, value) => {
    setDt((prev) => ({
      ...prev,
      [parentKey]: {
        ...(prev[parentKey] || {}),
        [key]: value
      }
    }));
  };

  const handleImageChange = (e) => {
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

  const handlePrint = () => {
    window.print();
  };

  const renderBadge = () => {
    switch (tipoElemento) {
      case 'GENERADOR':
        return <span className="px-3 py-1 bg-amber-950/90 text-amber-400 border border-amber-800/40 rounded-full text-xs font-bold font-mono">⚡ GENERADOR DE EMERGENCIA</span>;
      case 'TRANSFER':
        return <span className="px-3 py-1 bg-emerald-950/90 text-emerald-400 border border-emerald-800/40 rounded-full text-xs font-bold font-mono">🔄 TRANSFERENCIA (ATS / MTS)</span>;
      case 'TABLERO':
      default:
        return <span className="px-3 py-1 bg-sky-950/90 text-sky-400 border border-sky-800/40 rounded-full text-xs font-bold font-mono">⚡ PANEL ELÉCTRICO / TABLERO</span>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in font-sans pb-12 print:p-0 print:m-0">
      
      {/* Botones de control superior (Ocultos en impresión) */}
      <div className="flex justify-between items-center no-print">
        <div className="flex items-center gap-2">
          {renderBadge()}
          <span className="text-xs text-slate-500 font-mono">ID: {elementoData.id}</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => exportElementoToExcel(elementoData, elementoData.nombreEmpresa || '')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-2 rounded-lg flex items-center gap-2 text-xs transition-all cursor-pointer shadow-sm"
            title="Exportar esta plantilla a Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" /> Exportar Excel
          </button>

          <button
            onClick={handlePrint}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3.5 py-2 rounded-lg flex items-center gap-2 text-xs transition-all cursor-pointer shadow-sm"
            title="Guardar como PDF o Imprimir esta Plantilla Individual"
          >
            <Printer className="w-4 h-4" /> Guardar PDF
          </button>

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
          <div className="border-b border-slate-700 p-3 bg-slate-900/40 font-mono text-xs text-slate-100 print:bg-white print:text-black print:border-black">
            <span className="font-bold uppercase text-slate-400 print:text-black mr-2">TABLERO ALIMENTADO POR:</span>
            {isEditing ? (
              <input
                type="text"
                value={alimentadoPor}
                onChange={(e) => setAlimentadoPor(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 w-3/4"
              />
            ) : (
              <span className="font-semibold">{alimentadoPor || 'ATS SOTANO (TRANSFERENCIA AUTOMATICA) transferencia 580'}</span>
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
                <td className="w-1/3 bg-slate-900/90 font-bold p-3 text-slate-300 uppercase border-r border-slate-800 print:bg-gray-100 print:text-black print:border-gray-300">
                  GENERADOR ALIMENTA A:
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
                    alimentadoPor || 'TRANSFERENCIA DOMOSA EN ESTACIONAMIENTO'
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
                <td className="bg-slate-900/90 font-bold p-3 text-slate-300 uppercase border-r border-slate-800 print:bg-gray-100 print:text-black print:border-gray-300">
                  TABLERO ALIMENTADO POR:
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
                    alimentadoPor || 'GENERADOR 580 1 + GENERADOR 580 2'
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
                <td className="p-2.5 bg-slate-900/40 font-bold text-slate-300 border-r border-slate-800 print:bg-gray-50 print:text-black print:border-gray-300">ALIMENTACIÓN GENERADOR 1 / CORPOELEC</td>
                <td className="p-2.5 border-r border-slate-800 text-center font-bold text-slate-100 print:text-black print:border-gray-300">
                  {isEditing ? <input type="text" value={dt.alimentacionGenerador1 || dt.alimentacionCorpoelec || ''} onChange={(e) => handleDtChange('alimentacionGenerador1', e.target.value)} className="w-full text-center bg-slate-900 border border-slate-700 rounded text-slate-100" /> : (dt.alimentacionGenerador1 || dt.alimentacionCorpoelec || '2(3X500)')}
                </td>
                <td className="p-2.5 text-slate-400 print:text-black">-</td>
              </tr>
              <tr>
                <td className="p-2.5 bg-slate-900/40 font-bold text-slate-300 border-r border-slate-800 print:bg-gray-50 print:text-black print:border-gray-300">ALIMENTACIÓN GENERADOR 2 / TRANSF DOMOSA</td>
                <td className="p-2.5 border-r border-slate-800 text-center font-bold text-slate-100 print:text-black print:border-gray-300">
                  {isEditing ? <input type="text" value={dt.alimentacionGenerador2 || dt.alimentacionTransfDomosa || ''} onChange={(e) => handleDtChange('alimentacionGenerador2', e.target.value)} className="w-full text-center bg-slate-900 border border-slate-700 rounded text-slate-100" /> : (dt.alimentacionGenerador2 || dt.alimentacionTransfDomosa || '2(3X500)')}
                </td>
                <td className="p-2.5 text-slate-400 print:text-black">-</td>
              </tr>
              <tr>
                <td className="p-2.5 bg-slate-900/40 font-bold text-slate-300 border-r border-slate-800 print:bg-gray-50 print:text-black print:border-gray-300">CARGA</td>
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
                <SafeImage blob={fotoBlob} src={previewUrl || fotoSrc} alt="Transferencia Automática" className="w-full h-auto max-h-96 object-cover" />
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
          </div>

        </div>
      )}

    </div>
  );
}
