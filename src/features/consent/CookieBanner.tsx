import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useLocale } from '../i18n/localeContext';
import { chooseConsent, useConsent } from './consent';

/**
 * The privacy banner (FR-54): short text, Accept and Decline of equal size and style, and a
 * link to the privacy policy. It does not take focus or block the page; it sits in the
 * floating stack, so it never covers the contact or back to top buttons (FR-65).
 */
export function CookieBanner() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { bannerOpen } = useConsent();
  if (!bannerOpen) return null;

  return (
    <section className="consent" aria-labelledby="consent-title">
      <h2 id="consent-title" className="consent__title">
        {t('consent.title')}
      </h2>
      <p className="consent__text">
        {t('consent.text')} <Link to={`/${locale}/privacy`}>{t('consent.policy')}</Link>
      </p>
      <div className="consent__actions">
        <button
          type="button"
          className="button button--consent"
          onClick={() => {
            chooseConsent('accepted');
          }}
        >
          {t('consent.accept')}
        </button>
        <button
          type="button"
          className="button button--consent"
          onClick={() => {
            chooseConsent('declined');
          }}
        >
          {t('consent.decline')}
        </button>
      </div>
    </section>
  );
}
