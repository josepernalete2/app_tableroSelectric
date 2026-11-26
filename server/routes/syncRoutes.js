import express from 'express';
import { verificarToken, requireRoles } from '../middleware/authMiddleware.js';
import {
  pullData,
  procesarSincronizacionBatch,
  generarBackupLocal,
  sincronizarElementoMultipart,
  subirImagenR2Controller,
  obtenerImagenR2Controller,
  eliminarImagenR2Controller,
  diagnosticarR2Controller
} from '../controllers/syncController.js';
import { uploadFotoInspeccion, uploadImagenR2 } from '../middleware/uploadMiddleware.js';

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

// ENDPOINTS DE IMÁGENES EN CLOUDFLARE R2 (Subida autenticada + Lectura cacheada)
router.post(
  '/upload-image',
  verificarToken,
  requireRoles('ADMIN', 'INSPECTOR', 'WORKER'),
  uploadImagenR2.fields([{ name: 'foto', maxCount: 1 }, { name: 'image', maxCount: 1 }]),
  subirImagenR2Controller
);
router.get('/image', obtenerImagenR2Controller);
router.get('/image/*key', obtenerImagenR2Controller);
router.delete('/image', verificarToken, requireRoles('ADMIN', 'INSPECTOR', 'WORKER'), eliminarImagenR2Controller);
router.get('/r2-diagnostic', verificarToken, requireRoles('ADMIN'), diagnosticarR2Controller);

// ENDPOINT LOCAL BACKUP: Generar backup JSON para descarga local
router.post('/backup/local', verificarToken, requireRoles('ADMIN', 'INSPECTOR', 'WORKER'), generarBackupLocal);

export default router;