// Light and dark themes (FR-66). public/theme-init.js sets `data-theme` on <html> before the
// first paint; this module changes it afterwards. Until the visitor picks a theme, the page
// follows the system setting, including changes to it while the page is open.
import { useSyncExternalStore } from 'react';
import { readSetting, writeSetting } from '../../lib/storage';

export type Theme = 'light' | 'dark';

const listeners = new Set<() => void>();

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function savedTheme(): Theme | null {
  const saved = readSetting('theme');
  return saved === 'light' || saved === 'dark' ? saved : null;
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  for (const listener of listeners) listener();
}

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

/** The visitor's explicit choice, remembered for the next visit. */
export function chooseTheme(theme: Theme) {
  writeSetting('theme', theme);
  apply(theme);
}

let watching = false;

/** Follows system changes while the visitor has not chosen a theme. */
export function watchSystemTheme() {
  if (watching) return;
  watching = true;
  if (!document.documentElement.dataset.theme) apply(savedTheme() ?? systemTheme());
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (!savedTheme()) apply(systemTheme());
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, currentTheme, () => 'light');
}
