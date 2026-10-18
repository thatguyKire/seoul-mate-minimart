import { describe, expect, it } from 'vitest';
import { i18nByLocale } from './i18n';

describe('i18n instances (FR-17)', () => {
  it('gives each language its own instance', () => {
    expect(i18nByLocale.en.t('header.visit')).toBe('Visit us');
    expect(i18nByLocale.fil.t('header.visit')).toBe('Bisitahin kami');
    expect(i18nByLocale.ko.t('header.visit')).toBe('매장 안내');
  });

  it('uses the right plural forms per language', () => {
    expect(i18nByLocale.en.t('menu.results', { count: 1 })).toBe('1 item found');
    expect(i18nByLocale.en.t('menu.results', { count: 3 })).toBe('3 items found');
    expect(i18nByLocale.ko.t('menu.results', { count: 1 })).toBe('상품 1개');
  });

  it('inserts visitor input as it is, without expanding i18next syntax inside it (FR-15)', () => {
    for (const query of ['$t(menu.title)', '{{count}}', '$t(menu.results, {"count": 2})']) {
      expect(i18nByLocale.en.t('menu.noResults', { query })).toBe(
        `Nothing on the menu matches “${query}”.`,
      );
    }
  });
});
