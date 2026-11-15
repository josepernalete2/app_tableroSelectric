import express from 'express';
import {
  getVapidPublicKey,
  subscribe,
  unsubscribe,
  sendTestNotification
} from '../controllers/pushController.js';
import { verificarToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/vapid-key', getVapidPublicKey);
router.post('/subscribe', verificarToken, subscribe);
router.post('/unsubscribe', verificarToken, unsubscribe);
router.post('/send-test', verificarToken, sendTestNotification);

export default router;
