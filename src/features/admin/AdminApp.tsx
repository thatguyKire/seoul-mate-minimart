// The staff panel under /admin (SDD 2.3), loaded as its own chunk so visitors never
// download it (NFR-PERF-02). English only for v1 (D-025).
import { useLayoutEffect } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { Navigate, Route, Routes } from 'react-router';
import { getAdminClient } from './adminClient';
import { adminI18n } from './adminI18n';
import { AdminLayout } from './pages/AdminLayout';
import { CategoriesPage } from './pages/CategoriesPage';
import { ItemFormPage } from './pages/ItemFormPage';
import { ItemListPage } from './pages/ItemListPage';
import { LoginPage } from './pages/LoginPage';
import { MfaPage } from './pages/MfaPage';
import { SecurityPage } from './pages/SecurityPage';
import { AuthProvider } from './session/auth';
import { useAuth } from './session/authContext';
import './admin.css';

export default function AdminApp() {
  useLayoutEffect(() => {
    document.documentElement.lang = 'en';
    document.title = 'Staff panel | Seoul-Mate Minimart';
  }, []);

  const client = getAdminClient();
  return (
    <I18nextProvider i18n={adminI18n}>
      {client ? (
        <AuthProvider client={client}>
          <AdminGate />
        </AuthProvider>
      ) : (
        <Unavailable />
      )}
    </I18nextProvider>
  );
}

function AdminGate() {
  const { t } = useTranslation('admin');
  const { state, refresh } = useAuth();

  switch (state.status) {
    case 'loading':
      return <p className="admin-loading">{t('loading')}</p>;
    case 'error':
      return (
        <main id="main" className="admin-auth">
          <p>{t('errors.network')}</p>
          <button type="button" className="button button--secondary" onClick={() => void refresh()}>
            {t('errors.retry')}
          </button>
        </main>
      );
    case 'signed-out':
      return <LoginPage notice={state.notice} />;
    case 'mfa':
      return <MfaPage />;
    case 'signed-in':
      return (
        <Routes>
          <Route
            element={
              <AdminLayout
                email={state.email}
                requireMfa={state.requireMfa}
                hasMfa={state.hasMfa}
              />
            }
          >
            <Route index element={<ItemListPage />} />
            <Route path="items/new" element={<ItemFormPage />} />
            <Route path="items/:id" element={<ItemFormPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="security" element={<SecurityPage />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>
        </Routes>
      );
  }
}

function Unavailable() {
  const { t } = useTranslation('admin');
  return (
    <main id="main" className="admin-auth">
      <h1 className="admin-auth__title">{t('title')}</h1>
      <p>{t('unavailable')}</p>
    </main>
  );
}
