const test = require('node:test');
const assert = require('node:assert/strict');
const { validate } = require('./check-release-evidence.cjs');
test('unverified devices and operations cannot be released publicly', () => {
  const evidence = require('../release-evidence.json');
  assert(validate(evidence, ['windows'], { desktop: 'tree' }).includes('windows.deviceTest'));
  assert(validate(evidence, ['android', 'ios'], { mobile: 'tree' }).includes('ios.deviceTest'));
});
test('changing application code invalidates prior release evidence', () => {
  const evidence = JSON.parse(JSON.stringify(require('../release-evidence.json')));
  Object.keys(evidence.checks).forEach(key => { evidence.checks[key] = true; });
  evidence.platforms.windows = { deviceTest: true, signingReviewed: true };
  evidence.sourceTrees.desktop = 'reviewed-tree';
  assert.deepEqual(validate(evidence, ['windows'], { desktop: 'reviewed-tree' }), []);
  assert(validate(evidence, ['windows'], { desktop: 'changed-tree' }).includes('desktop.sourceTree'));
});
