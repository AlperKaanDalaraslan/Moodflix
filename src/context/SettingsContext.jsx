import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {DEFAULT_CONTENT_LOCALE, isTmdbContentLocale} from '../i18n/contentLocales';
import {isThemeId} from '../theme/colors';

const STORAGE_KEY = '@moodflix/settings';

const defaultSettings = {
  locale: DEFAULT_CONTENT_LOCALE,
  theme: 'dark',
  shakeThemeEnabled: false,
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
            locale: isTmdbContentLocale(parsed.locale)
              ? parsed.locale
              : DEFAULT_CONTENT_LOCALE,
            theme: isThemeId(parsed.theme) ? parsed.theme : 'dark',
            shakeThemeEnabled: parsed.shakeThemeEnabled === true,
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

  const setLocale = useCallback(code => {
    if (!isTmdbContentLocale(code)) {
      return;
    }
    setSettings(prev => {
      const next = {...prev, locale: code};
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(
        () => undefined,
      );
      return next;
    });
  }, []);

  const setTheme = useCallback(theme => {
    if (!isThemeId(theme)) {
      return;
    }
    setSettings(prev => {
      const next = {...prev, theme};
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(
        () => undefined,
      );
      return next;
    });
  }, []);

  const setShakeThemeEnabled = useCallback(enabled => {
    setSettings(prev => {
      const next = {...prev, shakeThemeEnabled: enabled === true};
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
      setShakeThemeEnabled,
    }),
    [settings, setLocale, setTheme, setShakeThemeEnabled],
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
