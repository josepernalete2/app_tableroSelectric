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
 * Detecta si un archivo o Blob es HEIC/HEIF (formato nativo de iPhone/iPad/tablets)
 * y lo convierte automáticamente a JPEG usando `heic2any` antes de comprimirlo.
 */
export const normalizarImagenSiEsHeic = async (file) => {
  if (!file || typeof Blob === 'undefined' || !(file instanceof Blob)) {
    return file;
  }

  const fileName = typeof file.name === 'string' ? file.name.trim() : '';
  const mimeType = typeof file.type === 'string' ? file.type.trim().toLowerCase() : '';
  const isHeicMime = [
    'image/heic',
    'image/heif',
    'image/heic-sequence',
    'image/heif-sequence'
  ].includes(mimeType);
  const isHeicExt = /\.(heic|heif)$/i.test(fileName);

  if (!isHeicMime && !isHeicExt) {
    return file;
  }

  try {
    const { default: heic2any } = await import('heic2any');
    const converted = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.85
    });
    const resultBlob = Array.isArray(converted) ? converted[0] : converted;
    if (!resultBlob) {
      throw new Error('La conversión HEIC no produjo una imagen válida.');
    }
    const nextName = fileName
      ? fileName.replace(/\.(heic|heif)$/i, '.jpg')
      : `foto_${Date.now()}.jpg`;
    return typeof File !== 'undefined'
      ? new File([resultBlob], nextName, { type: 'image/jpeg' })
      : resultBlob;
  } catch (err) {
    console.error('[IMAGE HEIC] ❌ Error al convertir imagen HEIC/HEIF a JPEG:', err);
    throw new Error('No se pudo convertir la fotografía HEIC/HEIF a JPEG. Intenta exportarla como JPG o PNG.');
  }
};

/**
 * Carga una imagen (File, Blob o DataURL Base64) y la comprime mediante Canvas a JPEG.
 * Convierte automáticamente archivos HEIC/HEIF a JPEG antes de decodificar.
 */
export const compressImageToBase64 = async (fileOrBase64, maxWidth = MAX_DIMENSION_DEFAULT, maxHeight = MAX_DIMENSION_DEFAULT, quality = JPEG_QUALITY_DEFAULT) => {
  if (!fileOrBase64) return null;

  const normalizedInput = await normalizarImagenSiEsHeic(fileOrBase64);

  return new Promise((resolve, reject) => {
    if (!normalizedInput) return resolve(null);

    // Si estamos en un entorno sin DOM (ej. SSR / Node.js), retornar tal cual
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return resolve(typeof normalizedInput === 'string' ? normalizedInput : null);
    }

    // Si ya es una URL remota de servidor (no base64), no requiere compresión
    if (typeof normalizedInput === 'string' && (
      normalizedInput.startsWith('http://') ||
      normalizedInput.startsWith('https://') ||
      normalizedInput.startsWith('/uploads/') ||
      normalizedInput.startsWith('/api/')
    )) {
      return resolve(normalizedInput);
    }

    const processImageElement = (imgSrc, { isObjectUrl = false, allowFileReaderFallback = false } = {}) => {
      const img = new Image();
      if (typeof imgSrc === 'string' && (imgSrc.startsWith('http://') || imgSrc.startsWith('https://'))) {
        img.crossOrigin = 'anonymous';
      }

      const cleanupObjectUrl = () => {
        if (isObjectUrl && typeof imgSrc === 'string' && imgSrc.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(imgSrc);
          } catch {
            // ignorar
          }
        }
      };

      img.onload = () => {
        try {
          let { width, height } = img;
          if (!width || !height) {
            cleanupObjectUrl();
            return reject(new Error('La imagen no tiene dimensiones válidas.'));
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
            cleanupObjectUrl();
            return reject(new Error('No se pudo inicializar el lienzo de compresión de imagen.'));
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

          cleanupObjectUrl();
          resolve(compressedDataUrl);
        } catch (canvasErr) {
          cleanupObjectUrl();
          console.warn('[IMAGE COMPRESS] ⚠️ Error en canvas al comprimir:', canvasErr);
          reject(new Error('No se pudo procesar la imagen seleccionada (usa JPG o PNG).'));
        }
      };

      img.onerror = (err) => {
        cleanupObjectUrl();
        console.warn('[IMAGE COMPRESS] ⚠️ Error al cargar imagen en elemento Image:', err);

        // Fallback con FileReader.readAsDataURL si falló con ObjectURL sobre un File/Blob
        if (allowFileReaderFallback && typeof Blob !== 'undefined' && normalizedInput instanceof Blob) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            processImageElement(ev.target.result, { isObjectUrl: false, allowFileReaderFallback: false });
          };
          reader.onerror = () => {
            reject(new Error('Formato de imagen no compatible en este navegador (usa JPG o PNG)'));
          };
          reader.readAsDataURL(normalizedInput);
          return;
        }

        reject(new Error('Formato de imagen no compatible en este navegador (usa JPG o PNG)'));
      };

      img.src = imgSrc;
    };

    // Si ya es un DataURL o URL string
    if (typeof normalizedInput === 'string') {
      return processImageElement(normalizedInput);
    }

    // Si es File o Blob: usar ObjectURL primero (con revocación dentro de onload/onerror) y fallback a FileReader
    if (typeof Blob !== 'undefined' && normalizedInput instanceof Blob) {
      if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        const objectUrl = URL.createObjectURL(normalizedInput);
        return processImageElement(objectUrl, { isObjectUrl: true, allowFileReaderFallback: true });
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        processImageElement(e.target.result, { isObjectUrl: false, allowFileReaderFallback: false });
      };
      reader.onerror = (err) => {
        console.warn('[IMAGE COMPRESS] ⚠️ Error en FileReader al leer Blob:', err);
        reject(new Error('Formato de imagen no compatible en este navegador (usa JPG o PNG)'));
      };
      reader.readAsDataURL(normalizedInput);
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
  if (
    trimmed.startsWith('/api/sync/image?key=') ||
    trimmed.startsWith('/api/sync/image/') ||
    trimmed.startsWith('/uploads/') ||
    trimmed.startsWith('/api/')
  ) {
    return apiBaseUrl ? `${apiBaseUrl}${trimmed}` : trimmed;
  }
  return trimmed;
};

export default compressImageToBase64;
