import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/dark.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Instant dark mode from cache (prevents flash before Firestore loads)
if (localStorage.getItem('corechestra_dark') === '1') {
  document.documentElement.classList.add('dark');
}

// NOTE: Firestore SDK 12.x has a known internal assertion bug ("Unexpected state ca9/b815")
// triggered by React StrictMode's double-effect in development. Suppress to prevent the
// dev error overlay from blocking the UI — the stream auto-recovers.
window.addEventListener('error', (event) => {
  if (event?.error?.message?.includes('FIRESTORE') && event?.error?.message?.includes('INTERNAL ASSERTION FAILED')) {
    event.preventDefault();
    console.warn('[Firestore] Known SDK internal error suppressed — stream will recover.', event.error.message.slice(0, 120));
  }
});
window.addEventListener('unhandledrejection', (event) => {
  if (event?.reason?.message?.includes('FIRESTORE') && event?.reason?.message?.includes('INTERNAL ASSERTION FAILED')) {
    event.preventDefault();
    console.warn('[Firestore] Known SDK internal rejection suppressed — stream will recover.', event.reason.message.slice(0, 120));
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();
