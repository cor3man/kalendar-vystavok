import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './render/fonts/fonts.css';
import { App } from './App.tsx';
import { ru } from './i18n/ru.ts';
import { createAppStore, installPageLifecycle } from './state/bootstrap.ts';
import { StoreProvider } from './state/StoreProvider.tsx';

document.title = ru.appName;

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('Root element #root not found in index.html');
}

const store = createAppStore();
installPageLifecycle(store);
void store.getState().init();

createRoot(rootElement).render(
  <StrictMode>
    <StoreProvider store={store}>
      <App />
    </StoreProvider>
  </StrictMode>,
);
