import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@/assets/style.css';
import { uiLanguage } from '@/lib/i18n';

document.documentElement.lang = uiLanguage();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
