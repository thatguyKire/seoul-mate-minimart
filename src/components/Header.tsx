import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { store } from '../config/store';
import { LanguageSwitcher } from '../features/i18n/LanguageSwitcher';
import { useLocale } from '../features/i18n/localeContext';
import { MobileMenu } from './MobileMenu';
import { sections, useSectionHref } from './sections';

/** Sticky header (FR-60): wordmark, section links and the language button, or a menu button on small screens. */
export function Header() {
  const { t } = useTranslation();
  const locale = useLocale();
  const sectionHref = useSectionHref();

  return (
    <header className="site-header">
      <div className="site-header__inner container">
        {/* A text wordmark until the store has a logo (D-018). */}
        <Link to={`/${locale}/`} className="wordmark">
          <span className="wordmark__mark" aria-hidden="true">
            S
          </span>
          <span className="wordmark__text">{store.name}</span>
        </Link>
        <nav aria-label={t('header.navLabel')} className="site-nav">
          <ul className="site-nav__list">
            {sections.map((section) => (
              <li key={section.id}>
                <a className="site-nav__link" href={sectionHref(section.id)}>
                  {t(section.labelKey)}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="site-header__language">
          <LanguageSwitcher />
        </div>
        <MobileMenu />
      </div>
    </header>
  );
}
