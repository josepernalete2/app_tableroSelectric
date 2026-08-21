import prisma from '../db.js';

/**
 * POST /api/ccm
 * Registra o actualiza un Centro de Control de Motores (CCM) en PostgreSQL.
 */
export const crearCcm = async (req, res, next) => {
  try {
    const {
      id,
      nombre,
      plantaInstalacion,
      areaProceso,
      fabricanteMarca,
      modeloSerie,
      gradoNemaIp,
      fecha,
      inspector,
      supervisor,
      anoFabricacionInstalacion,

      parametrosElectricos,
      gavetasBucketLog,
      inspeccionFisica,
      seguridadTermografia,
      hallazgosCriticos,

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
      plantaInstalacion: plantaInstalacion || '',
      areaProceso: areaProceso || '',
      fabricanteMarca: fabricanteMarca || '',
      modeloSerie: modeloSerie || '',
      gradoNemaIp: gradoNemaIp || '',
      fecha: fecha || '',
      inspector: inspector || '',
      supervisor: supervisor || '',
      anoFabricacionInstalacion: anoFabricacionInstalacion || '',
      parametrosElectricos: parametrosElectricos || {},
      gavetasBucketLog: gavetasBucketLog || [],
      inspeccionFisica: inspeccionFisica || {},
      seguridadTermografia: seguridadTermografia || {},
      hallazgosCriticos: hallazgosCriticos || [],
      firmaInspector: firmaInspector || null,
      firmaSupervisor: firmaSupervisor || null,
      proyecto: { connect: { id: proyectoId } },
      ...(empresaExiste ? { empresa: { connect: { id: empresaId } } } : {})
    };

    const nuevoCcm = await prisma.ccm.upsert({
      where: { id: id || '' },
      update: payloadData,
      create: {
        ...(id ? { id } : {}),
        ...payloadData
      }
    });

    return res.status(201).json({
      ok: true,
      message: 'Centro de Control de Motores (CCM) registrado/actualizado con éxito.',
      data: nuevoCcm
    });
  } catch (error) {
    console.error('Error en crearCcm:', error);
    next(error);
  }
};

/**
 * DELETE /api/ccm/:id
 */
export const eliminarCcm = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existe = await prisma.ccm.findUnique({ where: { id } });
    if (!existe) {
      return res.status(404).json({ ok: false, error: 'CCM no encontrado.' });
    }

    await prisma.ccm.delete({ where: { id } });
    return res.status(200).json({ ok: true, message: 'CCM eliminado con éxito.' });
  } catch (error) {
    console.error('Error en eliminarCcm:', error);
    next(error);
  }
};
