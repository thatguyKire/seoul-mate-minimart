import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../components/Icon';
import { LanguageLinks } from './LanguageLinks';
import { useLocale } from './localeContext';
import { localeNames } from './locales';

/** The header's language button (FR-16). Opens a short list of links; Escape or a click outside closes it. */
export function LanguageSwitcher() {
  const { t } = useTranslation();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!(event.target instanceof Node) || !container.current?.contains(event.target)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    }
    // Tabbing past the last language closes the list.
    function onFocusIn(event: FocusEvent) {
      if (!(event.target instanceof Node) || !container.current?.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [open]);

  return (
    <div className="language-switcher" ref={container}>
      <button
        ref={button}
        type="button"
        className="language-switcher__button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={t('language.current', { name: localeNames[locale] })}
        onClick={() => {
          setOpen((value) => !value);
        }}
      >
        <Icon name="globe" />
        <span>{localeNames[locale]}</span>
        <Icon name="chevronDown" className="language-switcher__chevron" />
      </button>
      <div id={panelId} className="language-switcher__panel" hidden={!open}>
        <LanguageLinks
          onSelect={() => {
            setOpen(false);
          }}
        />
      </div>
    </div>
  );
}
