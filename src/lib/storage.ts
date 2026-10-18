// Settings the visitor asked for, kept in browser storage (NFR-PRIV-04). Storage can be
// missing or blocked, for example in private browsing or some in-app browsers, so every
// read and write is wrapped and the site keeps working without it (TRD 4).

const keys = {
  locale: 'seoul-mate.locale',
} as const;

export type SettingName = keyof typeof keys;

export function readSetting(name: SettingName): string | null {
  try {
    return window.localStorage.getItem(keys[name]);
  } catch {
    return null;
  }
}

export function writeSetting(name: SettingName, value: string): void {
  try {
    window.localStorage.setItem(keys[name], value);
  } catch {
    // Not saved: the choice still applies for this visit.
  }
}
