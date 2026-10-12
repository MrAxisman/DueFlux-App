# DueFlux Release Readiness

Updated: 2026-10-12.

For the Windows development toolchain, run `./scripts/use-toolchain.ps1` in the terminal. It verifies and installs Node LTS 24.21.0 and npm 12.2.0 inside the ignored `.tools` directory and activates them for that terminal. Start desktop with `npm start` from the workspace root; use `npm run start:mobile` for Expo.

## Repositories and Hosting

- Applications and releases: https://github.com/MrAxisman/DueFlux-App (public).
- Website, Firebase backend and FastReport: https://github.com/MrAxisman/DueFlux (private).
- Website hosting is Hostinger; authentication, Firestore and functions run in Firebase.
- Windows is the canonical cross-platform Electron source. Run `npm run sync:desktop` to update the Linux copy. macOS builds use the canonical source.
- `npm run sync:cloud` copies an explicit backend allowlist into the private website repository's `.cloud` directory, without credentials.

## Implemented

- Firestore rules prevent self-granted subscriptions and forged verification, evidence and delivery statuses.
- Private OTP challenges enforce transactional cooldowns, daily limits, attempts and one-use consumption.
- Offline queues use stable operation identifiers and server receipts. Lost responses can be retried, deleted invoices remain deleted, and dependent edits check their predecessor revision.
- Mobile sessions persist between launches. Cached invoice dates and metadata are restored; account changes clear the previous account's displayed data.
- A single responsive dashboard hero replaces overlapping CSS overrides. Basic is Home; Business is Business. Connection setup moves to Settings after setup.
- Reports support selected fields, CSV/JSON/HTML/TXT/PDF, native offline PDF and authenticated online FastReport PDF/HTML.
- Exported HTML escapes invoice text and CSV neutralizes spreadsheet formulas. Official action links use maintained provider origins.
- Twelve language packs have complete audited static keys across apps and website, persisted selection and Arabic RTL handling.
- Website staging excludes backend files and credentials; unavailable platform downloads are clearly marked.

## Verified Locally

```powershell
npm ci --ignore-scripts
npm test
npm run test:desktop
pwsh -NoProfile -File scripts/audit-platform-sync.ps1 -Strict -IncludeCloud
node DueFlux_website/scripts/audit-i18n.mjs
npm --prefix DueFlux_app_mobile/expo run lint
```

Desktop tests require installed desktop dependencies. The test launches a hidden Electron window and verifies a real PDF. Inside the mobile directory, `npx expo-doctor` passed all 21 checks; `npx expo export --platform android --platform ios --output-dir dist-audit` generated both bundles.

Backend tests use Java 21, Firebase CLI and a demo emulator project. Unset `DEBUG` first to prevent verbose environment logging:

```powershell
Remove-Item Env:DEBUG -ErrorAction SilentlyContinue
firebase emulators:exec --project demo-dueflux-quality --only firestore --config firebase.test.json "node --test functions/test-security.js"
node --test functions/test-report-payload.js
```

FastReport compiles against .NET 10 and validates PDF, HTML and input bounds with:

```powershell
dotnet run --project DueFlux_website/.cloud/reports --configuration Release -- --self-test
```

GitHub validates Linux rendering inside its deployment container. Native Android/iOS/macOS installation, billing, approved OAuth flows and live SMS still need smoke tests with configured services/devices. Key coverage does not replace a native-speaker review of every translation.

## Deploy Through GitHub

Private repository setup and release order are documented in `DueFlux_website/DEPLOYMENT.md`. Deployment credentials were absent when inspected. Configure the production environment, then run report service, Firebase backend and Hostinger website workflows in that order after validation passes.

Public workflows:

- `platform-audit.yml`: shared tests, Electron PDF smoke test and mobile bundles.
- `desktop-release.yml`: requires a new version; builds/releases Windows, Linux and macOS.
- `mobile-release.yml`: EAS builds with optional store submission; requires `EXPO_TOKEN` and configured store credentials.
- `cloud-deploy.yml`: optional private-repository dispatch; configure `CLOUD_REPO_TOKEN` or run private workflows directly.

Desktop signing secrets: `WINDOWS_CSC_LINK`, `WINDOWS_CSC_KEY_PASSWORD`, `MACOS_CSC_LINK`, `MACOS_CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`. Test signed artifacts before updating advertised downloads.

## Operational Follow-up

- Rotate credentials previously exposed in chat or public files; remove obsolete admin/backend folders from existing public hosting. New staging and Apache deny rules prevent their publication/access.
- Older profiles can retain obsolete public OTP fields until the next verification operation clears them; new challenges are private.
- Offline cache uses local device storage and is not an encrypted vault. Server receipts are retained for late-retry idempotency; account deletion/retention must include them.
- The mail scheduler scans linked accounts globally, and invoice intelligence reads a bounded invoice set. Larger deployments need scheduling, pagination and load testing.
- Upstream dependency advisories remain. The last audit found no desktop/backend high or critical advisories; Expo dependency chains still report high advisories for `braces` and `node-forge` without compatible published fixes. Avoid `npm audit fix --force`, which proposes framework downgrades; recheck before release.
- FastReport Open Source provides implemented PDF/HTML without a paid license. Commercial Office exports/designer require a separate edition/license. https://github.com/FastReports/FastReport
