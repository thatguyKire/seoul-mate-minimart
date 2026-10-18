import { describe, expect, it } from 'vitest';
import { store, type DayHours } from '../../config/store';
import { closesNextDay, formatHours } from './hours';

const english = {
  range: ({ opens, closes }: { opens: string; closes: string }) => `${opens} to ${closes}`,
  nextDay: ({ time }: { time: string }) => `${time} (next day)`,
};

describe('opening hours (FR-22, FR-23)', () => {
  const monday: DayHours = { day: 'monday', opens: '09:00', closes: '02:00' };
  const friday: DayHours = { day: 'friday', opens: '09:00', closes: '14:00' };

  it('says when closing is early the next morning', () => {
    expect(closesNextDay(monday)).toBe(true);
    expect(formatHours(monday, 'en', english)).toBe('9:00 AM to 2:00 AM (next day)');
  });

  it('leaves same-day closing as it is', () => {
    expect(closesNextDay(friday)).toBe(false);
    expect(formatHours(friday, 'en', english)).toBe('9:00 AM to 2:00 PM');
  });

  it('has the hours the owner confirmed, Monday to Sunday', () => {
    expect(store.hours.map((day) => `${day.day} ${day.opens}-${day.closes}`)).toEqual([
      'monday 09:00-02:00',
      'tuesday 09:00-02:00',
      'wednesday 09:00-02:00',
      'thursday 09:00-02:00',
      'friday 09:00-14:00',
      'saturday 09:00-14:00',
      'sunday 09:00-02:00',
    ]);
  });
});
