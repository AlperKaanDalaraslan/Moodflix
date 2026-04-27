/**
 * Backend profil listelerindeki film satırlarını TMDB kart şekline yaklaştırır.
 * @param {object} m
 * @returns {{ id: string | number, title: string, poster_path: string | null } | null}
 */
export function normalizeServerMovie(m) {
  if (!m || typeof m !== 'object') {
    return null;
  }
  const rawId = m.movieId ?? m.movie_id ?? m.id;
  if (rawId == null || rawId === '') {
    return null;
  }
  const numId = Number(rawId);
  const id = Number.isFinite(numId) ? numId : String(rawId);
  const poster =
    m.posterPath ?? m.poster_path ?? m.poster ?? null;
  return {
    id,
    title: String(m.title ?? ''),
    poster_path: typeof poster === 'string' && poster ? poster : null,
  };
}

/**
 * @param {unknown} list
 * @param {string | number} movieId
 */
export function idInMovieList(list, movieId) {
  if (!Array.isArray(list)) {
    return false;
  }
  const target = movieIdentityKey(movieId);
  if (!target) {
    return false;
  }
  return list.some(entry => {
    const candidate =
      typeof entry === 'object' && entry
        ? entry.movieId ?? entry.movie_id ?? entry.id
        : entry;
    return movieIdentityKey(candidate) === target;
  });
}

export function movieIdentityKey(movieId) {
  if (movieId == null || movieId === '') {
    return '';
  }
  const s = String(movieId).trim();
  if (!s) {
    return '';
  }
  const n = Number(s);
  return Number.isFinite(n) ? String(n) : s;
}

/**
 * @param {object} movie TMDB liste veya detay
 * @param {Record<number, string>} [genreById]
 * @returns {string[]}
 */
export function genreNamesFromMovie(movie, genreById = {}) {
  if (!movie || typeof movie !== 'object') {
    return [];
  }
  const fromNamed = movie.genres;
  if (Array.isArray(fromNamed) && fromNamed.length) {
    return fromNamed.map(g => (typeof g === 'string' ? g : g?.name)).filter(Boolean);
  }
  const ids = movie.genre_ids;
  if (!Array.isArray(ids)) {
    return [];
  }
  return ids.map(id => genreById[id]).filter(Boolean);
}
