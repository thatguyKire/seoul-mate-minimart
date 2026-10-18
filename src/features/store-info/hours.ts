// Opening hours as text (FR-22, FR-23).
import type { DayHours } from '../../config/store';
import { formatClockTime } from '../../lib/format';
import type { Locale } from '../i18n/locales';

/** A closing time at or before the opening time is early the next morning. */
export function closesNextDay(hours: DayHours): boolean {
  return hours.closes <= hours.opens;
}

export interface HoursText {
  /** "{{opens}} to {{closes}}" in the page language. */
  range: (values: { opens: string; closes: string }) => string;
  /** "{{time}} (next day)" in the page language. */
  nextDay: (values: { time: string }) => string;
}

export function formatHours(hours: DayHours, locale: Locale, text: HoursText): string {
  const opens = formatClockTime(hours.opens, locale);
  const closesAt = formatClockTime(hours.closes, locale);
  const closes = closesNextDay(hours) ? text.nextDay({ time: closesAt }) : closesAt;
  return text.range({ opens, closes });
}
