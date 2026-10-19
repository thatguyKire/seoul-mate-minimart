import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { store } from '../config/store';
import { reopenBanner } from '../features/consent/consent';
import { useLocale } from '../features/i18n/localeContext';

export function Footer() {
  const { t } = useTranslation();
  const locale = useLocale();

  return (
    <footer className="site-footer">
      <div className="site-footer__inner container">
        <div>
          <p className="site-footer__name">{store.name}</p>
          <p className="site-footer__tagline">{t('footer.tagline')}</p>
        </div>
        <ul className="site-footer__links">
          <li>
            <a href={store.facebookUrl}>{t('footer.facebook')}</a>
          </li>
          <li>
            <a href={store.messengerUrl}>{t('contact.floatingLabel')}</a>
          </li>
          <li>
            <a href={store.phone.href}>{store.phone.display}</a>
          </li>
        </ul>
        <ul className="site-footer__links site-footer__legal">
          <li>
            <Link to={`/${locale}/privacy`}>{t('footer.privacy')}</Link>
          </li>
          <li>
            <Link to={`/${locale}/terms`}>{t('footer.terms')}</Link>
          </li>
          <li>
            {/* FR-56: the privacy choice can be changed at any time. */}
            <button type="button" className="site-footer__button" onClick={reopenBanner}>
              {t('footer.privacyChoices')}
            </button>
          </li>
        </ul>
        <p className="site-footer__copyright">
          © {new Date().getFullYear()} {store.name}
        </p>
      </div>
    </footer>
  );
}
