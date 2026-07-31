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
import { createServer } from 'http';
import { Server } from 'socket.io';
import tableroRoutes from './routes/tableroRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const connectedUsers = new Map(); // userId -> socketId

app.set('io', io);
app.set('connectedUsers', connectedUsers);

io.on('connection', (socket) => {
  console.log('⚡ Nuevo cliente WebSocket conectado:', socket.id);

  socket.on('register_user', (userId) => {
    connectedUsers.set(userId, socket.id);
    console.log(`👤 Usuario registrado en Socket: ${userId} -> Socket ID: ${socket.id}`);
  });

  socket.on('disconnect', () => {
    for (const [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        console.log(`🚪 Usuario desconectado de Socket: ${userId}`);
        break;
      }
    }
  });
});

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    // Permitir peticiones sin origen (mismo servidor, curl, apps nativas) y orígenes configurados
    if (!origin || allowedOrigins.includes(origin) || origin === `http://localhost:${PORT}`) {
      return callback(null, true);
    }
    return callback(new Error('Origen no permitido por CORS.'));
  }
}));
app.use(express.json());

// Servir archivos de uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

// Endpoints Principales de la Inspección Eléctrica (Bajo el prefijo /api)
app.use('/api', tableroRoutes);

// Endpoint de Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', uptime: process.uptime(), date: new Date() });
});

// Servir archivos estáticos del frontend compilado (dist/)
const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath));

// Cualquier otra ruta no-API debe retornar index.html del frontend
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path === '/health') {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

// Middleware Global de Manejo de Errores en Express
app.use((err, req, res, next) => {
  console.error("❌ ERROR EN EL SERVIDOR:", err.stack);
  res.status(500).json({ error: "Error interno", detalle: err.message });
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor de Inspecciones Eléctricas con WebSockets corriendo en http://localhost:${PORT}`);
});
