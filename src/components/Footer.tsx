import { useTranslation } from 'react-i18next';
import { store } from '../config/store';

export function Footer() {
  const { t } = useTranslation();

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
        <p className="site-footer__copyright">
          © {new Date().getFullYear()} {store.name}
        </p>
      </div>
    </footer>
  );
}
