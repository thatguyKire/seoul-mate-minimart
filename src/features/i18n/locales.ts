// The site's languages and how a visitor's language is chosen (FR-16 to FR-20, D-006).

export const locales = ['en', 'fil', 'ko'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

/** Each language's name, written in that language (FR-16). */
export const localeNames: Record<Locale, string> = {
  en: 'English',
  fil: 'Filipino',
  ko: '한국어',
};

/** Tags for Intl number and date formatting (TRD 5). */
export const intlLocales: Record<Locale, string> = {
  en: 'en-PH',
  fil: 'fil-PH',
  ko: 'ko-KR',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value);
}

/** Maps a browser language tag such as "ko-KR" to a site locale. Browsers report Filipino as "fil" or "tl". */
export function matchBrowserLanguage(tag: string): Locale | undefined {
  const base = tag.toLowerCase().split('-')[0];
  if (base === 'tl' || base === 'fil') return 'fil';
  return isLocale(base) ? base : undefined;
}

/** The saved choice first, then the browser's languages in order, then English (FR-19, FR-20). */
export function pickInitialLocale(
  saved: string | null,
  browserLanguages: readonly string[],
): Locale {
  if (isLocale(saved)) return saved;
  for (const tag of browserLanguages) {
    const match = matchBrowserLanguage(tag);
    if (match) return match;
  }
  return defaultLocale;
}

/** The same page in another language: swaps the first path segment (FR-18). */
export function localizedPath(pathname: string, locale: Locale): string {
  const rest = pathname.split('/').slice(2).join('/');
  return `/${locale}/${rest}`;
}
