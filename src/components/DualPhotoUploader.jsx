import React, { useState, useEffect } from 'react';
import { Camera, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext';
import useStore from '../store/useStore';
import { API_BASE_URL } from '../utils/api';
import { procesarImagenParaSubida, inspeccionarArchivoImagen, getCleanImageUrl } from '../utils/imageUtils';
import { eliminarImagenEnR2Cliente } from '../utils/syncService';

// Carga de fotografías reactivada (Modo Online directo hacia Cloudflare R2)
export const PHOTO_UPLOAD_PAUSED = false;

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
  const { alert: customAlert, confirm: customConfirm } = useConfirm();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('Leyendo imagen...');
  const [uploadError, setUploadError] = useState(null);

  // Determinar la fuente activa de imagen
  const activeSrc = value || foto || fotoSrc || previewUrl || null;
  const hasPhoto = !!(fotoBlob || activeSrc);

  const handleFileChange = async (e) => {
    const inputEl = e.target;
    const selectedFile = inputEl.files && inputEl.files[0] ? inputEl.files[0] : null;
    if (readOnly || PHOTO_UPLOAD_PAUSED || !selectedFile) {
      if (inputEl) inputEl.value = '';
      return;
    }

    // Copiar metadatos y referencia inmediata antes de cualquier operación asíncrona (evita pérdida en Android)
    const fileSnapshot = selectedFile;
    let diagSnapshot = {
      name: fileSnapshot.name || 'sin-nombre',
      mime: fileSnapshot.type || '',
      sizeMB: Number(((fileSnapshot.size || 0) / (1024 * 1024)).toFixed(2)),
      detectedFormat: 'unknown'
    };
    let currentEtapa = 'LECTURA';

    try {
      setUploadError(null);

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw Object.assign(new Error('Sin conexión a internet para subir fotografías.'), { etapa: 'UPLOAD_HTTP' });
      }

      if (fileSnapshot.size > maxSizeMB * 1024 * 1024) {
        throw Object.assign(
          new Error(`La imagen supera el máximo permitido de ${maxSizeMB} MB.`),
          { etapa: 'LECTURA' }
        );
      }

      setIsProcessing(true);
      setProcessingStep('Leyendo imagen...');

      // 1. Inspeccionar y procesar con pipeline Tablet-First en cascada
      diagSnapshot = await inspeccionarArchivoImagen(fileSnapshot);
      const isHeicInput =
        diagSnapshot.detectedFormat === 'heic' ||
        diagSnapshot.detectedFormat === 'heif' ||
        /\.(heic|heif)$/i.test(diagSnapshot.name) ||
        /heic|heif/i.test(diagSnapshot.mime);

      if (isHeicInput) {
        currentEtapa = 'HEIC_CONVERT';
        setProcessingStep('Convirtiendo formato HEIC...');
      } else {
        currentEtapa = 'CANVAS';
        setProcessingStep('Comprimiendo foto...');
      }

      const processed = await procesarImagenParaSubida(fileSnapshot, {
        maxDimension: 1200,
        quality: 0.72
      });
      if (processed?.diagnostico) {
        diagSnapshot = processed.diagnostico;
      }

      const outBlob = processed?.blob;
      if (!outBlob || outBlob.size === 0) {
        throw Object.assign(new Error('El procesador devolvió una imagen vacía.'), { etapa: 'CANVAS' });
      }

      // 2. Crear File explícito JPEG y subir a Cloudflare R2
      currentEtapa = 'UPLOAD_HTTP';
      setProcessingStep('Subiendo a la nube...');
      const uploadMime = processed?.mimeType || outBlob.type || 'image/jpeg';
      const uploadExt = uploadMime.includes('png') ? 'png' : uploadMime.includes('webp') ? 'webp' : 'jpg';
      const uploadFile = new File([outBlob], `foto.${uploadExt}`, { type: uploadMime });

      const formData = new FormData();
      formData.append('foto', uploadFile, `foto.${uploadExt}`);

      const freshToken =
        useStore.getState().token ||
        (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : '') ||
        '';

      const response = await fetch(`${API_BASE_URL}/api/sync/upload-image`, {
        method: 'POST',
        headers: freshToken ? { Authorization: `Bearer ${freshToken}` } : {},
        body: formData
      });

      const rawText = await response.text();
      let result = {};
      try {
        result = rawText ? JSON.parse(rawText) : {};
      } catch {
        result = {};
      }

      if (!response.ok || !result.ok || !result.url) {
        const serverMessage =
          result.error ||
          result.message ||
          (rawText && rawText.length < 200 ? rawText : '') ||
          `Error del servidor al subir fotografía (HTTP ${response.status})`;
        throw Object.assign(new Error(serverMessage), { etapa: 'UPLOAD_HTTP' });
      }

      // 3. Guardar únicamente la URL corta (/api/sync/image?key=...)
      const shortUrl = result.url;
      onPhotoChange?.(shortUrl, null);
      onImageSelected?.(null, shortUrl);
      onChange?.(shortUrl);
    } catch (err) {
      const etapa = err?.etapa || currentEtapa || 'LECTURA';
      const diag = err?.diagnostico || diagSnapshot;
      const msg = err?.message || 'Ocurrió un error al subir la fotografía.';
      const diagnosticText = `Etapa: ${etapa} | Archivo: ${diag.name} (${diag.sizeMB} MB) | MIME: ${diag.mime || 'vacío'} | Firma: ${diag.detectedFormat} | Error: ${msg}`;
      console.error('Error al procesar/subir fotografía:', diagnosticText, err);
      setUploadError(diagnosticText);
    } finally {
      setIsProcessing(false);
      if (inputEl) {
        inputEl.value = '';
      }
    }
  };

  const handleRemove = async () => {
    if (readOnly) return;
    const confirmed = await customConfirm({
      title: 'Eliminar fotografía',
      message: '¿Eliminar esta fotografía? Se borrará del elemento y de la nube.',
      confirmText: 'Sí, Eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    });
    if (!confirmed) return;

    const freshToken =
      useStore.getState().token ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : '') ||
      '';
    if (activeSrc) {
      eliminarImagenEnR2Cliente(activeSrc, freshToken);
    }

    setUploadError(null);
    onRemove?.();
    onPhotoChange?.(null, null);
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
          <span className="text-xs font-bold">{processingStep || 'Procesando y subiendo imagen...'}</span>
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
            <div className="absolute top-2 right-2 flex items-center gap-1.5 no-print z-10">
              <label
                className="px-2.5 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-500/40 rounded-xl shadow-lg transition-all cursor-pointer backdrop-blur-xs active:scale-95 text-[11px] font-bold flex items-center gap-1"
                title="Cambiar fotografía"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Cambiar</span>
                <input
                  type="file"
                  accept="image/*,.heic,.heif,.webp,.avif"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <button
                type="button"
                onClick={handleRemove}
                className="p-2 bg-red-600/95 hover:bg-red-500 text-white rounded-xl shadow-lg transition-all cursor-pointer backdrop-blur-xs active:scale-95 border border-red-400/40"
                title="Eliminar Fotografía"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
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
                  accept="image/*,.heic,.heif,.webp,.avif"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>
      )}

      {uploadError && (
        <div className="no-print flex items-start justify-between gap-2 text-[11px] font-mono text-rose-300 bg-rose-950/60 border border-rose-500/40 rounded-xl px-3 py-2.5 text-left break-words">
          <span className="leading-relaxed">{uploadError}</span>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="shrink-0 p-1 rounded-lg hover:bg-rose-900/60 text-rose-300 hover:text-white cursor-pointer"
            title="Cerrar diagnóstico"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
