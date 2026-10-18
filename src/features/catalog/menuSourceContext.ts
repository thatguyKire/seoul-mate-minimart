import { createContext, useContext } from 'react';
import { getPublicClient } from '../../lib/supabase';
import { createSupabaseMenuSource } from './supabaseMenuSource';
import type { MenuSource } from './types';

/** Used when the build has no Supabase settings: the menu shows its error state (FR-11). */
const unavailableSource: MenuSource = {
  load: () => Promise.reject(new Error('Supabase is not configured for this build')),
  loadVersion: () => Promise.reject(new Error('Supabase is not configured for this build')),
  subscribe: () => () => undefined,
};

let defaultSource: MenuSource | undefined;

function getDefaultSource(): MenuSource {
  if (!defaultSource) {
    const client = getPublicClient();
    defaultSource = client ? createSupabaseMenuSource(client) : unavailableSource;
  }
  return defaultSource;
}

/** Tests provide a fake source. Without a provider, the app uses Supabase. */
export const MenuSourceContext = createContext<MenuSource | null>(null);

export function useMenuSource(): MenuSource {
  return useContext(MenuSourceContext) ?? getDefaultSource();
}
