import { Navigate, useLocation } from 'react-router';
import { pickInitialLocale } from '../features/i18n/locales';
import { readSetting } from '../lib/storage';

/** The site root sends visitors to their language: saved choice, then browser language, then English (FR-20). */
export function RootRedirect() {
  const { search, hash } = useLocation();
  const locale = pickInitialLocale(readSetting('locale'), navigator.languages);
  // The query string is kept, so UTM values on a shared link survive the redirect (FR-57).
  return <Navigate to={{ pathname: `/${locale}/`, search, hash }} replace />;
}
