import prisma from '../db.js';

/**
 * POST /api/subestaciones
 * Guarda de forma nativa un registro de inspección de subestación en PostgreSQL.
 */
export const crearInspeccionSubestacion = async (req, res, next) => {
  try {
    const {
      id,
      nombre,
      ubicacion,
      fecha,
      hora,
      inspector,
      nivelTension,
      estadoEntorno,
      obrasCiviles,
      equiposPrincipales,
      puestaTierra,
      edificioControl,
      firmaInspector,
      firmaSupervisor,
      empresaId,
      proyectoId
    } = req.body;

    // Validar campos obligatorios
    if (!id || !nombre || !proyectoId) {
      return res.status(400).json({
        ok: false,
        error: 'Los campos id, nombre y proyectoId son requeridos.'
      });
    }

    // Inserción de inspección visual de subestación en base de datos PostgreSQL
    const nuevaInspeccion = await prisma.inspeccionSubestacion.create({
      data: {
        id,
        nombre,
        ubicacion: ubicacion || '',
        fecha: fecha || '',
        hora: hora || '',
        inspector: inspector || '',
        nivelTension: nivelTension || '',
        estadoEntorno: estadoEntorno || {},
        obrasCiviles: obrasCiviles || {},
        equiposPrincipales: equiposPrincipales || {},
        puestaTierra: puestaTierra || {},
        edificioControl: edificioControl || {},
        firmaInspector: firmaInspector || null,
        firmaSupervisor: firmaSupervisor || null,
        proyecto: {
          connect: { id: proyectoId }
        },
        ...(empresaId ? { empresa: { connect: { id: empresaId } } } : {})
      }
    });

    return res.status(201).json({
      ok: true,
      message: 'Inspección de subestación registrada con éxito en el servidor.',
      data: nuevaInspeccion
    });

  } catch (error) {
    console.error('Error en crearInspeccionSubestacion:', error);
    next(error);
  }
};
