import prisma from '../db.js';

/**
 * POST /api/subestaciones
 * Guarda de forma nativa un registro de inspección de subestación en PostgreSQL.
 */
export const crearInspeccionSubestacion = async (req, res) => {
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
      empresaId
    } = req.body;

    // Validar campos obligatorios
    if (!id || !nombre || !empresaId) {
      return res.status(400).json({
        ok: false,
        error: 'Los campos id, nombre y empresaId son requeridos.'
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
        empresa: {
          connect: { id: empresaId }
        }
      }
    });

    return res.status(201).json({
      ok: true,
      message: 'Inspección de subestación registrada con éxito en el servidor.',
      data: nuevaInspeccion
    });

  } catch (error) {
    console.error('Error en crearInspeccionSubestacion:', error);

    return res.status(500).json({
      ok: false,
      error: 'Error interno del servidor al registrar la inspección de subestación.',
      details: error.message
    });
  }
};
