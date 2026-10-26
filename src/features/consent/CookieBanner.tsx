import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useLocale } from '../i18n/localeContext';
import { motionMs } from '../motion/motion';
import { chooseConsent, useConsent, type ConsentChoice } from './consent';

/**
 * The privacy banner (FR-54): short text, Accept and Decline of equal size and style, and a
 * link to the privacy policy. It does not take focus or block the page; it sits in the
 * floating stack, so it never covers the contact or back to top buttons (FR-65).
 */
export function CookieBanner() {
  const { bannerOpen } = useConsent();
  // Mounted afresh each time it opens, so a banner reopened from the footer starts over.
  return bannerOpen ? <Banner /> : null;
}

function Banner() {
  const { t } = useTranslation();
  const locale = useLocale();
  const [leaving, setLeaving] = useState(false);

  // The banner drops away first, then the choice is recorded and it is removed (D-038).
  function choose(choice: ConsentChoice) {
    if (leaving) return;
    const wait = motionMs('--duration-fast');
    if (wait === 0) {
      chooseConsent(choice);
      return;
    }
    setLeaving(true);
    window.setTimeout(() => {
      chooseConsent(choice);
    }, wait);
  }

  return (
    <section
      className="consent"
      aria-labelledby="consent-title"
      {...(leaving ? { 'data-leaving': '' } : {})}
    >
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
            choose('accepted');
          }}
        >
          {t('consent.accept')}
        </button>
        <button
          type="button"
          className="button button--consent"
          onClick={() => {
            choose('declined');
          }}
        >
          {t('consent.decline')}
        </button>
      </div>
    </section>
  );
}
