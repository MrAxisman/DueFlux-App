import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const destination = path.join(root, 'DueFlux_website', '.cloud');
const files = ['index.js', 'product-intelligence.js', 'verification-store.js', 'offline-mutations.js',
  'notification-locales.js', 'report-payload.js', 'test-report-payload.js', 'package.json', 'package-lock.json', 'test-security.js',
  'record-version.js', 'trust-controls.js', 'reminder-controls.js', 'reminder-policy.js', 'invoice-audit.js', 'test-trust-controls.js'];
await fs.mkdir(path.join(destination, 'functions'), { recursive: true });
for (const name of files) await fs.writeFile(path.join(destination, 'functions', name), (await fs.readFile(path.join(root, 'functions', name), 'utf8')).replace(/\r\n/g, '\n'));
for (const name of ['firestore.rules', 'firestore.indexes.json', 'firebase.test.json']) await fs.writeFile(path.join(destination, name), (await fs.readFile(path.join(root, name), 'utf8')).replace(/\r\n/g, '\n'));
const config = JSON.parse(await fs.readFile(path.join(root, 'firebase.json'), 'utf8'));
// Hostinger publishes the website separately. This bundle deploys only Firebase services.
delete config.hosting;
await fs.writeFile(path.join(destination, 'firebase.json'), JSON.stringify(config, null, 2) + '\n');
console.log('Private Firebase deployment bundle updated. No credentials copied.');
