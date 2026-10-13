# DueFlux Release Readiness

Updated: 2026-10-13.

For the Windows development toolchain, run `./scripts/use-toolchain.ps1` in the terminal. It verifies and installs Node LTS 24.21.0 and npm 12.2.0 inside the ignored `.tools` directory and activates them for that terminal. Start desktop with `npm start` from the workspace root; use `npm run start:mobile` for Expo.

## Repositories and Hosting

- Applications and releases: https://github.com/MrAxisman/DueFlux-App (public).
- Website, Firebase backend and FastReport: https://github.com/MrAxisman/DueFlux (private).
- Website hosting is Hostinger; authentication, Firestore and functions run in Firebase.
- Windows is the canonical cross-platform Electron source. Run `npm run sync:desktop` to update the Linux copy. macOS builds use the canonical source.
- `npm run sync:cloud` copies an explicit backend allowlist into the private website repository's `.cloud` directory, without credentials.

## Implemented

- Local cache and mutation queues now use AES-256-GCM. Desktop keys combine a local password and Electron safeStorage; mobile keys use SecureStore and device authentication. Linux `basic_text` is rejected. Autolock occurs after five minutes; mobile additionally locks on backgrounding. This protects stored records, not a compromised OS/process or user-exported documents.
- Migration verifies the encrypted copy before deleting plaintext. Divergent copies are preserved and require reconciliation. Legacy Firestore IndexedDB databases are detected and retained because they can contain unacknowledged writes; those databases remain unencrypted and are a release blocker until reconciled. Do not erase application data to silence that warning.
- Desktop cold starts without an authenticated session can view an unlocked cached account offline, read-only. Online synchronization requires signing in. Mobile Firebase auth persistence is encrypted and waits for device unlock.
- Sync center displays pending local operations and the last fifty cloud receipts. Explicit cloud/local resolution uses server revisions and idempotent receipts. Source review exposes original extraction evidence; corrections preserve the evidence and reject duplicate cycles. Native PDF preview uses the system viewer, while supported desktop documents are embedded.
- Home owner/member responsibility and Business owner/admin/operator/accountant/viewer are enforced by callable APIs. Operators request payment approval; only managers approve. Shared workspace invoices are paginated. Default member safety caps are 5 Home/25 Business, not a published pricing commitment. Shared workspaces are online-only in this version.
- Reminders use push/email/SMS/in-app channels, IANA timezones, quiet hours, snooze and per-user/global attempt limits. Push acceptance means sent, not delivered; delivery requires a matching device acknowledgement. SMS delivery uses carrier status. Email currently has no delivery webhook and remains sent. Ambiguous sends are not automatically retried.
- Search center supports encrypted saved searches and comfortable/compact density. Desktop opens it with Ctrl/Cmd+K; mobile has a touch button. Workspace bulk confirmations are limited to 25 invoices and are all-or-nothing against the reviewed revisions.
- Invoice audit events are idempotent and retain field names/revision hashes, not copies of confidential financial values. Unknown/service-account changes are not falsely attributed to the workspace owner.

