import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import { ErrorBoundary } from './app/ErrorBoundary';
import { LocaleRoute } from './app/LocaleRoute';
import { NewVersionPage } from './app/NewVersionPage';
import { RootRedirect } from './app/RootRedirect';
import { HomePage } from './features/home/HomePage';
import { NotFoundPage } from './features/home/NotFoundPage';

// The staff panel is a separate chunk, so visitors never download it (NFR-PERF-02). If a
// release removed the chunk an open tab still points to, the page offers a reload (SDD 6).
const AdminApp = lazy(() =>
  import('./features/admin/AdminApp').catch(() => ({ default: NewVersionPage })),
);

// The legal pages carry long texts in three languages; only visitors who open them load them.
const LegalPage = lazy(() =>
  import('./features/legal/LegalPage')
    .then((module) => ({ default: module.LegalPage }))
    .catch(() => ({ default: NewVersionPage })),
);

/** Routes. The router itself is set up in main.tsx, so tests can use a memory router. */
export function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route index element={<RootRedirect />} />
        <Route
          path="admin/*"
          element={
            <Suspense fallback={null}>
              <AdminApp />
            </Suspense>
          }
        />
        <Route path=":locale" element={<LocaleRoute />}>
          <Route index element={<HomePage />} />
          <Route
            path="privacy"
            element={
              <Suspense fallback={null}>
                <LegalPage kind="privacy" />
              </Suspense>
            }
          />
          <Route
            path="terms"
            element={
              <Suspense fallback={null}>
                <LegalPage kind="terms" />
              </Suspense>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
