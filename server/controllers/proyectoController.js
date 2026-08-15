import prisma from '../db.js';

// Sanitizar un proyecto
const sanitizarProyecto = (proyecto, role) => {
  if (!proyecto) return null;
  if (role !== 'ADMIN') {
    const {
      responsableNombre,
      responsableTelefono,
      responsableEmail,
      ...resto
    } = proyecto;
    return resto;
  }
  return proyecto;
};

/**
 * GET /api/proyectos
 * Lista todos los proyectos.
 */
export const obtenerProyectos = async (req, res, next) => {
  try {
    const proyectos = await prisma.proyecto.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const sanitizados = proyectos.map(p => sanitizarProyecto(p, req.user.role));
    return res.status(200).json({ ok: true, data: sanitizados });
  } catch (error) {
    console.error('Error en obtenerProyectos:', error);
    next(error);
  }
};

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
        createdAt: 'desc'
      }
    });

    const sanitizados = proyectos.map(p => sanitizarProyecto(p, req.user.role));
    return res.status(200).json({
      ok: true,
      data: sanitizados
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
    const { id, nombre, descripcion, direccion, empresaId, responsableNombre, responsableTelefono, responsableEmail } = req.body;

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
        descripcion: descripcion || null,
        direccion: direccion || '',
        responsableNombre: responsableNombre || null,
        responsableTelefono: responsableTelefono || null,
        responsableEmail: responsableEmail || null
      },
      create: {
        id,
        nombre,
        descripcion: descripcion || null,
        direccion: direccion || '',
        responsableNombre: responsableNombre || null,
        responsableTelefono: responsableTelefono || null,
        responsableEmail: responsableEmail || null,
        empresa: {
          connectOrCreate: {
            where: { id: empresaId },
            create: {
              id: empresaId,
              nombre: 'Empresa ' + empresaId,
              direccion: 'Registrada por Sincronización',
              direccionFiscal: 'Registrada por Sincronización',
              rif: 'J-AUTO-' + empresaId.slice(0, 8)
            }
          }
        }
      }
    });

    return res.status(201).json({
      ok: true,
      message: 'Proyecto registrado con éxito en el servidor.',
      data: sanitizarProyecto(nuevoProyecto, req.user.role)
    });
  } catch (error) {
    console.error('Error en crearProyecto:', error);
    next(error);
  }
};

/**
 * PUT /api/proyectos/:id
 * Actualiza un proyecto.
 */
export const actualizarProyecto = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, direccion, responsableNombre, responsableTelefono, responsableEmail } = req.body;

    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ ok: false, error: 'Acción permitida únicamente para administradores.' });
    }

    const updated = await prisma.proyecto.update({
      where: { id },
      data: {
        nombre,
        descripcion: descripcion || null,
        direccion: direccion || '',
        responsableNombre: responsableNombre || null,
        responsableTelefono: responsableTelefono || null,
        responsableEmail: responsableEmail || null
      }
    });

    return res.status(200).json({ ok: true, data: updated });
  } catch (error) {
    console.error('Error en actualizarProyecto:', error);
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
        subestaciones: true,
        puntosMedicion: true,
        ccmList: true,
        alimentadores: true,
        tableros: {
          include: {
            circuitos: {
              orderBy: { posicionPolo: 'asc' }
            }
          }
        }
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
      data: sanitizarProyecto(proyecto, req.user.role)
    });
  } catch (error) {
    console.error('Error en obtenerProyectoCompleto:', error);
    next(error);
  }
};

/**
 * DELETE /api/proyectos/:id
 * Elimina un proyecto de la base de datos (con cascada para dependencias).
 */
export const eliminarProyecto = async (req, res, next) => {
  try {
    const { id } = req.params;

    const proyecto = await prisma.proyecto.findUnique({
      where: { id }
    });

    if (!proyecto) {
      return res.status(404).json({ ok: false, error: 'Proyecto no encontrado.' });
    }

    await prisma.proyecto.delete({
      where: { id }
    });

    return res.status(200).json({ ok: true, message: 'Proyecto eliminado con éxito.' });
  } catch (error) {
    console.error('Error en eliminarProyecto:', error);
    next(error);
  }
};

