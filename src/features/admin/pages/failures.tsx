import { useTranslation } from 'react-i18next';
import { FailureMessage } from '../components/fields';
import type { FailureKind } from '../errors';

/** Plain words for a failed action (SDD 6). Kinds with their own wording are handled by the page. */
export function FailureText({ kind }: { kind: FailureKind }) {
  const { t } = useTranslation('admin');
  const message =
    kind === 'permission'
      ? t('errors.permission')
      : kind === 'network'
        ? t('errors.network')
        : kind === 'notFound'
          ? t('form.notFound')
          : kind === 'slugTaken'
            ? t('errors.slugTaken')
            : t('errors.unknown');
  return <FailureMessage>{message}</FailureMessage>;
}

export function LoadFailure({ kind, onRetry }: { kind: FailureKind; onRetry: () => void }) {
  const { t } = useTranslation('admin');
  return (
    <div className="admin-load-failure">
      <p className="admin-load-failure__title">{t('errors.loadFailed')}</p>
      <FailureText kind={kind} />
      <button type="button" className="button button--secondary" onClick={onRetry}>
        {t('errors.retry')}
      </button>
    </div>
  );
}
