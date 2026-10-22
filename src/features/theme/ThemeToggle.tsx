import { useState } from 'react';
import { flushSync } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../components/Icon';
import { motionAllowed } from '../motion/motion';
import { chooseTheme, useTheme } from './theme';

/** Switches between light and dark (FR-66). Pressed means dark. */
export function ThemeToggle({ className = 'theme-toggle' }: { className?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const dark = theme === 'dark';
  // The icon spins in after a click only, not on every page load (D-038).
  const [swapped, setSwapped] = useState(false);

  return (
    <button
      type="button"
      className={className}
      aria-pressed={dark}
      {...(swapped ? { 'data-swapped': '' } : {})}
      onClick={() => {
        const next = dark ? 'light' : 'dark';
        setSwapped(true);
        // Where the browser can, the old colors cross-fade into the new ones.
        if (motionAllowed() && 'startViewTransition' in document) {
          document.startViewTransition(() => {
            flushSync(() => {
              chooseTheme(next);
            });
          });
        } else {
          chooseTheme(next);
        }
      }}
    >
      <Icon key={theme} name={dark ? 'moon' : 'sun'} className="theme-toggle__icon" />
      <span>{t('theme.dark')}</span>
    </button>
  );
}
