// Menu reads and live updates through Supabase (E1 to E4, SDD 7.1).
import { REALTIME_SUBSCRIBE_STATES } from '@supabase/realtime-js';
import type { PublicClient } from '../../lib/supabase';
import type { Menu, MenuSource } from './types';

const categoryColumns = 'id, slug, name_en, name_fil, name_ko, sort_order';
// Only columns the anonymous role may select (BACKEND-SCHEMA 3). Asking for any other
// column would make the whole request fail. One string literal, so the client can type the rows.
const itemColumns =
  'id, category_id, name_en, name_fil, name_ko, description_en, description_fil, description_ko, price_centavos, photo_path, is_available, is_sample, sort_order, availability_changed_at';

export function createSupabaseMenuSource(client: PublicClient): MenuSource {
  async function loadVersion(): Promise<number> {
    const { data, error } = await client.rest
      .from('menu_state')
      .select('version')
      .eq('id', 1)
      .single();
    if (error) throw new Error(`menu_state read failed: ${error.code}`);
    return data.version;
  }

  return {
    async load(): Promise<Menu> {
      // The version request goes out first. A change that commits while the menu loads then
      // leaves the stored version behind the data, which costs one extra reload at the next
      // check instead of a missed update.
      const [version, categories, items] = await Promise.all([
        loadVersion(),
        client.rest.from('categories').select(categoryColumns).order('sort_order').order('name_en'),
        client.rest.from('items').select(itemColumns).order('sort_order').order('name_en'),
      ]);
      if (categories.error) throw new Error(`categories read failed: ${categories.error.code}`);
      if (items.error) throw new Error(`items read failed: ${items.error.code}`);
      return { version, categories: categories.data, items: items.data };
    },

    loadVersion,

    subscribe({ onChange, onStatus }) {
      const channel = client.realtime
        .channel('menu-state')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'menu_state' }, () => {
          onChange();
        })
        .subscribe((status) => {
          // CHANNEL_ERROR, TIMED_OUT and CLOSED all mean no live updates for now.
          // The client keeps trying to rejoin on its own.
          onStatus(status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED ? 'live' : 'down');
        });
      return () => {
        void client.realtime.removeChannel(channel);
      };
    },
  };
}
