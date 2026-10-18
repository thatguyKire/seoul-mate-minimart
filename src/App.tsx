import { Route, Routes } from 'react-router';
import { ErrorBoundary } from './app/ErrorBoundary';
import { LocaleRoute } from './app/LocaleRoute';
import { RootRedirect } from './app/RootRedirect';
import { HomePage } from './features/home/HomePage';
import { NotFoundPage } from './features/home/NotFoundPage';

/** Routes. The router itself is set up in main.tsx, so tests can use a memory router. */
export function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route index element={<RootRedirect />} />
        <Route path=":locale" element={<LocaleRoute />}>
          <Route index element={<HomePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
