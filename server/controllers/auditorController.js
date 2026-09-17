import prisma from '../db.js';
import {
  ejecutarAuditoriaCompleta,
  detectarHuerfanos,
  detectarSinCarga,
  detectarSinAprobar,
  detectarCreadosVsPendientes,
  calcularMetricas30Dias,
  calcularSaludRed
} from '../services/auditService.js';

/**
 * Validador interno de acceso a proyecto con aislamiento multitenant.
 */
async function validarAccesoProyecto(proyectoId, user) {
  if (!proyectoId) {
    return { errorStatus: 400, errorMessage: 'El ID de proyecto es requerido.' };
  }

  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId }
  });

  if (!proyecto) {
    return { errorStatus: 404, errorMessage: 'Proyecto no encontrado.' };
  }

  if (user && user.role === 'CLIENT' && user.companyId !== proyecto.empresaId) {
    return { errorStatus: 403, errorMessage: 'Acceso denegado: no tiene permisos para auditar este proyecto.' };
  }

  return { proyecto };
}

/**
 * GET /api/auditoria/:proyectoId
 * Retorna el informe integral de auditoría y salud de red.
 */
export const getAuditoriaCompleta = async (req, res, next) => {
  try {
    const { proyectoId } = req.params;
    const check = await validarAccesoProyecto(proyectoId, req.user);
    if (check.errorStatus) {
      return res.status(check.errorStatus).json({ ok: false, error: check.errorMessage });
    }

    const resultado = await ejecutarAuditoriaCompleta(proyectoId);
    return res.status(200).json({ ok: true, data: resultado });
  } catch (error) {
    console.error('Error en getAuditoriaCompleta:', error);
    next(error);
  }
};

/**
 * GET /api/auditoria/:proyectoId/huerfanos
 * Retorna elementos sin alimentador ni origen definido.
 */
export const getHuerfanos = async (req, res, next) => {
  try {
    const { proyectoId } = req.params;
    const check = await validarAccesoProyecto(proyectoId, req.user);
    if (check.errorStatus) {
      return res.status(check.errorStatus).json({ ok: false, error: check.errorMessage });
    }

    const items = await detectarHuerfanos(proyectoId);
    return res.status(200).json({ ok: true, data: items, total: items.length });
  } catch (error) {
    console.error('Error en getHuerfanos:', error);
    next(error);
  }
};

/**
 * GET /api/auditoria/:proyectoId/sin-carga
 * Retorna elementos con parámetros de carga o amperaje en cero.
 */
export const getSinCarga = async (req, res, next) => {
  try {
    const { proyectoId } = req.params;
    const check = await validarAccesoProyecto(proyectoId, req.user);
    if (check.errorStatus) {
      return res.status(check.errorStatus).json({ ok: false, error: check.errorMessage });
    }

    const items = await detectarSinCarga(proyectoId);
    return res.status(200).json({ ok: true, data: items, total: items.length });
  } catch (error) {
    console.error('Error en getSinCarga:', error);
    next(error);
  }
};

/**
 * GET /api/auditoria/:proyectoId/sin-aprobar
 * Retorna elementos pendientes de validación o provisionales.
 */
export const getSinAprobar = async (req, res, next) => {
  try {
    const { proyectoId } = req.params;
    const check = await validarAccesoProyecto(proyectoId, req.user);
    if (check.errorStatus) {
      return res.status(check.errorStatus).json({ ok: false, error: check.errorMessage });
    }

    const items = await detectarSinAprobar(proyectoId);
    return res.status(200).json({ ok: true, data: items, total: items.length });
  } catch (error) {
    console.error('Error en getSinAprobar:', error);
    next(error);
  }
};

/**
 * GET /api/auditoria/:proyectoId/estadisticas
 * Retorna estadísticas de creación, distribución de estados y salud de red.
 */
export const getEstadisticas = async (req, res, next) => {
  try {
    const { proyectoId } = req.params;
    const check = await validarAccesoProyecto(proyectoId, req.user);
    if (check.errorStatus) {
      return res.status(check.errorStatus).json({ ok: false, error: check.errorMessage });
    }

    const [estadisticas, metricas30Dias, salud] = await Promise.all([
      detectarCreadosVsPendientes(proyectoId),
      calcularMetricas30Dias(proyectoId),
      calcularSaludRed(proyectoId)
    ]);

    return res.status(200).json({
      ok: true,
      data: {
        proyectoId,
        estadisticas,
        metricas30Dias,
        salud
      }
    });
  } catch (error) {
    console.error('Error en getEstadisticas:', error);
    next(error);
  }
};
