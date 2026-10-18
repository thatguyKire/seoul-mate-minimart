// What the menu shows for a category filter and a search query (FR-01, FR-05, FR-12).
import { searchItems } from '../search/searchIndex';
import type { Category, Item, Menu } from './types';

export interface MenuGroup {
  category: Category;
  items: Item[];
}

export interface MenuView {
  /** Categories that have published items, in staff order: the filter choices. */
  filterCategories: Category[];
  /** The filtered category, if the address names one that exists. */
  selected: Category | undefined;
  /** Matching items per category, in staff order. Categories without matches are left out. */
  groups: MenuGroup[];
  matchCount: number;
}

export function buildMenuView(
  menu: Menu,
  categorySlug: string | null,
  query: string,
  index: Map<string, string>,
): MenuView {
  const byCategory = new Map<string, Item[]>();
  for (const item of menu.items) {
    const list = byCategory.get(item.category_id);
    if (list) list.push(item);
    else byCategory.set(item.category_id, [item]);
  }

  // Both lists arrive sorted by sort_order from the database (E1, E2).
  const filterCategories = menu.categories.filter((c) => byCategory.has(c.id));
  const selected = menu.categories.find((c) => c.slug === categorySlug);
  const scope = selected ? [selected] : filterCategories;

  const groups = scope
    .map((category) => ({
      category,
      items: searchItems(byCategory.get(category.id) ?? [], index, query),
    }))
    .filter((group) => group.items.length > 0);

  return {
    filterCategories,
    selected,
    groups,
    matchCount: groups.reduce((sum, group) => sum + group.items.length, 0),
  };
}

/** The latest availability change among published items, for "Last updated" (FR-08). */
export function lastAvailabilityChange(items: readonly Item[]): string | undefined {
  let latest: string | undefined;
  let latestTime = -Infinity;
  for (const item of items) {
    const time = Date.parse(item.availability_changed_at);
    if (time > latestTime) {
      latestTime = time;
      latest = item.availability_changed_at;
    }
  }
  return latest;
}