- Device sync shows pending mutation counts, sync progress and failures, with an online retry action. Conflicts keep the local queue rather than discarding changes.
- Cloud snapshots are overlaid with durable pending invoice mutations on desktop and mobile. Offline changes are persisted before updating the interface; failed saves keep the invoice editor open.
- Mobile invoice search supports multiple terms, accents and non-Latin text, with status filters and resettable empty states. Returning to the foreground retries device sync when online.
- Desktop dialogs have accessible titles, translated close labels, focus containment and restoration. Escape closes only the active dialog. Imported invoice/account text is escaped before HTML rendering.
- Browser regression tests cover twelve languages, responsive widths, themes, keyboard dialogs, untrusted invoice text and failed offline writes. CI now validates these checks on pull requests.

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
npm run test:ui
pwsh -NoProfile -File scripts/audit-platform-sync.ps1 -Strict -IncludeCloud
node DueFlux_website/scripts/audit-i18n.mjs
npm --prefix DueFlux_app_mobile/expo run lint
```

Desktop tests require installed desktop dependencies. The test launches a hidden Electron window and verifies a real PDF. Browser UI tests use blocked cloud access and sample data; install Chromium with `npx playwright install chromium` or set `DUEFLUX_BROWSER_CHANNEL=chrome` for installed Chrome. Inside the mobile directory, `npx expo-doctor` passed all 21 checks in the previous release audit; `npx expo export --platform android --platform ios --output-dir dist-audit` validates the current bundles.

Backend tests use Java 21, Firebase CLI and a demo emulator project. Unset `DEBUG` first to prevent verbose environment logging:

```powershell
Remove-Item Env:DEBUG -ErrorAction SilentlyContinue
firebase emulators:exec --project demo-dueflux-quality --only firestore --config firebase.test.json "node --test functions/test-security.js functions/test-trust-controls.js"
node --test functions/test-report-payload.js
```

FastReport compiles against .NET 10 and validates PDF, HTML and input bounds with:

```powershell
dotnet run --project DueFlux_website/.cloud/reports --configuration Release -- --self-test
```

GitHub validates Linux rendering inside its deployment container. Native Android/iOS/macOS installation, billing, approved OAuth flows and live SMS still need smoke tests with configured services/devices. Key coverage does not replace a native-speaker review of every translation.

## Deploy Through GitHub

Private repository setup and release order are documented in `DueFlux_website/DEPLOYMENT.md`. New app-control APIs, rules, indexes and schedulers must be deployed before testing the new cloud features. This change does not deploy services, submit stores, send SMS or modify live records. The owner deploys manually after GitHub validation.

Public workflows:

- `platform-audit.yml`: shared tests, Electron PDF smoke test and mobile bundles.
- `desktop-release.yml`: requires a new version; builds/releases Windows, Linux and macOS.
- `mobile-release.yml`: EAS builds with optional store submission; requires `EXPO_TOKEN` and configured store credentials.
- `cloud-deploy.yml`: optional private-repository dispatch; configure `CLOUD_REPO_TOKEN` or run private workflows directly.

Desktop signing secrets: `WINDOWS_CSC_LINK`, `WINDOWS_CSC_KEY_PASSWORD`, `MACOS_CSC_LINK`, `MACOS_CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`. Test signed artifacts before updating advertised downloads.

## Release Evidence

Production workflows now fail closed on `release-evidence.json`. Development `npm start`, lint/export and EAS preview builds remain available. The evidence is a reviewer attestation, not automatic proof of compliance or signing. Set checks only after recording real results; update `sourceTrees` using `git rev-parse HEAD:DueFlux_app_desktop/Windows` and `git rev-parse HEAD:DueFlux_app_mobile/expo`. Application code changes invalidate the attestation. Verify each generated artifact's signature afterward.

All evidence flags intentionally remain false. Windows and Android devices are available to the owner, but interactive acceptance has not yet been performed. Linux/macOS/iOS do not have physical-device evidence. Repository secret names currently do not include Windows/macOS certificates or `EXPO_TOKEN`; store/signing readiness must not be inferred from successful JS exports.

1. Windows and Android: install the actual candidate, sign in, lock/unlock, restart offline, search cache, queue an edit, reconnect and verify exactly one receipt. Test lock/cancellation and disk-full recovery without deleting queued records.
2. Gmail and student Outlook: test consent, first import, incremental import, revoked access and reconnection on the appropriate plan. Student tenants may require administrator approval; do not work around the institution's policy. https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/user-admin-consent-overview
3. With test invoices and explicit service-budget approval: test forwarding, SMS ownership, checkout/entitlement, reports and update installation. Register Android push in a development/release build, then verify foreground/background/closed-app behavior and notification permissions. A bundle export or Expo Go is not this test.
4. Use two independent users for Home responsibilities and Business operator approval. Revoke/downgrade during an operation, edit an invoice after approval is requested, and verify that stale operations fail without partial writes.
5. Review all twelve languages with native speakers. Use Narrator/NVDA and Android TalkBack, keyboard-only navigation, large text, RTL and contrast checks. Automated key/layout checks do not establish WCAG conformance.
6. Complete a cloud backup restoration drill in an isolated project, including receipt continuity, attachments, membership grants and private verification state; record recovery times. No live restore is performed by these scripts.

## Operational Follow-up

- Rotate credentials previously exposed in chat or public files; remove obsolete admin/backend folders from existing public hosting. New staging and Apache deny rules prevent their publication/access.
- Older profiles can retain obsolete public OTP fields until the next verification operation clears them; new challenges are private.
- New application-owned local records are encrypted. Existing legacy Firestore databases still require the migration review above. Lost passwords, invalidated mobile biometric keys or uninstalling the secure keystore can make unsynced data unrecoverable; do not recreate keys over encrypted records. Server receipts are retained for late-retry idempotency; deletion/retention must include them.
- Private operational instructions for delivery limits, monitoring and restore evidence are in `DueFlux_website/.cloud/APP_OPERATIONS.md`. Failure records alone are not external alerts; configure notification channels, provider billing alerts and recovery ownership before launch.
- The mail scheduler scans linked accounts globally, and invoice intelligence reads a bounded invoice set. Larger deployments need scheduling, pagination and load testing.
- Upstream dependency advisories remain. The last audit found no desktop/backend high or critical advisories; Expo dependency chains still report high advisories for `braces` and `node-forge` without compatible published fixes. Avoid `npm audit fix --force`, which proposes framework downgrades; recheck before release.
- FastReport Open Source provides implemented PDF/HTML without a paid license. Commercial Office exports/designer require a separate edition/license. https://github.com/FastReports/FastReport
