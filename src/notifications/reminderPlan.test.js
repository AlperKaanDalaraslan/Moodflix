import {planReminders, upcomingSlots} from './reminderPlan';

describe('reminder plan', () => {
  const saturdayEvening = new Date(2026, 9, 24, 21, 0, 0).getTime();

  test('places Friday, Saturday, and Tuesday at 20:30', () => {
    const slots = upcomingSlots(saturdayEvening, 1);
    expect(slots).toHaveLength(3);
    expect(slots.map(slot => new Date(slot.at).getDay())).toEqual([2, 5, 6]);
    expect(slots.every(slot => new Date(slot.at).getHours() === 20)).toBe(true);
    expect(slots.every(slot => new Date(slot.at).getMinutes() === 30)).toBe(true);
  });

  test('stays quiet for 18 hours after the app is opened', () => {
    const fridayAfternoon = new Date(2026, 9, 30, 12, 0, 0).getTime();
    const soon = upcomingSlots(fridayAfternoon, 1).find(slot => slot.pool === 'weekend');
    const plan = planReminders({
      now: fridayAfternoon,
      existing: [{id: 'moodflix-weekend-soon', pool: 'weekend', at: soon.at, index: 0}],
      cursor: {weekend: 1, midweek: 0},
    });
    expect(plan.dropped.map(item => item.id)).toContain('moodflix-weekend-soon');
    expect(plan.added.some(item => item.at === soon.at)).toBe(false);
    expect(plan.added.some(item => item.pool === 'weekend')).toBe(true);
  });
});