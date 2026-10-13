import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
const OfflineQueue = require('./offlineQueue');
const NativeNotifications = require('./nativeNotifications');
const RecordVersion = require('./recordVersion');
const ProtectedStorage = require('./protectedStorage');
const titles = {
  sync: 'sync_center',
  reminders: 'action_reminder',
  collaboration: 'collaboration',
  review: 'review_document',
  search: 'invoice_search_label'
};
const localDate = time => {
  const date = new Date(time);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};
function ActionButton({
  t,
  styles,
  labelKey,
  label,
  disabled,
  onPress
}) {
  return <TouchableOpacity accessibilityRole="button" disabled={disabled} style={[styles.ghostButton, { minHeight: 44, justifyContent: 'center' }, disabled ? styles.buttonDisabled : null]} onPress={onPress}>
    <Text style={styles.ghostButtonText}>{label || t(labelKey)}</Text>
  </TouchableOpacity>;
}
export default function TrustPanel(props) {
  const {
    mode,
    uid,
    invoiceId,
    invoices,
    t,
    styles,
    visible,
    close
  } = props;
  const [data, setData] = useState({});
  const [draft, setDraft] = useState(() => ({
    date: localDate(Date.now() + 3600000),
    channel: 'push',
    quietStart: '22:00',
    quietEnd: '08:00'
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [review, setReview] = useState(null);
  const [source, setSource] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const options = useRef(props);
  const active = useRef(false);
  const version = useRef(0);
  const workspaceOwner = useRef(uid);
  const selection = useRef(invoiceId);
  const bumpVersion = useCallback(() => ++version.current, []);
  useEffect(() => {
    options.current = props;
  }, [props]);
  const load = useCallback(async () => {
    const current = bumpVersion();
    const optionsNow = options.current;
    let result = {};
    if (optionsNow.mode === 'sync') {
      result.queue = await optionsNow.queue();
      try {
        result.receipts = (await optionsNow.call({
          action: 'syncStatus'
        })).receipts;
      } catch (_) {
        result.offline = true;
      }
    } else if (optionsNow.mode === 'reminders') result = await optionsNow.call({
      action: 'listReminders'
    });else if (optionsNow.mode === 'collaboration') {
      result.workspaces = (await optionsNow.call({
        action: 'listWorkspaces'
      })).workspaces;
      result.workspace = await optionsNow.call({
        action: 'workspace',
        ownerUid: workspaceOwner.current
      });
    } else if (optionsNow.mode === 'review') {
      result = await optionsNow.call({
        action: 'invoicePreview',
        invoiceId: optionsNow.invoiceId
      });
    } else if (optionsNow.mode === 'search') {
      result.filters = JSON.parse(await ProtectedStorage.getItem('df_saved_filters_' + optionsNow.uid) || '[]');
    }
    if (active.current && current === version.current) setData(result);
  }, [bumpVersion]);
  useEffect(() => {
    active.current = visible;
    workspaceOwner.current = uid;
    selection.current = invoiceId;
    if (visible) void Promise.resolve().then(load).catch(() => {
      if (active.current) setError(true);
    });
    return () => {
      active.current = false;
      bumpVersion();
    };
  }, [load, visible, mode, uid, invoiceId, bumpVersion]);
  async function run(operation) {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      await operation();
    } catch (_) {
      if (active.current) setError(true);
    } finally {
      if (active.current) setBusy(false);
    }
  }
  const set = (key, value) => setDraft(previous => ({
    ...previous,
    [key]: value
  }));
  const field = (key, name, initial = '', extra = {}) => <View style={{
    gap: 6
  }}>
      <Text style={styles.mutedText}>{t(key)}</Text>
      <TextInput accessibilityLabel={t(key)} style={styles.input} value={String(draft[name] ?? initial)} onChangeText={value => set(name, value)} editable={!busy} {...extra} />
    </View>;
  const choices = (items, name, selected) => <View style={{
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  }}>
      {items.map(item => <TouchableOpacity key={item.value} accessibilityRole="button" accessibilityState={{
      selected: (draft[name] ?? selected) === item.value
    }} style={styles.ghostButton} disabled={busy} onPress={() => set(name, item.value)}><Text style={styles.ghostButtonText}>{item.label}</Text></TouchableOpacity>)}
    </View>;
  async function resolve(choice) {
    const mutation = review.mutation;
    const target = mutation.id || mutation.localId;
    const items = await props.queue();
    const reviewed = items.filter(item => (item.id || item.localId) === target);
    const selected = choice === 'cloud' ? reviewed : [mutation];
    for (const operation of selected) {
      const cloud = (await props.call({
        action: 'conflictPreview',
        invoiceId: target
      })).invoice;
      if (operation.operationId === mutation.operationId && cloud?.revision !== review.invoice?.revision) throw new Error('Conflict changed');
      await props.call({
        action: 'resolveConflict',
        mutation: operation,
        choice,
        revision: cloud?.revision || ''
      });
    }
    const ids = selected.map(item => item.operationId);
    await props.edit(queue => queue.filter(item => !ids.includes(item.operationId)).map(item => choice === 'cloud' && ids.includes(item.dependsOn) ? {
      ...item,
      dependsOn: mutation.operationId
    } : item));
    await props.refreshInvoice(target);
    setReview(null);
    await load();
  }
  async function viewInvoice(invoice, ownerUid) {
    const result = await props.call({
      action: 'invoicePreview',
      ownerUid,
      invoiceId: invoice.id
    });
    selection.current = invoice.id;
    workspaceOwner.current = ownerUid;
    setSource(null);
    setDraft(previous => {
      const next = {
        ...previous
      };
      ['amount', 'dueDate', 'duplicateOf'].forEach(key => {
        delete next[key];
      });
      return next;
    });
    setData(previous => ({
      ...previous,
      invoice: result.invoice,
      role: result.role
    }));
  }
  const record = (key, content) => <View key={key} style={[styles.invoiceRow, {
    gap: 12
  }]}>{content}</View>;
  const currentInvoice = data.invoice;
  const reviewing = !!currentInvoice;
  return <Modal transparent visible={visible} animationType="slide" onRequestClose={close}>
      <Pressable style={styles.modalBackdrop} onPress={close}>
        <TouchableWithoutFeedback>
          <KeyboardAvoidingView accessibilityViewIsModal behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalPanel}>
            <View style={styles.modalHeader}>
              <Text accessibilityRole="header" style={styles.modalTitle}>{t(titles[mode])}</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('modal_close')} style={styles.modalClose} onPress={close}><Text style={styles.modalCloseText}>X</Text></TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" style={styles.modalScroll} contentContainerStyle={[styles.modalScrollContent, {
            gap: 16
          }]}>
              {error ? <Text accessibilityLiveRegion="polite" style={styles.mutedText}>{t('invoice_save_error')}</Text> : null}
              {mode === 'sync' ? <>
                {(data.queue || []).map(mutation => record(mutation.operationId, <>
                  <Text style={styles.invoiceCompany}>{mutation.id || mutation.localId}</Text>
                  <Text style={styles.mutedText}>{t(mutation.lastError ? 'sync_problem' : 'offline_saved')}</Text>
                  {<ActionButton t={t} styles={styles} labelKey={'review_document'} disabled={busy} onPress={() => void run(async () => {
                  const invoice = (await props.call({
                    action: 'conflictPreview',
                    invoiceId: mutation.id || mutation.localId
                  })).invoice;
                  setReview({
                    mutation,
                    invoice
                  });
                })} />}
                </>))}
                {review ? <>
                  <Text style={styles.sectionTitle}>{t('keep_cloud')}</Text><Text style={styles.mutedText}>{JSON.stringify(review.invoice, null, 2)}</Text>
                  <Text style={styles.sectionTitle}>{t('keep_local')}</Text><Text style={styles.mutedText}>{JSON.stringify(review.mutation.data || review.mutation.type, null, 2)}</Text>
                  {<ActionButton t={t} styles={styles} labelKey={'keep_cloud'} disabled={busy} onPress={() => void run(() => resolve('cloud'))} />}{<ActionButton t={t} styles={styles} labelKey={'keep_local'} disabled={busy} onPress={() => void run(() => resolve('local'))} />}
                </> : null}
                {(data.receipts || []).map(receipt => <Text key={receipt.operationId} style={styles.mutedText}>{t('sync_ready')} · {receipt.invoiceId} · {receipt.at}</Text>)}
                {<ActionButton t={t} styles={styles} labelKey={'sync_retry'} disabled={busy} onPress={() => void run(async () => {
                await props.sync();
                await load();
              })} />}
              </> : null}
              {mode === 'reminders' ? <>
                {<ActionButton t={t} styles={styles} labelKey={'action_reminder'} disabled={busy} onPress={() => void run(() => NativeNotifications.register(props.call))} label={'Push'} />}
                {choices(invoices.map(invoice => ({
                value: invoice.id,
                label: invoice.company || invoice.id
              })), 'invoice', invoiceId)}
                {field('reminder_label', 'date', draft.date)}
                {choices([{
                value: 'push',
                label: 'Push'
              }, {
                value: 'email',
                label: t('login_email')
              }, {
                value: 'sms',
                label: 'SMS'
              }, {
                value: 'in_app',
                label: 'DueFlux'
              }], 'channel', 'push')}
                {field('quiet_start', 'quietStart', '22:00')}{field('quiet_end', 'quietEnd', '08:00')}
                {<ActionButton t={t} styles={styles} labelKey={'reminder_save'} disabled={busy} onPress={() => void run(async () => {
                await props.call({
                  action: 'createReminder',
                  invoiceId: draft.invoice || invoiceId || invoices[0]?.id,
                  remindAt: new Date(draft.date).toISOString(),
                  channel: draft.channel,
                  quietStart: draft.quietStart,
                  quietEnd: draft.quietEnd,
                  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                });
                await load();
              })} />}
                {(data.reminders || []).map(reminder => record(reminder.id, <>
                  <Text style={styles.invoiceCompany}>{reminder.company || reminder.invoiceId}</Text>
                  <Text style={styles.mutedText}>{t('delivery_' + reminder.status)} · {reminder.remindAt}</Text>
                  {<ActionButton t={t} styles={styles} labelKey={'snooze'} disabled={busy} onPress={() => void run(async () => {
                  await props.call({
                    action: 'snoozeReminder',
                    reminderId: reminder.id,
                    remindAt: new Date(Date.now() + 900000).toISOString()
                  });
                  await load();
                })} />}
                  {<ActionButton t={t} styles={styles} labelKey={'confirm_cancel'} disabled={busy} onPress={() => void run(async () => {
                  await props.call({
                    action: 'cancelReminder',
                    reminderId: reminder.id
                  });
                  await load();
                })} />}
                </>))}
              </> : null}
              {mode === 'collaboration' && data.workspace ? <>
                {(data.workspaces || []).map(workspace => <View key={workspace.ownerUid}>{<ActionButton t={t} styles={styles} labelKey={'collaboration'} disabled={busy} onPress={() => void run(async () => {
                  setSelectedItems([]); workspaceOwner.current = workspace.ownerUid;
                  await load();
                })} label={workspace.name || `${t('space_' + workspace.space)} · ${workspace.ownerUid}`} />}</View>)}
                {field('accept_invite', 'code')}{<ActionButton t={t} styles={styles} labelKey={'accept_invite'} disabled={busy} onPress={() => void run(async () => {
                await props.call({
                  action: 'acceptInvite',
                  code: draft.code
                });
                await load();
              })} />}
                {['owner', 'admin'].includes(data.workspace.role) ? <>
                  {field('login_email', 'email', '', {
                  keyboardType: 'email-address',
                  autoCapitalize: 'none'
                })}
                  {choices((data.workspace.space === 'home' ? ['member'] : ['admin', 'operator', 'accountant', 'viewer']).map(value => ({
                  value,
                  label: t('role_' + value)
                })), 'role', data.workspace.space === 'home' ? 'member' : 'viewer')}
                  {<ActionButton t={t} styles={styles} labelKey={'invite_member'} disabled={busy} onPress={() => void run(async () => {
                  const result = await props.call({
                    action: 'invite',
                    ownerUid: data.workspace.ownerUid,
                    email: draft.email,
                    role: draft.role || (data.workspace.space === 'home' ? 'member' : 'viewer')
                  });
                  setDraft(previous => ({
                    ...previous,
                    invitation: result.code
                  }));
                })} />}
                  {draft.invitation ? <Text selectable style={styles.mutedText}>{draft.invitation}</Text> : null}
                </> : null}
                {(data.workspace.members || []).map(member => record(member.uid, <>
                  <Text style={styles.invoiceCompany}>{member.name || member.email || member.uid} · {t('role_' + member.role)}</Text>
                  {['owner', 'admin'].includes(data.workspace.role) ? <ActionButton t={t} styles={styles} labelKey={'table_actions_delete'} disabled={busy} onPress={() => void run(async () => {
                  await props.call({
                    action: 'revokeMember',
                    ownerUid: data.workspace.ownerUid,
                    memberUid: member.uid
                  });
                  await load();
                })} /> : null}
                </>))}
                {['owner', 'admin'].includes(data.workspace.role) ? <>
                  <Text style={styles.mutedText}>{selectedItems.length} / 25</Text>
                  <ActionButton t={t} styles={styles} labelKey="bulk_paid" disabled={busy || !selectedItems.length} onPress={() => Alert.alert(t('bulk_paid'), String(selectedItems.length), [
                    { text: t('confirm_cancel'), style: 'cancel' },
                    { text: t('action_paid'), onPress: () => void run(async () => {
                      await props.call({ action: 'bulkPayment', ownerUid: data.workspace.ownerUid, items: selectedItems });
                      if (data.workspace.ownerUid === uid) for (const item of selectedItems) await props.refreshInvoice(item.id);
                      setSelectedItems([]); await load();
                    }) },
                  ])} />
                </> : null}
                {(data.workspace.invoices || []).map(invoice => record(invoice.id, <>
                  <Text style={styles.invoiceCompany}>{invoice.company || invoice.id} · {invoice.amount} {invoice.currency}</Text>
                  {['owner', 'admin'].includes(data.workspace.role) && invoice.status !== 'paid' && !invoice.duplicateOf ? <TouchableOpacity accessibilityRole="checkbox"
                    accessibilityLabel={t('select_invoice') + ' ' + (invoice.company || invoice.id)} accessibilityState={{ checked: selectedItems.some(item => item.id === invoice.id) }}
                    style={styles.ghostButton} disabled={busy} onPress={() => setSelectedItems(items => items.some(item => item.id === invoice.id) ? items.filter(item => item.id !== invoice.id) : items.length < 25 ? [...items, { id: invoice.id, revision: invoice.revision }] : items)}>
                    <Text style={styles.ghostButtonText}>{selectedItems.some(item => item.id === invoice.id) ? '✓' : '+'} {t('select_invoice')}</Text>
                  </TouchableOpacity> : null}
                  {<ActionButton t={t} styles={styles} labelKey={'review_document'} disabled={busy} onPress={() => void run(() => viewInvoice(invoice, data.workspace.ownerUid))} />}
                  {['owner', 'admin', 'operator', 'member'].includes(data.workspace.role) ? <ActionButton t={t} styles={styles} labelKey={'action_paid'} disabled={busy} onPress={() => void run(async () => {
                  await props.call({
                    action: 'requestPayment',
                    ownerUid: data.workspace.ownerUid,
                    invoiceId: invoice.id,
                    revision: invoice.revision
                  });
                  await load();
                })} /> : null}
                  {['owner', 'admin'].includes(data.workspace.role) ? <>
                    {choices([{
                    uid: data.workspace.ownerUid,
                    name: t('role_owner')
                  }, ...(data.workspace.members || [])].map(member => ({
                    value: member.uid,
                    label: member.name || member.email || member.uid
                  })), 'assignee_' + invoice.id, invoice.responsibleUid)}
                    {<ActionButton t={t} styles={styles} labelKey={'invoice_save'} disabled={busy} onPress={() => void run(async () => {
                    await props.call({
                      action: 'assign',
                      ownerUid: data.workspace.ownerUid,
                      invoiceId: invoice.id,
                      revision: invoice.revision,
                      memberUid: draft['assignee_' + invoice.id] || data.workspace.ownerUid
                    });
                    await load();
                  })} />}
                  </> : null}
                </>))}
                {data.workspace.nextCursor ? <ActionButton t={t} styles={styles} labelKey={'invoice_open'} disabled={busy} onPress={() => void run(async () => {
                const next = await props.call({
                  action: 'workspace',
                  ownerUid: data.workspace.ownerUid,
                  cursor: data.workspace.nextCursor
                });
                setData(previous => ({
                  ...previous,
                  workspace: {
                    ...next,
                    invoices: previous.workspace.invoices.concat(next.invoices)
                  }
                }));
              })} /> : null}
                {['owner', 'admin'].includes(data.workspace.role) ? (data.workspace.approvals || []).map(approval => record(approval.id, <>
                  <Text style={styles.invoiceCompany}>{approval.company || approval.invoiceId} · {approval.amount} {approval.currency}</Text>
                  {<ActionButton t={t} styles={styles} labelKey={'action_paid'} disabled={busy} onPress={() => void run(async () => {
                  await props.call({
                    action: 'approvePayment',
                    ownerUid: data.workspace.ownerUid,
                    approvalId: approval.id
                  });
                  await load();
                })} />}
                </>)) : null}
                {(data.workspace.audit || []).map((event, index) => <Text key={`${event.at}-${index}`} style={styles.mutedText}>{t(event.event.includes('payment') ? 'action_paid' : 'collaboration')} · {event.actorUid} · {event.at}</Text>)}
              </> : null}
              {reviewing ? <>
                <Text style={styles.sectionTitle}>{t('evidence_source')}</Text>
                <Text selectable style={styles.mutedText}>{currentInvoice.emailPreview || JSON.stringify(currentInvoice.extractionFields || {}, null, 2)}</Text>
                {<ActionButton t={t} styles={styles} labelKey={'review_document'} disabled={busy} onPress={() => void run(async () => {
                const result = await props.call({
                  action: 'sourceDocument',
                  ownerUid: workspaceOwner.current,
                  invoiceId: currentInvoice.id
                });
                setSource(result);
              })} />}
                {source ? source.contentType.startsWith('image/') ? <Image accessibilityLabel={t('review_document')} source={{
                uri: source.url
              }} style={{
                height: 320,
                width: '100%'
              }} resizeMode="contain" /> : <ActionButton t={t} styles={styles} labelKey={'review_document'} disabled={busy} onPress={() => void run(() => Linking.openURL(source.url).catch(() => Alert.alert('DueFlux', t('link_open_error'))))} /> : null}
                {['owner', 'admin', 'operator'].includes(data.role) ? <>
                  {field('invoice_amount', 'amount', currentInvoice.amount, {
                  keyboardType: 'decimal-pad'
                })}
                  {field('invoice_due_date', 'dueDate', (currentInvoice.dueDate || '').slice(0, 10))}
                  {field('confirm_duplicate', 'duplicateOf', currentInvoice.duplicateOf || '')}
                  {<ActionButton t={t} styles={styles} labelKey={'correct_extraction'} disabled={busy} onPress={() => void run(async () => {
                  await props.call({
                    action: 'reviewInvoice',
                    ownerUid: workspaceOwner.current,
                    invoiceId: currentInvoice.id,
                    revision: currentInvoice.revision,
                    patch: {
                      amount: RecordVersion.parseAmount(draft.amount ?? currentInvoice.amount),
                      dueDate: draft.dueDate ?? currentInvoice.dueDate ?? null
                    },
                    duplicateOf: draft.duplicateOf ?? currentInvoice.duplicateOf ?? null
                  });
                  if (workspaceOwner.current === uid) await props.refreshInvoice(currentInvoice.id);
                  await viewInvoice(currentInvoice, workspaceOwner.current);
                })} />}
                </> : null}
              </> : null}
              {mode === 'search' ? <>
                {field('invoice_search_label', 'search')}
                {field('save_filter', 'filterName')}
                <ActionButton t={t} styles={styles} labelKey='save_filter' disabled={busy} onPress={() => void run(async () => {
                  const name = (draft.filterName || '').trim().slice(0, 80); if (!name) return;
                  const filters = [...(data.filters || []).filter(item => item.name !== name), { name, query: (draft.search || '').slice(0, 500) }].slice(-20);
                  await ProtectedStorage.setItem('df_saved_filters_' + uid, JSON.stringify(filters)); await load();
                })} />
                {(data.filters || []).map(filter => <ActionButton key={filter.name} t={t} styles={styles} label={filter.name} disabled={busy} onPress={() => set('search', filter.query)} />)}
                <Text style={styles.mutedText}>{t('density')}</Text>
                {['comfortable', 'compact'].map(value => <ActionButton key={value} t={t} styles={styles} labelKey={value} disabled={busy} onPress={() => void run(() => props.setDensity(value))} />)}
                {invoices.filter(invoice => OfflineQueue.matchesInvoice(invoice, draft.search || '')).slice(0, 100).map(invoice => record(invoice.id, <ActionButton t={t} styles={styles} labelKey={'invoice_open'} disabled={busy} onPress={() => void run(() => {
                close();
                props.openInvoice(invoice);
              })} label={`${invoice.company || invoice.id} · ${invoice.amount} ${invoice.currency}`} />))}
              </> : null}
            </ScrollView>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Pressable>
    </Modal>;
}
