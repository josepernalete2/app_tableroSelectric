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

    const parsedMaxPolos = parseInt(maxPolos, 10);
    if (isNaN(parsedMaxPolos) || parsedMaxPolos < 1 || parsedMaxPolos > 120) {
      return res.status(400).json({ ok: false, error: 'El campo maxPolos debe ser un número entero entre 1 y 120.' });
    }

    const parsedFases = parseInt(fases, 10);
    if (isNaN(parsedFases) || ![1, 2, 3].includes(parsedFases)) {
      return res.status(400).json({ ok: false, error: 'El campo fases debe ser 1, 2 o 3.' });
    }

    // Validar reglas de polos y colisiones internas en la lista de circuitos
    const polosOcupadosMap = new Map();
    for (const circ of circuitos) {
      const numPolos = circ.numPolos !== undefined ? parseInt(circ.numPolos, 10) : 1;
      const posicionPolo = circ.posicionPolo !== undefined ? parseInt(circ.posicionPolo, 10) : 1;

      if (isNaN(numPolos) || numPolos < 1 || numPolos > 3 || numPolos > parsedFases) {
        return res.status(400).json({
          ok: false,
          error: `Validación fallida: numPolos (${circ.numPolos}) debe estar entre 1 y ${parsedFases} acorde a las fases del tablero.`
        });
      }

      if (isNaN(posicionPolo) || posicionPolo < 1 || posicionPolo > parsedMaxPolos) {
        return res.status(400).json({
          ok: false,
          error: `Validación fallida: posicionPolo (${circ.posicionPolo}) debe ser un entero entre 1 y ${parsedMaxPolos}.`
        });
      }

      // Calcular polos requeridos [p, p+2, ...]
      const requiredPoles = [];
      for (let i = 0; i < numPolos; i++) {
        requiredPoles.push(posicionPolo + i * 2);
      }

      const highestPole = Math.max(...requiredPoles);
      if (highestPole > parsedMaxPolos) {
        return res.status(409).json({
          ok: false,
          error: 'Capacidad de polos excedida',
          detalle: `El circuito en la posición ${posicionPolo} con ${numPolos} polos ocupa los polos [${requiredPoles.join(', ')}], superando el límite del tablero (${parsedMaxPolos} polos).`
        });
      }

      for (const p of requiredPoles) {
        if (polosOcupadosMap.has(p)) {
          const occ = polosOcupadosMap.get(p);
          return res.status(409).json({
            ok: false,
            error: 'Conflicto de colisión de polos',
            detalle: `El polo ${p} está duplicado/solapado entre el circuito "${circ.descripcion || `Circuito ${posicionPolo}`}" y el circuito "${occ.descripcion || `Circuito ${occ.posicionPolo}`}".`,
            poloEnConflicto: p
          });
        }
        polosOcupadosMap.set(p, { posicionPolo, descripcion: circ.descripcion });
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
            descripcion: circ.descripcion || circ.equipo || null,
            estado: circ.estado || 'ACTIVO',
            elementoDestinoId: circ.elementoDestinoId || circ.vinculadoId || null,
            tipoElementoDestino: circ.tipoElementoDestino || circ.tipoDestino || null
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

    // Multitenant: verificar que usuarios con rol CLIENT solo consulten su propia empresa
    if (req.user && req.user.role === 'CLIENT' && req.user.companyId !== empresaId) {
      return res.status(403).json({
        ok: false,
        error: 'Acceso denegado: no tiene permisos para consultar tableros de esta empresa.'
      });
    }

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
        proyecto: true,
        circuitos: {
          orderBy: { posicionPolo: 'asc' }
        }
      }
    });

    if (!tablero) {
      return res.status(404).json({ ok: false, error: 'Tablero no encontrado.' });
    }

    // Multitenant: verificar pertenencia si el usuario tiene rol CLIENT
    if (req.user && req.user.role === 'CLIENT') {
      const empresaDuena = tablero.empresaId || (tablero.proyecto && tablero.proyecto.empresaId);
      if (empresaDuena && req.user.companyId !== empresaDuena) {
        return res.status(403).json({
          ok: false,
          error: 'Acceso denegado: no tiene permisos para acceder a este tablero.'
        });
      }
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
      include: { circuitos: true, proyecto: true }
    });

    if (!tableroActual) {
      return res.status(404).json({ ok: false, error: 'Tablero no encontrado.' });
    }

    if (req.user && req.user.role === 'CLIENT') {
      const empresaDuena = tableroActual.empresaId || (tableroActual.proyecto && tableroActual.proyecto.empresaId);
      if (empresaDuena && req.user.companyId !== empresaDuena) {
        return res.status(403).json({ ok: false, error: 'Acceso denegado: no tiene permisos para modificar este tablero.' });
      }
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

    const tableroActual = await prisma.tablero.findUnique({
      where: { id },
      include: { proyecto: true }
    });

    if (!tableroActual) {
      return res.status(404).json({ ok: false, error: 'Tablero no encontrado.' });
    }

    if (req.user && req.user.role === 'CLIENT') {
      const empresaDuena = tableroActual.empresaId || (tableroActual.proyecto && tableroActual.proyecto.empresaId);
      if (empresaDuena && req.user.companyId !== empresaDuena) {
        return res.status(403).json({ ok: false, error: 'Acceso denegado: no tiene permisos para eliminar este tablero.' });
      }
    }

    await prisma.tablero.delete({ where: { id } });
    return res.status(200).json({ ok: true, message: 'Tablero eliminado con éxito.' });
  } catch (error) {
    console.error('Error en eliminarTablero:', error);
    next(error);
  }
};

