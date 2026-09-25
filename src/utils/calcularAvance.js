/**
 * Utilidad para el cálculo de porcentaje de avance y completitud técnica
 * de activos y planillas de inspección eléctrica en app_tableroSelectric.
 * 
 * Normativa y Criterios:
 * - < 50%: Crítico / Incompleto (Rojo / Rose)
 * - 50% - 84%: En Proceso (Ámbar / Amarillo)
 * - >= 85%: Conforme / Levantamiento Completo (Verde Esmeralda)
 */

export const calcularPorcentajeAvance = (elemento, tipoElemento) => {
  if (!elemento) return { porcentaje: 0, colorClass: 'bg-rose-500', textClass: 'text-rose-400', label: '0% completado' };

  const tipo = (tipoElemento || elemento.tipoElemento || elemento.tipo || 'TABLERO').toUpperCase();
  const dt = elemento.datosTecnicos || elemento.parametrosTecnicos || elemento.ficha || {};

  let camposRelevantes = [];

  switch (tipo) {
    case 'TABLERO':
      camposRelevantes = [
        elemento.nombre,
        elemento.ubicacion,
        elemento.alimentadoPor,
        elemento.tension || dt.voltajeAcometida || dt.tension,
        (elemento.circuits?.length > 0 || dt.circuits?.length > 0) ? 'SI' : '',
        dt.maxPoles || elemento.maxPoles,
        elemento.breakerPrincipal?.amp || dt.breakerPrincipal?.amp,
        elemento.barrasPrincipales?.ia || dt.barrasPrincipales?.ia,
        elemento.neutroLlegada?.calibre || dt.neutroLlegada?.calibre,
        elemento.puestaTierra?.calibre || dt.puestaTierra?.calibre,
        elemento.foto || elemento.fotoBlob || dt.fotografia
      ];
      break;

    case 'SUBESTACION':
      camposRelevantes = [
        elemento.nombre,
        elemento.ubicacion,
        elemento.nivelTension || dt.nivelTension,
        elemento.inspector,
        elemento.fecha,
        elemento.capacidadKva || dt.capacidadKva,
        dt.tensionPrimaria,
        dt.tensionSecundaria,
        dt.resistenciaPuestaTierra || dt.resistenciaMalla,
        (elemento.seccionesEvaluadas || dt.evaluacionSecciones) ? 'SI' : '',
        elemento.foto || elemento.fotoBlob
      ];
      break;

    case 'GENERADOR':
    case 'GEN':
    case 'PLANTA':
      camposRelevantes = [
        elemento.nombre,
        elemento.ubicacion,
        dt.kva || dt.capacidadKva,
        dt.potenciaKw,
        dt.combustible,
        dt.voltajeGeneracion || dt.voltaje,
        dt.amperaje || dt.corrienteNominal,
        dt.capacidadTanqueLitros || dt.volumenTanque,
        dt.resistenciaOhmios || dt.puestaTierraOhms,
        elemento.foto || elemento.fotoBlob || dt.fotografia
      ];
      break;

    case 'TRANSFER':
    case 'ATS':
    case 'MTS':
      camposRelevantes = [
        elemento.nombre,
        elemento.ubicacion,
        dt.capacidadAmperios || dt.amperaje,
        dt.tipoTransferencia || dt.tipo,
        dt.tensionOperativa || dt.tension,
        dt.polos,
        dt.frecuencia,
        dt.fuente1 || dt.fuenteNormal,
        dt.fuente2 || dt.fuenteEmergencia,
        dt.estadoServicio || elemento.estado,
        elemento.foto || elemento.fotoBlob || dt.fotografia
      ];
      break;

    case 'TRANSFORMADOR':
    case 'TRAFO':
      camposRelevantes = [
        elemento.nombre,
        elemento.ubicacion,
        dt.kva || dt.capacidadKva,
        dt.marca,
        dt.tipoTransformador || dt.tipo,
        dt.conexion,
        dt.voltajePrimario,
        dt.voltajeSecundario,
        dt.impedanciaZ || dt.temperatura,
        elemento.foto || elemento.fotoBlob || dt.fotografia
      ];
      break;

    case 'PUNTO_MEDICION':
    case 'PUNTO_SUMINISTRO':
    case 'SUMINISTRO':
      camposRelevantes = [
        elemento.nombre,
        elemento.nombreUsuario || dt.nombreUsuario,
        elemento.numeroContrato || dt.numeroContrato || dt.nic,
        elemento.empresaDistribuidora || dt.empresaDistribuidora,
        elemento.nivelTensionContrato || dt.nivelTension || dt.nivelTensionContrato,
        elemento.tensionNominal || dt.tensionNominal,
        elemento.tipoMedicion || dt.tipoMedicion,
        elemento.potenciaContratada || dt.cargaContratadaKva || dt.capacidadContratadaKva,
        elemento.tipoAcometida || dt.tipoAcometida,
        elemento.puntoConexionPCC || dt.puntoConexionPCC || dt.posteTransformador,
        elemento.foto || elemento.fotoBlob || dt.fotografia
      ];
      break;

    case 'PUESTA_TIERRA':
    case 'SISTEMA_ATERRAMIENTO':
      camposRelevantes = [
        elemento.nombre,
        elemento.ubicacion,
        dt.resistenciaOhmios || elemento.resistenciaOhmios || elemento.resistencia,
        dt.corrienteFugaAmperios || elemento.corrienteFuga,
        dt.tipoMalla || elemento.tipoMalla,
        dt.cableAcometida || elemento.cableAcometida,
        dt.metodoMedicion || elemento.metodoMedicion,
        elemento.foto || elemento.fotoBlob || dt.fotografia
      ];
      break;

    case 'CCM':
      camposRelevantes = [
        elemento.nombre,
        elemento.plantaInstalacion || elemento.ubicacion,
        elemento.areaProceso,
        dt.capacidadBarraAmperios || dt.capacidadBarra,
        dt.tensionOperacion || dt.tensionOperativa,
        dt.breakerPrincipal,
        (elemento.gavetasBucketLog?.length > 0 || dt.gavetasBucketLog?.length > 0) ? 'SI' : '',
        elemento.foto || elemento.fotoBlob
      ];
      break;

    case 'BANCO_CONDENSADOR':
      camposRelevantes = [
        elemento.nombre,
        elemento.ubicacion,
        dt.kvarTotal,
        dt.pasosCondensador,
        dt.tipoBanco,
        dt.tensionBanco,
        dt.reguladorAutomatico,
        elemento.foto || elemento.fotoBlob
      ];
      break;

    case 'TANQUE_COMBUSTIBLE':
      camposRelevantes = [
        elemento.nombre,
        elemento.ubicacion,
        elemento.tipoCombustible || dt.tipoCombustible,
        elemento.capacidadLitros || dt.capacidadLitros,
        elemento.nivelPorcentaje || dt.nivelPorcentaje,
        elemento.consumoLh || dt.consumoLh,
        elemento.diqueContencion || dt.diqueContencion,
        elemento.foto || elemento.fotoBlob
      ];
      break;

    case 'TERMOGRAFICA':
      camposRelevantes = [
        elemento.nombre,
        elemento.ubicacion,
        elemento.temperaturaAmbiente || dt.temperaturaAmbiente,
        elemento.camaraTermografica || dt.camaraTermografica,
        (elemento.puntosCalientes?.length > 0 || dt.puntosCalientes?.length > 0) ? 'SI' : '',
        elemento.foto || elemento.fotoBlob
      ];
      break;

    default:
      camposRelevantes = [
        elemento.nombre,
        elemento.ubicacion,
        elemento.alimentadoPor,
        elemento.observacionesGenerales,
        elemento.foto || elemento.fotoBlob
      ];
      break;
  }

  const totalCampos = camposRelevantes.length;
  if (totalCampos === 0) return { porcentaje: 0, colorClass: 'bg-rose-500', textClass: 'text-rose-400', label: '0% completado' };

  const llenos = camposRelevantes.filter(val => val !== null && val !== undefined && String(val).trim() !== '').length;
  const porcentaje = Math.round((llenos / totalCampos) * 100);

  let colorClass = 'bg-rose-500';
  let textClass = 'text-rose-400';

  if (porcentaje >= 85) {
    colorClass = 'bg-emerald-500';
    textClass = 'text-emerald-400';
  } else if (porcentaje >= 50) {
    colorClass = 'bg-amber-500';
    textClass = 'text-amber-400';
  }

  return {
    porcentaje,
    colorClass,
    textClass,
    label: `${porcentaje}% completado`
  };
};

export default calcularPorcentajeAvance;
