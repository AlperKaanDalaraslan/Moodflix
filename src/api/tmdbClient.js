import {TMDB_API_KEY} from '../config/tmdb';

const BASE = 'https://api.themoviedb.org/3';

function buildUrl(path, language, params = {}) {
  const key = TMDB_API_KEY.trim();
  if (!key) {
    throw new Error('TMDB_API_KEY_MISSING');
  }
  const u = new URL(`${BASE}${path}`);
  u.searchParams.set('api_key', key);
  u.searchParams.set('language', language);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '') {
      continue;
    }
    u.searchParams.set(k, String(v));
  }
  return u.toString();
}

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export function hasApiKey() {
  return TMDB_API_KEY.trim().length > 0;
}

export function fetchTrendingMovies(language) {
  return getJson(buildUrl('/trending/movie/week', language));
}

export function fetchTopRated(language, page = 1) {
  return getJson(buildUrl('/movie/top_rated', language, {page}));
}

export function fetchGenreList(language) {
  return getJson(buildUrl('/genre/movie/list', language));
}

export function fetchPopular(language, page = 1) {
  return getJson(buildUrl('/movie/popular', language, {page}));
}

export function fetchNowPlaying(language, page = 1) {
  return getJson(buildUrl('/movie/now_playing', language, {page}));
}

export function fetchUpcoming(language, page = 1) {
  return getJson(buildUrl('/movie/upcoming', language, {page}));
}

export function searchMovies(language, query, page = 1) {
  return getJson(
    buildUrl('/search/movie', language, {query, page, include_adult: 'false'}),
  );
}

export function fetchMovieDetail(language, id) {
  return getJson(
    buildUrl(`/movie/${id}`, language, {
      append_to_response: 'credits,videos',
    }),
  );
}

/** Lightweight trailer lookup (movie detail / swipe). */
export function fetchMovieVideos(language, id, extraParams = {}) {
  return getJson(
    buildUrl(`/movie/${id}/videos`, language, {
      include_video_language: 'en,tr,null',
      ...extraParams,
    }),
  );
}

function mergeVideoResultsByKey(primary, secondary) {
  const seen = new Set();
  const out = [];
  for (const v of [...(primary ?? []), ...(secondary ?? [])]) {
    const k = v?.key;
    if (typeof k !== 'string' || seen.has(k)) {
      continue;
    }
    seen.add(k);
    out.push(v);
  }
  return out;
}

/**
 * Önce kullanıcı dili, sonra en-US — TMDB bazen dilde video listelemez.
 * Paralel istek; birleşik listeden `pickBestYoutubeVideoKey` ile anahtar seçilir.
 */
export async function fetchMovieVideosForSwipe(locale, id) {
  const [loc, en] = await Promise.all([
    fetchMovieVideos(locale, id).catch(() => ({results: []})),
    locale === 'en-US'
      ? Promise.resolve({results: []})
      : fetchMovieVideos('en-US', id).catch(() => ({results: []})),
  ]);
  return mergeVideoResultsByKey(loc.results, en.results);
}

const YT_VIDEO_TYPE_ORDER = [
  'Trailer',
  'Teaser',
  'Clip',
  'Featurette',
  'Behind the Scenes',
  'Bloopers',
  'Opening Credits',
  'Interview',
  'Recap',
];

/** TMDB `videos.results` içinden oynatılabilir ilk YouTube `key`. */
export function pickBestYoutubeVideoKey(results) {
  const yt = (results ?? []).filter(
    v =>
      typeof v?.key === 'string' &&
      /^[a-zA-Z0-9_-]{6,64}$/.test(v.key) &&
      (v.site === 'YouTube' || String(v.site).toLowerCase() === 'youtube'),
  );
  if (!yt.length) {
    return null;
  }
  const pickType = type => {
    const cand = yt.filter(v => v.type === type);
    if (!cand.length) {
      return null;
    }
    cand.sort(
      (a, b) =>
        Number(Boolean(b.official)) - Number(Boolean(a.official)) ||
        (b.size ?? 0) - (a.size ?? 0),
    );
    return cand[0].key;
  };
  for (const t of YT_VIDEO_TYPE_ORDER) {
    const k = pickType(t);
    if (k) {
      return k;
    }
  }
  const rest = yt.filter(v => !YT_VIDEO_TYPE_ORDER.includes(v.type));
  if (rest.length) {
    rest.sort(
      (a, b) =>
        Number(Boolean(b.official)) - Number(Boolean(a.official)) ||
        (b.size ?? 0) - (a.size ?? 0),
    );
    return rest[0].key;
  }
  yt.sort((a, b) => (b.size ?? 0) - (a.size ?? 0));
  return yt[0]?.key ?? null;
}

export function discoverMovies(language, params) {
  const flat = {
    sort_by: params.sort_by ?? 'popularity.desc',
    page: params.page ?? 1,
  };
  if (params.with_genres) {
    flat.with_genres = params.with_genres;
  }
  if (params['primary_release_date.gte']) {
    flat['primary_release_date.gte'] = params['primary_release_date.gte'];
  }
  if (params['primary_release_date.lte']) {
    flat['primary_release_date.lte'] = params['primary_release_date.lte'];
  }
  if (params['vote_average.gte'] !== undefined) {
    flat['vote_average.gte'] = params['vote_average.gte'];
  }
  return getJson(buildUrl('/discover/movie', language, flat));
}
