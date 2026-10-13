const { _electron } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');

(async () => {
  const cwd = path.resolve(__dirname, '../DueFlux_app_desktop/Windows');
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const application = await _electron.launch({ args: ['.', '--smoke-test'], cwd, env,
    executablePath: require(path.join(cwd, 'node_modules/electron')),
  });
  try {
    const page = await application.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => window.DueFlux?.printReportPdf);
    const result = await page.evaluate(() => window.DueFlux.printReportPdf(
      '<!doctype html><html><head><meta charset="utf-8"></head><body><h1>DueFlux</h1><p>Report saved offline.</p></body></html>'
    ));
    assert.equal(Buffer.from(result, 'base64').subarray(0, 5).toString(), '%PDF-');
    const protectedResult = await page.evaluate(async () => {
      const status = await DueFluxVault.status();
      if (!status.available) return { available: false };
      await DueFluxVault.unlock('test-only-local-password');
      await DueFluxVault.put('df_offline_queue_test', '[{"company":"Native encryption fixture"}]');
      const value = await DueFluxVault.get('df_offline_queue_test');
      await DueFluxVault.lock();
      let denied = false;
      try { await DueFluxVault.get('df_offline_queue_test'); } catch (_) { denied = true; }
      return { available: true, value, denied };
    });
    if (protectedResult.available) { assert.match(protectedResult.value, /Native encryption fixture/); assert(protectedResult.denied); }
    console.log('Electron launch, isolated preload and offline PDF export passed. Protected vault: ' +
      (protectedResult.available ? 'native keystore verified.' : 'secure provider unavailable; native encryption test skipped.'));
  } finally { await application.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
