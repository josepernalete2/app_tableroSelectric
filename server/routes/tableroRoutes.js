import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { crearTableroCompleto, obtenerTablerosPorEmpresa } from '../controllers/tableroController.js';
import { crearInspeccionSubestacion } from '../controllers/subestacionController.js';
import { crearElementoUnifilar } from '../controllers/elementoController.js';
import { exportDatabase, importDatabase, syncToGoogleDrive } from '../controllers/backupController.js';
import { obtenerProyectosPorEmpresa, crearProyecto, obtenerProyectoCompleto } from '../controllers/proyectoController.js';
import { obtenerUsuarios, crearUsuario, actualizarUsuario, eliminarUsuario } from '../controllers/userController.js';
import { obtenerMensajesUsuario, guardarMensaje, marcarMensajesComoLeidos } from '../controllers/messageController.js';
import { login } from '../controllers/authController.js';
import { autenticar, requerirAdmin } from '../middleware/auth.js';

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

// Endpoint público de autenticación
router.post('/auth/login', login);

// Todas las demás rutas requieren token JWT
router.use(autenticar);

// Endpoints para registrar elementos (cola de sincronización universal)
router.post('/proyectos', crearProyecto);
router.post('/elementos-unifilares', upload.single('foto'), crearElementoUnifilar);
router.post('/tableros', crearTableroCompleto);
router.post('/subestaciones', crearInspeccionSubestacion);

// Rutas de Proyectos
router.get('/empresas/:empresaId/proyectos', obtenerProyectosPorEmpresa);
router.get('/proyectos/:proyectoId', obtenerProyectoCompleto);

// Rutas originales con compatibilidad
router.post('/empresas/:empresaId/tableros', crearTableroCompleto);
router.get('/empresas/:empresaId/tableros', obtenerTablerosPorEmpresa);

// Endpoints de Respaldo e Importación/Exportación
router.get('/backup/export', autenticar, exportDatabase);
router.post('/backup/import', autenticar, requerirAdmin, importDatabase);
router.post('/backup/gdrive-sync', autenticar, requerirAdmin, syncToGoogleDrive);

// Rutas de Gestión de Usuarios
router.get('/users', autenticar, obtenerUsuarios);
router.post('/users', autenticar, requerirAdmin, crearUsuario);
router.put('/users/:id', autenticar, requerirAdmin, actualizarUsuario);
router.delete('/users/:id', autenticar, requerirAdmin, eliminarUsuario);

// Rutas de Mensajería / Chat
router.get('/messages/:userId', autenticar, obtenerMensajesUsuario);
router.post('/messages', autenticar, guardarMensaje);
router.post('/messages/read', autenticar, marcarMensajesComoLeidos);

export default router;
