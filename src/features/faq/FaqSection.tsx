import { useTranslation } from 'react-i18next';
import { Icon } from '../../components/Icon';
import { showSampleLabels } from '../../lib/env';
import { useLocale } from '../i18n/localeContext';
import { faq } from './faqContent';

/**
 * Questions and answers written by the store (FR-33), as an accordion of native
 * <details> elements: keyboard, screen reader and find-in-page support come with them.
 */
export function FaqSection() {
  const { t } = useTranslation();
  const locale = useLocale();

  return (
    <section id="faq" className="section faq" aria-labelledby="faq-title">
      <div className="container">
        <h2 id="faq-title">{t('faq.title')}</h2>
        <div className="faq__list">
          {faq[locale].map((entry) => (
            <details key={entry.question} className="faq__item">
              <summary className="faq__question">
                <span>{entry.question}</span>
                {showSampleLabels && entry.todo && <span className="tag">{t('faq.draft')}</span>}
                <Icon name="chevronDown" className="faq__chevron" />
              </summary>
              <p className="faq__answer">{entry.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
