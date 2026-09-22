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
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './middleware/authMiddleware.js';
import tableroRoutes from './routes/tableroRoutes.js';
import pushRoutes from './routes/pushRoutes.js';
import syncRoutes from './routes/syncRoutes.js';
import { iniciarSchedulerBackups } from './services/backupScheduler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configuración de CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:5000',
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) : [])
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      process.env.NODE_ENV !== 'production'
    ) {
      callback(null, true);
    } else {
      callback(null, true);
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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate Limiters locales
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { ok: false, error: 'Demasiados intentos de inicio de sesión. Por favor, intente de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false
});

const backupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 120,
  message: { ok: false, error: 'Límite de solicitudes de respaldo alcanzado. Intente de nuevo en unos minutos.' },
  validate: false
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 1000,
  message: { ok: false, error: 'Demasiadas solicitudes a la API. Intente de nuevo en un momento.' },
  validate: false
});

app.use('/api/login', authLimiter);
app.use('/api/backup', backupLimiter);
app.use('/api/backups', backupLimiter);
app.use('/api', apiLimiter);

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const connectedUsers = new Map();

app.set('io', io);
app.set('connectedUsers', connectedUsers);

// Middleware de autenticación estricto para conexiones WebSocket (SEC-05)
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || 
                socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
                socket.handshake.query?.token;

  if (!token) {
    return next(new Error('Autenticación requerida: debe proporcionar un token JWT para conectar a WebSocket'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = decoded; // { id, username, role, companyId }
    next();
  } catch (err) {
    console.warn('⚠️ Token inválido en WebSocket handshake:', err.message);
    next(new Error('Autenticación fallida en WebSocket: token inválido o expirado'));
  }
});

io.on('connection', (socket) => {
  console.log('⚡ Nuevo cliente WebSocket conectado:', socket.id);

  if (socket.user?.id) {
    connectedUsers.set(socket.user.id, socket.id);
    console.log(`👤 Usuario autenticado registrado en Socket: ${socket.user.username} (${socket.user.id}) -> ${socket.id}`);
  }

  socket.on('register_user', (userId) => {
    if (socket.user && (socket.user.id === userId || socket.user.role === 'ADMIN')) {
      connectedUsers.set(userId, socket.id);
      console.log(`👤 Usuario verificado registrado en Socket: ${userId} -> Socket ID: ${socket.id}`);
    } else {
      console.warn(`⚠️ [SECURITY WARNING] Intento no autorizado de register_user para '${userId}' desde socket '${socket.id}'`);
    }
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
}, express.static(path.resolve(process.cwd(), 'public', 'uploads')));

// Endpoints de Notificaciones Push
app.use('/api/notifications', pushRoutes);

// Endpoints Principales de la Inspección Eléctrica
app.use('/api', tableroRoutes);

// Endpoints de Sincronización Offline-First
app.use('/api/sync', syncRoutes);

// Manejo fallback para endpoints de API no encontrados
app.use('/api', (req, res) => {
  res.status(404).json({ ok: false, error: `Endpoint de API no encontrado: ${req.method} ${req.originalUrl}` });
});

// Endpoint de Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', uptime: process.uptime(), date: new Date() });
});

// Servir archivos estáticos del frontend compilado (dist/)
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));

// Fallback SPA
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path === '/health') {
    return next();
  }
  const indexPath = path.resolve(distPath, 'index.html');
  try {
    res.sendFile(indexPath);
  } catch {
    next();
  }
});

// Middleware Global de Manejo de Errores Seguro
app.use((err, req, res, next) => {
  console.error("❌ ERROR EN EL SERVIDOR:", err.stack);
  const isDev = process.env.NODE_ENV !== 'production';

  res.status(err.status || 500).json({ 
    ok: false, 
    error: err.status ? err.message : "Error interno del servidor",
    ...(isDev ? { detalle: err.message, stack: err.stack } : {})
  });
});

// Iniciar Servidor Express y Programador de Respaldos
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor de Inspecciones Eléctricas con WebSockets corriendo en http://localhost:${PORT}`);
  iniciarSchedulerBackups();
});

export { app, server, io };
export default app;