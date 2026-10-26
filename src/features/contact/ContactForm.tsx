import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import {
  contactSchema,
  invalidFields,
  type ContactField,
  type ContactRequest,
} from '../../../supabase/functions/_shared/contactSchema.ts';
import {
  BusyButton,
  ErrorSummary,
  FailureMessage,
  TextAreaField,
  TextField,
} from '../../components/fields';
import { Icon } from '../../components/Icon';
import { store } from '../../config/store';
import { env } from '../../lib/env';
import { useConsent } from '../consent/consent';
import { consentedUtm } from '../consent/utm';
import { useLocale } from '../i18n/localeContext';
import { revealEach } from '../motion/motion';

type Failure = 'rateLimited' | 'server';

const fieldId: Record<ContactField, string> = {
  name: 'contact-name',
  contact: 'contact-contact',
  message: 'contact-message',
};

/**
 * For visitors who don't use Messenger (FR-29 to FR-31). Checked here for quick feedback with
 * the same rules the `contact` function enforces (SDD 3.2). Campaign details go along only
 * with consent (FR-57).
 */
export function ContactForm() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { choice } = useConsent();
  const [values, setValues] = useState({ name: '', contact: '', message: '', website: '' });
  const [invalid, setInvalid] = useState<ContactField[]>([]);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const thanks = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (sentTo !== null) thanks.current?.focus();
  }, [sentTo]);

  function set(field: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    setFailure(null);
    const utm = consentedUtm(choice === 'accepted');
    const request: ContactRequest = { ...values, locale, ...(utm ? { utm } : {}) };
    const checked = contactSchema.safeParse(request);
    if (!checked.success) {
      setInvalid(invalidFields(checked.error));
      return;
    }
    setInvalid([]);
    setSending(true);
    try {
      const response = await fetch(`${env.supabaseUrl}/functions/v1/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: env.supabaseAnonKey },
        body: JSON.stringify(request),
      });
      if (response.ok) {
        setSentTo(checked.data.name);
        return;
      }
      if (response.status === 400) {
        const body = (await response.json()) as { fields?: ContactField[] };
        setInvalid(body.fields ?? []);
        if (!body.fields?.length) setFailure('server');
        return;
      }
      setFailure(response.status === 429 ? 'rateLimited' : 'server');
    } catch {
      setFailure('server');
    } finally {
      setSending(false);
    }
  }

  const errorText = (field: ContactField) =>
    invalid.includes(field) ? t(`contactForm.errors.${field}`) : undefined;

  return (
    <section id="contact" className="section contact" aria-labelledby="contact-title">
      <div ref={revealEach} className="container">
        <h2 id="contact-title">{t('contactForm.title')}</h2>
        {sentTo !== null ? (
          // The success message replaces the form (FR-31).
          <p className="contact__thanks" role="status" tabIndex={-1} ref={thanks}>
            <Icon name="check" />
            {t('contactForm.sent', { name: sentTo })}
          </p>
        ) : (
          <>
            <p className="contact__intro">{t('contactForm.intro')}</p>
            <form className="contact__form" noValidate onSubmit={(event) => void submit(event)}>
              <ErrorSummary
                title={t('contactForm.errorSummary')}
                errors={invalid.map((field) => ({
                  id: fieldId[field],
                  message: t(`contactForm.errors.${field}`),
                }))}
              />
              {failure && (
                <FailureMessage>
                  {failure === 'rateLimited' ? (
                    t('contactForm.rateLimited')
                  ) : (
                    <>
                      {t('contactForm.server')}{' '}
                      <a href={store.messengerUrl}>{t('menu.askOnMessenger')}</a>
                    </>
                  )}
                </FailureMessage>
              )}
              <TextField
                id={fieldId.name}
                label={t('contactForm.name')}
                autoComplete="name"
                maxLength={80}
                value={values.name}
                error={errorText('name')}
                onChange={(event) => {
                  set('name', event.target.value);
                }}
              />
              <TextField
                id={fieldId.contact}
                label={t('contactForm.contact')}
                hint={t('contactForm.contactHint')}
                autoComplete="tel"
                maxLength={120}
                value={values.contact}
                error={errorText('contact')}
                onChange={(event) => {
                  set('contact', event.target.value);
                }}
              />
              <TextAreaField
                id={fieldId.message}
                label={t('contactForm.message')}
                rows={5}
                maxLength={1000}
                value={values.message}
                error={errorText('message')}
                onChange={(event) => {
                  set('message', event.target.value);
                }}
              />
              {/* A honeypot: hidden from people and screen readers; bots fill it (NFR-SEC-17). */}
              <div className="contact__trap" aria-hidden="true">
                <label htmlFor="contact-website">Website</label>
                <input
                  id="contact-website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={values.website}
                  onChange={(event) => {
                    set('website', event.target.value);
                  }}
                />
              </div>
              <p className="contact__privacy">
                {t('contactForm.privacy')}{' '}
                <Link to={`/${locale}/privacy`}>{t('consent.policy')}</Link>
              </p>
              <BusyButton type="submit" busy={sending} busyLabel={t('contactForm.sending')}>
                {t('contactForm.send')}
              </BusyButton>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
