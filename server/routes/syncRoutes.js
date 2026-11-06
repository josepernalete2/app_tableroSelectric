import express from 'express';
import { verificarToken, requireRoles } from '../middleware/authMiddleware.js';
import { pullData, procesarSincronizacionBatch, generarBackupLocal, sincronizarElementoMultipart } from '../controllers/syncController.js';
import { uploadFotoInspeccion } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// ENDPOINT PULL: Descargar datos iniciales después de login
// Accesible para todos los roles activos autenticados (ADMIN, INSPECTOR, WORKER, CLIENT)
router.get('/pull', verificarToken, requireRoles('ADMIN', 'INSPECTOR', 'WORKER', 'CLIENT'), pullData);

// ENDPOINT PUSH: Recibir batch de creaciones/actualizaciones de la tablet
// Procesa operaciones en lote usando transacción Prisma
router.post('/', verificarToken, requireRoles('ADMIN', 'INSPECTOR', 'WORKER'), procesarSincronizacionBatch);
router.post('/push', verificarToken, requireRoles('ADMIN', 'INSPECTOR', 'WORKER'), procesarSincronizacionBatch);
router.post('/batch', verificarToken, requireRoles('ADMIN', 'INSPECTOR', 'WORKER'), procesarSincronizacionBatch);

// ENDPOINT MULTIPART / BINARIOS: Sincronización individual de elementos con fotos (Zero-Disk)
router.post('/upload', verificarToken, requireRoles('ADMIN', 'INSPECTOR', 'WORKER'), uploadFotoInspeccion.single('foto'), sincronizarElementoMultipart);
router.post('/elemento-multipart', verificarToken, requireRoles('ADMIN', 'INSPECTOR', 'WORKER'), uploadFotoInspeccion.single('foto'), sincronizarElementoMultipart);

// ENDPOINT LOCAL BACKUP: Generar backup JSON para descarga local
router.post('/backup/local', verificarToken, requireRoles('ADMIN', 'INSPECTOR', 'WORKER'), generarBackupLocal);

export default router;