import React, { useState, useEffect } from 'react';
import { Camera, Image as ImageIcon, X, AlertCircle } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext';

// Renderizado seguro de imágenes con soporte para File / Blob / Data URL / URL remota
export const SafePreviewImage = ({ blob, src, alt, className }) => {
  const [objectUrl, setObjectUrl] = useState(null);

  useEffect(() => {
    if (blob instanceof Blob || blob instanceof File) {
      const url = URL.createObjectURL(blob);
      setObjectUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setObjectUrl(null);
    }
  }, [blob]);

  const finalSrc = objectUrl || src;
  if (!finalSrc) return null;

  return <img src={finalSrc} alt={alt || "Evidencia fotográfica"} className={className} />;
};

export default function DualPhotoUploader({
  fotoBlob,
  fotoSrc,
  previewUrl,
  onImageSelected,
  onRemove,
  readOnly = false,
  label = "Evidencia Fotográfica",
  sublabel = "Captura con cámara en vivo o selecciona un archivo desde tu galería/dispositivo",
  maxSizeMB = 10,
  className = ""
}) {
  const { alert: customAlert } = useConfirm();

  const handleFileChange = (e) => {
    if (readOnly) return;
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      customAlert(`La imagen seleccionada supera los ${maxSizeMB}MB. Por favor elija un archivo más liviano.`);
      return;
    }

    if (onImageSelected) {
      onImageSelected(file);
    }
    // Reset file input value so selecting the same file triggers onChange
    e.target.value = '';
  };

  const hasPhoto = !!(fotoBlob || fotoSrc || previewUrl);

  return (
    <div className={`space-y-3 font-sans ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-amber-500" />
            {label}
          </span>
          {sublabel && (
            <span className="text-[10px] text-slate-500 hidden sm:inline">
              {sublabel}
            </span>
          )}
        </div>
      )}

      {hasPhoto ? (
        <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950/80 shadow-xl group max-w-md mx-auto">
          <SafePreviewImage
            blob={fotoBlob}
            src={previewUrl || fotoSrc}
            alt={label}
            className="w-full h-auto max-h-80 object-cover rounded-2xl"
          />

          {!readOnly && (
            <div className="absolute top-2 right-2 flex items-center gap-1.5 no-print">
              <button
                type="button"
                onClick={onRemove}
                className="p-1.5 bg-red-600/90 hover:bg-red-500 text-white rounded-xl shadow-lg transition-all cursor-pointer backdrop-blur-xs active:scale-95"
                title="Eliminar Fotografía"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
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
