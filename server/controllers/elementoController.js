import prisma from '../db.js';

/**
 * POST /api/elementos-unifilares
 * Registra un ElementoUnifilar en PostgreSQL con auto-resuelto de Proyecto y Empresa (P2025 prevention).
 */
export const crearElementoUnifilar = async (req, res, next) => {
  try {
    const {
      id,
      codigo,
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
      console.log(`[AF AUTO-PARENT] El proyecto con ID '${proyectoId}' no existe en el servidor. Creando automáticamente para sincronización offline...`);
      let targetEmp = empresaId ? await prisma.empresa.findUnique({ where: { id: empresaId } }) : null;
      if (!targetEmp) {
        targetEmp = await prisma.empresa.findFirst();
        if (!targetEmp) {
          targetEmp = await prisma.empresa.create({
            data: {
              id: empresaId || `empresa-${Date.now()}`,
              nombre: 'Empresa Principal',
              rif: `J-${Date.now()}`,
              direccionFiscal: 'Sede Principal'
            }
          });
        }
      }
      proyectoExiste = await prisma.proyecto.create({
        data: {
          id: proyectoId,
          nombre: 'Proyecto Principal Offline',
          direccion: 'Sede de Operaciones',
          empresaId: targetEmp.id
        }
      });
      console.log(`[AF AUTO-PARENT] ✅ Proyecto padre creado exitosamente: ${proyectoId}`);
    }

    // 3. Comprobación previa de la existencia de la Empresa (si viene empresaId)
    let empresaExiste = null;
    const finalEmpresaId = empresaId || proyectoExiste.empresaId;
    if (finalEmpresaId) {
      empresaExiste = await prisma.empresa.findUnique({
        where: { id: finalEmpresaId }
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
    if (codigo && !parsedDatosTecnicos.codigo) {
      parsedDatosTecnicos.codigo = codigo;
    }

    // Determinar la foto (Base64 DataURL, URL pública en nube o buffer en memoria)
    let finalFoto = req.body.foto || fotoUrl || null;
    if (req.file && req.file.buffer) {
      finalFoto = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    } else if (req.file && req.file.filename) {
      finalFoto = `/uploads/${req.file.filename}`;
    }

    // SI ES TABLERO, APLICAR VALIDACIONES Y CREAR EN TABLAS INDEPENDIENTES
    if (tipoElemento === 'TABLERO') {
      const maxPolos = parsedDatosTecnicos.maxPoles !== undefined ? parseInt(parsedDatosTecnicos.maxPoles, 10) : 42;
      const circuits = parsedDatosTecnicos.circuits || parsedDatosTecnicos.circuitos || [];

      // Validar reglas de polos y colisiones internas
      const polosOcupadosMap = new Map();
      for (const circ of circuits) {
        const numPolos = circ.numPolos !== undefined ? parseInt(circ.numPolos, 10) : (circ.poles ? circ.poles.length : 1);
        const posicionPolo = circ.posicionPolo !== undefined ? parseInt(circ.posicionPolo, 10) : (circ.poles ? circ.poles[0] : 1);

        if (numPolos < 1 || numPolos > 3) {
          return res.status(400).json({
            ok: false,
            error: `Validación fallida: numPolos (${numPolos}) debe estar entre 1 y 3.`
          });
        }

        const requiredPoles = [];
        for (let i = 0; i < numPolos; i++) {
          requiredPoles.push(posicionPolo + i * 2);
        }

        const highestPole = Math.max(...requiredPoles);
        if (highestPole > maxPolos) {
          console.warn(`[AF WARNING] Capacidad de polos excedida (${highestPole} > ${maxPolos}). Ajustando capacidad para acomodar inspección...`);
          parsedDatosTecnicos.maxPoles = highestPole;
        }

        for (const p of requiredPoles) {
          if (polosOcupadosMap.has(p)) {
            const occ = polosOcupadosMap.get(p);
            console.warn(`[AF WARNING] Posible conflicto en polo ${p} entre "${circ.descripcion || circ.equipo}" y "${occ.descripcion || occ.equipo}". Permitiendo sincronización.`);
          }
          polosOcupadosMap.set(p, { posicionPolo, descripcion: circ.descripcion || circ.equipo });
        }
      }
    }

    // Inserción o actualización atómica relacional en PostgreSQL
    const nuevoElemento = await prisma.$transaction(async (tx) => {
      // SI ES TABLERO, APLICAR VALIDACIONES Y CREAR EN TABLAS INDEPENDIENTES
      if (tipoElemento === 'TABLERO') {
        const tension = parsedDatosTecnicos.tension || parsedDatosTecnicos.voltajeAcometida || null;
        const fases = parsedDatosTecnicos.fases !== undefined ? parseInt(parsedDatosTecnicos.fases, 10) : 3;
        const alimentadorId = parsedDatosTecnicos.alimentadorId || null;

        await tx.tablero.upsert({
          where: { id: id || '' },
          update: {
            nombre,
            ubicacion: ubicacion || null,
            maxPolos: parsedDatosTecnicos.maxPoles !== undefined ? parseInt(parsedDatosTecnicos.maxPoles, 10) : 42,
            tension,
            fases,
            alimentadorId,
            proyectoId,
            empresaId: empresaId || null,
            version: { increment: 1 },
            circuitos: {
              deleteMany: {},
              create: (parsedDatosTecnicos.circuits || parsedDatosTecnicos.circuitos || []).map(c => ({
                id: c.id && !c.id.startsWith('auto_') && !c.id.startsWith('split_') ? c.id : undefined,
                posicionPolo: c.posicionPolo !== undefined ? parseInt(c.posicionPolo, 10) : (c.poles ? c.poles[0] : 1),
                numPolos: c.numPolos !== undefined ? parseInt(c.numPolos, 10) : (c.poles ? c.poles.length : 1),
                amperaje: c.amperaje !== undefined ? (c.amperaje ? parseFloat(c.amperaje) : null) : (c.breaker?.amp ? parseFloat(c.breaker.amp) : null),
                descripcion: c.descripcion || c.equipo || null,
                estado: c.estado || 'ACTIVO',
                elementoDestinoId: c.elementoDestinoId || c.vinculadoId || null,
                tipoElementoDestino: c.tipoElementoDestino || c.tipoDestino || null,
                version: 1
              }))
            }
          },
          create: {
            id: id || undefined,
            nombre,
            ubicacion: ubicacion || null,
            maxPolos: parsedDatosTecnicos.maxPoles !== undefined ? parseInt(parsedDatosTecnicos.maxPoles, 10) : 42,
            tension,
            fases,
            alimentadorId,
            proyectoId,
            empresaId: empresaId || null,
            version: 1,
            circuitos: {
              create: (parsedDatosTecnicos.circuits || parsedDatosTecnicos.circuitos || []).map(c => ({
                id: c.id && !c.id.startsWith('auto_') && !c.id.startsWith('split_') ? c.id : undefined,
                posicionPolo: c.posicionPolo !== undefined ? parseInt(c.posicionPolo, 10) : (c.poles ? c.poles[0] : 1),
                numPolos: c.numPolos !== undefined ? parseInt(c.numPolos, 10) : (c.poles ? c.poles.length : 1),
                amperaje: c.amperaje !== undefined ? (c.amperaje ? parseFloat(c.amperaje) : null) : (c.breaker?.amp ? parseFloat(c.breaker.amp) : null),
                descripcion: c.descripcion || c.equipo || null,
                estado: c.estado || 'ACTIVO',
                elementoDestinoId: c.elementoDestinoId || c.vinculadoId || null,
                tipoElementoDestino: c.tipoElementoDestino || c.tipoDestino || null,
                version: 1
              }))
            }
          }
        });
      }

      const isDeletePhoto = (
        req.body.eliminarFoto === 'true' ||
        req.body.eliminarFoto === true ||
        req.body.deletePhoto === 'true' ||
        req.body.deletePhoto === true ||
        req.body.foto === '' ||
        req.body.foto === null ||
        req.body.foto === 'null' ||
        req.body.fotoUrl === '' ||
        req.body.fotoUrl === null ||
        ('foto' in req.body && !req.body.foto && !req.file) ||
        ('fotoUrl' in req.body && !req.body.fotoUrl && !req.file)
      );

      const updateFotoData = {};
      if (finalFoto && !isDeletePhoto) {
        updateFotoData.foto = finalFoto;
      } else if (isDeletePhoto) {
        updateFotoData.foto = null;
      }

      return await tx.elementoUnifilar.upsert({
        where: { id: id || '' },
        update: {
          nombre,
          tipoElemento,
          ubicacion: ubicacion || null,
          alimentadoPor: alimentadoPor || null,
          ...updateFotoData,
          observacionesGenerales: observacionesGenerales || null,
          datosTecnicos: parsedDatosTecnicos,
          version: { increment: 1 },
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
          foto: isDeletePhoto ? null : (finalFoto || null),
          observacionesGenerales: observacionesGenerales || null,
          datosTecnicos: parsedDatosTecnicos,
          version: 1,
          proyecto: {
            connect: { id: proyectoId }
          },
          ...(empresaExiste ? { empresa: { connect: { id: empresaId } } } : {})
        }
      });
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
 * Elimina un elemento unifilar (y su tablero/circuitos si es de tipo TABLERO) de forma atómica.
 */
export const eliminarElementoUnifilar = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.$transaction(async (tx) => {
      // Verificar si existe
      const elemento = await tx.elementoUnifilar.findUnique({
        where: { id }
      });

      if (!elemento) {
        throw new Error('NOT_FOUND');
      }

      // Si es tablero, eliminarlo de la tabla de tableros (se eliminan sus circuitos en cascada)
      if (elemento.tipoElemento === 'TABLERO') {
        const tableroExiste = await tx.tablero.findUnique({ where: { id } });
        if (tableroExiste) {
          await tx.tablero.delete({ where: { id } });
        }
      }

      // Eliminar el elemento unifilar
      await tx.elementoUnifilar.delete({
        where: { id }
      });
    });

    return res.status(200).json({ ok: true, message: 'Elemento unifilar eliminado con éxito.' });
  } catch (error) {
    if (error.message === 'NOT_FOUND') {
      return res.status(404).json({ ok: false, error: 'Elemento unifilar no encontrado.' });
    }
    console.error('Error en eliminarElementoUnifilar:', error);
    next(error);
  }
};

