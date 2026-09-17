import prisma from '../db.js';

/**
 * POST /api/inspecciones/tanque-combustible
 * Registra una inspección de tanque de combustible.
 */
export const createInspeccionTanqueCombustible = async (req, res, next) => {
  try {
    const {
      id,
      nombre,
      ubicacion,
      fecha,
      hora,
      inspector,
      supervisor,
      tipoCombustible,
      capacidadTotalLitros,
      nivelActualPorcentaje,
      consumoGeneradorLh,
      diqueContencion110,
      proyectoId,
      empresaId
    } = req.body;

    if (!nombre || !proyectoId) {
      return res.status(400).json({
        ok: false,
        error: 'Los campos nombre y proyectoId son obligatorios.'
      });
    }

    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId }
    });

    if (!proyecto) {
      return res.status(422).json({
        ok: false,
        error: 'Dependencia inexistente: el proyecto especificado no existe.'
      });
    }

    if (req.user && req.user.role === 'CLIENT' && req.user.companyId !== proyecto.empresaId) {
      return res.status(403).json({
        ok: false,
        error: 'Acceso denegado: no tiene permisos para registrar inspecciones en este proyecto.'
      });
    }

    const targetEmpresaId = empresaId || proyecto.empresaId;

    const nueva = await prisma.inspeccionTanqueCombustible.create({
      data: {
        id: id || undefined,
        nombre,
        ubicacion: ubicacion || null,
        fecha: fecha || null,
        hora: hora || null,
        inspector: inspector || null,
        supervisor: supervisor || null,
        tipoCombustible: tipoCombustible || null,
        capacidadTotalLitros: capacidadTotalLitros != null && capacidadTotalLitros !== '' ? parseFloat(capacidadTotalLitros) : null,
        nivelActualPorcentaje: nivelActualPorcentaje != null && nivelActualPorcentaje !== '' ? parseFloat(nivelActualPorcentaje) : null,
        consumoGeneradorLh: consumoGeneradorLh != null && consumoGeneradorLh !== '' ? parseFloat(consumoGeneradorLh) : null,
        diqueContencion110: diqueContencion110 || null,
        proyectoId,
        empresaId: targetEmpresaId || null
      }
    });

    return res.status(201).json({ ok: true, data: nueva });
  } catch (error) {
    console.error('Error en createInspeccionTanqueCombustible:', error);
    next(error);
  }
};

/**
 * GET /api/inspecciones/tanque-combustible/proyecto/:proyectoId
 * Obtiene todas las inspecciones de tanque de combustible de un proyecto.
 */
export const getInspeccionesPorProyecto = async (req, res, next) => {
  try {
    const { proyectoId } = req.params;

    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId }
    });

    if (!proyecto) {
      return res.status(404).json({ ok: false, error: 'Proyecto no encontrado.' });
    }

    if (req.user && req.user.role === 'CLIENT' && req.user.companyId !== proyecto.empresaId) {
      return res.status(403).json({ ok: false, error: 'Acceso denegado.' });
    }

    const inspecciones = await prisma.inspeccionTanqueCombustible.findMany({
      where: {
        proyectoId,
        deletedAt: null
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({ ok: true, data: inspecciones });
  } catch (error) {
    console.error('Error en getInspeccionesPorProyecto (Tanque Combustible):', error);
    next(error);
  }
};

/**
 * PUT /api/inspecciones/tanque-combustible/:id
 * Actualiza los datos de una inspección de tanque de combustible.
 */
export const updateInspeccionTanqueCombustible = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      ubicacion,
      fecha,
      hora,
      inspector,
      supervisor,
      tipoCombustible,
      capacidadTotalLitros,
      nivelActualPorcentaje,
      consumoGeneradorLh,
      diqueContencion110
    } = req.body;

    const existente = await prisma.inspeccionTanqueCombustible.findUnique({
      where: { id },
      include: { proyecto: true }
    });

    if (!existente || existente.deletedAt) {
      return res.status(404).json({ ok: false, error: 'Inspección de tanque de combustible no encontrada.' });
    }

    if (req.user && req.user.role === 'CLIENT') {
      const empresaId = existente.empresaId || (existente.proyecto && existente.proyecto.empresaId);
      if (empresaId && req.user.companyId !== empresaId) {
        return res.status(403).json({ ok: false, error: 'Acceso denegado.' });
      }
    }

    const actualizada = await prisma.inspeccionTanqueCombustible.update({
      where: { id },
      data: {
        nombre: nombre || undefined,
        ubicacion: ubicacion !== undefined ? ubicacion : undefined,
        fecha: fecha !== undefined ? fecha : undefined,
        hora: hora !== undefined ? hora : undefined,
        inspector: inspector !== undefined ? inspector : undefined,
        supervisor: supervisor !== undefined ? supervisor : undefined,
        tipoCombustible: tipoCombustible !== undefined ? tipoCombustible : undefined,
        capacidadTotalLitros: capacidadTotalLitros !== undefined ? (capacidadTotalLitros != null && capacidadTotalLitros !== '' ? parseFloat(capacidadTotalLitros) : null) : undefined,
        nivelActualPorcentaje: nivelActualPorcentaje !== undefined ? (nivelActualPorcentaje != null && nivelActualPorcentaje !== '' ? parseFloat(nivelActualPorcentaje) : null) : undefined,
        consumoGeneradorLh: consumoGeneradorLh !== undefined ? (consumoGeneradorLh != null && consumoGeneradorLh !== '' ? parseFloat(consumoGeneradorLh) : null) : undefined,
        diqueContencion110: diqueContencion110 !== undefined ? diqueContencion110 : undefined,
        version: { increment: 1 }
      }
    });

    return res.status(200).json({ ok: true, data: actualizada });
  } catch (error) {
    console.error('Error en updateInspeccionTanqueCombustible:', error);
    next(error);
  }
};

/**
 * DELETE /api/inspecciones/tanque-combustible/:id
 * Elimina (soft delete) una inspección de tanque de combustible.
 */
export const deleteInspeccionTanqueCombustible = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existente = await prisma.inspeccionTanqueCombustible.findUnique({
      where: { id },
      include: { proyecto: true }
    });

    if (!existente || existente.deletedAt) {
      return res.status(404).json({ ok: false, error: 'Inspección de tanque de combustible no encontrada.' });
    }

    if (req.user && req.user.role === 'CLIENT') {
      const empresaId = existente.empresaId || (existente.proyecto && existente.proyecto.empresaId);
      if (empresaId && req.user.companyId !== empresaId) {
        return res.status(403).json({ ok: false, error: 'Acceso denegado.' });
      }
    }

    await prisma.inspeccionTanqueCombustible.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    return res.status(200).json({ ok: true, message: 'Inspección de tanque de combustible eliminada con éxito.' });
  } catch (error) {
    console.error('Error en deleteInspeccionTanqueCombustible:', error);
    next(error);
  }
};
