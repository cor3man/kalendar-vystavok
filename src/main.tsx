import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import { App } from './App.tsx';
import { ru } from './i18n/ru.ts';

document.title = ru.appName;

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('Root element #root not found in index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
