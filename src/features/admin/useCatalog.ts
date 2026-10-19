import { useCallback, useEffect, useState } from 'react';
import { loadCatalog, type AdminCategory, type AdminItem } from './adminData';
import { asAdminError, type FailureKind } from './errors';
import { useAuth } from './session/authContext';

export type CatalogState =
  | { status: 'loading' }
  | { status: 'error'; kind: FailureKind }
  | { status: 'ready'; categories: AdminCategory[]; items: AdminItem[] };

/**
 * All categories and items, hidden ones included, as staff see them (E9). `reload` keeps
 * the current list on screen until the fresh one arrives.
 */
export function useCatalog() {
  const { client } = useAuth();
  const [state, setState] = useState<CatalogState>({ status: 'loading' });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    loadCatalog(client).then(
      ({ categories, items }) => {
        if (active) setState({ status: 'ready', categories, items });
      },
      (error: unknown) => {
        if (active) setState({ status: 'error', kind: asAdminError(error).kind });
      },
    );
    return () => {
      active = false;
    };
  }, [client, version]);

  const reload = useCallback(() => {
    setVersion((value) => value + 1);
  }, []);

  return { state, setState, reload };
}
