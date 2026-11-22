/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/vanillajs" />

declare const __APP_VERSION__: string;

declare module '*.module.css' {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}

/** Test hooks injected by Playwright before the app loads (SPEC 7.2). */
interface KalendarTestFlags {
  storage?: 'memory';
}

interface Window {
  __KALENDAR_TEST__?: KalendarTestFlags;
}
