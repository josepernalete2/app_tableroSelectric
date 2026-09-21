import express from 'express';
import { verificarToken } from '../middleware/authMiddleware.js';
import { procesarSincronizacionBatch } from '../controllers/syncController.js';
import prisma from '../db.js';

const router = express.Router();

// ENDPOINT PULL: Descargar datos iniciales después de login
// Devuelve las entidades relevantes para la empresa/proyecto del usuario
// y filtra por lastSyncTimestamp si se proporciona
router.get('/pull', verificarToken, async (req, res) => {
  try {
    const user = req.user;
    const { empresaId } = user;
    const { lastSyncTimestamp } = req.query;

    // Construir condiciones de filtro por empresa (multitenancy)
    const where = {};

    if (user.role === 'CLIENT' && empresaId) {
      where.empresaId = empresaId;
    }
    // ADMIN puede ver todas las empresas o tendrá su propio filtro

    // Si hay un timestamp de última sincronización, solo traer cambios desde esa fecha
    if (lastSyncTimestamp) {
      const ts = new Date(lastSyncTimestamp);
      // Aplicar filtro de updatedAt en todas las entidades relacionadas
      // Usaremos where con updatedAt_gte para Prisma
      where.updatedAt = { gte: ts };
    }

    // Traer empresas con sus proyectos y relaciones completas
    const companies = await prisma.empresa.findMany({
      where,
      include: {
        proyectos: {
          include: {
            tableros: {
              include: {
                circuitos: true
              }
            },
            elementosUnifilares: {
              include: {
                inspeccionesSubestacion: true,
                puntosMedicion: true,
                ccmList: true
              }
            },
            inspeccionesSubestacion: true,
            puntosMedicion: true,
            ccmList: true,
            alimentadores: true
          }
        }
      }
    });

    // Formato de respuesta optimizado para el cliente
    const formattedCompanies = companies.map(company => ({
      ...company,
      proyectos: company.proyectos.map(proyecto => ({
        ...proyecto,
        tableros: proyecto.tableros.map(tablero => ({
          ...tablero,
          circuitos: tablero.circuitos || []
        })),
        elementosUnifilares: proyecto.elementosUnifilares.map(elem => ({
          ...elem,
          foto: elem.foto ? elem.foto.toString('base64') : null,
          fotoBlob: elem.fotoBlob
        })),
        inspeccionesSubestacion: proyecto.inspeccionesSubestacion.map(sub => ({
          ...sub,
          foto: sub.foto ? sub.foto.toString('base64') : null
        })),
        puntosMedicion: proyecto.puntosMedicion.map(pm => ({
          ...pm,
          foto: pm.foto ? pm.foto.toString('base64') : null
        })),
        ccmList: proyecto.ccmList.map(ccm => ({
          ...ccm,
          foto: ccm.foto ? ccm.foto.toString('base64') : null
        })),
        alimentadores: proyecto.alimentadores || []
      }))
    }));

    return res.status(200).json({
      ok: true,
      data: formattedCompanies,
      lastSyncTimestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error en pull sync:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ENDPOINT PUSH: Recibir batch de creaciones/actualizaciones de la tablet
// Procesa operaciones en lote usando transacción Prisma
router.post('/', verificarToken, procesarSincronizacionBatch);

export default router;