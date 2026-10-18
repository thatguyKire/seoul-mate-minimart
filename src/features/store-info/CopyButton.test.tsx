import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';
import { i18nByLocale } from '../i18n/i18n';
import { CopyButton } from './CopyButton';

function renderButton() {
  return render(
    <I18nextProvider i18n={i18nByLocale.en}>
      <p id="target">0939 126 5349</p>
      <CopyButton text="0939 126 5349" label="Copy phone number" targetId="target" />
    </I18nextProvider>,
  );
}

describe('CopyButton (FR-25)', () => {
  it('copies the text and announces "Copied"', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    renderButton();
    await user.click(screen.getByRole('button', { name: 'Copy phone number' }));
    expect(writeText).toHaveBeenCalledWith('0939 126 5349');
    expect(screen.getByRole('status')).toHaveTextContent('Copied');
  });

  it('selects the text and explains what to do when the clipboard is blocked', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('NotAllowedError'));
    renderButton();
    await user.click(screen.getByRole('button', { name: 'Copy phone number' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      "Text selected. Use your device's copy option.",
    );
    expect(window.getSelection()?.toString()).toBe('0939 126 5349');
  });
});
