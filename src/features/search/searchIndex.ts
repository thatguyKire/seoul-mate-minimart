// Menu search in the browser (FR-12 to FR-15, D-017). The query is only ever compared as
// text: it is never parsed, sent anywhere, or rendered as markup.
import type { Locale } from '../i18n/locales';
import { localizedText } from '../i18n/localizedText';
import type { Category, Item, Menu } from '../catalog/types';

/** Unicode NFKC, lowercase, runs of spaces collapsed (FR-13). */
export function normalize(text: string): string {
  return text.normalize('NFKC').toLowerCase().replace(/\s+/gu, ' ').trim();
}

/** For each item: its name, description and category name, in the page language and in English. */
export function buildSearchIndex(menu: Menu, locale: Locale): Map<string, string> {
  const categories = new Map<string, Category>(menu.categories.map((c) => [c.id, c]));
  const index = new Map<string, string>();
  for (const item of menu.items) {
    const category = categories.get(item.category_id);
    const parts = [
      localizedText(item, 'name', locale).text,
      item.name_en,
      localizedText(item, 'description', locale).text,
      item.description_en,
    ];
    if (category) parts.push(localizedText(category, 'name', locale).text, category.name_en);
    index.set(item.id, normalize(parts.join('\n')));
  }
  return index;
}

/** Every word of the query must appear somewhere in the item's text, in any order. */
export function matchesQuery(indexed: string, query: string): boolean {
  const words = normalize(query).split(' ').filter(Boolean);
  return words.every((word) => indexed.includes(word));
}

export function searchItems(
  items: readonly Item[],
  index: Map<string, string>,
  query: string,
): Item[] {
  if (normalize(query) === '') return [...items];
  return items.filter((item) => matchesQuery(index.get(item.id) ?? '', query));
}
