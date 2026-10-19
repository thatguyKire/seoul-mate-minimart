import { useState, type SubmitEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmModal } from '../components/ConfirmModal';
import { BusyButton, FailureMessage, TextField } from '../../../components/fields';
import { useAuth } from '../session/authContext';

interface Enrollment {
  factorId: string;
  /** An SVG image as a data: address, from Supabase Auth. Needs img-src data: in the CSP (SDD 5.5). */
  qrCode: string;
  secret: string;
}

/** Two-factor login with an authenticator app (FR-47). */
export function SecurityPage() {
  const { t } = useTranslation('admin');
  const { client, state, refresh } = useAuth();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | undefined>();
  const [failure, setFailure] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);

  if (state.status !== 'signed-in') return null;
  const { hasMfa, requireMfa } = state;

  async function start() {
    setBusy(true);
    setFailure(null);
    setFlash(null);
    // An earlier setup that was never finished would block a new one with the same name.
    const factors = await client.auth.mfa.listFactors();
    for (const factor of factors.data?.all ?? []) {
      if (factor.status === 'unverified') await client.auth.mfa.unenroll({ factorId: factor.id });
    }
    const { data, error } = await client.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Authenticator app',
    });
    setBusy(false);
    if (error) {
      setFailure(t('errors.unknown'));
      return;
    }
    setEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
  }

  async function verify(event: SubmitEvent) {
    event.preventDefault();
    if (!enrollment) return;
    const digits = code.replace(/\s/g, '');
    if (!/^\d{6}$/.test(digits)) {
      setCodeError(t('mfa.codeFormat'));
      return;
    }
    setCodeError(undefined);
    setBusy(true);
    const { error } = await client.auth.mfa.challengeAndVerify({
      factorId: enrollment.factorId,
      code: digits,
    });
    setBusy(false);
    if (error) {
      setFailure(error.status && error.status < 500 ? t('mfa.wrong') : t('errors.network'));
      setCode('');
      return;
    }
    setEnrollment(null);
    setCode('');
    setFlash(t('security.enabled'));
    await refresh();
  }

  async function turnOff() {
    setBusy(true);
    setFailure(null);
    const factors = await client.auth.mfa.listFactors();
    for (const factor of factors.data?.totp ?? []) {
      const { error } = await client.auth.mfa.unenroll({ factorId: factor.id });
      if (error) setFailure(t('errors.unknown'));
    }
    setBusy(false);
    setConfirmOff(false);
    setFlash(t('security.disabled'));
    // Moves the session back to one-factor, so the panel reflects the change.
    await client.auth.refreshSession();
    await refresh();
  }

  return (
    <section aria-labelledby="security-title">
      <h1 id="security-title">{t('security.title')}</h1>
      <p className="admin-flash" role="status">
        {flash}
      </p>
      {failure && <FailureMessage>{failure}</FailureMessage>}
      {requireMfa && !hasMfa && <p className="admin-notice">{t('security.required')}</p>}
      <p className="admin-intro">{hasMfa ? t('security.statusOn') : t('security.statusOff')}</p>

      {!hasMfa && !enrollment && (
        <BusyButton type="button" busy={busy} busyLabel={t('loading')} onClick={() => void start()}>
          {t('security.start')}
        </BusyButton>
      )}

      {enrollment && (
        <form className="admin-form" noValidate onSubmit={(event) => void verify(event)}>
          <p>{t('security.step1')}</p>
          <img
            className="admin-qr"
            src={enrollment.qrCode}
            alt={t('security.qrAlt')}
            width={200}
            height={200}
          />
          <p>{t('security.secret')}</p>
          <p className="admin-secret">
            <code>{enrollment.secret}</code>
          </p>
          <p>{t('security.step2')}</p>
          <TextField
            id="security-code"
            label={t('mfa.code')}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            value={code}
            error={codeError}
            onChange={(event) => {
              setCode(event.target.value);
            }}
          />
          <div className="admin-form__actions">
            <BusyButton type="submit" busy={busy} busyLabel={t('security.verifying')}>
              {t('security.verify')}
            </BusyButton>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => {
                setEnrollment(null);
                void client.auth.mfa.unenroll({ factorId: enrollment.factorId });
              }}
            >
              {t('security.cancel')}
            </button>
          </div>
        </form>
      )}

      {hasMfa && !requireMfa && (
        <button
          type="button"
          className="button button--secondary"
          onClick={() => {
            setConfirmOff(true);
          }}
        >
          {t('security.turnOff')}
        </button>
      )}

      <ConfirmModal
        open={confirmOff}
        title={t('security.turnOffTitle')}
        body={t('security.turnOffBody')}
        confirmLabel={t('security.turnOffConfirm')}
        busyLabel={t('loading')}
        busy={busy}
        onConfirm={() => void turnOff()}
        onCancel={() => {
          setConfirmOff(false);
        }}
      />
    </section>
  );
}
