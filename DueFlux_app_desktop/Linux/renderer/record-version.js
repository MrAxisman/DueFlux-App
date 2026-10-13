(function (root, factory) {
  const value = factory();
  if (typeof module === 'object' && module.exports) module.exports = value;
  else root.DueFluxRecordVersion = value;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function snapshot(data) {
    const date = value => {
      if (!value) return '';
      const converted = value.toDate ? value.toDate() : new Date(value);
      return Number.isNaN(converted.getTime()) ? '' : converted.toISOString();
    };
    return JSON.stringify([String(data.company || data.vendor || ''), String(data.number || data.invoiceNumber || ''),
      Number(data.amount) || 0, String(data.currency || 'RON').toUpperCase(), String(data.status || 'unpaid').toLowerCase(),
      date(data.issueDate || data.issue_date || data.issueAt || data.issuedAt), date(data.dueDate || data.due_date || data.dueAt),
      String(data.responsibleUid || ''), String(data.duplicateOf || '')]);
  }
  function parseAmount(value) {
    const input = String(value ?? '').trim();
    if (!/^\d+(?:[.,]\d{1,6})?$/.test(input)) return NaN;
    return Number(input.replace(',', '.'));
  }
  return { snapshot: snapshot, parseAmount: parseAmount };
});
