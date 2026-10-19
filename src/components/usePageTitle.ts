import { useEffect } from 'react';
import { store } from '../config/store';

/** Sets the browser tab title, such as "Privacy Policy | Seoul-Mate Minimart". */
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${store.name}` : store.name;
  }, [title]);
}
