# Application UI

The desktop and native clients use the same semantic palette: navy/slate surfaces
in dark mode, warm white surfaces in light mode, teal actions, and separate
success, warning, and destructive states. Color is never the only status label.

## Sources

- `DueFlux_app_desktop/Windows/renderer/ui.css` is the presentation layer loaded
  after legacy styles. Its selectors deliberately override existing component
  rules; do not add another visual override block to `style.css`.
- `DueFlux_app_mobile/expo/uiStyles.js` contains native theme and component styles.
  `App.js` supplies window width, font scale, and the user's density preference.
- `scripts/sync-desktop.mjs` copies the canonical renderer to Linux. macOS builds
  use the same Windows source directory.

## Layout Rules

- The desktop header participates in layout. Only the content area scrolls, so
  changing language or window width cannot cover the first dashboard card.
- Use 20px surface corners and 12px control corners. Reserve pill shapes for
  statuses, counts, and small labels.
- Primary actions use one teal fill. Secondary actions use bordered surfaces;
  destructive actions have their own label and color.
- Native controls have a minimum 44px touch target, not a fixed height. Labels
  may wrap when text grows. Metrics stack on narrow screens or large text.
- Use logical margins and padding for RTL. Keep original invoice text intact.
- Respect reduced motion. Animation must not delay access to data or controls.
- Comfortable/compact density changes record spacing, not touch target sizes.

## Verification

`npm test` checks desktop/native palette parity, core text/status contrast,
native control dimensions, RTL edges, and density behavior. These checks inspect
style definitions; they are not a native rendering or accessibility certification.

`npm run test:ui` exercises the Electron renderer in a browser across 12 languages,
390/768/1440px widths, both themes, dialogs, keyboard navigation, imported text,
and offline behavior. It checks header/hero separation and clipped metrics.

For optional local screenshots in PowerShell:

```powershell
$env:DUEFLUX_BROWSER_CHANNEL = 'chrome'
$env:DUEFLUX_UI_SCREENSHOTS = '.tools/ui-preview'
npm run test:ui
```

Before release, also inspect the installed Windows and Android clients with long
company names, Arabic, large system text, keyboard open, and screen readers.
Physical iOS/macOS/Linux acceptance and installer signing remain separate gates
in `RELEASE_READINESS.md`; browser tests and Expo exports do not replace them.
