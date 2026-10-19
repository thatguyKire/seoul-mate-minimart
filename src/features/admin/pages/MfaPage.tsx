import { useState, type SubmitEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { BusyButton, FailureMessage, TextField } from '../components/fields';
import { useAuth, type MfaFailure } from '../session/authContext';

/** The second login step for staff who turned on two-factor login (FR-47, SDD 7.2). */
export function MfaPage() {
  const { t } = useTranslation('admin');
  const { verifyMfa, signOut } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [failure, setFailure] = useState<MfaFailure | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    setFailure(null);
    const digits = code.replace(/\s/g, '');
    if (!/^\d{6}$/.test(digits)) {
      setError(t('mfa.codeFormat'));
      return;
    }
    setError(undefined);
    setBusy(true);
    const result = await verifyMfa(digits);
    setBusy(false);
    if (result) {
      setFailure(result);
      setCode('');
    }
  }

  return (
    <main id="main" className="admin-auth">
      <h1 className="admin-auth__title">{t('mfa.title')}</h1>
      <p className="admin-auth__intro">{t('mfa.intro')}</p>
      {failure && (
        <FailureMessage>
          {failure === 'wrong' ? t('mfa.wrong') : t('errors.network')}
        </FailureMessage>
      )}
      <form className="admin-form" noValidate onSubmit={(event) => void submit(event)}>
        <TextField
          id="mfa-code"
          label={t('mfa.code')}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          value={code}
          error={error}
          onChange={(event) => {
            setCode(event.target.value);
          }}
        />
        <BusyButton type="submit" busy={busy} busyLabel={t('mfa.submitting')}>
          {t('mfa.submit')}
        </BusyButton>
      </form>
      <p>
        <button type="button" className="button button--quiet" onClick={() => void signOut()}>
          {t('nav.logOut')}
        </button>
      </p>
    </main>
  );
}
