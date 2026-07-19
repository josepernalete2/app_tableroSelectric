import prisma from '../db.js';

/**
 * POST /api/elementos-unifilares
 * Registra un ElementoUnifilar en PostgreSQL con comprobación previa de existencia
 * de Proyecto y Empresa para evitar errores de restricción de clave foránea (Prisma P2025).
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

    // 2. Comprobación previa de la existencia del Proyecto en PostgreSQL (evita error P2025)
    const proyectoExiste = await prisma.proyecto.findUnique({
      where: { id: proyectoId }
    });

    if (!proyectoExiste) {
      console.warn(`[AF WARNING] El proyecto con ID '${proyectoId}' no existe en el servidor todavía.`);
      return res.status(422).json({
        error: 'Falta dependencia',
        detalle: 'El proyecto asociado no existe en el servidor todavía'
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

    // 4. Inserción relacional segura en PostgreSQL usando connect en camelCase
    const nuevoElemento = await prisma.elementoUnifilar.create({
      data: {
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
      message: 'Elemento unifilar registrado exitosamente en el servidor.',
      data: nuevoElemento
    });

  } catch (error) {
    console.error('Error en crearElementoUnifilar:', error);
    next(error);
  }
};
