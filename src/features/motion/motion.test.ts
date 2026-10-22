import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Motion = typeof import('./motion');

// jsdom has neither matchMedia nor IntersectionObserver: stand-ins the tests can drive.
let media: Record<string, boolean>;
const mediaListeners = new Set<() => void>();

function setMedia(next: Record<string, boolean>) {
  media = next;
  for (const listener of mediaListeners) listener();
}

class FakeIntersectionObserver {
  static last: FakeIntersectionObserver | undefined;
  readonly observed = new Set<Element>();
  constructor(private readonly callback: IntersectionObserverCallback) {
    FakeIntersectionObserver.last = this;
  }
  observe(element: Element) {
    this.observed.add(element);
  }
  unobserve(element: Element) {
    this.observed.delete(element);
  }
  disconnect() {
    this.observed.clear();
  }
  /** Reports these elements as on screen, the others as off it. */
  show(...elements: Element[]) {
    const entries = [...this.observed].map(
      (target) =>
        ({ target, isIntersecting: elements.includes(target) }) as IntersectionObserverEntry,
    );
    this.callback(entries, this as unknown as IntersectionObserver);
  }
}

const rich = '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';
const reduce = '(prefers-reduced-motion: reduce)';

let motion: Motion;

beforeEach(async () => {
  media = {};
  mediaListeners.clear();
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() {
      return media[query] ?? false;
    },
    addEventListener: (_type: string, listener: () => void) => mediaListeners.add(listener),
  }));
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  FakeIntersectionObserver.last = undefined;
  // A fresh module each time: it keeps one observer for the whole page.
  vi.resetModules();
  motion = await import('./motion');
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.motion;
  document.documentElement.style.cssText = '';
  document.body.replaceChildren();
});

function cards(count: number): HTMLElement[] {
  return Array.from({ length: count }, () =>
    document.body.appendChild(document.createElement('li')),
  );
}

describe('motion durations (D-038)', () => {
  it('reads a duration token in milliseconds, or seconds', () => {
    document.documentElement.style.setProperty('--duration-fast', '250ms');
    document.documentElement.style.setProperty('--duration-long', '1.5s');
    expect(motion.motionMs('--duration-fast')).toBe(250);
    expect(motion.motionMs('--duration-long')).toBe(1500);
    expect(motion.motionMs('--duration-missing')).toBe(0);
  });

  it('waits for nothing when the visitor prefers reduced motion (NFR-ACC-04)', () => {
    document.documentElement.style.setProperty('--duration-fast', '250ms');
    setMedia({ [reduce]: true });
    expect(motion.motionAllowed()).toBe(false);
    expect(motion.motionMs('--duration-fast')).toBe(0);
  });
});

describe('rich motion and scroll reveals (D-038)', () => {
  it('hides nothing on phones or with reduced motion', () => {
    motion.startMotion();
    const [card] = cards(1);
    motion.reveal(card ?? null);
    expect(document.documentElement.dataset.motion).toBeUndefined();
    expect(card?.dataset.reveal).toBeUndefined();
    expect(FakeIntersectionObserver.last).toBeUndefined();
  });

  it('on a desktop with a mouse, reveals elements once as they come into view, cascading', () => {
    setMedia({ [rich]: true });
    motion.startMotion();
    expect(document.documentElement.dataset.motion).toBe('rich');

    const list = document.body.appendChild(document.createElement('ul'));
    const items = [1, 2, 3].map(() => list.appendChild(document.createElement('li')));
    motion.revealEach(list);
    expect(items.map((item) => item.dataset.reveal)).toEqual(['pending', 'pending', 'pending']);

    const observer = FakeIntersectionObserver.last;
    observer?.show(items[0] as Element, items[1] as Element);
    expect(items.map((item) => item.dataset.reveal)).toEqual(['shown', 'shown', 'pending']);
    expect(items[0]?.style.getPropertyValue('--reveal-delay')).toBe('0ms');
    expect(items[1]?.style.getPropertyValue('--reveal-delay')).toBe('40ms');
    // Shown elements are left alone from then on.
    expect([...(observer?.observed ?? [])]).toEqual([items[2]]);
  });

  it('caps the cascade, so a long list never waits long', () => {
    setMedia({ [rich]: true });
    motion.startMotion();
    const many = cards(12);
    for (const card of many) motion.reveal(card);
    FakeIntersectionObserver.last?.show(...many);
    expect(many.at(-1)?.style.getPropertyValue('--reveal-delay')).toBe('320ms');
  });

  it('stops watching an element that leaves the page', () => {
    setMedia({ [rich]: true });
    motion.startMotion();
    const [card] = cards(1);
    const cleanup = motion.reveal(card ?? null);
    cleanup?.();
    expect(FakeIntersectionObserver.last?.observed.size).toBe(0);
  });

  it('never hides what is already on the page when rich motion starts later', () => {
    motion.startMotion();
    const [card] = cards(1);
    if (card) card.dataset.reveal = 'pending';
    setMedia({ [rich]: true });
    expect(document.documentElement.dataset.motion).toBe('rich');
    expect(card?.dataset.reveal).toBe('shown');

    setMedia({ [rich]: false });
    expect(document.documentElement.dataset.motion).toBeUndefined();
  });
});
