import { useLocation } from 'react-router';
import { useLocale } from '../features/i18n/localeContext';

/** The home page sections the header links to, by element id. */
export const sections = [
  { id: 'menu', labelKey: 'header.menu' },
  { id: 'how-to-order', labelKey: 'header.howToOrder' },
  { id: 'faq', labelKey: 'header.faq' },
  { id: 'visit', labelKey: 'header.visit' },
] as const;

/**
 * Link target for a home page section. On the home page it is a plain fragment, so the
 * browser scrolls without reloading and keeps the current filter in the address.
 */
export function useSectionHref(): (id: string) => string {
  const locale = useLocale();
  const { pathname } = useLocation();
  const onHome = pathname === `/${locale}/` || pathname === `/${locale}`;
  return (id) => (onHome ? `#${id}` : `/${locale}/#${id}`);
}
