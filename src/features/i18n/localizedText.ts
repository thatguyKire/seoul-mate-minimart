// Item and category text in the page language, falling back to English (FR-21, D-021).
import type { Locale } from './locales';

type Field = 'name' | 'description';

type Translated<F extends Field> = Record<`${F}_en`, string> &
  Partial<Record<`${F}_fil` | `${F}_ko`, string | null>>;

export interface LocalizedText {
  text: string;
  /** The language the text is actually in. Differs from the page language on a fallback. */
  lang: Locale;
}

export function localizedText<F extends Field>(
  row: Translated<F>,
  field: F,
  locale: Locale,
): LocalizedText {
  if (locale !== 'en') {
    const value = row[`${field}_${locale}`];
    if (value) return { text: value, lang: locale };
  }
  return { text: row[`${field}_en`], lang: 'en' };
}

/** A `lang` attribute only where the text is not in the page language (NFR-ACC-05). */
export function langAttribute(text: LocalizedText, pageLocale: Locale): { lang?: Locale } {
  return text.lang === pageLocale ? {} : { lang: text.lang };
}
