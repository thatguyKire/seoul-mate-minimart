import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useLocale } from '../i18n/localeContext';

export function NotFoundPage() {
  const { t } = useTranslation();
  const locale = useLocale();

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
