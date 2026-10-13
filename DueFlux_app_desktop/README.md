# DueFlux Desktop (Windows, Linux and macOS)

Windows is the canonical Electron source for all three platforms. The Linux directory is a synchronized copy; macOS builds use the canonical source.

## Prerequisites
- Node.js 22+ and npm
- On Linux, ensure `libgtk`, `libnss3`, `libatk` (Electron deps) are installed.

## Install deps (run once per platform)
```bash
cd DueFlux_app_desktop/Windows   # canonical source, also used on macOS
npm ci
```

## Run in dev
```bash
npm start
```

## Build installers
- **Windows (from Windows):**
  ```bash
  npm run build:win
  ```
- **Linux (from Linux):**
  ```bash
  npm run build:linux
  ```
- **macOS (from macOS):**
  ```bash
  npm run build:mac
  ```
Outputs land in `dist/` as NSIS (win), AppImage (linux), and DMG/ZIP (macOS).

## Notes
- `electron-builder` config lives in `Windows/package.json`. Cloud services remain in the private repository; credentials never belong in the app bundle.
- Run `npm run sync:desktop` from the workspace root after editing canonical files.
- Cached invoices are available offline with durable queued changes. Device sync shows pending counts and failures; remote integrations require internet. Local storage is not encrypted.
- Run `npm test`, `npm run test:desktop` and `npm run test:ui` from the workspace root. UI tests need Playwright Chromium (`npx playwright install chromium`), or installed Chrome with `DUEFLUX_BROWSER_CHANNEL=chrome`.
- CI checks are in `.github/workflows/platform-audit.yml`. Releases are owner-triggered through `.github/workflows/desktop-release.yml`; signed native installers need separately configured signing credentials and OS-specific smoke tests.
