import prisma from '../db.js';

/**
 * POST /api/jerarquia/vincular
 * Establece el enlace Padre -> Hijo con actualización bidireccional.
 */
export const vincularElemento = async (req, res, next) => {
  try {
    const {
      padreId,
      hijoId,
      circuitoOrigen,
      calibreConductor,
      breakerAmperaje,
      breakerMarca,
      breakerTipo,
      potenciaEstimada,
      detallesFormato
    } = req.body;

    if (!hijoId) {
      return res.status(400).json({ ok: false, error: 'El id del elemento hijo es obligatorio.' });
    }

    // 1. Obtener información del padre si existe
    let nombrePadre = null;
    if (padreId) {
      const padre = await prisma.elementoUnifilar.findUnique({ where: { id: padreId } });
      if (padre) {
        nombrePadre = padre.nombre;
      }
    }

    // 2. Actualizar el elemento hijo
    const hijoActualizado = await prisma.elementoUnifilar.update({
      where: { id: hijoId },
      data: {
        alimentadoPorId: padreId || null,
        alimentadoPor: nombrePadre ? `${nombrePadre} (${circuitoOrigen || 'Salida'})` : null,
        circuitoOrigen: circuitoOrigen || null,
        calibreConductor: calibreConductor || null,
        breakerAmperaje: breakerAmperaje ? parseFloat(breakerAmperaje) : null,
        breakerMarca: breakerMarca || null,
        breakerTipo: breakerTipo || null,
        potenciaEstimada: potenciaEstimada || null,
        estadoVinculo: 'ACTIVO',
        detallesFormato: detallesFormato || undefined
      }
    });

    return res.status(200).json({
      ok: true,
      message: 'Enlace jerárquico establecido con éxito.',
      data: hijoActualizado
    });
  } catch (error) {
    console.error('Error en vincularElemento:', error);
    next(error);
  }
};

/**
 * POST /api/jerarquia/desvincular
 * Limpia la procedencia de alimentación del equipo.
 */
export const desvincularElemento = async (req, res, next) => {
  try {
    const { hijoId } = req.body;

    if (!hijoId) {
      return res.status(400).json({ ok: false, error: 'El id del hijo es requerido.' });
    }

    const actualizado = await prisma.elementoUnifilar.update({
      where: { id: hijoId },
      data: {
        alimentadoPorId: null,
        alimentadoPor: null,
        circuitoOrigen: null,
        estadoVinculo: 'ACTIVO'
      }
    });

    return res.status(200).json({
      ok: true,
      message: 'Procedencia desvinculada con éxito.',
      data: actualizado
    });
  } catch (error) {
    console.error('Error en desvincularElemento:', error);
    next(error);
  }
};

/**
 * POST /api/jerarquia/crear-provisional
 * Registra un equipo borrador con estado "PENDIENTE_CREAR".
 */
export const crearProvisional = async (req, res, next) => {
  try {
    const { id, nombre, tipoElemento, proyectoId, empresaId, circuitoOrigen } = req.body;

    if (!id || !nombre || !proyectoId) {
      return res.status(400).json({ ok: false, error: 'Campos requeridos: id, nombre y proyectoId.' });
    }

    const provisional = await prisma.elementoUnifilar.create({
      data: {
        id,
        nombre,
        tipoElemento: tipoElemento || 'TABLERO',
        ubicacion: 'RESERVA (Pendiente por Crear)',
        alimentadoPor: circuitoOrigen ? `Circuito ${circuitoOrigen}` : null,
        circuitoOrigen: circuitoOrigen || null,
        estadoVinculo: 'PENDIENTE_CREAR',
        observacionesGenerales: 'Elemento registrado en estado provisional como Reserva activa.',
        datosTecnicos: {},
        proyectoId,
        empresaId: empresaId || null
      }
    });

    return res.status(201).json({
      ok: true,
      message: 'Nodo provisional registrado con éxito.',
      data: provisional
    });
  } catch (error) {
    console.error('Error en crearProvisional:', error);
    next(error);
  }
};

/**
 * GET /api/jerarquia/arbol/:proyectoId
 * Retorna la jerarquía arbórea completa de un proyecto.
 */
