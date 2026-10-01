/**
 * Utilidad para compresión y conversión de imágenes a Base64 en el cliente (Browser).
 * Optimiza las imágenes antes de persistirlas en PostgreSQL o enviarlas al backend,
 * eliminando la dependencia de almacenamiento en disco físico (esencial para Vercel/Serverless).
 */

export const compressImageToBase64 = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.75) => {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);

    // Si ya es un string Base64 o URL remota
    if (typeof file === 'string') {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(e.target.result);
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };

      img.onerror = () => {
        // Fallback al DataURL original si falla el renderizado en canvas
        resolve(e.target.result);
      };

      img.src = e.target.result;
    };

    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
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
