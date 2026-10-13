const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const checks = ['backendDeployed', 'legacyCacheReconciled', 'providerFlows', 'restoreDrill',
  'accessibilityReview', 'languageReview', 'dependencyReview'];
function validate(evidence, requested, sourceTrees) {
  const problems = [];
  if (evidence.schema !== 1 || !requested.length) problems.push('Invalid evidence schema or platform');
  for (const name of checks) if (evidence.checks?.[name] !== true) problems.push(name);
  for (const platform of requested) {
    if (!['windows', 'linux', 'macos', 'android', 'ios'].includes(platform)) { problems.push('Unknown platform'); continue; }
    for (const check of ['deviceTest', 'signingReviewed']) if (evidence.platforms?.[platform]?.[check] !== true) problems.push(`${platform}.${check}`);
    const family = ['android', 'ios'].includes(platform) ? 'mobile' : 'desktop';
    if (!sourceTrees[family] || evidence.sourceTrees?.[family] !== sourceTrees[family]) problems.push(`${family}.sourceTree`);
  }
  return [...new Set(problems)];
}
if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const requested = String(process.argv[2] || '').split(',').filter(Boolean);
  const evidence = JSON.parse(fs.readFileSync(path.join(root, 'release-evidence.json'), 'utf8'));
  const sourceTrees = Object.fromEntries(Object.entries({ desktop: 'DueFlux_app_desktop/Windows', mobile: 'DueFlux_app_mobile/expo' })
    .map(([family, directory]) => [family, execFileSync('git', ['rev-parse', `HEAD:${directory}`], { cwd: root, encoding: 'utf8' }).trim()]));
  const problems = validate(evidence, requested, sourceTrees);
  if (problems.length) { console.error('Public release blocked: ' + problems.join(', ')); process.exitCode = 1; }
  else console.log('Release evidence matches the requested source trees. Artifact signatures still require verification after building.');
}
module.exports = { validate };
