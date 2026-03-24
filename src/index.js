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

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();
