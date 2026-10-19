// Settings the visitor asked for, kept in browser storage (NFR-PRIV-04): language, theme and
// the privacy choice. Nothing else is stored before the visitor accepts on the privacy banner.
// Storage can be missing or blocked, for example in private browsing or some in-app
// browsers, so every read and write is wrapped and the site keeps working without it (TRD 4).

const keys = {
  locale: 'seoul-mate.locale',
  // Also read by public/theme-init.js before the app loads.
  theme: 'seoul-mate.theme',
  consent: 'seoul-mate.consent',
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
