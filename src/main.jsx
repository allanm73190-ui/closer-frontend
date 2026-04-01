import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

const CHUNK_RELOAD_KEY = 'cd_chunk_reload_once';

function isChunkLoadErrorMessage(message = '') {
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(String(message));
}

function recoverFromChunkError() {
  try {
    const alreadyReloaded = sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1';
    if (alreadyReloaded) return;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
  } catch {}
  window.location.reload();
}

window.addEventListener('error', (event) => {
  if (isChunkLoadErrorMessage(event?.message)) {
    recoverFromChunkError();
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event?.reason;
  const message = reason?.message || String(reason || '');
  if (isChunkLoadErrorMessage(message)) {
    event.preventDefault?.();
    recoverFromChunkError();
  }
});

createRoot(document.getElementById('root')).render(<App/>);
