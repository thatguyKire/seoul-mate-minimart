// Interface text (FR-17). One i18next instance per language, all sharing the same
// resources. The route picks the instance, so switching language re-renders the page in
// one step, without changing global state or reloading (D-006).
// Filipino and Korean text are drafts until fluent speakers review them (D-008).
import i18next, { type i18n } from 'i18next';
import en from './locales/en.json';
import fil from './locales/fil.json';
import ko from './locales/ko.json';
import type { Locale } from './locales';

export const resources = {
  en: { translation: en },
  fil: { translation: fil },
  ko: { translation: ko },
} as const;

function createInstance(): i18n {
  const instance = i18next.createInstance();
  void instance.init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    supportedLngs: ['en', 'fil', 'ko'],
    interpolation: {
      // React escapes everything it renders, so i18next must not escape a second time.
      escapeValue: false,
      // Inserted values, such as a search query, are never read as i18next syntax (FR-15).
      skipOnVariables: true,
    },
    initAsync: false,
    returnEmptyString: false,
  });
  return instance;
}

const english = createInstance();

export const i18nByLocale: Record<Locale, i18n> = {
  en: english,
  fil: english.cloneInstance({ lng: 'fil' }),
  ko: english.cloneInstance({ lng: 'ko' }),
};
