import { useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageLinks } from '../features/i18n/LanguageLinks';
import { motionMs } from '../features/motion/motion';
import { ThemeToggle } from '../features/theme/ThemeToggle';
import { Icon } from './Icon';
import { sections, useSectionHref } from './sections';

/**
 * Navigation on small screens (FR-61). A modal dialog: the rest of the page is inert while
 * it is open, so keyboard focus stays inside, and Escape closes it. A link tap closes it too.
 * It slides out before closing, unless the visitor prefers reduced motion (D-038).
 */
export function MobileMenu() {
  const { t } = useTranslation();
  const sectionHref = useSectionHref();
  const dialog = useRef<HTMLDialogElement>(null);
  const closing = useRef<number | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const titleId = useId();

  function close() {
    const element = dialog.current;
    if (!element?.open || element.dataset.closing !== undefined) return;
    const wait = motionMs('--duration-fast');
    if (wait === 0) {
      element.close();
      return;
    }
    element.dataset.closing = '';
    closing.current = window.setTimeout(() => {
      element.close();
    }, wait);
  }

  return (
    <>
      <button
        type="button"
        className="menu-button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          dialog.current?.showModal();
          setOpen(true);
        }}
      >
        <Icon name="menu" />
        <span className="visually-hidden">{t('header.openMenu')}</span>
      </button>
      <dialog
        ref={dialog}
        className="mobile-menu"
        aria-labelledby={titleId}
        onCancel={(event) => {
          // Escape: slide out first, as the close button does.
          event.preventDefault();
          close();
        }}
        onClose={() => {
          // However it closed, a slide-out still waiting must not close the next opening.
          window.clearTimeout(closing.current);
          if (dialog.current) delete dialog.current.dataset.closing;
          setOpen(false);
        }}
      >
        <div className="mobile-menu__top">
          <h2 id={titleId} className="mobile-menu__title">
            {t('header.mobileMenuTitle')}
          </h2>
          <button type="button" className="icon-button" onClick={close}>
            <Icon name="close" />
            <span className="visually-hidden">{t('header.closeMenu')}</span>
          </button>
        </div>
        <nav aria-label={t('header.navLabel')}>
          <ul className="mobile-menu__links">
            {sections.map((section) => (
              <li key={section.id}>
                <a href={sectionHref(section.id)} onClick={close}>
                  {t(section.labelKey)}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <h3 className="mobile-menu__subtitle">{t('language.heading')}</h3>
        <LanguageLinks onSelect={close} />
        <h3 className="mobile-menu__subtitle">{t('theme.heading')}</h3>
        <ThemeToggle />
      </dialog>
    </>
  );
}
