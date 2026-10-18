// Keeps a loaded menu current (FR-06, FR-09, D-020).
//
// - Every `menu_state` change event schedules a reload 300 ms later, so a burst of changes
//   causes one reload.
// - While the live connection is down, the version is checked every 10 seconds instead,
//   and the page says live updates are paused.
// - When the connection comes back, the version is checked once, so changes made while it
//   was down are picked up.
// - If the first load fails, the page shows the error state; every later check retries.
import type { Menu, MenuSource } from './types';

export type LiveMenuState =
  | { status: 'loading'; paused: boolean }
  | { status: 'error'; paused: boolean }
  | { status: 'ready'; paused: boolean; menu: Menu };

export interface LiveMenuOptions {
  debounceMs?: number;
  pollMs?: number;
}

export interface LiveMenu {
  /** Checks the version now and reloads if it changed, for example when the tab is shown again. */
  check: () => void;
  /** Loads the menu again now. */
  retry: () => void;
  stop: () => void;
}

export function startLiveMenu(
  source: MenuSource,
  onState: (state: LiveMenuState) => void,
  { debounceMs = 300, pollMs = 10_000 }: LiveMenuOptions = {},
): LiveMenu {
  let menu: Menu | undefined;
  let failed = false;
  let paused = false;
  let stopped = false;
  let loading = false;
  let reloadQueued = false;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let pollTimer: ReturnType<typeof setInterval> | undefined;

  function publish() {
    if (stopped) return;
    if (menu) onState({ status: 'ready', paused, menu });
    else onState({ status: failed ? 'error' : 'loading', paused });
  }

  async function load() {
    if (loading) {
      reloadQueued = true;
      return;
    }
    loading = true;
    try {
      menu = await source.load();
      failed = false;
    } catch {
      // Keep showing the last good menu if there is one. Sentry reporting comes in step 10.
      failed = true;
    } finally {
      loading = false;
    }
    publish();
    if (reloadQueued && !stopped) {
      reloadQueued = false;
      void load();
    }
  }

  function scheduleReload() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => void load(), debounceMs);
  }

  async function check() {
    if (stopped) return;
    if (loading) {
      reloadQueued = true;
      return;
    }
    if (!menu) {
      await load();
      return;
    }
    try {
      const version = await source.loadVersion();
      if (version !== menu.version) scheduleReload();
    } catch {
      // Try again at the next check.
    }
  }

  function setPaused(value: boolean) {
    if (paused === value) return;
    paused = value;
    if (paused) {
      pollTimer = setInterval(() => void check(), pollMs);
    } else {
      clearInterval(pollTimer);
      pollTimer = undefined;
    }
    publish();
  }

  const unsubscribe = source.subscribe({
    onChange: scheduleReload,
    onStatus(status) {
      if (stopped) return;
      if (status === 'live') {
        setPaused(false);
        // Catches changes made before the subscription started, or while it was down.
        void check();
      } else {
        setPaused(true);
      }
    },
  });

  publish();
  void load();

  return {
    check: () => void check(),
    retry: () => void load(),
    stop() {
      stopped = true;
      clearTimeout(debounceTimer);
      clearInterval(pollTimer);
      unsubscribe();
    },
  };
}
