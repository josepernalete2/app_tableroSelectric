import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Middlewares
import { verificarToken } from '../middleware/authMiddleware.js';

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

// Asegurar directorio public/uploads
const uploadDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuración de Multer para carga de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage });

const router = Router();

// Endpoint de Autenticación (PÚBLICO)
router.post('/login', loginUsuario);

// A partir de aquí todas las rutas requieren autenticación JWT
router.use(verificarToken);

// Rutas de Empresas
router.get('/empresas', obtenerEmpresas);
router.post('/empresas', crearEmpresa);
router.get('/empresas/:id', obtenerEmpresaPorId);
router.put('/empresas/:id', actualizarEmpresa);

// Rutas de Proyectos
router.get('/proyectos', obtenerProyectos);
router.post('/proyectos', crearProyecto);
router.get('/proyectos/:proyectoId', obtenerProyectoCompleto);
router.put('/proyectos/:id', actualizarProyecto);
router.delete('/proyectos/:id', eliminarProyecto);
router.get('/empresas/:empresaId/proyectos', obtenerProyectosPorEmpresa);

// Rutas de Alimentadores (NUEVAS)
router.get('/alimentadores', obtenerAlimentadores);
router.post('/alimentadores', crearAlimentador);
router.put('/alimentadores/:id', actualizarAlimentador);
router.delete('/alimentadores/:id', eliminarAlimentador);

// Rutas de Tableros
router.post('/tableros', crearTableroCompleto);
router.get('/tableros/:id', obtenerTableroPorId);
router.put('/tableros/:id', actualizarTablero);
router.delete('/tableros/:id', eliminarTablero);
router.post('/empresas/:empresaId/tableros', crearTableroCompleto);
router.get('/empresas/:empresaId/tableros', obtenerTablerosPorEmpresa);

// Rutas de Circuitos (NUEVAS)
router.post('/tableros/:tableroId/circuitos', crearCircuito);
router.put('/circuitos/:id', actualizarCircuito);
router.delete('/circuitos/:id', eliminarCircuito);

// Rutas de Elementos Genéricos, Subestaciones, Puntos de Medición y CCM
router.post('/elementos-unifilares', upload.single('foto'), crearElementoUnifilar);
router.delete('/elementos-unifilares/:id', eliminarElementoUnifilar);
router.post('/subestaciones', crearInspeccionSubestacion);
router.delete('/subestaciones/:id', eliminarInspeccionSubestacion);
router.post('/puntos-medicion', crearPuntoMedicion);
router.delete('/puntos-medicion/:id', eliminarPuntoMedicion);
router.post('/ccm', crearCcm);
router.delete('/ccm/:id', eliminarCcm);


// Endpoints de Respaldo e Importación/Exportación
router.get('/backup/export', exportDatabase);
router.post('/backup/import', importDatabase);
router.post('/backup/gdrive-sync', syncToGoogleDrive);

// Rutas de Gestión de Usuarios
router.get('/users', obtenerUsuarios);
router.post('/users', crearUsuario);
router.put('/users/:id', actualizarUsuario);
router.delete('/users/:id', eliminarUsuario);

// Rutas de Mensajería / Chat
router.get('/messages/:userId', obtenerMensajesUsuario);
router.post('/messages', guardarMensaje);
router.post('/messages/read', marcarMensajesComoLeidos);

export default router;
