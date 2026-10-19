import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { usePageTitle } from '../../components/usePageTitle';
import { useLocale } from '../i18n/localeContext';

export function NotFoundPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  usePageTitle(t('notFound.title'));

  return (
    <section className="not-found container">
      <h1>{t('notFound.title')}</h1>
      <p>{t('notFound.body')}</p>
      <p>
        <Link className="button button--primary" to={`/${locale}/`}>
          {t('notFound.home')}
        </Link>
      </p>
    </section>
  );
}
