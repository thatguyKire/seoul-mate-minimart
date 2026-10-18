import { useTranslation } from 'react-i18next';
import { store } from '../config/store';
import { Icon } from './Icon';

/**
 * One fixed container for everything that floats over the page, stacked so nothing
 * overlaps (FR-65). Step 8 adds the back to top button and makes room for the cookie banner.
 */
export function FloatingStack() {
  const { t } = useTranslation();

  return (
    <div className="floating-stack">
      {/* FR-27, FR-28: on every public page, opens Messenger. */}
      <a
        className="floating-contact"
        href={store.messengerUrl}
        aria-label={t('contact.floatingLabel')}
      >
        <Icon name="chat" />
        <span>{t('contact.floating')}</span>
      </a>
    </div>
  );
}
