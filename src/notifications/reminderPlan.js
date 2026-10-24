/** Friday and Saturday at 20:30, plus Tuesday. The hour people are already on the couch. */
export const REMINDER_SLOTS = [
  {pool: 'weekend', weekday: 5, hour: 20, minute: 30},
  {pool: 'weekend', weekday: 6, hour: 20, minute: 30},
  {pool: 'midweek', weekday: 2, hour: 20, minute: 30},
];

export const QUIET_MS = 18 * 60 * 60 * 1000;
export const WEEKS_AHEAD = 4;

function atWeekday(from, weekday, hour, minute) {
  const date = new Date(from);
  date.setSeconds(0, 0);
  date.setHours(hour, minute, 0, 0);
  const delta = (weekday - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + delta);
  if (date.getTime() <= from) {
    date.setDate(date.getDate() + 7);
  }
  return date.getTime();
}

function addWeeks(timestamp, weeks) {
  const date = new Date(timestamp);
  date.setDate(date.getDate() + weeks * 7);
  return date.getTime();
}

export function upcomingSlots(from, weeks = WEEKS_AHEAD) {
  const slots = [];
  for (const slot of REMINDER_SLOTS) {
    const first = atWeekday(from, slot.weekday, slot.hour, slot.minute);
    for (let index = 0; index < weeks; index += 1) {
      slots.push({pool: slot.pool, at: addWeeks(first, index)});
    }
  }
  slots.sort((a, b) => a.at - b.at);
  return slots;
}

/**
 * Keep future reminders that are outside the quiet window.
 * Drop anything soon after the app was just opened, and fill the gaps with the next line.
 */
export function planReminders({now, existing = [], cursor = {}, weeks = WEEKS_AHEAD}) {
  const quietUntil = now + QUIET_MS;
  const future = existing.filter(item => item.at > quietUntil);
  const dropped = existing.filter(item => item.at <= quietUntil);
  const wanted = upcomingSlots(now, weeks).filter(slot => slot.at > quietUntil);
  const wantedAt = new Set(wanted.map(slot => slot.at));
  const kept = [];
  for (const item of future) {
    if (wantedAt.has(item.at)) {
      kept.push(item);
    } else {
      dropped.push(item);
    }
  }
  const have = new Set(kept.map(item => item.at));
  const nextCursor = {weekend: cursor.weekend || 0, midweek: cursor.midweek || 0};
  const added = [];
  for (const slot of wanted) {
    if (have.has(slot.at)) {
      continue;
    }
    const index = nextCursor[slot.pool];
    nextCursor[slot.pool] = index + 1;
    added.push({
      id: `moodflix-${slot.pool}-${slot.at}`,
      pool: slot.pool,
      at: slot.at,
      index,
    });
  }
  return {kept, added, dropped, cursor: nextCursor};
}
