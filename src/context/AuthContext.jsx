import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import * as authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({children}) {
  const [hydrated, setHydrated] = useState(false);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await authService.loadStoredSession();
        if (!cancelled) {
          setToken(s.token);
          setUser(s.user);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async body => {
    const data = await authService.login(body);
    const nextToken = data.token;
    const nextUser = data.user;
    if (!nextToken || !nextUser) {
      throw new Error('INVALID_AUTH_RESPONSE');
    }
    await authService.persistSession({token: nextToken, user: nextUser});
    setToken(nextToken);
    setUser(nextUser);
    return data;
  }, []);

  const register = useCallback(async body => {
    const data = await authService.register(body);
    if (data.token && data.user) {
      await authService.persistSession({token: data.token, user: data.user});
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  }, []);

  const logout = useCallback(async () => {
    await authService.clearSession();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      hydrated,
      token,
      user,
      isLoggedIn: Boolean(token && user),
      login,
      register,
      logout,
    }),
    [hydrated, token, user, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
