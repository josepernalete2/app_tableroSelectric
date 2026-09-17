import prisma from '../db.js';

export const obtenerAlimentadores = async (req, res, next) => {
  try {
    const { proyectoId } = req.query;
    const where = {};

    if (proyectoId) {
      where.proyectoId = proyectoId;
    }

    if (req.user && req.user.role === 'CLIENT') {
      where.proyecto = { empresaId: req.user.companyId };
    }

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
    const { id, nombre, origen, capacidadAmperios, capacidadKVA, proyectoId } = req.body;

    if (!nombre || !proyectoId) {
      return res.status(400).json({ ok: false, error: 'Los campos nombre y proyectoId son requeridos.' });
    }

    let parsedAmperios = null;
    if (capacidadAmperios !== undefined && capacidadAmperios !== null && capacidadAmperios !== '') {
      parsedAmperios = parseFloat(capacidadAmperios);
      if (isNaN(parsedAmperios) || parsedAmperios < 0) {
        return res.status(400).json({ ok: false, error: 'La capacidad en amperios debe ser un número positivo válido.' });
      }
    }

    let parsedKVA = null;
    if (capacidadKVA !== undefined && capacidadKVA !== null && capacidadKVA !== '') {
      parsedKVA = parseFloat(capacidadKVA);
    } else if (parsedAmperios && parsedAmperios > 0) {
      // Cálculo automático nominal 3-fases a 208V: (√3 * 208 * I) / 1000
      parsedKVA = Math.round(((Math.sqrt(3) * 208 * parsedAmperios) / 1000) * 100) / 100;
    }

    const nuevoAlimentador = await prisma.alimentador.create({
      data: {
        id: id || undefined,
        nombre,
        origen: origen || null,
        capacidadAmperios: parsedAmperios,
        capacidadKVA: parsedKVA,
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
    const { nombre, origen, capacidadAmperios, capacidadKVA } = req.body;

    let parsedAmperios = undefined;
    if (capacidadAmperios !== undefined) {
      if (capacidadAmperios === null || capacidadAmperios === '') {
        parsedAmperios = null;
      } else {
        parsedAmperios = parseFloat(capacidadAmperios);
        if (isNaN(parsedAmperios) || parsedAmperios < 0) {
          return res.status(400).json({ ok: false, error: 'La capacidad en amperios debe ser un número positivo válido.' });
        }
      }
    }

    let parsedKVA = undefined;
    if (capacidadKVA !== undefined) {
      parsedKVA = capacidadKVA !== null && capacidadKVA !== '' ? parseFloat(capacidadKVA) : null;
    } else if (parsedAmperios !== undefined) {
      parsedKVA = parsedAmperios ? Math.round(((Math.sqrt(3) * 208 * parsedAmperios) / 1000) * 100) / 100 : null;
    }

    const updated = await prisma.alimentador.update({
      where: { id },
      data: {
        nombre: nombre || undefined,
        origen: origen !== undefined ? origen : undefined,
        capacidadAmperios: parsedAmperios,
        capacidadKVA: parsedKVA
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
