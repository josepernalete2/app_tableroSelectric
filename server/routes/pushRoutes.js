import express from 'express';
import {
  getVapidPublicKey,
  subscribe,
  unsubscribe,
  sendTestNotification
} from '../controllers/pushController.js';

const router = express.Router();

router.get('/vapid-key', getVapidPublicKey);
router.post('/subscribe', subscribe);
router.post('/unsubscribe', unsubscribe);
router.post('/send-test', sendTestNotification);

export default router;
