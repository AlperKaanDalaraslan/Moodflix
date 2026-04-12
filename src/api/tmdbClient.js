import {TMDB_API_KEY} from '../config/tmdb';

const BASE = 'https://api.themoviedb.org/3';

function regionFromLanguageTag(language) {
  const m = /^[a-z]{2,3}-([A-Z]{2})$/i.exec(String(language ?? ''));
  return m ? m[1].toUpperCase() : null;
}

function buildUrl(path, language, params = {}) {
  const key = TMDB_API_KEY.trim();
  if (!key) {
    throw new Error('TMDB_API_KEY_MISSING');
  }
  const u = new URL(`${BASE}${path}`);
  u.searchParams.set('api_key', key);
  u.searchParams.set('language', language);
  const region = regionFromLanguageTag(language);
  if (region) {
    u.searchParams.set('region', region);
  }
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

export function fetchTrendingMovies(language, page = 1) {
  return getJson(buildUrl('/trending/movie/week', language, {page}));
}

function isoAddDays(isoDate, deltaDays) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

function todayIsoUtc() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Ana sayfa satırları: varsayılan TMDB listeleri veya filtre/sıralama ile discover.
 * @param {string} language
 * @param {'trending'|'popular'|'topRated'|'nowPlaying'|'upcoming'} categoryId
 * @param {number} page
 * @param {{sort?: 'default'|'popularity'|'vote_average'|'release_date', minVote?: number, genreId?: number|null}} [opts]
 */
export function fetchCategoryBrowse(language, categoryId, page, opts = {}) {
  const sort = opts.sort ?? 'default';
  const minVote = Number(opts.minVote) || 0;
  const genreRaw = opts.genreId;
  const genreId =
    genreRaw != null && genreRaw !== '' && Number.isFinite(Number(genreRaw)) && Number(genreRaw) > 0
      ? Number(genreRaw)
      : null;
  const useDiscover = sort !== 'default' || minVote > 0 || genreId != null;

  if (!useDiscover) {
    switch (categoryId) {
      case 'trending':
        return fetchTrendingMovies(language, page);
      case 'popular':
        return fetchPopular(language, page);
      case 'topRated':
        return fetchTopRated(language, page);
      case 'nowPlaying':
        return fetchNowPlaying(language, page);
      case 'upcoming':
        return fetchUpcoming(language, page);
      default:
        throw new Error(`Unknown category: ${categoryId}`);
    }
  }

  const today = todayIsoUtc();
  const sortByExplicit = {
    popularity: 'popularity.desc',
    vote_average: 'vote_average.desc',
    release_date: 'primary_release_date.desc',
  };
  const voteGte = minVote > 0 ? minVote : undefined;

  /** @type {Record<string, string|number>} */
  const d = {page};

  switch (categoryId) {
    case 'trending': {
      d.sort_by = sort === 'default' ? 'popularity.desc' : sortByExplicit[sort] ?? 'popularity.desc';
      if (voteGte !== undefined) {
        d['vote_average.gte'] = voteGte;
      }
      if (voteGte !== undefined || sort === 'vote_average') {
        d['vote_count.gte'] = 120;
      }
      break;
    }
    case 'popular': {
      d.sort_by = sort === 'default' ? 'popularity.desc' : sortByExplicit[sort] ?? 'popularity.desc';
      if (voteGte !== undefined) {
        d['vote_average.gte'] = voteGte;
      }
      if (voteGte !== undefined || sort === 'vote_average') {
        d['vote_count.gte'] = 80;
      }
      break;
    }
    case 'topRated': {
      d.sort_by = sort === 'default' ? 'vote_average.desc' : sortByExplicit[sort] ?? 'vote_average.desc';
      d['vote_count.gte'] = 200;
      if (voteGte !== undefined) {
        d['vote_average.gte'] = voteGte;
      }
      break;
    }
    case 'nowPlaying': {
      d.sort_by = sort === 'default' ? 'popularity.desc' : sortByExplicit[sort] ?? 'popularity.desc';
      d['primary_release_date.lte'] = today;
      d['primary_release_date.gte'] = isoAddDays(today, -150);
      d.with_release_type = '2|3';
      if (voteGte !== undefined) {
        d['vote_average.gte'] = voteGte;
      }
      break;
    }
    case 'upcoming': {
      const horizon = isoAddDays(today, 730);
      d['primary_release_date.gte'] = today;
      d['primary_release_date.lte'] = horizon;
      if (sort === 'default') {
        d.sort_by = 'primary_release_date.asc';
      } else if (sort === 'release_date') {
        d.sort_by = 'primary_release_date.desc';
      } else {
        d.sort_by = sortByExplicit[sort] ?? 'primary_release_date.asc';
      }
      if (voteGte !== undefined) {
        d['vote_average.gte'] = voteGte;
      }
      break;
    }
    default:
      throw new Error(`Unknown category: ${categoryId}`);
  }

  if (genreId != null) {
    d.with_genres = String(genreId);
  }

  return discoverMovies(language, d);
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
  const primary = String(language ?? 'en')
    .split('-')[0]
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  const include = ['en', 'tr', primary || 'en', 'null'].filter(
    (v, i, a) => a.indexOf(v) === i,
  );
  return getJson(
    buildUrl(`/movie/${id}/videos`, language, {
      include_video_language: include.join(','),
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
  const skipEnFallback = /^en\b/i.test(String(locale ?? ''));
  const [loc, en] = await Promise.all([
    fetchMovieVideos(locale, id).catch(() => ({results: []})),
    skipEnFallback
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
  if (params['vote_count.gte'] !== undefined) {
    flat['vote_count.gte'] = params['vote_count.gte'];
  }
  if (params.with_release_type) {
    flat.with_release_type = params.with_release_type;
  }
  return getJson(buildUrl('/discover/movie', language, flat));
}
