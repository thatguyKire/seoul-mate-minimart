import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../components/Icon';

type CopyState = 'idle' | 'copied' | 'manual';

function selectContents(element: HTMLElement) {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(element);
  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * Copies `text` and says "Copied" in a live region, so screen readers announce it (FR-25).
 * In-app browsers often block the Clipboard API; then the visible text is selected and the
 * visitor is told to copy it themselves (TRD 4).
 */
export function CopyButton({
  text,
  label,
  targetId,
}: {
  text: string;
  label: string;
  targetId: string;
}) {
  const { t } = useTranslation();
  const [state, setState] = useState<CopyState>('idle');

  useEffect(() => {
    if (state !== 'copied') return;
    const timer = setTimeout(() => {
      setState('idle');
    }, 4000);
    return () => {
      clearTimeout(timer);
    };
  }, [state]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      const target = document.getElementById(targetId);
      if (target) selectContents(target);
      setState('manual');
    }
  }

  return (
    <div className="copy">
      <button
        type="button"
        className="button button--small button--secondary"
        onClick={() => void copy()}
      >
        <Icon name="copy" />
        {label}
      </button>
      <span className="copy__status" role="status">
        {state === 'copied' && (
          <>
            <Icon name="check" />
            {t('visit.copied')}
          </>
        )}
        {state === 'manual' && t('visit.copyFallback')}
      </span>
    </div>
  );
}
