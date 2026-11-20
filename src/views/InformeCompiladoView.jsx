import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore, {
  getElementCode,
  cleanElementName,
  sortElementsByOrder,
  resolveElementParentDisplay,
  resolveElementAlimentaADisplay,
  resolveElementUbicacionDisplay,
  isPlaceholderHierarchyValue
} from '../store/useStore';
import { calcularPotenciaEstimadaTablero } from '../utils/potenciaTablero';
import TableroComponent from '../components/TableroComponent';
import FichaTecnicaComponent from '../components/FichaTecnicaComponent';
import TransferComponent from '../components/TransferComponent';
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
  Layers,
  Cpu,
  Edit,
  Check,
  User,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  FileCheck,
  Filter,
  ShieldAlert,
  CheckCircle2,
  Plus,
  Trash2,
  X
} from 'lucide-react';

const REPORT_FILTER_ORDER = [
  { id: 'ALL', label: 'Todos' },
  { id: 'TABLERO', label: 'Paneles Eléctricos' },
  { id: 'PUNTO_SUMINISTRO', label: 'Puntos de Suministro' },
  { id: 'TRANSFORMADOR', label: 'Transformadores' },
  { id: 'TRANSFER', label: 'Transferencias' },
  { id: 'GENERADOR', label: 'Generadores' },
  { id: 'CCM', label: 'CCM' },
  { id: 'BANCO_CONDENSADOR', label: 'Bancos Cond.' },
  { id: 'INSPECCIONES', label: 'Inspecciones Técnicas' }
];

const parseDtSafe = (raw) => {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof raw === 'object' ? raw : {};
};

const cleanDisplayVal = (val, fallback = '—') => {
  if (isPlaceholderHierarchyValue(val)) return fallback;
  return String(val).trim();
};

const getInspeccionMeta = (sub) => {
  const raw = String(sub?.tipoElemento || sub?.tipo || '').trim().toUpperCase();
  if (raw === 'TERMOGRAFICA') {
    const eq = sub?.equiposPrincipales || {};
    const dtVal = eq.deltaT !== undefined && eq.deltaT !== '' ? `${eq.deltaT} °C` : '—';
    return {
      key: 'TERMOGRAFICA',
      badge: 'Termografía',
      resumen: `ΔT: ${dtVal} | Severidad: ${eq.severidadNeta || 'NORMAL'}${eq.camaraModelo ? ` | Cámara: ${eq.camaraModelo}` : ''}`
    };
  }
  if (raw === 'SISTEMA_ATERRAMIENTO' || raw === 'PUESTA_TIERRA') {
    const pat = sub?.puestaTierra || {};
    const res = pat.resistenciaOhms ? `${pat.resistenciaOhms} Ω` : '—';
    return {
      key: 'SISTEMA_ATERRAMIENTO',
      badge: 'Aterramiento (SPAT)',
      resumen: `R: ${res} | ${pat.cumplimientoIeee80 || pat.metodoMedicion || 'IEEE 80'}`
    };
  }
  if (raw === 'TANQUE_COMBUSTIBLE') {
    const ent = sub?.estadoEntorno || {};
    return {
      key: 'TANQUE_COMBUSTIBLE',
      badge: 'Tanque Combustible',
      resumen: `${ent.tipoCombustible || 'DIÉSEL'} | Cap: ${ent.capacidadLitros || '—'} L (${ent.nivelPorcentaje || '—'}%)${ent.autonomiaHorasCalculada ? ` | Autonomía: ${ent.autonomiaHorasCalculada} h` : ''}`
    };
  }

  // Obras Civiles / Subestación
  const sections = ['estadoEntorno', 'obrasCiviles', 'equiposPrincipales', 'puestaTierra', 'edificioControl'];
  let badCount = 0;
  let regularCount = 0;
  sections.forEach((sec) => {
    const secObj = sub?.[sec];
    if (secObj && typeof secObj === 'object') {
      Object.values(secObj).forEach((entry) => {
        if (entry && typeof entry === 'object') {
          if (entry.estado === 'M') badCount += 1;
          else if (entry.estado === 'R') regularCount += 1;
        }
      });
    }
  });
  const novedadesTxt = (badCount + regularCount) > 0
    ? `${badCount} Malo(s), ${regularCount} Regular(es)`
    : 'Ítems conformes';

  return {
    key: 'AMBIENTAL_FISICA',
    badge: 'Subestación / Ambiental',
    resumen: `${sub?.nivelTension || 'S/T'} | ${novedadesTxt}`
  };
};

const extractObservationText = (item) => {
  if (!item || typeof item !== 'object') return '';
  const dt = parseDtSafe(item.datosTecnicos);
  const direct = [
    item.observacionesGenerales,
    item.observaciones,
    dt.observacionTransferencia,
    dt.observacionesGenerales,
    dt.observaciones
  ].find((v) => !isPlaceholderHierarchyValue(v));
  if (direct) return String(direct).trim();

  if (Array.isArray(item.hallazgosCriticos) && item.hallazgosCriticos.length > 0) {
    return item.hallazgosCriticos
      .map((h) => (typeof h === 'string' ? h : (h?.descripcion || h?.hallazgo || h?.equipo || '')))
      .filter(Boolean)
      .join('; ');
  }
  return '';
};

