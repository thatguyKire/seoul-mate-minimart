// Makes translation keys type-checked: a missing or misspelled key fails the typecheck.
// "translation" is the public site; "admin" is the staff panel (English only, D-025).
import type adminEn from '../admin/locales/en.json';
import type en from './locales/en.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof en; admin: typeof adminEn };
  }
}
