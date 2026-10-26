import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
// Self-hosted fonts (D-013). Noto Sans KR loads only the character ranges a page uses.
import '@fontsource-variable/fredoka';
import '@fontsource-variable/nunito';
import '@fontsource-variable/noto-sans-kr';
import { App } from './App';
import { startConsent } from './features/consent/consent';
import { startMotion } from './features/motion/motion';
import { watchSystemTheme } from './features/theme/theme';
import './index.css';
import './features/motion/motion.css';
import './components/forms.css';
import './components/layout.css';
import './features/home/home.css';
import './features/catalog/catalog.css';
import './features/store-info/store-info.css';
import './features/site/site.css';
import './print.css';

watchSystemTheme();
// Before the first render, so scroll reveals know whether to hide anything (D-038).
startMotion();
// Reads campaign details from the landing address; saved only after consent (FR-57).
startConsent(window.location.search);

const root = document.getElementById('root');
if (!root) {
  throw new Error('Missing #root element in index.html');
}

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
