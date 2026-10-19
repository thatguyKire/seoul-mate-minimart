// The visitor's privacy choice (FR-54 to FR-57, SDD 2.2 consent). Stored as a setting the
// visitor asked for (NFR-PRIV-04). Until they accept, no analytics loads and no campaign
// details are saved. No analytics provider is chosen yet (D-003): when one is, it starts here
// on "accepted", and never under /admin.
import { useSyncExternalStore } from 'react';
import { readSetting, writeSetting } from '../../lib/storage';
import { applyConsent, captureLanding } from './utm';

export type ConsentChoice = 'accepted' | 'declined';

const listeners = new Set<() => void>();
let bannerReopened = false;
// Holds the choice for this visit when browser storage is blocked (TRD 4).
let choiceThisVisit: ConsentChoice | null = null;

export function consentChoice(): ConsentChoice | null {
  const value = readSetting('consent');
  return value === 'accepted' || value === 'declined' ? value : choiceThisVisit;
}

export function chooseConsent(choice: ConsentChoice) {
  choiceThisVisit = choice;
  writeSetting('consent', choice);
  bannerReopened = false;
  applyConsent(choice === 'accepted');
  notify();
}

/** The footer's "Privacy choices" link shows the banner again (FR-56). */
export function reopenBanner() {
  bannerReopened = true;
  notify();
}

/** Called once at start-up: reads campaign details from the landing address. */
export function startConsent(search: string) {
  captureLanding(search, consentChoice() === 'accepted');
}

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

interface ConsentSnapshot {
  choice: ConsentChoice | null;
  bannerOpen: boolean;
}

let snapshot: ConsentSnapshot | undefined;

function getSnapshot(): ConsentSnapshot {
  const choice = consentChoice();
  const bannerOpen = choice === null || bannerReopened;
  if (snapshot?.choice !== choice || snapshot.bannerOpen !== bannerOpen) {
    snapshot = { choice, bannerOpen };
  }
  return snapshot;
}

export function useConsent(): ConsentSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
