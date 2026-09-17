import prisma from '../db.js';

/**
 * POST /api/inspecciones/termograficas
 * Registra una inspección termográfica en la base de datos.
 */
export const createInspeccionTermografica = async (req, res, next) => {
  try {
    const {
      id,
      nombre,
      ubicacion,
      fecha,
      hora,
      inspector,
      supervisor,
      tempAmbiente,
      tempPuntoCaliente,
      tempReferencia,
      cameraModel,
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

    const nueva = await prisma.inspeccionTermografica.create({
      data: {
        id: id || undefined,
        nombre,
        ubicacion: ubicacion || null,
        fecha: fecha || null,
        hora: hora || null,
        inspector: inspector || null,
        supervisor: supervisor || null,
        tempAmbiente: tempAmbiente != null && tempAmbiente !== '' ? parseFloat(tempAmbiente) : null,
        tempPuntoCaliente: tempPuntoCaliente != null && tempPuntoCaliente !== '' ? parseFloat(tempPuntoCaliente) : null,
        tempReferencia: tempReferencia != null && tempReferencia !== '' ? parseFloat(tempReferencia) : null,
        cameraModel: cameraModel || null,
        proyectoId,
        empresaId: targetEmpresaId || null
      }
    });

    return res.status(201).json({ ok: true, data: nueva });
  } catch (error) {
    console.error('Error en createInspeccionTermografica:', error);
    next(error);
  }
};

/**
 * GET /api/inspecciones/termograficas/proyecto/:proyectoId
 * Obtiene todas las inspecciones termográficas asociadas a un proyecto.
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

    const inspecciones = await prisma.inspeccionTermografica.findMany({
      where: {
        proyectoId,
        deletedAt: null
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({ ok: true, data: inspecciones });
  } catch (error) {
    console.error('Error en getInspeccionesPorProyecto (Termográfica):', error);
    next(error);
  }
};

/**
 * PUT /api/inspecciones/termograficas/:id
 * Actualiza los datos de una inspección termográfica.
 */
export const updateInspeccionTermografica = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      ubicacion,
      fecha,
      hora,
      inspector,
      supervisor,
      tempAmbiente,
      tempPuntoCaliente,
      tempReferencia,
      cameraModel
    } = req.body;

    const existente = await prisma.inspeccionTermografica.findUnique({
      where: { id },
      include: { proyecto: true }
    });

    if (!existente || existente.deletedAt) {
      return res.status(404).json({ ok: false, error: 'Inspección termográfica no encontrada.' });
    }

    if (req.user && req.user.role === 'CLIENT') {
      const empresaId = existente.empresaId || (existente.proyecto && existente.proyecto.empresaId);
      if (empresaId && req.user.companyId !== empresaId) {
        return res.status(403).json({ ok: false, error: 'Acceso denegado.' });
      }
    }

    const actualizada = await prisma.inspeccionTermografica.update({
      where: { id },
      data: {
        nombre: nombre || undefined,
        ubicacion: ubicacion !== undefined ? ubicacion : undefined,
        fecha: fecha !== undefined ? fecha : undefined,
        hora: hora !== undefined ? hora : undefined,
        inspector: inspector !== undefined ? inspector : undefined,
        supervisor: supervisor !== undefined ? supervisor : undefined,
        tempAmbiente: tempAmbiente !== undefined ? (tempAmbiente != null && tempAmbiente !== '' ? parseFloat(tempAmbiente) : null) : undefined,
        tempPuntoCaliente: tempPuntoCaliente !== undefined ? (tempPuntoCaliente != null && tempPuntoCaliente !== '' ? parseFloat(tempPuntoCaliente) : null) : undefined,
        tempReferencia: tempReferencia !== undefined ? (tempReferencia != null && tempReferencia !== '' ? parseFloat(tempReferencia) : null) : undefined,
        cameraModel: cameraModel !== undefined ? cameraModel : undefined,
        version: { increment: 1 }
      }
    });

    return res.status(200).json({ ok: true, data: actualizada });
  } catch (error) {
    console.error('Error en updateInspeccionTermografica:', error);
    next(error);
  }
};

/**
 * DELETE /api/inspecciones/termograficas/:id
 * Elimina (soft delete) una inspección termográfica.
 */
export const deleteInspeccionTermografica = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existente = await prisma.inspeccionTermografica.findUnique({
      where: { id },
      include: { proyecto: true }
    });

    if (!existente || existente.deletedAt) {
      return res.status(404).json({ ok: false, error: 'Inspección termográfica no encontrada.' });
    }

    if (req.user && req.user.role === 'CLIENT') {
      const empresaId = existente.empresaId || (existente.proyecto && existente.proyecto.empresaId);
      if (empresaId && req.user.companyId !== empresaId) {
        return res.status(403).json({ ok: false, error: 'Acceso denegado.' });
      }
    }

    await prisma.inspeccionTermografica.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    return res.status(200).json({ ok: true, message: 'Inspección termográfica eliminada con éxito.' });
  } catch (error) {
    console.error('Error en deleteInspeccionTermografica:', error);
    next(error);
  }
};
