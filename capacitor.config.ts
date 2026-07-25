import type { CapacitorConfig } from '@capacitor/cli';

// Capacitor wraps the built web app (dist/) into a native Android APK.
// Build the web assets with `npm run cap:build` (BUILD_TARGET=capacitor) so the
// bundle uses relative asset paths and skips the web-only CSP meta tag, then
// `npx cap sync android` copies dist/ into the native project.
const config: CapacitorConfig = {
  appId: 'com.l4w1i3t.alterego',
  appName: 'ALTER EGO',
  webDir: 'dist',
  android: {
    // All LLM/voice APIs are HTTPS; no cleartext needed for hosted providers.
    // (A local Ollama server on http:// is not reachable from a phone anyway.)
    allowMixedContent: false,
  },
};

export default config;
