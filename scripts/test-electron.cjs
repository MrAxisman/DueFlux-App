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
    console.log('Electron launch, isolated preload and offline PDF export passed.');
  } finally { await application.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
