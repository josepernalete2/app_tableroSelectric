import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore, { formatElementTitleWithId, getElementCode, cleanElementName, sortElementsByOrder } from '../store/useStore';
import { calcularPotenciaEstimadaTablero } from '../utils/potenciaTablero';
import TableroComponent from '../components/TableroComponent';
import FichaTecnicaComponent from '../components/FichaTecnicaComponent';
import SubestacionComponent from '../components/SubestacionComponent';
import PuntoMedicionComponent from '../components/PuntoMedicionComponent';
import CcmComponent from '../components/CcmComponent';
import DiagramaUnifilarBlueprint from '../components/DiagramaUnifilarBlueprint';
import { 
  ArrowLeft, 
  Printer, 
  BookOpen, 
  FileText, 
  Zap, 
  Building, 
  Gauge, 
  Award, 
  User, 
  Calendar, 
  Layers, 
  Cpu, 
  ShieldAlert, 
  RefreshCw, 
  Edit, 
  Check,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  FileCheck
} from 'lucide-react';

export default function InformeCompiladoView() {
  const { companyId, proyectoId } = useParams();
  const navigate = useNavigate();
  const { companies, updateElementoUnifilar, updateSubestacion, updatePuntoMedicion, updateCcm } = useStore();

  const company = companies.find((c) => c.id === companyId);
  const proyecto = company?.proyectos?.find((p) => p.id === proyectoId);

  // Modo Edición del Informe
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [coverTitle, setCoverTitle] = useState('INFORME TÉCNICO DE AUDITORÍA ELÉCTRICA Y DIAGRAMA UNIFILAR');
  const [coverSubtitle, setCoverSubtitle] = useState('Levantamiento de Campo, Evaluación de Cargas y Conformidad Normativa');
  const [introText, setIntroText] = useState('');

  // Sync introText when company and proyecto load
  useEffect(() => {
    if (company && proyecto && !introText) {
      setIntroText(
        `El presente informe técnico de ingeniería eléctrica documenta la auditoría, levantamiento dimensional y unifilar del sistema de distribución eléctrica en las instalaciones de ${company.nombre}, correspondiente al proyecto "${proyecto.nombre}".\n\nLas actividades de campo comprendieron el inventario exhaustivo de fuentes de alimentación, transformadores, grupos electrógenos, sistemas de transferencia automática (ATS/MTS), tableros principales y seccionales, centros de control de motores (CCM), bancos de compensación reactiva y mallas de puesta a tierra (PAT).\n\nTodos los parámetros recopilados han sido cotejados con las normativas eléctricas vigentes (Código Eléctrico Nacional / COVENIN 200 / NFPA 70) para garantizar la confiabilidad operativa, la seguridad del personal y la eficiencia energética de la infraestructura.`
      );
    }
  }, [company, proyecto, introText]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!company || !proyecto) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <h2 className="text-lg font-bold">Proyecto o Empresa no encontrado</h2>
        <button 
          onClick={() => navigate(`/empresa/${companyId || ''}`)} 
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs rounded-xl font-bold transition-all cursor-pointer"
        >
          Volver
        </button>
      </div>
    );
  }

  // Extracción robusta de los datos del responsable del proyecto
  const responsableNombre = proyecto.responsableNombre || (typeof proyecto.responsable === 'object' ? proyecto.responsable?.nombre : proyecto.responsable) || company?.contactoPrincipal || company?.responsable || 'Ingeniero Responsable';
  const responsableTelefono = proyecto.responsableTelefono || (typeof proyecto.responsable === 'object' ? proyecto.responsable?.telefono : '') || company?.telefono || '—';
  const responsableEmail = proyecto.responsableEmail || (typeof proyecto.responsable === 'object' ? proyecto.responsable?.email : '') || company?.email || '—';
  const direccionUbicacion = proyecto.direccion || proyecto.ubicacion || company?.direccion || company?.ubicacion || 'Ubicación de Planta / Sede Principal';

  const elementos = sortElementsByOrder(proyecto.elementosUnifilares || proyecto.tableros || []);
  const subestaciones = sortElementsByOrder(proyecto.inspeccionesSubestacion || proyecto.subestaciones || []);
  const puntosMedicion = sortElementsByOrder(proyecto.puntosMedicion || []);
  const ccmList = sortElementsByOrder(proyecto.ccmList || []);

  const transformadores = elementos.filter(e => e.tipoElemento === 'TRANSFORMADOR');
  const generadores = elementos.filter(e => e.tipoElemento === 'GENERADOR');
  const transferencias = elementos.filter(e => e.tipoElemento === 'TRANSFER');
  const tableros = elementos.filter(e => e.tipoElemento === 'TABLERO');
  const bancosCondensadores = elementos.filter(e => e.tipoElemento === 'BANCO_CONDENSADOR');
  const puestasTierra = elementos.filter(e => e.tipoElemento === 'PUESTA_TIERRA');
  const otros = elementos.filter(e => e.tipoElemento === 'OTRO');

  const fechaEmision = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  const currentYear = new Date().getFullYear();

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased print:bg-white print:text-slate-900">
      
      {/* Barra de control superior (Solo Pantalla / no-print) */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-md no-print sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/empresa/${companyId}/proyecto/${proyectoId}`)}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer border border-slate-700"
            title="Volver al Proyecto"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider block">
              Generador de Reportes Ejecutivos
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
                Editar Textos del Informe
              </>
            )}
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 rounded-xl transition-all cursor-pointer flex items-center gap-2 text-xs font-black shadow-md"
          >
            <Printer className="w-4 h-4" />
            Imprimir / Exportar a PDF (Carta)
          </button>
        </div>
      </div>

      {/* DOCUMENTO COMPILADO (Diseñado para formato Carta estricto) */}
      <div className="w-full max-w-5xl mx-auto p-4 md:p-8 space-y-10 bg-slate-900/40 md:rounded-3xl border border-slate-900/60 my-6 shadow-2xl print:my-0 print:p-0 print:border-none print:bg-white print:text-black print:shadow-none print:max-w-full">
        
        {/* ================= 1. PORTADA EJECUTIVA (Hoja 1 estricta) ================= */}
        <div className="page-break-after flex flex-col justify-between py-12 px-8 text-center bg-slate-950 border border-slate-850 rounded-2xl print:bg-white print:text-black print:border-none print:p-6 min-h-[92vh] print:min-h-screen">
          
          {/* Cabecera de Portada */}
          <div className="flex justify-between items-center border-b border-slate-800 pb-4 print:border-slate-300 w-full text-left">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 print:bg-slate-100 print:border-slate-400 print:text-slate-900">
                <Zap className="w-5 h-5 font-bold" />
              </div>
              <div>
                <span className="text-xs font-black text-slate-100 print:text-slate-950 uppercase tracking-wider block">
                  AUDITORÍA & INGENIERÍA ELÉCTRICA
                </span>
                <span className="text-[10px] text-slate-500 font-medium block print:text-slate-600">
                  DOCUMENTO TÉCNICO OFICIAL DE EVALUACIÓN
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded print:text-slate-900 print:bg-slate-100 print:border-slate-300">
                CÓD: {proyecto.id?.substring(0, 8).toUpperCase()}
              </span>
            </div>
          </div>
          
          {/* Bloque Central de Título */}
          <div className="space-y-6 my-auto w-full max-w-3xl mx-auto flex flex-col items-center py-8">
            {isEditingReport ? (
              <textarea
                value={coverTitle}
                onChange={(e) => setCoverTitle(e.target.value)}
                rows={3}
                className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white font-black text-center text-2xl uppercase rounded-xl p-3 outline-none"
              />
            ) : (
              <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white print:text-slate-950 font-sans leading-tight whitespace-pre-line">
                {coverTitle}
              </h1>
            )}
            
            <div className="w-32 h-1.5 bg-amber-500 mx-auto rounded-full print:bg-slate-900"></div>
            
            {isEditingReport ? (
              <input
                type="text"
                value={coverSubtitle}
                onChange={(e) => setCoverSubtitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-slate-300 text-center text-xs font-medium tracking-wide uppercase rounded-xl p-2 outline-none"
              />
            ) : (
              <p className="text-slate-300 print:text-slate-700 text-sm font-semibold tracking-wide uppercase max-w-xl">
                {coverSubtitle}
              </p>
            )}
          </div>

          {/* Ficha Técnica de Portada: Empresa, Proyecto y Responsable */}
          <div className="w-full bg-slate-900/60 print:bg-slate-50 border border-slate-800 print:border-slate-300 rounded-xl p-5 text-left grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 border-b md:border-b-0 md:border-r border-slate-800 print:border-slate-300 pb-3 md:pb-0 md:pr-4">
              <span className="text-[10px] font-bold text-amber-500 print:text-slate-600 uppercase tracking-wider block">
                Datos del Cliente y Proyecto
              </span>
              <div className="text-sm font-bold text-slate-100 print:text-slate-950 uppercase">
                {company.nombre}
              </div>
              <div className="text-xs font-semibold text-slate-300 print:text-slate-800">
                PROYECTO: {proyecto.nombre}
              </div>
              <div className="text-[11px] text-slate-400 print:text-slate-600 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                <span className="truncate">{direccionUbicacion}</span>
              </div>
            </div>

            <div className="space-y-1.5 md:pl-2">
              <span className="text-[10px] font-bold text-amber-500 print:text-slate-600 uppercase tracking-wider block">
                Equipo Técnico Responsable
              </span>
              <div className="text-xs font-bold text-slate-100 print:text-slate-950 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-sky-400 print:text-slate-800" />
                <span>{responsableNombre}</span>
              </div>
              <div className="text-[11px] text-slate-400 print:text-slate-700 flex items-center gap-1.5 font-mono">
                <Phone className="w-3 h-3 text-slate-500" />
                <span>{responsableTelefono}</span>
              </div>
              <div className="text-[11px] text-slate-400 print:text-slate-700 flex items-center gap-1.5">
                <Mail className="w-3 h-3 text-slate-500" />
                <span>{responsableEmail}</span>
              </div>
            </div>
          </div>

          {/* Pie de Portada */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 print:border-slate-200 text-[10px] text-slate-500 print:text-slate-500 flex justify-between items-center">
            <span>Emisión Oficial: {fechaEmision}</span>
            <span>Edición {currentYear} &bull; Formato Ejecutivo</span>
          </div>
        </div>

        {/* ================= 2. TABLA DE CONTENIDO & RESUMEN DE PROYECTO ================= */}
        <div className="page-break-avoid py-6 px-4 md:px-6 space-y-6 print:py-2 print:px-0">
          <div className="border-b border-slate-800 pb-3 print:border-slate-300 flex justify-between items-center">
            <h2 className="text-lg font-bold uppercase tracking-wider text-amber-500 print:text-slate-950 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-500" /> Tabla de Contenido del Informe
            </h2>
            <span className="text-xs font-mono text-slate-500 print:text-slate-600">Documento Técnico Compilado</span>
          </div>
          
          <div className="space-y-2.5 font-sans text-xs text-slate-300 print:text-slate-800">
            <div className="flex justify-between items-end gap-2 py-1">
              <span className="font-bold text-slate-100 print:text-slate-950">1. INTRODUCCIÓN Y ALCANCE DE LA AUDITORÍA</span>
              <span className="border-b border-dashed border-slate-800 flex-1 h-1 min-w-[20px] print:border-slate-300"></span>
              <span className="font-mono text-amber-400 print:text-slate-700 font-bold">Sec. 1</span>
            </div>
            <div className="flex justify-between items-end gap-2 py-1">
              <span className="font-bold text-slate-100 print:text-slate-950">2. INVENTARIO TÉCNICO Y SISTEMA DE ALIMENTACIÓN</span>
              <span className="border-b border-dashed border-slate-800 flex-1 h-1 min-w-[20px] print:border-slate-300"></span>
              <span className="font-mono text-amber-400 print:text-slate-700 font-bold">Sec. 2</span>
            </div>
            <div className="flex justify-between items-end gap-2 pl-4 py-0.5 text-slate-400 print:text-slate-700">
              <span>• Acometidas y Puntos de Suministro ({puntosMedicion.length})</span>
              <span className="border-b border-dashed border-slate-850 flex-1 h-1 min-w-[20px] print:border-slate-200"></span>
              <span className="font-mono">Ficha 2.1</span>
            </div>
            <div className="flex justify-between items-end gap-2 pl-4 py-0.5 text-slate-400 print:text-slate-700">
              <span>• Transformadores de Potencia ({transformadores.length})</span>
              <span className="border-b border-dashed border-slate-850 flex-1 h-1 min-w-[20px] print:border-slate-200"></span>
              <span className="font-mono">Ficha 2.2</span>
            </div>
            <div className="flex justify-between items-end gap-2 pl-4 py-0.5 text-slate-400 print:text-slate-700">
              <span>• Grupos Electrógenos / Generadores ({generadores.length})</span>
              <span className="border-b border-dashed border-slate-850 flex-1 h-1 min-w-[20px] print:border-slate-200"></span>
              <span className="font-mono">Ficha 2.3</span>
            </div>
            <div className="flex justify-between items-end gap-2 pl-4 py-0.5 text-slate-400 print:text-slate-700">
              <span>• Sistemas de Transferencia ATS / MTS ({transferencias.length})</span>
              <span className="border-b border-dashed border-slate-850 flex-1 h-1 min-w-[20px] print:border-slate-200"></span>
              <span className="font-mono">Ficha 2.4</span>
            </div>
            <div className="flex justify-between items-end gap-2 pl-4 py-0.5 text-slate-400 print:text-slate-700">
              <span>• Tableros de Distribución y Alumbrado ({tableros.length})</span>
              <span className="border-b border-dashed border-slate-850 flex-1 h-1 min-w-[20px] print:border-slate-200"></span>
              <span className="font-mono">Ficha 2.5</span>
            </div>
            <div className="flex justify-between items-end gap-2 pl-4 py-0.5 text-slate-400 print:text-slate-700">
              <span>• Bancos de Condensadores ({bancosCondensadores.length})</span>
              <span className="border-b border-dashed border-slate-850 flex-1 h-1 min-w-[20px] print:border-slate-200"></span>
              <span className="font-mono">Ficha 2.6</span>
            </div>
            <div className="flex justify-between items-end gap-2 pl-4 py-0.5 text-slate-400 print:text-slate-700">
              <span>• Centros de Control de Motores CCM ({ccmList.length})</span>
              <span className="border-b border-dashed border-slate-850 flex-1 h-1 min-w-[20px] print:border-slate-200"></span>
              <span className="font-mono">Ficha 2.7</span>
            </div>
            <div className="flex justify-between items-end gap-2 pl-4 py-0.5 text-slate-400 print:text-slate-700">
              <span>• Mallas y Sistemas de Puesta a Tierra PAT ({puestasTierra.length})</span>
              <span className="border-b border-dashed border-slate-850 flex-1 h-1 min-w-[20px] print:border-slate-200"></span>
              <span className="font-mono">Ficha 2.8</span>
            </div>
            <div className="flex justify-between items-end gap-2 py-1">
              <span className="font-bold text-slate-100 print:text-slate-950">3. JERARQUÍA Y DIAGRAMA UNIFILAR GRÁFICO (CAD)</span>
              <span className="border-b border-dashed border-slate-800 flex-1 h-1 min-w-[20px] print:border-slate-300"></span>
              <span className="font-mono text-amber-400 print:text-slate-700 font-bold">Sec. 3</span>
            </div>
            <div className="flex justify-between items-end gap-2 py-1">
              <span className="font-bold text-slate-100 print:text-slate-950">4. FICHAS TÉCNICAS DETALLADAS DE INSPECCIÓN</span>
              <span className="border-b border-dashed border-slate-800 flex-1 h-1 min-w-[20px] print:border-slate-300"></span>
              <span className="font-mono text-amber-400 print:text-slate-700 font-bold">Sec. 4</span>
            </div>
            <div className="flex justify-between items-end gap-2 py-1">
              <span className="font-bold text-slate-100 print:text-slate-950">5. CONCLUSIONES Y RECOMENDACIONES TÉCNICAS</span>
              <span className="border-b border-dashed border-slate-800 flex-1 h-1 min-w-[20px] print:border-slate-300"></span>
              <span className="font-mono text-amber-400 print:text-slate-700 font-bold">Sec. 5</span>
            </div>
            <div className="flex justify-between items-end gap-2 py-1">
              <span className="font-bold text-slate-100 print:text-slate-950">6. APROBACIÓN Y RESPALDO DE INGENIERÍA</span>
              <span className="border-b border-dashed border-slate-800 flex-1 h-1 min-w-[20px] print:border-slate-300"></span>
              <span className="font-mono text-amber-400 print:text-slate-700 font-bold">Sec. 6</span>
            </div>
          </div>
        </div>

        {/* ================= 3. INTRODUCCIÓN & SISTEMA DE ALIMENTACIÓN ================= */}
        <div className="page-break-avoid py-6 px-4 md:px-6 space-y-6 print:py-2 print:px-0">
          <div className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-amber-500 border-b border-slate-800 pb-2 print:text-slate-950 print:border-slate-300 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" /> 1. Introducción y Alcance de la Auditoría
            </h2>
            {isEditingReport ? (
              <textarea
                value={introText}
                onChange={(e) => setIntroText(e.target.value)}
                rows={5}
                className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-slate-100 rounded-xl p-3 text-xs font-sans leading-relaxed outline-none"
              />
            ) : (
              <p className="text-xs text-slate-300 text-justify leading-relaxed print:text-slate-800 whitespace-pre-wrap">
                {introText}
              </p>
            )}
          </div>

          <div className="space-y-5 pt-2">
            <h2 className="text-base font-bold uppercase tracking-wider text-amber-500 border-b border-slate-800 pb-2 print:text-slate-950 print:border-slate-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-500" /> 2. Inventario Técnico del Sistema Eléctrico
            </h2>
            
            {/* Puntos de Medición y Suministro */}
            <div className="space-y-2 break-inside-avoid">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-200 print:text-slate-800 flex items-center justify-between">
                <span>2.1 Puntos de Suministro / Acometida Principal</span>
                <span className="text-[10px] text-slate-500 font-normal">Total: {puntosMedicion.length}</span>
              </h3>
              {puntosMedicion.length > 0 ? (
                <table className="w-full text-[11px] text-left border border-slate-800 print:border-slate-300">
                  <thead className="bg-slate-950 text-[10px] font-bold uppercase tracking-wider text-slate-400 print:bg-slate-100 print:text-slate-800">
                    <tr>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Tag / Identificación</th>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Empresa Distribuidora</th>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Nivel Tensión</th>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Potencia Contratada</th>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Tipo Medición</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 print:divide-slate-200 text-slate-300 print:text-slate-850">
                    {puntosMedicion.map(e => (
                      <tr key={e.id} className="hover:bg-slate-900/50 print:hover:bg-transparent">
                        <td className="py-1.5 px-2.5 font-bold">{cleanElementName(e.nombre, e.id, e.codigo)}</td>
                        <td className="py-1.5 px-2.5">{e.empresaDistribuidora || '—'}</td>
                        <td className="py-1.5 px-2.5">{e.nivelTensionContrato || e.tensionNominal || '—'}</td>
                        <td className="py-1.5 px-2.5 font-mono">{e.potenciaContratada ? `${e.potenciaContratada} kVA` : '—'}</td>
                        <td className="py-1.5 px-2.5">{e.tipoMedicion || 'Indirecta (TCs/TPs)'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-[11px] text-slate-500 italic">No se registraron puntos de medición específicos en este proyecto.</p>
              )}
            </div>

            {/* Transformadores */}
            <div className="space-y-2 break-inside-avoid">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-200 print:text-slate-800 flex items-center justify-between">
                <span>2.2 Transformadores de Potencia</span>
                <span className="text-[10px] text-slate-500 font-normal">Total: {transformadores.length}</span>
              </h3>
              {transformadores.length > 0 ? (
                <table className="w-full text-[11px] text-left border border-slate-800 print:border-slate-300">
                  <thead className="bg-slate-950 text-[10px] font-bold uppercase tracking-wider text-slate-400 print:bg-slate-100 print:text-slate-800">
                    <tr>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Código / Nombre</th>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Ubicación</th>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Capacidad (kVA)</th>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Tensión Primaria / Secundaria</th>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Marca / Tipo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 print:divide-slate-200 text-slate-300 print:text-slate-850">
                    {transformadores.map(e => (
                      <tr key={e.id} className="hover:bg-slate-900/50 print:hover:bg-transparent">
                        <td className="py-1.5 px-2.5 font-bold flex items-center gap-1.5">
                          <span>{cleanElementName(e.nombre, e.id, e.codigo)}</span>
                          <span className="text-[9px] font-mono text-amber-400 print:text-slate-700">[{getElementCode(e, 'TRANSFORMADOR')}]</span>
                        </td>
                        <td className="py-1.5 px-2.5">{e.ubicacion || '—'}</td>
                        <td className="py-1.5 px-2.5 font-mono font-bold text-amber-400 print:text-slate-900">{e.datosTecnicos?.kva || e.datosTecnicos?.capacidadKva || '—'} kVA</td>
                        <td className="py-1.5 px-2.5">{e.datosTecnicos?.tensionPrimaria || '13.8 kV'} / {e.datosTecnicos?.tensionSecundaria || '208Y/120 V'}</td>
                        <td className="py-1.5 px-2.5">{e.datosTecnicos?.marca || '—'} ({e.datosTecnicos?.tipoRefrigeracion || 'Aceite'})</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-[11px] text-slate-500 italic">No se registraron transformadores específicos en este proyecto.</p>
              )}
            </div>

            {/* Generadores */}
            <div className="space-y-2 break-inside-avoid">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-200 print:text-slate-800 flex items-center justify-between">
                <span>2.3 Grupos Electrógenos / Generadores</span>
                <span className="text-[10px] text-slate-500 font-normal">Total: {generadores.length}</span>
              </h3>
              {generadores.length > 0 ? (
                <table className="w-full text-[11px] text-left border border-slate-800 print:border-slate-300">
                  <thead className="bg-slate-950 text-[10px] font-bold uppercase tracking-wider text-slate-400 print:bg-slate-100 print:text-slate-800">
                    <tr>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Código / Nombre</th>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Ubicación</th>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Potencia (kVA / kW)</th>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Combustible / Tanque</th>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Amperaje Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 print:divide-slate-200 text-slate-300 print:text-slate-850">
                    {generadores.map(e => (
                      <tr key={e.id} className="hover:bg-slate-900/50 print:hover:bg-transparent">
                        <td className="py-1.5 px-2.5 font-bold flex items-center gap-1.5">
                          <span>{cleanElementName(e.nombre, e.id, e.codigo)}</span>
                          <span className="text-[9px] font-mono text-amber-400 print:text-slate-700">[{getElementCode(e, 'GENERADOR')}]</span>
                        </td>
                        <td className="py-1.5 px-2.5">{e.ubicacion || '—'}</td>
                        <td className="py-1.5 px-2.5 font-mono font-bold text-amber-400 print:text-slate-900">{e.datosTecnicos?.kva || '—'} kVA / {e.datosTecnicos?.kw || '—'} kW</td>
                        <td className="py-1.5 px-2.5">{e.datosTecnicos?.combustible || 'Diésel'} ({e.datosTecnicos?.capacidadTanque || '—'})</td>
                        <td className="py-1.5 px-2.5 font-mono">{e.datosTecnicos?.amperaje || e.datosTecnicos?.amperajeNominal || '—'} A</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-[11px] text-slate-500 italic">No se registraron generadores en este proyecto.</p>
              )}
            </div>

            {/* Transferencias (ATS / MTS) */}
            <div className="space-y-2 break-inside-avoid">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-200 print:text-slate-800 flex items-center justify-between">
                <span>2.4 Sistemas de Transferencia (ATS / MTS)</span>
                <span className="text-[10px] text-slate-500 font-normal">Total: {transferencias.length}</span>
              </h3>
              {transferencias.length > 0 ? (
                <table className="w-full text-[11px] text-left border border-slate-800 print:border-slate-300">
                  <thead className="bg-slate-950 text-[10px] font-bold uppercase tracking-wider text-slate-400 print:bg-slate-100 print:text-slate-800">
                    <tr>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Código / Nombre</th>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Tipo de Operación</th>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Capacidad Nominal</th>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Controlador / Marca</th>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Ubicación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 print:divide-slate-200 text-slate-300 print:text-slate-850">
                    {transferencias.map(e => (
                      <tr key={e.id} className="hover:bg-slate-900/50 print:hover:bg-transparent">
                        <td className="py-1.5 px-2.5 font-bold flex items-center gap-1.5">
                          <span>{cleanElementName(e.nombre, e.id, e.codigo)}</span>
                          <span className="text-[9px] font-mono text-amber-400 print:text-slate-700">[{getElementCode(e, 'TRANSFER')}]</span>
                        </td>
                        <td className="py-1.5 px-2.5">{e.datosTecnicos?.tipoTransferencia || e.datosTecnicos?.tipo || 'Automática (ATS)'}</td>
                        <td className="py-1.5 px-2.5 font-mono font-bold text-amber-400 print:text-slate-900">{e.datosTecnicos?.amperajeNominal || e.datosTecnicos?.amperaje || e.datosTecnicos?.capacidadNominal || '—'} A</td>
                        <td className="py-1.5 px-2.5">{e.datosTecnicos?.marcaControlador || e.datosTecnicos?.marca || '—'}</td>
                        <td className="py-1.5 px-2.5">{e.ubicacion || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-[11px] text-slate-500 italic">No se registraron transferencias en este proyecto.</p>
              )}
            </div>

            {/* Tableros Eléctricos */}
            <div className="space-y-2 break-inside-avoid">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-200 print:text-slate-800 flex items-center justify-between">
                <span>2.5 Tableros de Distribución, Fuerza y Alumbrado</span>
                <span className="text-[10px] text-slate-500 font-normal">Total: {tableros.length}</span>
              </h3>
              {tableros.length > 0 ? (
                <table className="w-full text-[11px] text-left border border-slate-800 print:border-slate-300">
                  <thead className="bg-slate-950 text-[10px] font-bold uppercase tracking-wider text-slate-400 print:bg-slate-100 print:text-slate-800">
                    <tr>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Código / Nombre</th>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Ubicación</th>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Tensión / Polos</th>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Int. Principal / Barraje</th>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Potencia Estimada</th>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Alimentador</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 print:divide-slate-200 text-slate-300 print:text-slate-850">
                    {tableros.map(e => {
                      const pot = calcularPotenciaEstimadaTablero(e);
                      return (
                        <tr key={e.id} className="hover:bg-slate-900/50 print:hover:bg-transparent">
                          <td className="py-1.5 px-2.5 font-bold flex items-center gap-1.5">
                            <span>{cleanElementName(e.nombre, e.id, e.codigo)}</span>
                            <span className="text-[9px] font-mono text-amber-400 print:text-slate-700">[{getElementCode(e, 'TABLERO')}]</span>
                          </td>
                          <td className="py-1.5 px-2.5">{e.ubicacion || '—'}</td>
                          <td className="py-1.5 px-2.5">{e.datosTecnicos?.tensionNominal || e.tensionNominal || '208Y/120 V'} ({e.datosTecnicos?.maxPoles || '30'}P)</td>
                          <td className="py-1.5 px-2.5">{e.datosTecnicos?.capacidadBarraje || e.datosTecnicos?.amperajeNominal || e.datosTecnicos?.interruptorPrincipal || '—'}</td>
                          <td className="py-1.5 px-2.5 font-mono font-bold text-sky-400 print:text-slate-900">{pot.texto}</td>
                          <td className="py-1.5 px-2.5 text-[10px]">{e.alimentadoPor || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="text-[11px] text-slate-500 italic">No se registraron tableros eléctricos en este proyecto.</p>
              )}
            </div>

            {/* Bancos de Condensadores */}
            <div className="space-y-2 break-inside-avoid">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-200 print:text-slate-800 flex items-center justify-between">
                <span>2.6 Bancos de Condensadores (Compensación de Factor de Potencia)</span>
                <span className="text-[10px] text-slate-500 font-normal">Total: {bancosCondensadores.length}</span>
              </h3>
              {bancosCondensadores.length > 0 ? (
                <table className="w-full text-[11px] text-left border border-slate-800 print:border-slate-300">
                  <thead className="bg-slate-950 text-[10px] font-bold uppercase tracking-wider text-slate-400 print:bg-slate-100 print:text-slate-800">
                    <tr>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Tag / Nombre</th>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Ubicación</th>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Capacidad Total (kVAR)</th>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Tipo / Pasos</th>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Tensión</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 print:divide-slate-200 text-slate-300 print:text-slate-850">
                    {bancosCondensadores.map(e => (
                      <tr key={e.id} className="hover:bg-slate-900/50 print:hover:bg-transparent">
                        <td className="py-1.5 px-2.5 font-bold flex items-center gap-1.5">
                          <span>{cleanElementName(e.nombre, e.id, e.codigo)}</span>
                          <span className="text-[9px] font-mono text-amber-400 print:text-slate-700">[{getElementCode(e, 'BANCO_CONDENSADOR')}]</span>
                        </td>
                        <td className="py-1.5 px-2.5">{e.ubicacion || '—'}</td>
                        <td className="py-1.5 px-2.5 font-mono font-bold text-amber-400 print:text-slate-900">{e.datosTecnicos?.potenciaReactivaTotal ? `${e.datosTecnicos.potenciaReactivaTotal} kVAR` : '—'}</td>
                        <td className="py-1.5 px-2.5">{e.datosTecnicos?.tipoCompensacion || 'Automática'} {e.datosTecnicos?.numPasos ? `(${e.datosTecnicos.numPasos} pasos)` : ''}</td>
                        <td className="py-1.5 px-2.5">{e.datosTecnicos?.tensionNominal || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-[11px] text-slate-500 italic">No se registraron bancos de condensadores en este proyecto.</p>
              )}
            </div>

            {/* Centro Control de Motores (CCM) */}
            <div className="space-y-2 break-inside-avoid">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-200 print:text-slate-800 flex items-center justify-between">
                <span>2.7 Centros de Control de Motores (CCM)</span>
                <span className="text-[10px] text-slate-500 font-normal">Total: {ccmList.length}</span>
              </h3>
              {ccmList.length > 0 ? (
                <table className="w-full text-[11px] text-left border border-slate-800 print:border-slate-300">
                  <thead className="bg-slate-950 text-[10px] font-bold uppercase tracking-wider text-slate-400 print:bg-slate-100 print:text-slate-800">
                    <tr>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Tag CCM</th>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Planta / Área</th>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Marca / Fabricante</th>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Tensión</th>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Gavetas / Cargas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 print:divide-slate-200 text-slate-300 print:text-slate-850">
                    {ccmList.map(e => (
                      <tr key={e.id} className="hover:bg-slate-900/50 print:hover:bg-transparent">
                        <td className="py-1.5 px-2.5 font-bold flex items-center gap-1.5">
                          <span>{cleanElementName(e.nombre, e.id, e.codigo)}</span>
                          <span className="text-[9px] font-mono text-amber-400 print:text-slate-700">[{getElementCode(e, 'CCM')}]</span>
                        </td>
                        <td className="py-1.5 px-2.5">{e.plantaInstalacion || e.areaProceso || '—'}</td>
                        <td className="py-1.5 px-2.5">{e.fabricanteMarca || '—'}</td>
                        <td className="py-1.5 px-2.5">{e.parametrosElectricos?.tensionNominal || '480 V'}</td>
                        <td className="py-1.5 px-2.5 font-mono">{e.gavetasBucketLog?.length ? `${e.gavetasBucketLog.length} gavetas` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-[11px] text-slate-500 italic">No se registraron centros de control de motores en este proyecto.</p>
              )}
            </div>

            {/* Sistemas de Puesta a Tierra (PAT / Telurometría) */}
            <div className="space-y-2 break-inside-avoid">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-200 print:text-slate-800 flex items-center justify-between">
                <span>2.8 Sistemas de Puesta a Tierra (PAT / Telurometría)</span>
                <span className="text-[10px] text-slate-500 font-normal">Total: {puestasTierra.length}</span>
              </h3>
              {puestasTierra.length > 0 ? (
                <table className="w-full text-[11px] text-left border border-slate-800 print:border-slate-300">
                  <thead className="bg-slate-950 text-[10px] font-bold uppercase tracking-wider text-slate-400 print:bg-slate-100 print:text-slate-800">
                    <tr>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Tag / Malla</th>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Equipo Vinculado</th>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Resistencia Medida</th>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Criterio Normativo (IEEE 142 / CEN)</th>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Tipo Malla / Varillas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 print:divide-slate-200 text-slate-300 print:text-slate-850">
                    {puestasTierra.map(e => {
                      const res = parseFloat(e.datosTecnicos?.resistenciaOhms || e.datosTecnicos?.resistencia);
                      const isNorm = !isNaN(res) ? (res <= 5.0 ? '🟢 Conforme (≤5.0 Ω)' : res <= 10.0 ? '🟡 Aceptable (≤10.0 Ω)' : '🔴 No Conforme (>10.0 Ω)') : '—';
                      return (
                        <tr key={e.id} className="hover:bg-slate-900/50 print:hover:bg-transparent">
                          <td className="py-1.5 px-2.5 font-bold flex items-center gap-1.5">
                            <span>{cleanElementName(e.nombre, e.id, e.codigo)}</span>
                            <span className="text-[9px] font-mono text-amber-400 print:text-slate-700">[{getElementCode(e, 'PUESTA_TIERRA')}]</span>
                          </td>
                          <td className="py-1.5 px-2.5">{e.ubicacion || e.datosTecnicos?.equipoVinculado || '—'}</td>
                          <td className="py-1.5 px-2.5 font-mono font-bold text-amber-400 print:text-slate-900">
                            {!isNaN(res) ? `${res} Ω` : '—'}
                          </td>
                          <td className="py-1.5 px-2.5 font-bold text-[10px]">
                            {isNorm}
                          </td>
                          <td className="py-1.5 px-2.5">{e.datosTecnicos?.tipoSistemaPat || 'Malla PAT'} {e.datosTecnicos?.numVarillas ? `(${e.datosTecnicos.numVarillas} electrodos)` : ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="text-[11px] text-slate-500 italic">No se registraron sistemas de puesta a tierra en este proyecto.</p>
              )}
            </div>
          </div>
        </div>

        {/* ================= 4. JERARQUÍA DEL DIAGRAMA UNIFILAR ================= */}
        <div className="page-break-avoid py-6 px-4 md:px-6 space-y-4 print:py-2 print:px-0">
          <div className="border-b border-slate-800 pb-2 print:border-slate-300">
            <h2 className="text-base font-bold uppercase tracking-wider text-amber-500 print:text-slate-950 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" /> 3. Jerarquía y Diagrama Unifilar Gráfico (CAD)
            </h2>
          </div>
          
          <p className="text-xs text-slate-300 print:text-slate-800">
            A continuación se presenta la arquitectura unifilar y la matriz de alimentación eléctrica registrada en el proyecto, trazando el flujo de potencia aguas abajo desde las fuentes principales hasta los tableros seccionales:
          </p>

          <div className="w-full bg-white text-black rounded-xl shadow-sm border border-slate-200 print:border-slate-400 p-2 overflow-x-auto break-inside-avoid">
            <DiagramaUnifilarBlueprint
              elementos={elementos}
              companyName={company.nombre}
              projectName={proyecto.nombre}
              interactive={false}
            />
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3 print:bg-slate-50 print:border-slate-300 print:p-3 break-inside-avoid">
            <span className="text-[10px] font-bold text-slate-400 print:text-slate-700 uppercase tracking-wider block">
              Matriz de Alimentación y Enlaces Aguas Abajo:
            </span>
            {elementos.length > 0 ? (
              <div className="space-y-2">
                {elementos.map(e => {
                  const feeds = elementos.filter(child => {
                    if (child.datosTecnicos?.alimentadoPorIds && Array.isArray(child.datosTecnicos.alimentadoPorIds)) {
                      if (child.datosTecnicos.alimentadoPorIds.includes(e.id)) return true;
                    }
                    if (!child.alimentadoPor) return false;
                    if (child.alimentadoPor === e.nombre) return true;
                    return child.alimentadoPor.split(',').some(part => {
                      const p = part.trim().toLowerCase();
                      return p.includes(e.nombre.toLowerCase()) || (e.id && p.includes(e.id.toLowerCase()));
                    });
                  });
                  return (
                    <div key={e.id} className="border-l-2 border-amber-500/40 pl-3 py-1 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-100 print:text-slate-900 uppercase">
                          {cleanElementName(e.nombre, e.id, e.codigo)}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 uppercase font-mono print:bg-white print:border-slate-300 print:text-slate-800">
                          ID: {getElementCode(e, e.tipoElemento)}
                        </span>
                        <span className="text-[9px] text-slate-500">({e.tipoElemento})</span>
                        {e.alimentadoPor && (
                          <span className="text-[9px] text-slate-400 print:text-slate-600">
                            &bull; Aguas arriba: <strong className="text-slate-300 print:text-slate-800">{e.alimentadoPor}</strong>
                          </span>
                        )}
                      </div>

                      {feeds.length > 0 && (
                        <div className="pl-4 mt-1 space-y-0.5">
                          <span className="text-[9px] font-semibold text-slate-500 uppercase block">Alimenta aguas abajo:</span>
                          {feeds.map(child => (
                            <div key={child.id} className="flex items-center gap-1.5 text-[11px] text-slate-400 print:text-slate-700">
                              <span>↳</span>
                              <span className="font-semibold text-slate-200 print:text-slate-900">{cleanElementName(child.nombre, child.id, child.codigo)}</span>
                              <span className="text-[8px] font-mono text-amber-400 print:text-slate-800">[{getElementCode(child, child.tipoElemento)}]</span>
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

        {/* ================= 5. FICHAS TÉCNICAS DETALLADAS ================= */}
        <div className="space-y-8 print:space-y-4">
          <div className="border-b border-slate-800 pb-2 print:border-slate-300 px-4 md:px-6 print:px-0">
            <h2 className="text-base font-bold uppercase tracking-wider text-amber-500 print:text-slate-950 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-500" /> 4. Fichas Técnicas de Inspección Detallada por Equipo
            </h2>
          </div>

          {/* Elementos Unifilares */}
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
              <div key={item.id} className="break-inside-avoid pt-4 space-y-3 px-4 md:px-6 print:px-0">
                <div className="border-b border-amber-500/80 pb-2 flex justify-between items-center print:border-slate-700 print:pb-1 bg-slate-900/40 print:bg-slate-100 p-2.5 rounded-t-xl print:rounded-none">
                  <div>
                    <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest block print:text-slate-600">
                      Ficha #{idx + 1} &bull; {item.tipoElemento || 'TABLERO'}
                    </span>
                    <h3 className="text-sm font-black text-slate-100 print:text-slate-950 uppercase">
                      {cleanElementName(item.nombre, item.id, item.codigo)}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded print:border-slate-400 print:text-slate-900 print:bg-white">
                      ID: {getElementCode(item, item.tipoElemento)}
                    </span>
                    {isTablero && (
                      <span className="text-[11px] font-mono font-bold text-sky-400 bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 rounded print:border-slate-400 print:text-slate-900 print:bg-white">
                        ⚡ {calcularPotenciaEstimadaTablero(enrichedElement).texto}
                      </span>
                    )}
                  </div>
                </div>

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
            <div key={sub.id} className="break-inside-avoid pt-4 space-y-3 px-4 md:px-6 print:px-0">
              <div className="border-b border-amber-500/80 pb-2 flex justify-between items-center print:border-slate-700 print:pb-1 bg-slate-900/40 print:bg-slate-100 p-2.5 rounded-t-xl print:rounded-none">
                <div>
                  <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest block print:text-slate-600">
                    Subestación #{idx + 1} &bull; Obras Civiles y Transformación
                  </span>
                  <h3 className="text-sm font-black text-slate-100 print:text-slate-950 uppercase">
                    {cleanElementName(sub.nombre, sub.id, sub.codigo)}
                  </h3>
                </div>
                <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded print:border-slate-400 print:text-slate-900 print:bg-white">
                  ID: {getElementCode(sub, 'SUBESTACION')}
                </span>
              </div>

              <div className={isEditingReport ? "" : "pointer-events-none select-none"}>
                <SubestacionComponent
                  subestacionData={sub}
                  onUpdate={(updatedData) => handleUpdateSubestacion(sub.id, updatedData)}
                />
              </div>
            </div>
          ))}

          {/* Puntos de Medición */}
          {puntosMedicion.map((pm, idx) => (
            <div key={pm.id} className="break-inside-avoid pt-4 space-y-3 px-4 md:px-6 print:px-0">
              <div className="border-b border-amber-500/80 pb-2 flex justify-between items-center print:border-slate-700 print:pb-1 bg-slate-900/40 print:bg-slate-100 p-2.5 rounded-t-xl print:rounded-none">
                <div>
                  <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest block print:text-slate-600">
                    Punto de Medición #{idx + 1} &bull; Parámetros de Suministro y Metrología
                  </span>
                  <h3 className="text-sm font-black text-slate-100 print:text-slate-950 uppercase">
                    {cleanElementName(pm.nombre, pm.id, pm.codigo)}
                  </h3>
                </div>
                <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded print:border-slate-400 print:text-slate-900 print:bg-white">
                  ID: {getElementCode(pm, 'PUNTO_MEDICION')}
                </span>
              </div>

              <div className={isEditingReport ? "" : "pointer-events-none select-none"}>
                <PuntoMedicionComponent
                  puntoData={pm}
                  onUpdate={(updatedData) => updatePuntoMedicion(proyectoId, pm.id, updatedData)}
                />
              </div>
            </div>
          ))}

          {/* CCMs */}
          {ccmList.map((ccm, idx) => (
            <div key={ccm.id} className="break-inside-avoid pt-4 space-y-3 px-4 md:px-6 print:px-0">
              <div className="border-b border-amber-500/80 pb-2 flex justify-between items-center print:border-slate-700 print:pb-1 bg-slate-900/40 print:bg-slate-100 p-2.5 rounded-t-xl print:rounded-none">
                <div>
                  <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest block print:text-slate-600">
                    CCM #{idx + 1} &bull; Centro de Control de Motores y Gavetas
                  </span>
                  <h3 className="text-sm font-black text-slate-100 print:text-slate-950 uppercase">
                    {cleanElementName(ccm.nombre, ccm.id, ccm.codigo)}
                  </h3>
                </div>
                <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded print:border-slate-400 print:text-slate-900 print:bg-white">
                  ID: {getElementCode(ccm, 'CCM')}
                </span>
              </div>

              <div className={isEditingReport ? "" : "pointer-events-none select-none"}>
                <CcmComponent
                  ccmData={ccm}
                  onUpdate={(updatedData) => updateCcm(proyectoId, ccm.id, updatedData)}
                />
              </div>
            </div>
          ))}
        </div>

        {/* ================= 6. RECOMENDACIONES, RESUMEN & FIRMAS ================= */}
        <div className="page-break-avoid py-6 px-4 md:px-6 space-y-6 print:py-2 print:px-0">
          <div className="border-b border-slate-800 pb-2 print:border-slate-300">
            <h2 className="text-base font-bold uppercase tracking-wider text-amber-500 print:text-slate-950 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-amber-500" /> 5. Conclusiones y Resumen de Hallazgos Técnicos
            </h2>
          </div>

          <table className="w-full text-[11px] text-left border border-slate-800 print:border-slate-300">
            <thead className="bg-slate-950 text-[10px] font-bold uppercase tracking-wider text-slate-400 print:bg-slate-100 print:text-slate-800">
              <tr>
                <th className="py-2 px-3 border-b border-slate-800 print:border-slate-300 w-1/3">Área / Equipo Auditado</th>
                <th className="py-2 px-3 border-b border-slate-800 print:border-slate-300">Observaciones Técnicas y Diagnóstico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 print:divide-slate-200 text-slate-300 print:text-slate-800">
              {elementos.map(e => (
                <tr key={e.id} className="hover:bg-slate-900/50 print:hover:bg-transparent">
                  <td className="py-2 px-3 font-bold uppercase">
                    {cleanElementName(e.nombre, e.id, e.codigo)} <span className="text-[9px] text-slate-500 font-normal">({e.tipoElemento})</span>
                  </td>
                  <td className="py-2 px-3 leading-relaxed">
                    {isEditingReport ? (
                      <textarea
                        value={e.observacionesGenerales || ''}
                        onChange={(eVal) => handleUpdateElementoObservaciones(e.id, eVal.target.value)}
                        placeholder="Edite los hallazgos del equipo..."
                        rows={2}
                        className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-slate-100 rounded px-2 py-1 text-xs outline-none"
                      />
                    ) : (
                      e.observacionesGenerales || 'El equipo presenta condiciones operativas conformes con normas de distribución eléctrica.'
                    )}
                  </td>
                </tr>
              ))}
              {subestaciones.map(s => (
                <tr key={s.id} className="hover:bg-slate-900/50 print:hover:bg-transparent">
                  <td className="py-2 px-3 font-bold uppercase">
                    SUBESTACIÓN: {cleanElementName(s.nombre, s.id, s.codigo)}
                  </td>
                  <td className="py-2 px-3 leading-relaxed">
                    {isEditingReport ? (
                      <textarea
                        value={s.observacionesGenerales || ''}
                        onChange={(eVal) => handleUpdateSubestacionObservaciones(s.id, eVal.target.value)}
                        placeholder="Edite los hallazgos de la subestación..."
                        rows={2}
                        className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-slate-100 rounded px-2 py-1 text-xs outline-none"
                      />
                    ) : (
                      s.observacionesGenerales || 'Obras civiles, transformador y cerramientos de seguridad verificados en campo.'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ================= 7. CAJETÍN DE FIRMAS Y APROBACIÓN EJECUTIVA ================= */}
          <div className="pt-8 border-t border-slate-800 print:border-slate-300 break-inside-avoid">
            <span className="text-[10px] font-bold text-amber-500 print:text-slate-600 uppercase tracking-widest block mb-6 text-center">
              6. Validación y Aprobación de Ingeniería Eléctrica
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-center px-4">
              <div className="space-y-2 flex flex-col items-center">
                <div className="w-56 border-b-2 border-slate-700 print:border-slate-900 h-16 mb-2"></div>
                <span className="text-xs font-bold text-slate-100 print:text-slate-950 uppercase block">
                  {responsableNombre}
                </span>
                <span className="text-[10px] text-slate-400 print:text-slate-600 block">
                  Ingeniero Auditor / Responsable Técnico del Proyecto
                </span>
                <span className="text-[9px] font-mono text-slate-500 print:text-slate-600 block">
                  Tel: {responsableTelefono} &bull; Email: {responsableEmail}
                </span>
              </div>

              <div className="space-y-2 flex flex-col items-center">
                <div className="w-56 border-b-2 border-slate-700 print:border-slate-900 h-16 mb-2"></div>
                <span className="text-xs font-bold text-slate-100 print:text-slate-950 uppercase block">
                  {company.nombre}
                </span>
                <span className="text-[10px] text-slate-400 print:text-slate-600 block">
                  Representante Autorizado / Recepción de Auditoría
                </span>
                <span className="text-[9px] text-slate-500 print:text-slate-600 block">
                  Fecha de Conformidad: ____ / ____ / {currentYear}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
