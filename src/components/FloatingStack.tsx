import { useEffect, useRef, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { store } from '../config/store';
import { CookieBanner } from '../features/consent/CookieBanner';
import { Icon } from './Icon';

function subscribeToScroll(onChange: () => void) {
  window.addEventListener('scroll', onChange, { passive: true });
  window.addEventListener('resize', onChange);
  return () => {
    window.removeEventListener('scroll', onChange);
    window.removeEventListener('resize', onChange);
  };
}

function isScrolledDown() {
  return window.scrollY > window.innerHeight;
}

/**
 * One fixed column for everything that floats over the page: back to top, the Messenger
 * button and the privacy banner, stacked so they can never overlap (FR-65). Its height is
 * published as --floating-space, which the page uses to keep focused elements and the
 * footer's last line clear of it (NFR-ACC-07).
 */
export function FloatingStack() {
  const { t } = useTranslation();
  const stack = useRef<HTMLDivElement>(null);
  // FR-63: back to top appears after one screen height of scrolling.
  const scrolledDown = useSyncExternalStore(subscribeToScroll, isScrolledDown, () => false);

  useEffect(() => {
    const element = stack.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const root = document.documentElement;
    const observer = new ResizeObserver(() => {
      root.style.setProperty('--floating-space', `${String(element.offsetHeight)}px`);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--floating-space');
    };
  }, []);

  return (
    <div className="floating-stack" ref={stack}>
      {scrolledDown && (
        <button
          type="button"
          className="floating-top"
          onClick={() => {
            const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
            // Keyboard and screen reader users continue from the top as well.
            document.getElementById('main')?.focus({ preventScroll: true });
          }}
        >
          <Icon name="arrowUp" />
          <span className="visually-hidden">{t('floating.backToTop')}</span>
        </button>
      )}
      {/* FR-27, FR-28: on every public page, opens Messenger. */}
      <a
        className="floating-contact"
        href={store.messengerUrl}
        aria-label={t('contact.floatingLabel')}
      >
        <Icon name="chat" />
        <span>{t('contact.floating')}</span>
      </a>
      <CookieBanner />
    </div>
  );
}
