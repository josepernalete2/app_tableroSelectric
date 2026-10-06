/**
 * Utilidad avanzada para el cálculo de porcentaje de avance y completitud técnica
 * de activos y planillas de inspección eléctrica en app_tableroSelectric.
 * 
 * Normativa y Criterios:
 * - 100%: Conforme / Levantamiento Totalmente Completo 🏆
 * - 80% - 99%: Levantamiento Avanzado / Casi Listo ⚡
 * - 50% - 79%: En Proceso de Levantamiento 🛠️
 * - 25% - 49%: Inspección Iniciada 📋
 * - 0% - 24%: Pendiente / Solo Datos Básicos ⚠️
 */

export const calcularPorcentajeAvance = (elemento, tipoElemento) => {
  if (!elemento) {
    return {
      porcentaje: 0,
      llenos: 0,
      totalCampos: 10,
      colorClass: 'bg-rose-500',
      textClass: 'text-rose-400',
      badgeClass: 'bg-rose-950/60 text-rose-400 border-rose-800/40',
      statusText: 'Pendiente ⚠️',
      label: '0% completado'
    };
  }

  const tipo = (tipoElemento || elemento.tipoElemento || elemento.tipo || 'TABLERO').toUpperCase();
  
  // Parsear datos técnicos de forma segura si vienen como string JSON
  let dt = elemento.datosTecnicos || elemento.parametrosTecnicos || elemento.ficha || {};
  if (typeof dt === 'string') {
    try {
      dt = JSON.parse(dt);
    } catch {
      dt = {};
    }
  }

  let camposRelevantes = [];

  switch (tipo) {
    case 'TABLERO':
    case 'PANEL': {
      const circuits = elemento.circuits || dt.circuits || [];
      const hasCircuitsWithData = Array.isArray(circuits) && circuits.length > 0 && circuits.some(c => c.descripcion || c.amperaje || c.polo || c.amp);
      const bp = elemento.breakerPrincipal || dt.breakerPrincipal || {};
      const barras = elemento.barrasPrincipales || dt.barrasPrincipales || {};
      const volt = elemento.voltaje || dt.voltaje || dt.voltajeAcometida || dt.tension || '';

      camposRelevantes = [
        elemento.nombre,
        elemento.ubicacion,
        elemento.alimentadoPor,
        volt ? (typeof volt === 'object' ? volt.va || volt.vab : volt) : '',
        hasCircuitsWithData ? 'SI' : '',
        dt.maxPoles || elemento.maxPoles,
        bp.amp || bp.amperaje || dt.amperajePrincipal,
        barras.ia || barras.amperaje || dt.amperajeBarras,
        elemento.neutroLlegada?.calibre || dt.neutroLlegada?.calibre || dt.calibreNeutro,
        elemento.puestaTierra?.calibre || dt.puestaTierra?.calibre || dt.calibreTierra,
        elemento.foto || elemento.fotoBlob || dt.fotografia || elemento.fotoTablero
      ];
      break;
    }

    case 'SUBESTACION':
    case 'INSPECCION_SUBESTACION': {
      const tieneSecciones = elemento.seccionesEvaluadas || dt.evaluacionSecciones || dt.secciones || dt.obrasCiviles;
      camposRelevantes = [
        elemento.nombre,
        elemento.ubicacion,
        elemento.nivelTension || dt.nivelTension,
        elemento.inspector,
        elemento.fecha,
        elemento.capacidadKva || dt.capacidadKva || dt.potenciaKva,
        dt.tensionPrimaria || dt.voltajePrimario,
        dt.tensionSecundaria || dt.voltajeSecundario,
        dt.resistenciaPuestaTierra || dt.resistenciaMalla || dt.resistenciaOhmios,
        tieneSecciones ? 'SI' : '',
        elemento.foto || elemento.fotoBlob || dt.fotografia
      ];
      break;
    }

    case 'GENERADOR':
    case 'GEN':
    case 'PLANTA': {
      camposRelevantes = [
        elemento.nombre,
        elemento.ubicacion,
        dt.kva || dt.capacidadKva || dt.potenciaKva,
        dt.potenciaKw || dt.kw,
        dt.combustible || dt.tipoCombustible,
        dt.voltajeGeneracion || dt.voltaje || dt.tensionGeneracion,
        dt.amperaje || dt.corrienteNominal || dt.breakerAmperios,
        dt.capacidadTanqueLitros || dt.volumenTanque || dt.tanque,
        dt.marca || dt.motorMarca || dt.modeloMotor,
        elemento.foto || elemento.fotoBlob || dt.fotografia
      ];
      break;
    }

    case 'TRANSFER':
    case 'TRANSFERENCIA':
    case 'ATS':
    case 'MTS': {
      camposRelevantes = [
        elemento.nombre,
        elemento.ubicacion,
        dt.capacidadAmperios || dt.amperaje || dt.amperajeNominal,
        dt.tipoTransferencia || dt.tipo,
        dt.tensionOperativa || dt.tensionNominal || dt.tension,
        dt.fuenteNormalNombre || dt.fuente1 || dt.fuenteNormal,
        dt.fuenteEmergenciaNombre || dt.fuente2 || dt.fuenteEmergencia,
        dt.salidaCargaNombre || dt.salidaCarga || dt.cargaAlimentada,
        dt.fuenteNormalConductor || dt.conductorEntrada || dt.salidaCargaConductor,
        elemento.foto || elemento.fotoBlob || dt.fotografia
      ];
      break;
    }

    case 'TRANSFORMADOR':
    case 'TRAFO': {
      camposRelevantes = [
        elemento.nombre,
        elemento.ubicacion,
        dt.kva || dt.capacidadKva || dt.potenciaKva,
        dt.marca,
        dt.tipoTransformador || dt.tipo,
        dt.conexion || dt.grupoConexion,
        dt.voltajePrimario || dt.tensionPrimaria,
        dt.voltajeSecundario || dt.tensionSecundaria,
        dt.impedanciaZ || dt.temperatura || dt.aceite,
        elemento.foto || elemento.fotoBlob || dt.fotografia
      ];
      break;
    }

    case 'PUNTO_MEDICION':
    case 'PUNTO_SUMINISTRO':
    case 'SUMINISTRO': {
      const tieneMetrologia = elemento.mediciones || dt.metrologia || dt.parametrosElectricos || (dt.corrienteL1 && dt.voltajeL1);
      camposRelevantes = [
        elemento.nombre,
        elemento.nombreUsuario || dt.nombreUsuario || dt.titular,
        elemento.numeroContrato || dt.numeroContrato || dt.nic,
        elemento.empresaDistribuidora || dt.empresaDistribuidora || dt.empresaServicio,
        elemento.nivelTensionContrato || dt.nivelTension || dt.nivelTensionContrato,
        elemento.tensionNominal || dt.tensionNominal || dt.tension,
        elemento.tipoMedicion || dt.tipoMedicion,
        elemento.potenciaContratada || dt.cargaContratadaKva || dt.capacidadContratadaKva,
        tieneMetrologia ? 'SI' : '',
        elemento.foto || elemento.fotoBlob || dt.fotografia
      ];
      break;
    }

    case 'CCM':
    case 'CENTRO_CONTROL_MOTORES': {
      const tieneGavetas = (Array.isArray(elemento.gavetasBucketLog) && elemento.gavetasBucketLog.length > 0) ||
                           (Array.isArray(dt.gavetasBucketLog) && dt.gavetasBucketLog.length > 0);
      camposRelevantes = [
        elemento.nombre,
        elemento.plantaInstalacion || elemento.ubicacion,
        elemento.areaProceso || dt.areaProceso,
        dt.capacidadBarraAmperios || dt.capacidadBarra,
        dt.tensionOperacion || dt.tensionOperativa,
        dt.breakerPrincipal || dt.interruptorPrincipal,
        dt.numeroGavetas || (tieneGavetas ? 'SI' : ''),
        tieneGavetas ? 'SI' : '',
        elemento.foto || elemento.fotoBlob || dt.fotografia
      ];
      break;
    }

    case 'BANCO_CONDENSADOR': {
      camposRelevantes = [
        elemento.nombre,
        elemento.ubicacion,
        dt.potenciaReactivaTotal || dt.kvarTotal,
        dt.numPasos || dt.pasosCondensador,
        dt.tipoBanco || dt.tipo,
        dt.tensionNominal || dt.tensionBanco || dt.tension,
        dt.reguladorAutomatico || dt.tipoControl,
        dt.proteccionPrincipal || dt.breakerAmperios,
        elemento.foto || elemento.fotoBlob || dt.fotografia
      ];
      break;
    }

    case 'PUESTA_TIERRA':
    case 'SISTEMA_ATERRAMIENTO': {
      camposRelevantes = [
        elemento.nombre,
        elemento.ubicacion,
        dt.resistenciaOhmios || elemento.resistenciaOhmios || elemento.resistencia,
        dt.corrienteFugaAmperios || elemento.corrienteFuga,
        dt.tipoMalla || elemento.tipoMalla,
        dt.cableAcometida || elemento.cableAcometida,
        dt.metodoMedicion || elemento.metodoMedicion,
        dt.fechaMedicion || elemento.fechaMedicion,
        elemento.foto || elemento.fotoBlob || dt.fotografia
      ];
      break;
    }

    case 'TANQUE_COMBUSTIBLE': {
      camposRelevantes = [
        elemento.nombre,
        elemento.ubicacion,
        elemento.tipoCombustible || dt.tipoCombustible,
        elemento.capacidadLitros || dt.capacidadLitros,
        elemento.nivelPorcentaje || dt.nivelPorcentaje,
        elemento.consumoLh || dt.consumoLh,
        elemento.diqueContencion || dt.diqueContencion,
        elemento.foto || elemento.fotoBlob || dt.fotografia
      ];
      break;
    }

    case 'TERMOGRAFICA': {
      const tienePuntos = (Array.isArray(elemento.puntosCalientes) && elemento.puntosCalientes.length > 0) ||
                          (Array.isArray(dt.puntosCalientes) && dt.puntosCalientes.length > 0);
      camposRelevantes = [
        elemento.nombre,
        elemento.ubicacion,
        elemento.temperaturaAmbiente || dt.temperaturaAmbiente,
        elemento.camaraTermografica || dt.camaraTermografica,
        tienePuntos ? 'SI' : '',
        elemento.foto || elemento.fotoBlob || dt.fotografia
      ];
      break;
    }

    default:
      camposRelevantes = [
        elemento.nombre,
        elemento.ubicacion,
        elemento.alimentadoPor,
        elemento.observacionesGenerales || dt.observaciones,
        elemento.foto || elemento.fotoBlob || dt.fotografia
      ];
      break;
  }

  const totalCampos = camposRelevantes.length;
  if (totalCampos === 0) {
    return {
      porcentaje: 0,
      llenos: 0,
      totalCampos: 0,
      colorClass: 'bg-rose-500',
      textClass: 'text-rose-400',
      badgeClass: 'bg-rose-950/60 text-rose-400 border-rose-800/40',
      statusText: 'Pendiente ⚠️',
      label: '0% completado'
    };
  }

  const llenos = camposRelevantes.filter((val) => {
    if (val === null || val === undefined) return false;
    if (typeof val === 'string' && val.trim() === '') return false;
    if (typeof val === 'number' && isNaN(val)) return false;
    return true;
  }).length;

  const porcentaje = Math.min(100, Math.round((llenos / totalCampos) * 100));

  let colorClass = 'bg-rose-500 shadow-rose-500/20';
  let textClass = 'text-rose-400';
  let badgeClass = 'bg-rose-950/60 text-rose-400 border-rose-800/40';
  let statusText = 'Pendiente ⚠️';

  if (porcentaje === 100) {
    colorClass = 'bg-emerald-400 shadow-emerald-400/40';
    textClass = 'text-emerald-300';
    badgeClass = 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40';
    statusText = '¡Completo! 🏆';
  } else if (porcentaje >= 80) {
    colorClass = 'bg-emerald-500 shadow-emerald-500/30';
    textClass = 'text-emerald-400';
    badgeClass = 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40';
    statusText = 'Casi Listo ⚡';
  } else if (porcentaje >= 50) {
    colorClass = 'bg-amber-500 shadow-amber-500/30';
    textClass = 'text-amber-400';
    badgeClass = 'bg-amber-950/60 text-amber-400 border-amber-800/40';
    statusText = 'En Proceso 🛠️';
  } else if (porcentaje >= 25) {
    colorClass = 'bg-orange-500 shadow-orange-500/30';
    textClass = 'text-orange-400';
    badgeClass = 'bg-orange-950/60 text-orange-400 border-orange-800/40';
    statusText = 'Iniciado 📋';
  }

  return {
    porcentaje,
    llenos,
    totalCampos,
    colorClass,
    textClass,
    badgeClass,
    statusText,
    label: `${porcentaje}% (${llenos}/${totalCampos} campos)`
  };
};

export default calcularPorcentajeAvance;
