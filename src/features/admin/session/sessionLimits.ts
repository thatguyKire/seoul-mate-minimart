// Staff session limits (FR-46, D-016): logged out after 60 minutes without activity, or
// 12 hours after logging in, whichever comes first.

export const idleLimitMs = 60 * 60 * 1000;
export const maxSessionMs = 12 * 60 * 60 * 1000;

export type SessionEnd = 'idle' | 'expired';

export function sessionEnd(
  now: number,
  lastActivity: number,
  signedInAt: number,
): SessionEnd | null {
  if (now - signedInAt >= maxSessionMs) return 'expired';
  if (now - lastActivity >= idleLimitMs) return 'idle';
  return null;
}

// The time of the last keyboard, pointer or touch input, kept across tabs and reloads, so
// closing the tab does not restart the idle clock.
const activityKey = 'seoul-mate.admin.lastActivity';

export function readLastActivity(): number | null {
  try {
    const value = Number(window.localStorage.getItem(activityKey));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function writeLastActivity(time: number): void {
  try {
    window.localStorage.setItem(activityKey, String(time));
  } catch {
    // Without storage the idle clock lives only as long as this page.
  }
}
