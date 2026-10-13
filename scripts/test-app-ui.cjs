const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const renderer = path.resolve(__dirname, '../DueFlux_app_desktop/Windows/renderer');
const languages = ['ro', 'hu', 'de', 'fr', 'en', 'it', 'tr', 'zh', 'ar', 'ru', 'es', 'ja'];
const packs = require('../DueFlux_app_mobile/expo/featureLocales');
const firebaseStub = `(() => {
  const fail = () => { throw new Error('Cloud access forbidden in UI tests'); };
  const auth = { currentUser: null, setPersistence: () => Promise.resolve(), onAuthStateChanged: () => () => {}, signOut: fail };
  const db = { enablePersistence: () => Promise.resolve(), collection: fail };
  const authFactory = () => auth;
  authFactory.Auth = { Persistence: { LOCAL: 'local', NONE: 'none' } };
  const records = {};
  window.DueFluxVault = { status: async () => ({ available: true, configured: false }),
    unlock: async () => records, get: async key => records[key] ?? null,
    put: async (key, value) => { records[key] = value; }, lock: async () => {}, onLock: () => {} };
  window.firebase = { initializeApp: () => ({}), auth: authFactory, firestore: () => db,
    app: () => ({ functions: () => ({ httpsCallable: fail }) }) };
})();`;

