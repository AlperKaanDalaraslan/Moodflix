import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  addFavoriteMovie,
  addLikedMovie,
  addWatchedMovie,
  getFeed,
  getInsights,
  getMe,
  patchMe,
  postMood as postMoodRequest,
  postSearch as postSearchRequest,
  removeFavoriteMovie,
  removeLikedMovie,
  removeWatchedMovie,
} from '../services/profileService';
import {idInMovieList, normalizeServerMovie} from '../utils/profileMovie';
import {useAuth} from './AuthContext';

const ProfileContext = createContext(null);

function normalizeInsights(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const candidate = raw.insights && typeof raw.insights === 'object' ? raw.insights : raw;
  const headlineGenreValue =
    candidate.headlineGenre ?? candidate.topGenre ?? candidate.genre ?? null;
  const headlineGenre =
    typeof headlineGenreValue === 'string' ? headlineGenreValue : null;

  let headlinePercent = null;
  if (typeof candidate.headlinePercent === 'number') {
    headlinePercent = candidate.headlinePercent;
  } else if (candidate.headlinePercent != null && !Number.isNaN(Number(candidate.headlinePercent))) {
    headlinePercent = Number(candidate.headlinePercent);
  } else if (
    headlineGenre &&
    candidate.genreBreakdown &&
    typeof candidate.genreBreakdown === 'object'
  ) {
    const breakdownValues = Object.values(candidate.genreBreakdown)
      .map(v => Number(v))
      .filter(v => Number.isFinite(v) && v > 0);
    const total = breakdownValues.reduce((sum, value) => sum + value, 0);
    const topValue = Number(candidate.genreBreakdown[headlineGenre]);
    if (total > 0 && Number.isFinite(topValue)) {
      headlinePercent = (topValue / total) * 100;
    }
  }

  return {
    ...candidate,
    headlineGenre,
    headlinePercent,
  };
}

