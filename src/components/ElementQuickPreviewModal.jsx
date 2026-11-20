import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore, {
  cleanElementName,
  getSimpleElementCode,
  resolveElementParentDisplay,
  resolveElementAlimentaADisplay
} from '../store/useStore';
import { calcularPorcentajeAvance } from '../utils/calcularAvance';
import {
  X,
  Zap,
  Building2,
  Cpu,
  Layers,
  Radio,
  ArrowRightLeft,
  Flame,
  MapPin,
  GitBranch,
  ExternalLink,
  CheckCircle2,
  Info,
  Gauge,
  ShieldCheck,
  FileText
} from 'lucide-react';

const getTypeMeta = (tipo) => {
  switch (String(tipo || '').toUpperCase()) {
    case 'RED_PUBLICA':
      return { label: 'Red Pública Nacional', icon: Zap, badge: 'bg-sky-500/15 text-sky-300 border-sky-500/40', accent: 'text-sky-400' };
    case 'SUBESTACION':
      return { label: 'Subestación Eléctrica', icon: Building2, badge: 'bg-rose-500/15 text-rose-300 border-rose-500/40', accent: 'text-rose-400' };
    case 'TRANSFORMADOR':
      return { label: 'Transformador de Potencia', icon: Zap, badge: 'bg-amber-500/15 text-amber-300 border-amber-500/40', accent: 'text-amber-400' };
    case 'CCM':
      return { label: 'Centro de Control de Motores (CCM)', icon: Cpu, badge: 'bg-purple-500/15 text-purple-300 border-purple-500/40', accent: 'text-purple-400' };
    case 'TABLERO':
      return { label: 'Tablero / Panel Eléctrico', icon: Layers, badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40', accent: 'text-cyan-400' };
    case 'GENERADOR':
      return { label: 'Grupo Electrógeno / Generador', icon: Flame, badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40', accent: 'text-emerald-400' };
    case 'TRANSFER':
      return { label: 'Transferencia (ATS / MTS)', icon: ArrowRightLeft, badge: 'bg-teal-500/15 text-teal-300 border-teal-500/40', accent: 'text-teal-400' };
    case 'BANCO_CONDENSADOR':
      return { label: 'Banco de Condensadores', icon: Gauge, badge: 'bg-amber-500/15 text-amber-300 border-amber-500/40', accent: 'text-amber-400' };
    case 'PUNTO_MEDICION':
    case 'PUNTO_SUMINISTRO':
      return { label: 'Punto de Suministro / Medición', icon: Radio, badge: 'bg-blue-500/15 text-blue-300 border-blue-500/40', accent: 'text-blue-400' };
    default:
      return { label: tipo || 'Elemento Eléctrico', icon: Zap, badge: 'bg-slate-500/15 text-slate-300 border-slate-500/40', accent: 'text-slate-400' };
  }
};

const collectProjectElements = (proyecto) => {
  if (!proyecto) return [];
  const seen = new Set();
  const list = [];
  const push = (item, defaultTipo) => {
    if (!item || !item.id) return;
    const key = String(item.id);
    if (seen.has(key)) return;
    seen.add(key);
    list.push({ ...item, tipoElemento: item.tipoElemento || item.tipo || defaultTipo });
  };
  (proyecto.elementosUnifilares || []).forEach((e) => push(e, e.tipoElemento || 'TABLERO'));
  (proyecto.tableros || []).forEach((t) => push(t, 'TABLERO'));
  (proyecto.inspeccionesSubestacion || proyecto.subestaciones || []).forEach((s) => push(s, 'SUBESTACION'));
  (proyecto.puntosMedicion || []).forEach((p) => push(p, 'PUNTO_MEDICION'));
  (proyecto.ccmList || []).forEach((c) => push(c, 'CCM'));
  return list;
};

const pickValue = (dt, el, keys) => {
  for (const k of keys) {
    const val = dt?.[k] ?? el?.[k];
    if (val !== undefined && val !== null && String(val).trim() !== '' && String(val).trim() !== '—') {
      return String(val).trim();
    }
  }
  return '';
};

const buildTechnicalSpecs = (el, tipo) => {
  const dt = el?.datosTecnicos || el?.parametrosElectricos || {};
  const t = String(tipo || '').toUpperCase();
  const specs = [];

  const addSpec = (label, keys, suffix = '') => {
    const val = pickValue(dt, el, keys);
    if (val) {
      specs.push({ label, value: suffix && !val.toLowerCase().includes(suffix.toLowerCase()) ? `${val} ${suffix}` : val });
    }
  };

  if (t === 'TRANSFORMADOR') {
    addSpec('Potencia Nominal', ['potenciaKva', 'potenciaNominal', 'capacidadKva', 'capacidad'], 'kVA');
    addSpec('Tensión Primaria', ['tensionPrimaria', 'voltajePrimario', 'nivelTension']);
    addSpec('Tensión Secundaria', ['tensionSecundaria', 'voltajeSecundario', 'tensionNominal']);
    addSpec('Tipo / Refrigeración', ['tipoTransformador', 'refrigeracion', 'tipoRefrigeracion', 'aislamiento']);
    addSpec('Grupo de Conexión', ['grupoConexion', 'conexion']);
    addSpec('Impedancia (%)', ['impedancia', 'impedanciaPorcentaje'], '%');
    addSpec('Fases / Frecuencia', ['fases', 'frecuencia']);
    addSpec('Marca / Fabricante', ['marca', 'fabricante']);
    addSpec('N° de Serie', ['numeroSerie', 'serial', 'serie']);
    addSpec('Puesta a Tierra', ['puestaTierra', 'sistemaTierra', 'estadoPuestaTierra']);
  } else if (t === 'TABLERO') {
    addSpec('Tensión Nominal', ['tensionNominal', 'nivelTension', 'tension', 'voltaje']);
    addSpec('Breaker Principal', ['breakerPrincipal', 'capacidadBreaker', 'amperajePrincipal', 'interruptorPrincipal'], 'A');
    addSpec('Fases / Hilos', ['fasesHilos', 'fases', 'sistema']);
    addSpec('Capacidad de Barras', ['capacidadBarras', 'corrienteBarras', 'barras']);
    addSpec('Nivel Cortocircuito', ['icc', 'capacidadRuptura', 'cortocircuito']);
    addSpec('Marca / Gabinete', ['marca', 'fabricante', 'tipoGabinete']);
    const circuitosCount = Array.isArray(el?.circuitos) ? el.circuitos.length : 0;
    if (circuitosCount > 0) {
      specs.push({ label: 'Circuitos Registrados', value: `${circuitosCount} circuitos` });
    }
  } else if (t === 'TRANSFER') {
    addSpec('Tipo de Transferencia', ['tipoTransfer', 'tipoTransferencia', 'tipo']);
    addSpec('Amperaje Nominal', ['amperaje', 'capacidadNominal', 'corrienteNominal'], 'A');
    addSpec('Tensión Nominal', ['tensionNominal', 'nivelTension', 'voltaje']);
    addSpec('Modo de Operación', ['modoOperacion', 'operacion']);
    addSpec('Fuente Normal', ['fuenteNormalNombre']);
    addSpec('Fuente Emergencia', ['fuenteEmergenciaNombre']);
    addSpec('Marca / Modelo', ['marca', 'modelo']);
  } else if (t === 'GENERADOR') {
    addSpec('Potencia Nominal', ['potenciaKva', 'potenciaKw', 'capacidad', 'potenciaNominal'], 'kVA');
    addSpec('Tensión Nominal', ['tensionNominal', 'nivelTension', 'voltaje']);
    addSpec('Combustible', ['combustible', 'tipoCombustible']);
    addSpec('Breaker de Salida', ['breakerSalida', 'amperajeBreaker', 'capacidadBreaker'], 'A');
    addSpec('Marca / Modelo', ['marca', 'modelo']);
    addSpec('N° de Serie', ['numeroSerie', 'serial']);
  } else if (t === 'PUNTO_MEDICION' || t === 'PUNTO_SUMINISTRO') {
    addSpec('Tipo de Medición', ['tipoMedicion']);
    addSpec('Tensión Nominal', ['tensionNominal', 'nivelTension']);
    addSpec('Serial de Medición', ['serialMedicion', 'numeroSerieAno']);
    addSpec('Relación TC / TP', ['relacionTransformacion']);
    addSpec('Marca / Modelo Medidor', ['marcaModeloMedidor', 'marca']);
    addSpec('Conductor Acometida', ['calibreConductor', 'tipoConductor']);
  } else {
    addSpec('Tensión Nominal', ['tensionNominal', 'nivelTension', 'tension', 'voltaje']);
    addSpec('Capacidad / Potencia', ['capacidad', 'potenciaKva', 'amperaje', 'corrienteNominal']);
    addSpec('Breaker / Protección', ['breakerPrincipal', 'capacidadBreaker']);
    addSpec('Marca / Fabricante', ['marca', 'fabricante', 'modelo']);
    addSpec('N° de Serie', ['numeroSerie', 'serial', 'numeroSerieAno']);
  }

  return specs;
};

export default function ElementQuickPreviewModal({ elementRef, proyectoId, onClose }) {
  const navigate = useNavigate();
  const companies = useStore((state) => state.companies);

  const resolved = useMemo(() => {
    if (!elementRef) return null;

    const refObj = typeof elementRef === 'object' ? elementRef : { id: elementRef };
    const refId = refObj.id ? String(refObj.id) : null;
    const refName = refObj.nombre ? String(refObj.nombre).trim().toUpperCase() : '';
    const refCode = refObj.codigo ? String(refObj.codigo).trim().toLowerCase() : '';

    if (
      refObj.isCorpoelec ||
      refId === 'CORPOELEC' ||
      refName === 'CORPOELEC' ||
      refName.includes('CORPOELEC')
    ) {
      return { kind: 'CORPOELEC' };
    }

    let foundEl = null;
    let foundCompanyId = null;
    let foundProject = null;
    let projectElements = [];

    const searchInProject = (comp, proj) => {
      const list = collectProjectElements(proj);
      let match = null;
      if (refId) {
        match = list.find((item) => String(item.id) === refId);
      }
      if (!match && refCode) {
        match = list.find((item) => {
          const itemCode = String(item.codigo || getSimpleElementCode(item, item.tipoElemento, list) || '').toLowerCase();
          return itemCode === refCode;
        });
      }
      if (!match && refName) {
        const cleanedRef = cleanElementName(refName).toUpperCase();
        match = list.find((item) => {
          const itemClean = cleanElementName(item.nombre, item.id, item.codigo).toUpperCase();
          return itemClean === cleanedRef || String(item.nombre || '').toUpperCase() === refName;
        });
      }
      if (match) {
        foundEl = match;
        foundCompanyId = comp.id;
        foundProject = proj;
        projectElements = list;
        return true;
      }
      return false;
    };

    if (proyectoId) {
      for (const comp of companies || []) {
        const proj = (comp.proyectos || []).find((p) => String(p.id) === String(proyectoId));
        if (proj && searchInProject(comp, proj)) break;
      }
    }

    if (!foundEl) {
      for (const comp of companies || []) {
        for (const proj of comp.proyectos || []) {
          if (searchInProject(comp, proj)) break;
        }
        if (foundEl) break;
      }
    }

    if (!foundEl) {
      return {
        kind: 'MANUAL',
        nombre: refObj.nombre || refId || 'Elemento externo',
        tipoElemento: refObj.tipoElemento || 'MANUAL',
        codigo: refObj.codigo || null
      };
    }

    const tipo = foundEl.tipoElemento || foundEl.tipo || 'TABLERO';
    const simpleCode = getSimpleElementCode(foundEl, tipo, projectElements);
    const nombreLimpio = cleanElementName(foundEl.nombre, foundEl.id, simpleCode || foundEl.codigo).toUpperCase();
    const upstreamDisplay = resolveElementParentDisplay(foundEl, projectElements);
    const downstreamList = resolveElementAlimentaADisplay(foundEl, projectElements);
    const avanceRaw = calcularPorcentajeAvance(foundEl, tipo);
    const avance =
      typeof avanceRaw === 'object' && avanceRaw !== null
        ? Number(avanceRaw.porcentaje) || 0
        : Number(avanceRaw) || 0;
    const specs = buildTechnicalSpecs(foundEl, tipo);

    return {
      kind: 'ELEMENT',
      element: foundEl,
      companyId: foundCompanyId,
      projectName: foundProject?.nombre || '',
      tipo,
      simpleCode,
      nombreLimpio,
      ubicacion: foundEl.ubicacion || foundEl.datosTecnicos?.ubicacion || foundEl.plantaInstalacion || 'No definida',
      upstreamDisplay,
      downstreamList,
      avance,
      specs,
      observaciones: foundEl.observacionesGenerales || foundEl.datosTecnicos?.observacionesGenerales || ''
    };
  }, [elementRef, proyectoId, companies]);

  if (!elementRef || !resolved) return null;

  const meta =
    resolved.kind === 'CORPOELEC'
      ? getTypeMeta('RED_PUBLICA')
      : getTypeMeta(resolved.kind === 'ELEMENT' ? resolved.tipo : resolved.tipoElemento);
  const Icon = meta.icon;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[88vh] bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-amber-500/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="px-4 py-3.5 sm:px-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2 rounded-xl border shrink-0 ${meta.badge}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-mono font-black uppercase tracking-widest ${meta.accent}`}>
                  {meta.label}
                </span>
                {resolved.kind === 'ELEMENT' && resolved.simpleCode && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono text-[10px] font-bold lowercase">
                    {resolved.simpleCode}
                  </span>
                )}
              </div>
              <h3 className="text-sm sm:text-base font-black text-slate-100 truncate uppercase">
                {resolved.kind === 'CORPOELEC'
                  ? 'CORPOELEC — Red Eléctrica Nacional'
                  : resolved.kind === 'ELEMENT'
                  ? resolved.nombreLimpio
                  : resolved.nombre}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all cursor-pointer shrink-0"
            title="Cerrar vista rápida"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {resolved.kind === 'CORPOELEC' && (
            <div className="p-4 rounded-xl bg-sky-950/30 border border-sky-500/30 space-y-2">
              <div className="flex items-center gap-2 text-sky-300 font-bold">
                <ShieldCheck className="w-4 h-4 text-sky-400" />
                <span>Suministro Eléctrico Externo Fijo</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Fuente primaria de alimentación proveniente de la red de distribución pública nacional (<strong>CORPOELEC</strong>). Este nodo representa la acometida externa aguas arriba del sistema.
              </p>
            </div>
          )}

          {resolved.kind === 'MANUAL' && (
            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold">
                <Info className="w-4 h-4 text-amber-400" />
                <span>Referencia Manual / Externa</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Este vínculo corresponde a una etiqueta manual (<strong>{resolved.nombre}</strong>) que aún no está registrada como un equipo independiente dentro del proyecto.
              </p>
            </div>
          )}

          {resolved.kind === 'ELEMENT' && (
            <>
              {/* Resumen de Ubicación y Avance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    Ubicación / Área
                  </span>
                  <p className="font-bold text-slate-100 uppercase truncate" title={resolved.ubicacion}>
                    {resolved.ubicacion}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Progreso de Ficha
                    </span>
                    <span className="font-mono font-black text-emerald-400">{resolved.avance}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, resolved.avance))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Jerarquía del Elemento */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400 flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-sky-400" />
                  Jerarquía Eléctrica del Equipo
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Alimentado por:</span>
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold text-[11px]">
                      {resolved.upstreamDisplay || 'Sin alimentador vinculado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Alimenta a:</span>
                    {resolved.downstreamList && resolved.downstreamList.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {resolved.downstreamList.map((child, idx) => (
                          <span
                            key={`${child.id || child.nombre}-${idx}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-200 font-bold text-[10px]"
                          >
                            <span className="truncate max-w-[150px]">{child.nombre}</span>
                            {child.code && <span className="text-amber-400 lowercase">({child.code})</span>}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-500 italic text-[11px]">Sin cargas vinculadas aguas abajo</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Datos Técnicos Clave */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase text-amber-400 tracking-wider block">
                  Datos Técnicos Principales
                </span>
                {resolved.specs.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {resolved.specs.map((spec, idx) => (
                      <div
                        key={`${spec.label}-${idx}`}
                        className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/90"
                      >
                        <span className="text-[9.5px] font-mono font-bold uppercase text-slate-400 block">
                          {spec.label}
                        </span>
                        <span className="text-xs font-black font-mono text-slate-100 mt-0.5 block break-words">
                          {spec.value}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 text-slate-400 italic">
                    Aún no se han registrado parámetros técnicos detallados en este equipo.
                  </div>
                )}
              </div>

              {/* Observaciones */}
              {resolved.observaciones && (
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Observaciones
                  </span>
                  <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">{resolved.observaciones}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Pie */}
        <div className="px-4 py-3 sm:px-5 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
          {resolved.kind === 'ELEMENT' && resolved.companyId && resolved.element?.id && (
            <button
              type="button"
              onClick={() => {
                const targetUrl = `/empresa/${resolved.companyId}/tablero/${resolved.element.id}`;
                onClose();
                navigate(targetUrl);
              }}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Abrir Ficha Completa
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

