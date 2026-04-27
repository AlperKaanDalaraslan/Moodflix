import {isDarkMode} from '../theme/colors';
/**
 * Profil `avatar` alanı:
 * - `mv:<theme>:<index>` film temalı avatar tokenı
 * - boş string (harf avatarı)
 * URL kullanılmaz.
 */

/** @param {string | undefined | null} s */
export function isHttpAvatarString(s) {
  return typeof s === 'string' && /^https?:\/\//i.test(s.trim());
}

/** Sunucudaki eski URL değerlerini yok say (yalnızca emoji / boş). */
export function sanitizeAvatarForUi(s) {
  if (typeof s !== 'string') {
    return '';
  }
  const t = s.trim();
  return isHttpAvatarString(t) ? '' : t;
}

export const MOVIE_AVATAR_THEMES = [
  'action',
  'sci-fi',
  'mystery',
  'romance',
  'thriller',
  'horror',
  'fantasy',
  'animation',
  'crime',
  'western',
  'adventure',
  'comedy',
  'drama',
  'history',
  'music',
  'space',
  'cyber',
  'noir',
  'retro',
  'epic',
  'future',
  'hero',
  'monster',
  'spy',
];

const MOVIE_AVATAR_PER_THEME = 5000;
const THEME_CODE = {
  action: 'AC',
  'sci-fi': 'SF',
  mystery: 'MY',
  romance: 'RO',
  thriller: 'TH',
  horror: 'HR',
  fantasy: 'FA',
  animation: 'AN',
  crime: 'CR',
  western: 'WE',
  adventure: 'AD',
  comedy: 'CO',
  drama: 'DR',
  history: 'HI',
  music: 'MU',
  space: 'SP',
  cyber: 'CY',
  noir: 'NO',
  retro: 'RE',
  epic: 'EP',
  future: 'FU',
  hero: 'HE',
  monster: 'MO',
  spy: 'SY',
};

export function getMovieAvatarPoolSize() {
  return MOVIE_AVATAR_THEMES.length * MOVIE_AVATAR_PER_THEME;
}

export function isMovieAvatarToken(s) {
  return (
    typeof s === 'string' &&
    /^mv:[a-z-]+:\d+$/i.test(s.trim())
  );
}

export function isMoviePosterAvatarToken(s) {
  return typeof s === 'string' && /^mvp:\d+:[^]+$/i.test(s.trim());
}

export function buildMoviePosterAvatarToken(movieId, posterPath) {
  const id = Math.max(1, Math.floor(Number(movieId) || 0));
  const path = String(posterPath ?? '').trim();
  if (!id || !path) {
    return '';
  }
  return `mvp:${id}:${encodeURIComponent(path)}`;
}

export function parseMoviePosterAvatarToken(token) {
  if (!isMoviePosterAvatarToken(token)) {
    return null;
  }
  const m = /^mvp:(\d+):(.+)$/i.exec(String(token).trim());
  if (!m) {
    return null;
  }
  const movieId = Number(m[1]);
  const encodedPath = m[2];
  let posterPath = '';
  try {
    posterPath = decodeURIComponent(encodedPath);
  } catch {
    posterPath = encodedPath;
  }
  if (!Number.isFinite(movieId) || !posterPath) {
    return null;
  }
  return {movieId, posterPath, token: buildMoviePosterAvatarToken(movieId, posterPath)};
}

export function buildMovieAvatarToken(theme, index) {
  const t = String(theme ?? '').trim().toLowerCase();
  const safeTheme = MOVIE_AVATAR_THEMES.includes(t) ? t : MOVIE_AVATAR_THEMES[0];
  const n = Math.max(1, Math.min(MOVIE_AVATAR_PER_THEME, Number(index) || 1));
  return `mv:${safeTheme}:${n}`;
}

export function parseMovieAvatarToken(token) {
  if (!isMovieAvatarToken(token)) {
    return null;
  }
  const [_, theme, indexRaw] = String(token).trim().split(':');
  const index = Number(indexRaw);
  if (!MOVIE_AVATAR_THEMES.includes(theme) || !Number.isFinite(index)) {
    return null;
  }
  return {
    theme,
    index: Math.max(1, Math.min(MOVIE_AVATAR_PER_THEME, Math.floor(index))),
    token: buildMovieAvatarToken(theme, index),
  };
}

export function movieAvatarCodeFromToken(token) {
  const parsed = parseMovieAvatarToken(token);
  if (!parsed) {
    return 'MV';
  }
  return THEME_CODE[parsed.theme] ?? 'MV';
}

/**
 * @param {string | undefined | null} name
 * @param {string} locale BCP-47 (örn. tr-TR)
 * @param {string | undefined | null} fallbackSeed ikinci harf için yedek (ör. kullanıcı adı)
 */
export function getAvatarInitials(name, locale, fallbackSeed = '') {
  const loc = typeof locale === 'string' && locale.length ? locale : 'en-US';
  const raw = String(name ?? '')
    .trim()
    .replace(/\s+/g, ' ');
  if (!raw) {
    const fb = String(fallbackSeed ?? '').trim() || '?';
    return fb.slice(0, 2).toLocaleUpperCase(loc);
  }
  const parts = raw.split(' ');
  if (parts.length >= 2) {
    const a = parts[0].charAt(0);
    const b = parts[parts.length - 1].charAt(0);
    return (a + b).toLocaleUpperCase(loc);
  }
  const one = parts[0];
  if (one.length >= 2) {
    return one.slice(0, 2).toLocaleUpperCase(loc);
  }
  const extra = String(fallbackSeed ?? '').trim().charAt(0);
  return (one.charAt(0) + (extra || one.charAt(0))).toLocaleUpperCase(loc);
}

/**
 * @param {string} seed
 * @param {'dark' | 'light'} theme
 */
export function initialsAvatarPalette(seed, theme) {
  const s = String(seed ?? '') || 'x';
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  const isDark = isDarkMode(theme);
  const hues = [42, 198, 280, 155, 12, 320, 210, 32];
  const hue = hues[h % hues.length];
  const bg = isDark
    ? `hsl(${hue}, 52%, 22%)`
    : `hsl(${hue}, 58%, 88%)`;
  const border = isDark ? `hsl(${hue}, 45%, 40%)` : `hsl(${hue}, 50%, 42%)`;
  const text = isDark ? `hsl(${hue}, 20%, 96%)` : `hsl(${hue}, 35%, 18%)`;
  return {bg, border, text};
}

export function movieAvatarPalette(token, theme) {
  const parsed = parseMovieAvatarToken(token);
  const id = parsed ? `${parsed.theme}-${parsed.index}` : String(token || 'mv');
  return initialsAvatarPalette(`movie:${id}`, theme);
}

export function movieAvatarTokenByOffset(offset, selectedTheme = 'all') {
  const safeOffset = Math.max(0, Math.floor(Number(offset) || 0));
  if (selectedTheme && selectedTheme !== 'all' && MOVIE_AVATAR_THEMES.includes(selectedTheme)) {
    return buildMovieAvatarToken(selectedTheme, (safeOffset % MOVIE_AVATAR_PER_THEME) + 1);
  }
  const theme = MOVIE_AVATAR_THEMES[safeOffset % MOVIE_AVATAR_THEMES.length];
  const idx = Math.floor(safeOffset / MOVIE_AVATAR_THEMES.length) % MOVIE_AVATAR_PER_THEME;
  return buildMovieAvatarToken(theme, idx + 1);
}
