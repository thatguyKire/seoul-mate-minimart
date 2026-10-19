import { afterEach, describe, expect, it } from 'vitest';
import { formatDate } from '../../lib/format';
import { faq } from '../faq/faqContent';
import { locales } from '../i18n/locales';
import { legal } from '../legal/content';
import { chooseTheme, currentTheme } from '../theme/theme';

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe('legal pages (FR-58, FR-59, D-009)', () => {
  it('have the same sections in every language', () => {
    for (const kind of ['privacy', 'terms'] as const) {
      const english = legal.en[kind].sections.map((s) => s.blocks.length);
      for (const locale of locales) {
        expect(
          legal[locale][kind].sections.map((s) => s.blocks.length),
          `${locale} ${kind}`,
        ).toEqual(english);
      }
    }
  });

  it('cover what the privacy policy must explain', () => {
    const text = JSON.stringify(legal.en.privacy);
    for (const topic of [
      'Republic Act No. 10173',
      'contact form',
      'Meta',
      'Supabase',
      'Sentry',
      '180 days',
      'National Privacy Commission',
    ]) {
      expect(text).toContain(topic);
    }
  });

  it('use only the known placeholders and no em dashes', () => {
    const text = JSON.stringify(legal);
    expect(
      text.match(/\{[a-z]+\}/g)?.every((t) => ['{address}', '{phone}', '{messenger}'].includes(t)),
    ).toBe(true);
    expect(text).not.toContain('—');
  });
});

describe('FAQ content (FR-33)', () => {
  it('has the same entries in every language, none empty', () => {
    for (const locale of locales) {
      expect(faq[locale]).toHaveLength(faq.en.length);
      for (const entry of faq[locale]) {
        expect(entry.question.trim()).not.toBe('');
        expect(entry.answer.trim()).not.toBe('');
        expect(entry.answer).not.toContain('—');
      }
    }
  });
});

describe('theme (FR-66)', () => {
  it('remembers an explicit choice and applies it to <html>', () => {
    chooseTheme('dark');
    expect(currentTheme()).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('seoul-mate.theme')).toBe('dark');
    chooseTheme('light');
    expect(currentTheme()).toBe('light');
  });
});

describe('formatDate', () => {
  it('shows a calendar date in each language', () => {
    expect(formatDate('2026-10-19', 'en')).toBe('October 19, 2026');
    expect(formatDate('2026-10-19', 'fil')).toBe('Oktubre 19, 2026');
    expect(formatDate('2026-10-19', 'ko')).toBe('2026년 10월 19일');
  });
});
