import { useTranslation } from 'react-i18next';

/**
 * One tap switches an item between in stock and out of stock (FR-39). The state is in
 * aria-checked and in the knob's position and mark, never in color alone.
 */
export function AvailabilitySwitch({
  name,
  checked,
  busy,
  onToggle,
}: {
  name: string;
  checked: boolean;
  busy: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation('admin');
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={t('items.availabilityFor', { name })}
      className="switch"
      disabled={busy}
      onClick={onToggle}
    >
      <span className="switch__track" aria-hidden="true">
        <span className="switch__thumb" />
      </span>
      <span className="switch__label" aria-hidden="true">
        {t('items.inStock')}
      </span>
    </button>
  );
}
