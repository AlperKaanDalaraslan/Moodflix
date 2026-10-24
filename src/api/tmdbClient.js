import {TMDB_API_BASE, TMDB_API_KEY} from '../config/tmdb';

function regionFromLanguageTag(language) {
  const m = /^[a-z]{2,3}-([A-Z]{2})$/i.exec(String(language ?? ''));
  return m ? m[1].toUpperCase() : null;
}

function buildUrl(path, language, params = {}) {
  const key = TMDB_API_KEY.trim();
  if (!key) {
    throw new Error('TMDB_API_KEY_MISSING');
  }
  const u = new URL(`${TMDB_API_BASE}${path}`);
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

export function asCatalogItem(raw, mediaTypeHint) {
  if (!raw || raw.id == null) {
    return null;
  }
  if (raw.media_type === 'person') {
    return null;
  }
  let type = mediaTypeHint;
  if (raw.media_type === 'tv' || raw.media_type === 'movie') {
    type = raw.media_type;
  }
  if (!type) {
    type =
      (raw.first_air_date && !raw.release_date) || (raw.name && !raw.title)
        ? 'tv'
        : 'movie';
  }
  if (type !== 'tv' && type !== 'movie') {
    return null;
  }
  const title = type === 'tv' ? raw.name || raw.title : raw.title || raw.name;
  return {
    ...raw,
    media_type: type,
    title: title || '',
    original_title:
      type === 'tv'
        ? raw.original_name || raw.original_title
        : raw.original_title || raw.original_name,
    release_date: raw.release_date || raw.first_air_date || null,
    name: title || raw.name,
  };
}

function mergeCatalogPages(movieRes, tvRes) {
  const movies = (movieRes?.results || [])
    .map(row => asCatalogItem(row, 'movie'))
    .filter(Boolean);
  const shows = (tvRes?.results || [])
    .map(row => asCatalogItem(row, 'tv'))
    .filter(Boolean);
  const mixed = [...movies, ...shows].sort(
    (a, b) => Number(b.popularity || 0) - Number(a.popularity || 0),
  );
  const seen = new Set();
  const results = [];
  for (const item of mixed) {
    const key = `${item.media_type}:${item.id}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    results.push(item);
  }
  return {
    page: movieRes?.page || tvRes?.page || 1,
    total_pages: Math.max(movieRes?.total_pages || 1, tvRes?.total_pages || 1),
    total_results:
      Number(movieRes?.total_results || 0) + Number(tvRes?.total_results || 0),
    results,
  };
}

/** Film tür id → dizi discover karşılığı (ortak id’ler aynı kalır). */
function mapGenresForTv(withGenres) {
  if (!withGenres) {
    return withGenres;
  }
  const movieToTv = {
    28: 10759,
    12: 10759,
    14: 10765,
    878: 10765,
    10751: 10762,
    10752: 10768,
    36: 10768,
    27: 9648,
    53: 80,
    10749: 18,
    10402: 35,
    10770: 35,
  };
  const ids = String(withGenres)
    .split(',')
    .map(s => Number(s.trim()))
    .filter(n => Number.isFinite(n) && n > 0)
    .map(id => movieToTv[id] ?? id);
  return [...new Set(ids)].join(',');
}

function flattenDiscoverMovie(params) {
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
  if (params.with_keywords) {
    flat.with_keywords = params.with_keywords;
  }
  if (params.watch_region) {
    flat.watch_region = params.watch_region;
    flat.with_watch_monetization_types =
      params.with_watch_monetization_types || 'flatrate|free|ads|rent|buy';
  }
  return flat;
}

function flattenDiscoverTv(params) {
  const sort = String(params.sort_by ?? 'popularity.desc').replace(
    'primary_release_date',
    'first_air_date',
  );
  const flat = {
    sort_by: sort,
    page: params.page ?? 1,
  };
  const genres = params.tv_genres || mapGenresForTv(params.with_genres);
  if (genres) {
    flat.with_genres = genres;
  }
  const gte =
    params['first_air_date.gte'] || params['primary_release_date.gte'];
  const lte =
    params['first_air_date.lte'] || params['primary_release_date.lte'];
  if (gte) {
    flat['first_air_date.gte'] = gte;
  }
  if (lte) {
    flat['first_air_date.lte'] = lte;
  }
  if (params['vote_average.gte'] !== undefined) {
    flat['vote_average.gte'] = params['vote_average.gte'];
  }
  if (params['vote_count.gte'] !== undefined) {
    flat['vote_count.gte'] = params['vote_count.gte'];
  }
  if (params.with_keywords) {
    flat.with_keywords = params.with_keywords;
  }
  if (params.watch_region) {
    flat.watch_region = params.watch_region;
    flat.with_watch_monetization_types =
      params.with_watch_monetization_types || 'flatrate|free|ads|rent|buy';
  }
  return flat;
}

export function hasApiKey() {
  return TMDB_API_KEY.trim().length > 0;
}

export async function fetchTrendingMovies(language, page = 1) {
  const region = regionFromLanguageTag(language);
  const params = {
    page,
    sort_by: 'popularity.desc',
    'vote_count.gte': 40,
  };
  if (region) {
    params.watch_region = region;
    params.with_watch_monetization_types = 'flatrate|free|ads|rent|buy';
  }
  return discoverMovies(language, params);
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
      const region = regionFromLanguageTag(language);
      if (region) {
        d.watch_region = region;
        d.with_watch_monetization_types = 'flatrate|free|ads|rent|buy';
      }
      if (voteGte !== undefined) {
        d['vote_average.gte'] = voteGte;
      }
      if (voteGte !== undefined || sort === 'vote_average') {
        d['vote_count.gte'] = 120;
      } else {
        d['vote_count.gte'] = 40;
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

  return discoverMovies(language, d, {moviesOnly: categoryId === 'nowPlaying'});
}

export async function fetchTopRated(language, page = 1) {
  const [movies, shows] = await Promise.all([
    getJson(buildUrl('/movie/top_rated', language, {page})),
    getJson(buildUrl('/tv/top_rated', language, {page})),
  ]);
  return mergeCatalogPages(movies, shows);
}

export async function fetchGenreList(language) {
  const [movies, shows] = await Promise.all([
    getJson(buildUrl('/genre/movie/list', language)),
    getJson(buildUrl('/genre/tv/list', language)),
  ]);
  const byId = new Map();
  for (const g of [...(movies.genres || []), ...(shows.genres || [])]) {
    if (g?.id != null && !byId.has(g.id)) {
      byId.set(g.id, g);
    }
  }
  return {
    genres: [...byId.values()].sort((a, b) =>
      String(a.name).localeCompare(String(b.name), language),
    ),
  };
}

export async function fetchPopular(language, page = 1) {
  const [movies, shows] = await Promise.all([
    getJson(buildUrl('/movie/popular', language, {page})),
    getJson(buildUrl('/tv/popular', language, {page})),
  ]);
  return mergeCatalogPages(movies, shows);
}

export async function fetchNowPlaying(language, page = 1) {
  const movies = await getJson(buildUrl('/movie/now_playing', language, {page}));
  return mergeCatalogPages(movies, {results: []});
}

export async function fetchUpcoming(language, page = 1) {
  const today = todayIsoUtc();
  const [movies, shows] = await Promise.all([
    getJson(buildUrl('/movie/upcoming', language, {page})),
    getJson(
      buildUrl('/discover/tv', language, {
        page,
        sort_by: 'first_air_date.asc',
        'first_air_date.gte': today,
        'first_air_date.lte': isoAddDays(today, 730),
      }),
    ),
  ]);
  return mergeCatalogPages(movies, shows);
}

export function searchMovies(language, query, page = 1) {
  return getJson(
    buildUrl('/search/movie', language, {query, page, include_adult: 'false'}),
  );
}

export function searchTv(language, query, page = 1) {
  return getJson(
    buildUrl('/search/tv', language, {query, page, include_adult: 'false'}),
  );
}

function foldSearchText(input) {
  return String(input ?? '')
    .toLocaleLowerCase('tr-TR')
    .replace(/[ıİ]/g, 'i')
    .replace(/[şŞ]/g, 's')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[çÇ]/g, 'c')
    .replace(/[öÖ]/g, 'o')
    .replace(/[üÜ]/g, 'u')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function asSearchItem(raw, mediaType) {
  if (!raw || raw.id == null) {
    return null;
  }
  const isTv = mediaType === 'tv';
  const title = isTv ? raw.name || raw.title : raw.title || raw.name;
  const original = isTv
    ? raw.original_name || raw.original_title
    : raw.original_title || raw.original_name;
  const year = String(raw.release_date || raw.first_air_date || '').slice(0, 4);
  return {
    id: raw.id,
    media_type: isTv ? 'tv' : 'movie',
    title: title || '',
    original_title: original || title || '',
    poster_path: raw.poster_path ?? null,
    vote_average: raw.vote_average,
    popularity: raw.popularity,
    genre_ids: Array.isArray(raw.genre_ids) ? raw.genre_ids : [],
    release_date: raw.release_date || raw.first_air_date || null,
    year,
  };
}

function compactSearchText(input) {
  return foldSearchText(input).replace(/ /g, '');
}

/** TMDB kelime arar; Breakingbad gibi bitişik yazımları da dener. */
function tmdbQueryVariants(query) {
  const raw = String(query ?? '').trim();
  if (!raw) {
    return [];
  }
  const folded = foldSearchText(raw);
  const camelSpaced = foldSearchText(
    raw
      .replace(/([a-zıi])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-zıi])/g, '$1 $2')
      .replace(/([a-zA-Zıiİ])(\d)/g, '$1 $2'),
  );
  const compact = compactSearchText(raw);
  const variants = [raw, folded, camelSpaced];
  if (compact.length >= 6 && !folded.includes(' ')) {
    variants.push(compact.slice(0, Math.min(8, compact.length)));
    if (compact.length >= 8) {
      variants.push(compact.slice(0, 6));
    }
    for (const particle of ['the', 'el', 'la', 'le', 'de', 'da', 'il', 'un']) {
      if (compact.startsWith(particle) && compact.length > particle.length + 2) {
        variants.push(`${particle} ${compact.slice(particle.length)}`);
        break;
      }
    }
  }
  return [...new Set(variants.map(v => String(v || '').trim()).filter(v => v.length >= 2))].slice(
    0,
    4,
  );
}

function searchScore(item, query) {
  const q = foldSearchText(query);
  const t = foldSearchText(item.title);
  const o = foldSearchText(item.original_title);
  const qC = compactSearchText(query);
  const tC = compactSearchText(item.title);
  const oC = compactSearchText(item.original_title);
  if (!qC) {
    return 0;
  }
  const compactEq = tC === qC || oC === qC;
  const compactPrefix = qC.length >= 4 && (tC.startsWith(qC) || oC.startsWith(qC));
  const compactInside = qC.length >= 6 && (tC.includes(qC) || oC.includes(qC));
  const tokens = q.split(' ').filter(Boolean);
  const inName = tok => t.includes(tok) || o.includes(tok);
  const allTokens = tokens.length > 0 && tokens.every(inName);
  if (!compactEq && !compactPrefix && !compactInside && !allTokens) {
    return 0;
  }
  if (t === q || o === q || compactEq) {
    return 100;
  }
  if (t.startsWith(q) || o.startsWith(q) || compactPrefix) {
    return 88;
  }
  if ((tokens.length > 1 && (t.includes(q) || o.includes(q))) || compactInside) {
    return 72;
  }
  return 48;
}

const SEARCH_SCORE_FLOOR = 40;

function mergeLangResults(primaryRows, englishRows, mediaType) {
  const byId = new Map();
  for (const raw of englishRows || []) {
    const item = asSearchItem(raw, mediaType);
    if (item) {
      byId.set(item.id, item);
    }
  }
  for (const raw of primaryRows || []) {
    const item = asSearchItem(raw, mediaType);
    if (!item) {
      continue;
    }
    const prev = byId.get(item.id);
    byId.set(item.id, {
      ...(prev || {}),
      ...item,
      original_title: item.original_title || prev?.original_title,
    });
  }
  return [...byId.values()];
}

function dedupeCatalog(items) {
  const byKey = new Map();
  const fingerprints = new Set();
  for (const item of items) {
    const idKey = `${item.media_type}:${item.id}`;
    if (byKey.has(idKey)) {
      continue;
    }
    const fp = `${item.media_type}:${foldSearchText(item.original_title || item.title)}:${item.year || ''}`;
    if (fp.endsWith(':')) {
      /* year yoksa sadece id ile tut */
    } else if (fingerprints.has(fp)) {
      continue;
    }
    fingerprints.add(fp);
    byKey.set(idKey, item);
  }
  return [...byKey.values()];
}

/** Film + dizi, TR + EN; ada göre alaka, tam eşleşme ve bitişik yazım en üstte. */
export async function searchMoviesForQuery(language, query, page = 1) {
  const lang = String(language || 'tr-TR');
  const wantEn = !lang.toLowerCase().startsWith('en');
  const variants = tmdbQueryVariants(query);
  const tasks = [];
  for (const variant of variants) {
    tasks.push(searchMovies(lang, variant, page), searchTv(lang, variant, page));
    if (wantEn) {
      tasks.push(
        searchMovies('en-US', variant, page),
        searchTv('en-US', variant, page),
      );
    }
  }
  const responses = await Promise.all(
    tasks.map(p => p.catch(() => ({results: []}))),
  );
  const movieLocal = [];
  const movieEn = [];
  const tvLocal = [];
  const tvEn = [];
  const stride = wantEn ? 4 : 2;
  for (let i = 0; i < responses.length; i += stride) {
    movieLocal.push(...(responses[i]?.results || []));
    tvLocal.push(...(responses[i + 1]?.results || []));
    if (wantEn) {
      movieEn.push(...(responses[i + 2]?.results || []));
      tvEn.push(...(responses[i + 3]?.results || []));
    }
  }
  const movies = mergeLangResults(movieLocal, movieEn, 'movie');
  const shows = mergeLangResults(tvLocal, tvEn, 'tv');
  const merged = dedupeCatalog([...shows, ...movies])
    .map(item => ({...item, _score: searchScore(item, query)}))
    .filter(item => item._score >= SEARCH_SCORE_FLOOR)
    .sort((a, b) => {
      if (b._score !== a._score) {
        return b._score - a._score;
      }
      return Number(b.popularity || 0) - Number(a.popularity || 0);
    })
    .map(({_score, ...rest}) => rest);
  return {results: merged};
}

export function fetchMovieDetail(language, id) {
  return getJson(
    buildUrl(`/movie/${id}`, language, {
      append_to_response: 'credits,videos',
    }),
  );
}

export function fetchTvDetail(language, id) {
  return getJson(
    buildUrl(`/tv/${id}`, language, {
      append_to_response: 'credits,videos',
    }),
  );
}

/** TMDB kişi: biyografi, doğum, birleşik filmografi. Biyografi dilde yoksa İngilizce metin dolar. */
export async function fetchPersonDetail(language, id) {
  const primary = await getJson(
    buildUrl(`/person/${id}`, language, {append_to_response: 'combined_credits'}),
  );
  const hasBio = String(primary?.biography || '').trim().length > 0;
  if (hasBio || /^en\b/i.test(String(language || ''))) {
    return primary;
  }
  const english = await getJson(
    buildUrl(`/person/${id}`, 'en-US', {append_to_response: 'combined_credits'}),
  ).catch(() => null);
  if (!english) {
    return primary;
  }
  return {
    ...primary,
    biography: english.biography || primary.biography || '',
  };
}

export async function fetchTitleDetail(language, id, mediaType = 'movie') {
  if (mediaType === 'tv') {
    const raw = await fetchTvDetail(language, id);
    return {
      ...raw,
      media_type: 'tv',
      title: raw.name || raw.title,
      original_title: raw.original_name || raw.original_title,
      release_date: raw.first_air_date || raw.release_date,
      runtime: Array.isArray(raw.episode_run_time)
        ? raw.episode_run_time[0]
        : raw.runtime,
      genre_ids: Array.isArray(raw.genre_ids)
        ? raw.genre_ids
        : (raw.genres || []).map(g => g.id).filter(Boolean),
    };
  }
  const raw = await fetchMovieDetail(language, id);
  return {
    ...raw,
    media_type: 'movie',
    genre_ids: Array.isArray(raw.genre_ids)
      ? raw.genre_ids
      : (raw.genres || []).map(g => g.id).filter(Boolean),
  };
}

/** Lightweight trailer lookup (movie/tv detail / swipe). */
export function fetchMovieVideos(language, id, extraParams = {}) {
  return fetchTitleVideos(language, id, 'movie', extraParams);
}

export function fetchTitleVideos(language, id, mediaType = 'movie', extraParams = {}) {
  const primary = String(language ?? 'en')
    .split('-')[0]
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  const include = ['en', 'tr', primary || 'en', 'null'].filter(
    (v, i, a) => a.indexOf(v) === i,
  );
  const path = mediaType === 'tv' ? `/tv/${id}/videos` : `/movie/${id}/videos`;
  return getJson(
    buildUrl(path, language, {
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
export async function fetchTitleVideosForSwipe(locale, id, mediaType = 'movie') {
  const skipEnFallback = /^en\b/i.test(String(locale ?? ''));
  const [loc, en] = await Promise.all([
    fetchTitleVideos(locale, id, mediaType).catch(() => ({results: []})),
    skipEnFallback
      ? Promise.resolve({results: []})
      : fetchTitleVideos('en-US', id, mediaType).catch(() => ({results: []})),
  ]);
  return mergeVideoResultsByKey(loc.results, en.results);
}

export function fetchMovieVideosForSwipe(locale, id) {
  return fetchTitleVideosForSwipe(locale, id, 'movie');
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

export async function discoverMovies(language, params, options = {}) {
  const movies = getJson(buildUrl('/discover/movie', language, flattenDiscoverMovie(params)));
  if (options.moviesOnly) {
    return mergeCatalogPages(await movies, {results: []});
  }
  const [moviePage, shows] = await Promise.all([
    movies,
    getJson(buildUrl('/discover/tv', language, flattenDiscoverTv(params))),
  ]);
  return mergeCatalogPages(moviePage, shows);
}

const keywordIdCache = new Map();

/** Serbest cümledeki havayı TMDB anahtar kelime id’lerine çevirir. */
export async function fetchKeywordIds(language, queries) {
  const ids = [];
  for (const query of queries || []) {
    const key = foldKeyword(query);
    if (!key) {
      continue;
    }
    if (!keywordIdCache.has(key)) {
      const json = await getJson(buildUrl('/search/keyword', 'en-US', {query: key})).catch(
        () => ({results: []}),
      );
      const found = (json.results || [])
        .filter(row => row?.id && foldKeyword(row.name) === key)
        .map(row => row.id);
      keywordIdCache.set(key, found.slice(0, 1));
    }
    ids.push(...keywordIdCache.get(key));
  }
  return [...new Set(ids)].slice(0, 8);
}

function foldKeyword(value) {
  return String(value || '')
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
