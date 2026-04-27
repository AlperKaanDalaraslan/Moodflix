/**
 * Moodflix backend kökü + auth / profil önekleri.
 * `.env`: MOODFLIX_API_BASE_URL, MOODFLIX_AUTH_API_PREFIX, MOODFLIX_PROFILE_API_PREFIX
 */
import {
  MOODFLIX_API_BASE_URL,
  MOODFLIX_AUTH_API_PREFIX,
  MOODFLIX_PROFILE_API_PREFIX,
} from '@env';

/** Login, register, profil — aynı host (varsayılan port 3001). */
export const AUTH_LOCAL_BASE_DEFAULT = 'http://localhost:3001';

function trimEndSlashes(s) {
  return String(s ?? '')
    .trim()
    .replace(/\/+$/, '');
}

function ensureLeadingSlash(s, fallback) {
  const t = String(s ?? '').trim();
  if (!t) {
    return fallback;
  }
  return t.startsWith('/') ? t : `/${t}`;
}

export const AUTH_API_BASE = trimEndSlashes(
  MOODFLIX_API_BASE_URL || AUTH_LOCAL_BASE_DEFAULT,
);

export const AUTH_PATH_PREFIX = trimEndSlashes(
  ensureLeadingSlash(MOODFLIX_AUTH_API_PREFIX, '/api/auth'),
);

/** JWT’li istekler: GET/PATCH /api/profile/me vb. Sunucu /profile ile de alias veriyorsa burayı eşleştir. */
export const PROFILE_PATH_PREFIX = trimEndSlashes(
  ensureLeadingSlash(MOODFLIX_PROFILE_API_PREFIX, '/api/profile'),
);

/**
 * @param {string} path '/register' veya 'register'
 */
export function buildAuthUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${AUTH_API_BASE}${AUTH_PATH_PREFIX}${p}`;
}

/**
 * @param {string} path '/me' veya 'me/insights'
 */
export function buildProfileUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${AUTH_API_BASE}${PROFILE_PATH_PREFIX}${p}`;
}
