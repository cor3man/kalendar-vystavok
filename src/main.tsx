import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './render/fonts/fonts.css';
import { App } from './App.tsx';
import { ru } from './i18n/ru.ts';
import { installServiceWorker } from './pwa/registerSw.ts';
import { createAppStore, installPageLifecycle } from './state/bootstrap.ts';
import { StoreProvider } from './state/StoreProvider.tsx';
import { createUpdateStore } from './state/updateStore.ts';

document.title = ru.appName;

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('Root element #root not found in index.html');
}

const store = createAppStore();
installPageLifecycle(store);
void store.getState().init();

const update = createUpdateStore({
  flush: () => store.getState().flushSave(),
  reload: () => {
    window.location.reload();
  },
});
installServiceWorker(update);

createRoot(rootElement).render(
  <StrictMode>
    <StoreProvider store={store} update={update}>
      <App />
    </StoreProvider>
  </StrictMode>,
);
