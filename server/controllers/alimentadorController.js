import prisma from '../db.js';

export const obtenerAlimentadores = async (req, res, next) => {
  try {
    const { proyectoId } = req.query;
    const where = proyectoId ? { proyectoId } : {};

    const alimentadores = await prisma.alimentador.findMany({
      where,
      orderBy: { nombre: 'asc' }
    });

    return res.status(200).json({ ok: true, data: alimentadores });
  } catch (error) {
    console.error('Error en obtenerAlimentadores:', error);
    next(error);
  }
};

export const crearAlimentador = async (req, res, next) => {
  try {
    const { id, nombre, origen, capacidadAmperios, proyectoId } = req.body;

    if (!nombre || !proyectoId) {
      return res.status(400).json({ ok: false, error: 'Los campos nombre y proyectoId son requeridos.' });
    }

    const nuevoAlimentador = await prisma.alimentador.create({
      data: {
        id: id || undefined,
        nombre,
        origen: origen || null,
        capacidadAmperios: capacidadAmperios ? parseFloat(capacidadAmperios) : null,
        proyecto: { connect: { id: proyectoId } }
      }
    });

    return res.status(201).json({ ok: true, data: nuevoAlimentador });
  } catch (error) {
    console.error('Error en crearAlimentador:', error);
    next(error);
  }
};

export const actualizarAlimentador = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nombre, origen, capacidadAmperios } = req.body;

    const updated = await prisma.alimentador.update({
      where: { id },
      data: {
        nombre: nombre || undefined,
        origen: origen !== undefined ? origen : undefined,
        capacidadAmperios: capacidadAmperios !== undefined ? (capacidadAmperios ? parseFloat(capacidadAmperios) : null) : undefined
      }
    });

    return res.status(200).json({ ok: true, data: updated });
  } catch (error) {
    console.error('Error en actualizarAlimentador:', error);
    next(error);
  }
};

export const eliminarAlimentador = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.alimentador.delete({ where: { id } });
    return res.status(200).json({ ok: true, message: 'Alimentador eliminado con éxito.' });
  } catch (error) {
    console.error('Error en eliminarAlimentador:', error);
    next(error);
  }
};
