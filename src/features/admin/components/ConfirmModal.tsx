import { useEffect, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { BusyButton } from './fields';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  busyLabel: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Asks before a destructive or bulk action (FR-41). A modal dialog: focus moves in and stays
 * in, Cancel has focus first, Escape and Cancel leave everything unchanged, and the browser
 * returns focus to the button that opened it.
 */
export function ConfirmModal({
  open,
  title,
  body,
  confirmLabel,
  busyLabel,
  busy,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { t } = useTranslation('admin');
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      element.showModal();
      cancel.current?.focus();
    } else if (!open && element.open) {
      element.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialog}
      className="modal"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onCancel={(event) => {
        // Escape: closed through state, and not while the action is running.
        event.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <h2 id={titleId} className="modal__title">
        {title}
      </h2>
      <p id={bodyId}>{body}</p>
      <div className="modal__actions">
        <button
          ref={cancel}
          type="button"
          className="button button--secondary"
          disabled={busy}
          onClick={onCancel}
        >
          {t('modal.cancel')}
        </button>
        <BusyButton
          type="button"
          className="button button--danger"
          busy={busy}
          busyLabel={busyLabel}
          onClick={onConfirm}
        >
          {confirmLabel}
        </BusyButton>
      </div>
    </dialog>
  );
}
