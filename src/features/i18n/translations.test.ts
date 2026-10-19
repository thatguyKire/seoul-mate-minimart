import { describe, expect, it } from 'vitest';
import { store } from '../../config/store';
import adminEn from '../admin/locales/en.json';
import { resources } from './i18n';
import { locales } from './locales';

interface Tree {
  [key: string]: string | Tree;
}

function flatten(tree: Tree, prefix = ''): Map<string, string> {
  const entries = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') entries.set(path, value);
    else for (const [k, v] of flatten(value, path)) entries.set(k, v);
  }
  return entries;
}

/** Plural forms differ per language (Korean has only "other"), so compare base keys. */
function baseKeys(entries: Map<string, string>): string[] {
  return [
    ...new Set(
      [...entries.keys()].map((key) => key.replace(/_(zero|one|two|few|many|other)$/, '')),
    ),
  ].sort();
}

const flat = Object.fromEntries(
  locales.map((locale) => [locale, flatten(resources[locale].translation as Tree)]),
) as Record<(typeof locales)[number], Map<string, string>>;

describe('interface text (FR-17, BRIEF 5)', () => {
  it('has the same keys in every language, so nothing falls back by accident', () => {
    const english = baseKeys(flat.en);
    expect(baseKeys(flat.fil)).toEqual(english);
    expect(baseKeys(flat.ko)).toEqual(english);
  });

  it('has no empty text in the staff panel', () => {
    for (const [key, value] of flatten(adminEn)) expect(value.trim(), key).not.toBe('');
  });

  it('has no empty text', () => {
    for (const locale of locales) {
      for (const [key, value] of flat[locale]) {
        expect(value.trim(), `${locale}: ${key}`).not.toBe('');
      }
    }
  });

  it('uses no em dashes, in any language, the staff panel or the store facts', () => {
    const texts = [
      ...locales.flatMap((locale) => [...flat[locale].values()]),
      ...flatten(adminEn).values(),
      JSON.stringify(store),
    ];
    for (const text of texts) expect(text).not.toContain('—');
  });

  it('keeps every interpolation from the English text', () => {
    for (const locale of locales) {
      for (const [key, value] of flat.en) {
        const translated =
          flat[locale].get(key) ?? flat[locale].get(key.replace(/_one$/, '_other'));
        const placeholders = value.match(/\{\{\w+\}\}/g) ?? [];
        for (const placeholder of placeholders) {
          expect(translated, `${locale}: ${key}`).toContain(placeholder);
        }
      }
    }
  });
});
