import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import { App } from '../App';
import { MenuSourceContext } from '../features/catalog/menuSourceContext';
import type { Menu, MenuSource } from '../features/catalog/types';
import { fixtureMenu } from './menuFixture';

/** A menu source that answers at once with the fixture menu, or fails. */
export function staticSource(menu: Menu | Error = fixtureMenu()): MenuSource {
  return {
    load: vi.fn(() => (menu instanceof Error ? Promise.reject(menu) : Promise.resolve(menu))),
    loadVersion: vi.fn(() =>
      menu instanceof Error ? Promise.reject(menu) : Promise.resolve(menu.version),
    ),
    subscribe: vi.fn(() => () => undefined),
  };
}

export function renderApp(path: string, source: MenuSource = staticSource()) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <MenuSourceContext value={source}>
        <App />
      </MenuSourceContext>
    </MemoryRouter>,
  );
}
