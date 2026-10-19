import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../../components/Icon';
import { photoUrl, type PhotoFormat } from '../../catalog/photos';
import type { PhotoChange } from '../adminData';
import { PhotoError, processPhoto, type PhotoProblem } from './processPhoto';

interface CurrentPhoto {
  path: string;
  format: PhotoFormat;
}

/**
 * Choose, replace or remove an item's photo (FR-43, FR-44). A new photo is checked and
 * processed as soon as it is chosen, and shown on a canvas until the item is saved, so the
 * original file is never displayed or uploaded.
 */
export function PhotoField({
  id,
  current,
  change,
  onChange,
  onBusyChange,
}: {
  id: string;
  current: CurrentPhoto | null;
  change: PhotoChange;
  onChange: (change: PhotoChange) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const { t } = useTranslation('admin');
  const [processing, setProcessing] = useState(false);
  const [problem, setProblem] = useState<PhotoProblem | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  const preview = change.kind === 'new' ? change.photo.preview : null;
  useEffect(() => {
    const element = canvas.current;
    if (!preview || !element) return;
    const width = Math.min(320, preview.width);
    element.width = width;
    element.height = Math.round((preview.height * width) / preview.width);
    element.getContext('2d')?.drawImage(preview, 0, 0, element.width, element.height);
  }, [preview]);

  async function choose(file: File) {
    setProblem(null);
    setProcessing(true);
    onBusyChange(true);
    try {
      onChange({ kind: 'new', photo: await processPhoto(file) });
    } catch (error) {
      setProblem(error instanceof PhotoError ? error.problem : 'unreadable');
    } finally {
      setProcessing(false);
      onBusyChange(false);
    }
  }

  const hasPhoto = change.kind === 'new' || (current !== null && change.kind === 'keep');
  const errorId = `${id}-error`;

  return (
    <div className={problem ? 'field field--error photo-field' : 'field photo-field'}>
      <label className="field__label" htmlFor={id}>
        {t('photo.label')}
      </label>
      <p id={`${id}-hint`} className="field__hint">
        {t('photo.hint')}
      </p>
      {problem && (
        <p id={errorId} className="field__error">
          <Icon name="alert" />
          {t(`photo.${problem}`)}
        </p>
      )}

      {change.kind === 'new' && (
        <figure className="photo-field__preview">
          <canvas ref={canvas} className="photo-field__image" aria-hidden="true" />
          <figcaption>{t('photo.preview')}</figcaption>
        </figure>
      )}
      {change.kind === 'keep' && current && (
        <figure className="photo-field__preview">
          <img
            className="photo-field__image"
            src={photoUrl(current.path, 320, current.format)}
            alt=""
            width={320}
            height={240}
          />
          <figcaption>{t('photo.current')}</figcaption>
        </figure>
      )}
      {change.kind === 'remove' && <p className="photo-field__note">{t('photo.willRemove')}</p>}

      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="photo-field__input"
        aria-invalid={problem ? true : undefined}
        aria-describedby={problem ? `${id}-hint ${errorId}` : `${id}-hint`}
        disabled={processing}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void choose(file);
        }}
      />
      <p className="photo-field__status" role="status">
        {processing && (
          <>
            <span className="spinner" aria-hidden="true" />
            {t('photo.processing')}
          </>
        )}
      </p>

      {hasPhoto && (
        <button
          type="button"
          className="button button--small button--secondary"
          onClick={() => {
            onChange(current ? { kind: 'remove' } : { kind: 'keep' });
          }}
        >
          {t('photo.remove')}
        </button>
      )}
      {change.kind === 'remove' && (
        <button
          type="button"
          className="button button--small button--secondary"
          onClick={() => {
            onChange({ kind: 'keep' });
          }}
        >
          {t('photo.undoRemove')}
        </button>
      )}
    </div>
  );
}
