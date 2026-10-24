import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, {AndroidImportance, AuthorizationStatus, TriggerType} from 'react-native-notify-kit';
import {planReminders} from './reminderPlan';
import {reminderBody, REMINDER_COPY_VERSION} from './reminderCopy';

const STORAGE_KEY = '@moodflix/reminders';
const CHANNEL_ID = 'moodflix-reminders';

async function readPlan() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {locale: '', copyVersion: 0, cursor: {weekend: 0, midweek: 0}, items: []};
    }
    const parsed = JSON.parse(raw);
    return {
      locale: typeof parsed.locale === 'string' ? parsed.locale : '',
      copyVersion: Number(parsed.copyVersion) || 0,
      cursor: {
        weekend: Number(parsed.cursor?.weekend) || 0,
        midweek: Number(parsed.cursor?.midweek) || 0,
      },
      items: Array.isArray(parsed.items) ? parsed.items : [],
    };
  } catch {
    return {locale: '', copyVersion: 0, cursor: {weekend: 0, midweek: 0}, items: []};
  }
}

async function writePlan(plan) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
}

async function ensureChannel() {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Moodflix',
    importance: AndroidImportance.DEFAULT,
  });
}

export async function syncReminders({enabled, locale}) {
  const stored = await readPlan();
  const freshCopy = stored.copyVersion === REMINDER_COPY_VERSION;
  const sameLanguage = stored.locale === locale && freshCopy;

  const cancelIds = async ids => {
    if (!ids.length) {
      return;
    }
    await notifee.cancelTriggerNotifications(ids).catch(() => undefined);
  };

  if (!enabled) {
    await cancelIds(stored.items.map(item => item.id));
    await writePlan({...stored, items: []});
    return;
  }

  let settings = await notifee.getNotificationSettings();
  if (settings.authorizationStatus === AuthorizationStatus.NOT_DETERMINED) {
    settings = await notifee.requestPermission();
  }
  const allowed = settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
  if (!allowed) {
    await cancelIds(stored.items.map(item => item.id));
    await writePlan({...stored, locale, items: []});
    return;
  }

  await ensureChannel();
  const plan = planReminders({
    now: Date.now(),
    existing: sameLanguage ? stored.items : [],
    cursor: freshCopy ? stored.cursor : {weekend: 0, midweek: 0},
  });

  if (!sameLanguage) {
    await cancelIds(stored.items.map(item => item.id));
  } else {
    await cancelIds(plan.dropped.map(item => item.id));
  }

  for (const item of plan.added) {
    await notifee.createTriggerNotification(
      {
        id: item.id,
        title: 'Moodflix',
        body: reminderBody(locale, item.pool, item.index),
        android: {
          channelId: CHANNEL_ID,
          pressAction: {id: 'default'},
        },
        ios: {sound: 'default'},
      },
      {
        type: TriggerType.TIMESTAMP,
        timestamp: item.at,
      },
    );
  }

  await writePlan({
    locale,
    copyVersion: REMINDER_COPY_VERSION,
    cursor: plan.cursor,
    items: [...plan.kept, ...plan.added],
  });
}
