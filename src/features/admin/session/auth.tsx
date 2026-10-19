// Staff login state (FR-34 to FR-37, FR-46, FR-47; SDD 5.4, 7.2).
//
// After a password login the panel checks, in order: that the account is listed in `admins`
// (otherwise it logs straight out), whether a two-factor code is still needed, and then the
// session limits. These checks only shape the page; the database's RLS policies are what
// actually allow or refuse each change.
import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AdminClient } from '../adminClient';
import { staffRow } from '../adminData';
import {
  AuthContext,
  type AuthState,
  type MfaFailure,
  type SignInFailure,
  type SignOutNotice,
} from './authContext';
import { readLastActivity, sessionEnd, writeLastActivity } from './sessionLimits';

/** Checks the session against session limits every 30 seconds while logged in. */
const checkEveryMs = 30_000;
/** Activity is written to storage at most this often. */
const activityWriteMs = 15_000;

export function AuthProvider({ client, children }: { client: AdminClient; children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  const signedInAt = useRef<number | null>(null);

  const resolve = useCallback(
    async (session: Session | null): Promise<void> => {
      if (!session) {
        signedInAt.current = null;
        setState({ status: 'signed-out', notice: null });
        return;
      }
      const email = session.user.email ?? '';
      signedInAt.current = Date.parse(session.user.last_sign_in_at ?? '') || Date.now();
      try {
        const staff = await staffRow(client, session.user.id);
        if (!staff) {
          await client.auth.signOut({ scope: 'local' });
          setState({ status: 'signed-out', notice: 'notStaff' });
          return;
        }
        const { data: aal } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal?.currentLevel === 'aal1' && aal.nextLevel === 'aal2') {
          setState({ status: 'mfa', email });
          return;
        }
        setState({
          status: 'signed-in',
          email,
          requireMfa: staff.require_mfa,
          hasMfa: aal?.currentLevel === 'aal2',
        });
      } catch {
        setState({ status: 'error' });
      }
    },
    [client],
  );

  const refresh = useCallback(async () => {
    const { data } = await client.auth.getSession();
    await resolve(data.session);
  }, [client, resolve]);

  const signOut = useCallback(
    async (notice: SignOutNotice = 'loggedOut') => {
      signedInAt.current = null;
      // Revokes this session's refresh token on the server; the local session is cleared
      // even when the server cannot be reached.
      await client.auth.signOut({ scope: 'local' });
      setState({ status: 'signed-out', notice });
    },
    [client],
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<SignInFailure | null> => {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        // Every refusal reads the same, whatever the reason (FR-35). Supabase Auth's 429
        // carries no Retry-After header (D-033).
        if (error.status === 429) return 'rateLimited';
        if (error.status && error.status >= 400 && error.status < 500) return 'wrong';
        return 'network';
      }
      writeLastActivity(Date.now());
      await resolve(data.session);
      return null;
    },
    [client, resolve],
  );

  const verifyMfa = useCallback(
    async (code: string): Promise<MfaFailure | null> => {
      const factors = await client.auth.mfa.listFactors();
      // The totp list holds verified factors only.
      const factor = factors.data?.totp[0];
      if (!factor) return 'network';
      const { error } = await client.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
      if (error) return error.status && error.status < 500 ? 'wrong' : 'network';
      writeLastActivity(Date.now());
      await refresh();
      return null;
    },
    [client, refresh],
  );

  useEffect(() => {
    let active = true;
    void client.auth.getSession().then(({ data }) => {
      if (active) void resolve(data.session);
    });
    // Covers a refresh token that was revoked elsewhere, or a logout in another tab.
    const { data } = client.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && active) {
        setState((current) =>
          current.status === 'signed-out' ? current : { status: 'signed-out', notice: null },
        );
      }
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [client, resolve]);

  const loggedIn = state.status === 'signed-in' || state.status === 'mfa';

  // Session limits (FR-46): checked on a timer, when the tab is shown again, and on input.
  useEffect(() => {
    if (!loggedIn) return;
    let lastWrite = 0;

    function check() {
      const started = signedInAt.current;
      if (started === null) return;
      // Activity from before this login, such as an earlier session on this phone, does not count.
      const lastActivity = Math.max(readLastActivity() ?? 0, started);
      const end = sessionEnd(Date.now(), lastActivity, started);
      if (end) void signOut(end);
    }
    function onActivity() {
      const now = Date.now();
      if (now - lastWrite < activityWriteMs) return;
      // An expired session is ended before the activity can extend it.
      check();
      lastWrite = now;
      writeLastActivity(now);
    }
    function onVisibility() {
      if (document.visibilityState === 'visible') check();
    }

    check();
    const timer = setInterval(check, checkEveryMs);
    const events = ['keydown', 'pointerdown', 'touchstart'] as const;
    for (const name of events) window.addEventListener(name, onActivity, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(timer);
      for (const name of events) window.removeEventListener(name, onActivity);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [loggedIn, signOut]);

  const value = useMemo(
    () => ({ state, client, signIn, verifyMfa, signOut, refresh }),
    [state, client, signIn, verifyMfa, signOut, refresh],
  );
  return <AuthContext value={value}>{children}</AuthContext>;
}