(async () => {
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      const file = path.resolve(renderer, '.' + (pathname === '/' ? '/index.html' : pathname));
      assert(file.startsWith(renderer + path.sep));
      res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' })[path.extname(file)] || 'application/octet-stream');
      res.end(await fs.readFile(file));
    } catch (_) { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  let checks = 0;
  try {
    browser = await chromium.launch({ channel: process.env.DUEFLUX_BROWSER_CHANNEL || undefined });
    for (const lang of languages) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 850 }, reducedMotion: 'reduce' });
      await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.fallback() : route.abort());
      await context.route('https://www.gstatic.com/firebasejs/**', route => route.fulfill({ contentType: 'text/javascript',
        body: route.request().url().includes('firebase-app-compat') ? firebaseStub : '' }));
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base);
      await page.waitForFunction(() => typeof showAppScreen === 'function');
      await page.locator('#local-password').fill('test-only-password');
      await page.locator('#local-password-confirm').fill('test-only-password');
      await page.locator('#local-unlock-button').click();
      await page.waitForFunction(() => !DueFluxLocalStore.isLocked());
      // Unlock completes before asynchronous preference/handler initialization.
      await page.waitForFunction(() => document.documentElement.dataset.appReady === 'true');
      await page.evaluate(lang => {
        clearTimeout(splashTransitionTimer); splashTransitioned = true; forceLoginOnLaunch = false;
        planFromClaims = 'basic';
        auth.currentUser = { uid: 'ui-test', email: 'sample@example.invalid', emailVerified: true };
        currentUser = { ...auth.currentUser, displayName: 'Sample', plan: 'basic' };
        mailAccounts = { gmail: { connected: true, email: 'sample@example.invalid' } };
        invoices = [{ id: 'safe-id', company: '<img src="/injected.png">Energie România', category: '<b>Utilities</b>',
          number: '<a href="https://evil.invalid">DF-42</a>', amount: 120, currency: 'RON', issueDate: new Date(), recurring: true }];
        invoicesById = new Map(invoices.map(item => [item.id, item]));
        invoiceMonthCursor = new Date(); markInvoicesChanged();
        setActiveWorkspaceSpace('home', false); setLanguage(lang, false);
        showAppScreen(); renderInvoiceTable(); refreshDeviceSyncUi();
      }, lang);
      await page.waitForFunction(() => document.querySelector('#tbl-invoices td'));
      assert.equal(await page.locator('#tbl-invoices img, #tbl-invoices b, #tbl-invoices a').count(), 0, 'Imported text must not become HTML'); checks++;
      assert.match(await page.locator('#tbl-invoices').textContent(), /<img/); checks++;
      assert.equal(await page.locator('html').getAttribute('dir'), lang === 'ar' ? 'rtl' : 'ltr'); checks++;
      assert.equal(await page.locator('#device-sync-title').textContent(), packs[lang].sync_device_title); checks++;
      assert.equal(await page.locator('#device-sync-retry').isVisible(), false, 'No retry button without pending changes'); checks++;
      const beforeSearch = await page.locator('#tbl-invoices').textContent();
      await page.locator('#invoice-search').fill('does-not-exist');
      try { await page.waitForFunction(expected => document.querySelector('#tbl-invoices').textContent.includes(expected), packs[lang].search_empty); }
      catch (error) {
        console.error('Search initialization diagnostics', await page.evaluate(() => ({ language: currentLang, query: invoiceSearchQuery,
          ready: document.documentElement.dataset.appReady, rowCount: document.querySelectorAll('#tbl-invoices tr').length })), errors);
        throw error;
      }
      assert.notEqual(await page.locator('#tbl-invoices').textContent(), beforeSearch); checks++;
      await page.locator('#invoice-search').fill('');
      await page.locator('#btn-settings').click();
      await page.getByRole('dialog', { name: /./ }).waitFor();
      assert.equal(await page.locator('#settings-close').getAttribute('aria-label'), packs[lang].modal_close); checks++;
      assert.equal(await page.evaluate(() => document.activeElement.closest('#settings-backdrop') !== null), true); checks++;
      await page.evaluate(() => openReportsModal());
      await page.locator('#reports-backdrop:not(.hidden)').waitFor();
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.evaluate(() => document.activeElement.closest('#reports-backdrop') !== null), true); checks++;
      await page.keyboard.press('Escape');
      await page.locator('#reports-backdrop.hidden').waitFor({ state: 'attached' });
      assert.equal(await page.locator('#settings-backdrop').isVisible(), true, 'Escape must close only the top dialog'); checks++;
      await page.keyboard.press('Escape');
      await page.locator('#settings-backdrop.hidden').waitFor({ state: 'attached' });
      assert.equal(await page.evaluate(() => document.activeElement.id), 'btn-settings'); checks++;
      for (const theme of ['dark', 'light']) {
        await page.evaluate(theme => setThemeMode(theme, false), theme);
        const contrasts = await page.evaluate(() => {
          const luminance = rgb => {
            const values = rgb.match(/[\d.]+/g).slice(0, 3).map(value => Number(value) / 255)
              .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
            return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
          };
          return ['paid', 'unpaid', 'overdue'].map(status => {
            const element = document.createElement('span');
            element.className = `status-badge status-${status}`;
            element.style.position = 'absolute'; element.style.top = '-9999px';
            document.body.append(element);
            const styles = getComputedStyle(element);
            const text = luminance(styles.color), background = luminance(styles.backgroundColor);
            const ratio = (Math.max(text, background) + .05) / (Math.min(text, background) + .05);
            element.remove();
            return { status, ratio };
          });
        });
        for (const { status, ratio } of contrasts) {
          assert(ratio >= 4.5, `Low status contrast ${lang}/${theme}/${status}: ${ratio}`); checks++;
        }
        for (const width of [390, 768, 1440]) {
          await page.setViewportSize({ width, height: 850 });
          await page.evaluate(() => { document.querySelector('.app-main').scrollTop = 0; });
          // CDP resizing is asynchronous; compare boxes only after the responsive layout settles.
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          const box = await page.locator('.app-hero').boundingBox();
          const header = await page.locator('.app-header').boundingBox();
          const metric = await page.locator('.hero-metric').last().boundingBox();
          assert(box && box.x >= 0 && box.x + box.width <= width + 1, `Hero overflow ${lang}/${theme}/${width}`); checks++;
          assert(header.y + header.height + 12 <= box.y, `Header covers hero ${lang}/${theme}/${width}`); checks++;
          assert(metric.y + metric.height <= box.y + box.height - 12,
            `Metric clips hero ${lang}/${theme}/${width}: ${JSON.stringify({ box, metric })}`); checks++;
          assert.equal(await page.locator('.app-main').evaluate(main => main.scrollWidth <= main.clientWidth + 1), true,
            `Dashboard horizontal overflow ${lang}/${theme}/${width}`); checks++;
          if (process.env.DUEFLUX_UI_SCREENSHOTS && lang === 'ro' && width !== 768) {
            await fs.mkdir(process.env.DUEFLUX_UI_SCREENSHOTS, { recursive: true });
            await page.screenshot({ path: path.join(process.env.DUEFLUX_UI_SCREENSHOTS, `dashboard-${theme}-${width}.png`) });
          }
          await page.evaluate(() => openSettings());
          const panel = await page.locator('.settings-panel').boundingBox();
          assert(panel && panel.height <= 850 && panel.width <= width + 1, `Settings overflow ${lang}/${theme}/${width}`); checks++;
          const close = await page.locator('#settings-close').boundingBox();
          assert(close.height >= 44 && close.width >= 44, `Settings touch target ${lang}/${theme}/${width}`); checks++;
          if (process.env.DUEFLUX_UI_SCREENSHOTS && lang === 'ro' && width === 1440) {
            await page.screenshot({ path: path.join(process.env.DUEFLUX_UI_SCREENSHOTS, `settings-${theme}.png`) });
          }
          await page.keyboard.press('Escape');
        }
      }
      await page.evaluate(() => setThemeMode('light', false));
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'light'); checks++;
      await page.keyboard.press('Control+k');
      await page.locator('#trust-control-backdrop:not(.hidden)').waitFor();
      assert.equal(await page.locator('#trust-control-title').textContent(), packs[lang].invoice_search_label); checks++;
      assert.equal(await page.locator('#trust-control-content img').count(), 0); checks++;
      if (process.env.DUEFLUX_UI_SCREENSHOTS && lang === 'ro') {
        await page.screenshot({ path: path.join(process.env.DUEFLUX_UI_SCREENSHOTS, 'search-light.png') });
      }
      await page.keyboard.press('Escape');
      if (lang === 'en') {
        await page.evaluate(() => {
          window.__trustCalls = [];
          callFunctionWithAuth = async (_, payload) => {
            window.__trustCalls.push(payload);
            const invoice = { id: 'safe-id', company: '<img>Fixture utility', amount: 120, currency: 'RON', status: 'unpaid', revision: 'reviewed-revision' };
            if (payload.action === 'listWorkspaces') return { workspaces: [{ ownerUid: auth.currentUser.uid, space: 'home', name: 'Home' }] };
            if (payload.action === 'workspace') return { role: 'owner', ownerUid: auth.currentUser.uid, space: 'home', invoices: [invoice], members: [], approvals: [], audit: [] };
            if (payload.action === 'syncStatus') return { receipts: [] };
            if (payload.action === 'listReminders') return { reminders: [{ id: 'reminder', company: 'Utility', status: 'sent', remindAt: '2026-10-13T14:00:00Z' }] };
            return { ok: true };
          };
          DueFluxTrustControls.open('search');
        });
        await page.locator('#trust-control-content .trust-field input').nth(0).fill('energie');
        await page.locator('#trust-control-content .trust-field input').nth(1).fill('Utilities');
        await page.getByRole('button', { name: packs.en.save_filter, exact: true }).click();
        await page.getByRole('button', { name: 'Utilities', exact: true }).waitFor();
        assert.equal(await page.evaluate(() => JSON.parse(DueFluxLocalStore.getItem('df_saved_filters'))['ui-test'][0].query), 'energie'); checks++;
        await page.locator('#trust-control-content select').selectOption('compact');
        assert.equal(await page.evaluate(() => document.body.classList.contains('df-density-compact')), true); checks++;
        await page.locator('#trust-control-content select').selectOption('comfortable');
        await page.keyboard.press('Escape');
        await page.evaluate(() => DueFluxTrustControls.open('collaboration'));
        await page.locator('.trust-selection').waitFor();
        assert.deepEqual(await page.locator('#trust-control-content select').nth(1).locator('option').evaluateAll(nodes => nodes.map(node => node.value)), ['member']); checks++;
        assert.equal(await page.locator('#trust-control-content img').count(), 0); checks++;
        await page.locator('.trust-selection input').check();
        page.once('dialog', dialog => dialog.dismiss());
        await page.getByRole('button', { name: packs.en.bulk_paid }).click();
        assert.equal(await page.evaluate(() => window.__trustCalls.some(call => call.action === 'bulkPayment')), false, 'Cancelling bulk confirmation cannot dispatch payment'); checks++;
        await page.keyboard.press('Escape');
        await page.evaluate(() => DueFluxTrustControls.open('reminders'));
        await page.waitForFunction(() => document.querySelector('#trust-control-content').textContent.includes('Sent'));
        assert(!await page.locator('#trust-control-content').textContent().then(text => text.includes('Delivered')), 'Provider acceptance is not proof of delivery'); checks++;
        await page.keyboard.press('Escape');
        await page.evaluate(async () => {
          Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
          setOnlineState(false);
          await offlineQueueEngine.edit(currentUser.uid, queue => queue.concat({ type: 'addInvoice', localId: 'pending-invoice',
            data: { company: 'Local utility', amount: 23, recurring: true, issueDate: new Date().toISOString() } }));
          replaceInvoicesFromSnapshot({ forEach: callback => callback({ id: 'cloud-invoice', data: () => ({ company: 'Cloud utility', amount: 10, recurring: true, issueDate: new Date() }) }) });
          renderInvoiceTable();
        });
        assert.equal(await page.locator('#tbl-invoices tr').count(), 2, 'Snapshot must retain queued additions'); checks++;
        assert.equal(await page.locator('#device-sync-retry').isDisabled(), true, 'Retry requires internet'); checks++;
        assert.equal(await page.locator('#device-sync-status').textContent(), packs.en.sync_pending.replace('{{count}}', '1')); checks++;
        await page.evaluate(async () => {
          openInvoiceModal();
          document.getElementById('inv-company').value = 'Not saved';
          document.getElementById('inv-amount').value = '20';
          const original = DueFluxVault.put;
          DueFluxVault.put = async function (key, value) {
            if (key === getOfflineQueueKey(currentUser.uid)) throw new Error('Storage is full');
            return original(key, value);
          };
          try { await saveInvoiceFromModal(); } finally { DueFluxVault.put = original; }
        });
        assert.equal(await page.locator('#modal-backdrop').isVisible(), true, 'Failed offline save must keep the editor open'); checks++;
        assert.equal(await page.evaluate(() => getOfflineQueue(currentUser.uid).length), 1, 'Failed write must not pretend to persist'); checks++;
        assert.equal(await page.locator('#tbl-invoices tr').count(), 2, 'Failed save cannot add an optimistic row'); checks++;
        await page.keyboard.press('Escape');
        await page.evaluate(async () => {
          Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
          const key = getOfflineQueueKey(currentUser.uid);
          const saved = DueFluxLocalStore.getItem(key);
          await DueFluxLocalStore.setItem(key, '{broken');
          await flushOfflineQueue();
          await DueFluxLocalStore.setItem(key, saved);
          const original = callFunctionWithAuth;
          callFunctionWithAuth = async () => ({ ok: true });
          try { await flushOfflineQueue(); } finally { callFunctionWithAuth = original; }
        });
        assert.equal(await page.evaluate(() => getOfflineQueue(currentUser.uid).length), 0, 'A failed read must not latch sync forever'); checks++;
        assert.equal(await page.locator('#device-sync-status').textContent(), packs.en.sync_ready); checks++;
        const readonly = await page.evaluate(async () => {
          const uid = currentUser.uid;
          await DueFluxLocalStore.setItem('df_active_account', JSON.stringify({ uid, email: currentUser.email }));
          await DueFluxLocalStore.setItem(getOfflineCacheKey(uid), JSON.stringify({ profile: currentUser, invoices: serializeForOfflineCache(invoices) }));
          auth.currentUser = null; Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
          handleSignedOut(true);
          let rejected = false;
          try { await queueOfflineMutation({ type: 'deleteInvoice', id: 'cloud-invoice' }); } catch (_) { rejected = true; }
          return { readonly: localReadOnly, rejected, count: invoices.length };
        });
        assert.equal(readonly.readonly, true); checks++;
        assert.equal(readonly.rejected, true); checks++;
        assert(readonly.count > 0); checks++;
        await page.evaluate(() => DueFluxLocalStore.lock());
        assert.equal(await page.locator('#local-lock').isVisible(), true); checks++;
        assert.equal(await page.evaluate(() => invoices.length), 0, 'Lock clears displayed invoice state'); checks++;
        assert.equal(await page.evaluate(() => document.getElementById('app-screen').inert), true); checks++;
      }
      if (process.env.DUEFLUX_UI_SCREENSHOTS && lang === 'ro') {
        await fs.mkdir(process.env.DUEFLUX_UI_SCREENSHOTS, { recursive: true });
        await page.evaluate(() => { document.querySelector('.app-main').scrollTop = 0; });
        await page.screenshot({ path: path.join(process.env.DUEFLUX_UI_SCREENSHOTS, 'dashboard-light.png'), fullPage: true });
      }
      assert.deepEqual(errors, [], `Renderer errors (${lang})`); checks++;
      await context.close();
    }
    console.log(`Application UI: ${checks} assertions across 12 languages, 3 widths, themes, keyboard dialogs and untrusted invoice text passed.`);
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
