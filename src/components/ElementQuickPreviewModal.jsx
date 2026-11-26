import React, { Suspense, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore, {
  cleanElementName,
  getSimpleElementCode
} from '../store/useStore';
import { useConfirm } from '../context/ConfirmContext';
import { eliminarImagenEnR2Cliente } from '../utils/syncService';
import {
  X,
  Zap,
  Building2,
  Cpu,
  Layers,
  Radio,
  ArrowRightLeft,
  Flame,
  ExternalLink,
  Info,
  Gauge,
  ShieldCheck,
  Eye,
  Lock
} from 'lucide-react';

// Carga diferida para evitar dependencias circulares con SelectorAlimentadorJerarquico
const LazyTableroComponent = React.lazy(() => import('./TableroComponent'));
const LazyTransferComponent = React.lazy(() => import('./TransferComponent'));
const LazyPuntoMedicionComponent = React.lazy(() => import('./PuntoMedicionComponent'));
const LazyCcmComponent = React.lazy(() => import('./CcmComponent'));
const LazySubestacionComponent = React.lazy(() => import('./SubestacionComponent'));
const LazyFichaTecnicaComponent = React.lazy(() => import('./FichaTecnicaComponent'));

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
  const push = (item, defaultTipo, sourceKind) => {
    if (!item || !item.id) return;
    const key = String(item.id);
    if (seen.has(key)) return;
    seen.add(key);
    list.push({
      ...item,
      tipoElemento: item.tipoElemento || item.tipo || defaultTipo,
      __sourceKind: sourceKind
    });
  };
  (proyecto.elementosUnifilares || []).forEach((e) => push(e, e.tipoElemento || 'TABLERO', 'unifilar'));
  (proyecto.tableros || []).forEach((t) => push(t, 'TABLERO', 'tablero'));
  (proyecto.inspeccionesSubestacion || proyecto.subestaciones || []).forEach((s) => push(s, 'SUBESTACION', 'subestacion'));
  (proyecto.puntosMedicion || []).forEach((p) => push(p, 'PUNTO_MEDICION', 'puntoMedicion'));
  (proyecto.ccmList || []).forEach((c) => push(c, 'CCM', 'ccm'));
  return list;
};

