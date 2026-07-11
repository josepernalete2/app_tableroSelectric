import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import tableroRoutes from './routes/tableroRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Endpoints Principales de la Inspección Eléctrica (Bajo el prefijo /api)
app.use('/api', tableroRoutes);

// Endpoint de Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', uptime: process.uptime(), date: new Date() });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor de Inspecciones Eléctricas corriendo en http://localhost:${PORT}`);
});
