import prisma from '../db.js';

/**
 * POST /api/subestaciones
 * Guarda de forma nativa un registro de inspección de subestación en PostgreSQL.
 * Incluye comprobación previa de existencia de Proyecto y Empresa para evitar P2025.
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

    // Comprobación previa de la existencia del Proyecto en PostgreSQL
    const proyectoExiste = await prisma.proyecto.findUnique({
      where: { id: proyectoId }
    });

    if (!proyectoExiste) {
      console.warn(`[AF WARNING] La subestación depende del proyecto '${proyectoId}' que no existe aún en el servidor.`);
      return res.status(422).json({
        error: 'Falta dependencia',
        detalle: 'El proyecto asociado no existe en el servidor todavía'
      });
    }

    // Comprobación previa de la existencia de Empresa
    let empresaExiste = null;
    if (empresaId) {
      empresaExiste = await prisma.empresa.findUnique({
        where: { id: empresaId }
      });
    }

    // Inserción de inspección visual de subestación en PostgreSQL
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
        ...(empresaExiste ? { empresa: { connect: { id: empresaId } } } : {})
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
