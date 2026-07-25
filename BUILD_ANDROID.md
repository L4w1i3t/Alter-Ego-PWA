# Building ALTER EGO as an Android APK

ALTER EGO ships as a PWA. To install it as a standalone Android app, we wrap the
built web bundle in a native Android shell with [Capacitor](https://capacitorjs.com/).
The web assets are bundled **inside** the APK, so the app runs offline-first and
needs no hosting — you just sideload the APK onto your device.

## What you need (one-time)

- **Node.js ≥ 20** and this repo's dependencies installed (`npm install`).
- **JDK 17** (Android Gradle requires 17). Verify with `java -version`.
- **Android SDK.** Easiest via [Android Studio](https://developer.android.com/studio)
  (installs the SDK, platform tools, and an emulator). After install, set
  `ANDROID_HOME` (e.g. `C:\Users\<you>\AppData\Local\Android\Sdk`) and accept
  licenses: `sdkmanager --licenses`.

> You do **not** need Android Studio open to build a debug APK from the command
> line, but it is the simplest way to install the SDK and to sign a release APK.

## First-time project setup

From the repo root:

```bash
npm install                 # pulls in @capacitor/core, /cli, /android
npm run cap:build           # builds the web app into dist/ for Capacitor
npx cap add android         # scaffolds the native android/ project (one time)
```

`npx cap add android` generates an `android/` folder — the native Gradle project.
Commit it (recommended) or add it to `.gitignore`; either works.

## Build the APK

Every time you change the web app, rebuild and sync, then run Gradle:

```bash
npm run cap:sync            # cap:build + copies dist/ into android/
```

Then produce a **debug** APK:

```bash
cd android
# Windows:
gradlew.bat assembleDebug
# macOS/Linux:
./gradlew assembleDebug
```

The APK lands at:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

Copy it to your phone and open it to install (enable "Install unknown apps" for
your file manager/browser the first time).

`npm run android:apk` chains `cap:sync` + `gradlew.bat assembleDebug` on Windows.

### Or build/run from Android Studio

```bash
npm run cap:open            # opens the android/ project in Android Studio
```

Then use **Run ▶** (to a device/emulator) or **Build → Build APK(s)**.

## Release (signed) APK

A debug APK is fine for personal sideloading. For a shareable/Play-Store build,
create a keystore and configure signing, then:

```bash
cd android
./gradlew assembleRelease      # unsigned; or bundleRelease for an .aab
```

See the Capacitor + Android signing guide:
<https://capacitorjs.com/docs/android/deploying-to-google-play>

## Notes specific to ALTER EGO

- **API keys / providers.** The APK bundles the same app, so API keys are stored
  locally on the device and requests go directly from the phone to the provider
  (OpenAI, OpenRouter, **Anthropic/Claude**). All are HTTPS. Anthropic requires
  the `anthropic-dangerous-direct-browser-access` header, which the app already
  sends.
- **Ollama** points at `http://127.0.0.1:11434`, which is the *phone's* localhost
  — there's no local Ollama on a phone, so use a hosted provider on mobile
  (OpenAI, OpenRouter, or Claude). If you want to reach an Ollama server on your
  LAN, set its URL in AI Models settings and enable cleartext for that host in
  `android/app/src/main/res/xml/network_security_config.xml`.
- **CSP.** The Capacitor build (`BUILD_TARGET=capacitor`) skips the web-only
  Content-Security-Policy meta tag; the native container manages network access.
  The deployed web PWA keeps its strict CSP (now including `api.anthropic.com`).
- **Service worker.** Registration may no-op inside the WebView; this is harmless.
- **Hardware back button** (optional): `npm i @capacitor/app` and handle
  `App.addListener('backButton', ...)` if you want custom back behavior.

## App identity

Configured in `capacitor.config.ts`:

- `appId`: `com.l4w1i3t.alterego` (change to your own reverse-domain before publishing)
- `appName`: `ALTER EGO`
- `webDir`: `dist`
