import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { cleanStorageQuota } from './utils/storageUtils';

// Proactively clear stale cache and bloated logs on startup
try {
  cleanStorageQuota();
} catch (e) {
  console.warn('Storage cleanup skipped:', e);
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
