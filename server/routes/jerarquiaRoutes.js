import { Router } from 'express';
import { verificarToken } from '../middleware/authMiddleware.js';
import {
  vincularElemento,
  desvincularElemento,
  crearProvisional,
  obtenerArbolProyecto
} from '../controllers/jerarquiaController.js';

const router = Router();

router.use(verificarToken);

router.post('/vincular', vincularElemento);
router.post('/desvincular', desvincularElemento);
router.post('/crear-provisional', crearProvisional);
router.get('/arbol/:proyectoId', obtenerArbolProyecto);

export default router;
