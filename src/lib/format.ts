// Prices, dates and times for display, through Intl (TRD 5).
import { store } from '../config/store';
import { intlLocales, type Locale } from '../features/i18n/locales';

const priceFormats = new Map<Locale, Intl.NumberFormat>();
const dateTimeFormats = new Map<Locale, Intl.DateTimeFormat>();
const dateFormats = new Map<Locale, Intl.DateTimeFormat>();
const clockFormats = new Map<Locale, Intl.DateTimeFormat>();
const weekdayFormats = new Map<Locale, Intl.DateTimeFormat>();

function cached<T>(map: Map<Locale, T>, locale: Locale, create: () => T): T {
  let value = map.get(locale);
  if (value === undefined) {
    value = create();
    map.set(locale, value);
  }
  return value;
}

/** Whole centavos to pesos, with the ₱ sign in every language. */
export function formatPrice(centavos: number, locale: Locale): string {
  const format = cached(
    priceFormats,
    locale,
    () =>
      new Intl.NumberFormat(intlLocales[locale], {
        style: 'currency',
        currency: 'PHP',
        currencyDisplay: 'narrowSymbol',
      }),
  );
  return format.format(centavos / 100);
}

/** A database timestamp shown in Philippine time, whatever the visitor's own time zone (FR-08). */
export function formatDateTime(iso: string, locale: Locale): string {
  const format = cached(
    dateTimeFormats,
    locale,
    () =>
      new Intl.DateTimeFormat(intlLocales[locale], {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: store.timeZone,
      }),
  );
  return format.format(new Date(iso));
}

/** A calendar date such as "2026-10-19" in the visitor's language, for example "October 19, 2026". */
export function formatDate(isoDate: string, locale: Locale): string {
  const format = cached(
    dateFormats,
    locale,
    () => new Intl.DateTimeFormat(intlLocales[locale], { dateStyle: 'long', timeZone: 'UTC' }),
  );
  return format.format(new Date(`${isoDate}T00:00:00Z`));
}

/** A store clock time such as "14:00" in the visitor's language, for example "2:00 PM". */
export function formatClockTime(time: string, locale: Locale): string {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  const format = cached(
    clockFormats,
    locale,
    () =>
      new Intl.DateTimeFormat(intlLocales[locale], {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'UTC',
      }),
  );
  return format.format(Date.UTC(2000, 0, 1, hours, minutes));
}

/** Weekday name; 0 is Monday. */
export function formatWeekday(index: number, locale: Locale): string {
  const format = cached(
    weekdayFormats,
    locale,
    () => new Intl.DateTimeFormat(intlLocales[locale], { weekday: 'long', timeZone: 'UTC' }),
  );
  // 1 January 2024 was a Monday.
  return format.format(Date.UTC(2024, 0, 1 + index));
}
