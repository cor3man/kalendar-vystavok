// Browser wiring of the service worker (SPEC 5.9): reports a waiting new version to the update
// store and tells it when a new version has taken control. The store decides when to reload.
import { registerSW } from 'virtual:pwa-register';
import type { UpdateStore } from '../state/updateStore.ts';

/** How often an open app asks the server for a new version. */
const CHECK_INTERVAL_MS = 60 * 60 * 1000;

export function installServiceWorker(update: UpdateStore, win: Window = window): void {
  if (!('serviceWorker' in win.navigator)) return;
  const container = win.navigator.serviceWorker;

  // Workbox only reports a takeover as an update when the page already had a controller when it
  // registered, which misses an update arriving during the very first visit. So the switch is
  // detected here: a controller replacing another one is a new version; the first worker
  // claiming the page is not.
  let controlled = container.controller !== null;
  container.addEventListener('controllerchange', () => {
    if (controlled) update.getState().requestReload();
    controlled = true;
  });

  const activate = registerSW({
    immediate: true,
    onNeedRefresh: () => {
      update.getState().setAvailable(() => activate());
    },
    // Replaces the plugin's own immediate reload; handled by the controllerchange listener.
    onNeedReload: () => undefined,
    onRegisteredSW: (_url, registration) => {
      if (registration === undefined) return;
      win.setInterval(() => {
        // Offline or a server error: the next check tries again.
        registration.update().catch(() => undefined);
      }, CHECK_INTERVAL_MS);
    },
  });
}
