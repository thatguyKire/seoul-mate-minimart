// The staff panel's text: English only for v1, on the same translation system as the public
// site, so more languages can be added later (D-025).
import i18next from 'i18next';
import admin from './locales/en.json';

export const adminI18n = i18next.createInstance();

void adminI18n.init({
  resources: { en: { admin } },
  lng: 'en',
  ns: ['admin'],
  defaultNS: 'admin',
  interpolation: {
    // React escapes everything it renders.
    escapeValue: false,
    // Inserted values, such as an item name, are never read as i18next syntax.
    skipOnVariables: true,
  },
  initAsync: false,
  returnEmptyString: false,
});
