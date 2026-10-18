import { useCallback, useEffect, useRef, useState } from 'react';
import { startLiveMenu, type LiveMenu, type LiveMenuState } from './liveMenu';
import { useMenuSource } from './menuSourceContext';

/** The live menu for this page, plus a retry action for the error state. */
export function useLiveMenu(): { state: LiveMenuState; retry: () => void } {
  const source = useMenuSource();
  const [state, setState] = useState<LiveMenuState>({ status: 'loading', paused: false });
  const live = useRef<LiveMenu | null>(null);

  useEffect(() => {
    const menu = startLiveMenu(source, setState);
    live.current = menu;

    // Phones often drop the live connection while the tab is in the background.
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') menu.check();
    }
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      menu.stop();
      live.current = null;
    };
  }, [source]);

  // Offered only in the error state, where there is no menu to keep on screen.
  const retry = useCallback(() => {
    setState((current) => ({ status: 'loading', paused: current.paused }));
    live.current?.retry();
  }, []);

  return { state, retry };
}
