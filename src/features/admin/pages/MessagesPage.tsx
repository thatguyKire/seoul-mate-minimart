import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '../../../lib/format';
import { localeNames } from '../../i18n/locales';
import { loadMessages, type ContactMessage } from '../adminData';
import { asAdminError, type FailureKind } from '../errors';
import { useAuth } from '../session/authContext';
import { LoadFailure } from './failures';

type State =
  | { status: 'loading' }
  | { status: 'error'; kind: FailureKind }
  | { status: 'ready'; messages: ContactMessage[] };

/** A tap-to-call or email link for what the visitor typed. */
function replyHref(contact: string): string {
  if (contact.includes('@')) return `mailto:${contact}`;
  const digits = contact.replace(/\s/g, '');
  return `tel:${digits.startsWith('09') ? `+63${digits.slice(1)}` : digits}`;
}

/** Contact form messages, newest first (FR-32). Everything is shown as plain text (NFR-SEC-10). */
export function MessagesPage() {
  const { t } = useTranslation('admin');
  const { client } = useAuth();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    loadMessages(client).then(
      (messages) => {
        if (active) setState({ status: 'ready', messages });
      },
      (error: unknown) => {
        if (active) setState({ status: 'error', kind: asAdminError(error).kind });
      },
    );
    return () => {
      active = false;
    };
  }, [client, attempt]);

  if (state.status === 'loading') return <p className="admin-loading">{t('loading')}</p>;
  if (state.status === 'error') {
    return (
      <LoadFailure
        kind={state.kind}
        onRetry={() => {
          setState({ status: 'loading' });
          setAttempt((value) => value + 1);
        }}
      />
    );
  }

  return (
    <section aria-labelledby="messages-title">
      <h1 id="messages-title">{t('messages.title')}</h1>
      <p className="admin-intro">{t('messages.intro')}</p>
      {state.messages.length === 0 && <p className="admin-empty">{t('messages.empty')}</p>}
      <ul className="admin-messages">
        {state.messages.map((message) => (
          <li key={message.id} className="admin-message">
            <p className="admin-message__from">
              <span className="admin-message__name">{message.name}</span>
              <a href={replyHref(message.contact)}>{message.contact}</a>
            </p>
            <p className="admin-message__text">{message.message}</p>
            <dl className="admin-message__meta">
              <dt>{t('messages.received')}</dt>
              <dd>
                <time dateTime={message.created_at}>
                  {formatDateTime(message.created_at, 'en')}
                </time>
              </dd>
              <dt>{t('messages.language')}</dt>
              <dd>{localeNames[message.locale]}</dd>
              {message.utm?.utm_source && (
                <>
                  <dt>{t('messages.campaign')}</dt>
                  <dd>
                    {[message.utm.utm_source, message.utm.utm_campaign].filter(Boolean).join(', ')}
                  </dd>
                </>
              )}
            </dl>
          </li>
        ))}
      </ul>
    </section>
  );
}
