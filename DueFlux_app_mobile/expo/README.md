# DueFlux Mobile (Expo template)

Ready-to-run Expo app for Android/iOS tests. Uses Firebase (Auth/Firestore/Storage) directly.

## Prerequisites
- Node.js 18+
- `npm install --global expo-cli` (optional; or use `npx expo`)

## Install deps
```bash
cd DueFlux_app_mobile/expo
npm install
```

## Run in simulator/device
```bash
npm start          # opens Expo DevTools
npm run android    # builds & runs on Android emulator/device (Expo Go or prebuild)
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
- Minimal sign-in + plan display UI.
- No extra assets; icons/splash fields are in `app.json` (add your PNGs in `assets/` if desired).
