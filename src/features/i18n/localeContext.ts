import { createContext, useContext } from 'react';
import { defaultLocale, type Locale } from './locales';

export const LocaleContext = createContext<Locale>(defaultLocale);

/** The language of the current page, from its URL prefix. */
export function useLocale(): Locale {
  return useContext(LocaleContext);
}
