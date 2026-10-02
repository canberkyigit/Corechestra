import React from 'react';
import ReactDOM from 'react-dom/client';
import './app/styles/index.css';
import './app/styles/dark.css';
import App from './app/App';
import reportWebVitals from './reportWebVitals';
import { canReportWebVitals, reportWebVital } from './shared/services/observability';

// Instant dark mode from cache (prevents flash before Firestore loads)
if (localStorage.getItem('corechestra_dark') === '1') {
  document.documentElement.classList.add('dark');
}
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Core Web Vitals go to the analytics sink only when one is configured
// (otherwise the web-vitals chunk is never loaded).
if (canReportWebVitals()) reportWebVitals(reportWebVital);