export default function ElementQuickPreviewModal({ elementRef, proyectoId, onClose }) {
  const navigate = useNavigate();
  const { confirm: customConfirm } = useConfirm();
  const companies = useStore((state) => state.companies);
  const user = useStore((state) => state.user);
  const { updateElementoUnifilar, updateSubestacion, updatePuntoMedicion, updateCcm, showToast } = useStore();

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
    let foundCompany = null;
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
        foundCompany = comp;
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

    const tipo = String(foundEl.tipoElemento || foundEl.tipo || 'TABLERO').toUpperCase();
    const simpleCode = getSimpleElementCode(foundEl, tipo, projectElements);
    const nombreLimpio = cleanElementName(foundEl.nombre, foundEl.id, simpleCode || foundEl.codigo).toUpperCase();

    return {
      kind: 'ELEMENT',
      element: foundEl,
      companyId: foundCompany?.id || null,
      companyName: foundCompany?.nombre || '',
      projectId: foundProject?.id || proyectoId || null,
      projectElements,
      tipo,
      simpleCode,
      nombreLimpio
    };
  }, [elementRef, proyectoId, companies]);

  if (!elementRef || !resolved) return null;

  const meta =
    resolved.kind === 'CORPOELEC'
      ? getTypeMeta('RED_PUBLICA')
      : getTypeMeta(resolved.kind === 'ELEMENT' ? resolved.tipo : resolved.tipoElemento);
  const Icon = meta.icon;

  const renderFullReadOnlyComponent = () => {
    if (resolved.kind !== 'ELEMENT') return null;
    const el = resolved.element;
    const tipo = resolved.tipo;
    const noop = () => {};

    if (tipo === 'PUNTO_MEDICION' || tipo === 'PUNTO_SUMINISTRO' || el.__sourceKind === 'puntoMedicion') {
      return (
        <LazyPuntoMedicionComponent
          puntoData={{ ...el, proyectoId: el.proyectoId || resolved.projectId }}
          elementosCreados={resolved.projectElements}
          onUpdate={noop}
          readOnly={true}
        />
      );
    }

    if (tipo === 'CCM' || el.__sourceKind === 'ccm') {
      return (
        <LazyCcmComponent
          ccmData={{ ...el, proyectoId: el.proyectoId || resolved.projectId }}
          elementosCreados={resolved.projectElements}
          onUpdate={noop}
          readOnly={true}
        />
      );
    }

    if (tipo === 'SUBESTACION' || el.__sourceKind === 'subestacion') {
      return (
        <LazySubestacionComponent
          subestacionData={{ ...el, proyectoId: el.proyectoId || resolved.projectId }}
          onUpdate={noop}
          readOnly={true}
        />
      );
    }

    if (tipo === 'TRANSFER') {
      return (
        <LazyTransferComponent
          transferData={{ ...el, proyectoId: el.proyectoId || resolved.projectId }}
          onUpdate={noop}
          readOnly={true}
        />
      );
    }

    if (tipo === 'TABLERO') {
      const enrichedTablero = {
        id: el.id,
        nombre: el.nombre || 'Tablero Eléctrico',
        ubicacion: el.ubicacion || '',
        alimentadoPor: el.alimentadoPor || '',
        alimentadoPorId: el.alimentadoPorId || el.datosTecnicos?.alimentadoPorId || el.datosTecnicos?.alimentadorId || null,
        foto: el.foto || null,
        fotoBlob: el.fotoBlob || null,
        observacionesGenerales: el.observacionesGenerales || '',
        proyectoId: el.proyectoId || resolved.projectId || null,
        empresaId: resolved.companyId || null,
        ...(el.datosTecnicos || {}),
        circuits: Array.isArray(el.datosTecnicos?.circuits)
          ? el.datosTecnicos.circuits
          : (Array.isArray(el.circuits) ? el.circuits : []),
        nombreEmpresa: resolved.companyName || ''
      };
      return (
        <LazyTableroComponent
          tableroData={enrichedTablero}
          onUpdateTablero={noop}
          readOnly={true}
        />
      );
    }

    return (
      <LazyFichaTecnicaComponent
        elementoData={{ ...el, proyectoId: el.proyectoId || resolved.projectId }}
        onUpdate={noop}
        readOnly={true}
      />
    );
  };

  const isFullElement = resolved.kind === 'ELEMENT';

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <div
        className={`relative w-full ${
          isFullElement ? 'max-w-6xl max-h-[94vh]' : 'max-w-xl max-h-[85vh]'
        } bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-amber-500/30`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="px-4 py-3 sm:px-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2 rounded-xl border shrink-0 ${meta.badge}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-mono font-black uppercase tracking-widest ${meta.accent}`}>
                  {meta.label}
                </span>
                {isFullElement && resolved.simpleCode && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono text-[10px] font-bold lowercase">
                    {resolved.simpleCode}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[9.5px] font-mono font-bold uppercase">
                  <Lock className="w-2.5 h-2.5 text-amber-400" />
                  Solo Lectura
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-slate-100 truncate uppercase flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">
                  {resolved.kind === 'CORPOELEC'
                    ? 'CORPOELEC — Red Eléctrica Nacional'
                    : isFullElement
                    ? resolved.nombreLimpio
                    : resolved.nombre}
                </span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isFullElement &&
              user?.role !== 'CLIENT' &&
              (resolved.element?.foto || resolved.element?.fotoUrl || resolved.element?.datosTecnicos?.foto) && (
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const photoUrl =
                      resolved.element?.foto ||
                      resolved.element?.fotoUrl ||
                      resolved.element?.datosTecnicos?.foto;
                    const confirmed = await customConfirm({
                      title: 'Eliminar fotografía',
                      message: '¿Eliminar esta fotografía? Se borrará del elemento y de la nube.',
                      confirmText: 'Sí, Eliminar',
                      cancelText: 'Cancelar',
                      type: 'danger'
                    });
                    if (!confirmed) return;

                    const freshToken =
                      useStore.getState().token ||
                      (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : '') ||
                      '';
                    if (photoUrl) eliminarImagenEnR2Cliente(photoUrl, freshToken);

                    const el = resolved.element;
                    const cleared = {
                      foto: null,
                      fotoUrl: null,
                      imagen: null,
                      fotoBlob: null,
                      eliminarFoto: true,
                      ...(el.datosTecnicos ? { datosTecnicos: { ...el.datosTecnicos, foto: null, fotoUrl: null } } : {})
                    };
                    if (el.__sourceKind === 'subestacion') {
                      updateSubestacion(resolved.projectId, el.id, {
                        ...cleared,
                        estadoEntorno: { ...(el.estadoEntorno || {}), __foto: null }
                      });
                    } else if (el.__sourceKind === 'ccm') {
                      updateCcm(resolved.projectId, el.id, {
                        ...cleared,
                        parametrosElectricos: { ...(el.parametrosElectricos || {}), __foto: null }
                      });
                    } else if (el.__sourceKind === 'puntoMedicion') {
                      updatePuntoMedicion(resolved.projectId, el.id, cleared);
                    } else {
                      updateElementoUnifilar(resolved.projectId, el.id, cleared);
                    }
                    showToast?.('Fotografía eliminada correctamente.', 'info');
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/40 text-[11px] font-bold transition-all cursor-pointer"
                  title="Eliminar fotografía del elemento"
                >
                  <X className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Eliminar Foto</span>
                </button>
              )}
            {isFullElement && resolved.companyId && resolved.element?.id && (
              <button
                type="button"
                onClick={() => {
                  const targetUrl = `/empresa/${resolved.companyId}/tablero/${resolved.element.id}`;
                  onClose();
                  navigate(targetUrl);
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all cursor-pointer shadow-sm"
                title="Ir a la ficha completa para editar"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Ir a Ficha
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all cursor-pointer shrink-0"
              title="Cerrar vista"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cuerpo: Ficha Completa en Solo Lectura */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-slate-950/60 select-text">
          {resolved.kind === 'CORPOELEC' && (
            <div className="p-4 rounded-xl bg-sky-950/30 border border-sky-500/30 space-y-2 text-xs">
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
            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-amber-300 font-bold">
                <Info className="w-4 h-4 text-amber-400" />
                <span>Referencia Manual / Externa</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Este vínculo corresponde a una etiqueta manual (<strong>{resolved.nombre}</strong>) que aún no está registrada como un equipo independiente dentro del proyecto.
              </p>
            </div>
          )}

          {isFullElement && (
            <Suspense
              fallback={
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs font-mono">
                  <div className="w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  <span>Cargando ficha completa del elemento...</span>
                </div>
              }
            >
              {renderFullReadOnlyComponent()}
            </Suspense>
          )}
        </div>

        {/* Pie */}
        <div className="px-4 py-2.5 sm:px-5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2.5 shrink-0">
          <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
            Vista completa de solo lectura • No se permiten modificaciones desde esta ventana
          </span>
          <div className="flex items-center gap-2 ml-auto">
            {isFullElement && resolved.companyId && resolved.element?.id && (
              <button
                type="button"
                onClick={() => {
                  const targetUrl = `/empresa/${resolved.companyId}/tablero/${resolved.element.id}`;
                  onClose();
                  navigate(targetUrl);
                }}
                className="sm:hidden px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Ir a Ficha
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
