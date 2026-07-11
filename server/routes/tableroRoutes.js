import { Router } from 'express';
import { crearTableroCompleto, obtenerTablerosPorEmpresa } from '../controllers/tableroController.js';

const router = Router();

// Endpoint para registrar un tablero con sus circuitos
router.post('/empresas/:empresaId/tableros', crearTableroCompleto);

// Endpoint para listar todos los tableros de una empresa específica
router.get('/empresas/:empresaId/tableros', obtenerTablerosPorEmpresa);

export default router;
