process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Rechazo no manejado en:', promise, 'razón:', reason);
});
process.on('uncaughtException', (error) => {
  console.error('❌ Excepción no capturada:', error);
});

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import tableroRoutes from './routes/tableroRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Servir archivos de uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

// Endpoints Principales de la Inspección Eléctrica (Bajo el prefijo /api)
app.use('/api', tableroRoutes);

// Endpoint de Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', uptime: process.uptime(), date: new Date() });
});

// Middleware Global de Manejo de Errores en Express
app.use((err, req, res, next) => {
  console.error("❌ ERROR EN EL SERVIDOR:", err.stack);
  res.status(500).json({ error: "Error interno", detalle: err.message });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor de Inspecciones Eléctricas corriendo en http://localhost:${PORT}`);
});
