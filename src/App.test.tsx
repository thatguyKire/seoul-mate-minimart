import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderApp, staticSource } from './test/renderApp';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

function card(name: string): HTMLElement {
  const heading = screen.getByRole('heading', { level: 4, name });
  const item = heading.closest('li');
  if (!item) throw new Error(`No card for ${name}`);
  return item;
}

describe('language routes (FR-16 to FR-20)', () => {
  it('sends the root to the browser language', async () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['ko-KR', 'en']);
    renderApp('/');
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: '마스바테 시티의 한국 과자, 라면, 스킨케어',
      }),
    ).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('ko');
  });

  it('prefers the saved choice over the browser language', async () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['ko-KR']);
    localStorage.setItem('seoul-mate.locale', 'fil');
    renderApp('/');
    expect(await screen.findAllByRole('link', { name: 'Umorder sa Messenger' })).not.toHaveLength(
      0,
    );
  });

  it('offers each language in its own language, linking to the same page and filter', async () => {
    renderApp('/en/?category=instant-noodles');
    await screen.findByRole('heading', { level: 4, name: 'Shin Ramyun' });
    // The links sit in the closed language list, so they are hidden until it opens.
    const nav = screen.getAllByRole('link', { name: '한국어', hidden: true })[0];
    expect(nav).toHaveAttribute('href', '/ko/?category=instant-noodles');
    expect(nav).toHaveAttribute('lang', 'ko');
  });

  it('switches language without a reload and remembers the choice', async () => {
    const user = userEvent.setup();
    renderApp('/en/');
    await screen.findByRole('heading', { level: 4, name: 'Shin Ramyun' });
    await user.click(screen.getByRole('button', { name: 'Language: English' }));
    await user.click(screen.getByRole('link', { name: 'Filipino' }));
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Paano umorder' }),
    ).toBeInTheDocument();
    expect(localStorage.getItem('seoul-mate.locale')).toBe('fil');
    expect(document.documentElement.lang).toBe('fil');
  });

  it('marks English fallback text with lang="en" (FR-21, NFR-ACC-05)', async () => {
    renderApp('/ko/');
    const heading = await screen.findByRole('heading', { level: 4, name: 'Jin Ramen Mild' });
    expect(heading).toHaveAttribute('lang', 'en');
    expect(screen.getByRole('heading', { level: 4, name: '신라면' })).not.toHaveAttribute('lang');
  });

  it('sends an unknown language prefix back to the root', async () => {
    renderApp('/de/');
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
  });

  it('shows a page-not-found message for unknown pages', async () => {
    renderApp('/en/nothing-here');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
  });
});

