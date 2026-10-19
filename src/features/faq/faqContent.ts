// FAQ entries per language (FR-33). Written by the store; entries marked todo are drafts
// awaiting the owner's answers (PRD Q10). vite.config.ts fails a production build while any
// entry is still marked todo.
import type { Locale } from '../i18n/locales';
import en from './faq.en.json';
import fil from './faq.fil.json';
import ko from './faq.ko.json';

export interface FaqEntry {
  question: string;
  answer: string;
  todo: boolean;
}

export const faq: Record<Locale, FaqEntry[]> = { en, fil, ko };
