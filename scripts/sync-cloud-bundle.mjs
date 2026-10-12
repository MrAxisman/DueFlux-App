import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const destination = path.join(root, 'DueFlux_website', '.cloud');
const files = ['index.js', 'product-intelligence.js', 'verification-store.js', 'offline-mutations.js',
  'notification-locales.js', 'report-payload.js', 'test-report-payload.js', 'package.json', 'package-lock.json', 'test-security.js'];
await fs.mkdir(path.join(destination, 'functions'), { recursive: true });
for (const name of files) await fs.copyFile(path.join(root, 'functions', name), path.join(destination, 'functions', name));
for (const name of ['firestore.rules', 'firestore.indexes.json', 'firebase.test.json']) await fs.copyFile(path.join(root, name), path.join(destination, name));
const config = JSON.parse(await fs.readFile(path.join(root, 'firebase.json'), 'utf8'));
// Hostinger publishes the website separately. This bundle deploys only Firebase services.
delete config.hosting;
await fs.writeFile(path.join(destination, 'firebase.json'), JSON.stringify(config, null, 2) + '\n');
console.log('Private Firebase deployment bundle updated. No credentials copied.');
