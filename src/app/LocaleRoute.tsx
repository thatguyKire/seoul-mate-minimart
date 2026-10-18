import { useLayoutEffect } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { Navigate, Outlet, useParams } from 'react-router';
import { FloatingStack } from '../components/FloatingStack';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import { i18nByLocale } from '../features/i18n/i18n';
import { LocaleContext } from '../features/i18n/localeContext';
import { isLocale, type Locale } from '../features/i18n/locales';

/** Everything under /en/, /fil/ or /ko/ (FR-18). Any other first segment goes back to the root. */
export function LocaleRoute() {
  const { locale } = useParams();
  if (!isLocale(locale)) return <Navigate to="/" replace />;

  return (
    <LocaleContext value={locale}>
      <I18nextProvider i18n={i18nByLocale[locale]}>
        <PublicLayout locale={locale} />
      </I18nextProvider>
    </LocaleContext>
  );
}

function PublicLayout({ locale }: { locale: Locale }) {
  const { t } = useTranslation();

  // Before paint, so Korean pages never render a frame with English line breaking and fonts.
  useLayoutEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <>
      {/* FR-62: the first focusable element on every page. */}
      <a className="skip-link" href="#main">
        {t('skipToContent')}
      </a>
      <Header />
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
      <FloatingStack />
    </>
  );
}
