const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const version = process.env.RELEASE_VERSION || '';
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Provide a semantic release version.');
if (['windows', 'macos'].includes(process.env.RELEASE_PLATFORM) && !process.env.CSC_LINK) {
  throw new Error('Public Windows/macOS builds require a signing certificate.');
}
const file = path.join(root, 'package.json');
const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
const next = version.split('.').map(Number);
const previous = pkg.version.split('.').map(Number);
const differing = next.findIndex((value, index) => value !== previous[index]);
if (differing < 0 || next[differing] < previous[differing]) throw new Error('Version must be newer than the current package.');
pkg.version = version;
fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
