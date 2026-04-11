import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';

const STORAGE_KEY = '@moodflix/settings';

const defaultSettings = {
  locale: 'tr-TR',
  theme: 'dark',
};

const SettingsContext = createContext(null);

export function SettingsProvider({children}) {
  const [settings, setSettings] = useState(defaultSettings);

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
          setSettings({
            locale: parsed.locale === 'en-US' ? 'en-US' : 'tr-TR',
            theme: parsed.theme === 'light' ? 'light' : 'dark',
          });
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = useCallback(locale => {
    setSettings(prev => {
      const next = {...prev, locale};
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(
        () => undefined,
      );
      return next;
    });
  }, []);

  const setTheme = useCallback(theme => {
    setSettings(prev => {
      const next = {...prev, theme};
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(
        () => undefined,
      );
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      ...settings,
      setLocale,
      setTheme,
    }),
    [settings, setLocale, setTheme],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return ctx;
}
