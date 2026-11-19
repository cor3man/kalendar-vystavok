/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

declare module '*.module.css' {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}
