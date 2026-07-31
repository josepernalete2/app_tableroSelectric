import prisma from '../db.js';

/**
 * GET /api/empresas
 * Lista todas las empresas registradas.
 */
export const obtenerEmpresas = async (req, res, next) => {
  try {
    const empresas = await prisma.empresa.findMany({
      orderBy: { createdAt: 'asc' }
    });
    return res.status(200).json({ ok: true, data: empresas });
  } catch (error) {
    console.error('Error en obtenerEmpresas:', error);
    next(error);
  }
};

/**
 * POST /api/empresas
 * Crea o actualiza (upsert) una empresa sincronizada desde la tableta.
 */
export const crearEmpresa = async (req, res, next) => {
  try {
    const { id, nombre, direccion } = req.body;

    if (!id || !nombre) {
      return res.status(400).json({
        ok: false,
        error: 'Los campos id y nombre son obligatorios.'
      });
    }

    const empresa = await prisma.empresa.upsert({
      where: { id },
      update: {
        nombre,
        direccion: direccion || null
      },
      create: {
        id,
        nombre,
        direccion: direccion || null
      }
    });

    return res.status(201).json({
      ok: true,
      message: 'Empresa registrada con éxito en el servidor.',
      data: empresa
    });
  } catch (error) {
    console.error('Error en crearEmpresa:', error);
    next(error);
  }
};
