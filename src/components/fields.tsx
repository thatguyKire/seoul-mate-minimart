// Form building blocks for the contact form and the staff panel (FR-30, FR-45): a visible
// label, an optional hint, an inline error tied to the field with aria-describedby, and an
// error summary that links to each field.
import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Icon } from './Icon';

interface FieldFrameProps {
  id: string;
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
}

function describedBy(id: string, hint?: string, error?: string): string | undefined {
  const ids = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean);
  return ids.length > 0 ? ids.join(' ') : undefined;
}

function FieldFrame({
  id,
  label,
  hint,
  error,
  children,
}: FieldFrameProps & { children: ReactNode }) {
  return (
    <div className={error ? 'field field--error' : 'field'}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="field__error">
          <Icon name="alert" />
          {error}
        </p>
      )}
      {children}
    </div>
  );
}

export function TextField({
  id,
  label,
  hint,
  error,
  ...input
}: FieldFrameProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'id'>) {
  return (
    <FieldFrame id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        className="field__input"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...input}
      />
    </FieldFrame>
  );
}

export function TextAreaField({
  id,
  label,
  hint,
  error,
  ...textarea
}: FieldFrameProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'>) {
  return (
    <FieldFrame id={id} label={label} hint={hint} error={error}>
      <textarea
        id={id}
        className="field__input field__input--area"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...textarea}
      />
    </FieldFrame>
  );
}

export function SelectField({
  id,
  label,
  hint,
  error,
  children,
  ...select
}: FieldFrameProps & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'>) {
  return (
    <FieldFrame id={id} label={label} hint={hint} error={error}>
      <select
        id={id}
        className="field__input"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...select}
      >
        {children}
      </select>
    </FieldFrame>
  );
}

export function CheckboxField({
  id,
  label,
  hint,
  ...input
}: Omit<FieldFrameProps, 'error'> & Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'>) {
  return (
    <div className="checkbox">
      <input
        id={id}
        type="checkbox"
        className="checkbox__input"
        aria-describedby={hint ? `${id}-hint` : undefined}
        {...input}
      />
      <label className="checkbox__label" htmlFor={id}>
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="field__hint checkbox__hint">
          {hint}
        </p>
      )}
    </div>
  );
}

/** FR-36: a show or hide toggle with an accessible label. */
export function PasswordField({
  id,
  label,
  error,
  toggleLabel,
  ...input
}: Omit<FieldFrameProps, 'hint'> &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'> & { toggleLabel: string }) {
  const [shown, setShown] = useState(false);
  return (
    <FieldFrame id={id} label={label} error={error}>
      <div className="password">
        <input
          id={id}
          type={shown ? 'text' : 'password'}
          className="field__input password__input"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, undefined, error)}
          {...input}
        />
        <button
          type="button"
          className="password__toggle"
          aria-pressed={shown}
          aria-controls={id}
          onClick={() => {
            setShown((value) => !value);
          }}
        >
          {toggleLabel}
        </button>
      </div>
    </FieldFrame>
  );
}

export interface SummaryError {
  id: string;
  message: string;
}

/** Lists every error at the top of a form and takes focus, so it is read out first. */
export function ErrorSummary({ title, errors }: { title: string; errors: SummaryError[] }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (errors.length > 0) box.current?.focus();
  }, [errors]);
  if (errors.length === 0) return null;
  return (
    <div className="error-summary" role="alert" tabIndex={-1} ref={box}>
      <h2 className="error-summary__title">{title}</h2>
      <ul className="error-summary__list">
        {errors.map((error) => (
          <li key={error.id}>
            <a
              href={`#${error.id}`}
              onClick={(event) => {
                event.preventDefault();
                document.getElementById(error.id)?.focus();
              }}
            >
              {error.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A plain message for a failed action, such as a refused save (SDD 6). */
export function FailureMessage({ children }: { children: ReactNode }) {
  return (
    <p className="failure" role="alert">
      <Icon name="alert" />
      {children}
    </p>
  );
}

/** Disabled with a spinner while its action runs (FR-45). */
export function BusyButton({
  busy,
  busyLabel,
  children,
  className = 'button button--primary',
  disabled,
  ...button
}: ButtonHTMLAttributes<HTMLButtonElement> & { busy: boolean; busyLabel: string }) {
  return (
    <button {...button} className={className} disabled={busy || disabled}>
      {busy && <span className="spinner" aria-hidden="true" />}
      {busy ? busyLabel : children}
    </button>
  );
}