export default function InformeCompiladoView() {
  const { companyId, proyectoId } = useParams();
  const navigate = useNavigate();
  const { companies, updateElementoUnifilar, updateSubestacion, updatePuntoMedicion, updateCcm } = useStore();

  const company = companies.find((c) => c.id === companyId);
  const proyecto = company?.proyectos?.find((p) => p.id === proyectoId);

  const reportStorageKey = proyectoId ? `selectric_report_meta_${proyectoId}` : null;

  // Modo Edición y Filtro del Informe
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [elementTypeFilter, setElementTypeFilter] = useState('ALL');
  const [coverTitle, setCoverTitle] = useState('INFORME TÉCNICO DE AUDITORÍA ELÉCTRICA Y DIAGRAMA UNIFILAR');
  const [coverSubtitle, setCoverSubtitle] = useState('Levantamiento de Campo, Evaluación de Cargas y Conformidad Normativa');
  const [introText, setIntroText] = useState('');
  const [customRecommendations, setCustomRecommendations] = useState(null);
  const [newRecommendationText, setNewRecommendationText] = useState('');

  // Cargar textos editados persistidos en localStorage si existen
  useEffect(() => {
    if (!reportStorageKey) return;
    try {
      const saved = localStorage.getItem(reportStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.coverTitle) setCoverTitle(parsed.coverTitle);
        if (parsed.coverSubtitle) setCoverSubtitle(parsed.coverSubtitle);
        if (parsed.introText) setIntroText(parsed.introText);
        if (Array.isArray(parsed.customRecommendations)) setCustomRecommendations(parsed.customRecommendations);
      }
    } catch {
      // Ignorar errores de parseo localStorage
    }
  }, [reportStorageKey]);

  const persistReportMeta = (patch) => {
    if (!reportStorageKey) return;
    try {
      const prevRaw = localStorage.getItem(reportStorageKey);
      const prev = prevRaw ? JSON.parse(prevRaw) : {};
      localStorage.setItem(reportStorageKey, JSON.stringify({ ...prev, ...patch }));
    } catch {
      // Ignorar errores de cuota
    }
  };

  // Inicializar texto de introducción por defecto
  useEffect(() => {
    if (company && proyecto && !introText) {
      setIntroText(
        `El presente informe técnico de ingeniería eléctrica documenta la auditoría, levantamiento dimensional y diagrama unifilar del sistema de distribución eléctrica en las instalaciones de ${company.nombre}, correspondiente al proyecto "${proyecto.nombre}".\n\nLas actividades de campo comprendieron el inventario exhaustivo de puntos de suministro y medición, bancos de transformadores, grupos electrógenos, sistemas de transferencia (ATS/MTS), paneles eléctricos principales y seccionales, centros de control de motores (CCM), bancos de compensación reactiva, sistema de puesta a tierra e inspecciones especializadas.\n\nTodos los parámetros recopilados fueron cotejados siguiendo los criterios del Código Eléctrico Nacional (COVENIN 200), COVENIN 159:1997, IEEE 80 y NFPA 70 para garantizar la confiabilidad operativa y seguridad eléctrica de la infraestructura.`
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

  // Datos del responsable y ubicación
  const responsableNombre = proyecto.responsableNombre || (typeof proyecto.responsable === 'object' ? proyecto.responsable?.nombre : proyecto.responsable) || company?.contactoPrincipal || company?.responsable || 'Ingeniero Responsable';
  const responsableTelefono = proyecto.responsableTelefono || (typeof proyecto.responsable === 'object' ? proyecto.responsable?.telefono : '') || company?.telefono || '—';
  const responsableEmail = proyecto.responsableEmail || (typeof proyecto.responsable === 'object' ? proyecto.responsable?.email : '') || company?.email || '—';
  const direccionUbicacion = proyecto.direccion || proyecto.ubicacion || company?.direccion || company?.ubicacion || 'Ubicación de Planta / Sede Principal';

  // Colecciones base ordenadas
  const elementos = sortElementsByOrder(proyecto.elementosUnifilares || proyecto.tableros || []);
  const subestaciones = sortElementsByOrder(proyecto.inspeccionesSubestacion || proyecto.subestaciones || []);

  const puntosMedicionRaw = [
    ...(proyecto.puntosMedicion || []),
    ...elementos
      .filter((e) => e.tipoElemento === 'PUNTO_SUMINISTRO' || e.tipoElemento === 'PUNTO_MEDICION')
      .map((e) => ({
        ...e,
        ...(parseDtSafe(e.datosTecnicos))
      }))
  ];
  const seenPuntosIds = new Set();
  const puntosMedicion = sortElementsByOrder(
    puntosMedicionRaw.filter((p) => {
      if (!p?.id || seenPuntosIds.has(p.id)) return false;
      seenPuntosIds.add(p.id);
      return true;
    })
  );

  const ccmListRaw = [
    ...(proyecto.ccmList || []),
    ...elementos
      .filter((e) => e.tipoElemento === 'CCM')
      .map((e) => ({
        ...e,
        ...(parseDtSafe(e.datosTecnicos))
      }))
  ];
  const seenCcmIds = new Set();
  const ccmList = sortElementsByOrder(
    ccmListRaw.filter((c) => {
      if (!c?.id || seenCcmIds.has(c.id)) return false;
      seenCcmIds.add(c.id);
      return true;
    })
  );

  const transformadores = elementos.filter((e) => e.tipoElemento === 'TRANSFORMADOR');
  const generadores = elementos.filter((e) => e.tipoElemento === 'GENERADOR');
  const transferencias = elementos.filter((e) => e.tipoElemento === 'TRANSFER');
  const tableros = elementos.filter((e) => (e.tipoElemento || 'TABLERO') === 'TABLERO');
  const bancosCondensadores = elementos.filter((e) => e.tipoElemento === 'BANCO_CONDENSADOR');
  const puestasTierraLegacy = elementos.filter((e) => e.tipoElemento === 'PUESTA_TIERRA');
  const otros = elementos.filter((e) => e.tipoElemento === 'OTRO');

  // Lista maestra para resolver enlaces jerárquicos y ubicaciones reales
  const todosElementosJerarquia = useMemo(() => {
    const map = new Map();
    const pushAll = (arr, defaultTipo) => {
      (arr || []).forEach((item) => {
        if (!item?.id) return;
        if (!map.has(item.id)) {
          map.set(item.id, {
            ...item,
            tipoElemento: item.tipoElemento || defaultTipo,
            tipo: item.tipoElemento || defaultTipo
          });
        }
      });
    };
    pushAll(elementos, 'TABLERO');
    pushAll(puntosMedicion, 'PUNTO_MEDICION');
    pushAll(ccmList, 'CCM');
    pushAll(subestaciones, 'SUBESTACION');
    return Array.from(map.values());
  }, [elementos, puntosMedicion, ccmList, subestaciones]);

  // Chips de filtro rápido por tipo de elemento registrado en el sistema
  const reportFilterChips = useMemo(() => {
    const counts = {
      ALL: elementos.length +
        puntosMedicion.filter((p) => !elementos.some((e) => e.id === p.id)).length +
        ccmList.filter((c) => !elementos.some((e) => e.id === c.id)).length +
        subestaciones.length,
      TABLERO: tableros.length,
      PUNTO_SUMINISTRO: puntosMedicion.length,
      TRANSFORMADOR: transformadores.length,
      TRANSFER: transferencias.length,
      GENERADOR: generadores.length,
      CCM: ccmList.length,
      BANCO_CONDENSADOR: bancosCondensadores.length,
      INSPECCIONES: subestaciones.length,
      OTRO: otros.length,
      PUESTA_TIERRA: puestasTierraLegacy.length
    };
    const chips = REPORT_FILTER_ORDER.map((c) => ({ ...c, count: counts[c.id] ?? 0 }));
    if (otros.length > 0) chips.push({ id: 'OTRO', label: 'Otros Equipos', count: otros.length });
    if (puestasTierraLegacy.length > 0) chips.push({ id: 'PUESTA_TIERRA', label: 'PAT (Histórico)', count: puestasTierraLegacy.length });
    return chips;
  }, [
    elementos,
    puntosMedicion,
    ccmList,
    subestaciones,
    tableros.length,
    transformadores.length,
    transferencias.length,
    generadores.length,
    bancosCondensadores.length,
    otros.length,
    puestasTierraLegacy.length
  ]);

  const isFiltered = elementTypeFilter !== 'ALL';
  const showSec = (key) => elementTypeFilter === 'ALL' || elementTypeFilter === key;

  const vPuntosMedicion = showSec('PUNTO_SUMINISTRO') ? puntosMedicion : [];
  const vTransformadores = showSec('TRANSFORMADOR') ? transformadores : [];
  const vGeneradores = showSec('GENERADOR') ? generadores : [];
  const vTransferencias = showSec('TRANSFER') ? transferencias : [];
  const vTableros = showSec('TABLERO') ? tableros : [];
  const vBancosCondensadores = showSec('BANCO_CONDENSADOR') ? bancosCondensadores : [];
  const vCcmList = showSec('CCM') ? ccmList : [];
  const vSubestaciones = showSec('INSPECCIONES') ? subestaciones : [];
  const vOtros = showSec('OTRO') ? otros : [];
  const vPuestasTierraLegacy = showSec('PUESTA_TIERRA') ? puestasTierraLegacy : [];

  // Colección para el bucle genérico de Anexos (evita duplicar PUNTO_SUMINISTRO / PUNTO_MEDICION / CCM)
  const vElementosGenericosAnexos = useMemo(() => {
    return elementos.filter((item) => {
      const t = item.tipoElemento || 'TABLERO';
      if (t === 'PUNTO_MEDICION' || t === 'PUNTO_SUMINISTRO' || t === 'CCM') return false;
      if (elementTypeFilter === 'ALL') return true;
      return t === elementTypeFilter;
    });
  }, [elementos, elementTypeFilter]);

  const diagramElementos = useMemo(() => {
    if (elementTypeFilter === 'ALL') return elementos;
    if (elementTypeFilter === 'INSPECCIONES') return [];
    if (elementTypeFilter === 'PUNTO_SUMINISTRO') {
      return elementos.filter((e) => e.tipoElemento === 'PUNTO_SUMINISTRO' || e.tipoElemento === 'PUNTO_MEDICION');
    }
    return elementos.filter((e) => (e.tipoElemento || 'TABLERO') === elementTypeFilter);
  }, [elementos, elementTypeFilter]);

  // Totales ejecutivos (calculados sobre la vista activa)
  const kpiStats = useMemo(() => {
    const totalTablerosKva = vTableros.reduce((acc, t) => acc + (calcularPotenciaEstimadaTablero(t).kva || 0), 0);
    const totalTrafoKva = vTransformadores.reduce((acc, t) => {
      const dt = parseDtSafe(t.datosTecnicos);
      const val = parseFloat(String(dt.kva || dt.capacidadKva || dt.potenciaKva || '0').replace(/[^\d.]/g, ''));
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
    const totalGenKva = vGeneradores.reduce((acc, g) => {
      const dt = parseDtSafe(g.datosTecnicos);
      const val = parseFloat(String(dt.kva || dt.potenciaKva || '0').replace(/[^\d.]/g, ''));
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
    const totalActivosVisibles =
      vPuntosMedicion.length +
      vTransformadores.length +
      vGeneradores.length +
      vTransferencias.length +
      vTableros.length +
      vBancosCondensadores.length +
      vCcmList.length +
      vSubestaciones.length +
      vOtros.length +
      vPuestasTierraLegacy.length;

    return {
      totalActivosVisibles,
      totalTablerosKva: totalTablerosKva.toFixed(1),
      totalTrafoKva: totalTrafoKva.toFixed(0),
      totalGenKva: totalGenKva.toFixed(0)
    };
  }, [
    vPuntosMedicion.length,
    vTransformadores,
    vGeneradores,
    vTransferencias.length,
    vTableros,
    vBancosCondensadores.length,
    vCcmList.length,
    vSubestaciones.length,
    vOtros.length,
    vPuestasTierraLegacy.length
  ]);

  // Auditoría automática de Hallazgos Técnicos y Consolidado SPT (equivalente a pp. 6-8 del informe de referencia)
  const auditFindings = useMemo(() => {
    const findings = [];

    vTableros.forEach((tab) => {
      const dt = parseDtSafe(tab.datosTecnicos);
      const name = cleanElementName(tab.nombre, tab.id, tab.codigo);
      const code = getElementCode(tab, 'TABLERO');
      const ubic = cleanDisplayVal(resolveElementUbicacionDisplay(tab));
      const bp = tab.breakerPrincipal || dt.breakerPrincipal || {};
      const ampStr = String(bp.amp || dt.amperajeNominal || dt.interruptorPrincipal || '').trim();
      const marcaStr = String(bp.marca || '').trim().toUpperCase();
      const isNoBreaker = !ampStr || marcaStr.includes('SIN BREAKER') || marcaStr.includes('SIN INTERRUP');

      if (isNoBreaker) {
        findings.push({
          id: `${tab.id}-nobr`,
          equipo: name,
          codigo: code,
          ubicacion: ubic,
          categoria: 'Protección Principal',
          severidad: 'ALTA',
          detalle: 'El tablero no posee interruptor principal registrado o se alimenta directamente sin seccionamiento local.',
          recomendacion: 'Evaluar e instalar interruptor principal acorde a la capacidad de barras y acometida (COVENIN 200).'
        });
      }

      const pt = tab.puestaTierra || dt.puestaTierra || {};
      const ptCalibre = String(pt.calibre || '').trim();
      const ptObs = String(pt.observaciones || '').trim();
      const ptUpper = ptObs.toUpperCase();
      const hasSptAlert =
        (!ptCalibre && !ptObs) ||
        ptUpper.includes('NO TIENE TIERRA') ||
        ptUpper.includes('SIN TIERRA') ||
        ptUpper.includes('SIN BARRA') ||
        ptUpper.includes('SIN CABLE') ||
        ptUpper.includes('NO OBSERVA') ||
        ptUpper.includes('KS') ||
        ptUpper.includes('ENTORCHADO') ||
        ptUpper.includes('BUSCAR') ||
        ptUpper.includes('FUGA') ||
        ptUpper.includes('CORRIENTE');

      if (hasSptAlert) {
        findings.push({
          id: `${tab.id}-spt`,
          equipo: name,
          codigo: code,
          ubicacion: ubic,
          categoria: 'Puesta a Tierra (SPT)',
          severidad: ptUpper.includes('FUGA') || ptUpper.includes('CORRIENTE') || ptUpper.includes('SIN TIERRA') || ptUpper.includes('NO TIENE TIERRA') ? 'ALTA' : 'MEDIA',
          detalle: ptObs || 'Sin calibre ni barra de puesta a tierra debidamente documentada en campo.',
          recomendacion: 'Normalizar barraje de puesta a tierra, eliminar empalmes improvisados (KS/entorchados) y verificar continuidad equipotencial.'
        });
      }

      const obs = extractObservationText(tab);
      if (obs) {
        findings.push({
          id: `${tab.id}-obs`,
          equipo: name,
          codigo: code,
          ubicacion: ubic,
          categoria: 'Observación de Campo',
          severidad: obs.toUpperCase().includes('RUIDO') || obs.toUpperCase().includes('SOBREDIM') || obs.toUpperCase().includes('HUMEDAD') || obs.toUpperCase().includes('FUGA') ? 'ALTA' : 'INFO',
          detalle: obs,
          recomendacion: obs
        });
      }
    });

    vTransformadores.forEach((trafo) => {
      const dt = parseDtSafe(trafo.datosTecnicos);
      const name = cleanElementName(trafo.nombre, trafo.id, trafo.codigo);
      const code = getElementCode(trafo, 'TRANSFORMADOR');
      const ubic = cleanDisplayVal(resolveElementUbicacionDisplay(trafo));
      const spt = dt.spt || {};
      if (!spt.conductorCalibre && !spt.electrodoCantidad && !spt.observaciones) {
        findings.push({
          id: `${trafo.id}-spt`,
          equipo: name,
          codigo: code,
          ubicacion: ubic,
          categoria: 'SPT Transformador',
          severidad: 'MEDIA',
          detalle: 'Sección interna de Sistema de Puesta a Tierra (electrodo y calibre de bajante) sin valores registrados.',
          recomendacion: 'Medir resistencia de puesta a tierra en neutro/tanque del transformador y completar registro SPT.'
        });
      }
      const obs = extractObservationText(trafo);
      if (obs) {
        findings.push({
          id: `${trafo.id}-obs`,
          equipo: name,
          codigo: code,
          ubicacion: ubic,
          categoria: 'Transformador',
          severidad: 'INFO',
          detalle: obs,
          recomendacion: obs
        });
      }
    });

    vTransferencias.forEach((tr) => {
      const dt = parseDtSafe(tr.datosTecnicos);
      const name = cleanElementName(tr.nombre, tr.id, tr.codigo);
      const code = getElementCode(tr, 'TRANSFER');
      const ubic = cleanDisplayVal(resolveElementUbicacionDisplay(tr));
      const tierraVal = String(dt.tierra || dt.tierraConductor || '').trim().toUpperCase();
      if (!tierraVal || tierraVal === 'NO') {
        findings.push({
          id: `${tr.id}-tierra`,
          equipo: name,
          codigo: code,
          ubicacion: ubic,
          categoria: 'Puesta a Tierra (ATS)',
          severidad: 'ALTA',
          detalle: `Unidad de transferencia sin conexión de puesta a tierra registrada (${tierraVal === 'NO' ? 'TIERRA: NO' : 'Sin dato'}).`,
          recomendacion: 'Instalar barra/conductor de puesta a tierra dedicado para la carcasa y neutro de la transferencia.'
        });
      }
      const obs = extractObservationText(tr);
      if (obs) {
        findings.push({
          id: `${tr.id}-obs`,
          equipo: name,
          codigo: code,
          ubicacion: ubic,
          categoria: 'Transferencia',
          severidad: obs.toUpperCase().includes('AMPERIO') || obs.toUpperCase().includes('FUGA') ? 'ALTA' : 'INFO',
          detalle: obs,
          recomendacion: obs
        });
      }
    });

    vCcmList.forEach((ccm) => {
      const name = cleanElementName(ccm.nombre, ccm.id, ccm.codigo);
      const code = getElementCode(ccm, 'CCM');
      const ubic = cleanDisplayVal(resolveElementUbicacionDisplay(ccm) || ccm.plantaInstalacion);
      if (Array.isArray(ccm.hallazgosCriticos) && ccm.hallazgosCriticos.length > 0) {
        findings.push({
          id: `${ccm.id}-ccm-hallazgo`,
          equipo: name,
          codigo: code,
          ubicacion: ubic,
          categoria: 'Hallazgo Crítico CCM',
          severidad: 'ALTA',
          detalle: ccm.hallazgosCriticos.map((h) => h?.descripcion || h?.hallazgo || h).filter(Boolean).join('; '),
          recomendacion: 'Atender hallazgos críticos en gavetas, barraje y protecciones de motores del CCM.'
        });
      }
    });

    vSubestaciones.forEach((sub) => {
      const meta = getInspeccionMeta(sub);
      const name = cleanElementName(sub.nombre, sub.id, sub.codigo);
      const code = getElementCode(sub, sub.tipoElemento || 'SUBESTACION');
      const ubic = cleanDisplayVal(resolveElementUbicacionDisplay(sub));

      if (meta.key === 'TERMOGRAFICA') {
        const dtNum = parseFloat(sub.equiposPrincipales?.deltaT || 0);
        if (!isNaN(dtNum) && dtNum > 10) {
          findings.push({
            id: `${sub.id}-termo`,
            equipo: name,
            codigo: code,
            ubicacion: ubic,
            categoria: 'Termografía',
            severidad: dtNum > 20 ? 'ALTA' : 'MEDIA',
            detalle: meta.resumen,
            recomendacion: 'Realizar apriete de bornes con torquímetro, limpieza de contactos y reinspección termográfica.'
          });
        }
      } else if (meta.key === 'SISTEMA_ATERRAMIENTO') {
        const rNum = parseFloat(sub.puestaTierra?.resistenciaOhms || 0);
        if (!isNaN(rNum) && rNum > 5.0) {
          findings.push({
            id: `${sub.id}-spat`,
            equipo: name,
            codigo: code,
            ubicacion: ubic,
            categoria: 'Telurometría SPAT',
            severidad: rNum > 10 ? 'ALTA' : 'MEDIA',
            detalle: `Resistencia de malla medida de ${rNum} Ω (supera el objetivo óptimo de 5.0 Ω).`,
            recomendacion: 'Realizar mantenimiento de electrodos, mejora de suelo (hidrogel/bentonita) o ampliación de malla PAT.'
          });
        }
      } else {
        const obsSub = extractObservationText(sub);
        if (meta.resumen.includes('Malo') || meta.resumen.includes('Regular') || obsSub) {
          findings.push({
            id: `${sub.id}-sub`,
            equipo: name,
            codigo: code,
            ubicacion: ubic,
            categoria: meta.badge,
            severidad: meta.resumen.includes('Malo') ? 'ALTA' : 'INFO',
            detalle: obsSub || meta.resumen,
            recomendacion: obsSub || 'Ejecutar mantenimiento correctivo sobre los ítems marcados como Regular/Malo en planilla.'
          });
        }
      }
    });

    return findings;
  }, [vTableros, vTransformadores, vTransferencias, vCcmList, vSubestaciones]);

  // Consolidado SPT (Tableros + Transformadores + Transferencias + Inspecciones SPAT)
  const sptConsolidatedRows = useMemo(() => {
    const rows = [];
    vTableros.forEach((t) => {
      const dt = parseDtSafe(t.datosTecnicos);
      const pt = t.puestaTierra || dt.puestaTierra || {};
      rows.push({
        id: `tab-${t.id}`,
        codigo: getElementCode(t, 'TABLERO'),
        equipo: cleanElementName(t.nombre, t.id, t.codigo),
        tipo: 'Panel Eléctrico',
        ubicacion: cleanDisplayVal(resolveElementUbicacionDisplay(t)),
        calibre: cleanDisplayVal(pt.calibre),
        estadoObs: cleanDisplayVal(pt.observaciones, pt.calibre ? 'Conductor registrado' : 'Sin registro de barra / conductor')
      });
    });
    vTransformadores.forEach((tr) => {
      const dt = parseDtSafe(tr.datosTecnicos);
      const spt = dt.spt || {};
      const detailParts = [
        spt.electrodoCantidad ? `${spt.electrodoCantidad} electrodos (${spt.electrodoMedida || '5/8"'})` : '',
        spt.conexionSoldadura || '',
        spt.observaciones || ''
      ].filter(Boolean);
      rows.push({
        id: `tra-${tr.id}`,
        codigo: getElementCode(tr, 'TRANSFORMADOR'),
        equipo: cleanElementName(tr.nombre, tr.id, tr.codigo),
        tipo: 'Transformador',
        ubicacion: cleanDisplayVal(resolveElementUbicacionDisplay(tr)),
        calibre: cleanDisplayVal(spt.conductorCalibre),
        estadoObs: detailParts.length > 0 ? detailParts.join(' • ') : 'Pendiente verificación de malla SPT'
      });
    });
    vTransferencias.forEach((ats) => {
      const dt = parseDtSafe(ats.datosTecnicos);
      rows.push({
        id: `ats-${ats.id}`,
        codigo: getElementCode(ats, 'TRANSFER'),
        equipo: cleanElementName(ats.nombre, ats.id, ats.codigo),
        tipo: 'Transferencia',
        ubicacion: cleanDisplayVal(resolveElementUbicacionDisplay(ats)),
        calibre: cleanDisplayVal(dt.tierraConductor || dt.tierra),
        estadoObs: String(dt.tierra || '').toUpperCase() === 'NO' ? 'SIN PUESTA A TIERRA (TIERRA: NO)' : cleanDisplayVal(dt.tierra, 'Verificar barra de tierra')
      });
    });
    vSubestaciones
      .filter((s) => getInspeccionMeta(s).key === 'SISTEMA_ATERRAMIENTO')
      .forEach((s) => {
        const pat = s.puestaTierra || {};
        rows.push({
          id: `spat-${s.id}`,
          codigo: getElementCode(s, s.tipoElemento || 'SISTEMA_ATERRAMIENTO'),
          equipo: cleanElementName(s.nombre, s.id, s.codigo),
          tipo: 'Inspección SPAT',
          ubicacion: cleanDisplayVal(resolveElementUbicacionDisplay(s)),
          calibre: pat.resistenciaOhms ? `${pat.resistenciaOhms} Ω` : '—',
          estadoObs: `${pat.tipoSistemaPat || 'Malla PAT'} • ${pat.cumplimientoIeee80 || pat.metodoMedicion || ''}`
        });
      });
    return rows;
  }, [vTableros, vTransformadores, vTransferencias, vSubestaciones]);

  // Recomendaciones automáticas por defecto si el usuario no las personalizó aún
  const autoDefaultRecommendations = useMemo(() => {
    const recs = [];
    const seen = new Set();
    auditFindings.forEach((f) => {
      if (f.severidad === 'ALTA' || f.severidad === 'MEDIA') {
        const key = `${f.codigo}:${f.categoria}`;
        if (!seen.has(key)) {
          seen.add(key);
          recs.push({
            area: `${f.equipo} (${f.codigo})`,
            recomendacion: f.recomendacion
          });
        }
      }
    });
    if (recs.length === 0) {
      recs.push({
        area: 'TODOS LOS TABLEROS Y EQUIPOS',
        recomendacion: 'Mantener programa preventivo anual de limpieza dieléctrica, reapriete con torquímetro, identificación de circuitos en tapa y verificación de puesta a tierra conforme al Código Eléctrico Nacional (COVENIN 200).'
      });
    }
    return recs;
  }, [auditFindings]);

  const activeRecommendations = customRecommendations !== null ? customRecommendations : autoDefaultRecommendations;

  // Todas las filas para el Resumen de Hallazgos (Sección 6)
  const conclusionSummaryItems = useMemo(() => {
    const items = [];
    const pushRows = (arr, categoryLabel, defaultMsg) => {
      arr.forEach((item) => {
        const obs = extractObservationText(item);
        const hasFinding = auditFindings.some((f) => f.id.startsWith(`${item.id}-`) && f.severidad !== 'INFO');
        items.push({
          id: item.id,
          sourceType: item._collection || categoryLabel,
          codigo: getElementCode(item, item.tipoElemento || categoryLabel),
          nombre: cleanElementName(item.nombre, item.id, item.codigo),
          categoria: categoryLabel,
          ubicacion: cleanDisplayVal(resolveElementUbicacionDisplay(item)),
          observacion: obs,
          defaultMsg,
          hasFinding,
          raw: item
        });
      });
    };

    pushRows(vPuntosMedicion, 'PUNTO_SUMINISTRO', 'Parámetros de acometida, medición y punto de conexión verificados en campo.');
    pushRows(vTransformadores, 'TRANSFORMADOR', 'Transformador inspeccionado; verificar nivel de carga nominal y registro de SPT.');
    pushRows(vGeneradores, 'GENERADOR', 'Grupo electrógeno inspeccionado y parametrizado según datos de placa y respaldo.');
    pushRows(vTransferencias, 'TRANSFER', 'Unidad de transferencia inspeccionada en modos normal/emergencia y cableado de control.');
    pushRows(vTableros, 'TABLERO', 'Tablero de distribución inspeccionado conforme a norma CEN / COVENIN 200.');
    pushRows(vBancosCondensadores, 'BANCO_CONDENSADOR', 'Banco de compensación reactiva inspeccionado conforme.');
    pushRows(vCcmList, 'CCM', 'Centro de control de motores y gavetas verificados en campo.');
    pushRows(vSubestaciones, 'INSPECCION', 'Inspección técnica especializada registrada y evaluada en campo.');
    pushRows(vOtros, 'OTRO', 'Equipo especial inspeccionado y documentado en campo.');

    return items;
  }, [
    vPuntosMedicion,
    vTransformadores,
    vGeneradores,
    vTransferencias,
    vTableros,
    vBancosCondensadores,
    vCcmList,
    vSubestaciones,
    vOtros,
    auditFindings
  ]);

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
      id,
      nombre,
      ubicacion,
      alimentadoPor,
      alimentadoPorId,
      alimentaA,
      alimentaAIds,
      foto,
      fotoBlob,
      eliminarFoto,
      observacionesGenerales,
      ...datosTecnicos
    } = updatedData;

    updateElementoUnifilar(proyectoId, elementoId, {
      nombre,
      ubicacion,
      alimentadoPor,
      ...(alimentadoPorId !== undefined ? { alimentadoPorId } : {}),
      ...(alimentaA !== undefined ? { alimentaA } : {}),
      ...(alimentaAIds !== undefined ? { alimentaAIds } : {}),
      ...(eliminarFoto
        ? { foto: null, fotoBlob: null, eliminarFoto: true }
        : {
            ...(foto !== undefined ? { foto } : {}),
            ...(fotoBlob !== undefined ? { fotoBlob } : {})
          }),
      observacionesGenerales,
      ...(datosTecnicos?.circuits ? { circuits: datosTecnicos.circuits } : {}),
      datosTecnicos
    });
  };

  const handleUpdateSubestacion = (subestacionId, updatedData) => {
    updateSubestacion(proyectoId, subestacionId, updatedData);
  };

  const handleUpdateSummaryObservation = (row, obsValue) => {
    const isUnifilar = elementos.some((e) => e.id === row.id);
    if (isUnifilar) {
      const target = elementos.find((e) => e.id === row.id);
      if (target) {
        const nextDt = { ...(target.datosTecnicos || {}) };
        if (target.tipoElemento === 'TRANSFER') nextDt.observacionTransferencia = obsValue;
        handleUpdateElemento(row.id, { ...target, observacionesGenerales: obsValue, ...nextDt });
      }
      return;
    }
    if (subestaciones.some((s) => s.id === row.id)) {
      const target = subestaciones.find((s) => s.id === row.id);
      if (target) handleUpdateSubestacion(row.id, { ...target, observacionesGenerales: obsValue });
      return;
    }
    if ((proyecto.puntosMedicion || []).some((p) => p.id === row.id)) {
      updatePuntoMedicion(proyectoId, row.id, { ...row.raw, observacionesGenerales: obsValue, observaciones: obsValue });
      return;
    }
    if ((proyecto.ccmList || []).some((c) => c.id === row.id)) {
      updateCcm(proyectoId, row.id, { ...row.raw, observacionesGenerales: obsValue });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased print:bg-white print:text-slate-900">
      {/* Barra de control superior (Solo Pantalla / no-print) */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-4 flex flex-col gap-3 shadow-md no-print sticky top-0 z-50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate(`/empresa/${companyId}/proyecto/${proyectoId}`)}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer border border-slate-700 shrink-0"
              title="Volver al Proyecto"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider block">
                Generador de Reportes Ejecutivos
              </span>
              <h1 className="text-sm font-bold text-slate-100 truncate">
                Informe Técnico Compilado: {proyecto.nombre}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={() => setIsEditingReport(!isEditingReport)}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 text-xs font-bold shadow-md ${
                isEditingReport
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
              }`}
            >
              {isEditingReport ? (
                <>
                  <Check className="w-4 h-4" />
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
              {isFiltered ? 'Imprimir / PDF (Filtro Activo)' : 'Imprimir / Exportar a PDF (Carta)'}
            </button>
          </div>
        </div>

        {/* Filtro de Elementos Registrados dentro del Informe */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-amber-500" /> Filtrar Informe:
          </span>
          {reportFilterChips.map((chip) => {
            const isActive = elementTypeFilter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setElementTypeFilter(chip.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm font-black'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-amber-500/40 hover:text-amber-400'
                }`}
              >
                <span>{chip.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                    isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  {chip.count}
                </span>
              </button>
            );
          })}
          {isFiltered && (
            <button
              type="button"
              onClick={() => setElementTypeFilter('ALL')}
              className="ml-auto px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-amber-400 flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3" /> Mostrar Todos
            </button>
          )}
        </div>
      </div>

      {/* DOCUMENTO COMPILADO (Formato Carta) */}
      <div className="w-full max-w-5xl mx-auto p-4 md:p-8 space-y-10 bg-slate-900/40 md:rounded-3xl border border-slate-900/60 my-6 shadow-2xl print:my-0 print:p-0 print:border-none print:bg-white print:text-black print:shadow-none print:max-w-full">
        {/* ================= 1. PORTADA EJECUTIVA (Hoja 1) ================= */}
        <div className="page-break-after flex flex-col justify-between py-12 px-8 text-center bg-slate-950 border border-slate-800 rounded-2xl print:bg-white print:text-black print:border-none print:p-6 min-h-[90vh] print:min-h-screen">
          {/* Cabecera de Portada */}
          <div className="flex justify-between items-center border-b border-slate-800 pb-4 print:border-slate-300 w-full text-left">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 print:bg-slate-100 print:border-slate-400 print:text-slate-900">
                <Zap className="w-5 h-5 font-bold" />
              </div>
              <div>
                <span className="text-xs font-black text-slate-100 print:text-slate-950 uppercase tracking-wider block">
                  AUDITORÍA &amp; INGENIERÍA ELÉCTRICA
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
                onChange={(e) => {
                  setCoverTitle(e.target.value);
                  persistReportMeta({ coverTitle: e.target.value });
                }}
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
                onChange={(e) => {
                  setCoverSubtitle(e.target.value);
                  persistReportMeta({ coverSubtitle: e.target.value });
                }}
                className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-slate-300 text-center text-xs font-medium tracking-wide uppercase rounded-xl p-2 outline-none"
              />
            ) : (
              <p className="text-slate-300 print:text-slate-700 text-sm font-semibold tracking-wide uppercase max-w-xl">
                {coverSubtitle}
              </p>
            )}

            {isFiltered && (
              <span className="px-3 py-1 bg-amber-500/15 border border-amber-500/40 text-amber-400 print:bg-slate-100 print:text-slate-900 print:border-slate-400 rounded-full text-xs font-bold uppercase tracking-wider">
                Edición Filtrada: {reportFilterChips.find((c) => c.id === elementTypeFilter)?.label}
              </span>
            )}
          </div>

          {/* Ficha Técnica de Portada */}
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

        {/* ================= 2. TABLA DE CONTENIDO ================= */}
        <div className="page-break-avoid py-6 px-4 md:px-6 space-y-6 print:py-2 print:px-0">
          <div className="border-b border-slate-800 pb-3 print:border-slate-300 flex justify-between items-center">
            <h2 className="text-lg font-bold uppercase tracking-wider text-amber-500 print:text-slate-950 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-500" /> Tabla de Contenido del Informe
            </h2>
            <span className="text-xs font-mono text-slate-500 print:text-slate-600">Documento Técnico Compilado</span>
          </div>

          <div className="space-y-2 font-sans text-xs text-slate-300 print:text-slate-800">
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
            {showSec('PUNTO_SUMINISTRO') && (
              <div className="flex justify-between items-end gap-2 pl-4 py-0.5 text-slate-400 print:text-slate-700">
                <span>&bull; Puntos de Suministro y Medición ({vPuntosMedicion.length})</span>
                <span className="border-b border-dashed border-slate-800 flex-1 h-1 min-w-[20px] print:border-slate-200"></span>
                <span className="font-mono">2.1</span>
              </div>
            )}
            {showSec('TRANSFORMADOR') && (
              <div className="flex justify-between items-end gap-2 pl-4 py-0.5 text-slate-400 print:text-slate-700">
                <span>&bull; Transformadores de Potencia ({vTransformadores.length})</span>
                <span className="border-b border-dashed border-slate-800 flex-1 h-1 min-w-[20px] print:border-slate-200"></span>
                <span className="font-mono">2.2</span>
              </div>
            )}
            {showSec('GENERADOR') && (
              <div className="flex justify-between items-end gap-2 pl-4 py-0.5 text-slate-400 print:text-slate-700">
                <span>&bull; Grupos Electrógenos / Generadores ({vGeneradores.length})</span>
                <span className="border-b border-dashed border-slate-800 flex-1 h-1 min-w-[20px] print:border-slate-200"></span>
                <span className="font-mono">2.3</span>
              </div>
            )}
            {showSec('TRANSFER') && (
              <div className="flex justify-between items-end gap-2 pl-4 py-0.5 text-slate-400 print:text-slate-700">
                <span>&bull; Sistemas de Transferencia ATS / MTS ({vTransferencias.length})</span>
                <span className="border-b border-dashed border-slate-800 flex-1 h-1 min-w-[20px] print:border-slate-200"></span>
                <span className="font-mono">2.4</span>
              </div>
            )}
            {showSec('TABLERO') && (
              <div className="flex justify-between items-end gap-2 pl-4 py-0.5 text-slate-400 print:text-slate-700">
                <span>&bull; Paneles Eléctricos y Tableros de Distribución ({vTableros.length})</span>
                <span className="border-b border-dashed border-slate-800 flex-1 h-1 min-w-[20px] print:border-slate-200"></span>
                <span className="font-mono">2.5</span>
              </div>
            )}
            {showSec('BANCO_CONDENSADOR') && (
              <div className="flex justify-between items-end gap-2 pl-4 py-0.5 text-slate-400 print:text-slate-700">
                <span>&bull; Bancos de Condensadores ({vBancosCondensadores.length})</span>
                <span className="border-b border-dashed border-slate-800 flex-1 h-1 min-w-[20px] print:border-slate-200"></span>
                <span className="font-mono">2.6</span>
              </div>
            )}
            {showSec('CCM') && (
              <div className="flex justify-between items-end gap-2 pl-4 py-0.5 text-slate-400 print:text-slate-700">
                <span>&bull; Centros de Control de Motores CCM ({vCcmList.length})</span>
                <span className="border-b border-dashed border-slate-800 flex-1 h-1 min-w-[20px] print:border-slate-200"></span>
                <span className="font-mono">2.7</span>
              </div>
            )}
            {showSec('INSPECCIONES') && (
              <div className="flex justify-between items-end gap-2 pl-4 py-0.5 text-slate-400 print:text-slate-700">
                <span>&bull; Inspecciones Especializadas Capa 2 ({vSubestaciones.length})</span>
                <span className="border-b border-dashed border-slate-800 flex-1 h-1 min-w-[20px] print:border-slate-200"></span>
                <span className="font-mono">2.8</span>
              </div>
            )}
            <div className="flex justify-between items-end gap-2 py-1">
              <span className="font-bold text-slate-100 print:text-slate-950">3. JERARQUÍA Y DIAGRAMA UNIFILAR GRÁFICO (CAD)</span>
              <span className="border-b border-dashed border-slate-800 flex-1 h-1 min-w-[20px] print:border-slate-300"></span>
              <span className="font-mono text-amber-400 print:text-slate-700 font-bold">Sec. 3</span>
            </div>
            <div className="flex justify-between items-end gap-2 py-1">
              <span className="font-bold text-slate-100 print:text-slate-950">4. RESULTADOS DE INSPECCIONES Y SISTEMA DE PUESTA A TIERRA ({auditFindings.length})</span>
              <span className="border-b border-dashed border-slate-800 flex-1 h-1 min-w-[20px] print:border-slate-300"></span>
              <span className="font-mono text-amber-400 print:text-slate-700 font-bold">Sec. 4</span>
            </div>
            <div className="flex justify-between items-end gap-2 py-1">
              <span className="font-bold text-slate-100 print:text-slate-950">5. ANEXOS — FICHAS TÉCNICAS DETALLADAS ({kpiStats.totalActivosVisibles})</span>
              <span className="border-b border-dashed border-slate-800 flex-1 h-1 min-w-[20px] print:border-slate-300"></span>
              <span className="font-mono text-amber-400 print:text-slate-700 font-bold">Sec. 5</span>
            </div>
            <div className="flex justify-between items-end gap-2 py-1">
              <span className="font-bold text-slate-100 print:text-slate-950">6. CONCLUSIONES Y RESUMEN DE RECOMENDACIONES</span>
              <span className="border-b border-dashed border-slate-800 flex-1 h-1 min-w-[20px] print:border-slate-300"></span>
              <span className="font-mono text-amber-400 print:text-slate-700 font-bold">Sec. 6</span>
            </div>
            <div className="flex justify-between items-end gap-2 py-1">
              <span className="font-bold text-slate-100 print:text-slate-950">7. VALIDACIÓN Y APROBACIÓN DE INGENIERÍA</span>
              <span className="border-b border-dashed border-slate-800 flex-1 h-1 min-w-[20px] print:border-slate-300"></span>
              <span className="font-mono text-amber-400 print:text-slate-700 font-bold">Sec. 7</span>
            </div>
          </div>
        </div>

        {/* ================= SECCIÓN 1 & 2: INTRODUCCIÓN + INVENTARIO TÉCNICO ================= */}
        <div className="py-6 px-4 md:px-6 space-y-6 print:py-2 print:px-0">
          <div className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-amber-500 border-b border-slate-800 pb-2 print:text-slate-950 print:border-slate-300 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" /> 1. Introducción y Alcance de la Auditoría
            </h2>
            {isEditingReport ? (
              <textarea
                value={introText}
                onChange={(e) => {
                  setIntroText(e.target.value);
                  persistReportMeta({ introText: e.target.value });
                }}
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

            {/* Resumen KPI Ejecutivo */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 break-inside-avoid">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 print:bg-slate-50 print:border-slate-300">
                <span className="text-[9.5px] font-bold uppercase text-slate-400 print:text-slate-600 block">Elementos Auditados</span>
                <span className="text-lg font-black text-amber-400 print:text-slate-950 font-mono">{kpiStats.totalActivosVisibles}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 print:bg-slate-50 print:border-slate-300">
                <span className="text-[9.5px] font-bold uppercase text-slate-400 print:text-slate-600 block">Potencia Est. Paneles</span>
                <span className="text-lg font-black text-sky-400 print:text-slate-950 font-mono">{kpiStats.totalTablerosKva} kVA</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 print:bg-slate-50 print:border-slate-300">
                <span className="text-[9.5px] font-bold uppercase text-slate-400 print:text-slate-600 block">Cap. Transformación</span>
                <span className="text-lg font-black text-purple-400 print:text-slate-950 font-mono">{kpiStats.totalTrafoKva} kVA</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 print:bg-slate-50 print:border-slate-300">
                <span className="text-[9.5px] font-bold uppercase text-slate-400 print:text-slate-600 block">Generación Respaldo</span>
                <span className="text-lg font-black text-emerald-400 print:text-slate-950 font-mono">{kpiStats.totalGenKva} kVA</span>
              </div>
            </div>

            {/* 2.1 Puntos de Suministro */}
            {showSec('PUNTO_SUMINISTRO') && (
              <div className="space-y-2 break-inside-avoid">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-200 print:text-slate-800 flex items-center justify-between">
                  <span>2.1 Puntos de Suministro / Acometida y Medición</span>
                  <span className="text-[10px] text-slate-500 font-normal">Total: {vPuntosMedicion.length}</span>
                </h3>
                {vPuntosMedicion.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-left border border-slate-800 print:border-slate-300">
                      <thead className="bg-slate-950 text-[10px] font-bold uppercase tracking-wider text-slate-400 print:bg-slate-100 print:text-slate-800">
                        <tr>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Código / Nombre</th>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Ubicación</th>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Distribuidora / Contrato</th>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Medidor (Marca/Serie)</th>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Tensión / Potencia</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 print:divide-slate-200 text-slate-300 print:text-slate-800">
                        {vPuntosMedicion.map((e) => {
                          const dt = parseDtSafe(e.datosTecnicos);
                          const dist = cleanDisplayVal(e.empresaDistribuidora || dt.empresaDistribuidora);
                          const contrato = cleanDisplayVal(e.numeroContrato || dt.numeroContrato || e.nic || dt.nic, '');
                          const medidor = [e.marcaModeloMedidor || dt.marcaModeloMedidor, e.numeroSerieAno || dt.numeroSerieAno].filter(Boolean).join(' • ') || '—';
                          const tension = cleanDisplayVal(e.nivelTensionContrato || dt.nivelTensionContrato || e.nivelTension || dt.nivelTension || e.tensionNominal || dt.tensionNominal);
                          const pot = cleanDisplayVal(e.potenciaContratada || dt.potenciaContratada || e.capacidadContratadaKva || dt.capacidadContratadaKva || e.cargaContratadaKva || dt.cargaContratadaKva);
                          return (
                            <tr key={e.id} className="hover:bg-slate-900/50 print:hover:bg-transparent">
                              <td className="py-1.5 px-2.5 font-bold">
                                <span>{cleanElementName(e.nombre, e.id, e.codigo)}</span>{' '}
                                <span className="text-[9px] font-mono text-amber-400 print:text-slate-700">[{getElementCode(e, e.tipoElemento || 'PUNTO_SUMINISTRO')}]</span>
                              </td>
                              <td className="py-1.5 px-2.5">{cleanDisplayVal(resolveElementUbicacionDisplay(e))}</td>
                              <td className="py-1.5 px-2.5">{dist}{contrato ? ` (${contrato})` : ''}</td>
                              <td className="py-1.5 px-2.5 font-mono text-[10px]">{medidor}</td>
                              <td className="py-1.5 px-2.5 font-mono">{tension} / {pot}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic">No se registraron puntos de suministro o medición en este proyecto.</p>
                )}
              </div>
            )}

            {/* 2.2 Transformadores */}
            {showSec('TRANSFORMADOR') && (
              <div className="space-y-2 break-inside-avoid">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-200 print:text-slate-800 flex items-center justify-between">
                  <span>2.2 Transformadores de Potencia</span>
                  <span className="text-[10px] text-slate-500 font-normal">Total: {vTransformadores.length}</span>
                </h3>
                {vTransformadores.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-left border border-slate-800 print:border-slate-300">
                      <thead className="bg-slate-950 text-[10px] font-bold uppercase tracking-wider text-slate-400 print:bg-slate-100 print:text-slate-800">
                        <tr>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Código / Nombre</th>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Ubicación</th>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Potencia / Conexión</th>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Tensión Prim. / Sec.</th>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Marca / Tipo</th>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Alimentado Por</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 print:divide-slate-200 text-slate-300 print:text-slate-800">
                        {vTransformadores.map((e) => {
                          const dt = parseDtSafe(e.datosTecnicos);
                          const kva = cleanDisplayVal(dt.kva || dt.potencia || dt.capacidadKva || dt.potenciaKva);
                          const conn = cleanDisplayVal(dt.tipoConexion || dt.conexion);
                          const vp = cleanDisplayVal(dt.voltajePrimario || dt.tensionPrimaria);
                          const vs = cleanDisplayVal(dt.voltajeSecundario || dt.tensionSecundaria);
                          const marca = cleanDisplayVal(dt.marca || dt.fabricante);
                          const tipoT = cleanDisplayVal(dt.tipo || dt.sistemaEnfriamiento || dt.tipoRefrigeracion, '');
                          const parent = cleanDisplayVal(resolveElementParentDisplay(e, todosElementosJerarquia));
                          return (
                            <tr key={e.id} className="hover:bg-slate-900/50 print:hover:bg-transparent">
                              <td className="py-1.5 px-2.5 font-bold">
                                <span>{cleanElementName(e.nombre, e.id, e.codigo)}</span>{' '}
                                <span className="text-[9px] font-mono text-amber-400 print:text-slate-700">[{getElementCode(e, 'TRANSFORMADOR')}]</span>
                              </td>
                              <td className="py-1.5 px-2.5">{cleanDisplayVal(resolveElementUbicacionDisplay(e))}</td>
                              <td className="py-1.5 px-2.5 font-mono font-bold text-amber-400 print:text-slate-900">
                                {kva}{conn !== '—' ? ` (${conn})` : ''}
                              </td>
                              <td className="py-1.5 px-2.5 font-mono">{vp} / {vs}</td>
                              <td className="py-1.5 px-2.5">{marca}{tipoT ? ` (${tipoT})` : ''}</td>
                              <td className="py-1.5 px-2.5 text-[10px]">{parent}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic">No se registraron transformadores en este proyecto.</p>
                )}
              </div>
            )}

            {/* 2.3 Generadores */}
            {showSec('GENERADOR') && (
              <div className="space-y-2 break-inside-avoid">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-200 print:text-slate-800 flex items-center justify-between">
                  <span>2.3 Grupos Electrógenos / Generadores</span>
                  <span className="text-[10px] text-slate-500 font-normal">Total: {vGeneradores.length}</span>
                </h3>
                {vGeneradores.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-left border border-slate-800 print:border-slate-300">
                      <thead className="bg-slate-950 text-[10px] font-bold uppercase tracking-wider text-slate-400 print:bg-slate-100 print:text-slate-800">
                        <tr>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Código / Nombre</th>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Ubicación</th>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Potencia / Voltaje</th>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Interruptor / Combustible</th>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Alimenta A</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 print:divide-slate-200 text-slate-300 print:text-slate-800">
                        {vGeneradores.map((e) => {
                          const dt = parseDtSafe(e.datosTecnicos);
                          const kva = cleanDisplayVal(dt.kva || dt.potenciaKva);
                          const kw = cleanDisplayVal(dt.kw || dt.potenciaKw, '');
                          const volt = cleanDisplayVal(dt.voltajeGeneracion || dt.voltaje);
                          const intAmp = cleanDisplayVal(dt.interruptorAmp || dt.interruptorPrincipalAmp || dt.amperaje);
                          const intMarca = cleanDisplayVal(dt.interruptorMarca, '');
                          const comb = cleanDisplayVal(dt.combustible || dt.tipoCombustible, 'DIÉSEL');
                          const alimenta = cleanDisplayVal(resolveElementAlimentaADisplay(e, todosElementosJerarquia).text || e.alimentaA || dt.alimentaA);
                          return (
                            <tr key={e.id} className="hover:bg-slate-900/50 print:hover:bg-transparent">
                              <td className="py-1.5 px-2.5 font-bold">
                                <span>{cleanElementName(e.nombre, e.id, e.codigo)}</span>{' '}
                                <span className="text-[9px] font-mono text-amber-400 print:text-slate-700">[{getElementCode(e, 'GENERADOR')}]</span>
                              </td>
                              <td className="py-1.5 px-2.5">{cleanDisplayVal(resolveElementUbicacionDisplay(e))}</td>
                              <td className="py-1.5 px-2.5 font-mono font-bold text-amber-400 print:text-slate-900">
                                {kva}{kw ? ` / ${kw}` : ''} ({volt})
                              </td>
                              <td className="py-1.5 px-2.5">{intMarca ? `${intMarca} ` : ''}{intAmp} • {comb}</td>
                              <td className="py-1.5 px-2.5 text-[10px]">{alimenta}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic">No se registraron generadores en este proyecto.</p>
                )}
              </div>
            )}

            {/* 2.4 Transferencias */}
            {showSec('TRANSFER') && (
              <div className="space-y-2 break-inside-avoid">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-200 print:text-slate-800 flex items-center justify-between">
                  <span>2.4 Sistemas de Transferencia (ATS / MTS)</span>
                  <span className="text-[10px] text-slate-500 font-normal">Total: {vTransferencias.length}</span>
                </h3>
                {vTransferencias.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-left border border-slate-800 print:border-slate-300">
                      <thead className="bg-slate-950 text-[10px] font-bold uppercase tracking-wider text-slate-400 print:bg-slate-100 print:text-slate-800">
                        <tr>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Código / Nombre</th>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Ubicación</th>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Tipo / Modelo</th>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Capacidad / Tensión</th>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Fuentes Vinculadas</th>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Tierra</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 print:divide-slate-200 text-slate-300 print:text-slate-800">
                        {vTransferencias.map((e) => {
                          const dt = parseDtSafe(e.datosTecnicos);
                          const tipoTr = cleanDisplayVal(dt.tipoTransferencia || dt.tipoTransferenciaOperativa || dt.modoOperativo, 'ATS/MTS');
                          const modelo = cleanDisplayVal(dt.modelo || dt.controladorAts, '');
                          const cap = cleanDisplayVal(dt.capacidadAmperios || dt.amperajeNominal || dt.amperaje || dt.capacidadNominal);
                          const tens = cleanDisplayVal(dt.tensionNominal);
                          const fuentes = cleanDisplayVal(resolveElementParentDisplay(e, todosElementosJerarquia));
                          const tierra = cleanDisplayVal(dt.tierraConductor || dt.tierra);
                          return (
                            <tr key={e.id} className="hover:bg-slate-900/50 print:hover:bg-transparent">
                              <td className="py-1.5 px-2.5 font-bold">
                                <span>{cleanElementName(e.nombre, e.id, e.codigo)}</span>{' '}
                                <span className="text-[9px] font-mono text-amber-400 print:text-slate-700">[{getElementCode(e, 'TRANSFER')}]</span>
                              </td>
                              <td className="py-1.5 px-2.5">{cleanDisplayVal(resolveElementUbicacionDisplay(e))}</td>
                              <td className="py-1.5 px-2.5">{tipoTr}{modelo ? ` • ${modelo}` : ''}</td>
                              <td className="py-1.5 px-2.5 font-mono font-bold text-amber-400 print:text-slate-900">{cap} ({tens})</td>
                              <td className="py-1.5 px-2.5 text-[10px]">{fuentes}</td>
                              <td className="py-1.5 px-2.5 font-mono text-[10px]">{tierra}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic">No se registraron transferencias en este proyecto.</p>
                )}
              </div>
            )}

            {/* 2.5 Paneles Eléctricos */}
            {showSec('TABLERO') && (
              <div className="space-y-2 break-inside-avoid">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-200 print:text-slate-800 flex items-center justify-between">
                  <span>2.5 Paneles Eléctricos (Tableros de Distribución, Fuerza y Alumbrado)</span>
                  <span className="text-[10px] text-slate-500 font-normal">Total: {vTableros.length}</span>
                </h3>
                {vTableros.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-left border border-slate-800 print:border-slate-300">
                      <thead className="bg-slate-950 text-[10px] font-bold uppercase tracking-wider text-slate-400 print:bg-slate-100 print:text-slate-800">
                        <tr>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Código / Nombre</th>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Ubicación</th>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Tensión / Polos</th>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Interruptor Principal</th>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Potencia Est. / Circuitos</th>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Alimentado Por</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 print:divide-slate-200 text-slate-300 print:text-slate-800">
                        {vTableros.map((e) => {
                          const dt = parseDtSafe(e.datosTecnicos);
                          const pot = calcularPotenciaEstimadaTablero(e);
                          const bp = e.breakerPrincipal || dt.breakerPrincipal || {};
                          const breakerStr = [bp.marca, bp.tipo, bp.amp].filter(Boolean).join(' ') || cleanDisplayVal(dt.capacidadBarraje || dt.amperajeNominal || dt.interruptorPrincipal, 'Sin breaker principal');
                          const circuitsList = Array.isArray(dt.circuits) ? dt.circuits : (Array.isArray(e.circuits) ? e.circuits : []);
                          const activeCircuits = circuitsList.filter((c) => (c?.equipo && c.equipo !== 'RESERVA') || c?.breaker?.amp).length;
                          const tensionVal = cleanDisplayVal(dt.voltajeAcometida || dt.tensionNominal || e.tensionNominal, '208Y/120 V');
                          return (
                            <tr key={e.id} className="hover:bg-slate-900/50 print:hover:bg-transparent">
                              <td className="py-1.5 px-2.5 font-bold">
                                <span>{cleanElementName(e.nombre, e.id, e.codigo)}</span>{' '}
                                <span className="text-[9px] font-mono text-amber-400 print:text-slate-700">[{getElementCode(e, 'TABLERO')}]</span>
                              </td>
                              <td className="py-1.5 px-2.5">{cleanDisplayVal(resolveElementUbicacionDisplay(e))}</td>
                              <td className="py-1.5 px-2.5 font-mono">{tensionVal} ({dt.maxPoles || 24}P)</td>
                              <td className="py-1.5 px-2.5">{breakerStr}</td>
                              <td className="py-1.5 px-2.5 font-mono font-bold text-sky-400 print:text-slate-900">
                                {pot.texto} {circuitsList.length > 0 ? `• ${activeCircuits}/${circuitsList.length} ctos` : ''}
                              </td>
                              <td className="py-1.5 px-2.5 text-[10px]">{cleanDisplayVal(resolveElementParentDisplay(e, todosElementosJerarquia))}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic">No se registraron paneles eléctricos en este proyecto.</p>
                )}
              </div>
            )}

            {/* 2.6 Bancos de Condensadores */}
            {showSec('BANCO_CONDENSADOR') && (
              <div className="space-y-2 break-inside-avoid">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-200 print:text-slate-800 flex items-center justify-between">
                  <span>2.6 Bancos de Condensadores</span>
                  <span className="text-[10px] text-slate-500 font-normal">Total: {vBancosCondensadores.length}</span>
                </h3>
                {vBancosCondensadores.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-left border border-slate-800 print:border-slate-300">
                      <thead className="bg-slate-950 text-[10px] font-bold uppercase tracking-wider text-slate-400 print:bg-slate-100 print:text-slate-800">
                        <tr>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Código / Nombre</th>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Ubicación</th>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Capacidad (kVAR)</th>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Tipo / Pasos</th>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Tensión</th>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Alimentado Por</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 print:divide-slate-200 text-slate-300 print:text-slate-800">
                        {vBancosCondensadores.map((e) => {
                          const dt = parseDtSafe(e.datosTecnicos);
                          return (
                            <tr key={e.id} className="hover:bg-slate-900/50 print:hover:bg-transparent">
                              <td className="py-1.5 px-2.5 font-bold">
                                <span>{cleanElementName(e.nombre, e.id, e.codigo)}</span>{' '}
                                <span className="text-[9px] font-mono text-amber-400 print:text-slate-700">[{getElementCode(e, 'BANCO_CONDENSADOR')}]</span>
                              </td>
                              <td className="py-1.5 px-2.5">{cleanDisplayVal(resolveElementUbicacionDisplay(e))}</td>
                              <td className="py-1.5 px-2.5 font-mono font-bold text-amber-400 print:text-slate-900">
                                {cleanDisplayVal(dt.potenciaReactivaTotal || dt.kvarTotal)}
                              </td>
                              <td className="py-1.5 px-2.5">
                                {dt.tipoCompensacion || 'Automático'} {dt.numPasos ? `(${dt.numPasos} pasos)` : ''}
                              </td>
                              <td className="py-1.5 px-2.5">{cleanDisplayVal(dt.tensionNominal || dt.tensionCondensador)}</td>
                              <td className="py-1.5 px-2.5 text-[10px]">{cleanDisplayVal(resolveElementParentDisplay(e, todosElementosJerarquia))}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic">No se registraron bancos de condensadores en este proyecto.</p>
                )}
              </div>
            )}

            {/* 2.7 Centros de Control de Motores (CCM) */}
            {showSec('CCM') && (
              <div className="space-y-2 break-inside-avoid">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-200 print:text-slate-800 flex items-center justify-between">
                  <span>2.7 Centros de Control de Motores (CCM)</span>
                  <span className="text-[10px] text-slate-500 font-normal">Total: {vCcmList.length}</span>
                </h3>
                {vCcmList.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-left border border-slate-800 print:border-slate-300">
                      <thead className="bg-slate-950 text-[10px] font-bold uppercase tracking-wider text-slate-400 print:bg-slate-100 print:text-slate-800">
                        <tr>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Código / Tag CCM</th>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Planta / Área</th>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Fabricante / NEMA</th>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Tensión / Bus Principal</th>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Gavetas / Alimentado Por</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 print:divide-slate-200 text-slate-300 print:text-slate-800">
                        {vCcmList.map((e) => {
                          const params = e.parametrosElectricos || {};
                          const tens = cleanDisplayVal(params.tensionPrincipal?.medido || params.tensionPrincipal?.nominal || params.tensionNominal || e.tensionOperativa);
                          const bus = cleanDisplayVal(params.busPrincipal?.medido || params.busPrincipal?.nominal || e.capacidadBarraAmperios, '');
                          const fabricante = [e.fabricanteMarca, e.gradoNemaIp].filter(Boolean).join(' • ') || '—';
                          const gavetas = e.gavetasBucketLog?.length ? `${e.gavetasBucketLog.length} gavetas` : (e.numeroGavetas ? `${e.numeroGavetas} gavetas` : '—');
                          return (
                            <tr key={e.id} className="hover:bg-slate-900/50 print:hover:bg-transparent">
                              <td className="py-1.5 px-2.5 font-bold">
                                <span>{cleanElementName(e.nombre, e.id, e.codigo)}</span>{' '}
                                <span className="text-[9px] font-mono text-amber-400 print:text-slate-700">[{getElementCode(e, 'CCM')}]</span>
                              </td>
                              <td className="py-1.5 px-2.5">{cleanDisplayVal(resolveElementUbicacionDisplay(e) || e.plantaInstalacion)}</td>
                              <td className="py-1.5 px-2.5">{fabricante}</td>
                              <td className="py-1.5 px-2.5 font-mono">{tens}{bus ? ` • Bus ${bus}` : ''}</td>
                              <td className="py-1.5 px-2.5 font-mono text-[10px]">
                                {gavetas} • {cleanDisplayVal(resolveElementParentDisplay(e, todosElementosJerarquia))}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic">No se registraron centros de control de motores en este proyecto.</p>
                )}
              </div>
            )}

            {/* 2.8 Inspecciones Especializadas Capa 2 */}
            {showSec('INSPECCIONES') && (
              <div className="space-y-2 break-inside-avoid">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-200 print:text-slate-800 flex items-center justify-between">
                  <span>2.8 Inspecciones Técnicas Especializadas (Subestación, Termografía, SPAT, Tanques)</span>
                  <span className="text-[10px] text-slate-500 font-normal">Total: {vSubestaciones.length}</span>
                </h3>
                {vSubestaciones.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-left border border-slate-800 print:border-slate-300">
                      <thead className="bg-slate-950 text-[10px] font-bold uppercase tracking-wider text-slate-400 print:bg-slate-100 print:text-slate-800">
                        <tr>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Código / Nombre</th>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Tipo Inspección</th>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Ubicación</th>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Resultado / Métricas</th>
                          <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Fecha / Inspector</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 print:divide-slate-200 text-slate-300 print:text-slate-800">
                        {vSubestaciones.map((sub) => {
                          const meta = getInspeccionMeta(sub);
                          return (
                            <tr key={sub.id} className="hover:bg-slate-900/50 print:hover:bg-transparent">
                              <td className="py-1.5 px-2.5 font-bold">
                                <span>{cleanElementName(sub.nombre, sub.id, sub.codigo)}</span>{' '}
                                <span className="text-[9px] font-mono text-amber-400 print:text-slate-700">[{getElementCode(sub, sub.tipoElemento || 'SUBESTACION')}]</span>
                              </td>
                              <td className="py-1.5 px-2.5 font-semibold">{meta.badge}</td>
                              <td className="py-1.5 px-2.5">{cleanDisplayVal(resolveElementUbicacionDisplay(sub))}</td>
                              <td className="py-1.5 px-2.5 font-mono text-[10px]">{meta.resumen}</td>
                              <td className="py-1.5 px-2.5 text-[10px]">{sub.fecha || '—'} • {sub.inspector || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic">No se registraron inspecciones especializadas de Capa 2 en este proyecto.</p>
                )}
              </div>
            )}

            {/* Registros heredados de PUESTA_TIERRA si existen */}
            {vPuestasTierraLegacy.length > 0 && (
              <div className="space-y-2 break-inside-avoid">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-200 print:text-slate-800 flex items-center justify-between">
                  <span>Registros Históricos de Puesta a Tierra (PAT)</span>
                  <span className="text-[10px] text-slate-500 font-normal">Total: {vPuestasTierraLegacy.length}</span>
                </h3>
                <table className="w-full text-[11px] text-left border border-slate-800 print:border-slate-300">
                  <thead className="bg-slate-950 text-[10px] font-bold uppercase tracking-wider text-slate-400 print:bg-slate-100 print:text-slate-800">
                    <tr>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Tag / Malla</th>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Ubicación</th>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Resistencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 print:divide-slate-200 text-slate-300 print:text-slate-800">
                    {vPuestasTierraLegacy.map((e) => (
                      <tr key={e.id}>
                        <td className="py-1.5 px-2.5 font-bold">{cleanElementName(e.nombre, e.id, e.codigo)}</td>
                        <td className="py-1.5 px-2.5">{cleanDisplayVal(resolveElementUbicacionDisplay(e))}</td>
                        <td className="py-1.5 px-2.5 font-mono">{e.datosTecnicos?.resistenciaOhms || e.datosTecnicos?.resistencia || '—'} Ω</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ================= SECCIÓN 3: JERARQUÍA Y DIAGRAMA UNIFILAR ================= */}
        {elementTypeFilter !== 'INSPECCIONES' && (
          <div className="page-break py-6 px-4 md:px-6 space-y-4 print:py-2 print:px-0">
            <div className="border-b border-slate-800 pb-2 print:border-slate-300">
              <h2 className="text-base font-bold uppercase tracking-wider text-amber-500 print:text-slate-950 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" /> 3. Jerarquía y Diagrama Unifilar Gráfico (CAD)
              </h2>
            </div>

            <p className="text-xs text-slate-300 print:text-slate-800">
              Arquitectura unifilar y matriz de alimentación eléctrica trazando el flujo aguas arriba y aguas abajo entre fuentes principales, transferencias y paneles:
            </p>

            <div className="w-full bg-white text-black rounded-xl shadow-sm border border-slate-200 print:border-slate-400 p-2 overflow-x-auto break-inside-avoid">
              <DiagramaUnifilarBlueprint
                elementos={diagramElementos}
                companyName={company.nombre}
                projectName={proyecto.nombre}
                interactive={false}
              />
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 print:bg-slate-50 print:border-slate-300 print:p-3">
              <span className="text-[10px] font-bold text-slate-400 print:text-slate-700 uppercase tracking-wider block">
                Matriz de Alimentación y Enlaces Aguas Abajo:
              </span>
              {diagramElementos.length > 0 ? (
                <div className="space-y-2">
                  {diagramElementos.map((e) => {
                    const eDt = parseDtSafe(e.datosTecnicos);
                    const eAlimentaIds = new Set([
                      ...(Array.isArray(e.alimentaAIds) ? e.alimentaAIds : []),
                      ...(Array.isArray(eDt.alimentaAIds) ? eDt.alimentaAIds : []),
                      ...(eDt.salidaCargaId ? [eDt.salidaCargaId] : [])
                    ].map(String));
                    const circuitsList = Array.isArray(eDt.circuits) ? eDt.circuits : (Array.isArray(e.circuits) ? e.circuits : []);
                    circuitsList.forEach((c) => {
                      const rawDest = c?.elementoDestinoId || c?.vinculadoId || '';
                      if (rawDest) {
                        String(rawDest).split(',').map((s) => s.trim()).filter(Boolean).forEach((cid) => eAlimentaIds.add(cid));
                      }
                    });

                    const feeds = todosElementosJerarquia.filter((child) => {
                      if (!child?.id || child.id === e.id) return false;
                      const cDt = parseDtSafe(child.datosTecnicos);
                      if (eAlimentaIds.has(String(child.id))) return true;
                      if (
                        child.alimentadoPorId === e.id ||
                        cDt.alimentadoPorId === e.id ||
                        cDt.alimentadorId === e.id ||
                        cDt.fuenteNormalId === e.id ||
                        cDt.fuenteEmergenciaId === e.id
                      ) return true;
                      if (Array.isArray(cDt.alimentadoPorIds) && cDt.alimentadoPorIds.includes(e.id)) return true;
                      if (!isPlaceholderHierarchyValue(child.alimentadoPor)) {
                        const cleanChildParent = String(child.alimentadoPor).toLowerCase();
                        const cleanParentName = cleanElementName(e.nombre, e.id, e.codigo).toLowerCase();
                        if (cleanParentName && cleanChildParent.includes(cleanParentName)) return true;
                      }
                      return false;
                    });

                    const upstream = resolveElementParentDisplay(e, todosElementosJerarquia);

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
                          {upstream && (
                            <span className="text-[9px] text-slate-400 print:text-slate-600">
                              &bull; Aguas arriba: <strong className="text-slate-300 print:text-slate-800">{upstream}</strong>
                            </span>
                          )}
                        </div>

                        {feeds.length > 0 && (
                          <div className="pl-4 mt-1 space-y-0.5">
                            <span className="text-[9px] font-semibold text-slate-500 uppercase block">Alimenta aguas abajo:</span>
                            {feeds.map((child) => (
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
                <p className="text-xs text-slate-500 italic text-center">No hay elementos unifilares en el filtro actual.</p>
              )}
            </div>
          </div>
        )}

        {/* ================= SECCIÓN 4: RESULTADOS DE INSPECCIONES TÉCNICAS Y CONSOLIDADO SPT ================= */}
        <div className="page-break py-6 px-4 md:px-6 space-y-6 print:py-2 print:px-0">
          <div className="border-b border-slate-800 pb-2 print:border-slate-300">
            <h2 className="text-base font-bold uppercase tracking-wider text-amber-500 print:text-slate-950 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500" /> 4. Resultados de las Inspecciones Técnicas y Sistema de Puesta a Tierra
            </h2>
          </div>

          {/* 4.1 Hallazgos Técnicos y Alertas de Campo */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-200 print:text-slate-800 flex items-center justify-between">
              <span>4.1 Hallazgos Técnicos y Condiciones Detectadas en Campo</span>
              <span className="text-[10px] font-mono text-amber-400 print:text-slate-700">{auditFindings.length} registro(s)</span>
            </h3>
            {auditFindings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] text-left border border-slate-800 print:border-slate-300">
                  <thead className="bg-slate-950 text-[10px] font-bold uppercase tracking-wider text-slate-400 print:bg-slate-100 print:text-slate-800">
                    <tr>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300 w-1/4">Equipo / Ubicación</th>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300 w-1/6">Categoría / Nivel</th>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Hallazgo Técnico Documentado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 print:divide-slate-200 text-slate-300 print:text-slate-800">
                    {auditFindings.map((f) => (
                      <tr key={f.id}>
                        <td className="py-2 px-2.5 align-top">
                          <div className="font-bold text-slate-100 print:text-slate-950">
                            {f.equipo} <span className="font-mono text-[9px] text-amber-400 print:text-slate-700">[{f.codigo}]</span>
                          </div>
                          <div className="text-[10px] text-slate-400 print:text-slate-600">{f.ubicacion}</div>
                        </td>
                        <td className="py-2 px-2.5 align-top">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[9.5px] font-bold border ${
                              f.severidad === 'ALTA'
                                ? 'bg-red-950/60 text-red-400 border-red-800/60 print:bg-red-50 print:text-red-900 print:border-red-400'
                                : f.severidad === 'MEDIA'
                                  ? 'bg-amber-950/60 text-amber-400 border-amber-800/60 print:bg-amber-50 print:text-amber-900 print:border-amber-400'
                                  : 'bg-sky-950/60 text-sky-400 border-sky-800/60 print:bg-slate-100 print:text-slate-800 print:border-slate-300'
                            }`}
                          >
                            {f.categoria}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 align-top leading-relaxed">{f.detalle}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-xs text-emerald-300 print:bg-slate-50 print:border-slate-300 print:text-slate-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>No se detectaron alertas críticas automáticas en los elementos visibles de este filtro.</span>
              </div>
            )}
          </div>

          {/* 4.2 Consolidado de Sistema de Puesta a Tierra (SPT) en Equipos */}
          {sptConsolidatedRows.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-200 print:text-slate-800 flex items-center justify-between">
                <span>4.2 Consolidado de Puesta a Tierra (SPT) en Tableros, Transformadores y Transferencias</span>
                <span className="text-[10px] text-slate-500 font-normal">Total: {sptConsolidatedRows.length}</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] text-left border border-slate-800 print:border-slate-300">
                  <thead className="bg-slate-950 text-[10px] font-bold uppercase tracking-wider text-slate-400 print:bg-slate-100 print:text-slate-800">
                    <tr>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Código / Equipo</th>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Tipo / Ubicación</th>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Calibre / Medición</th>
                      <th className="py-1.5 px-2.5 border-b border-slate-800 print:border-slate-300">Estado / Observación SPT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 print:divide-slate-200 text-slate-300 print:text-slate-800">
                    {sptConsolidatedRows.map((r) => (
                      <tr key={r.id}>
                        <td className="py-1.5 px-2.5 font-bold">
                          {r.equipo} <span className="font-mono text-[9px] text-amber-400 print:text-slate-700">[{r.codigo}]</span>
                        </td>
                        <td className="py-1.5 px-2.5">{r.tipo} • {r.ubicacion}</td>
                        <td className="py-1.5 px-2.5 font-mono">{r.calibre}</td>
                        <td className="py-1.5 px-2.5">{r.estadoObs}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ================= SECCIÓN 5: ANEXOS — FICHAS TÉCNICAS DETALLADAS ================= */}
        <div className="space-y-8 print:space-y-4">
          <div className="border-b border-slate-800 pb-2 print:border-slate-300 px-4 md:px-6 print:px-0">
            <h2 className="text-base font-bold uppercase tracking-wider text-amber-500 print:text-slate-950 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-500" /> 5. Anexos — Fichas Técnicas Detalladas por Equipo
            </h2>
          </div>

          {/* Paneles, Transformadores, Generadores, Transferencias, Bancos y Otros */}
          {vElementosGenericosAnexos.map((item, idx) => {
            const tipoEl = item.tipoElemento || 'TABLERO';
            const isTablero = tipoEl === 'TABLERO';
            const isTransfer = tipoEl === 'TRANSFER';

            const enrichedElement = isTablero
              ? {
                  id: item.id,
                  codigo: item.codigo,
                  nombre: item.nombre,
                  ubicacion: item.ubicacion,
                  alimentadoPor: item.alimentadoPor,
                  alimentadoPorId: item.alimentadoPorId,
                  foto: item.foto,
                  fotoBlob: item.fotoBlob,
                  observacionesGenerales: item.observacionesGenerales,
                  ...parseDtSafe(item.datosTecnicos),
                  circuits: Array.isArray(item.datosTecnicos?.circuits)
                    ? item.datosTecnicos.circuits
                    : (Array.isArray(item.circuits) ? item.circuits : []),
                  nombreEmpresa: company.nombre
                }
              : item;

            return (
              <div key={item.id} className="page-break pt-4 print:pt-0 space-y-3 print:space-y-1 px-4 md:px-6 print:px-0">
                <div className="no-print border-b border-amber-500/80 pb-2 flex justify-between items-center bg-slate-900/40 p-2.5 rounded-t-xl">
                  <div>
                    <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest block">
                      Ficha #{idx + 1} &bull; {tipoEl}
                    </span>
                    <h3 className="text-sm font-black text-slate-100 uppercase">
                      {cleanElementName(item.nombre, item.id, item.codigo)}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                      ID: {getElementCode(item, tipoEl)}
                    </span>
                    {isTablero && (
                      <span className="text-[11px] font-mono font-bold text-sky-400 bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 rounded">
                        ⚡ {calcularPotenciaEstimadaTablero(enrichedElement).texto}
                      </span>
                    )}
                  </div>
                </div>

                {isTablero ? (
                  <div className={isEditingReport ? '' : 'pointer-events-none select-none'}>
                    <TableroComponent
                      tableroData={enrichedElement}
                      onUpdateTablero={(updatedData) => handleUpdateElemento(item.id, updatedData)}
                    />
                  </div>
                ) : isTransfer ? (
                  <div className={isEditingReport ? '' : 'pointer-events-none select-none'}>
                    <TransferComponent
                      transferData={enrichedElement}
                      onUpdate={(updatedData) => handleUpdateElemento(item.id, updatedData)}
                    />
                  </div>
                ) : (
                  <div className={isEditingReport ? '' : 'pointer-events-none select-none'}>
                    <FichaTecnicaComponent
                      elementoData={enrichedElement}
                      onUpdate={(updatedData) => handleUpdateElemento(item.id, updatedData)}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Puntos de Suministro y Medición (renderizado único, sin duplicar) */}
          {vPuntosMedicion.map((pm, idx) => (
            <div key={pm.id} className="page-break pt-4 print:pt-0 space-y-3 print:space-y-1 px-4 md:px-6 print:px-0">
              <div className="no-print border-b border-amber-500/80 pb-2 flex justify-between items-center bg-slate-900/40 p-2.5 rounded-t-xl">
                <div>
                  <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest block">
                    Punto de Suministro / Medición #{idx + 1}
                  </span>
                  <h3 className="text-sm font-black text-slate-100 uppercase">
                    {cleanElementName(pm.nombre, pm.id, pm.codigo)}
                  </h3>
                </div>
                <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                  ID: {getElementCode(pm, pm.tipoElemento || 'PUNTO_MEDICION')}
                </span>
              </div>

              <div className={isEditingReport ? '' : 'pointer-events-none select-none'}>
                <PuntoMedicionComponent
                  puntoData={pm}
                  elementosCreados={todosElementosJerarquia}
                  onUpdate={(updatedData) => {
                    const isUnifilarPm = elementos.some((e) => e.id === pm.id);
                    if (isUnifilarPm) {
                      updateElementoUnifilar(proyectoId, pm.id, {
                        ...updatedData,
                        datosTecnicos: {
                          ...(pm.datosTecnicos || {}),
                          ...updatedData
                        }
                      });
                    } else {
                      updatePuntoMedicion(proyectoId, pm.id, updatedData);
                    }
                  }}
                />
              </div>
            </div>
          ))}

          {/* CCMs */}
          {vCcmList.map((ccm, idx) => (
            <div key={ccm.id} className="page-break pt-4 print:pt-0 space-y-3 print:space-y-1 px-4 md:px-6 print:px-0">
              <div className="no-print border-b border-amber-500/80 pb-2 flex justify-between items-center bg-slate-900/40 p-2.5 rounded-t-xl">
                <div>
                  <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest block">
                    CCM #{idx + 1} &bull; Centro de Control de Motores y Gavetas
                  </span>
                  <h3 className="text-sm font-black text-slate-100 uppercase">
                    {cleanElementName(ccm.nombre, ccm.id, ccm.codigo)}
                  </h3>
                </div>
                <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                  ID: {getElementCode(ccm, 'CCM')}
                </span>
              </div>

              <div className={isEditingReport ? '' : 'pointer-events-none select-none'}>
                <CcmComponent
                  ccmData={ccm}
                  elementosCreados={todosElementosJerarquia}
                  onUpdate={(updatedData) => {
                    const isUnifilarCcm = elementos.some((e) => e.id === ccm.id);
                    if (isUnifilarCcm) {
                      updateElementoUnifilar(proyectoId, ccm.id, {
                        ...updatedData,
                        datosTecnicos: {
                          ...(ccm.datosTecnicos || {}),
                          ...updatedData
                        }
                      });
                    } else {
                      updateCcm(proyectoId, ccm.id, updatedData);
                    }
                  }}
                />
              </div>
            </div>
          ))}

          {/* Inspecciones Técnicas Especializadas (Subestación / Termografía / SPAT / Tanques) */}
          {vSubestaciones.map((sub, idx) => {
            const meta = getInspeccionMeta(sub);
            return (
              <div key={sub.id} className="page-break pt-4 print:pt-0 space-y-3 print:space-y-1 px-4 md:px-6 print:px-0">
                <div className="no-print border-b border-amber-500/80 pb-2 flex justify-between items-center bg-slate-900/40 p-2.5 rounded-t-xl">
                  <div>
                    <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest block">
                      Inspección #{idx + 1} &bull; {meta.badge}
                    </span>
                    <h3 className="text-sm font-black text-slate-100 uppercase">
                      {cleanElementName(sub.nombre, sub.id, sub.codigo)}
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                    ID: {getElementCode(sub, sub.tipoElemento || 'SUBESTACION')}
                  </span>
                </div>

                <div className={isEditingReport ? '' : 'pointer-events-none select-none'}>
                  <SubestacionComponent
                    subestacionData={sub}
                    onUpdate={(updatedData) => handleUpdateSubestacion(sub.id, updatedData)}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* ================= SECCIÓN 6: CONCLUSIONES Y RESUMEN DE RECOMENDACIONES ================= */}
        <div className="page-break py-6 px-4 md:px-6 space-y-6 print:py-2 print:px-0">
          <div className="border-b border-slate-800 pb-2 print:border-slate-300">
            <h2 className="text-base font-bold uppercase tracking-wider text-amber-500 print:text-slate-950 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-amber-500" /> 6. Conclusiones y Resumen de Recomendaciones Técnicas
            </h2>
          </div>

          {/* 6.1 Cuadro de Observaciones por Equipo (incluyendo Puntos de Suministro y CCM) */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-200 print:text-slate-800">
              6.1 Observaciones Técnicas por Equipo y Área Auditada ({conclusionSummaryItems.length})
            </h3>
            {conclusionSummaryItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] text-left border border-slate-800 print:border-slate-300">
                  <thead className="bg-slate-950 text-[10px] font-bold uppercase tracking-wider text-slate-400 print:bg-slate-100 print:text-slate-800">
                    <tr>
                      <th className="py-2 px-3 border-b border-slate-800 print:border-slate-300 w-1/3">Área / Equipo Auditado</th>
                      <th className="py-2 px-3 border-b border-slate-800 print:border-slate-300">Observaciones Técnicas y Diagnóstico</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 print:divide-slate-200 text-slate-300 print:text-slate-800">
                    {conclusionSummaryItems.map((row) => (
                      <tr key={`${row.categoria}-${row.id}`} className="hover:bg-slate-900/50 print:hover:bg-transparent">
                        <td className="py-2 px-3 font-bold uppercase align-top">
                          <div>{row.nombre}</div>
                          <div className="text-[9px] text-slate-500 font-normal font-mono">
                            {row.codigo} &bull; {row.categoria} &bull; {row.ubicacion}
                          </div>
                        </td>
                        <td className="py-2 px-3 leading-relaxed align-top">
                          {isEditingReport ? (
                            <textarea
                              value={row.observacion}
                              onChange={(eVal) => handleUpdateSummaryObservation(row, eVal.target.value)}
                              placeholder="Edite los hallazgos o recomendaciones del equipo..."
                              rows={2}
                              className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-slate-100 rounded px-2 py-1 text-xs outline-none"
                            />
                          ) : (
                            row.observacion || row.defaultMsg
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No hay elementos registrados para resumir en el filtro activo.</p>
            )}
          </div>

          {/* 6.2 Cuadro Consolidado de Recomendaciones Prioritarias (Área / Recomendación) */}
          <div className="space-y-3 pt-2 break-inside-avoid">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-200 print:text-slate-800">
                6.2 Resumen de Recomendaciones Técnicas Prioritarias
              </h3>
              {isEditingReport && customRecommendations !== null && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomRecommendations(null);
                    persistReportMeta({ customRecommendations: null });
                  }}
                  className="text-[10px] font-bold text-amber-400 hover:underline cursor-pointer"
                >
                  Restaurar recomendaciones automáticas
                </button>
              )}
            </div>

            <table className="w-full text-[11px] text-left border border-slate-800 print:border-slate-300">
              <thead className="bg-slate-950 text-[10px] font-bold uppercase tracking-wider text-slate-400 print:bg-slate-100 print:text-slate-800">
                <tr>
                  <th className="py-2 px-3 border-b border-slate-800 print:border-slate-300 w-1/3">Área / Equipo</th>
                  <th className="py-2 px-3 border-b border-slate-800 print:border-slate-300">Recomendación de Ingeniería</th>
                  {isEditingReport && <th className="py-2 px-2 border-b border-slate-800 w-10 text-center no-print">Acc.</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 print:divide-slate-200 text-slate-300 print:text-slate-800">
                {activeRecommendations.map((rec, idx) => (
                  <tr key={idx}>
                    <td className="py-2 px-3 font-bold uppercase align-top">
                      {isEditingReport ? (
                        <input
                          type="text"
                          value={rec.area}
                          onChange={(e) => {
                            const next = [...activeRecommendations];
                            next[idx] = { ...next[idx], area: e.target.value };
                            setCustomRecommendations(next);
                            persistReportMeta({ customRecommendations: next });
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100"
                        />
                      ) : (
                        rec.area
                      )}
                    </td>
                    <td className="py-2 px-3 leading-relaxed align-top">
                      {isEditingReport ? (
                        <textarea
                          rows={2}
                          value={rec.recomendacion}
                          onChange={(e) => {
                            const next = [...activeRecommendations];
                            next[idx] = { ...next[idx], recomendacion: e.target.value };
                            setCustomRecommendations(next);
                            persistReportMeta({ customRecommendations: next });
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100"
                        />
                      ) : (
                        rec.recomendacion
                      )}
                    </td>
                    {isEditingReport && (
                      <td className="py-2 px-2 text-center align-top no-print">
                        <button
                          type="button"
                          onClick={() => {
                            const next = activeRecommendations.filter((_, i) => i !== idx);
                            setCustomRecommendations(next);
                            persistReportMeta({ customRecommendations: next });
                          }}
                          className="p-1 text-red-400 hover:text-red-300 cursor-pointer"
                          title="Eliminar recomendación"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {isEditingReport && (
              <div className="flex items-center gap-2 no-print">
                <input
                  type="text"
                  value={newRecommendationText}
                  onChange={(e) => setNewRecommendationText(e.target.value)}
                  placeholder="Agregar recomendación técnica adicional..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    const txt = newRecommendationText.trim();
                    if (!txt) return;
                    const next = [...activeRecommendations, { area: 'GENERAL DEL SISTEMA', recomendacion: txt }];
                    setCustomRecommendations(next);
                    persistReportMeta({ customRecommendations: next });
                    setNewRecommendationText('');
                  }}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar
                </button>
              </div>
            )}
          </div>

          {/* ================= SECCIÓN 7: CAJETÍN DE FIRMAS Y APROBACIÓN ================= */}
          <div className="pt-8 border-t border-slate-800 print:border-slate-300 break-inside-avoid">
            <span className="text-[10px] font-bold text-amber-500 print:text-slate-600 uppercase tracking-widest block mb-6 text-center">
              7. Validación y Aprobación de Ingeniería Eléctrica
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
