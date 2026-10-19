import { createContext, useContext } from 'react';
import type { AdminClient } from '../adminClient';
import type { SessionEnd } from './sessionLimits';

export type SignOutNotice = SessionEnd | 'notStaff' | 'loggedOut';

export type AuthState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'signed-out'; notice: SignOutNotice | null }
  | { status: 'mfa'; email: string }
  | { status: 'signed-in'; email: string; requireMfa: boolean; hasMfa: boolean };

export type SignInFailure = 'wrong' | 'rateLimited' | 'network';
export type MfaFailure = 'wrong' | 'network';

export interface AuthContextValue {
  state: AuthState;
  client: AdminClient;
  signIn: (email: string, password: string) => Promise<SignInFailure | null>;
  verifyMfa: (code: string) => Promise<MfaFailure | null>;
  signOut: (notice?: SignOutNotice) => Promise<void>;
  /** Checks staff status and two-factor level again, for example after turning two-factor on. */
  refresh: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth needs an AuthProvider');
  return value;
}
