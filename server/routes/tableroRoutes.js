import { Router } from 'express';

// Middlewares
import { verificarToken, requireRoles } from '../middleware/authMiddleware.js';
import { uploadFotoInspeccion } from '../middleware/uploadMiddleware.js';

// Controladores
import { loginUsuario, obtenerUsuarios, crearUsuario, actualizarUsuario, eliminarUsuario } from '../controllers/userController.js';
import { obtenerEmpresas, obtenerEmpresaPorId, actualizarEmpresa, crearEmpresa } from '../controllers/empresaController.js';
import { obtenerProyectos, obtenerProyectosPorEmpresa, crearProyecto, obtenerProyectoCompleto, actualizarProyecto, eliminarProyecto } from '../controllers/proyectoController.js';
import { obtenerAlimentadores, crearAlimentador, actualizarAlimentador, eliminarAlimentador } from '../controllers/alimentadorController.js';
import { crearTableroCompleto, obtenerTablerosPorEmpresa, obtenerTableroPorId, actualizarTablero, eliminarTablero, crearCircuito, actualizarCircuito, eliminarCircuito } from '../controllers/tableroController.js';
import { crearInspeccionSubestacion, eliminarInspeccionSubestacion } from '../controllers/subestacionController.js';
import { crearPuntoMedicion, eliminarPuntoMedicion } from '../controllers/puntoMedicionController.js';
import { crearCcm, eliminarCcm } from '../controllers/ccmController.js';
import { crearElementoUnifilar, eliminarElementoUnifilar } from '../controllers/elementoController.js';
import { exportDatabase, importDatabase, syncToGoogleDrive } from '../controllers/backupController.js';
import { obtenerMensajesUsuario, guardarMensaje, marcarMensajesComoLeidos } from '../controllers/messageController.js';
import { vincularElemento, desvincularElemento, crearProvisional, obtenerArbolProyecto } from '../controllers/jerarquiaController.js';
import { procesarSincronizacionBatch } from '../controllers/syncController.js';

const router = Router();

// Endpoint de Autenticación (PÚBLICO)
router.post('/login', loginUsuario);

// A partir de aquí todas las rutas requieren autenticación JWT
router.use(verificarToken);

// Rutas de Empresas (Lectura: Todos los autenticados; Escritura: ADMIN y WORKER)
router.get('/empresas', obtenerEmpresas);
router.get('/empresas/:id', obtenerEmpresaPorId);
router.post('/empresas', requireRoles('ADMIN', 'WORKER'), crearEmpresa);
router.put('/empresas/:id', requireRoles('ADMIN', 'WORKER'), actualizarEmpresa);

// Rutas de Proyectos
router.get('/proyectos', obtenerProyectos);
router.get('/proyectos/:proyectoId', obtenerProyectoCompleto);
router.get('/empresas/:empresaId/proyectos', obtenerProyectosPorEmpresa);
router.post('/proyectos', requireRoles('ADMIN', 'WORKER'), crearProyecto);
router.put('/proyectos/:id', requireRoles('ADMIN', 'WORKER'), actualizarProyecto);
router.delete('/proyectos/:id', requireRoles('ADMIN'), eliminarProyecto);

// Rutas de Alimentadores
router.get('/alimentadores', obtenerAlimentadores);
router.post('/alimentadores', requireRoles('ADMIN', 'WORKER'), crearAlimentador);
router.put('/alimentadores/:id', requireRoles('ADMIN', 'WORKER'), actualizarAlimentador);
router.delete('/alimentadores/:id', requireRoles('ADMIN'), eliminarAlimentador);

// Rutas de Tableros
router.get('/tableros/:id', obtenerTableroPorId);
router.get('/empresas/:empresaId/tableros', obtenerTablerosPorEmpresa);
router.post('/tableros', requireRoles('ADMIN', 'WORKER'), crearTableroCompleto);
router.post('/empresas/:empresaId/tableros', requireRoles('ADMIN', 'WORKER'), crearTableroCompleto);
router.put('/tableros/:id', requireRoles('ADMIN', 'WORKER'), actualizarTablero);
router.delete('/tableros/:id', requireRoles('ADMIN'), eliminarTablero);

// Rutas de Circuitos
router.post('/tableros/:tableroId/circuitos', requireRoles('ADMIN', 'WORKER'), crearCircuito);
router.put('/circuitos/:id', requireRoles('ADMIN', 'WORKER'), actualizarCircuito);
router.delete('/circuitos/:id', requireRoles('ADMIN', 'WORKER'), eliminarCircuito);

// Rutas de Elementos Genéricos, Subestaciones, Puntos de Medición y CCM
router.post('/elementos-unifilares', requireRoles('ADMIN', 'WORKER'), uploadFotoInspeccion.single('foto'), crearElementoUnifilar);
router.delete('/elementos-unifilares/:id', requireRoles('ADMIN'), eliminarElementoUnifilar);
router.post('/subestaciones', requireRoles('ADMIN', 'WORKER'), crearInspeccionSubestacion);
router.delete('/subestaciones/:id', requireRoles('ADMIN'), eliminarInspeccionSubestacion);
router.post('/puntos-medicion', requireRoles('ADMIN', 'WORKER'), crearPuntoMedicion);
router.delete('/puntos-medicion/:id', requireRoles('ADMIN'), eliminarPuntoMedicion);
router.post('/ccm', requireRoles('ADMIN', 'WORKER'), crearCcm);
router.delete('/ccm/:id', requireRoles('ADMIN'), eliminarCcm);

// Endpoint de Sincronización Offline Batch
router.post('/sync/batch', requireRoles('ADMIN', 'WORKER'), procesarSincronizacionBatch);

// Endpoints de Respaldo e Importación/Exportación (Solo ADMIN)
router.get('/backup/export', requireRoles('ADMIN'), exportDatabase);
router.post('/backup/import', requireRoles('ADMIN'), importDatabase);
router.post('/backup/gdrive-sync', requireRoles('ADMIN'), syncToGoogleDrive);

// Rutas de Gestión de Usuarios (Solo ADMIN)
router.get('/users', requireRoles('ADMIN'), obtenerUsuarios);
router.post('/users', requireRoles('ADMIN'), crearUsuario);
router.put('/users/:id', requireRoles('ADMIN'), actualizarUsuario);
router.delete('/users/:id', requireRoles('ADMIN'), eliminarUsuario);

// Rutas de Mensajería / Chat (Autenticado)
router.get('/messages/:userId', obtenerMensajesUsuario);
router.post('/messages', guardarMensaje);
router.post('/messages/read', marcarMensajesComoLeidos);

// Rutas de Jerarquía Eléctrica
router.post('/jerarquia/vincular', requireRoles('ADMIN', 'WORKER'), vincularElemento);
router.post('/jerarquia/desvincular', requireRoles('ADMIN', 'WORKER'), desvincularElemento);
router.post('/jerarquia/crear-provisional', requireRoles('ADMIN', 'WORKER'), crearProvisional);
router.get('/jerarquia/arbol/:proyectoId', obtenerArbolProyecto);

export default router;
