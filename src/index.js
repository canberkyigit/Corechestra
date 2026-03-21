import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/dark.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Apply saved dark mode preference before first render (no flash)
if (localStorage.getItem('corechestra_dark') === 'true') {
  document.documentElement.classList.add('dark');
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();
