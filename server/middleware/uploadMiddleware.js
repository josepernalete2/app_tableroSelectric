import multer from 'multer';

// Uso de memoryStorage para compatibilidad 100% Serverless (Vercel / Lambda)
// Almacena el buffer en memoria RAM para procesarlo o convertirlo directamente a DataURL Base64
// sin depender de escrituras en el sistema de archivos local.
const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/heif',
  'application/octet-stream'
];

const IMAGE_EXT_REGEX = /\.(jpe?g|png|webp|avif|heic|heif)$/i;

const fileFilter = (req, file, cb) => {
  const mime = String(file?.mimetype || '').trim().toLowerCase();
  const originalName = String(file?.originalname || '').trim();
  if (ALLOWED_MIME_TYPES.includes(mime) || (!mime && IMAGE_EXT_REGEX.test(originalName))) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido (${mime || 'sin MIME'}). Se aceptan imágenes JPG, PNG, WEBP, AVIF, HEIC o HEIF.`), false);
  }
};

export const uploadFotoInspeccion = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // Límite 10MB
  }
});

export const uploadImagenR2 = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 4 * 1024 * 1024 // Límite 4MB seguro debajo del límite de 4.5MB de Vercel
  }
});

export default uploadFotoInspeccion;
