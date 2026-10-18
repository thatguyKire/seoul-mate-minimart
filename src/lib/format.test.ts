import { describe, expect, it } from 'vitest';
import { formatClockTime, formatDateTime, formatPrice, formatWeekday } from './format';

describe('formatPrice (FR-02)', () => {
  it('shows pesos with the ₱ sign in every language', () => {
    expect(formatPrice(9500, 'en')).toBe('₱95.00');
    expect(formatPrice(145000, 'fil')).toBe('₱1,450.00');
    expect(formatPrice(6500, 'ko')).toBe('₱65.00');
  });

  it('keeps centavos exact', () => {
    expect(formatPrice(1999, 'en')).toBe('₱19.99');
    expect(formatPrice(0, 'en')).toBe('₱0.00');
  });
});

describe('formatDateTime (FR-08)', () => {
  it('shows database times in Philippine time, whatever the test machine time zone', () => {
    // 12:05 UTC is 8:05 PM in Manila.
    expect(formatDateTime('2026-10-18T12:05:00Z', 'en')).toBe('Oct 18, 2026, 8:05 PM');
    expect(formatDateTime('2026-10-18T12:05:00Z', 'ko')).toBe('2026. 10. 18. 오후 8:05');
  });

  it('moves to the next day after 4 PM UTC', () => {
    expect(formatDateTime('2026-10-18T17:30:00Z', 'en')).toBe('Oct 19, 2026, 1:30 AM');
  });
});

describe('formatClockTime and formatWeekday', () => {
  it('formats store clock times per language', () => {
    expect(formatClockTime('09:00', 'en')).toBe('9:00 AM');
    expect(formatClockTime('14:00', 'fil')).toBe('2:00 PM');
    expect(formatClockTime('02:00', 'ko')).toBe('오전 2:00');
  });

  it('names weekdays from Monday', () => {
    expect(formatWeekday(0, 'en')).toBe('Monday');
    expect(formatWeekday(6, 'en')).toBe('Sunday');
    expect(formatWeekday(0, 'fil')).toBe('Lunes');
    expect(formatWeekday(4, 'ko')).toBe('금요일');
  });
});
