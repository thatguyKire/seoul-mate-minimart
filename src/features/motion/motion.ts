// Motion (D-038). Phones get tap-driven transitions only; a desktop with a mouse also gets the
// hero entrance and scroll reveals ("rich" motion). Everything is off when the visitor prefers
// reduced motion: index.css switches off animations and transitions, and the helpers below
// skip the waits that exit animations would need.

/** The same query the stylesheets use for rich motion. */
export const richMotionQuery =
  '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';

function matches(query: string): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
}

export function motionAllowed(): boolean {
  return !matches('(prefers-reduced-motion: reduce)');
}

/**
 * A duration token from index.css in milliseconds, such as motionMs('--duration-fast'), for
 * waiting out an exit animation. 0 when motion is off or the token is missing.
 */
export function motionMs(token: string): number {
  if (!motionAllowed()) return 0;
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  const amount = Number.parseFloat(value);
  if (Number.isNaN(amount)) return 0;
  return value.endsWith('ms') ? amount : amount * 1000;
}

/** Keeps <html data-motion="rich"> in step with richMotionQuery. Call once at startup. */
export function startMotion() {
  if (typeof window.matchMedia !== 'function') return;
  const query = window.matchMedia(richMotionQuery);
  const root = document.documentElement;
  const apply = () => {
    if (query.matches) {
      // Anything already on the page has been seen: never hide it after the fact.
      for (const element of document.querySelectorAll<HTMLElement>('[data-reveal]')) {
        element.dataset.reveal = 'shown';
      }
      root.dataset.motion = 'rich';
    } else {
      delete root.dataset.motion;
    }
  };
  apply();
  query.addEventListener('change', apply);
}

const stagger = 40;
const maxStaggered = 8;
let observer: IntersectionObserver | undefined;

function revealObserver(): IntersectionObserver | undefined {
  if (observer || typeof IntersectionObserver === 'undefined') return observer;
  observer = new IntersectionObserver(
    (entries, self) => {
      // Elements that come into view together cascade, 40ms apart (--duration-stagger).
      entries
        .filter((entry) => entry.isIntersecting)
        .forEach((entry, index) => {
          const element = entry.target as HTMLElement;
          const delay = Math.min(index, maxStaggered) * stagger;
          element.style.setProperty('--reveal-delay', `${String(delay)}ms`);
          element.dataset.reveal = 'shown';
          self.unobserve(element);
        });
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  return observer;
}

function observe(elements: HTMLElement[]): (() => void) | undefined {
  const reveals = document.documentElement.dataset.motion === 'rich' ? revealObserver() : undefined;
  if (!reveals) return undefined;
  for (const element of elements) {
    element.dataset.reveal = 'pending';
    reveals.observe(element);
  }
  return () => {
    for (const element of elements) reveals.unobserve(element);
  };
}

/**
 * Ref callback: with rich motion, the element fades up the first time it scrolls into view.
 * Without it, nothing is marked, so nothing is ever hidden.
 */
export function reveal(element: HTMLElement | null) {
  return element ? observe([element]) : undefined;
}

/** Ref callback for a container: each child element reveals on its own, cascading. */
export function revealEach(container: HTMLElement | null) {
  if (!container) return undefined;
  return observe(
    [...container.children].filter((child): child is HTMLElement => child instanceof HTMLElement),
  );
}
