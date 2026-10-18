import { describe, expect, it } from 'vitest';
import { fixtureMenu } from '../../test/menuFixture';
import { buildSearchIndex } from '../search/searchIndex';
import { buildMenuView, lastAvailabilityChange } from './menuView';
import type { Menu } from './types';

const menu = fixtureMenu();
const index = buildSearchIndex(menu, 'en');

describe('buildMenuView (FR-01, FR-05)', () => {
  it('groups items by category in staff order', () => {
    const view = buildMenuView(menu, null, '', index);
    expect(view.groups.map((group) => group.category.slug)).toEqual([
      'snacks-drinks',
      'instant-noodles',
      'beauty-skincare',
      'household-essentials',
    ]);
    expect(view.groups[1]?.items.map((item) => item.name_en)).toEqual([
      'Shin Ramyun',
      'Buldak Hot Chicken Ramen',
      'Jin Ramen Mild',
    ]);
    expect(view.matchCount).toBe(menu.items.length);
  });

  it('keeps out-of-stock items on the menu (FR-04)', () => {
    const view = buildMenuView(menu, null, '', index);
    const all = view.groups.flatMap((group) => group.items);
    expect(all.filter((item) => !item.is_available).map((item) => item.name_en)).toEqual([
      'Banana Milk',
      'Buldak Hot Chicken Ramen',
      'Laundry Detergent Sheets',
    ]);
  });

  it('filters to one category', () => {
    const view = buildMenuView(menu, 'beauty-skincare', '', index);
    expect(view.selected?.slug).toBe('beauty-skincare');
    expect(view.groups).toHaveLength(1);
    expect(view.matchCount).toBe(2);
  });

  it('shows everything for an unknown category in the address', () => {
    const view = buildMenuView(menu, 'no-such-category', '', index);
    expect(view.selected).toBeUndefined();
    expect(view.groups).toHaveLength(4);
  });

  it('combines the category filter and search', () => {
    expect(buildMenuView(menu, 'instant-noodles', 'spicy', index).matchCount).toBe(2);
    expect(buildMenuView(menu, 'beauty-skincare', 'spicy', index).matchCount).toBe(0);
  });

  it('offers only categories that have items as filters', () => {
    const empty = {
      id: 'empty',
      slug: 'empty',
      name_en: 'Empty',
      name_fil: null,
      name_ko: null,
      sort_order: 9,
    };
    const withEmpty: Menu = { ...menu, categories: [...menu.categories, empty] };
    const view = buildMenuView(withEmpty, null, '', buildSearchIndex(withEmpty, 'en'));
    expect(view.filterCategories.map((c) => c.slug)).not.toContain('empty');
  });
});

describe('lastAvailabilityChange (FR-08)', () => {
  it('is the latest change among the items', () => {
    expect(lastAvailabilityChange(menu.items)).toBe('2026-10-18T12:05:00.000Z');
  });

  it('is undefined for an empty menu', () => {
    expect(lastAvailabilityChange([])).toBeUndefined();
  });
});
