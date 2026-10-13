(function (root) {
  let options, mode = 'sync', state = {}, invoiceId = '', reviewOwnerUid = '', sessionUid = '', busy = false, version = 0;
  const tabs = { sync: 'sync_center', reminders: 'action_reminder', collaboration: 'collaboration', review: 'review_document', search: 'invoice_search_label' };
  const translate = key => options.t(key);
  function node(tag, text, className) {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = String(text);
    if (className) element.className = className;
    return element;
  }
  const host = () => document.getElementById('trust-control-content');
  const button = (key, callback) => {
    const element = node('button', translate(key), 'ghost-btn small');
    element.type = 'button'; element.disabled = busy;
    element.addEventListener('click', () => { void run(callback); });
    return element;
  };
  function field(key, value = '', type = 'text') {
    const label = node('label', undefined, 'trust-field');
    const input = document.createElement('input'); input.type = type; input.value = value;
    label.append(node('span', translate(key)), input); host().append(label);
    return input;
  }
  function select(key, items, value) {
    const label = node('label', undefined, 'trust-field'); label.append(node('span', translate(key)));
    const input = document.createElement('select');
    items.forEach(item => { const option = node('option', item.label); option.value = item.value; input.append(option); });
    if (value !== undefined) input.value = value;
    label.append(input); host().append(label); return input;
  }
  async function call(data) {
    const uid = options.uid();
    if (!uid || uid !== sessionUid || !navigator.onLine || DueFluxLocalStore.isLocked()) throw new Error('unavailable');
    const result = await options.call(data);
    if (options.uid() !== uid || DueFluxLocalStore.isLocked()) throw new Error('Account changed');
    return result;
  }
  async function run(callback) {
    if (busy) return;
    if (options.uid() !== sessionUid) { close(); return; }
    busy = true;
    host().querySelectorAll('button').forEach(element => { element.disabled = true; });
    try { await callback(); if (!DueFluxLocalStore.isLocked()) document.getElementById('trust-control-status').textContent = ''; }
    catch (_) { if (!DueFluxLocalStore.isLocked()) document.getElementById('trust-control-status').textContent = translate(navigator.onLine ? 'invoice_save_error' : 'offline_required'); }
    finally { busy = false; host().querySelectorAll('button').forEach(element => { element.disabled = false; }); }
  }
  async function load() {
    const current = ++version;
    let result = {};
    if (mode === 'sync') {
      result.queue = options.queue();
      if (navigator.onLine) result.receipts = (await call({ action: 'syncStatus' })).receipts;
    } else if (mode === 'reminders') result = await call({ action: 'listReminders' });
    else if (mode === 'collaboration') {
      result.workspaces = (await call({ action: 'listWorkspaces' })).workspaces;
      result.workspace = await call({ action: 'workspace', ownerUid: state.ownerUid || options.uid() });
    } else if (mode === 'review') {
      result = await call({ action: 'invoicePreview', ownerUid: reviewOwnerUid, invoiceId });
      result.records = (await call({ action: 'workspace', ownerUid: reviewOwnerUid })).invoices;
    } else if (mode === 'search') {
      const all = JSON.parse(DueFluxLocalStore.getItem('df_saved_filters') || '{}');
      result.filters = all[options.uid()] || [];
    }
    if (current !== version || DueFluxLocalStore.isLocked()) return;
    state = { ...state, ...result }; render();
  }
  function render() {
    host().replaceChildren(); document.getElementById('trust-control-title').textContent = translate(tabs[mode]);
    if (mode === 'sync') {
      for (const mutation of state.queue || []) {
        const article = node('article', undefined, 'trust-record');
        const title = ({ addInvoice: 'invoices_add', updateInvoice: 'invoice_save', deleteInvoice: 'table_actions_delete' })[mutation.type];
        article.append(node('strong', `${translate(title)} · ${mutation.id || mutation.localId}`), node('p', mutation.lastError ? translate('sync_problem') : translate('offline_saved')));
        article.append(button('review_document', async () => {
          const target = mutation.id || mutation.localId;
          const preview = (await call({ action: 'conflictPreview', invoiceId: target })).invoice;
          const reviewIds = options.queue().filter(item => (item.id || item.localId) === target).map(item => item.operationId);
          article.append(node('pre', JSON.stringify({ [translate('keep_cloud')]: preview, [translate('keep_local')]: mutation.data || mutation.type }, null, 2), 'trust-comparison'));
          ['cloud', 'local'].forEach(choice => article.append(button(choice === 'cloud' ? 'keep_cloud' : 'keep_local', async () => {
            const reviewed = options.queue().filter(item => reviewIds.includes(item.operationId));
            for (const operation of choice === 'cloud' ? reviewed : [mutation]) {
              const latest = (await call({ action: 'conflictPreview', invoiceId: target })).invoice;
              if (operation.operationId === mutation.operationId && latest?.revision !== preview?.revision) throw new Error('Conflict changed');
              await call({ action: 'resolveConflict', mutation: operation, choice, revision: latest?.revision || '' });
            }
            await options.edit(queue => queue.filter(item => !(choice === 'cloud' ? reviewIds : [mutation.operationId]).includes(item.operationId))
              .map(item => choice === 'cloud' && reviewIds.includes(item.dependsOn) ? { ...item, dependsOn: mutation.operationId } : item));
            await options.refreshInvoice(target); await load();
          })));
        }));
        host().append(article);
      }
      for (const receipt of state.receipts || []) host().append(node('p', `${translate('sync_ready')} · ${receipt.invoiceId} · ${receipt.at || ''}`, 'small muted'));
      host().append(button('sync_retry', async () => { await options.sync(); await load(); }));
    } else if (mode === 'reminders') {
      const invoices = options.invoices();
      const selected = select('invoice_company', invoices.map(invoice => ({ value: invoice.id, label: invoice.company || invoice.id })), invoiceId);
      const localDate = new Date(Date.now() + 3600000); localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
      const when = field('reminder_label', localDate.toISOString().slice(0, 16), 'datetime-local');
      const channel = select('action_reminder', [{ value: 'email', label: translate('login_email') }, { value: 'sms', label: 'SMS' }, { value: 'in_app', label: 'DueFlux' }], 'in_app');
      const start = field('quiet_start', '22:00', 'time'); const end = field('quiet_end', '08:00', 'time');
      host().append(button('reminder_save', async () => {
        await call({ action: 'createReminder', invoiceId: selected.value, remindAt: new Date(when.value).toISOString(), channel: channel.value,
          quietStart: start.value, quietEnd: end.value, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }); await load();
      }));
      for (const reminder of state.reminders || []) {
        const article = node('article', undefined, 'trust-record');
        article.append(node('strong', `${reminder.company || reminder.invoiceId} · ${translate('delivery_' + reminder.status)}`), node('p', reminder.remindAt || ''));
        article.append(button('snooze', async () => { await call({ action: 'snoozeReminder', reminderId: reminder.id, remindAt: new Date(Date.now() + 900000).toISOString() }); await load(); }));
        article.append(button('confirm_cancel', async () => { await call({ action: 'cancelReminder', reminderId: reminder.id }); await load(); }));
        host().append(article);
      }
    } else if (mode === 'collaboration') {
      const workspace = state.workspace;
      if (!workspace) return;
      const selected = select('collaboration', state.workspaces.map(item => ({ value: item.ownerUid, label: `${translate('space_' + item.space)} · ${item.name || item.ownerUid}` })), workspace.ownerUid);
      selected.addEventListener('change', () => { state.ownerUid = selected.value; void run(load); });
      const code = field('accept_invite');
      host().append(button('accept_invite', async () => { await call({ action: 'acceptInvite', code: code.value.trim() }); await load(); }));
      if (['owner', 'admin'].includes(workspace.role)) {
        const email = field('login_email', '', 'email');
        const role = select('collaboration', (workspace.space === 'home' ? ['member'] : ['admin', 'operator', 'accountant', 'viewer']).map(value => ({ value, label: translate('role_' + value) })));
        host().append(button('invite_member', async () => {
          const result = await call({ action: 'invite', ownerUid: workspace.ownerUid, email: email.value, role: role.value });
          host().append(node('code', result.code, 'trust-comparison'));
        }));
        const selectedItems = [];
        const selectionCount = node('span', '0 / 25', 'small muted'); host().append(selectionCount);
        host().append(button('bulk_paid', async () => {
          if (!selectedItems.length || !root.confirm(translate('bulk_paid') + ' (' + selectedItems.length + ')')) return;
          await call({ action: 'bulkPayment', ownerUid: workspace.ownerUid, items: selectedItems });
          if (workspace.ownerUid === options.uid()) for (const item of selectedItems) await options.refreshInvoice(item.id);
          await load();
        }));
        state.selection = { items: selectedItems, counter: selectionCount };
      }
      for (const member of workspace.members || []) {
        const article = node('article', undefined, 'trust-record'); article.append(node('strong', `${member.name || member.email || member.uid} · ${translate('role_' + member.role)}`));
        if (['owner', 'admin'].includes(workspace.role)) article.append(button('table_actions_delete', async () => { await call({ action: 'revokeMember', ownerUid: workspace.ownerUid, memberUid: member.uid }); await load(); }));
        host().append(article);
      }
      for (const invoice of workspace.invoices || []) {
        const article = node('article', undefined, 'trust-record'); article.append(node('strong', `${invoice.company || invoice.id} · ${invoice.amount || 0} ${invoice.currency || ''}`));
        if (['owner', 'admin'].includes(workspace.role) && !invoice.duplicateOf && invoice.status !== 'paid') {
          const label = node('label', undefined, 'trust-selection');
          const check = document.createElement('input'); check.type = 'checkbox';
          label.append(check, node('span', translate('select_invoice') + ' · ' + (invoice.company || invoice.id)));
          check.addEventListener('change', () => {
            const list = state.selection.items;
            if (check.checked && list.length >= 25) { check.checked = false; return; }
            if (check.checked) list.push({ id: invoice.id, revision: invoice.revision });
            else list.splice(list.findIndex(item => item.id === invoice.id), 1);
            state.selection.counter.textContent = list.length + ' / 25';
          }); article.append(label);
        }
        article.append(button('review_document', () => { open('review', invoice.id, workspace.ownerUid); }));
        if (['owner', 'admin', 'operator', 'member'].includes(workspace.role)) article.append(button('action_paid', async () => { await call({ action: 'requestPayment', ownerUid: workspace.ownerUid, invoiceId: invoice.id, revision: invoice.revision }); await load(); }));
        if (['owner', 'admin'].includes(workspace.role)) {
          const assignee = document.createElement('select'); assignee.setAttribute('aria-label', translate('collaboration'));
          [{ uid: workspace.ownerUid, name: translate('role_owner') }, ...(workspace.members || [])].forEach(member => {
            const option = node('option', member.name || member.email || member.uid); option.value = member.uid; assignee.append(option);
          });
          assignee.value = invoice.responsibleUid || workspace.ownerUid; article.append(assignee);
          article.append(button('invoice_save', async () => { await call({ action: 'assign', ownerUid: workspace.ownerUid, invoiceId: invoice.id, memberUid: assignee.value, revision: invoice.revision }); await load(); }));
        }
        host().append(article);
      }
      if (workspace.nextCursor) host().append(button('invoice_open', async () => {
        const next = await call({ action: 'workspace', ownerUid: workspace.ownerUid, cursor: workspace.nextCursor });
        state.workspace = { ...next, invoices: workspace.invoices.concat(next.invoices) }; render();
      }));
      if (['owner', 'admin'].includes(workspace.role)) for (const approval of workspace.approvals || []) {
        const article = node('article', undefined, 'trust-record');
        article.append(node('strong', `${approval.company || approval.invoiceId} · ${approval.amount} ${approval.currency}`),
          button('action_paid', async () => { await call({ action: 'approvePayment', ownerUid: workspace.ownerUid, approvalId: approval.id }); await load(); }));
        host().append(article);
      }
      for (const event of workspace.audit || []) host().append(node('p', `${translate(event.event.includes('payment') ? 'action_paid' : 'collaboration')} · ${event.actorUid || ''} · ${event.at || ''}`, 'small muted'));
    } else if (mode === 'review') {
      const invoice = state.invoice;
      if (!invoice) return;
      host().append(node('pre', JSON.stringify(invoice.extractionFields || {}, null, 2), 'trust-comparison'));
      host().append(node('p', invoice.emailPreview || '', 'trust-source'));
      const inputs = {};
      for (const [name, label] of [['company', 'invoice_company'], ['number', 'invoice_number'], ['amount', 'invoice_amount'], ['currency', 'invoice_currency'], ['dueDate', 'invoice_due_date']]) inputs[name] = field(label, name === 'dueDate' ? (invoice[name] || '').slice(0, 10) : invoice[name] ?? '', name === 'dueDate' ? 'date' : 'text');
      const duplicate = select('confirm_duplicate', [{ value: '', label: '—' }, ...(state.records || []).filter(item => item.id !== invoice.id).map(item => ({ value: item.id, label: item.company || item.id }))], invoice.duplicateOf || '');
      const editable = ['owner', 'admin', 'operator'].includes(state.role);
      Object.values(inputs).forEach(input => { input.disabled = !editable; }); duplicate.disabled = !editable;
      if (editable) host().append(button('correct_extraction', async () => {
        const patch = Object.fromEntries(Object.entries(inputs).map(([name, input]) => [name, name === 'amount' ? DueFluxRecordVersion.parseAmount(input.value) : input.value]));
        if (!patch.dueDate) patch.dueDate = null;
        patch.currency = patch.currency.trim().toUpperCase();
        await call({ action: 'reviewInvoice', ownerUid: reviewOwnerUid, invoiceId: invoice.id, revision: invoice.revision, patch, duplicateOf: duplicate.value || null });
        if (reviewOwnerUid === options.uid()) await options.refreshInvoice(invoice.id); await load();
      }));
      host().append(button('review_document', async () => {
        const document = await call({ action: 'sourceDocument', ownerUid: reviewOwnerUid, invoiceId: invoice.id });
        host().querySelectorAll('iframe').forEach(frame => frame.remove());
        const frame = node('iframe'); frame.src = document.url; frame.title = translate('review_document'); frame.setAttribute('sandbox', ''); frame.className = 'trust-document'; host().prepend(frame);
      }));
    } else if (mode === 'search') {
      const input = field('invoice_search_label');
      const filterName = field('save_filter');
      const filters = state.filters || [];
      for (const filter of filters) {
        const restore = button('save_filter', () => { input.value = filter.query; refresh(); });
        restore.textContent = filter.name; host().append(restore);
      }
      host().append(button('save_filter', async () => {
        const uid = options.uid(); if (!uid) return;
        const all = JSON.parse(DueFluxLocalStore.getItem('df_saved_filters') || '{}');
        const name = filterName.value.trim().slice(0, 80); if (!name) return;
        all[uid] = [...(all[uid] || []).filter(item => item.name !== name), { name, query: input.value.slice(0, 500) }].slice(-20);
        await DueFluxLocalStore.setItem('df_saved_filters', JSON.stringify(all)); await load();
      }));
      const density = select('density', ['comfortable', 'compact'].map(value => ({ value, label: translate(value) })), localStorage.getItem('df_density') || 'comfortable');
      density.addEventListener('change', () => { localStorage.setItem('df_density', density.value); document.body.classList.toggle('df-density-compact', density.value === 'compact'); });
      const results = node('div'); host().append(results);
      const refresh = () => {
        results.replaceChildren();
        options.invoices().filter(invoice => DueFluxOfflineQueue.matchesInvoice(invoice, input.value)).slice(0, 100).forEach(invoice => {
          const entry = button('invoice_open', () => { close(); options.openInvoice(invoice.id); });
          entry.textContent = `${invoice.company || invoice.id} · ${invoice.amount || 0} ${invoice.currency || ''}`; results.append(entry);
        });
      };
      input.addEventListener('input', refresh); refresh(); input.focus();
    }
  }
  function close() { version++; state = {}; host().replaceChildren(); document.getElementById('trust-control-backdrop').classList.add('hidden'); }
  function open(kind, id, ownerUid) {
    if (DueFluxLocalStore.isLocked()) return;
    sessionUid = options.uid(); mode = kind; invoiceId = id || ''; reviewOwnerUid = ownerUid || sessionUid; state = {}; document.getElementById('trust-control-backdrop').classList.remove('hidden'); render();
    void run(load);
  }
  function init(configuration) {
    options = configuration;
    document.body.classList.toggle('df-density-compact', localStorage.getItem('df_density') === 'compact');
    document.getElementById('trust-control-close').addEventListener('click', close);
    document.querySelectorAll('[data-trust-control]').forEach(element => element.addEventListener('click', () => open(element.dataset.trustControl, options.activeInvoice())));
    DueFluxLocalStore.subscribe(locked => { if (locked) close(); });
    document.addEventListener('keydown', event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); open('search'); } });
  }
  root.DueFluxTrustControls = { init, open, close, translate: render,
    isSyncOpen: () => mode === 'sync' && !document.getElementById('trust-control-backdrop').classList.contains('hidden') };
})(window);
