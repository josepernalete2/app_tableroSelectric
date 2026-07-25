import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import TableroComponent from '../components/TableroComponent';
import FichaTecnicaComponent from '../components/FichaTecnicaComponent';
import SubestacionComponent from '../components/SubestacionComponent';
import { 
  ArrowLeft, 
  Printer, 
  BookOpen, 
  FileText, 
  Zap, 
  Building, 
  Award, 
  User, 
  Calendar,
  Layers,
  Cpu,
  ShieldAlert,
  RefreshCw,
  Edit,
  Check
} from 'lucide-react';

export default function InformeCompiladoView() {
  const { companyId, proyectoId } = useParams();
  const navigate = useNavigate();
  const { companies, updateElementoUnifilar, updateSubestacion } = useStore();

  const company = companies.find((c) => c.id === companyId);
  const proyecto = company?.proyectos?.find((p) => p.id === proyectoId);

  // Modo Edición del Informe
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [coverTitle, setCoverTitle] = useState('INFORME TÉCNICO\nDIAGRAMA UNIFILAR');
  const [coverSubtitle, setCoverSubtitle] = useState('Evaluación y Resultados de Inspección de Campo');
  const [introText, setIntroText] = useState('');

  // Sync introText when company and proyecto load
  useEffect(() => {
    if (company && proyecto && !introText) {
      setIntroText(
        `En el presente informe técnico se documenta la inspección y levantamiento del diagrama unifilar del sistema eléctrico de ${company.nombre}, correspondiente al proyecto de ${proyecto.nombre}.\n\nLas actividades de evaluación en campo se enfocaron en auditar la distribución de cargas, calibres de acometidas, protecciones termomagnéticas y sistemas de seguridad como la puesta a tierra de equipos principales y condiciones de obras civiles en subestaciones.\n\nTodos los análisis se realizan siguiendo las directrices técnicas del Código Eléctrico Nacional vigente para garantizar la integridad humana y operativa.`
      );
    }
  }, [company, proyecto, introText]);

  useEffect(() => {
    // Scroll to top on load
    window.scrollTo(0, 0);
  }, []);

  if (!company || !proyecto) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <h2 className="text-lg font-bold">Proyecto o Empresa no encontrado</h2>
        <button 
          onClick={() => navigate(`/empresa/${companyId || ''}`)} 
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs rounded-xl font-bold transition-all"
        >
          Volver
        </button>
      </div>
    );
  }

  const elementos = proyecto.elementosUnifilares || proyecto.tableros || [];
  const subestaciones = proyecto.inspeccionesSubestacion || proyecto.subestaciones || [];

  const transformadores = elementos.filter(e => e.tipoElemento === 'TRANSFORMADOR');
  const generadores = elementos.filter(e => e.tipoElemento === 'GENERADOR');
  const transferencias = elementos.filter(e => e.tipoElemento === 'TRANSFER');
  const tableros = elementos.filter(e => e.tipoElemento === 'TABLERO');
  const otros = elementos.filter(e => e.tipoElemento === 'OTRO' || e.tipoElemento === 'PUESTA_TIERRA');

  // Year for cover page
  const currentYear = new Date().getFullYear();

  // Handle printing
  const handlePrint = () => {
    setIsEditingReport(false);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleUpdateElemento = (elementoId, updatedData) => {
    const { 
      id, nombre, ubicacion, alimentadoPor, foto, fotoBlob, observacionesGenerales, 
      ...datosTecnicos 
    } = updatedData;

    updateElementoUnifilar(proyectoId, elementoId, {
      nombre,
      ubicacion,
      alimentadoPor,
      foto,
      fotoBlob,
      observacionesGenerales,
      datosTecnicos
    });
  };

  const handleUpdateSubestacion = (subestacionId, updatedData) => {
    updateSubestacion(proyectoId, subestacionId, updatedData);
  };

  const handleUpdateElementoObservaciones = (elementoId, obs) => {
    const el = elementos.find(item => item.id === elementoId);
    if (!el) return;
    handleUpdateElemento(elementoId, { ...el, observacionesGenerales: obs });
  };

  const handleUpdateSubestacionObservaciones = (subestacionId, obs) => {
    const sub = subestaciones.find(item => item.id === subestacionId);
    if (!sub) return;
    handleUpdateSubestacion(subestacionId, { ...sub, observacionesGenerales: obs });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      
      {/* Barra de control superior (no-print) */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-md no-print sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/empresa/${companyId}/proyecto/${proyectoId}`)}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer border border-slate-850"
            title="Volver al Proyecto"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider block">
              Generador de Reportes
            </span>
            <h1 className="text-sm font-bold text-slate-100">
              Informe Técnico Compilado: {proyecto.nombre}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsEditingReport(!isEditingReport)}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 text-xs font-bold shadow-md ${
              isEditingReport 
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                : 'bg-slate-800 hover:bg-slate-750 text-slate-100 border border-slate-700'
            }`}
          >
            {isEditingReport ? (
              <>
                <Check className="w-4 h-4 animate-bounce" />
                Guardar / Bloquear Informe
              </>
            ) : (
              <>
                <Edit className="w-4 h-4 text-amber-500" />
                Editar Informe
              </>
            )}
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 rounded-xl transition-all cursor-pointer flex items-center gap-2 text-xs font-black shadow-md"
          >
            <Printer className="w-4 h-4" />
            Imprimir / Guardar PDF
          </button>
        </div>
      </div>

      {/* DOCUMENTO COMPILADO (Diseñado para imprimir a páginas independientes) */}
      <div className="w-full max-w-5xl mx-auto p-4 md:p-8 space-y-12 bg-slate-900/40 md:rounded-3xl border border-slate-900/60 my-6 shadow-2xl print:my-0 print:p-0 print:border-none print:bg-white print:text-black print:shadow-none print:max-w-full">
        
        {/* ================= PORTADA ================= */}
        <div className="min-h-[90vh] flex flex-col justify-between items-center py-16 px-8 text-center bg-slate-950 print:bg-white print:text-black print:min-h-screen page-break-avoid">
          <div className="w-full text-left">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-widest print:text-slate-500">
              Reporte de Ingeniería Eléctrica
            </span>
          </div>
          
          <div className="space-y-6 my-auto w-full max-w-2xl flex flex-col items-center">
            {isEditingReport ? (
              <textarea
                value={coverTitle}
                onChange={(e) => setCoverTitle(e.target.value)}
                rows={2}
                className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white font-black text-center text-3xl uppercase rounded-xl p-3 outline-none"
              />
            ) : (
              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-white print:text-slate-950 font-sans leading-none whitespace-pre-line">
                {coverTitle}
              </h1>
            )}
            
            <div className="w-24 h-1.5 bg-amber-500 mx-auto rounded-full"></div>
            
            {isEditingReport ? (
              <input
                type="text"
                value={coverSubtitle}
                onChange={(e) => setCoverSubtitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-slate-300 text-center text-sm font-medium tracking-wide uppercase rounded-xl p-2 outline-none"
              />
            ) : (
              <p className="text-slate-400 print:text-slate-600 text-sm font-medium tracking-wide uppercase">
                {coverSubtitle}
              </p>
            )}
          </div>

          <div className="space-y-2 border-t border-slate-800 pt-8 w-full print:border-gray-200">
            <h2 className="text-md font-bold text-slate-100 print:text-slate-900">{company.nombre.toUpperCase()}</h2>
            <p className="text-xs font-semibold text-slate-400 print:text-slate-600">PROYECTO: {proyecto.nombre.toUpperCase()}</p>
            <p className="text-xs font-mono text-slate-500 print:text-slate-500">{currentYear}</p>
          </div>
        </div>

        {/* ================= TABLA DE CONTENIDO ================= */}
        <div className="page-break min-h-[90vh] flex flex-col justify-between py-12 px-6 print:min-h-screen">
          <div className="space-y-8">
            <div className="border-b border-slate-800 pb-4 print:border-gray-300">
              <h2 className="text-xl font-bold uppercase tracking-wider text-amber-500 print:text-slate-900">Tabla de Contenido</h2>
            </div>
            
            <div className="space-y-4 font-sans text-sm text-slate-350 print:text-slate-800">
              <div className="flex justify-between items-end gap-2">
                <span className="font-bold text-slate-200 print:text-slate-950">1. INTRODUCCIÓN</span>
                <span className="border-b border-dashed border-slate-800 flex-1 h-1 min-w-[20px] print:border-gray-300"></span>
                <span className="font-mono">Pág. 3</span>
              </div>
              <div className="flex justify-between items-end gap-2">
                <span className="font-bold text-slate-200 print:text-slate-950">2. SISTEMA DE ALIMENTACIÓN</span>
                <span className="border-b border-dashed border-slate-800 flex-1 h-1 min-w-[20px] print:border-gray-300"></span>
                <span className="font-mono">Pág. 3</span>
              </div>
              <div className="flex justify-between items-end gap-2 pl-4">
                <span>Transformadores</span>
                <span className="border-b border-dashed border-slate-800 flex-1 h-1 min-w-[20px] print:border-gray-300"></span>
                <span className="font-mono">Pág. 3</span>
              </div>
              <div className="flex justify-between items-end gap-2 pl-4">
                <span>Generadores</span>
                <span className="border-b border-dashed border-slate-800 flex-1 h-1 min-w-[20px] print:border-gray-300"></span>
                <span className="font-mono">Pág. 3</span>
              </div>
              <div className="flex justify-between items-end gap-2 pl-4">
                <span>Tableros Eléctricos</span>
                <span className="border-b border-dashed border-slate-800 flex-1 h-1 min-w-[20px] print:border-gray-300"></span>
                <span className="font-mono">Pág. 3</span>
              </div>
              <div className="flex justify-between items-end gap-2">
                <span className="font-bold text-slate-200 print:text-slate-950">3. JERARQUÍA DEL DIAGRAMA UNIFILAR</span>
                <span className="border-b border-dashed border-slate-800 flex-1 h-1 min-w-[20px] print:border-gray-300"></span>
                <span className="font-mono">Pág. 4</span>
              </div>
              
              <div className="flex justify-between items-end gap-2">
                <span className="font-bold text-slate-200 print:text-slate-950">4. RESULTADOS DE LAS INSPECCIONES TÉCNICAS</span>
                <span className="border-b border-dashed border-slate-800 flex-1 h-1 min-w-[20px] print:border-gray-300"></span>
                <span className="font-mono">Pág. 5</span>
              </div>
              {elementos.map((item, idx) => (
                <div key={item.id} className="flex justify-between items-end gap-2 pl-4 text-xs">
                  <span className="truncate">{item.nombre} ({item.tipoElemento})</span>
                  <span className="border-b border-dashed border-slate-850 flex-1 h-1 min-w-[20px] print:border-gray-200"></span>
                  <span className="font-mono">Reg. {idx + 1}</span>
                </div>
              ))}
              {subestaciones.map((sub, idx) => (
                <div key={sub.id} className="flex justify-between items-end gap-2 pl-4 text-xs">
                  <span className="truncate">Inspección Subestación: {sub.nombre}</span>
                  <span className="border-b border-dashed border-slate-850 flex-1 h-1 min-w-[20px] print:border-gray-200"></span>
                  <span className="font-mono">Sub. {idx + 1}</span>
                </div>
              ))}

              <div className="flex justify-between items-end gap-2">
                <span className="font-bold text-slate-200 print:text-slate-950">5. RECOMENDACIONES GENERALES</span>
                <span className="border-b border-dashed border-slate-800 flex-1 h-1 min-w-[20px] print:border-gray-300"></span>
                <span className="font-mono">Pág. Final</span>
              </div>
              <div className="flex justify-between items-end gap-2">
                <span className="font-bold text-slate-200 print:text-slate-950">6. RESUMEN EJECUTIVO DE HALLAZGOS</span>
                <span className="border-b border-dashed border-slate-800 flex-1 h-1 min-w-[20px] print:border-gray-300"></span>
                <span className="font-mono">Pág. Final</span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= INTRODUCCIÓN & SISTEMA DE ALIMENTACIÓN ================= */}
        <div className="page-break py-12 px-6 space-y-8 print:text-black">
          <div className="space-y-4">
            <h2 className="text-xl font-bold uppercase tracking-wider text-amber-500 border-b border-slate-800 pb-3 print:text-slate-950 print:border-gray-300">
              1. Introducción
            </h2>
            {isEditingReport ? (
              <textarea
                value={introText}
                onChange={(e) => setIntroText(e.target.value)}
                rows={8}
                className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-slate-100 rounded-xl p-4 text-xs font-sans leading-relaxed outline-none"
              />
            ) : (
              <p className="text-sm text-slate-350 text-justify leading-relaxed print:text-slate-800 whitespace-pre-wrap">
                {introText}
              </p>
            )}
          </div>

          <div className="space-y-6 pt-4">
            <h2 className="text-xl font-bold uppercase tracking-wider text-amber-500 border-b border-slate-800 pb-3 print:text-slate-950 print:border-gray-300">
              2. Sistema de Alimentación
            </h2>
            
            {/* Transformadores */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500/80 print:text-slate-700">Transformadores</h3>
              {transformadores.length > 0 ? (
                <table className="w-full text-xs text-left border border-slate-800 print:border-gray-300">
                  <thead className="bg-slate-950 text-[10px] font-bold uppercase tracking-wider text-slate-400 print:bg-gray-100 print:text-slate-700">
                    <tr>
                      <th className="p-2.5 border-b border-slate-800 print:border-gray-300">Nombre</th>
                      <th className="p-2.5 border-b border-slate-800 print:border-gray-300">Ubicación</th>
                      <th className="p-2.5 border-b border-slate-800 print:border-gray-300">Capacidad</th>
                      <th className="p-2.5 border-b border-slate-800 print:border-gray-300">Marca</th>
                      <th className="p-2.5 border-b border-slate-800 print:border-gray-300">Conexión</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 print:divide-gray-255 text-slate-300 print:text-slate-800">
                    {transformadores.map(e => (
                      <tr key={e.id}>
                        <td className="p-2.5 font-bold">{e.nombre}</td>
                        <td className="p-2.5">{e.ubicacion}</td>
                        <td className="p-2.5">{e.datosTecnicos?.kva || '—'}</td>
                        <td className="p-2.5">{e.datosTecnicos?.marca || '—'}</td>
                        <td className="p-2.5">{e.datosTecnicos?.conexion || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-xs text-slate-550 italic">No se registraron transformadores específicos en este proyecto.</p>
              )}
            </div>

            {/* Generadores */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500/80 print:text-slate-700">Generadores</h3>
              {generadores.length > 0 ? (
                <table className="w-full text-xs text-left border border-slate-800 print:border-gray-300">
                  <thead className="bg-slate-950 text-[10px] font-bold uppercase tracking-wider text-slate-400 print:bg-gray-100 print:text-slate-700">
                    <tr>
                      <th className="p-2.5 border-b border-slate-800 print:border-gray-300">Nombre</th>
                      <th className="p-2.5 border-b border-slate-800 print:border-gray-300">Ubicación</th>
                      <th className="p-2.5 border-b border-slate-800 print:border-gray-300">Potencia (KVA)</th>
                      <th className="p-2.5 border-b border-slate-800 print:border-gray-300">Combustible</th>
                      <th className="p-2.5 border-b border-slate-800 print:border-gray-300">Amperaje</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 print:divide-gray-255 text-slate-300 print:text-slate-800">
                    {generadores.map(e => (
                      <tr key={e.id}>
                        <td className="p-2.5 font-bold">{e.nombre}</td>
                        <td className="p-2.5">{e.ubicacion}</td>
                        <td className="p-2.5">{e.datosTecnicos?.kva || '—'}</td>
                        <td className="p-2.5">{e.datosTecnicos?.combustible || '—'}</td>
                        <td className="p-2.5">{e.datosTecnicos?.amperaje || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-xs text-slate-550 italic">No se registraron generadores en este proyecto.</p>
              )}
            </div>

            {/* Tableros */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500/80 print:text-slate-700">Tableros Eléctricos</h3>
              {tableros.length > 0 ? (
                <table className="w-full text-xs text-left border border-slate-800 print:border-gray-300">
                  <thead className="bg-slate-950 text-[10px] font-bold uppercase tracking-wider text-slate-400 print:bg-gray-100 print:text-slate-700">
                    <tr>
                      <th className="p-2.5 border-b border-slate-800 print:border-gray-300">Nombre</th>
                      <th className="p-2.5 border-b border-slate-800 print:border-gray-300">Ubicación</th>
                      <th className="p-2.5 border-b border-slate-800 print:border-gray-300">Polos Máx</th>
                      <th className="p-2.5 border-b border-slate-800 print:border-gray-300">Alimentador</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 print:divide-gray-255 text-slate-300 print:text-slate-800">
                    {tableros.map(e => (
                      <tr key={e.id}>
                        <td className="p-2.5 font-bold">{e.nombre}</td>
                        <td className="p-2.5">{e.ubicacion}</td>
                        <td className="p-2.5">{e.datosTecnicos?.maxPoles || '30'}</td>
                        <td className="p-2.5">{e.alimentadoPor || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-xs text-slate-550 italic">No se registraron tableros eléctricos en este proyecto.</p>
              )}
            </div>
          </div>
        </div>

        {/* ================= JERARQUÍA DEL DIAGRAMA UNIFILAR ================= */}
        <div className="page-break py-12 px-6 space-y-6 print:text-black">
          <div className="border-b border-slate-800 pb-3 print:border-gray-300">
            <h2 className="text-xl font-bold uppercase tracking-wider text-amber-500 print:text-slate-950">
              3. Jerarquía y Flujo Eléctrico
            </h2>
          </div>
          
          <p className="text-sm text-slate-350 print:text-slate-800 mb-6">
            A continuación se presenta de forma jerárquica las relaciones de alimentación entre los equipos registrados en el sistema, mostrando el flujo de potencia aguas abajo:
          </p>

          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-850 space-y-4 print:bg-slate-50 print:border-gray-300">
            {elementos.length > 0 ? (
              <div className="space-y-4">
                {/* Find elements that are fed by nothing or general feed */}
                {elementos.map(e => {
                  const feeds = elementos.filter(child => child.alimentadoPor === e.nombre);
                  return (
                    <div key={e.id} className="border-l-2 border-amber-500/30 pl-4 py-1.5 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-100 print:text-slate-900 uppercase">
                          {e.nombre}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 uppercase font-mono print:bg-white print:border-gray-300">
                          {e.tipoElemento}
                        </span>
                        {e.alimentadoPor && (
                          <span className="text-[9px] text-slate-500 font-medium">
                            (Alimentado por: {e.alimentadoPor})
                          </span>
                        )}
                      </div>

                      {feeds.length > 0 && (
                        <div className="pl-6 space-y-1">
                          <span className="text-[9px] font-bold text-slate-500 uppercase block">Alimenta a:</span>
                          {feeds.map(child => (
                            <div key={child.id} className="flex items-center gap-2 text-xs text-slate-400 print:text-slate-700">
                              <span>↳</span>
                              <span className="font-bold">{child.nombre}</span>
                              <span className="text-[8px] px-1 bg-slate-900 text-slate-500 rounded uppercase font-mono print:bg-white print:border-gray-200 border border-slate-850">
                                {child.tipoElemento}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic text-center">No hay suficientes elementos para trazar la jerarquía.</p>
            )}
          </div>
        </div>

        {/* ================= RESULTADOS DE INSPECCIONES (Páginas individuales) ================= */}
        <div className="space-y-12">
          {/* Elementos */}
          {elementos.map((item, idx) => {
            const isTablero = item.tipoElemento === 'TABLERO';
            
            const enrichedElement = isTablero ? {
              id: item.id,
              nombre: item.nombre,
              ubicacion: item.ubicacion,
              alimentadoPor: item.alimentadoPor,
              foto: item.foto,
              fotoBlob: item.fotoBlob,
              observacionesGenerales: item.observacionesGenerales,
              ...item.datosTecnicos,
              nombreEmpresa: company.nombre
            } : item;

            return (
              <div key={item.id} className="page-break pt-8 space-y-6">
                <div className="border-b border-slate-800 pb-3 flex justify-between items-center print:border-gray-300 no-print">
                  <h2 className="text-lg font-bold text-amber-500 uppercase tracking-wide">
                    Inspección #{idx + 1}: {item.nombre} ({item.tipoElemento})
                  </h2>
                  <span className="text-xs text-slate-500 font-mono">REGISTRO: {item.id.slice(0, 8)}...</span>
                </div>

                {/* Renderizar según sea Tablero o Ficha Técnica */}
                {isTablero ? (
                  <div className={isEditingReport ? "" : "pointer-events-none select-none"}>
                    <TableroComponent 
                      tableroData={enrichedElement}
                      onUpdateTablero={(updatedData) => handleUpdateElemento(item.id, updatedData)}
                    />
                  </div>
                ) : (
                  <div className={isEditingReport ? "" : "pointer-events-none select-none"}>
                    <FichaTecnicaComponent
                      elementoData={enrichedElement}
                      onUpdate={(updatedData) => handleUpdateElemento(item.id, updatedData)}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Subestaciones */}
          {subestaciones.map((sub, idx) => (
            <div key={sub.id} className="page-break pt-8 space-y-6">
              <div className="border-b border-slate-800 pb-3 flex justify-between items-center print:border-gray-300 no-print">
                <h2 className="text-lg font-bold text-amber-500 uppercase tracking-wide">
                  Subestación #{idx + 1}: {sub.nombre} (Obra Civil)
                </h2>
                <span className="text-xs text-slate-500 font-mono">REGISTRO: {sub.id.slice(0, 8)}...</span>
              </div>

              <div className={isEditingReport ? "" : "pointer-events-none select-none"}>
                <SubestacionComponent
                  subestacionData={sub}
                  onUpdate={(updatedData) => handleUpdateSubestacion(sub.id, updatedData)}
                />
              </div>
            </div>
          ))}
        </div>

        {/* ================= RECOMENDACIONES GENERALES ================= */}
        <div className="page-break py-12 px-6 space-y-6 print:text-black">
          <div className="border-b border-slate-800 pb-3 print:border-gray-300">
            <h2 className="text-xl font-bold uppercase tracking-wider text-amber-500 print:text-slate-950">
              5. Recomendaciones Generales
            </h2>
          </div>

          <div className="space-y-4 text-sm text-slate-350 print:text-slate-800">
            {elementos.some(e => e.observacionesGenerales) ? (
              elementos.filter(e => e.observacionesGenerales).map(e => (
                <div key={e.id} className="border-l-2 border-amber-500 pl-4 py-1 space-y-1">
                  <span className="font-bold text-slate-100 print:text-slate-900 block text-xs uppercase">{e.nombre}:</span>
                  {isEditingReport ? (
                    <textarea
                      value={e.observacionesGenerales || ''}
                      onChange={(eVal) => handleUpdateElementoObservaciones(e.id, eVal.target.value)}
                      placeholder="Modifique recomendaciones..."
                      rows={2}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-slate-100 rounded px-2 py-1 text-xs outline-none"
                    />
                  ) : (
                    <p className="text-xs text-slate-400 print:text-slate-700 italic">"{e.observacionesGenerales}"</p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-550 italic text-center">No se ingresaron recomendaciones detalladas individuales.</p>
            )}
          </div>
        </div>

        {/* ================= TABLA RESUMEN DE RECOMENDACIONES ================= */}
        <div className="page-break py-12 px-6 space-y-6 print:text-black">
          <div className="border-b border-slate-800 pb-3 print:border-gray-300">
            <h2 className="text-xl font-bold uppercase tracking-wider text-amber-500 print:text-slate-950">
              6. Resumen de Hallazgos y Recomendaciones
            </h2>
          </div>

          <table className="w-full text-xs text-left border border-slate-800 print:border-gray-300">
            <thead className="bg-slate-950 text-[10px] font-bold uppercase tracking-wider text-slate-400 print:bg-gray-100 print:text-slate-700">
              <tr>
                <th className="p-3 border-b border-slate-800 print:border-gray-300 w-1/4">Área / Equipo</th>
                <th className="p-3 border-b border-slate-800 print:border-gray-300">Observaciones y Recomendaciones Técnicas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 print:divide-gray-255 text-slate-350 print:text-slate-800">
              {elementos.map(e => (
                <tr key={e.id}>
                  <td className="p-3 font-bold uppercase">{e.nombre} ({e.tipoElemento})</td>
                  <td className="p-3 whitespace-pre-line leading-relaxed">
                    {isEditingReport ? (
                      <textarea
                        value={e.observacionesGenerales || ''}
                        onChange={(eVal) => handleUpdateElementoObservaciones(e.id, eVal.target.value)}
                        placeholder="Edite los hallazgos del equipo..."
                        rows={3}
                        className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-slate-100 rounded px-2 py-1 text-xs outline-none"
                      />
                    ) : (
                      e.observacionesGenerales || 'El equipo presenta buen estado general de estructura y cableado. Cumple con normas operativas.'
                    )}
                  </td>
                </tr>
              ))}
              {subestaciones.map(s => (
                <tr key={s.id}>
                  <td className="p-3 font-bold uppercase">SUBESTACIÓN: {s.nombre}</td>
                  <td className="p-3 whitespace-pre-line leading-relaxed">
                    {isEditingReport ? (
                      <textarea
                        value={s.observacionesGenerales || ''}
                        onChange={(eVal) => handleUpdateSubestacionObservaciones(s.id, eVal.target.value)}
                        placeholder="Edite los hallazgos de la subestación..."
                        rows={3}
                        className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-slate-100 rounded px-2 py-1 text-xs outline-none"
                      />
                    ) : (
                      s.observacionesGenerales || 'Obras civiles e infraestructura física en buenas condiciones generales.'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
