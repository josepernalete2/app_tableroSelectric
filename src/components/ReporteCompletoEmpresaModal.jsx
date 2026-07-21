import React from 'react';
import { Printer, Download, FileSpreadsheet, X, CheckCircle2, Building, Zap, RefreshCw, FileText } from 'lucide-react';
import { exportCompanyToExcel } from '../utils/excelExport';

export default function ReporteCompletoEmpresaModal({ company, onClose }) {
  if (!company) return null;

  // Recopilar todos los elementos unifilares de todos los proyectos de la empresa
  const proyectos = company.proyectos || [];

  const generadores = [];
  const transferencias = [];
  const paneles = [];

  proyectos.forEach(p => {
    const elList = p.elementosUnifilares || p.tableros || [];
    elList.forEach(el => {
      const tipo = el.tipoElemento || 'TABLERO';
      const itemConProyecto = { ...el, proyectoNombre: p.nombre };
      if (tipo === 'GENERADOR') {
        generadores.push(itemConProyecto);
      } else if (tipo === 'TRANSFER') {
        transferencias.push(itemConProyecto);
      } else {
        paneles.push(itemConProyecto);
      }
    });
  });

  const handlePrintPDF = () => {
    window.print();
  };

  const handleExportExcel = () => {
    exportCompanyToExcel(company);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md font-sans">
      
      {/* Container Principal */}
      <div className="relative w-full max-w-5xl h-[92vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header Superior del Modal (Oculto en Impresión) */}
        <div className="bg-slate-955 border-b border-slate-800 p-4 px-6 flex items-center justify-between no-print shrink-0">
          <div>
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block font-mono">
              GENERACIÓN DE INFORME COMPLETO PDF / EXCEL
            </span>
            <h2 className="text-base font-bold text-slate-100 truncate">
              {company.nombre} - Reporte Técnico Consolidado
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2 rounded-xl flex items-center gap-2 text-xs transition-all cursor-pointer shadow-md"
              title="Exportar Libro Excel (.xlsx) con Múltiples Hojas"
            >
              <FileSpreadsheet className="w-4 h-4" /> Exportar Excel (.xlsx)
            </button>

            <button
              onClick={handlePrintPDF}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl flex items-center gap-2 text-xs transition-all cursor-pointer shadow-md"
              title="Guardar como PDF o Imprimir Informe Técnico Completo"
            >
              <Printer className="w-4 h-4" /> Generar PDF Completo
            </button>

            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ÁREA IMPRIMIBLE Y VISUALIZABLE DEL DOCUMENTO CONSOLIDADO */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-12 print:p-0 print:m-0 print:overflow-visible print:bg-white print:text-black">
          
          {/* ========================================================================= */}
          {/* 1. PORTADA DEL INFORME TÉCNICO */}
          {/* ========================================================================= */}
          <div className="min-h-[85vh] flex flex-col justify-between items-center text-center p-8 bg-slate-950 border border-slate-800 rounded-2xl shadow-xl print:border-none print:shadow-none print:bg-white print:text-black print:min-h-[100vh] page-break-after-always">
            
            <div className="pt-16 space-y-3">
              <span className="text-xs font-mono font-bold tracking-widest text-amber-500 uppercase block print:text-black">
                INFORME TÉCNICO OFICIAL DE INSPECCIÓN ELÉCTRICA
              </span>
              <h1 className="text-3xl md:text-5xl font-black text-slate-100 tracking-tight font-mono uppercase print:text-black">
                DIAGRAMA UNIFILAR Y TABLEROS
              </h1>
              <div className="w-24 h-1.5 bg-amber-500 mx-auto rounded-full mt-4 print:bg-black" />
            </div>

            <div className="space-y-4 my-auto">
              <Building className="w-20 h-20 text-amber-500 mx-auto print:text-black opacity-80" />
              <h2 className="text-2xl md:text-4xl font-extrabold text-slate-100 uppercase tracking-wide font-mono print:text-black">
                {company.nombre}
              </h2>
              <p className="text-xs text-slate-400 font-mono print:text-black">
                Evaluación técnica de Generadores de Emergencia, Unidades de Transferencia y Paneles Eléctricos.
              </p>
            </div>

            <div className="pb-12 space-y-1 text-xs font-mono text-slate-400 print:text-black border-t border-slate-800 pt-6 w-full max-w-md">
              <p className="font-bold text-slate-200 print:text-black">BARQUISIMETO, EDO. LARA</p>
              <p>AÑO {new Date().getFullYear()}</p>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. TABLA DE CONTENIDO & RESUMEN DE PROYECTOS */}
          {/* ========================================================================= */}
          <div className="p-8 bg-slate-950 border border-slate-800 rounded-2xl shadow-xl space-y-6 print:border-none print:shadow-none print:bg-white print:text-black page-break-after-always">
            <h2 className="text-xl font-black text-slate-100 uppercase font-mono border-b border-slate-800 pb-3 print:text-black print:border-black">
              Tabla de Contenido y Resumen de Equipos
            </h2>

            <div className="space-y-4 text-xs font-mono">
              <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 print:bg-gray-100 print:border-gray-300">
                <span className="font-bold text-amber-400 uppercase block mb-2 print:text-black">⚡ 1. GENERADORES DE EMERGENCIA ({generadores.length})</span>
                <div className="divide-y divide-slate-800 print:divide-gray-300">
                  {generadores.map((g, idx) => (
                    <div key={g.id} className="py-2 flex justify-between items-center">
                      <span className="font-bold text-slate-200 print:text-black">{idx + 1}. {g.nombre}</span>
                      <span className="text-slate-400 print:text-black">{g.ubicacion || 'ESTACIONAMIENTO'}</span>
                    </div>
                  ))}
                  {generadores.length === 0 && <p className="text-slate-500 py-1">Sin generadores registrados</p>}
                </div>
              </div>

              <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 print:bg-gray-100 print:border-gray-300">
                <span className="font-bold text-emerald-400 uppercase block mb-2 print:text-black">🔄 2. UNIDADES DE TRANSFERENCIA ({transferencias.length})</span>
                <div className="divide-y divide-slate-800 print:divide-gray-300">
                  {transferencias.map((t, idx) => (
                    <div key={t.id} className="py-2 flex justify-between items-center">
                      <span className="font-bold text-slate-200 print:text-black">{idx + 1}. {t.nombre}</span>
                      <span className="text-slate-400 print:text-black">{t.ubicacion || 'SÓTANO'}</span>
                    </div>
                  ))}
                  {transferencias.length === 0 && <p className="text-slate-500 py-1">Sin transferencias registradas</p>}
                </div>
              </div>

              <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 print:bg-gray-100 print:border-gray-300">
                <span className="font-bold text-sky-400 uppercase block mb-2 print:text-black">⚡ 3. PANELES ELÉCTRICOS Y TABLEROS ({paneles.length})</span>
                <div className="divide-y divide-slate-800 print:divide-gray-300">
                  {paneles.map((p, idx) => (
                    <div key={p.id} className="py-2 flex justify-between items-center">
                      <span className="font-bold text-slate-200 print:text-black">{idx + 1}. {p.nombre}</span>
                      <span className="text-slate-400 print:text-black">{p.ubicacion || 'SÓTANO / PISO'}</span>
                    </div>
                  ))}
                  {paneles.length === 0 && <p className="text-slate-500 py-1">Sin paneles registrados</p>}
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. SECCIÓN GENERADORES DE EMERGENCIA */}
          {/* ========================================================================= */}
          {generadores.map((g) => (
            <div key={g.id} className="p-6 bg-slate-950 border-2 border-slate-700 rounded-2xl shadow-xl space-y-4 print:border-black print:bg-white print:text-black page-break-after-always">
              <div className="bg-slate-900 border-b-2 border-slate-700 p-3 text-center print:bg-gray-200 print:border-black">
                <h3 className="text-base font-black text-slate-100 uppercase font-mono print:text-black">
                  GENERADOR: {g.nombre}
                </h3>
              </div>

              <table className="w-full text-xs text-left border-collapse border-b border-slate-700 font-mono print:border-black">
                <tbody>
                  <tr className="border-b border-slate-800 print:border-gray-300">
                    <td className="w-1/3 bg-slate-900/90 font-bold p-2.5 text-slate-300 uppercase border-r border-slate-800 print:bg-gray-100 print:text-black">GENERADOR ALIMENTA A:</td>
                    <td className="p-2.5 text-slate-100 font-semibold print:text-black">{g.alimentadoPor || 'TRANSFERENCIA DOMOSA EN ESTACIONAMIENTO'}</td>
                  </tr>
                  <tr>
                    <td className="bg-slate-900/90 font-bold p-2.5 text-slate-300 uppercase border-r border-slate-800 print:bg-gray-100 print:text-black">UBICACIÓN:</td>
                    <td className="p-2.5 text-slate-100 font-semibold print:text-black">{g.ubicacion || 'ESTACIONAMIENTO'}</td>
                  </tr>
                </tbody>
              </table>

              <div className="bg-slate-900/80 border-b border-slate-700 p-2 text-center font-bold text-xs uppercase text-amber-400 font-mono print:bg-gray-200 print:text-black">
                Datos de placa
              </div>

              <table className="w-full text-xs text-left border-collapse border-b border-slate-700 font-mono print:border-black">
                <thead>
                  <tr className="bg-slate-900/50 border-b border-slate-800 font-bold text-slate-400 uppercase print:bg-gray-100 print:text-black">
                    <th className="p-2 border-r border-slate-800 w-1/3">PARÁMETRO</th>
                    <th className="p-2 border-r border-slate-800 w-1/3 text-center">VALOR</th>
                    <th className="p-2 w-1/3 text-center">UNIDAD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-gray-300">
                  <tr><td className="p-2 font-bold text-slate-300 border-r border-slate-800 print:bg-gray-50 print:text-black">MARCA</td><td className="p-2 border-r border-slate-800 text-center font-bold text-slate-100 print:text-black">{g.datosTecnicos?.marca || 'DOMOSA'}</td><td className="p-2 text-center text-slate-400 print:text-black">PLACA</td></tr>
                  <tr><td className="p-2 font-bold text-slate-300 border-r border-slate-800 print:bg-gray-50 print:text-black">FASES</td><td className="p-2 border-r border-slate-800 text-center font-bold text-slate-100 print:text-black">{g.datosTecnicos?.fases || '3'}</td><td className="p-2 text-center text-slate-400 print:text-black">FASE</td></tr>
                  <tr><td className="p-2 font-bold text-slate-300 border-r border-slate-800 print:bg-gray-50 print:text-black">POTENCIA</td><td className="p-2 border-r border-slate-800 text-center font-extrabold text-amber-400 print:text-black">{g.datosTecnicos?.kva || '580'}</td><td className="p-2 text-center text-slate-400 print:text-black">KVA</td></tr>
                  <tr><td className="p-2 font-bold text-slate-300 border-r border-slate-800 print:bg-gray-50 print:text-black">VOLTAJE</td><td className="p-2 border-r border-slate-800 text-center font-bold text-slate-100 print:text-black">{g.datosTecnicos?.voltajeGeneracion || g.datosTecnicos?.voltaje || '208'}</td><td className="p-2 text-center text-slate-400 print:text-black">VOL</td></tr>
                  <tr><td className="p-2 font-bold text-slate-300 border-r border-slate-800 print:bg-gray-50 print:text-black">AMPERAJE</td><td className="p-2 border-r border-slate-800 text-center font-bold text-slate-100 print:text-black">{g.datosTecnicos?.amperaje || '800'}</td><td className="p-2 text-center text-slate-400 print:text-black">AMP</td></tr>
                </tbody>
              </table>

              <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800 text-xs font-mono print:bg-gray-100 print:text-black">
                <span className="font-bold text-slate-400 block uppercase mb-1 print:text-black">OBSERVACIONES DEL GENERADOR:</span>
                <p className="text-slate-200 print:text-black">{g.observacionesGenerales || 'Generador operativo de la clínica.'}</p>
              </div>
            </div>
          ))}

          {/* ========================================================================= */}
          {/* 4. SECCIÓN UNIDADES DE TRANSFERENCIA */}
          {/* ========================================================================= */}
          {transferencias.map((t) => (
            <div key={t.id} className="p-6 bg-slate-955 border-2 border-slate-700 rounded-2xl shadow-xl space-y-4 print:border-black print:bg-white print:text-black page-break-after-always">
              <div className="bg-slate-900 border-b-2 border-slate-700 p-3 text-center print:bg-gray-200 print:border-black">
                <h3 className="text-base font-black text-slate-100 uppercase font-mono print:text-black">
                  TRANSFERENCIA: {t.nombre}
                </h3>
              </div>

              <table className="w-full text-xs text-left border-collapse border-b border-slate-700 font-mono print:border-black">
                <tbody>
                  <tr className="border-b border-slate-800 print:border-gray-300">
                    <td className="w-1/3 bg-slate-900/90 font-bold p-2.5 text-slate-300 uppercase border-r border-slate-800 print:bg-gray-100 print:text-black">UBICACIÓN:</td>
                    <td className="p-2.5 text-slate-100 font-semibold print:text-black">{t.ubicacion || 'SÓTANO SALA TÉCNICA'}</td>
                  </tr>
                  <tr className="border-b border-slate-800 print:border-gray-300">
                    <td className="bg-slate-900/90 font-bold p-2.5 text-slate-300 uppercase border-r border-slate-800 print:bg-gray-100 print:text-black">TABLERO ALIMENTADO POR:</td>
                    <td className="p-2.5 text-slate-100 font-semibold print:text-black">{t.alimentadoPor || 'TRANSFERENCIA DOMOSA + CORPOELEC'}</td>
                  </tr>
                </tbody>
              </table>

              <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800 text-xs font-mono print:bg-gray-100 print:text-black">
                <span className="font-bold text-slate-400 block uppercase mb-1 print:text-black">OBSERVACIÓN DE LA TRANSFERENCIA:</span>
                <p className="text-slate-200 print:text-black">{t.observacionesGenerales || 'PASA DIRECTAMENTE AL TABLERO .'}</p>
              </div>
            </div>
          ))}

          {/* ========================================================================= */}
          {/* 5. SECCIÓN PANELES ELÉCTRICOS Y TABLEROS */}
          {/* ========================================================================= */}
          {paneles.map((p) => (
            <div key={p.id} className="p-6 bg-slate-955 border-2 border-slate-700 rounded-2xl shadow-xl space-y-4 print:border-black print:bg-white print:text-black page-break-after-always">
              <div className="bg-slate-900 border-b-2 border-slate-700 p-3 text-center print:bg-gray-200 print:border-black">
                <h3 className="text-base font-black text-slate-100 uppercase font-mono print:text-black">
                  PANEL ELÉCTRICO: {p.nombre}
                </h3>
              </div>

              <table className="w-full text-xs text-left border-collapse border-b border-slate-700 font-mono print:border-black">
                <tbody>
                  <tr className="border-b border-slate-800 print:border-gray-300">
                    <td className="w-1/3 bg-slate-900/90 font-bold p-2.5 text-slate-300 uppercase border-r border-slate-800 print:bg-gray-100 print:text-black">UBICACIÓN:</td>
                    <td className="p-2.5 text-slate-100 font-semibold print:text-black">{p.ubicacion || 'SÓTANO SALA DE TABLEROS'}</td>
                  </tr>
                  <tr className="border-b border-slate-800 print:border-gray-300">
                    <td className="bg-slate-900/90 font-bold p-2.5 text-slate-300 uppercase border-r border-slate-800 print:bg-gray-100 print:text-black">ALIMENTADO POR:</td>
                    <td className="p-2.5 text-slate-100 font-semibold print:text-black">{p.alimentadoPor || 'ATS SOTANO'}</td>
                  </tr>
                </tbody>
              </table>

              <div className="p-3 bg-amber-950/40 rounded-xl border border-amber-800/60 text-xs font-mono text-amber-200 print:bg-yellow-100 print:text-black">
                <span className="font-bold text-amber-400 block uppercase mb-1 print:text-black">OBSERVACIÓN GENERAL DEL PANEL:</span>
                <p>{p.observacionesGenerales || 'SALEN ACOMETIDAS 1 X 500 Y 1X250 MCM DE LA BARRA PARTE INFERIOR.'}</p>
              </div>
            </div>
          ))}

        </div>

      </div>
    </div>
  );
}
