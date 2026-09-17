import prisma from '../db.js';

/**
 * POST /api/inspecciones/aterramiento
 * Registra una inspección de sistema de puesta a tierra / aterramiento.
 */
export const createInspeccionAterramiento = async (req, res, next) => {
  try {
    const {
      id,
      nombre,
      ubicacion,
      fecha,
      hora,
      inspector,
      supervisor,
      resistenciaOhmios,
      metodoMedicion,
      tipoSistemaPat,
      tipoUnion,
      proyectoId,
      empresaId
    } = req.body;

    if (!nombre || !proyectoId) {
      return res.status(400).json({
        ok: false,
        error: 'Los campos nombre y proyectoId son requeridos.'
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

    const nueva = await prisma.inspeccionAterramiento.create({
      data: {
        id: id || undefined,
        nombre,
        ubicacion: ubicacion || null,
        fecha: fecha || null,
        hora: hora || null,
        inspector: inspector || null,
        supervisor: supervisor || null,
        resistenciaOhmios: resistenciaOhmios != null && resistenciaOhmios !== '' ? parseFloat(resistenciaOhmios) : null,
        metodoMedicion: metodoMedicion || null,
        tipoSistemaPat: tipoSistemaPat || null,
        tipoUnion: tipoUnion || null,
        proyectoId,
        empresaId: targetEmpresaId || null
      }
    });

    return res.status(201).json({ ok: true, data: nueva });
  } catch (error) {
    console.error('Error en createInspeccionAterramiento:', error);
    next(error);
  }
};

/**
 * GET /api/inspecciones/aterramiento/proyecto/:proyectoId
 * Obtiene todas las inspecciones de aterramiento asociadas a un proyecto.
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

    const inspecciones = await prisma.inspeccionAterramiento.findMany({
      where: {
        proyectoId,
        deletedAt: null
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({ ok: true, data: inspecciones });
  } catch (error) {
    console.error('Error en getInspeccionesPorProyecto (Aterramiento):', error);
    next(error);
  }
};

/**
 * PUT /api/inspecciones/aterramiento/:id
 * Actualiza los datos de una inspección de aterramiento.
 */
export const updateInspeccionAterramiento = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      ubicacion,
      fecha,
      hora,
      inspector,
      supervisor,
      resistenciaOhmios,
      metodoMedicion,
      tipoSistemaPat,
      tipoUnion
    } = req.body;

    const existente = await prisma.inspeccionAterramiento.findUnique({
      where: { id },
      include: { proyecto: true }
    });

    if (!existente || existente.deletedAt) {
      return res.status(404).json({ ok: false, error: 'Inspección de aterramiento no encontrada.' });
    }

    if (req.user && req.user.role === 'CLIENT') {
      const empresaId = existente.empresaId || (existente.proyecto && existente.proyecto.empresaId);
      if (empresaId && req.user.companyId !== empresaId) {
        return res.status(403).json({ ok: false, error: 'Acceso denegado.' });
      }
    }

    const actualizada = await prisma.inspeccionAterramiento.update({
      where: { id },
      data: {
        nombre: nombre || undefined,
        ubicacion: ubicacion !== undefined ? ubicacion : undefined,
        fecha: fecha !== undefined ? fecha : undefined,
        hora: hora !== undefined ? hora : undefined,
        inspector: inspector !== undefined ? inspector : undefined,
        supervisor: supervisor !== undefined ? supervisor : undefined,
        resistenciaOhmios: resistenciaOhmios !== undefined ? (resistenciaOhmios != null && resistenciaOhmios !== '' ? parseFloat(resistenciaOhmios) : null) : undefined,
        metodoMedicion: metodoMedicion !== undefined ? metodoMedicion : undefined,
        tipoSistemaPat: tipoSistemaPat !== undefined ? tipoSistemaPat : undefined,
        tipoUnion: tipoUnion !== undefined ? tipoUnion : undefined,
        version: { increment: 1 }
      }
    });

    return res.status(200).json({ ok: true, data: actualizada });
  } catch (error) {
    console.error('Error en updateInspeccionAterramiento:', error);
    next(error);
  }
};

/**
 * DELETE /api/inspecciones/aterramiento/:id
 * Elimina (soft delete) una inspección de aterramiento.
 */
export const deleteInspeccionAterramiento = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existente = await prisma.inspeccionAterramiento.findUnique({
      where: { id },
      include: { proyecto: true }
    });

    if (!existente || existente.deletedAt) {
      return res.status(404).json({ ok: false, error: 'Inspección de aterramiento no encontrada.' });
    }

    if (req.user && req.user.role === 'CLIENT') {
      const empresaId = existente.empresaId || (existente.proyecto && existente.proyecto.empresaId);
      if (empresaId && req.user.companyId !== empresaId) {
        return res.status(403).json({ ok: false, error: 'Acceso denegado.' });
      }
    }

    await prisma.inspeccionAterramiento.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    return res.status(200).json({ ok: true, message: 'Inspección de aterramiento eliminada con éxito.' });
  } catch (error) {
    console.error('Error en deleteInspeccionAterramiento:', error);
    next(error);
  }
};
