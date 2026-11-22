/// <reference lib="webworker" />
// Service worker (SPEC 2 #23, 5.9): precaches the whole build so the app works offline after the
// first visit. A new version waits until the user presses the update button (registerType: 'prompt').
//
// Built with vite-plugin-pwa's injectManifest strategy: the plugin injects the Workbox precache
// manifest into self.__WB_MANIFEST and bundles this file with Vite. There is no custom caching
// logic; the caching is exactly what the plugin's generateSW strategy emits (precacheAndRoute,
// cleanupOutdatedCaches, navigation fallback to index.html, SKIP_WAITING message). The only
// addition is clientsClaim() on first install, so the first visit is offline-ready without a reload.
// The file is kept instead of generateSW because generateSW writes absolute import paths into
// single-quoted strings in the worker it generates, so the build breaks for any checkout whose path
// contains an apostrophe. A Vite-bundled worker has no such paths.
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