export const obtenerArbolProyecto = async (req, res, next) => {
  try {
    const { proyectoId } = req.params;

    const elementos = await prisma.elementoUnifilar.findMany({
      where: { proyectoId },
      include: {
        cargasAlimentadas: true,
        alimentadoPorElemento: true
      }
    });

    return res.status(200).json({
      ok: true,
      data: elementos
    });
  } catch (error) {
    console.error('Error en obtenerArbolProyecto:', error);
    next(error);
  }
};

/**
 * GET /api/jerarquia/alimentadores/:proyectoId
 * Retorna todos los elementos padres o potenciales alimentadores registrados en el proyecto
 * (Subestaciones, Transformadores, Celdas CCM, Tableros, Generadores, Puntos de Medición, etc.)
 */
export const obtenerPotencialesAlimentadores = async (req, res, next) => {
  try {
    const { proyectoId } = req.params;
    const { excluirId } = req.query;

    if (!proyectoId) {
      return res.status(400).json({ ok: false, error: 'El ID del proyecto es requerido.' });
    }

    // 1. Consultar elementos unifilares del proyecto
    const elementosUnifilares = await prisma.elementoUnifilar.findMany({
      where: {
        proyectoId,
        ...(excluirId ? { id: { not: excluirId } } : {})
      },
      orderBy: { nombre: 'asc' }
    });

    // 2. Consultar entidades específicas para asegurar cobertura completa
    const [subestaciones, ccms, tableros, alimentadores, puntosMedicion] = await Promise.all([
      prisma.subestacion.findMany({ where: { proyectoId } }).catch(() => []),
      prisma.ccm.findMany({ where: { proyectoId } }).catch(() => []),
      prisma.tablero.findMany({
        where: {
          proyectoId,
          ...(excluirId ? { id: { not: excluirId } } : {})
        }
      }).catch(() => []),
      prisma.alimentador.findMany({ where: { proyectoId } }).catch(() => []),
      prisma.puntoMedicion.findMany({ where: { proyectoId } }).catch(() => [])
    ]);

    const mapaAlimentadores = new Map();

    const resolverNivelTension = (tipo, tech = {}) => {
      if (!tech || typeof tech !== 'object') return 'N/D';
      switch (tipo) {
        case 'TRANSFORMADOR':
          return tech.voltajeSecundario || tech.tensionSecundaria || tech.voltajePrimario || (tech.kva ? `${tech.kva} kVA` : 'N/D');
        case 'SUBESTACION':
          return tech.nivelTension ? `${tech.nivelTension} kV` : 'Media / Alta Tensión';
        case 'CCM':
          return tech.tension || tech.voltaje || '480 / 277 V';
        case 'TABLERO':
          return tech.voltajeAcometida || tech.tension || (tech.voltaje?.va ? `${tech.voltaje.va} V` : '208 / 120 V');
        case 'GENERADOR':
          return tech.voltajeGeneracion || tech.tension || (tech.kva ? `${tech.kva} kVA` : 'N/D');
        case 'TRANSFER':
          return tech.tension || (tech.capacidadAmperios ? `${tech.capacidadAmperios} A` : 'N/D');
        case 'PUNTO_MEDICION':
          return tech.nivelTensionContrato || tech.tensionNominal || 'Acometida Red';
        default:
          return tech.tension || tech.voltaje || 'N/D';
      }
    };

    const resolverCategoria = (tipo) => {
      switch (tipo) {
        case 'SUBESTACION':
          return 'Subestaciones';
        case 'TRANSFORMADOR':
          return 'Transformadores';
        case 'CCM':
          return 'Celdas y CCM';
        case 'TABLERO':
          return 'Tableros Aguas Arriba';
        case 'GENERADOR':
        case 'TRANSFER':
          return 'Generación y Transferencias';
        case 'PUNTO_MEDICION':
          return 'Puntos de Medición / Acometidas';
        case 'ALIMENTADOR':
          return 'Alimentadores Dedicados';
        default:
          return 'Otros Equipos';
      }
    };

    // Agregar Elementos Unifilares
    elementosUnifilares.forEach((el) => {
      let tech = {};
      if (typeof el.datosTecnicos === 'string') {
        try {
          tech = JSON.parse(el.datosTecnicos || '{}');
        } catch {
          tech = {};
        }
      } else if (el.datosTecnicos && typeof el.datosTecnicos === 'object') {
        tech = el.datosTecnicos;
      }

      mapaAlimentadores.set(el.id, {
        id: el.id,
        nombre: el.nombre,
        tipoElemento: el.tipoElemento,
        categoria: resolverCategoria(el.tipoElemento),
        nivelTension: resolverNivelTension(el.tipoElemento, tech),
        ubicacion: el.ubicacion || 'Ubicación no especificada',
        detalles: tech.kva ? `${tech.kva} kVA` : (tech.amperaje ? `${tech.amperaje} A` : null),
        circuitoOrigen: el.circuitoOrigen || null
      });
    });

    // Complementar con Subestaciones
    subestaciones.forEach((sub) => {
      if (!mapaAlimentadores.has(sub.id)) {
        mapaAlimentadores.set(sub.id, {
          id: sub.id,
          nombre: sub.nombre,
          tipoElemento: 'SUBESTACION',
          categoria: 'Subestaciones',
          nivelTension: sub.nivelTension ? `${sub.nivelTension} kV` : 'Alta / Media Tensión',
          ubicacion: sub.ubicacion || 'Subestación Patio/Interior',
          detalles: 'Subestación Principal',
          circuitoOrigen: null
        });
      }
    });

    // Complementar con CCMs
    ccms.forEach((c) => {
      if (!mapaAlimentadores.has(c.id)) {
        const params = typeof c.parametrosElectricos === 'object' && c.parametrosElectricos ? c.parametrosElectricos : {};
        mapaAlimentadores.set(c.id, {
          id: c.id,
          nombre: c.nombre,
          tipoElemento: 'CCM',
          categoria: 'Celdas y CCM',
          nivelTension: params?.tension || '480 / 277 V',
          ubicacion: [c.plantaInstalacion, c.areaProceso].filter(Boolean).join(' - ') || 'Sala de Control CCM',
          detalles: c.fabricanteMarca || 'Centro de Control de Motores',
          circuitoOrigen: null
        });
      }
    });

    // Complementar con Tableros
    tableros.forEach((tab) => {
      if (!mapaAlimentadores.has(tab.id)) {
        mapaAlimentadores.set(tab.id, {
          id: tab.id,
          nombre: tab.nombre,
          tipoElemento: 'TABLERO',
          categoria: 'Tableros Aguas Arriba',
          nivelTension: tab.tension || '208 / 120 V',
          ubicacion: tab.ubicacion || 'Ubicación no especificada',
          detalles: `${tab.maxPolos || 42} Polos - ${tab.fases || 3}F`,
          circuitoOrigen: null
        });
      }
    });

    // Complementar con Puntos de Medición
    puntosMedicion.forEach((pm) => {
      if (!mapaAlimentadores.has(pm.id)) {
        mapaAlimentadores.set(pm.id, {
          id: pm.id,
          nombre: pm.nombre,
          tipoElemento: 'PUNTO_MEDICION',
          categoria: 'Puntos de Medición / Acometidas',
          nivelTension: pm.tensionNominal || pm.nivelTensionContrato || 'Baja / Media Tensión',
          ubicacion: pm.puntoConexionPCC || 'Punto de Conexión Suministro',
          detalles: pm.empresaDistribuidora || 'Acometida Comercial',
          circuitoOrigen: null
        });
      }
    });

    // Complementar con Alimentadores Dedicados
    alimentadores.forEach((alim) => {
      if (!mapaAlimentadores.has(alim.id)) {
        mapaAlimentadores.set(alim.id, {
          id: alim.id,
          nombre: alim.nombre,
          tipoElemento: 'ALIMENTADOR',
          categoria: 'Alimentadores Dedicados',
          nivelTension: 'N/D',
          ubicacion: alim.origen || 'Trazado de Alimentador',
          detalles: alim.capacidadAmperios ? `${alim.capacidadAmperios} A` : null,
          circuitoOrigen: null
        });
      }
    });

    return res.status(200).json({
      ok: true,
      data: Array.from(mapaAlimentadores.values())
    });
  } catch (error) {
    console.error('Error en obtenerPotencialesAlimentadores:', error);
    next(error);
  }
};
