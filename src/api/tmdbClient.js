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
