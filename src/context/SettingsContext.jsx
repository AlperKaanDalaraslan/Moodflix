import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {DEFAULT_CONTENT_LOCALE, isTmdbContentLocale} from '../i18n/contentLocales';
import {isThemeId} from '../theme/colors';

const STORAGE_KEY = '@moodflix/settings';
const INTRO_VERSION = 5;

const defaultSettings = {
  locale: DEFAULT_CONTENT_LOCALE,
  theme: 'dark',
  shakeThemeEnabled: true,
  remindersEnabled: true,
  introSeen: false,
  introVersion: 0,
};

const SettingsContext = createContext(null);

export function SettingsProvider({children}) {
  const [settings, setSettings] = useState(defaultSettings);
  const [ready, setReady] = useState(false);

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
          const introSeen = parsed.introVersion === INTRO_VERSION;
          const next = {
            locale: isTmdbContentLocale(parsed.locale)
              ? parsed.locale
              : DEFAULT_CONTENT_LOCALE,
            theme: isThemeId(parsed.theme) ? parsed.theme : 'dark',
            shakeThemeEnabled: introSeen ? parsed.shakeThemeEnabled === true : true,
            remindersEnabled: parsed.remindersEnabled !== false,
            introSeen,
            introVersion: introSeen ? INTRO_VERSION : 0,
          };
          setSettings(next);
          if (!introSeen) {
            void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(
              () => undefined,
            );
          }
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) {
          setReady(true);
        }
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

  const setRemindersEnabled = useCallback(enabled => {
    setSettings(prev => {
      const next = {...prev, remindersEnabled: enabled === true};
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(
        () => undefined,
      );
      return next;
    });
  }, []);

  const completeIntro = useCallback(() => {
    setSettings(prev => {
      const next = {...prev, introSeen: true, introVersion: INTRO_VERSION, shakeThemeEnabled: true};
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(
        () => undefined,
      );
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      ...settings,
      ready,
      setLocale,
      setTheme,
      setShakeThemeEnabled,
      setRemindersEnabled,
      completeIntro,
    }),
    [settings, ready, setLocale, setTheme, setShakeThemeEnabled, setRemindersEnabled, completeIntro],
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
