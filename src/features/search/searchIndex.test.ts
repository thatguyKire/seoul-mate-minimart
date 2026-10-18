import { describe, expect, it } from 'vitest';
import { fixtureMenu } from '../../test/menuFixture';
import type { Menu } from '../catalog/types';
import { buildSearchIndex, normalize, searchItems } from './searchIndex';

const menu = fixtureMenu();

function search(query: string, locale: 'en' | 'fil' | 'ko' = 'en') {
  const index = buildSearchIndex(menu, locale);
  return searchItems(menu.items, index, query).map((item) => item.name_en);
}

describe('normalize (FR-13)', () => {
  it('lowercases, collapses spaces and applies NFKC', () => {
    expect(normalize('  Shin   RAMYUN ')).toBe('shin ramyun');
    // Full-width letters, as some Korean keyboards type them.
    expect(normalize('ＳＨＩＮ')).toBe('shin');
  });
});

describe('searchItems (FR-12 to FR-15)', () => {
  it('matches item names, ignoring case and extra spaces', () => {
    expect(search('  BULDAK  ')).toEqual(['Buldak Hot Chicken Ramen']);
  });

  it('matches descriptions and category names', () => {
    expect(search('chocolate')).toEqual(['Pepero Original']);
    expect(search('household')).toEqual(['Dish Sponge, 3 pack', 'Laundry Detergent Sheets']);
  });

  it('needs every word, in any order', () => {
    expect(search('milk banana')).toEqual(['Banana Milk']);
    expect(search('milk mango')).toEqual([]);
  });

  it('matches the page language and English together', () => {
    expect(search('라면', 'ko')).toEqual([
      'Shin Ramyun',
      'Buldak Hot Chicken Ramen',
      'Jin Ramen Mild',
    ]);
    expect(search('ramyun', 'ko')).toEqual(['Shin Ramyun']);
    expect(search('maanghang', 'fil')).toEqual(['Shin Ramyun']);
  });

  it('returns everything for an empty query', () => {
    expect(search('   ')).toHaveLength(menu.items.length);
  });

  it('treats markup and SQL as plain text that matches nothing', () => {
    for (const query of [
      '<script>alert(1)</script>',
      '<img src=x onerror=alert(1)>',
      "' OR 1=1 --",
      "'); drop table items; --",
      '%',
      '.*',
    ]) {
      expect(search(query)).toEqual([]);
    }
  });

  it('filters 1,000 items well within 100 ms (NFR-PERF-05)', () => {
    const [base] = menu.items;
    if (!base) throw new Error('The fixture menu is empty');
    const items = Array.from({ length: 1000 }, (_, i) => ({
      ...base,
      id: `bulk-${String(i)}`,
      name_en: `Item ${String(i)} ${i % 7 === 0 ? 'ramyun' : 'snack'}`,
    }));
    const big: Menu = { ...menu, items };
    const index = buildSearchIndex(big, 'en');
    const started = performance.now();
    const results = searchItems(items, index, 'ramyun');
    const elapsed = performance.now() - started;
    expect(results).toHaveLength(143);
    expect(elapsed).toBeLessThan(100);
  });
});
