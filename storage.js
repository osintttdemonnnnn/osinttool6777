/**
 * AEGIS OPEN ARCHIVE – Local Storage Layer
 * All case data and records persist in browser localStorage.
 * No server, no private data leaves the device.
 */
const AegisStorage = (() => {
  const KEYS = {
    cases: 'aegis_cases_v1',
    activeCase: 'aegis_active_case_v1',
    settings: 'aegis_settings_v1'
  };

  function uid() {
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
  }

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn('Storage load failed', e);
      return fallback;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Storage save failed', e);
      return false;
    }
  }

  // Cases
  function getCases() {
    return load(KEYS.cases, []);
  }

  function saveCases(cases) {
    return save(KEYS.cases, cases);
  }

  function getCase(id) {
    return getCases().find(c => c.id === id) || null;
  }

  function createCase(data) {
    const cases = getCases();
    const now = new Date().toISOString();
    const c = {
      id: uid(),
      title: data.title || 'Untitled Case',
      description: data.description || '',
      status: data.status || 'open',
      platforms: data.platforms || [],
      usernames: data.usernames || [],
      createdAt: now,
      updatedAt: now,
      records: [],
      timeline: [],
      evidence: [],
      notes: data.notes || '',
      paymentDemands: []
    };
    cases.unshift(c);
    saveCases(cases);
    return c;
  }

  function updateCase(id, patch) {
    const cases = getCases();
    const idx = cases.findIndex(c => c.id === id);
    if (idx === -1) return null;
    cases[idx] = { ...cases[idx], ...patch, updatedAt: new Date().toISOString() };
    saveCases(cases);
    return cases[idx];
  }

  function deleteCase(id) {
    const cases = getCases().filter(c => c.id !== id);
    saveCases(cases);
    if (getActiveCaseId() === id) setActiveCaseId('');
    return true;
  }

  // Records (Information Stacker)
  function addRecord(caseId, record) {
    const c = getCase(caseId);
    if (!c) return null;
    const rec = {
      id: uid(),
      type: record.type || 'other',
      value: record.value || '',
      source: record.source || '',
      collectedAt: record.collectedAt || new Date().toISOString(),
      confidence: record.confidence || 'medium',
      notes: record.notes || '',
      createdAt: new Date().toISOString()
    };
    c.records = c.records || [];
    c.records.unshift(rec);
    // Also push a timeline entry
    c.timeline = c.timeline || [];
    c.timeline.unshift({
      id: uid(),
      at: rec.collectedAt,
      text: `Added ${rec.type}: ${String(rec.value).slice(0, 80)}`,
      recordId: rec.id
    });
    updateCase(caseId, { records: c.records, timeline: c.timeline });
    return rec;
  }

  function updateRecord(caseId, recordId, patch) {
    const c = getCase(caseId);
    if (!c) return null;
    const idx = (c.records || []).findIndex(r => r.id === recordId);
    if (idx === -1) return null;
    c.records[idx] = { ...c.records[idx], ...patch };
    updateCase(caseId, { records: c.records });
    return c.records[idx];
  }

  function deleteRecord(caseId, recordId) {
    const c = getCase(caseId);
    if (!c) return false;
    c.records = (c.records || []).filter(r => r.id !== recordId);
    updateCase(caseId, { records: c.records });
    return true;
  }

  // Timeline
  function addTimelineEvent(caseId, text, at) {
    const c = getCase(caseId);
    if (!c) return null;
    const ev = {
      id: uid(),
      at: at || new Date().toISOString(),
      text: text || ''
    };
    c.timeline = c.timeline || [];
    c.timeline.unshift(ev);
    updateCase(caseId, { timeline: c.timeline });
    return ev;
  }

  // Evidence register
  function addEvidence(caseId, item) {
    const c = getCase(caseId);
    if (!c) return null;
    const ev = {
      id: uid(),
      filename: item.filename || '',
      description: item.description || '',
      url: item.url || '',
      type: item.type || 'screenshot',
      addedAt: new Date().toISOString()
    };
    c.evidence = c.evidence || [];
    c.evidence.unshift(ev);
    updateCase(caseId, { evidence: c.evidence });
    return ev;
  }

  function deleteEvidence(caseId, evidenceId) {
    const c = getCase(caseId);
    if (!c) return false;
    c.evidence = (c.evidence || []).filter(e => e.id !== evidenceId);
    updateCase(caseId, { evidence: c.evidence });
    return true;
  }

  // Payment demands
  function addPaymentDemand(caseId, item) {
    const c = getCase(caseId);
    if (!c) return null;
    const p = {
      id: uid(),
      amount: item.amount || '',
      currency: item.currency || '',
      method: item.method || '',
      address: item.address || '',
      deadline: item.deadline || '',
      notes: item.notes || '',
      addedAt: new Date().toISOString()
    };
    c.paymentDemands = c.paymentDemands || [];
    c.paymentDemands.unshift(p);
    updateCase(caseId, { paymentDemands: c.paymentDemands });
    return p;
  }

  // Active case
  function getActiveCaseId() {
    return localStorage.getItem(KEYS.activeCase) || '';
  }

  function setActiveCaseId(id) {
    if (id) localStorage.setItem(KEYS.activeCase, id);
    else localStorage.removeItem(KEYS.activeCase);
  }

  function getActiveCase() {
    const id = getActiveCaseId();
    return id ? getCase(id) : null;
  }

  // Export helpers
  function exportCaseJSON(caseId) {
    const c = getCase(caseId);
    if (!c) return null;
    return JSON.stringify(c, null, 2);
  }

  function exportAllJSON() {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      version: 1,
      cases: getCases()
    }, null, 2);
  }

  return {
    uid,
    getCases,
    getCase,
    createCase,
    updateCase,
    deleteCase,
    addRecord,
    updateRecord,
    deleteRecord,
    addTimelineEvent,
    addEvidence,
    deleteEvidence,
    addPaymentDemand,
    getActiveCaseId,
    setActiveCaseId,
    getActiveCase,
    exportCaseJSON,
    exportAllJSON
  };
})();
