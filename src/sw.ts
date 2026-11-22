/// <reference lib="webworker" />
// Service worker (SPEC 2 #23, 5.9): precaches the whole build so the app works offline after the
// first visit. A new version waits until the user presses the update button (registerType: 'prompt').
import { clientsClaim } from 'workbox-core';
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope;

// Injected at build time by vite-plugin-pwa (injectManifest).
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

// Sent by registerSW's update function when the user presses the update button.
self.addEventListener('message', (event) => {
  if ((event.data as { type?: unknown } | null)?.type === 'SKIP_WAITING') void self.skipWaiting();
});

// The first install takes control at once, so the first visit is already offline-ready.
clientsClaim();
