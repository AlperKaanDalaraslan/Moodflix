import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';

const STORAGE_KEY = '@moodflix/favorites';

const FavoritesContext = createContext(null);

export function FavoritesProvider({children}) {
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) {
          return;
        }
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setFavorites(parsed);
          }
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleFavorite = useCallback(movie => {
    setFavorites(prev => {
      const exists = prev.some(m => m.id === movie.id);
      const next = exists
        ? prev.filter(m => m.id !== movie.id)
        : [movie, ...prev];
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(
        () => undefined,
      );
      return next;
    });
  }, []);

  const ids = useMemo(() => new Set(favorites.map(m => m.id)), [favorites]);

  const isFavorite = useCallback(id => ids.has(id), [ids]);

  const value = useMemo(
    () => ({favorites, ids, toggleFavorite, isFavorite}),
    [favorites, ids, toggleFavorite, isFavorite],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error('useFavorites must be used within FavoritesProvider');
  }
  return ctx;
}
