import { Link, useLocation } from 'react-router';
import { writeSetting } from '../../lib/storage';
import { useLocale } from './localeContext';
import { localeNames, localizedPath, locales } from './locales';

/** Links to this page in each language. Choosing one is remembered for the next visit (FR-19). */
export function LanguageLinks({ onSelect }: { onSelect?: () => void }) {
  const current = useLocale();
  const location = useLocation();

  return (
    <ul className="language-links">
      {locales.map((locale) => (
        <li key={locale}>
          <Link
            className="language-links__link"
            to={{
              pathname: localizedPath(location.pathname, locale),
              search: location.search,
              hash: location.hash,
            }}
            lang={locale}
            hrefLang={locale}
            aria-current={locale === current ? 'true' : undefined}
            onClick={() => {
              writeSetting('locale', locale);
              onSelect?.();
            }}
          >
            {localeNames[locale]}
          </Link>
        </li>
      ))}
    </ul>
  );
}
