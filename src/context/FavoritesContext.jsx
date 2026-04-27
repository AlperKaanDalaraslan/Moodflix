import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {movieIdentityKey} from '../utils/profileMovie';
import {useProfile} from './ProfileContext';

const STORAGE_KEY = '@moodflix/favorites';

const FavoritesContext = createContext(null);

/**
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {boolean} props.authHydrated AuthContext’ten (FavoritesAuthBridge) — burada useAuth kullanılmaz (döngü/HMR riski).
 * @param {boolean} props.authIsLoggedIn
 */
export function FavoritesProvider({children, authHydrated = false, authIsLoggedIn = false}) {
  const hydrated = authHydrated;
  const isLoggedIn = authIsLoggedIn;
  const {normalizedFavorites, toggleFavoriteMovie} = useProfile();
  const [guestFavorites, setGuestFavorites] = useState([]);

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
            setGuestFavorites(parsed);
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

  const favorites = useMemo(() => {
    if (hydrated && isLoggedIn) {
      return normalizedFavorites;
    }
    return guestFavorites;
  }, [hydrated, isLoggedIn, normalizedFavorites, guestFavorites]);

  const toggleFavorite = useCallback(
    movie => {
      if (!hydrated || !isLoggedIn) {
        if (!hydrated) {
          return false;
        }
        setGuestFavorites(prev => {
          const incomingKey = movieIdentityKey(movie?.id);
          const exists = prev.some(m => movieIdentityKey(m?.id) === incomingKey);
          const next = exists
            ? prev.filter(m => movieIdentityKey(m?.id) !== incomingKey)
            : [movie, ...prev];
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
          return next;
        });
        return true;
      }
      toggleFavoriteMovie(movie).catch(() => {});
      return true;
    },
    [hydrated, isLoggedIn, toggleFavoriteMovie],
  );

  /** Girişli: sunucu listesi; misafir: yerel */
  const listForDisplay = useMemo(() => {
    if (!hydrated) {
      return [];
    }
    if (isLoggedIn) {
      return favorites;
    }
    return guestFavorites;
  }, [hydrated, isLoggedIn, favorites, guestFavorites]);

  const ids = useMemo(
    () => new Set(listForDisplay.map(m => movieIdentityKey(m.id)).filter(Boolean)),
    [listForDisplay],
  );

  const isFavorite = useCallback(id => ids.has(movieIdentityKey(id)), [ids]);

  const value = useMemo(
    () => ({
      favorites: listForDisplay,
      ids,
      toggleFavorite,
      isFavorite,
    }),
    [listForDisplay, ids, toggleFavorite, isFavorite],
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
