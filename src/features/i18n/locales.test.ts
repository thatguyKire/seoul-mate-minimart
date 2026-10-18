import { describe, expect, it } from 'vitest';
import { localizedText } from './localizedText';
import { localizedPath, matchBrowserLanguage, pickInitialLocale } from './locales';

describe('pickInitialLocale (FR-19, FR-20)', () => {
  it('uses the saved choice first', () => {
    expect(pickInitialLocale('ko', ['fil-PH', 'en'])).toBe('ko');
  });

  it('ignores a saved value that is not a site language', () => {
    expect(pickInitialLocale('de', ['ko-KR'])).toBe('ko');
  });

  it('uses the first supported browser language', () => {
    expect(pickInitialLocale(null, ['ja-JP', 'ko-KR', 'en-US'])).toBe('ko');
  });

  it('treats Tagalog as Filipino', () => {
    expect(matchBrowserLanguage('tl-PH')).toBe('fil');
    expect(matchBrowserLanguage('fil')).toBe('fil');
    expect(pickInitialLocale(null, ['tl'])).toBe('fil');
  });

  it('falls back to English', () => {
    expect(pickInitialLocale(null, ['ja-JP', 'zh-CN'])).toBe('en');
    expect(pickInitialLocale(null, [])).toBe('en');
  });
});

describe('localizedPath (FR-18)', () => {
  it('swaps the language prefix and keeps the rest of the path', () => {
    expect(localizedPath('/en/', 'ko')).toBe('/ko/');
    expect(localizedPath('/en', 'fil')).toBe('/fil/');
    expect(localizedPath('/ko/some/page', 'en')).toBe('/en/some/page');
  });
});

describe('localizedText (FR-21)', () => {
  const row = {
    name_en: 'Jin Ramen Mild',
    name_fil: null,
    name_ko: '진라면 순한맛',
    description_en: 'Mild noodles.',
    description_fil: null,
    description_ko: null,
  };

  it('uses the page language when there is text for it', () => {
    expect(localizedText(row, 'name', 'ko')).toEqual({ text: '진라면 순한맛', lang: 'ko' });
  });

  it('falls back to English and says so, so the text can be marked up with lang="en"', () => {
    expect(localizedText(row, 'name', 'fil')).toEqual({ text: 'Jin Ramen Mild', lang: 'en' });
    expect(localizedText(row, 'description', 'ko')).toEqual({ text: 'Mild noodles.', lang: 'en' });
  });
});
