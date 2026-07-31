import prisma from '../db.js';

/**
 * POST /api/tableros
 * POST /api/empresas/:empresaId/tableros
 * Crea un tablero junto con sus circuitos asociados.
 */
export const crearTableroCompleto = async (req, res, next) => {
  try {
    const empresaId = req.params.empresaId || req.body.empresaId;
    const {
      id,
      nombre,
      ubicacion,
      maxPolos = 42,
      tension,
      fases = 3,
      alimentadorId,
      proyectoId,
      circuitos = []
    } = req.body;

    if (!nombre) {
      return res.status(400).json({ ok: false, error: 'El nombre o código del tablero es obligatorio.' });
    }

    if (!proyectoId) {
      return res.status(400).json({ ok: false, error: 'El campo proyectoId es requerido para asociar el tablero.' });
    }

    // Validar reglas de polos antes de guardar
    for (const circ of circuitos) {
      const numPolos = circ.numPolos !== undefined ? parseInt(circ.numPolos, 10) : 1;
      const posicionPolo = circ.posicionPolo !== undefined ? parseInt(circ.posicionPolo, 10) : 1;

      if (numPolos < 1 || numPolos > 3) {
        return res.status(400).json({
          ok: false,
          error: `Validación fallida: numPolos (${numPolos}) debe estar entre 1 y 3.`
        });
      }

      if (posicionPolo + (numPolos - 1) > maxPolos) {
        return res.status(400).json({
          ok: false,
          error: `Validación fallida: El circuito en la posición ${posicionPolo} con ${numPolos} polos supera la capacidad máxima del gabinete de ${maxPolos} polos.`
        });
      }
    }

    const nuevoTablero = await prisma.tablero.create({
      data: {
        id: id || undefined,
        nombre,
        ubicacion: ubicacion || null,
        maxPolos: parseInt(maxPolos, 10),
        tension: tension || null,
        fases: parseInt(fases, 10),
        alimentadorId: alimentadorId || null,
        proyecto: {
          connect: { id: proyectoId }
        },
        ...(empresaId ? { empresa: { connect: { id: empresaId } } } : {}),
        circuitos: {
          create: circuitos.map((circ) => ({
            id: circ.id || undefined,
            posicionPolo: parseInt(circ.posicionPolo, 10),
            numPolos: parseInt(circ.numPolos, 10) || 1,
            amperaje: circ.amperaje ? parseFloat(circ.amperaje) : null,
            descripcion: circ.descripcion || null,
            estado: circ.estado || 'ACTIVO'
          }))
        }
      },
      include: {
        circuitos: true
      }
    });

    return res.status(201).json({
      ok: true,
      message: 'Tablero y todos sus circuitos registrados con éxito.',
      data: nuevoTablero
    });

  } catch (error) {
    console.error('Error en crearTableroCompleto:', error);
    next(error);
  }
};

/**
 * GET /api/empresas/:empresaId/tableros
 * Lista todos los tableros de una empresa.
 */
export const obtenerTablerosPorEmpresa = async (req, res, next) => {
  try {
    const { empresaId } = req.params;

    const empresaExiste = await prisma.empresa.findUnique({
      where: { id: empresaId }
    });

    if (!empresaExiste) {
      return res.status(404).json({ ok: false, error: 'La empresa especificada no existe.' });
    }

    const tableros = await prisma.tablero.findMany({
      where: { empresaId },
      include: {
        circuitos: {
          orderBy: { posicionPolo: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({ ok: true, data: tableros });
  } catch (error) {
    console.error('Error en obtenerTablerosPorEmpresa:', error);
    next(error);
  }
};

/**
 * GET /api/tableros/:id
 * Obtiene detalles de un tablero.
 */
export const obtenerTableroPorId = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tablero = await prisma.tablero.findUnique({
      where: { id },
      include: {
        circuitos: {
          orderBy: { posicionPolo: 'asc' }
        }
      }
    });

    if (!tablero) {
      return res.status(404).json({ ok: false, error: 'Tablero no encontrado.' });
    }

    return res.status(200).json({ ok: true, data: tablero });
  } catch (error) {
    console.error('Error en obtenerTableroPorId:', error);
    next(error);
  }
};

/**
 * PUT /api/tableros/:id
 * Actualiza los datos generales de un tablero.
 */
export const actualizarTablero = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nombre, ubicacion, maxPolos, tension, fases, alimentadorId } = req.body;

    const tableroActual = await prisma.tablero.findUnique({
      where: { id },
      include: { circuitos: true }
    });

    if (!tableroActual) {
      return res.status(404).json({ ok: false, error: 'Tablero no encontrado.' });
    }

    const finalMaxPolos = maxPolos !== undefined ? parseInt(maxPolos, 10) : tableroActual.maxPolos;

    // Validar circuitos existentes contra el nuevo maxPolos
    for (const circ of tableroActual.circuitos) {
      if (circ.posicionPolo + (circ.numPolos - 1) > finalMaxPolos) {
        return res.status(400).json({
          ok: false,
          error: `No se puede reducir la capacidad a ${finalMaxPolos} polos porque el circuito en la posición ${circ.posicionPolo} con ${circ.numPolos} polos excede esta capacidad.`
        });
      }
    }

    const updated = await prisma.tablero.update({
      where: { id },
      data: {
        nombre: nombre || undefined,
        ubicacion: ubicacion !== undefined ? ubicacion : undefined,
        maxPolos: finalMaxPolos,
        tension: tension !== undefined ? tension : undefined,
        fases: fases !== undefined ? parseInt(fases, 10) : undefined,
        alimentadorId: alimentadorId !== undefined ? (alimentadorId || null) : undefined
      },
      include: {
        circuitos: true
      }
    });

    return res.status(200).json({ ok: true, data: updated });
  } catch (error) {
    console.error('Error en actualizarTablero:', error);
    next(error);
  }
};

