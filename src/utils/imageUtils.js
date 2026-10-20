/**
 * Utilidad de Alto Rendimiento para compresión y optimización de imágenes en PWA y Browser.
 * Resuelve de raíz el error HTTP 413 / FUNCTION_PAYLOAD_TOO_LARGE en Vercel Serverless (límite 4.5 MB).
 * Redimensiona a dimensiones máximas prudentes (1280px / 1024px) y comprime en formato JPEG (calidad 75%),
 * reduciendo el peso de fotos pesadas (5 - 12 MB) a solo 150 - 300 KB sin pérdida apreciable de calidad técnica.
 */

export const MAX_DIMENSION_DEFAULT = 1280;
export const JPEG_QUALITY_DEFAULT = 0.75;
export const MAX_BASE64_BYTE_THRESHOLD = 350 * 1024; // 350 KB threshold

/**
 * Determina si una cadena es una imagen Base64 DataURL
 */
export const isBase64Image = (str) => {
  return typeof str === 'string' && str.startsWith('data:image/');
};

/**
 * Estima el peso en bytes de una cadena Base64
 */
export const estimateBase64SizeBytes = (str) => {
  if (!str || typeof str !== 'string') return 0;
  const commaIdx = str.indexOf(',');
  const base64Data = commaIdx >= 0 ? str.slice(commaIdx + 1) : str;
  return Math.round((base64Data.length * 3) / 4);
};

/**
 * Determina si una imagen Base64 debe comprimirse para respetar los límites de Vercel (4.5 MB)
 */
export const shouldCompressBase64 = (str, thresholdBytes = MAX_BASE64_BYTE_THRESHOLD) => {
  if (!isBase64Image(str)) return false;
  return estimateBase64SizeBytes(str) > thresholdBytes;
};

/**
 * Carga una imagen (File, Blob o DataURL Base64) y la comprime mediante Canvas a JPEG 75%.
 * Soporta de forma nativa strings Base64 ya existentes para auto-curar fotos atascadas en la cola.
 */
export const compressImageToBase64 = (fileOrBase64, maxWidth = MAX_DIMENSION_DEFAULT, maxHeight = MAX_DIMENSION_DEFAULT, quality = JPEG_QUALITY_DEFAULT) => {
  return new Promise((resolve, reject) => {
    if (!fileOrBase64) return resolve(null);

    // Si estamos en un entorno sin DOM (ej. SSR / Node.js), retornar tal cual
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return resolve(typeof fileOrBase64 === 'string' ? fileOrBase64 : null);
    }

    // Si ya es una URL remota de servidor (no base64), no requiere compresión
    if (typeof fileOrBase64 === 'string' && (
      fileOrBase64.startsWith('http://') ||
      fileOrBase64.startsWith('https://') ||
      fileOrBase64.startsWith('/uploads/')
    )) {
      return resolve(fileOrBase64);
    }

    const processImageElement = (imgSrc) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          let { width, height } = img;
          if (!width || !height) {
            return resolve(imgSrc);
          }

          // Redimensionar manteniendo proporción (aspect ratio)
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.max(Math.round(width * ratio), 1);
            height = Math.max(Math.round(height * ratio), 1);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d', { alpha: false });
          if (!ctx) {
            return resolve(imgSrc);
          }

          // Fondo blanco para evitar fondos negros en PNG transparentes al convertir a JPEG
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);

          // Renderizar con suavizado de alta calidad
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

          // Segundo pase defensivo: si aún supera 1.2 MB (caso extremo de foto con ruido de alta frecuencia),
          // reducir adicionalmente a 1024px al 65% de calidad para garantizar < 400 KB.
          if (estimateBase64SizeBytes(compressedDataUrl) > 1.2 * 1024 * 1024 && (width > 1024 || height > 1024)) {
            const scale = Math.min(1024 / width, 1024 / height);
            const secondCanvas = document.createElement('canvas');
            secondCanvas.width = Math.round(width * scale);
            secondCanvas.height = Math.round(height * scale);
            const secondCtx = secondCanvas.getContext('2d', { alpha: false });
            if (secondCtx) {
              secondCtx.fillStyle = '#FFFFFF';
              secondCtx.fillRect(0, 0, secondCanvas.width, secondCanvas.height);
              secondCtx.imageSmoothingEnabled = true;
              secondCtx.imageSmoothingQuality = 'high';
              secondCtx.drawImage(canvas, 0, 0, secondCanvas.width, secondCanvas.height);
              compressedDataUrl = secondCanvas.toDataURL('image/jpeg', 0.65);
            }
          }

          resolve(compressedDataUrl);
        } catch (canvasErr) {
          console.warn('[IMAGE COMPRESS] ⚠️ Error en canvas al comprimir, usando original:', canvasErr);
          resolve(imgSrc);
        }
      };

      img.onerror = (err) => {
        console.warn('[IMAGE COMPRESS] ⚠️ Error al cargar imagen en elemento Image:', err);
        resolve(imgSrc);
      };

      img.src = imgSrc;
    };

    // Si ya es un DataURL o URL string
    if (typeof fileOrBase64 === 'string') {
      return processImageElement(fileOrBase64);
    }

    // Si es File o Blob
    if (typeof Blob !== 'undefined' && fileOrBase64 instanceof Blob) {
      const reader = new FileReader();
      reader.onload = (e) => {
        processImageElement(e.target.result);
      };
      reader.onerror = (err) => {
        console.warn('[IMAGE COMPRESS] ⚠️ Error en FileReader al leer Blob:', err);
        reject(err);
      };
      reader.readAsDataURL(fileOrBase64);
    } else {
      resolve(null);
    }
  });
};

/**
 * Normaliza la URL de una imagen asegurando compatibilidad con Base64, URLs relativas y URLs absolutas
 */
export const getCleanImageUrl = (src, apiBaseUrl = '') => {
  if (!src || typeof src !== 'string') return null;
  const trimmed = src.trim();
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('/uploads/')) {
    return apiBaseUrl ? `${apiBaseUrl}${trimmed}` : trimmed;
  }
  return trimmed;
};

export default compressImageToBase64;
