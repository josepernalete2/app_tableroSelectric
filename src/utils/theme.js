export const THEME_STORAGE_KEY = 'theme_mode';

/**
 * Reads persisted theme preference ('light' | 'dark'), defaulting to 'dark'.
 */
export function getStoredTheme() {
  if (typeof window === 'undefined') return 'dark';
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

/**
 * Applies theme class, dataset, color-scheme, meta theme-color, and persists to localStorage.
 */
export function applyTheme(mode) {
  const next = mode === 'light' ? 'light' : 'dark';
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(next);
    root.dataset.theme = next;
    root.style.colorScheme = next;

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', next === 'light' ? '#ffffff' : '#0f172a');
    }
  }
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Ignore storage quota / privacy mode errors
    }
    window.dispatchEvent(new CustomEvent('selectric-theme-change', { detail: next }));
  }
  return next;
}

