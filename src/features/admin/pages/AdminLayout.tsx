import { useTranslation } from 'react-i18next';
import { NavLink, Outlet } from 'react-router';
import { store } from '../../../config/store';
import { useAuth } from '../session/authContext';

export function AdminLayout({
  email,
  requireMfa,
  hasMfa,
}: {
  email: string;
  requireMfa: boolean;
  hasMfa: boolean;
}) {
  const { t } = useTranslation('admin');
  const { signOut } = useAuth();

  return (
    <>
      <a className="skip-link" href="#main">
        {t('skipToContent')}
      </a>
      <header className="admin-header">
        <div className="admin-header__inner">
          <p className="admin-header__brand">
            <span className="wordmark__mark" aria-hidden="true">
              S
            </span>
            <span>
              {store.name}
              <span className="admin-header__panel">{t('title')}</span>
            </span>
          </p>
          <nav aria-label={t('nav.label')} className="admin-nav">
            <ul className="admin-nav__list">
              <li>
                <NavLink end to="/admin" className="admin-nav__link">
                  {t('nav.items')}
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin/categories" className="admin-nav__link">
                  {t('nav.categories')}
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin/security" className="admin-nav__link">
                  {t('nav.security')}
                </NavLink>
              </li>
              <li>
                <a className="admin-nav__link" href="/">
                  {t('nav.viewMenu')}
                </a>
              </li>
            </ul>
          </nav>
          <div className="admin-header__account">
            <span className="admin-header__email">{t('nav.signedInAs', { email })}</span>
            <button
              type="button"
              className="button button--small button--secondary"
              onClick={() => void signOut()}
            >
              {t('nav.logOut')}
            </button>
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="admin-main">
        {requireMfa && !hasMfa && (
          <p className="admin-notice admin-notice--warning">{t('security.required')}</p>
        )}
        <Outlet />
      </main>
    </>
  );
}
