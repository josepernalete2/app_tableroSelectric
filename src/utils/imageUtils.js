/**
 * Utilidad de Alto Rendimiento para compresión y optimización de imágenes en PWA y Browser.
 * Resuelve de raíz el error HTTP 413 / FUNCTION_PAYLOAD_TOO_LARGE en Vercel Serverless (límite 4.5 MB).
 * Redimensiona a dimensiones máximas prudentes (1280px / 1024px) y comprime en formato JPEG (calidad 75%),
 * reduciendo el peso de fotos pesadas (5 - 12 MB) a solo 150 - 300 KB sin pérdida apreciable de calidad técnica.
 */

export const MAX_DIMENSION_DEFAULT = 1280;
export const JPEG_QUALITY_DEFAULT = 0.75;
export const MAX_BASE64_BYTE_THRESHOLD = 350 * 1024; // 350 KB threshold

const dataUrlToBlob = (dataUrl) => {
  const [header, base64] = String(dataUrl || '').split(',');
  const mimeMatch = header.match(/data:([^;]+);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binary = atob(base64 || '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
};

/**
 * Lee los primeros 16 bytes del File/Blob y detecta la firma real (magic bytes).
 */
export const inspeccionarArchivoImagen = async (file) => {
  const name = typeof file?.name === 'string' && file.name.trim() ? file.name.trim() : 'sin-nombre';
  const mime = typeof file?.type === 'string' ? file.type.trim().toLowerCase() : '';
  const sizeBytes = typeof file?.size === 'number' ? file.size : 0;
  const sizeMB = Number((sizeBytes / (1024 * 1024)).toFixed(2));

  let detectedFormat = 'unknown';
  let hexHeader = '';

  try {
    if (file && typeof file.slice === 'function') {
      const buffer = await file.slice(0, 16).arrayBuffer();
      const bytes = new Uint8Array(buffer);
      hexHeader = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');

      if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
        detectedFormat = 'jpeg';
      } else if (
        bytes.length >= 4 &&
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47
      ) {
        detectedFormat = 'png';
      } else if (
        bytes.length >= 12 &&
        bytes[0] === 0x52 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x46 &&
        bytes[8] === 0x57 &&
        bytes[9] === 0x45 &&
        bytes[10] === 0x42 &&
        bytes[11] === 0x50
      ) {
        detectedFormat = 'webp';
      } else if (
        bytes.length >= 12 &&
        bytes[4] === 0x66 &&
        bytes[5] === 0x74 &&
        bytes[6] === 0x79 &&
        bytes[7] === 0x70
      ) {
        const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]).toLowerCase();
        if (brand === 'avif' || brand === 'avis') {
          detectedFormat = 'avif';
        } else if (['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs'].includes(brand)) {
          detectedFormat = 'heic';
        } else if (['mif1', 'msf1'].includes(brand)) {
          detectedFormat = 'heif';
        }
      }
    }
  } catch (err) {
    console.warn('[IMAGE INSPECT] ⚠️ Error leyendo magic bytes:', err);
  }

  return { detectedFormat, hexHeader, name, mime, sizeMB };
};

const canvasToJpegBlob = (canvas, quality) =>
  new Promise((resolve, reject) => {
    try {
      if (typeof canvas.toBlob === 'function') {
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size > 0) {
              resolve(blob);
            } else {
              try {
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrlToBlob(dataUrl));
              } catch (e) {
                reject(e);
              }
            }
          },
          'image/jpeg',
          quality
        );
      } else {
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrlToBlob(dataUrl));
      }
    } catch (err) {
      reject(err);
    }
  });

const drawSourceToResizedJpegBlob = async (source, maxDimension, quality) => {
  const srcWidth = source.width || source.naturalWidth || 0;
  const srcHeight = source.height || source.naturalHeight || 0;
  if (!srcWidth || !srcHeight) {
    throw new Error('La imagen no tiene dimensiones válidas.');
  }

  let width = srcWidth;
  let height = srcHeight;
  if (width > maxDimension || height > maxDimension) {
    const ratio = Math.min(maxDimension / width, maxDimension / height);
    width = Math.max(Math.round(width * ratio), 1);
    height = Math.max(Math.round(height * ratio), 1);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    throw new Error('No se pudo inicializar el lienzo Canvas.');
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, width, height);

  let blob = await canvasToJpegBlob(canvas, quality);

  if (blob.size > 1.2 * 1024 * 1024 && (width > 1024 || height > 1024)) {
    const scale = Math.min(1024 / width, 1024 / height);
    const secondCanvas = document.createElement('canvas');
    secondCanvas.width = Math.max(Math.round(width * scale), 1);
    secondCanvas.height = Math.max(Math.round(height * scale), 1);
    const secondCtx = secondCanvas.getContext('2d', { alpha: false });
    if (secondCtx) {
      secondCtx.fillStyle = '#FFFFFF';
      secondCtx.fillRect(0, 0, secondCanvas.width, secondCanvas.height);
      secondCtx.imageSmoothingEnabled = true;
      secondCtx.imageSmoothingQuality = 'high';
      secondCtx.drawImage(canvas, 0, 0, secondCanvas.width, secondCanvas.height);
      blob = await canvasToJpegBlob(secondCanvas, 0.65);
    }
  }

  return blob;
};