/**
 * POST /api/tableros/:tableroId/circuitos
 * Añade un circuito a un tablero con validación estricta y atómica de polos y colisión dentro de una transacción.
 */
export const crearCircuito = async (req, res, next) => {
  try {
    const { tableroId } = req.params;
    const { posicionPolo, numPolos = 1, amperaje, descripcion, estado = 'ACTIVO' } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const tablero = await tx.tablero.findUnique({
        where: { id: tableroId },
        include: { circuitos: true, proyecto: true }
      });

      if (!tablero) {
        return { status: 404, body: { ok: false, error: 'Tablero no encontrado.' } };
      }

      if (req.user && req.user.role === 'CLIENT') {
        const empresaDuena = tablero.empresaId || (tablero.proyecto && tablero.proyecto.empresaId);
        if (empresaDuena && req.user.companyId !== empresaDuena) {
          return { status: 403, body: { ok: false, error: 'Acceso denegado: no tiene permisos para modificar este tablero.' } };
        }
      }

      const startPole = parseInt(posicionPolo, 10);
      const count = parseInt(numPolos, 10) || 1;

      if (isNaN(startPole) || startPole < 1) {
        return { status: 400, body: { ok: false, error: 'La posición del polo debe ser un entero mayor o igual a 1.' } };
      }

      if (count < 1 || count > 3) {
        return { status: 400, body: { ok: false, error: 'El número de polos (numPolos) debe estar entre 1 y 3.' } };
      }

      // Calcular arreglo de polos requeridos en la misma columna [p, p+2, ...]
      const requiredPoles = [];
      for (let i = 0; i < count; i++) {
        requiredPoles.push(startPole + i * 2);
      }

      const highestPole = Math.max(...requiredPoles);
      if (highestPole > tablero.maxPolos) {
        return {
          status: 409,
          body: {
            ok: false,
            error: 'Capacidad de polos excedida',
            detalle: `Los polos requeridos [${requiredPoles.join(', ')}] superan la capacidad máxima del tablero (${tablero.maxPolos} polos).`
          }
        };
      }

      // Verificar colisión contra circuitos existentes dentro de la transacción
      for (const circ of tablero.circuitos) {
        const circCount = circ.numPolos || 1;
        const occupiedPoles = [];
        for (let i = 0; i < circCount; i++) {
          occupiedPoles.push(circ.posicionPolo + i * 2);
        }

        const colision = requiredPoles.find((p) => occupiedPoles.includes(p));
        if (colision) {
          return {
            status: 409,
            body: {
              ok: false,
              error: 'Conflicto de ocupación de polos',
              detalle: `El polo ${colision} ya está ocupado por el circuito "${circ.descripcion || `Circuito Polo ${circ.posicionPolo}`}" (Estado: ${circ.estado || 'ACTIVO'}).`,
              poloEnConflicto: colision,
              circuitoExistente: circ
            }
          };
        }
      }

      const nuevoCircuito = await tx.circuito.create({
        data: {
          tableroId,
          posicionPolo: startPole,
          numPolos: count,
          amperaje: amperaje ? parseFloat(amperaje) : null,
          descripcion: descripcion || null,
          estado,
          elementoDestinoId: req.body.elementoDestinoId || req.body.vinculadoId || null,
          tipoElementoDestino: req.body.tipoElementoDestino || req.body.tipoDestino || null,
          version: 1
        }
      });

      // Incrementar versión del tablero padre para OCC
      await tx.tablero.update({
        where: { id: tableroId },
        data: { version: { increment: 1 } }
      });

      return { status: 201, body: { ok: true, data: nuevoCircuito } };
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Error en crearCircuito:', error);
    next(error);
  }
};

/**
 * PUT /api/circuitos/:id
 * Actualiza un circuito individual con validación atómica de colisión en transacción.
 */
