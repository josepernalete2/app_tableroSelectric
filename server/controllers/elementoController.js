import prisma from '../db.js';

/**
 * POST /api/elementos-unifilares
 * Registra un ElementoUnifilar en PostgreSQL, soportando carga binaria de fotos a través de Multer.
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

    if (!nombre || !proyectoId || !tipoElemento) {
      return res.status(400).json({
        ok: false,
        error: 'Los campos nombre, proyectoId y tipoElemento son obligatorios.'
      });
    }

    // Procesar datosTecnicos
    let parsedDatosTecnicos = {};
    if (datosTecnicos) {
      if (typeof datosTecnicos === 'string') {
        try {
          parsedDatosTecnicos = JSON.parse(datosTecnicos);
        } catch (e) {
          console.error('Error al parsear datosTecnicos JSON:', e);
          parsedDatosTecnicos = {};
        }
      } else {
        parsedDatosTecnicos = datosTecnicos;
      }
    }

    // Foto final (URL)
    let finalFoto = fotoUrl || null;
    if (req.file) {
      // Si se cargó un archivo binario mediante Multer, guardamos su ruta relativa pública
      finalFoto = `/uploads/${req.file.filename}`;
    }

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
        ...(empresaId ? { empresa: { connect: { id: empresaId } } } : {})
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
