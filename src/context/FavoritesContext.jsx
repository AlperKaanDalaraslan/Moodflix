import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {movieIdentityKey} from '../utils/profileMovie';

const STORAGE_KEY = '@moodflix/favorites';

const FavoritesContext = createContext(null);

function compactMovie(movie) {
  if (!movie || typeof movie !== 'object') {
    return null;
  }
  const rawId = movie.id ?? movie.movieId ?? movie.movie_id;
  if (rawId == null || rawId === '') {
    return null;
  }
  const numId = Number(rawId);
  return {
    id: Number.isFinite(numId) ? numId : rawId,
    title: String(movie.title ?? movie.name ?? ''),
    poster_path:
      movie.poster_path ?? movie.posterPath ?? movie.backdrop_path ?? null,
  };
}

/** Provider yeniden bağlansa bile kaydırılan filmler kaybolmasın */
let memory = [];
const listeners = new Set();

function emit() {
  listeners.forEach(fn => {
    fn(memory);
  });
}

function persist(list) {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list)).catch(() => undefined);
}

function upsertIntoMemory(movie) {
  const compact = compactMovie(movie);
  const incomingKey = movieIdentityKey(compact?.id);
  if (!incomingKey) {
    return false;
  }
  if (memory.some(m => movieIdentityKey(m?.id) === incomingKey)) {
    return true;
  }
  memory = [compact, ...memory];
  persist(memory);
  emit();
  return true;
}

function toggleInMemory(movie) {
  const compact = compactMovie(movie);
  const incomingKey = movieIdentityKey(compact?.id);
  if (!incomingKey) {
    return false;
  }
  const exists = memory.some(m => movieIdentityKey(m?.id) === incomingKey);
  memory = exists
    ? memory.filter(m => movieIdentityKey(m?.id) !== incomingKey)
    : [compact, ...memory];
  persist(memory);
  emit();
  return true;
}

let loadStarted = false;
function loadFromStorage() {
  if (loadStarted) {
    return;
  }
  loadStarted = true;
  (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) {
        emit();
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return;
      }
      const map = new Map();
      parsed.forEach(m => {
        const key = movieIdentityKey(m?.id ?? m?.movieId);
        const compact = compactMovie(m);
        if (key && compact) {
          map.set(key, compact);
        }
      });
      memory.forEach(m => {
        const key = movieIdentityKey(m?.id);
        if (key) {
          map.set(key, m);
        }
      });
      memory = Array.from(map.values());
      emit();
    } catch {
      emit();
    }
  })();
}

/**
 * @param {object} props
 * @param {React.ReactNode} props.children
 */
export function FavoritesProvider({children}) {
  const [favorites, setFavorites] = useState(memory);

  useEffect(() => {
    const onChange = next => {
      setFavorites(next);
    };
    listeners.add(onChange);
    loadFromStorage();
    setFavorites(memory);
    return () => {
      listeners.delete(onChange);
    };
  }, []);

  const toggleFavorite = useCallback(movie => toggleInMemory(movie), []);
  const addFavorite = useCallback(movie => upsertIntoMemory(movie), []);

  const ids = useMemo(
    () => new Set(favorites.map(m => movieIdentityKey(m.id)).filter(Boolean)),
    [favorites],
  );

  const isFavorite = useCallback(id => ids.has(movieIdentityKey(id)), [ids]);

  const value = useMemo(
    () => ({
      favorites,
      ids,
      toggleFavorite,
      addFavorite,
      isFavorite,
    }),
    [favorites, ids, toggleFavorite, addFavorite, isFavorite],
  );

  return (
    <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error('useFavorites must be used within FavoritesProvider');
  }
  return ctx;
}
