import React, { useState, useEffect } from 'react';
import { Camera, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext';
import useStore from '../store/useStore';
import { API_BASE_URL } from '../utils/api';
import { compressImageToBase64, getCleanImageUrl } from '../utils/imageUtils';

// Carga de fotografías reactivada (Modo Online directo hacia Cloudflare R2)
export const PHOTO_UPLOAD_PAUSED = false;

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

// Renderizado seguro de imágenes con soporte para File / Blob / Data URL / URL remota
export const SafePreviewImage = ({ blob, src, alt, className, onError }) => {
  const [objectUrl, setObjectUrl] = useState(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
    if (blob instanceof Blob || blob instanceof File) {
      const url = URL.createObjectURL(blob);
      setObjectUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else if (blob && (blob instanceof ArrayBuffer || ArrayBuffer.isView(blob))) {
      try {
        const b = new Blob([blob]);
        const url = URL.createObjectURL(b);
        setObjectUrl(url);
        return () => {
          URL.revokeObjectURL(url);
        };
      } catch (err) {
        setObjectUrl(null);
      }
    } else {
      setObjectUrl(null);
    }
  }, [blob, src]);

  const rawSrc = objectUrl || (typeof src === 'string' ? src : null);
  const finalSrc = getCleanImageUrl(rawSrc, API_BASE_URL);

  if (!finalSrc || imgError) return null;

  return (
    <img
      src={finalSrc}
      alt={alt || "Evidencia fotográfica"}
      className={className}
      onError={(e) => {
        setImgError(true);
        onError?.(e);
      }}
    />
  );
};

export default function DualPhotoUploader({
  fotoBlob,
  fotoSrc,
  previewUrl,
  value,
  foto,
  onImageSelected,
  onPhotoChange,
  onChange,
  onRemove,
  readOnly = false,
  label = "Evidencia Fotográfica",
  sublabel = "Captura con cámara en vivo o selecciona un archivo desde tu galería/dispositivo",
  maxSizeMB = 10,
  className = ""
}) {
  const { alert: customAlert } = useConfirm();
  const [isProcessing, setIsProcessing] = useState(false);

  // Determinar la fuente activa de imagen
  const activeSrc = value || foto || fotoSrc || previewUrl || null;
  const hasPhoto = !!(fotoBlob || activeSrc);

  const handleFileChange = async (e) => {
    if (readOnly || PHOTO_UPLOAD_PAUSED) return;
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      customAlert('Conéctate a internet para subir fotografías al servidor');
      e.target.value = '';
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      customAlert(`La imagen seleccionada supera los ${maxSizeMB}MB. Por favor elija un archivo más liviano.`);
      e.target.value = '';
      return;
    }

    try {
      setIsProcessing(true);
      // 1. Comprimir en navegador a máximo 1200px y calidad 0.72 (~120 KB - 250 KB)
      const compressedDataUrl = await compressImageToBase64(file, 1200, 1200, 0.72);
      if (!compressedDataUrl || !compressedDataUrl.startsWith('data:image/')) {
        throw new Error('No se pudo comprimir la imagen seleccionada.');
      }

      // 2. Convertir a Blob JPEG y subir inmediatamente a Cloudflare R2
      const jpegBlob = dataUrlToBlob(compressedDataUrl);
      const formData = new FormData();
      formData.append('foto', jpegBlob, `foto_${Date.now()}.jpg`);

      const freshToken =
        useStore.getState().token ||
        (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : '') ||
        '';

      const response = await fetch(`${API_BASE_URL}/api/sync/upload-image`, {
        method: 'POST',
        headers: freshToken ? { Authorization: `Bearer ${freshToken}` } : {},
        body: formData
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok || !result.url) {
        throw new Error(result.error || `Error del servidor al subir fotografía (${response.status})`);
      }

      // 3. Guardar únicamente la URL corta (/api/sync/image/...) sin Base64 ni fotoBlob
      const shortUrl = result.url;
      onPhotoChange?.(shortUrl, null);
      onImageSelected?.(null, shortUrl);
      onChange?.(shortUrl);
    } catch (err) {
      console.error('Error al subir fotografía a Cloudflare R2:', err);
      customAlert(err.message || 'Ocurrió un error al subir la fotografía al servidor.');
    } finally {
      setIsProcessing(false);
      // Resetear valor para permitir seleccionar el mismo archivo consecutivamente
      e.target.value = '';
    }
  };

  const handleRemove = () => {
    if (readOnly) return;
    onRemove?.();
    onChange?.(null);
  };

  return (
    <div className={`space-y-3 print:space-y-1 font-sans ${!hasPhoto ? 'no-print' : ''} ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-xs print:text-[9px] font-bold text-slate-300 print:text-slate-950 uppercase tracking-wider flex items-center gap-1.5">
            <Camera className="w-4 h-4 print:w-3 print:h-3 text-amber-500 no-print" />
            {label}
          </span>
          {sublabel && (
            <span className="text-[10px] text-slate-500 hidden sm:inline no-print">
              {sublabel}
            </span>
          )}
        </div>
      )}

      {isProcessing ? (
        <div className="p-8 border border-slate-800 bg-slate-950/80 rounded-2xl flex flex-col items-center justify-center gap-2 text-amber-400 no-print">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-xs font-bold">Optimizando y convirtiendo imagen...</span>
        </div>
      ) : hasPhoto ? (
        <div className="tablero-photo-frame relative rounded-2xl print:rounded overflow-hidden border border-slate-800 print:border-slate-900 bg-slate-950/80 shadow-xl print:shadow-none group max-w-md mx-auto">
          <SafePreviewImage
            blob={fotoBlob}
            src={activeSrc}
            alt={label}
            className="w-full h-auto max-h-80 print:max-h-36 object-cover rounded-2xl print:rounded"
          />

          {!readOnly && (
            <div className="absolute top-2 right-2 flex items-center gap-1.5 no-print">
              <button
                type="button"
                onClick={handleRemove}
                className="p-1.5 bg-red-600/90 hover:bg-red-500 text-white rounded-xl shadow-lg transition-all cursor-pointer backdrop-blur-xs active:scale-95"
                title="Eliminar Fotografía"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : PHOTO_UPLOAD_PAUSED ? (
        <div className="p-3.5 border border-dashed border-slate-800 bg-slate-950/40 rounded-2xl text-center space-y-2.5 no-print">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-bold">
            <Camera className="w-3.5 h-3.5" />
            <span>Carga de fotos pausada temporalmente (Prioridad de datos activa)</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-0.5">
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800/60 text-slate-500 border border-slate-800 font-bold text-xs rounded-xl cursor-not-allowed opacity-60"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Tomar Foto (Cámara)</span>
            </button>

            <button
              type="button"
              disabled
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800/60 text-slate-500 border border-slate-800 font-bold text-xs rounded-xl cursor-not-allowed opacity-60"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Subir Archivo / Galería</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 sm:p-5 border-2 border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/40 rounded-2xl text-center space-y-3 transition-colors no-print">
          <div className="flex items-center justify-center gap-2 text-slate-500">
            <Camera className="w-6 h-6 text-amber-500/70" />
            <ImageIcon className="w-6 h-6 text-sky-500/70" />
          </div>

          <p className="text-xs text-slate-400 font-semibold">
            Selecciona el método de captura de evidencia:
          </p>

          {!readOnly && (
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              {/* Botón 1: Cámara en vivo (Direct Capture) */}
              <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs rounded-xl cursor-pointer transition-all shadow-md">
                <Camera className="w-4 h-4" />
                <span>Tomar Foto (Cámara)</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {/* Botón 2: Selector de Archivo / Galería */}
              <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-all shadow-sm">
                <ImageIcon className="w-4 h-4 text-sky-400" />
                <span>Subir Archivo / Galería</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
