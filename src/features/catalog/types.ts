import type { Database } from '../../lib/database.types';

type Tables = Database['public']['Tables'];

/** The category columns the public site reads (E1). */
export type Category = Pick<
  Tables['categories']['Row'],
  'id' | 'slug' | 'name_en' | 'name_fil' | 'name_ko' | 'sort_order'
>;

/** The item columns visitors are allowed to read (E2, BACKEND-SCHEMA 3). */
export type Item = Pick<
  Tables['items']['Row'],
  | 'id'
  | 'category_id'
  | 'name_en'
  | 'name_fil'
  | 'name_ko'
  | 'description_en'
  | 'description_fil'
  | 'description_ko'
  | 'price_centavos'
  | 'photo_path'
  | 'photo_format'
  | 'is_available'
  | 'is_sample'
  | 'sort_order'
  | 'availability_changed_at'
>;

export interface Menu {
  categories: readonly Category[];
  /** Published items only: RLS never returns hidden ones (FR-07). */
  items: readonly Item[];
  /** `menu_state.version` read with this menu (D-020). */
  version: number;
}

export interface MenuSubscription {
  /** A change event for `menu_state`. */
  onChange: () => void;
  /** Whether the live connection is up. */
  onStatus: (status: 'live' | 'down') => void;
}

/** Where the menu comes from. The app uses Supabase; tests pass a fake. */
export interface MenuSource {
  load: () => Promise<Menu>;
  loadVersion: () => Promise<number>;
  /** Starts listening for menu changes. Returns a function that stops it. */
  subscribe: (subscription: MenuSubscription) => () => void;
}
