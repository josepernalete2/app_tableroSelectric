// Gestor de Opciones Rápidas y Autoguardado de Valores Personalizados
// Permite que cualquier valor escrito libremente por el usuario (tensiones, marcas, calibres, etc.)
// quede almacenado localmente como opción frecuente para futuros registros.

const STORAGE_PREFIX = 'app_custom_options_';

/**
 * Obtiene las opciones combinadas (predeterminadas + guardadas por el usuario)
 * @param {string} category Clave de la categoría (ej: 'tensiones', 'marcas', 'calibres')
 * @param {string[]} defaultOptions Lista de opciones por defecto
 * @returns {string[]} Lista ordenada y sin duplicados
 */
export const getCustomOptions = (category, defaultOptions = []) => {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${category}`);
    const saved = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(saved)) return defaultOptions;

    // Unir sin duplicados (case-sensitive preservado, pero comparando trim)
    const combined = [...defaultOptions];
    saved.forEach(opt => {
      if (typeof opt === 'string' && opt.trim()) {
        const trimmed = opt.trim();
        if (!combined.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
          combined.push(trimmed);
        }
      }
    });

    return combined;
  } catch (err) {
    console.warn(`[customPresets] Error cargando opciones para ${category}:`, err);
    return defaultOptions;
  }
};

/**
 * Guarda automáticamente un nuevo valor personalizado en la categoría indicada
 * @param {string} category Clave de la categoría
 * @param {string} value Valor a guardar
 * @param {string[]} defaultOptions Lista de opciones por defecto para evitar redundancias
 * @returns {boolean} true si se agregó un nuevo valor
 */
export const saveCustomOption = (category, value, defaultOptions = []) => {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length < 2) return false;

  // Si ya existe en las opciones por defecto, no hace falta guardar
  if (defaultOptions.some(d => d.toLowerCase() === trimmed.toLowerCase())) {
    return false;
  }

  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${category}`);
    const saved = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(saved) ? saved : [];

    // Si ya existe en las guardadas, no duplicar
    if (list.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      return false;
    }

    // Agregar al inicio para que aparezca entre las más recientes (máximo 30 por categoría)
    const updated = [trimmed, ...list].slice(0, 30);
    localStorage.setItem(`${STORAGE_PREFIX}${category}`, JSON.stringify(updated));

    // Disparar evento para que otros componentes sincronizados se actualicen
    window.dispatchEvent(new CustomEvent('custom_options_updated', { detail: { category, value: trimmed } }));
    return true;
  } catch (err) {
    console.warn(`[customPresets] Error guardando opción en ${category}:`, err);
    return false;
  }
};

/**
 * Elimina una opción personalizada guardada
 */
export const removeCustomOption = (category, value) => {
  if (!value) return;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${category}`);
    const saved = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(saved)) return;

    const filtered = saved.filter(s => s.toLowerCase() !== value.trim().toLowerCase());
    localStorage.setItem(`${STORAGE_PREFIX}${category}`, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('custom_options_updated', { detail: { category } }));
  } catch (err) {
    console.warn(`[customPresets] Error eliminando opción en ${category}:`, err);
  }
};
