import React, {useEffect} from 'react';
import {AppState} from 'react-native';
import {useSettings} from '../context/SettingsContext';
import {syncReminders} from './syncReminders';

export function ReminderController() {
  const {ready, introSeen, remindersEnabled, locale} = useSettings();

  useEffect(() => {
    if (!ready || !introSeen) {
      return undefined;
    }
    let cancelled = false;
    const run = () => {
      if (cancelled) {
        return;
      }
      syncReminders({enabled: remindersEnabled, locale}).catch(() => undefined);
    };
    run();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        run();
      }
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [ready, introSeen, remindersEnabled, locale]);

  return null;
}