describe('menu (FR-01 to FR-11)', () => {
  it('shows items by category with price, availability and a photo placeholder', async () => {
    renderApp('/en/');
    await screen.findByRole('heading', { level: 4, name: 'Banana Milk' });
    const banana = card('Banana Milk');
    expect(within(banana).getByText('₱75.00')).toBeInTheDocument();
    expect(within(banana).getByText('Out of stock')).toBeInTheDocument();
    expect(within(banana).getByText('Photo coming soon')).toBeInTheDocument();
    expect(within(card('Honey Butter Chip')).getByText('In stock')).toBeInTheDocument();

    const categories = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(categories.slice(0, 4)).toEqual([
      'Snacks and Drinks',
      'Instant Noodles',
      'Beauty and Skincare',
      'Household Essentials',
    ]);
  });

  it('labels sample items outside production (D-010)', async () => {
    renderApp('/en/');
    await screen.findByRole('heading', { level: 4, name: 'Shin Ramyun' });
    expect(within(card('Shin Ramyun')).getByText('Sample')).toBeInTheDocument();
    expect(screen.getByText(/this menu shows test products/)).toBeInTheDocument();
  });

  it('shows when stock last changed, in Philippine time', async () => {
    renderApp('/en/');
    const time = await screen.findByText('Oct 18, 2026, 8:05 PM');
    expect(time.tagName).toBe('TIME');
    expect(time).toHaveAttribute('dateTime', '2026-10-18T12:05:00.000Z');
  });

  it('filters to one category and back to all', async () => {
    const user = userEvent.setup();
    renderApp('/en/');
    await screen.findByRole('heading', { level: 4, name: 'Shin Ramyun' });
    const filter = screen.getByRole('navigation', { name: 'Categories' });

    await user.click(within(filter).getByRole('link', { name: 'Beauty and Skincare' }));
    expect(within(filter).getByRole('link', { name: 'Beauty and Skincare' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(
      screen.queryByRole('heading', { level: 4, name: 'Shin Ramyun' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: 'Sheet Mask' })).toBeInTheDocument();

    await user.click(within(filter).getByRole('link', { name: 'All' }));
    expect(screen.getByRole('heading', { level: 4, name: 'Shin Ramyun' })).toBeInTheDocument();
  });

  it('shows a plain error with Messenger and phone links, then recovers on retry', async () => {
    const user = userEvent.setup();
    const source = staticSource(new Error('PGRST000 connection refused'));
    renderApp('/en/', source);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("We couldn't load the menu right now.");
    expect(alert).not.toHaveTextContent('PGRST000');
    expect(within(alert).getByRole('link', { name: 'Ask on Messenger' })).toHaveAttribute(
      'href',
      'https://m.me/61594474910928',
    );
    expect(within(alert).getByRole('link', { name: '0939 126 5349' })).toHaveAttribute(
      'href',
      'tel:+639391265349',
    );

    vi.mocked(source.load).mockResolvedValueOnce(
      (await import('./test/menuFixture')).fixtureMenu(),
    );
    await user.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(
      await screen.findByRole('heading', { level: 4, name: 'Shin Ramyun' }),
    ).toBeInTheDocument();
  });

  it('shows skeleton cards while loading, not a full-screen loader (FR-10)', () => {
    const source = staticSource();
    vi.mocked(source.load).mockReturnValue(new Promise(() => undefined));
    const { container } = renderApp('/en/', source);
    expect(container.querySelectorAll('.item-card--skeleton')).toHaveLength(6);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});

describe('search (FR-12 to FR-15)', () => {
  it('filters as the visitor types and says how many match', async () => {
    const user = userEvent.setup();
    renderApp('/en/');
    await screen.findByRole('heading', { level: 4, name: 'Shin Ramyun' });
    await user.type(screen.getByRole('searchbox', { name: 'Search the menu' }), '  MILK ');
    await waitFor(() => {
      expect(screen.getAllByRole('heading', { level: 4 }).map((h) => h.textContent)).toEqual([
        'Banana Milk',
        'Strawberry Milk',
      ]);
    });
    expect(screen.getByText('2 items found')).toBeInTheDocument();
  });

  it('shows typed markup as text, with a Messenger link, when nothing matches', async () => {
    const user = userEvent.setup();
    const { container } = renderApp('/en/');
    await screen.findByRole('heading', { level: 4, name: 'Shin Ramyun' });
    const query = '<img src=x onerror=alert(1)>';
    await user.type(screen.getByRole('searchbox'), query);

    expect(await screen.findByText(`Nothing on the menu matches “${query}”.`)).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('link', { name: 'Ask on Messenger' })).toHaveAttribute(
      'href',
      'https://m.me/61594474910928',
    );
  });
});

describe('store information (FR-22 to FR-28)', () => {
  it('lists hours for each day, with next-day closing', async () => {
    renderApp('/en/');
    const table = await screen.findByRole('table', { name: 'Opening hours' });
    expect(
      within(table).getByRole('row', { name: 'Monday 9:00 AM to 2:00 AM (next day)' }),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole('row', { name: 'Friday 9:00 AM to 2:00 PM' }),
    ).toBeInTheDocument();
    expect(within(table).getAllByRole('row')).toHaveLength(8);
  });

  it('has a tap-to-call link and a Messenger button on every page', async () => {
    renderApp('/en/nothing-here');
    await screen.findByRole('heading', { level: 1 });
    // The floating button and the footer link.
    const messenger = screen.getAllByRole('link', { name: 'Message us on Messenger' });
    expect(messenger).toHaveLength(2);
    for (const link of messenger)
      expect(link).toHaveAttribute('href', 'https://m.me/61594474910928');
    expect(screen.getAllByRole('link', { name: '0939 126 5349' })[0]).toHaveAttribute(
      'href',
      'tel:+639391265349',
    );
  });

  it('explains ordering, pickup and payment', async () => {
    renderApp('/en/');
    const section = await screen.findByRole('region', { name: 'How to order' });
    expect(section).toHaveTextContent('Pay with cash or GCash');
    expect(section).toHaveTextContent("We don't deliver yet.");
  });
});
