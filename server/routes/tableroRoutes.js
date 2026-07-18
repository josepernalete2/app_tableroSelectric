import { Router } from 'express';
import { crearTableroCompleto, obtenerTablerosPorEmpresa } from '../controllers/tableroController.js';
import { crearInspeccionSubestacion } from '../controllers/subestacionController.js';
import { exportDatabase, importDatabase, syncToGoogleDrive } from '../controllers/backupController.js';
import { obtenerProyectosPorEmpresa, crearProyecto, obtenerProyectoCompleto } from '../controllers/proyectoController.js';

const router = Router();

// Endpoints para registrar elementos (cola de sincronización universal)
router.post('/proyectos', crearProyecto);
router.post('/tableros', crearTableroCompleto);
router.post('/subestaciones', crearInspeccionSubestacion);

// Rutas de Proyectos
router.get('/empresas/:empresaId/proyectos', obtenerProyectosPorEmpresa);
router.get('/proyectos/:proyectoId', obtenerProyectoCompleto);

// Rutas originales con compatibilidad
router.post('/empresas/:empresaId/tableros', crearTableroCompleto);

// Endpoint para listar todos los tableros de una empresa específica
router.get('/empresas/:empresaId/tableros', obtenerTablerosPorEmpresa);

// Endpoints de Respaldo e Importación/Exportación
router.get('/backup/export', exportDatabase);
router.post('/backup/import', importDatabase);
router.post('/backup/gdrive-sync', syncToGoogleDrive);

export default router;
