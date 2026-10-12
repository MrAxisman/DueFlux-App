import fs from 'node:fs/promises';
import path from 'node:path';

// Release builds use Windows as the canonical cross-platform Electron source.
const root = path.resolve(import.meta.dirname, '..', 'DueFlux_app_desktop');
const files = ['main.js', 'preload.js', 'package.json', 'package-lock.json',
  'renderer/app.js', 'renderer/index.html', 'renderer/style.css',
  'renderer/feature-locales.js', 'renderer/product-intelligence.js', 'renderer/offline-queue.js',
  'scripts/notarize.js', 'scripts/prepare-release.js', 'scripts/start-electron.js'];
for (const file of files) {
  const destination = path.join(root, 'Linux', file);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(path.join(root, 'Windows', file), destination);
}
console.log('Linux source synchronized with canonical desktop source.');