export function ProfileProvider({children}) {
  const {token, isLoggedIn, hydrated} = useAuth();
  const [profile, setProfile] = useState(null);
  const [insights, setInsights] = useState(null);
  const [feed, setFeed] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const clearProfileState = useCallback(() => {
    setProfile(null);
    setInsights(null);
    setFeed(null);
    setError(null);
  }, []);

  const loadAll = useCallback(async () => {
    if (!token) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const me = await getMe(token);
      setProfile(me.profile ?? null);
      const [ins, fd] = await Promise.all([
        getInsights(token).catch(() => null),
        getFeed(token).catch(() => null),
      ]);
      setInsights(normalizeInsights(ins?.insights ?? ins ?? null));
      setFeed(fd?.feed ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PROFILE_LOAD');
      setProfile(null);
      setInsights(null);
      setFeed(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    if (!isLoggedIn || !token) {
      clearProfileState();
      return;
    }
    loadAll().catch(() => {});
  }, [hydrated, isLoggedIn, token, loadAll, clearProfileState]);

  const refreshProfile = useCallback(async () => {
    if (!token) {
      return;
    }
    try {
      const me = await getMe(token);
      setProfile(me.profile ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PROFILE_LOAD');
    }
  }, [token]);

  const refreshInsights = useCallback(async () => {
    if (!token) {
      return;
    }
    try {
      const ins = await getInsights(token);
      setInsights(normalizeInsights(ins?.insights ?? ins ?? null));
    } catch {
      /* ignore */
    }
  }, [token]);

  const refreshFeed = useCallback(async () => {
    if (!token) {
      return;
    }
    try {
      const fd = await getFeed(token);
      setFeed(fd?.feed ?? null);
    } catch {
      /* ignore */
    }
  }, [token]);

  const applyProfilePayload = useCallback(data => {
    if (data && typeof data === 'object' && data.profile) {
      setProfile(data.profile);
    }
  }, []);

  const toggleFavoriteMovie = useCallback(
    async movie => {
      if (!token || !movie?.id) {
        return;
      }
      const movieId = String(movie.id).trim();
      if (!movieId) {
        return;
      }
      const has = idInMovieList(profile?.favoriteMovies, movieId);
      const body = {
        movieId,
        title: movie.title ?? undefined,
        posterPath: movie.poster_path ?? movie.posterPath ?? undefined,
      };
      const data = has
        ? await removeFavoriteMovie(token, movieId)
        : await addFavoriteMovie(token, body);
      applyProfilePayload(data);
    },
    [token, profile, applyProfilePayload],
  );

  const addLiked = useCallback(
    async (movie, genreNames = []) => {
      if (!token || !movie?.id) {
        return;
      }
      const id = String(movie.id).trim();
      if (!id) {
        return;
      }
      const data = await addLikedMovie(token, {
        movieId: id,
        title: movie.title ?? undefined,
        genres: genreNames.length ? genreNames : undefined,
      });
      applyProfilePayload(data);
    },
    [token, applyProfilePayload],
  );

  const removeLiked = useCallback(
    async movieId => {
      if (!token) {
        return;
      }
      const id = String(movieId).trim();
      if (!id) {
        return;
      }
      const data = await removeLikedMovie(token, id);
      applyProfilePayload(data);
    },
    [token, applyProfilePayload],
  );

  const addWatched = useCallback(
    async (movie, genreNames = []) => {
      if (!token || !movie?.id) {
        return;
      }
      const id = String(movie.id).trim();
      if (!id) {
        return;
      }
      const data = await addWatchedMovie(token, {
        movieId: id,
        title: movie.title ?? undefined,
        genres: genreNames.length ? genreNames : undefined,
      });
      applyProfilePayload(data);
    },
    [token, applyProfilePayload],
  );

  const removeWatched = useCallback(
    async movieId => {
      if (!token) {
        return;
      }
      const id = String(movieId).trim();
      if (!id) {
        return;
      }
      const data = await removeWatchedMovie(token, id);
      applyProfilePayload(data);
    },
    [token, applyProfilePayload],
  );

  const patchMyProfile = useCallback(
    async body => {
      if (!token) {
        throw new Error('NO_AUTH_TOKEN');
      }
      const data = await patchMe(token, body);
      applyProfilePayload(data);
      return data.profile;
    },
    [token, applyProfilePayload],
  );

  const submitMood = useCallback(
    async body => {
      if (!token) {
        return;
      }
      try {
        const data = await postMoodRequest(token, body);
        applyProfilePayload(data);
      } catch {
        /* optional telemetry */
      }
    },
    [token, applyProfilePayload],
  );

  const submitSearchLog = useCallback(
    async query => {
      if (!token || !String(query).trim()) {
        return;
      }
      try {
        const data = await postSearchRequest(token, {query: String(query).trim()});
        applyProfilePayload(data);
      } catch {
        /* optional */
      }
    },
    [token, applyProfilePayload],
  );

  const isFavoriteId = useCallback(
    id => idInMovieList(profile?.favoriteMovies, id),
    [profile],
  );

  const isLikedId = useCallback(
    id => idInMovieList(profile?.likedMovies, id),
    [profile],
  );

  const isWatchedId = useCallback(
    id => idInMovieList(profile?.watchedMovies, id),
    [profile],
  );

  const normalizedFavorites = useMemo(() => {
    const raw = profile?.favoriteMovies;
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw.map(normalizeServerMovie).filter(Boolean);
  }, [profile]);

  const value = useMemo(
    () => ({
      profile,
      insights,
      feed,
      loading,
      error,
      refreshProfile,
      refreshInsights,
      refreshFeed,
      toggleFavoriteMovie,
      addLiked,
      removeLiked,
      addWatched,
      removeWatched,
      patchMyProfile,
      submitMood,
      submitSearchLog,
      isFavoriteId,
      isLikedId,
      isWatchedId,
      normalizedFavorites,
    }),
    [
      profile,
      insights,
      feed,
      loading,
      error,
      refreshProfile,
      refreshInsights,
      refreshFeed,
      toggleFavoriteMovie,
      addLiked,
      removeLiked,
      addWatched,
      removeWatched,
      patchMyProfile,
      submitMood,
      submitSearchLog,
      isFavoriteId,
      isLikedId,
      isWatchedId,
      normalizedFavorites,
    ],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error('useProfile must be used within ProfileProvider');
  }
  return ctx;
}
