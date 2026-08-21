import prisma from '../db.js';

/**
 * POST /api/puntos-medicion
 * Registra o actualiza un Punto de Medición y Suministro en PostgreSQL.
 */
export const crearPuntoMedicion = async (req, res, next) => {
  try {
    const {
      id,
      nombre,
      fecha,
      hora,
      inspector,

      // 1. Datos Generales
      nombreUsuario,
      numeroContrato,
      empresaDistribuidora,
      nivelTensionContrato,
      tensionNominal,
      potenciaContratada,
      tarifaAplicable,
      codigoElementoPrincipal,

      // 2. Punto de Acometida
      tipoAcometida,
      puntoConexionPCC,
      conductorAcometida,
      longitudAcometida,
      elementoManiobra,
      capacidadInterrupcion,

      // 3. Sistema de Transformación
      ubicacionTransformador,
      propiedadTransformador,
      usoTransformador,

      // 4. Medición
      ubicacionMedidor,
      tipoMedicion,
      marcaModeloMedidor,
      numeroSerieAno,

      // 5. Observaciones y Firmas
      observaciones,
      firmaInspector,
      firmaSupervisor,

      empresaId,
      proyectoId
    } = req.body;

    if (!nombre || !proyectoId) {
      return res.status(400).json({
        ok: false,
        error: 'Los campos nombre y proyectoId son requeridos.'
      });
    }

    let proyectoExiste = await prisma.proyecto.findUnique({
      where: { id: proyectoId }
    });

    if (!proyectoExiste) {
      return res.status(422).json({
        ok: false,
        error: 'Dependencia inexistente',
        detalle: 'El proyecto padre debe existir previamente en el servidor'
      });
    }

    let empresaExiste = null;
    if (empresaId) {
      empresaExiste = await prisma.empresa.findUnique({
        where: { id: empresaId }
      });
    }

    const payloadData = {
      nombre,
      fecha: fecha || '',
      hora: hora || '',
      inspector: inspector || '',
      nombreUsuario: nombreUsuario || '',
      numeroContrato: numeroContrato || '',
      empresaDistribuidora: empresaDistribuidora || '',
      nivelTensionContrato: nivelTensionContrato || '',
      tensionNominal: tensionNominal || '',
      potenciaContratada: potenciaContratada || '',
      tarifaAplicable: tarifaAplicable || '',
      codigoElementoPrincipal: codigoElementoPrincipal || '',
      tipoAcometida: tipoAcometida || '',
      puntoConexionPCC: puntoConexionPCC || '',
      conductorAcometida: conductorAcometida || '',
      longitudAcometida: longitudAcometida || '',
      elementoManiobra: elementoManiobra || '',
      capacidadInterrupcion: capacidadInterrupcion || '',
      ubicacionTransformador: ubicacionTransformador || '',
      propiedadTransformador: propiedadTransformador || '',
      usoTransformador: usoTransformador || '',
      ubicacionMedidor: ubicacionMedidor || '',
      tipoMedicion: tipoMedicion || '',
      marcaModeloMedidor: marcaModeloMedidor || '',
      numeroSerieAno: numeroSerieAno || '',
      observaciones: observaciones || '',
      firmaInspector: firmaInspector || null,
      firmaSupervisor: firmaSupervisor || null,
      proyecto: { connect: { id: proyectoId } },
      ...(empresaExiste ? { empresa: { connect: { id: empresaId } } } : {})
    };

    const nuevoPunto = await prisma.puntoMedicion.upsert({
      where: { id: id || '' },
      update: payloadData,
      create: {
        ...(id ? { id } : {}),
        ...payloadData
      }
    });

    return res.status(201).json({
      ok: true,
      message: 'Punto de medición registrado/actualizado con éxito en el servidor.',
      data: nuevoPunto
    });
  } catch (error) {
    console.error('Error en crearPuntoMedicion:', error);
    next(error);
  }
};

/**
 * DELETE /api/puntos-medicion/:id
 */
export const eliminarPuntoMedicion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existe = await prisma.puntoMedicion.findUnique({ where: { id } });
    if (!existe) {
      return res.status(404).json({ ok: false, error: 'Punto de medición no encontrado.' });
    }

    await prisma.puntoMedicion.delete({ where: { id } });
    return res.status(200).json({ ok: true, message: 'Punto de medición eliminado con éxito.' });
  } catch (error) {
    console.error('Error en eliminarPuntoMedicion:', error);
    next(error);
  }
};
