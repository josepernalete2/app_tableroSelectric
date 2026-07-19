import prisma from '../db.js';

/**
 * GET /api/empresas/:empresaId/proyectos
 * Lista todos los proyectos que pertenecen a una empresa específica.
 */
export const obtenerProyectosPorEmpresa = async (req, res, next) => {
  try {
    const { empresaId } = req.params;

    // Verificar si la empresa existe
    const empresaExiste = await prisma.empresa.findUnique({
      where: { id: empresaId }
    });

    if (!empresaExiste) {
      return res.status(404).json({
        ok: false,
        error: 'La empresa especificada no existe.'
      });
    }

    const proyectos = await prisma.proyecto.findMany({
      where: {
        empresaId
      },
      orderBy: {
        fechaCreacion: 'desc'
      }
    });

    return res.status(200).json({
      ok: true,
      data: proyectos
    });
  } catch (error) {
    console.error('Error en obtenerProyectosPorEmpresa:', error);
    next(error);
  }
};

/**
 * POST /api/proyectos
 * Crea o actualiza (upsert) un proyecto en PostgreSQL usando connectOrCreate para la empresa.
 */
export const crearProyecto = async (req, res, next) => {
  try {
    const { id, nombre, descripcion, empresaId } = req.body;

    // Validación de campos requeridos
    if (!id || !nombre || !empresaId) {
      return res.status(400).json({
        ok: false,
        error: 'Los campos id, nombre y empresaId son obligatorios.'
      });
    }

    // Inserción / Upsert del proyecto en PostgreSQL con autocreado de empresa si no existe
    const nuevoProyecto = await prisma.proyecto.upsert({
      where: { id },
      update: {
        nombre,
        descripcion: descripcion || null
      },
      create: {
        id,
        nombre,
        descripcion: descripcion || null,
        empresa: {
          connectOrCreate: {
            where: { id: empresaId },
            create: {
              id: empresaId,
              nombre: 'Empresa ' + empresaId,
              direccion: 'Registrada por Sincronización'
            }
          }
        }
      }
    });

    return res.status(201).json({
      ok: true,
      message: 'Proyecto registrado con éxito en el servidor.',
      data: nuevoProyecto
    });
  } catch (error) {
    console.error('Error en crearProyecto:', error);
    next(error);
  }
};

/**
 * GET /api/proyectos/:proyectoId
 * Obtiene los detalles de un proyecto específico.
 */
export const obtenerProyectoCompleto = async (req, res, next) => {
  try {
    const { proyectoId } = req.params;

    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      include: {
        elementosUnifilares: true,
        inspeccionesSubestacion: true
      }
    });

    if (!proyecto) {
      return res.status(404).json({
        ok: false,
        error: 'El proyecto especificado no existe.'
      });
    }

    return res.status(200).json({
      ok: true,
      data: proyecto
    });
  } catch (error) {
    console.error('Error en obtenerProyectoCompleto:', error);
    next(error);
  }
};
