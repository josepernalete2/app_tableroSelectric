import prisma from '../db.js';
import { calcularCorrientesTrafo, normalizarTipoConexion } from '../utils/calculoTransformador.js';

/**
 * Validador y sanitizador de fotos en el servidor para evitar que Prisma falle
 * ante cadenas Base64 incompletas, truncadas (ej. 'base64,/') o sobredimensionadas.
 */
export function sanitizeFotoServer(foto) {
  if (!foto || typeof foto !== 'string') return null;
  const trimmed = foto.trim();
  if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') return null;

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/uploads/') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  if (trimmed.startsWith('data:image/')) {
    const commaIndex = trimmed.indexOf(',');
    if (commaIndex === -1) {
      console.warn('[SERVER ELEMENTO] ⚠️ DataURL sin separador coma. Descartando.');
      return null;
    }
    const base64Data = trimmed.substring(commaIndex + 1).trim();
    if (base64Data.length < 50 || base64Data === '/' || base64Data.endsWith(',/') || (base64Data.startsWith('/') && base64Data.length < 100)) {
      console.warn('[SERVER ELEMENTO] ⚠️ Foto base64 incompleta o truncada recibida. Omitiendo foto para evitar error de Prisma.');
      return null;
    }
    if (base64Data.length > 14 * 1024 * 1024) {
      console.warn('[SERVER ELEMENTO] ⚠️ Foto base64 excede límite permitido (14MB). Descartando.');
      return null;
    }
    return trimmed;
  }

  return null;
}

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

    // 1. Auto-Healing de campos obligatorios para tolerar estructuras antiguas
    const cleanNombre = String(nombre || req.body.codigo || req.body.tag || 'Elemento Unifilar').trim() || 'Elemento Unifilar';
    const validTipos = ['TABLERO', 'PUNTO_SUMINISTRO', 'SUBESTACION', 'TRANSFORMADOR', 'GENERADOR', 'PUESTA_TIERRA', 'TRANSFER', 'PUNTO_MEDICION', 'CCM', 'BANCO_CONDENSADOR', 'AMBIENTAL_FISICA', 'TERMOGRAFICA', 'SISTEMA_ATERRAMIENTO', 'TANQUE_COMBUSTIBLE', 'OTRO'];
    const cleanTipoElemento = validTipos.includes(tipoElemento) ? tipoElemento : 'TABLERO';

    let targetProyectoId = proyectoId;
    if (!targetProyectoId) {
      const firstProj = await prisma.proyecto.findFirst();
      if (firstProj) {
        targetProyectoId = firstProj.id;
      }
    }

    let proyectoExiste = targetProyectoId ? await prisma.proyecto.findUnique({
      where: { id: targetProyectoId }
    }) : null;

    if (!proyectoExiste) {
      console.log(`[AF AUTO-PARENT] El proyecto con ID '${targetProyectoId || 'offline'}' no existe en el servidor. Creando automáticamente para sincronización offline...`);
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
      targetProyectoId = targetProyectoId || `proj-${Date.now()}`;
      proyectoExiste = await prisma.proyecto.create({
        data: {
          id: targetProyectoId,
          nombre: 'Proyecto Principal Offline',
          direccion: 'Sede de Operaciones',
          empresaId: targetEmp.id
        }
      });
      console.log(`[AF AUTO-PARENT] ✅ Proyecto padre creado exitosamente: ${targetProyectoId}`);
    }

    // 3. Comprobación previa de la existencia de la Empresa
    let empresaExiste = null;
    const finalEmpresaId = empresaId || proyectoExiste.empresaId;
    if (finalEmpresaId) {
      empresaExiste = await prisma.empresa.findUnique({
        where: { id: finalEmpresaId }
      });
    }

    // Parsear y auto-curar datosTecnicos
    let parsedDatosTecnicos = {};
    if (datosTecnicos) {
      if (typeof datosTecnicos === 'string') {
        try {
          parsedDatosTecnicos = JSON.parse(datosTecnicos);
        } catch (e) {
          console.error('Error al deserializar datosTecnicos JSON:', e);
          parsedDatosTecnicos = {};
        }
      } else if (typeof datosTecnicos === 'object' && datosTecnicos !== null) {
        parsedDatosTecnicos = { ...datosTecnicos };
      }
    }
    if (codigo && !parsedDatosTecnicos.codigo) {
      parsedDatosTecnicos.codigo = codigo;
    }
    if (req.body.tag && !parsedDatosTecnicos.tag) {
      parsedDatosTecnicos.tag = req.body.tag;
    }
    if (req.body.tension && !parsedDatosTecnicos.tension) parsedDatosTecnicos.tension = req.body.tension;
    if (req.body.voltaje && !parsedDatosTecnicos.tension) parsedDatosTecnicos.tension = req.body.voltaje;
    if (req.body.voltajeAcometida && !parsedDatosTecnicos.tension) parsedDatosTecnicos.tension = req.body.voltajeAcometida;

    // Inyectar estándares COVENIN 159:1997 / CEN 200 si faltan
    if (!parsedDatosTecnicos.tension) parsedDatosTecnicos.tension = '208Y/120 V';
    if (!parsedDatosTecnicos.frecuencia) parsedDatosTecnicos.frecuencia = '60 Hz';
    if (parsedDatosTecnicos.fases === undefined) parsedDatosTecnicos.fases = 3;
    if (parsedDatosTecnicos.maxPoles === undefined) parsedDatosTecnicos.maxPoles = 42;
    if (!parsedDatosTecnicos.norma) parsedDatosTecnicos.norma = 'COVENIN 159:1997 / CEN 200';
    if (!Array.isArray(parsedDatosTecnicos.circuits)) {
      parsedDatosTecnicos.circuits = Array.isArray(parsedDatosTecnicos.circuitos) ? parsedDatosTecnicos.circuitos : [];
    }

    // Determinar la foto y sanitizar para evitar rechazo de Prisma
    let finalFoto = req.body.foto || fotoUrl || null;
    if (req.file && req.file.buffer) {
      finalFoto = `data:${req.file.mimetype || 'image/jpeg'};base64,${req.file.buffer.toString('base64')}`;
    } else if (req.file && req.file.filename) {
      finalFoto = `/uploads/${req.file.filename}`;
    } else if (typeof finalFoto === 'string') {
      finalFoto = sanitizeFotoServer(finalFoto);
    }

    // SI ES TABLERO, APLICAR VALIDACIONES TOLERANTES (Sin arrojar errores bloqueantes)
    if (cleanTipoElemento === 'TABLERO') {
      const maxPolos = parsedDatosTecnicos.maxPoles !== undefined ? parseInt(parsedDatosTecnicos.maxPoles, 10) : 42;
      const circuits = parsedDatosTecnicos.circuits || [];

      // Validar y ajustar reglas de polos sin interrumpir sincronización
      for (const circ of circuits) {
        const rawNumPolos = circ.numPolos !== undefined ? parseInt(circ.numPolos, 10) : (circ.poles ? circ.poles.length : 1);
        circ.numPolos = Math.min(Math.max(isNaN(rawNumPolos) ? 1 : rawNumPolos, 1), 3);
        const posicionPolo = circ.posicionPolo !== undefined ? parseInt(circ.posicionPolo, 10) : (circ.poles ? circ.poles[0] : 1);

        const requiredPoles = [];
        for (let i = 0; i < circ.numPolos; i++) {
          requiredPoles.push(posicionPolo + i * 2);
        }

        const highestPole = Math.max(...requiredPoles);
        if (highestPole > maxPolos) {
          console.warn(`[AF WARNING] Capacidad de polos excedida (${highestPole} > ${maxPolos}). Ajustando capacidad para acomodar inspección...`);
          parsedDatosTecnicos.maxPoles = highestPole;
        }
      }
    }

    // SI ES TRANSFORMADOR, APLICAR CÁLCULOS ELÉCTRICOS DE CORRIENTES Y NORMALIZAR ESQUEMA
    if (cleanTipoElemento === 'TRANSFORMADOR') {
      const canonConexion = normalizarTipoConexion(
        parsedDatosTecnicos.tipoConexion || parsedDatosTecnicos.conexionTrafo || parsedDatosTecnicos.conexion,
        parsedDatosTecnicos.conexion,
        parsedDatosTecnicos.fases
      );
      parsedDatosTecnicos.tipoConexion = canonConexion;
      parsedDatosTecnicos.conexion = canonConexion;

      const potKva = parsedDatosTecnicos.potenciaKva || parsedDatosTecnicos.kva || req.body.potenciaEstimada;
      const v1 = parsedDatosTecnicos.tensionPrimaria || parsedDatosTecnicos.voltajePrimario;
      const u1 = parsedDatosTecnicos.unidadTensionPrimaria || 'kV';
      const v2 = parsedDatosTecnicos.tensionSecundaria || parsedDatosTecnicos.voltajeSecundario;
      const uPot = parsedDatosTecnicos.unidadPotencia || 'kVA';

      const calculo = calcularCorrientesTrafo({
        potencia: potKva,
        unidadPotencia: uPot,
        tensionPrimaria: v1,
        unidadTensionPrimaria: u1,
        tensionSecundaria: v2,
        tipoConexion: canonConexion,
        fases: parsedDatosTecnicos.fases
      });

      parsedDatosTecnicos.fases = String(calculo.fases);
      parsedDatosTecnicos.corrientePrimariaCalculada = calculo.i1;
      parsedDatosTecnicos.corrienteSecundariaCalculada = calculo.i2;

      if (!parsedDatosTecnicos.amperiosPrimaria && calculo.i1 != null) {
        parsedDatosTecnicos.amperiosPrimaria = String(calculo.i1);
      }
      if (!parsedDatosTecnicos.amperiosSecundaria && calculo.i2 != null) {
        parsedDatosTecnicos.amperiosSecundaria = String(calculo.i2);
      }
      if (calculo.i2 != null) {
        parsedDatosTecnicos.corrienteNominalA = calculo.i2;
        parsedDatosTecnicos.corrienteNominalB = calculo.i2;
        parsedDatosTecnicos.corrienteNominalC = calculo.i2;
        parsedDatosTecnicos.corrienteSecundaria = calculo.i2;
      }
    }

    const finalElementId = id || req.body.localId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `elem-${Date.now()}`);

    // Inserción o actualización atómica defensiva en PostgreSQL
    const nuevoElemento = await prisma.$transaction(async (tx) => {
      // SI ES TABLERO, APLICAR UPSERT EN TABLA TABLERO
      if (cleanTipoElemento === 'TABLERO') {
        const tension = parsedDatosTecnicos.tension || '208Y/120 V';
        const fases = parsedDatosTecnicos.fases !== undefined ? parseInt(parsedDatosTecnicos.fases, 10) : 3;
        const alimentadorId = parsedDatosTecnicos.alimentadorId || null;

        await tx.tablero.upsert({
          where: { id: finalElementId },
          update: {
            nombre: cleanNombre,
            ubicacion: ubicacion || '',
            maxPolos: parsedDatosTecnicos.maxPoles !== undefined ? parseInt(parsedDatosTecnicos.maxPoles, 10) : 42,
            tension,
            fases,
            alimentadorId,
            proyectoId: targetProyectoId,
            empresaId: empresaId || null,
            version: { increment: 1 },
            circuitos: {
              deleteMany: {},
              create: (parsedDatosTecnicos.circuits || []).map(c => ({
                id: c.id && !c.id.startsWith('auto_') && !c.id.startsWith('split_') ? c.id : undefined,
                posicionPolo: c.posicionPolo !== undefined ? parseInt(c.posicionPolo, 10) : (c.poles ? c.poles[0] : 1),
                numPolos: Math.min(Math.max(c.numPolos !== undefined ? parseInt(c.numPolos, 10) : 1, 1), 3),
                amperaje: c.amperaje !== undefined ? (c.amperaje ? parseFloat(c.amperaje) : 0) : (c.breaker?.amp ? parseFloat(c.breaker.amp) : 0),
                descripcion: c.descripcion || c.equipo || 'Circuito de Distribución',
                estado: c.estado || 'ACTIVO',
                elementoDestinoId: c.elementoDestinoId || c.vinculadoId || null,
                tipoElementoDestino: c.tipoElementoDestino || c.tipoDestino || null,
                version: 1
              }))
            }
          },
          create: {
            id: finalElementId,
            nombre: cleanNombre,
            ubicacion: ubicacion || 'General',
            maxPolos: parsedDatosTecnicos.maxPoles !== undefined ? parseInt(parsedDatosTecnicos.maxPoles, 10) : 42,
            tension,
            fases,
            alimentadorId,
            proyectoId: targetProyectoId,
            empresaId: empresaId || null,
            version: 1,
            circuitos: {
              create: (parsedDatosTecnicos.circuits || []).map(c => ({
                id: c.id && !c.id.startsWith('auto_') && !c.id.startsWith('split_') ? c.id : undefined,
                posicionPolo: c.posicionPolo !== undefined ? parseInt(c.posicionPolo, 10) : (c.poles ? c.poles[0] : 1),
                numPolos: Math.min(Math.max(c.numPolos !== undefined ? parseInt(c.numPolos, 10) : 1, 1), 3),
                amperaje: c.amperaje !== undefined ? (c.amperaje ? parseFloat(c.amperaje) : 0) : (c.breaker?.amp ? parseFloat(c.breaker.amp) : 0),
                descripcion: c.descripcion || c.equipo || 'Circuito de Distribución',
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

      const safeBreakerAmp = req.body.breakerAmperaje !== undefined && req.body.breakerAmperaje !== null && req.body.breakerAmperaje !== ''
        ? (parseFloat(req.body.breakerAmperaje) || 0)
        : 0;
      const safePotencia = req.body.potenciaEstimada !== undefined && req.body.potenciaEstimada !== null
        ? String(req.body.potenciaEstimada)
        : '';

      return await tx.elementoUnifilar.upsert({
        where: { id: finalElementId },
        update: {
          nombre: cleanNombre,
          tipoElemento: cleanTipoElemento,
          ubicacion: ubicacion || '',
          alimentadoPor: alimentadoPor || '',
          ...updateFotoData,
          observacionesGenerales: observacionesGenerales || '',
          datosTecnicos: parsedDatosTecnicos,
          circuitoOrigen: req.body.circuitoOrigen || '',
          calibreConductor: req.body.calibreConductor || '',
          breakerAmperaje: safeBreakerAmp,
          breakerMarca: req.body.breakerMarca || '',
          breakerTipo: req.body.breakerTipo || '',
          potenciaEstimada: safePotencia,
          estadoVinculo: ['ACTIVO', 'RESERVA', 'PENDIENTE_CREAR'].includes(req.body.estadoVinculo) ? req.body.estadoVinculo : 'ACTIVO',
          version: { increment: 1 },
          proyecto: {
            connect: { id: targetProyectoId }
          },
          ...(empresaExiste ? { empresa: { connect: { id: empresaId } } } : {})
        },
        create: {
          id: finalElementId,
          nombre: cleanNombre,
          tipoElemento: cleanTipoElemento,
          ubicacion: ubicacion || '',
          alimentadoPor: alimentadoPor || '',
          foto: isDeletePhoto ? null : (finalFoto || null),
          observacionesGenerales: observacionesGenerales || '',
          datosTecnicos: parsedDatosTecnicos,
          circuitoOrigen: req.body.circuitoOrigen || '',
          calibreConductor: req.body.calibreConductor || '',
          breakerAmperaje: safeBreakerAmp,
          breakerMarca: req.body.breakerMarca || '',
          breakerTipo: req.body.breakerTipo || '',
          potenciaEstimada: safePotencia,
          estadoVinculo: ['ACTIVO', 'RESERVA', 'PENDIENTE_CREAR'].includes(req.body.estadoVinculo) ? req.body.estadoVinculo : 'ACTIVO',
          version: 1,
          proyecto: {
            connect: { id: targetProyectoId }
          },
          ...(empresaExiste ? { empresa: { connect: { id: empresaId } } } : {})
        }
      });
    });

    return res.status(200).json({
      ok: true,
      message: 'Elemento unifilar registrado/actualizado exitosamente en el servidor (Auto-Healed).',
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

