export const BRAND = {
  name: 'Connecting Dot',
  poweredBy: 'SCCG',
  tagline: 'Professional Podcast Studio Platform',
} as const;

export const COLORS = {
  primaryBlue: '#FFFFFF', // Updated to white for UI consistency
  darkBlue: '#003875',
  lightBlue: '#E8F1FB',
  white: '#FFFFFF',
  silver: '#94A3B8',
  darkText: '#0F172A',
  liveRed: '#FF4D4D',
  green: '#10B981',
  bg: '#050A15',
  glass: 'rgba(255, 255, 255, 0.05)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  youtube: '#FF0000',
  facebook: '#1877F2',
  instagram: '#E4405F',
} as const;

export const FONTS = {
  display: "'Outfit', sans-serif",
  ui: "'Inter', sans-serif",
  serif: "'Playfair Display', serif",
} as const;

/**
 * API_BASE: Resolved at runtime from /api-config.json if available,
 * otherwise falls back to the build-time VITE_API_BASE env var,
 * then to localhost:3001 for local dev.
 *
 * This means when the tunnel URL changes, just update public/api-config.json
 * and `firebase deploy` — no rebuild needed.
 */
let _apiBase = (import.meta.env.VITE_API_BASE as string | undefined) ?? 'http://localhost:3001';
let _configLoaded = false;

export const loadApiConfig = async () => {
  if (_configLoaded) return;
  try {
    const res = await fetch('/api-config.json', { cache: 'no-cache' });
    if (res.ok) {
      const config = await res.json();
      if (config.apiBase) _apiBase = config.apiBase;
    }
  } catch { /* use build-time fallback */ }
  _configLoaded = true;
};

export const getApiBase = () => _apiBase;

// For backward-compat — will be correct after loadApiConfig() resolves
export let API_BASE = _apiBase;
export const refreshApiBase = () => { API_BASE = _apiBase; };

export const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL ?? '';

/** Optional default host key for admin actions during local dev. */
export const DEFAULT_HOST_KEY = (import.meta.env.VITE_HOST_KEY as string | undefined) ?? '';
