const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const patterns = [/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/, /"private_key"\s*:/,
  /\bsk_(?:live|test)_[a-zA-Z0-9]{16,}/, /\bSG\.[a-zA-Z0-9_-]{16,}\.[a-zA-Z0-9_-]{16,}/,
  /(?:auth[_ ]?token)["']?\s*[:=]\s*["'][a-f0-9]{32}["']/i];
let failed = false;
for (const repo of [root, path.join(root, 'DueFlux_website')]) {
  if (!fs.existsSync(path.join(repo, '.git'))) continue;
  const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: repo }).toString().split('\0').filter(Boolean);
  for (const file of new Set(files)) {
    if (!/\.(?:json|js|cjs|mjs|ps1|html|yml|yaml|xml|txt|md|cs|config)$/.test(file) || file.endsWith('check-publication.cjs')) continue;
    const filename = path.join(repo, file);
    if (!fs.existsSync(filename) || fs.statSync(filename).isDirectory()) continue;
    if (patterns.some(pattern => pattern.test(fs.readFileSync(filename, 'utf8')))) {
      console.error('Credential pattern found in ' + path.relative(root, filename));
      failed = true;
    }
  }
}
if (failed) process.exitCode = 1;
else console.log('Publication scan passed for tracked and publishable files.');
