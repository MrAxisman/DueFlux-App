# DueFlux Mobile (Android and iOS)

Expo application with Firebase authentication, invoice management, source connections, reports, twelve languages and a durable offline mutation queue.

## Prerequisites
- Node.js 22+ and npm; use the workspace toolchain helper if needed.
- Use the project-local CLI with `npx expo`, not the deprecated global `expo-cli`.
- Android emulator/device for native Android testing; macOS and Xcode for iOS simulator/native builds.

## Install deps
```bash
cd DueFlux_app_mobile/expo
npm ci
```

## Run in simulator/device
```bash
npm start          # starts Metro
npm run android    # builds & runs on Android emulator/device
npm run ios        # builds & runs on iOS simulator/device (macOS required)
```

## Create native projects (optional, for full builds)
```bash
npm run prebuild   # generates android/ and ios/ native projects
```
After prebuild, open in Android Studio / Xcode to build APK/IPA.

## Firebase
- Auth, Firestore, and Storage are configured in `App.js` for `dueflux-product`.

## What's included
- Basic accounts use Home; Business accounts use Business.
- Search and status filters work on cached invoices. Local additions, payment confirmations and deletions persist before appearing as saved; device sync retries on reconnect or foreground activation.
- Email/phone setup appears for unconfigured accounts, then stays in Settings. Remote actions need internet.
- Local cache is not encrypted. Use an OS-protected device; do not describe it as an encrypted vault.
- Reports support field selection and offline exports. FastReport needs the configured authenticated online service.

## Validation
```bash
npm run lint
npx expo export --platform android --platform ios --output-dir dist-audit
```
Run `npm test` from the workspace root for shared queue, mobile data and translation checks.
Bundle export is not a native-device test. Verify real OAuth/SMS, offline reconnect and exports on Android and iOS before releasing. Releases remain owner-triggered through `.github/workflows/mobile-release.yml`.
