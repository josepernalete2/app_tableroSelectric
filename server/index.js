process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Rechazo no manejado en:', promise, 'razón:', reason);
});
process.on('uncaughtException', (error) => {
  console.error('❌ Excepción no capturada:', error);
});

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import tableroRoutes from './routes/tableroRoutes.js';
import pushRoutes from './routes/pushRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 1. Habilitar trust proxy para Railway
app.set('trust proxy', 1);

// Configuración de CORS tolerante y segura
const allowedOrigins = [
  'https://apptableroselectric-production.up.railway.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:5173',
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) : [])
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.railway.app') || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Acceso denegado por política de CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Rate Limiters con validación de proxy desactivada
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { ok: false, error: 'Demasiados intentos de inicio de sesión. Por favor, intente de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }
});

const backupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { ok: false, error: 'Límite de solicitudes de respaldo alcanzado. Intente de nuevo en una hora.' },
  validate: { xForwardedForHeader: false }
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200,
  message: { ok: false, error: 'Demasiadas solicitudes a la API. Intente de nuevo en un momento.' },
  validate: { xForwardedForHeader: false }
});

// Aplicar Rate Limiters específicos
app.use('/api/login', authLimiter);
app.use('/api/backup', backupLimiter);
app.use('/api', apiLimiter);

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.railway.app')) {
        callback(null, true);
      } else {
        callback(new Error('Acceso denegado en WebSockets por CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const connectedUsers = new Map();

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

// Servir archivos de uploads con encabezados de seguridad
app.use('/uploads', (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
}, express.static(path.join(process.cwd(), 'public', 'uploads')));

// Endpoints de Notificaciones Push
app.use('/api/notifications', pushRoutes);

// Endpoints Principales de la Inspección Eléctrica
app.use('/api', tableroRoutes);

// Manejo fallback para endpoints de API no encontrados
app.use('/api', (req, res) => {
  res.status(404).json({ ok: false, error: `Endpoint de API no encontrado: ${req.method} ${req.originalUrl}` });
});

// Endpoint de Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', uptime: process.uptime(), date: new Date() });
});

// Servir archivos estáticos del frontend compilado (dist/)
const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath));

// Fallback SPA
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path === '/health') {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

// Middleware Global de Manejo de Errores
app.use((err, req, res, next) => {
  console.error("❌ ERROR EN EL SERVIDOR:", err.stack);
  res.status(500).json({ ok: false, error: "Error interno del servidor", detalle: err.message });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor de Inspecciones Eléctricas con WebSockets corriendo en el puerto ${PORT}`);
});