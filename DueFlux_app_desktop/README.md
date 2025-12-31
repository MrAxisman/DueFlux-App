# DueFlux Desktop (Windows & Linux)

Build and run the Electron app on both platforms with the same sources.

## Prerequisites
- Node.js 18+ and npm
- On Linux, ensure `libgtk`, `libnss3`, `libatk` (Electron deps) are installed.

## Install deps (run once per platform)
```bash
cd DueFlux_app_desktop/Windows   # or Linux
npm install
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
- `electron-builder` config lives in each `package.json`. The app ships renderer only (Firebase cloud storage), no local backend DB.
- Keep `renderer/`, `main.js`, `preload.js` in sync across platforms. You can re-copy or script a sync if needed.
- Optional CI: macOS build workflow lives in `DueFlux_app_desktop/.github/workflows/desktop-macos.yml`.
