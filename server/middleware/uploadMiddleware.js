import multer from 'multer';

// Uso de memoryStorage para compatibilidad 100% Serverless (Vercel / Lambda)
// Almacena el buffer en memoria RAM para procesarlo o convertirlo directamente a DataURL Base64
// sin depender de escrituras en el sistema de archivos local.
const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

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
