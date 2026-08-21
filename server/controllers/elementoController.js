import prisma from '../db.js';

/**
 * POST /api/elementos-unifilares
 * Registra un ElementoUnifilar en PostgreSQL con auto-resuelto de Proyecto y Empresa (P2025 prevention).
 */
export const crearElementoUnifilar = async (req, res, next) => {
  try {
    const {
      id,
      nombre,
      tipoElemento,
      ubicacion,
      alimentadoPor,
      observacionesGenerales,
      datosTecnicos,
      proyectoId,
      empresaId,
      fotoUrl
    } = req.body;

    // 1. Validación de campos obligatorios
    if (!nombre || !proyectoId || !tipoElemento) {
      return res.status(400).json({
        ok: false,
        error: 'Los campos nombre, proyectoId y tipoElemento son requeridos.'
      });
    }

    let proyectoExiste = await prisma.proyecto.findUnique({
      where: { id: proyectoId }
    });

    if (!proyectoExiste) {
      console.warn(`[AF WARNING] El proyecto con ID '${proyectoId}' no existe en el servidor.`);
      return res.status(422).json({
        ok: false,
        error: 'Dependencia inexistente',
        detalle: 'El proyecto padre debe existir previamente en el servidor'
      });
    }

    // 3. Comprobación previa de la existencia de la Empresa (si viene empresaId)
    let empresaExiste = null;
    if (empresaId) {
      empresaExiste = await prisma.empresa.findUnique({
        where: { id: empresaId }
      });
    }

    // Parsear datosTecnicos si vienen como cadena JSON desde FormData (Multer)
    let parsedDatosTecnicos = {};
    if (datosTecnicos) {
      if (typeof datosTecnicos === 'string') {
        try {
          parsedDatosTecnicos = JSON.parse(datosTecnicos);
        } catch (e) {
          console.error('Error al deserializar datosTecnicos JSON:', e);
          parsedDatosTecnicos = {};
        }
      } else {
        parsedDatosTecnicos = datosTecnicos;
      }
    }

    // Determinar la URL pública de la foto guardada en disco por Multer
    let finalFoto = fotoUrl || null;
    if (req.file) {
      finalFoto = `/uploads/${req.file.filename}`;
    }

    // SI ES TABLERO, APLICAR VALIDACIONES Y CREAR EN TABLAS INDEPENDIENTES
    if (tipoElemento === 'TABLERO') {
      const maxPolos = parsedDatosTecnicos.maxPoles !== undefined ? parseInt(parsedDatosTecnicos.maxPoles, 10) : 42;
      const circuits = parsedDatosTecnicos.circuits || parsedDatosTecnicos.circuitos || [];

      // Validar reglas de polos
      for (const circ of circuits) {
        const numPolos = circ.numPolos !== undefined ? parseInt(circ.numPolos, 10) : (circ.poles ? circ.poles.length : 1);
        const posicionPolo = circ.posicionPolo !== undefined ? parseInt(circ.posicionPolo, 10) : (circ.poles ? circ.poles[0] : 1);

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

      // Upsert Tablero
      const tension = parsedDatosTecnicos.tension || parsedDatosTecnicos.voltajeAcometida || null;
      const fases = parsedDatosTecnicos.fases !== undefined ? parseInt(parsedDatosTecnicos.fases, 10) : 3;
      const alimentadorId = parsedDatosTecnicos.alimentadorId || null;

      await prisma.tablero.upsert({
        where: { id: id || '' },
        update: {
          nombre,
          ubicacion: ubicacion || null,
          maxPolos,
          tension,
          fases,
          alimentadorId,
          proyectoId,
          empresaId: empresaId || null,
          circuitos: {
            deleteMany: {},
            create: circuits.map(c => ({
              id: c.id && !c.id.startsWith('auto_') && !c.id.startsWith('split_') ? c.id : undefined,
              posicionPolo: c.posicionPolo !== undefined ? parseInt(c.posicionPolo, 10) : (c.poles ? c.poles[0] : 1),
              numPolos: c.numPolos !== undefined ? parseInt(c.numPolos, 10) : (c.poles ? c.poles.length : 1),
              amperaje: c.amperaje !== undefined ? (c.amperaje ? parseFloat(c.amperaje) : null) : (c.breaker?.amp ? parseFloat(c.breaker.amp) : null),
              descripcion: c.descripcion || c.equipo || null,
              estado: c.estado || 'ACTIVO'
            }))
          }
        },
        create: {
          id: id || undefined,
          nombre,
          ubicacion: ubicacion || null,
          maxPolos,
          tension,
          fases,
          alimentadorId,
          proyectoId,
          empresaId: empresaId || null,
          circuitos: {
            create: circuits.map(c => ({
              id: c.id && !c.id.startsWith('auto_') && !c.id.startsWith('split_') ? c.id : undefined,
              posicionPolo: c.posicionPolo !== undefined ? parseInt(c.posicionPolo, 10) : (c.poles ? c.poles[0] : 1),
              numPolos: c.numPolos !== undefined ? parseInt(c.numPolos, 10) : (c.poles ? c.poles.length : 1),
              amperaje: c.amperaje !== undefined ? (c.amperaje ? parseFloat(c.amperaje) : null) : (c.breaker?.amp ? parseFloat(c.breaker.amp) : null),
              descripcion: c.descripcion || c.equipo || null,
              estado: c.estado || 'ACTIVO'
            }))
          }
        }
      });
    }

    // 4. Inserción o actualización relacional segura en PostgreSQL
    const nuevoElemento = await prisma.elementoUnifilar.upsert({
      where: { id: id || '' },
      update: {
        nombre,
        tipoElemento,
        ubicacion: ubicacion || null,
        alimentadoPor: alimentadoPor || null,
        foto: finalFoto,
        observacionesGenerales: observacionesGenerales || null,
        datosTecnicos: parsedDatosTecnicos,
        proyecto: {
          connect: { id: proyectoId }
        },
        ...(empresaExiste ? { empresa: { connect: { id: empresaId } } } : {})
      },
      create: {
        id: id || undefined,
        nombre,
        tipoElemento,
        ubicacion: ubicacion || null,
        alimentadoPor: alimentadoPor || null,
        foto: finalFoto,
        observacionesGenerales: observacionesGenerales || null,
        datosTecnicos: parsedDatosTecnicos,
        proyecto: {
          connect: { id: proyectoId }
        },
        ...(empresaExiste ? { empresa: { connect: { id: empresaId } } } : {})
      }
    });

    return res.status(201).json({
      ok: true,
      message: 'Elemento unifilar registrado/actualizado exitosamente en el servidor.',
      data: nuevoElemento
    });

  } catch (error) {
    console.error('Error en crearElementoUnifilar:', error);
    next(error);
  }
};

/**
 * DELETE /api/elementos-unifilares/:id
 * Elimina un elemento unifilar (y su tablero/circuitos si es de tipo TABLERO).
 */
export const eliminarElementoUnifilar = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verificar si existe
    const elemento = await prisma.elementoUnifilar.findUnique({
      where: { id }
    });

    if (!elemento) {
      return res.status(404).json({ ok: false, error: 'Elemento unifilar no encontrado.' });
    }

    // Si es tablero, eliminarlo de la tabla de tableros (se eliminan sus circuitos en cascada)
    if (elemento.tipoElemento === 'TABLERO') {
      try {
        const tableroExiste = await prisma.tablero.findUnique({ where: { id } });
        if (tableroExiste) {
          await prisma.tablero.delete({ where: { id } });
        }
      } catch (err) {
        console.warn('Error al intentar eliminar tablero asociado:', err.message);
      }
    }

    // Eliminar el elemento unifilar
    await prisma.elementoUnifilar.delete({
      where: { id }
    });

    return res.status(200).json({ ok: true, message: 'Elemento unifilar eliminado con éxito.' });
  } catch (error) {
    console.error('Error en eliminarElementoUnifilar:', error);
    next(error);
  }
};

