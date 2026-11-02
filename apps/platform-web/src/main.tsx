import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './workspace.js';
import { PublicSiteEntry } from './public-site.js';
import './catalog.css';
import './portal-theme.css';
const root = document.getElementById('root');
if (!root) throw new Error('Root element missing');
const shareId = /^\/s\/([a-f0-9-]{36})$/i.exec(location.pathname)?.[1];
createRoot(root).render(
  <StrictMode>
    {shareId ? <PublicSiteEntry shareId={shareId} fallback={<App />} /> : <App />}
  </StrictMode>,
);
