import { describe, expect, it } from 'vitest';
import { failureKind } from './errors';
import { checkPhoto, sniffImageType } from './photos/processPhoto';
import { idleLimitMs, maxSessionMs, sessionEnd } from './session/sessionLimits';

describe('sessionEnd (FR-46, D-016)', () => {
  const login = Date.UTC(2026, 9, 19, 1, 0);

  it('keeps an active session', () => {
    expect(sessionEnd(login + 30 * 60_000, login + 20 * 60_000, login)).toBeNull();
  });

  it('ends after 60 minutes without activity', () => {
    const last = login + 10 * 60_000;
    expect(sessionEnd(last + idleLimitMs - 1, last, login)).toBeNull();
    expect(sessionEnd(last + idleLimitMs, last, login)).toBe('idle');
  });

  it('ends 12 hours after login, however active', () => {
    const now = login + maxSessionMs;
    expect(sessionEnd(now - 1, now - 1000, login)).toBeNull();
    expect(sessionEnd(now, now - 1000, login)).toBe('expired');
  });
});

describe('failureKind (SDD 6)', () => {
  it('turns database refusals into what staff are told', () => {
    expect(failureKind({ code: '42501' }, 403)).toBe('permission');
    expect(failureKind({ code: 'PGRST301' }, 401)).toBe('permission');
    expect(failureKind({}, 401)).toBe('permission');
    expect(failureKind({ code: '23503' }, 409)).toBe('categoryInUse');
    expect(failureKind({ code: '23505' }, 409)).toBe('slugTaken');
    expect(failureKind({ code: '23514' }, 400)).toBe('invalid');
    expect(failureKind({ code: '' }, 0)).toBe('network');
    expect(failureKind({ code: 'XX000' }, 500)).toBe('unknown');
  });
});

describe('photo checks (FR-43)', () => {
  const jpeg = [0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1];
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d];
  // 'RIFF', a 4-byte size, 'WEBP'.
  const webp = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];

  it('recognizes JPEG, PNG and WebP by their first bytes', () => {
    expect(sniffImageType(new Uint8Array(jpeg))).toBe('jpeg');
    expect(sniffImageType(new Uint8Array(png))).toBe('png');
    expect(sniffImageType(new Uint8Array(webp))).toBe('webp');
  });

  it('refuses other files, whatever their name or stated type', async () => {
    const gif = new Blob([new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])], {
      type: 'image/jpeg',
    });
    const svg = new Blob(
      ['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'],
      {
        type: 'image/png',
      },
    );
    expect(await checkPhoto(gif)).toBe('wrongType');
    expect(await checkPhoto(svg)).toBe('wrongType');
    expect(await checkPhoto(new Blob([new Uint8Array(jpeg)]))).toBeNull();
  });

  it('refuses photos over 5 MB before reading them', async () => {
    const big = new Blob([new Uint8Array(jpeg), new Uint8Array(5 * 1024 * 1024)]);
    expect(await checkPhoto(big)).toBe('tooLarge');
  });
});