const decodeViaFileReaderImage = (sourceBlob, maxDimension, quality) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const blob = await drawSourceToResizedJpegBlob(img, maxDimension, quality);
          resolve(blob);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => {
        reject(new Error('El navegador no pudo decodificar la imagen en <img>.'));
      };
      img.src = ev.target.result;
    };
    reader.onerror = () => {
      reject(new Error('No se pudo leer el archivo con FileReader.'));
    };
    reader.readAsDataURL(sourceBlob);
  });

/**
 * Pipeline Tablet-First en cascada para procesar imágenes antes de subir a R2:
 * 1. createImageBitmap nativo (rápido, sin sobrecarga de memoria)
 * 2. heic2any si es HEIC/HEIF (tolerando 'already browser readable')
 * 3. FileReader + new Image() + Canvas
 * 4. Último recurso directo si es JPEG/PNG/WEBP <= 3.8 MB
 */
export const procesarImagenParaSubida = async (
  file,
  { maxDimension = 1200, quality = 0.72 } = {}
) => {
  if (!file || typeof Blob === 'undefined' || !(file instanceof Blob)) {
    const err = new Error('No se recibió un archivo de imagen válido.');
    err.etapa = 'LECTURA';
    throw err;
  }

  const diagnostico = await inspeccionarArchivoImagen(file);
  let lastError = null;
  let heicFailed = false;

  // Intento 1: createImageBitmap nativo
  if (typeof createImageBitmap === 'function') {
    let bitmap = null;
    try {
      try {
        bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      } catch {
        bitmap = await createImageBitmap(file);
      }
      const blob = await drawSourceToResizedJpegBlob(bitmap, maxDimension, quality);
      return { blob, mimeType: 'image/jpeg', diagnostico };
    } catch (err) {
      lastError = err;
      console.warn('[IMAGE PIPELINE] Intento 1 (createImageBitmap) falló:', err?.message);
    } finally {
      try {
        bitmap?.close?.();
      } catch {
        // ignorar
      }
    }
  }

  // Intento 2: Conversión HEIC / HEIF
  const looksLikeHeic =
    diagnostico.detectedFormat === 'heic' ||
    diagnostico.detectedFormat === 'heif' ||
    /\.(heic|heif)$/i.test(diagnostico.name) ||
    /heic|heif/i.test(diagnostico.mime);

  let sourceForAttempt3 = file;

  if (looksLikeHeic) {
    try {
      const { default: heic2any } = await import('heic2any');
      const converted = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.8
      });
      const convertedBlob = Array.isArray(converted) ? converted[0] : converted;
      if (!convertedBlob) {
        throw new Error('heic2any no devolvió un Blob válido.');
      }
      sourceForAttempt3 = convertedBlob;

      if (typeof createImageBitmap === 'function') {
        let bitmap2 = null;
        try {
          bitmap2 = await createImageBitmap(convertedBlob);
          const resized = await drawSourceToResizedJpegBlob(bitmap2, maxDimension, quality);
          return { blob: resized, mimeType: 'image/jpeg', diagnostico };
        } finally {
          try {
            bitmap2?.close?.();
          } catch {
            // ignorar
          }
        }
      }
      const resizedViaImg = await decodeViaFileReaderImage(convertedBlob, maxDimension, quality);
      return { blob: resizedViaImg, mimeType: 'image/jpeg', diagnostico };
    } catch (heicErr) {
      const msg = String(heicErr?.message || heicErr || '');
      if (/already browser readable/i.test(msg)) {
        console.info('[IMAGE PIPELINE] heic2any indicó "already browser readable"; continuando a Intento 3.');
      } else {
        heicFailed = true;
        lastError = heicErr;
        console.warn('[IMAGE PIPELINE] Intento 2 (heic2any) falló:', msg);
      }
    }
  }

  // Intento 3: Fallback FileReader + new Image() + Canvas
  try {
    const blob = await decodeViaFileReaderImage(sourceForAttempt3, maxDimension, quality);
    return { blob, mimeType: 'image/jpeg', diagnostico };
  } catch (err3) {
    lastError = lastError || err3;
    console.warn('[IMAGE PIPELINE] Intento 3 (FileReader + Image) falló:', err3?.message);
  }

  // Intento 4: Último recurso directo si es JPEG/PNG/WEBP <= 3.8 MB
  const isDirectAllowedFormat =
    ['jpeg', 'png', 'webp'].includes(diagnostico.detectedFormat) ||
    ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(diagnostico.mime);

  if (isDirectAllowedFormat && file.size <= 3.8 * 1024 * 1024) {
    const fallbackMime =
      file.type ||
      (diagnostico.detectedFormat === 'png'
        ? 'image/png'
        : diagnostico.detectedFormat === 'webp'
          ? 'image/webp'
          : 'image/jpeg');
    return { blob: file, mimeType: fallbackMime, diagnostico };
  }

  const finalErr = new Error(
    lastError?.message ||
      'No se pudo decodificar la fotografía en este dispositivo.'
  );
  finalErr.etapa = heicFailed ? 'HEIC_CONVERT' : 'CANVAS';
  finalErr.diagnostico = diagnostico;
  throw finalErr;
};

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
