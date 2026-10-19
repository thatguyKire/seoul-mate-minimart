import { useTranslation } from 'react-i18next';
import { Icon } from '../../components/Icon';
import { chooseTheme, useTheme } from './theme';

/** Switches between light and dark (FR-66). Pressed means dark. */
export function ThemeToggle({ className = 'theme-toggle' }: { className?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const dark = theme === 'dark';

  return (
    <button
      type="button"
      className={className}
      aria-pressed={dark}
      onClick={() => {
        chooseTheme(dark ? 'light' : 'dark');
      }}
    >
      <Icon name={dark ? 'moon' : 'sun'} />
      <span>{t('theme.dark')}</span>
    </button>
  );
}
