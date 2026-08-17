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
