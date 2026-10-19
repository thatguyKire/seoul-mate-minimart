import { useState, type SubmitEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BusyButton,
  ErrorSummary,
  FailureMessage,
  PasswordField,
  TextField,
} from '../../../components/fields';
import { useAuth, type SignInFailure, type SignOutNotice } from '../session/authContext';

/** Staff login (FR-34 to FR-36). There is no sign-up: the owner creates accounts (D-001). */
export function LoginPage({ notice }: { notice: SignOutNotice | null }) {
  const { t } = useTranslation('admin');
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [failure, setFailure] = useState<SignInFailure | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    setFailure(null);
    const next = {
      ...(email.trim() ? {} : { email: t('login.emailRequired') }),
      ...(password ? {} : { password: t('login.passwordRequired') }),
    };
    setErrors(next);
    if (next.email || next.password) return;
    setBusy(true);
    const result = await signIn(email.trim(), password);
    setBusy(false);
    if (result) {
      setFailure(result);
      setPassword('');
    }
  }

  const summary = [
    ...(errors.email ? [{ id: 'login-email', message: errors.email }] : []),
    ...(errors.password ? [{ id: 'login-password', message: errors.password }] : []),
  ];

  return (
    <main id="main" className="admin-auth">
      <h1 className="admin-auth__title">{t('login.title')}</h1>
      <p className="admin-auth__intro">{t('login.intro')}</p>
      {notice && (
        <p className="admin-notice" role="status">
          {t(`login.${notice}`)}
        </p>
      )}
      {failure && (
        <FailureMessage>
          {failure === 'wrong'
            ? t('login.wrong')
            : failure === 'rateLimited'
              ? t('login.rateLimited')
              : t('login.network')}
        </FailureMessage>
      )}
      <form className="admin-form" noValidate onSubmit={(event) => void submit(event)}>
        <ErrorSummary title={t('form.errorSummary')} errors={summary} />
        <TextField
          id="login-email"
          label={t('login.email')}
          type="email"
          autoComplete="username"
          inputMode="email"
          spellCheck={false}
          value={email}
          error={errors.email}
          onChange={(event) => {
            setEmail(event.target.value);
          }}
        />
        <PasswordField
          id="login-password"
          label={t('login.password')}
          autoComplete="current-password"
          toggleLabel={t('login.showPassword')}
          value={password}
          error={errors.password}
          onChange={(event) => {
            setPassword(event.target.value);
          }}
        />
        <BusyButton type="submit" busy={busy} busyLabel={t('login.submitting')}>
          {t('login.submit')}
        </BusyButton>
      </form>
    </main>
  );
}
