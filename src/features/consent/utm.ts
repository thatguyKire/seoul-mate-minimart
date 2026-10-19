// Campaign details from the landing address (FR-57, SDD 7.3). Kept in memory only until the
// visitor accepts on the privacy banner; then saved for this browser session and attached to
// contact form messages. Declining discards them, and nothing is ever saved without consent.

export const utmKeys = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
] as const;

export type UtmKey = (typeof utmKeys)[number];
export type Utm = Partial<Record<UtmKey, string>>;

const sessionKey = 'seoul-mate.utm';
// The same rule the contact function applies (SDD 3.2): letters, digits, spaces and ._+-.
const allowed = /^[\p{L}\p{N} ._+-]{1,100}$/u;

/** The five UTM values from a query string; anything else, or any odd value, is ignored. */
export function utmFromSearch(search: string): Utm {
  const params = new URLSearchParams(search);
  const utm: Utm = {};
  for (const key of utmKeys) {
    const value = params.get(key)?.trim();
    if (value && allowed.test(value)) utm[key] = value;
  }
  return utm;
}

let pending: Utm = {};

/** Called once at start-up with the landing address. */
export function captureLanding(search: string, consented: boolean) {
  pending = utmFromSearch(search);
  if (consented) persist();
}

function persist() {
  if (Object.keys(pending).length === 0) return;
  try {
    window.sessionStorage.setItem(sessionKey, JSON.stringify(pending));
  } catch {
    // Without storage the values last as long as this page.
  }
}

/** The visitor's choice on the banner decides what happens to the captured values. */
export function applyConsent(accepted: boolean) {
  if (accepted) {
    persist();
    return;
  }
  pending = {};
  try {
    window.sessionStorage.removeItem(sessionKey);
  } catch {
    // Nothing was stored.
  }
}

function nonEmpty(utm: Utm): Utm | null {
  return Object.keys(utm).length > 0 ? utm : null;
}

/** The values to attach to a contact message: none without consent. */
export function consentedUtm(accepted: boolean): Utm | null {
  if (!accepted) return null;
  try {
    const raw = window.sessionStorage.getItem(sessionKey);
    // Storage blocked or emptied: the values from this page load, if any.
    if (!raw) return nonEmpty(pending);
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return null;
    const utm: Utm = {};
    for (const key of utmKeys) {
      const value = (parsed as Record<string, unknown>)[key];
      if (typeof value === 'string' && allowed.test(value)) utm[key] = value;
    }
    return nonEmpty(utm);
  } catch {
    return nonEmpty(pending);
  }
}
