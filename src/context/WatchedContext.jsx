import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {catalogKey} from '../utils/catalog';

const STORAGE_KEY = '@moodflix/watched';

const WatchedContext = createContext(null);

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
    media_type: movie.media_type === 'tv' ? 'tv' : 'movie',
  };
}

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
  const incomingKey = catalogKey(compact);
  if (!incomingKey) {
    return false;
  }
  if (memory.some(m => catalogKey(m) === incomingKey)) {
    return true;
  }
  memory = [compact, ...memory];
  persist(memory);
  emit();
  return true;
}

function toggleInMemory(movie) {
  const compact = compactMovie(movie);
  const incomingKey = catalogKey(compact);
  if (!incomingKey) {
    return false;
  }
  const exists = memory.some(m => catalogKey(m) === incomingKey);
  memory = exists
    ? memory.filter(m => catalogKey(m) !== incomingKey)
    : [compact, ...memory];
  persist(memory);
  emit();
  return true;
}

let loadStarted = false;
let storageReady = false;
function loadFromStorage() {
  if (loadStarted) {
    return;
  }
  loadStarted = true;
  (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const map = new Map();
          parsed.forEach(m => {
            const compact = compactMovie(m);
            const key = catalogKey(compact);
            if (key && compact) {
              map.set(key, compact);
            }
          });
          memory.forEach(m => {
            const key = catalogKey(m);
            if (key) {
              map.set(key, m);
            }
          });
          memory = Array.from(map.values());
        }
      }
    } catch {
      /* kayıt okunamadı */
    } finally {
      storageReady = true;
      emit();
    }
  })();
}

export function WatchedProvider({children}) {
  const [watched, setWatched] = useState(memory);
  const [ready, setReady] = useState(storageReady);

  useEffect(() => {
    const onChange = next => {
      setWatched(next);
      setReady(storageReady);
    };
    listeners.add(onChange);
    loadFromStorage();
    setWatched(memory);
    setReady(storageReady);
    return () => {
      listeners.delete(onChange);
    };
  }, []);

  const toggleWatched = useCallback(movie => toggleInMemory(movie), []);
  const addWatched = useCallback(movie => upsertIntoMemory(movie), []);

  const ids = useMemo(
    () => new Set(watched.map(m => catalogKey(m)).filter(Boolean)),
    [watched],
  );

  const isWatched = useCallback(
    (itemOrId, mediaType) => {
      const key =
        itemOrId && typeof itemOrId === 'object'
          ? catalogKey(itemOrId)
          : catalogKey({id: itemOrId, media_type: mediaType});
      return Boolean(key) && ids.has(key);
    },
    [ids],
  );

  const value = useMemo(
    () => ({
      watched,
      ready,
      ids,
      toggleWatched,
      addWatched,
      isWatched,
    }),
    [watched, ready, ids, toggleWatched, addWatched, isWatched],
  );

  return (
    <WatchedContext.Provider value={value}>{children}</WatchedContext.Provider>
  );
}

export function useWatched() {
  const ctx = useContext(WatchedContext);
  if (!ctx) {
    throw new Error('useWatched must be used within WatchedProvider');
  }
  return ctx;
}