export const actualizarCircuito = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { posicionPolo, numPolos, amperaje, descripcion, estado } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const circuitoActual = await tx.circuito.findUnique({
        where: { id },
        include: {
          tablero: {
            include: { circuitos: true, proyecto: true }
          }
        }
      });

      if (!circuitoActual) {
        return { status: 404, body: { ok: false, error: 'Circuito no encontrado.' } };
      }

      if (req.user && req.user.role === 'CLIENT') {
        const empresaDuena = circuitoActual.tablero?.empresaId || (circuitoActual.tablero?.proyecto && circuitoActual.tablero.proyecto.empresaId);
        if (empresaDuena && req.user.companyId !== empresaDuena) {
          return { status: 403, body: { ok: false, error: 'Acceso denegado: no tiene permisos para modificar este circuito.' } };
        }
      }

      const startPole = posicionPolo !== undefined ? parseInt(posicionPolo, 10) : circuitoActual.posicionPolo;
      const count = numPolos !== undefined ? parseInt(numPolos, 10) : circuitoActual.numPolos;
      const maxPolos = circuitoActual.tablero?.maxPolos || 42;

      if (isNaN(startPole) || startPole < 1) {
        return { status: 400, body: { ok: false, error: 'La posición del polo debe ser un entero mayor o igual a 1.' } };
      }

      if (count < 1 || count > 3) {
        return { status: 400, body: { ok: false, error: 'El número de polos (numPolos) debe estar entre 1 y 3.' } };
      }

      // Calcular polos requeridos
      const requiredPoles = [];
      for (let i = 0; i < count; i++) {
        requiredPoles.push(startPole + i * 2);
      }

      const highestPole = Math.max(...requiredPoles);
      if (highestPole > maxPolos) {
        return {
          status: 409,
          body: {
            ok: false,
            error: 'Capacidad de polos excedida',
            detalle: `Los polos requeridos [${requiredPoles.join(', ')}] superan la capacidad del gabinete (${maxPolos} polos).`
          }
        };
      }

      // Verificar colisión con los demás circuitos del tablero
      const otrosCircuitos = (circuitoActual.tablero?.circuitos || []).filter((c) => c.id !== id);
      for (const circ of otrosCircuitos) {
        const circCount = circ.numPolos || 1;
        const occupiedPoles = [];
        for (let i = 0; i < circCount; i++) {
          occupiedPoles.push(circ.posicionPolo + i * 2);
        }

        const colision = requiredPoles.find((p) => occupiedPoles.includes(p));
        if (colision) {
          return {
            status: 409,
            body: {
              ok: false,
              error: 'Conflicto de ocupación de polos',
              detalle: `El polo ${colision} ya está ocupado por el circuito "${circ.descripcion || `Circuito Polo ${circ.posicionPolo}`}" (Estado: ${circ.estado || 'ACTIVO'}).`,
              poloEnConflicto: colision,
              circuitoExistente: circ
            }
          };
        }
      }

      const updated = await tx.circuito.update({
        where: { id },
        data: {
          posicionPolo: startPole,
          numPolos: count,
          amperaje: amperaje !== undefined ? (amperaje ? parseFloat(amperaje) : null) : undefined,
          descripcion: descripcion !== undefined ? descripcion : undefined,
          estado: estado !== undefined ? estado : undefined,
          elementoDestinoId: req.body.elementoDestinoId !== undefined ? (req.body.elementoDestinoId || null) : (req.body.vinculadoId !== undefined ? (req.body.vinculadoId || null) : undefined),
          tipoElementoDestino: req.body.tipoElementoDestino !== undefined ? (req.body.tipoElementoDestino || null) : (req.body.tipoDestino !== undefined ? (req.body.tipoDestino || null) : undefined),
          version: { increment: 1 }
        }
      });

      if (circuitoActual.tableroId) {
        await tx.tablero.update({
          where: { id: circuitoActual.tableroId },
          data: { version: { increment: 1 } }
        });
      }

      return { status: 200, body: { ok: true, data: updated } };
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Error en actualizarCircuito:', error);
    next(error);
  }
};

/**
 * DELETE /api/circuitos/:id
 * Elimina un circuito de forma atómica en transacción.
 */
export const eliminarCircuito = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await prisma.$transaction(async (tx) => {
      const circuitoActual = await tx.circuito.findUnique({
        where: { id },
        include: {
          tablero: {
            include: { proyecto: true }
          }
        }
      });

      if (!circuitoActual) {
        return { status: 404, body: { ok: false, error: 'Circuito no encontrado.' } };
      }

      if (req.user && req.user.role === 'CLIENT') {
        const empresaDuena = circuitoActual.tablero?.empresaId || (circuitoActual.tablero?.proyecto && circuitoActual.tablero.proyecto.empresaId);
        if (empresaDuena && req.user.companyId !== empresaDuena) {
          return { status: 403, body: { ok: false, error: 'Acceso denegado: no tiene permisos para eliminar este circuito.' } };
        }
      }

      await tx.circuito.delete({ where: { id } });

      if (circuitoActual.tableroId) {
        await tx.tablero.update({
          where: { id: circuitoActual.tableroId },
          data: { version: { increment: 1 } }
        });
      }

      return { status: 200, body: { ok: true, message: 'Circuito eliminado con éxito.' } };
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Error en eliminarCircuito:', error);
    next(error);
  }
};