/**
 * DELETE /api/tableros/:id
 * Elimina un tablero y sus circuitos en cascada.
 */
export const eliminarTablero = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.tablero.delete({ where: { id } });
    return res.status(200).json({ ok: true, message: 'Tablero eliminado con éxito.' });
  } catch (error) {
    console.error('Error en eliminarTablero:', error);
    next(error);
  }
};

/**
 * POST /api/tableros/:tableroId/circuitos
 * Añade un circuito a un tablero.
 */
export const crearCircuito = async (req, res, next) => {
  try {
    const { tableroId } = req.params;
    const { posicionPolo, numPolos = 1, amperaje, descripcion, estado = 'ACTIVO' } = req.body;

    const tablero = await prisma.tablero.findUnique({
      where: { id: tableroId }
    });

    if (!tablero) {
      return res.status(404).json({ ok: false, error: 'Tablero no encontrado.' });
    }

    if (numPolos < 1 || numPolos > 3) {
      return res.status(400).json({ ok: false, error: 'El número de polos (numPolos) debe estar entre 1 y 3.' });
    }

    if (parseInt(posicionPolo, 10) + (parseInt(numPolos, 10) - 1) > tablero.maxPolos) {
      return res.status(400).json({
        ok: false,
        error: `La posición del circuito supera la capacidad de polos del tablero (${tablero.maxPolos}).`
      });
    }

    const nuevoCircuito = await prisma.circuito.create({
      data: {
        tableroId,
        posicionPolo: parseInt(posicionPolo, 10),
        numPolos: parseInt(numPolos, 10),
        amperaje: amperaje ? parseFloat(amperaje) : null,
        descripcion: descripcion || null,
        estado
      }
    });

    return res.status(201).json({ ok: true, data: nuevoCircuito });
  } catch (error) {
    console.error('Error en crearCircuito:', error);
    next(error);
  }
};

/**
 * PUT /api/circuitos/:id
 * Actualiza un circuito individual.
 */
export const actualizarCircuito = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { posicionPolo, numPolos, amperaje, descripcion, estado } = req.body;

    const circuitoActual = await prisma.circuito.findUnique({
      where: { id },
      include: { tablero: true }
    });

    if (!circuitoActual) {
      return res.status(404).json({ ok: false, error: 'Circuito no encontrado.' });
    }

    const finalPosicion = posicionPolo !== undefined ? parseInt(posicionPolo, 10) : circuitoActual.posicionPolo;
    const finalNumPolos = numPolos !== undefined ? parseInt(numPolos, 10) : circuitoActual.numPolos;
    const maxPolos = circuitoActual.tablero.maxPolos;

    if (finalNumPolos < 1 || finalNumPolos > 3) {
      return res.status(400).json({ ok: false, error: 'El número de polos (numPolos) debe estar entre 1 y 3.' });
    }

    if (finalPosicion + (finalNumPolos - 1) > maxPolos) {
      return res.status(400).json({
        ok: false,
        error: `La posición del circuito excede la capacidad del gabinete (${maxPolos} polos).`
      });
    }

    const updated = await prisma.circuito.update({
      where: { id },
      data: {
        posicionPolo: finalPosicion,
        numPolos: finalNumPolos,
        amperaje: amperaje !== undefined ? (amperaje ? parseFloat(amperaje) : null) : undefined,
        descripcion: descripcion !== undefined ? descripcion : undefined,
        estado: estado !== undefined ? estado : undefined
      }
    });

    return res.status(200).json({ ok: true, data: updated });
  } catch (error) {
    console.error('Error en actualizarCircuito:', error);
    next(error);
  }
};

/**
 * DELETE /api/circuitos/:id
 * Elimina un circuito.
 */
export const eliminarCircuito = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.circuito.delete({ where: { id } });
    return res.status(200).json({ ok: true, message: 'Circuito eliminado con éxito.' });
  } catch (error) {
    console.error('Error en eliminarCircuito:', error);
    next(error);
  }
};
