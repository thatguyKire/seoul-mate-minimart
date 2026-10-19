import { useTranslation } from 'react-i18next';
import { ScrollProgress } from '../../components/ScrollProgress';
import { store } from '../../config/store';
import { usePageTitle } from '../../components/usePageTitle';
import { formatDate } from '../../lib/format';
import { useLocale } from '../i18n/localeContext';
import { legal, legalUpdated, type LegalBlock } from './content';

const facts: Record<string, string> = {
  '{address}': store.address,
  '{phone}': store.phone.display,
  '{messenger}': store.messengerUrl.replace(/^https:\/\//, ''),
};

function fill(text: string): string {
  return text.replace(/\{address\}|\{phone\}|\{messenger\}/g, (token) => facts[token] ?? token);
}

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === 'string') return <p>{fill(block)}</p>;
  return (
    <ul>
      {block.map((item) => (
        <li key={item}>{fill(item)}</li>
      ))}
    </ul>
  );
}

/** The privacy policy or the terms, in the page language (FR-58, FR-59, D-009). */
export function LegalPage({ kind }: { kind: 'privacy' | 'terms' }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const document = legal[locale][kind];
  usePageTitle(document.title);

  return (
    <article className="legal container" aria-labelledby="legal-title">
      <ScrollProgress />
      <h1 id="legal-title">{document.title}</h1>
      <p className="legal__updated">
        {t('legal.updated')} <time dateTime={legalUpdated}>{formatDate(legalUpdated, locale)}</time>
      </p>
      <div className="legal__notices">
        <p>{t('legal.review')}</p>
        <p>{t('legal.englishPrevails')}</p>
      </div>
      <p className="legal__intro">{fill(document.intro)}</p>
      {document.sections.map((section) => (
        <section key={section.heading} className="legal__section">
          <h2>{section.heading}</h2>
          {section.blocks.map((block, index) => (
            <Block key={index} block={block} />
          ))}
        </section>
      ))}
    </article>
  );
}
