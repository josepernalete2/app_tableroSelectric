import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';

// Determinar si estamos en Vercel o entorno Serverless con FS de solo lectura
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NODE_ENV === 'production');

// En Vercel / Serverless, solo se puede escribir en /tmp
const uploadDir = isServerless
  ? path.join(os.tmpdir(), 'uploads')
  : path.resolve(process.cwd(), 'public', 'uploads');

// Crear directorio de forma segura sin romper el arranque de la aplicación
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (error) {
  console.warn('⚠️ [UploadMiddleware] No se pudo crear directorio físico de subidas en disco:', error.message);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    } catch (e) {
      console.warn('⚠️ Error accediendo a uploadDir:', e.message);
      cb(null, os.tmpdir());
    }
  },
  filename: (req, file, cb) => {
    const randomHex = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${randomHex}${ext}`);
  }
});

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se aceptan imágenes JPG, PNG y WEBP.'), false);
  }
};

export const uploadFotoInspeccion = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // Límite 10MB
  }
});

export default uploadFotoInspeccion;

