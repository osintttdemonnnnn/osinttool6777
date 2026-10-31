/**
 * AEGIS OPEN ARCHIVE – Case Management & Stacker Views
 */
const AegisCases = (() => {
  const U = AegisUtils;
  const S = AegisStorage;

  function renderDashboard(container) {
    const cases = S.getCases();
    const active = S.getActiveCase();
    const totalRecords = cases.reduce((n, c) => n + (c.records?.length || 0), 0);
    const openCount = cases.filter(c => c.status === 'open' || c.status === 'investigating').length;

    container.innerHTML = `
      <div class="grid-4 mb-2">
        <div class="stat-card">
          <div class="stat-value">${cases.length}</div>
          <div class="stat-label">Cases</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${openCount}</div>
          <div class="stat-label">Active</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${totalRecords}</div>
          <div class="stat-label">Records</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${active ? '1' : '0'}</div>
          <div class="stat-label">Selected</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Quick actions</span>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" id="dash-new">+ New Case</button>
          <button class="btn btn-secondary" id="dash-stacker">Open Stacker</button>
          <button class="btn btn-secondary" id="dash-export">Export All (JSON)</button>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Recent cases</span>
        </div>
        <div id="dash-cases" class="case-list"></div>
      </div>

      <div class="notice mt-2">
        <strong>AEGIS OPEN ARCHIVE</strong> stores all data locally in your browser.
        Export regularly. Clearing site data will remove cases. Focus on public evidence only.
      </div>
    `;

    const list = document.getElementById('dash-cases');
    if (!cases.length) {
      list.innerHTML = `<div class="empty-state"><h3>No cases yet</h3><p>Create a case to start stacking evidence.</p></div>`;
    } else {
      list.innerHTML = cases.slice(0, 8).map(c => `
        <div class="case-item" data-id="${c.id}">
          ${U.statusDot(c.status)}
          <div class="case-item-body">
            <div class="case-item-title">${U.escapeHtml(c.title)}</div>
            <div class="case-item-meta">${U.formatDateShort(c.updatedAt)} · ${(c.records||[]).length} records · ${U.escapeHtml(c.status)}</div>
          </div>
        </div>
      `).join('');
      list.querySelectorAll('.case-item').forEach(el => {
        el.onclick = () => {
          S.setActiveCaseId(el.dataset.id);
          window.refreshActiveCaseSelect?.();
          window.navigateTo?.('cases');
        };
      });
    }

    document.getElementById('dash-new').onclick = () => openNewCaseModal();
    document.getElementById('dash-stacker').onclick = () => window.navigateTo?.('stacker');
    document.getElementById('dash-export').onclick = () => {
      U.downloadFile('aegis-all-cases.json', S.exportAllJSON());
    };
  }

  function openNewCaseModal() {
    const body = `
      <div class="form-group">
        <label>Case title</label>
        <input type="text" id="nc-title" placeholder="e.g. Discord extortion – @user – Oct 2026" class="input" />
      </div>
      <div class="form-group">
        <label>Incident description</label>
        <textarea id="nc-desc" placeholder="Brief summary of the suspected extortion…"></textarea>
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="nc-status">
          <option value="open">Open</option>
          <option value="investigating">Investigating</option>
          <option value="reported">Reported</option>
          <option value="closed">Closed</option>
        </select>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" id="nc-save">Create Case</button>
        <button class="btn btn-secondary" id="nc-cancel">Cancel</button>
      </div>
    `;
    const m = U.showModal('New Case', body);
    document.getElementById('nc-cancel').onclick = () => m.close();
    document.getElementById('nc-save').onclick = () => {
      const title = document.getElementById('nc-title').value.trim();
      if (!title) return U.toast('Title required', 'error');
      const c = S.createCase({
        title,
        description: document.getElementById('nc-desc').value.trim(),
        status: document.getElementById('nc-status').value
      });
      S.setActiveCaseId(c.id);
      window.refreshActiveCaseSelect?.();
      m.close();
      U.toast('Case created', 'success');
      window.navigateTo?.('cases');
    };
  }

  function renderCases(container) {
    const cases = S.getCases();
    const activeId = S.getActiveCaseId();

    container.innerHTML = `
      <div class="form-actions mb-2">
        <button class="btn btn-primary" id="cases-new">+ New Case</button>
      </div>
      <div class="search-box">
        <input type="text" id="cases-search" placeholder="Search cases…" class="input" />
      </div>
      <div id="cases-list" class="case-list"></div>
      <div id="case-detail" class="mt-2"></div>
    `;

    document.getElementById('cases-new').onclick = () => openNewCaseModal();

    const renderList = (filter = '') => {
      const q = filter.toLowerCase();
      const filtered = cases.filter(c =>
        !q || c.title.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q)
      );
      const list = document.getElementById('cases-list');
      if (!filtered.length) {
        list.innerHTML = `<div class="empty-state"><h3>No matching cases</h3></div>`;
        return;
      }
      list.innerHTML = filtered.map(c => `
        <div class="case-item ${c.id === activeId ? 'active' : ''}" data-id="${c.id}">
          ${U.statusDot(c.status)}
          <div class="case-item-body">
            <div class="case-item-title">${U.escapeHtml(c.title)}</div>
            <div class="case-item-meta">${U.formatDateShort(c.updatedAt)} · ${(c.records||[]).length} records · ${U.escapeHtml(c.status)}</div>
          </div>
        </div>
      `).join('');
      list.querySelectorAll('.case-item').forEach(el => {
        el.onclick = () => {
          S.setActiveCaseId(el.dataset.id);
          window.refreshActiveCaseSelect?.();
          renderCaseDetail(el.dataset.id);
          renderList(document.getElementById('cases-search').value);
        };
      });
    };

    document.getElementById('cases-search').oninput = (e) => renderList(e.target.value);
    renderList();
    if (activeId) renderCaseDetail(activeId);
  }

  function renderCaseDetail(caseId) {
    const c = S.getCase(caseId);
    const el = document.getElementById('case-detail');
    if (!c || !el) return;

    el.innerHTML = `
      <div class="card">
        <div class="card-header">
          <span class="card-title">${U.escapeHtml(c.title)}</span>
          <div class="flex gap-1">
            <button class="btn btn-sm btn-secondary" id="cd-edit">Edit</button>
            <button class="btn btn-sm btn-secondary" id="cd-export">Export JSON</button>
            <button class="btn btn-sm btn-danger" id="cd-delete">Delete</button>
          </div>
        </div>
        <p class="text-muted mb-1">${U.escapeHtml(c.description || 'No description')}</p>
        <div class="form-row">
          <div><span class="text-dim">Status:</span> <strong>${U.escapeHtml(c.status)}</strong></div>
          <div><span class="text-dim">Created:</span> ${U.formatDate(c.createdAt)}</div>
          <div><span class="text-dim">Updated:</span> ${U.formatDate(c.updatedAt)}</div>
          <div><span class="text-dim">Records:</span> ${(c.records||[]).length}</div>
        </div>

        <h4 class="mt-2 mb-1" style="font-size:0.85rem">Usernames / platforms</h4>
        <div class="mb-1">
          ${(c.usernames||[]).length ? (c.usernames||[]).map(u =>
            `<span class="badge badge-info" style="margin:2px">${U.escapeHtml(u.platform)}: ${U.escapeHtml(u.name)}</span>`
          ).join('') : '<span class="text-dim">None recorded</span>'}
        </div>

        <h4 class="mt-2 mb-1" style="font-size:0.85rem">Evidence register</h4>
        <div class="table-wrap mb-1">
          <table>
            <thead><tr><th>Type</th><th>Filename / URL</th><th>Description</th><th>Added</th><th></th></tr></thead>
            <tbody>
              ${(c.evidence||[]).map(e => `
                <tr>
                  <td>${U.escapeHtml(e.type)}</td>
                  <td class="mono truncate">${U.escapeHtml(e.filename || e.url || '—')}</td>
                  <td>${U.escapeHtml(e.description || '')}</td>
                  <td>${U.formatDateShort(e.addedAt)}</td>
                  <td><button class="btn btn-xs btn-ghost ev-del" data-id="${e.id}">✕</button></td>
                </tr>
              `).join('') || '<tr><td colspan="5" class="text-dim">No evidence files registered</td></tr>'}
            </tbody>
          </table>
        </div>
        <button class="btn btn-sm btn-secondary" id="cd-add-ev">+ Register evidence</button>

        <h4 class="mt-2 mb-1" style="font-size:0.85rem">Payment demands</h4>
        <div class="table-wrap mb-1">
          <table>
            <thead><tr><th>Amount</th><th>Method</th><th>Address / details</th><th>Deadline</th></tr></thead>
            <tbody>
              ${(c.paymentDemands||[]).map(p => `
                <tr>
                  <td>${U.escapeHtml(p.amount)} ${U.escapeHtml(p.currency)}</td>
                  <td>${U.escapeHtml(p.method)}</td>
                  <td class="mono truncate">${U.escapeHtml(p.address)}</td>
                  <td>${U.escapeHtml(p.deadline || '—')}</td>
                </tr>
              `).join('') || '<tr><td colspan="4" class="text-dim">None recorded</td></tr>'}
            </tbody>
          </table>
        </div>
        <button class="btn btn-sm btn-secondary" id="cd-add-pay">+ Add payment demand</button>

        <h4 class="mt-2 mb-1" style="font-size:0.85rem">Timeline</h4>
        <div class="timeline">
          ${(c.timeline||[]).slice(0, 20).map(t => `
            <div class="timeline-item">
              <div class="text-dim" style="font-size:0.72rem">${U.formatDate(t.at)}</div>
              <div>${U.escapeHtml(t.text)}</div>
            </div>
          `).join('') || '<p class="text-dim">No timeline events</p>'}
        </div>
        <button class="btn btn-sm btn-secondary mt-1" id="cd-add-tl">+ Timeline note</button>

        <h4 class="mt-2 mb-1" style="font-size:0.85rem">Investigation notes</h4>
        <textarea id="cd-notes" rows="4">${U.escapeHtml(c.notes || '')}</textarea>
        <button class="btn btn-sm btn-primary mt-1" id="cd-save-notes">Save notes</button>
      </div>
    `;

    document.getElementById('cd-export').onclick = () => {
      U.downloadFile(`aegis-case-${c.id}.json`, S.exportCaseJSON(c.id));
    };
    document.getElementById('cd-delete').onclick = async () => {
      if (await U.confirmDialog('Delete this case and all its records? This cannot be undone.')) {
        S.deleteCase(c.id);
        U.toast('Case deleted', 'success');
        window.refreshActiveCaseSelect?.();
        window.navigateTo?.('cases');
      }
    };
    document.getElementById('cd-save-notes').onclick = () => {
      S.updateCase(c.id, { notes: document.getElementById('cd-notes').value });
      U.toast('Notes saved', 'success');
    };
    document.getElementById('cd-edit').onclick = () => openEditCaseModal(c);
    document.getElementById('cd-add-ev').onclick = () => openEvidenceModal(c.id);
    document.getElementById('cd-add-pay').onclick = () => openPaymentModal(c.id);
    document.getElementById('cd-add-tl').onclick = () => {
      const text = prompt('Timeline event:');
      if (text) {
        S.addTimelineEvent(c.id, text);
        renderCaseDetail(c.id);
      }
    };
    el.querySelectorAll('.ev-del').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        S.deleteEvidence(c.id, btn.dataset.id);
        renderCaseDetail(c.id);
      };
    });
  }

  function openEditCaseModal(c) {
    const body = `
      <div class="form-group">
        <label>Title</label>
        <input type="text" id="ec-title" value="${U.escapeHtml(c.title)}" class="input" />
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea id="ec-desc">${U.escapeHtml(c.description || '')}</textarea>
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="ec-status">
          ${['open','investigating','reported','closed'].map(s =>
            `<option value="${s}" ${c.status===s?'selected':''}>${s}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" id="ec-save">Save</button>
        <button class="btn btn-secondary" id="ec-cancel">Cancel</button>
      </div>
    `;
    const m = U.showModal('Edit Case', body);
    document.getElementById('ec-cancel').onclick = () => m.close();
    document.getElementById('ec-save').onclick = () => {
      S.updateCase(c.id, {
        title: document.getElementById('ec-title').value.trim(),
        description: document.getElementById('ec-desc').value.trim(),
        status: document.getElementById('ec-status').value
      });
      m.close();
      window.refreshActiveCaseSelect?.();
      renderCaseDetail(c.id);
      U.toast('Case updated', 'success');
    };
  }

  function openEvidenceModal(caseId) {
    const body = `
      <div class="form-group">
        <label>Type</label>
        <select id="ev-type">
          <option value="screenshot">Screenshot</option>
          <option value="message_url">Message URL</option>
          <option value="file">File</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div class="form-group">
        <label>Filename or URL</label>
        <input type="text" id="ev-name" class="input" placeholder="screenshot-2026-10-30.png or https://..." />
      </div>
      <div class="form-group">
        <label>Description</label>
        <input type="text" id="ev-desc" class="input" />
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" id="ev-save">Add</button>
        <button class="btn btn-secondary" id="ev-cancel">Cancel</button>
      </div>
    `;
    const m = U.showModal('Register Evidence', body);
    document.getElementById('ev-cancel').onclick = () => m.close();
    document.getElementById('ev-save').onclick = () => {
      const name = document.getElementById('ev-name').value.trim();
      if (!name) return U.toast('Filename or URL required', 'error');
      S.addEvidence(caseId, {
        type: document.getElementById('ev-type').value,
        filename: name.startsWith('http') ? '' : name,
        url: name.startsWith('http') ? name : '',
        description: document.getElementById('ev-desc').value.trim()
      });
      m.close();
      renderCaseDetail(caseId);
      U.toast('Evidence registered', 'success');
    };
  }

  function openPaymentModal(caseId) {
    const body = `
      <div class="form-row">
        <div class="form-group">
          <label>Amount</label>
          <input type="text" id="pay-amount" class="input" placeholder="500" />
        </div>
        <div class="form-group">
          <label>Currency</label>
          <input type="text" id="pay-currency" class="input" placeholder="USD / BTC / USDT" />
        </div>
      </div>
      <div class="form-group">
        <label>Method</label>
        <input type="text" id="pay-method" class="input" placeholder="Crypto, gift card, wire…" />
      </div>
      <div class="form-group">
        <label>Address / account / details</label>
        <input type="text" id="pay-address" class="input" />
      </div>
      <div class="form-group">
        <label>Deadline (if any)</label>
        <input type="text" id="pay-deadline" class="input" placeholder="2026-11-01 or ASAP" />
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea id="pay-notes"></textarea>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" id="pay-save">Add</button>
        <button class="btn btn-secondary" id="pay-cancel">Cancel</button>
      </div>
    `;
    const m = U.showModal('Payment Demand', body);
    document.getElementById('pay-cancel').onclick = () => m.close();
    document.getElementById('pay-save').onclick = () => {
      S.addPaymentDemand(caseId, {
        amount: document.getElementById('pay-amount').value.trim(),
        currency: document.getElementById('pay-currency').value.trim(),
        method: document.getElementById('pay-method').value.trim(),
        address: document.getElementById('pay-address').value.trim(),
        deadline: document.getElementById('pay-deadline').value.trim(),
        notes: document.getElementById('pay-notes').value.trim()
      });
      m.close();
      renderCaseDetail(caseId);
      U.toast('Payment demand recorded', 'success');
    };
  }

  function renderStacker(container) {
    const active = S.getActiveCase();
    if (!active) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No active case</h3>
          <p>Create or select a case to stack information records.</p>
          <button class="btn btn-primary" id="st-goto">Go to Cases</button>
        </div>
      `;
      document.getElementById('st-goto').onclick = () => window.navigateTo?.('cases');
      return;
    }

    container.innerHTML = `
      <div class="notice">
        Active case: <strong>${U.escapeHtml(active.title)}</strong> —
        Add observations from tools or manually. Each record is timestamped and exportable.
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Add record</span></div>
        <div class="form-row">
          <div class="form-group">
            <label>Information type</label>
            <select id="st-type">
              <option value="username">Username</option>
              <option value="discord_id">Discord ID</option>
              <option value="telegram">Telegram</option>
              <option value="email_domain">Email / Domain</option>
              <option value="ip_address">IP Address</option>
              <option value="url">URL</option>
              <option value="phone">Phone</option>
              <option value="name">Name (from evidence)</option>
              <option value="hash">Hash</option>
              <option value="message">Message content</option>
              <option value="payment">Payment detail</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="form-group">
            <label>Observed value</label>
            <input type="text" id="st-value" class="input" placeholder="The fact observed" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Source URL or filename</label>
            <input type="text" id="st-source" class="input" placeholder="https://… or screenshot.png" />
          </div>
          <div class="form-group">
            <label>Collected at</label>
            <input type="datetime-local" id="st-when" class="input" />
          </div>
        </div>
        <div class="form-group">
          <label>Confidence</label>
          <div class="confidence-group">
            <label><input type="radio" name="st-conf" value="high" /> High</label>
            <label><input type="radio" name="st-conf" value="medium" checked /> Medium</label>
            <label><input type="radio" name="st-conf" value="low" /> Low</label>
          </div>
        </div>
        <div class="form-group">
          <label>Notes / context</label>
          <textarea id="st-notes" placeholder="How obtained, relevance…"></textarea>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" id="st-add">Add to stack</button>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Records (${(active.records||[]).length})</span>
          <input type="text" id="st-filter" class="input" style="max-width:180px" placeholder="Filter…" />
        </div>
        <div id="st-list"></div>
      </div>
    `;

    // Default datetime
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('st-when').value = now.toISOString().slice(0, 16);

    document.getElementById('st-add').onclick = () => {
      const value = document.getElementById('st-value').value.trim();
      if (!value) return U.toast('Value required', 'error');
      const when = document.getElementById('st-when').value;
      S.addRecord(active.id, {
        type: document.getElementById('st-type').value,
        value,
        source: document.getElementById('st-source').value.trim(),
        notes: document.getElementById('st-notes').value.trim(),
        confidence: document.querySelector('input[name="st-conf"]:checked')?.value || 'medium',
        collectedAt: when ? new Date(when).toISOString() : new Date().toISOString()
      });
      U.toast('Record added', 'success');
      renderStacker(container);
    };

    const renderRecords = (filter = '') => {
      const q = filter.toLowerCase();
      const records = (active.records || []).filter(r =>
        !q || r.value.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || (r.notes||'').toLowerCase().includes(q)
      );
      const list = document.getElementById('st-list');
      if (!records.length) {
        list.innerHTML = `<p class="text-dim">No records yet. Use tools or the form above.</p>`;
        return;
      }
      list.innerHTML = records.map(r => `
        <div class="record-card">
          <div class="record-card-header">
            <span class="record-type">${U.escapeHtml(r.type)}</span>
            ${U.confidenceBadge(r.confidence)}
          </div>
          <div class="record-value">${U.escapeHtml(r.value)}</div>
          <div class="record-meta">
            ${U.formatDate(r.collectedAt)}
            ${r.source ? ' · ' + U.escapeHtml(r.source) : ''}
            ${r.notes ? '<br>' + U.escapeHtml(r.notes) : ''}
          </div>
          <div class="form-actions mt-1">
            <button class="btn btn-xs btn-ghost rec-copy" data-val="${U.escapeHtml(r.value)}">Copy</button>
            <button class="btn btn-xs btn-danger rec-del" data-id="${r.id}">Delete</button>
          </div>
        </div>
      `).join('');
      list.querySelectorAll('.rec-copy').forEach(b => {
        b.onclick = () => U.copyText(b.dataset.val);
      });
      list.querySelectorAll('.rec-del').forEach(b => {
        b.onclick = async () => {
          if (await U.confirmDialog('Delete this record?')) {
            S.deleteRecord(active.id, b.dataset.id);
            renderStacker(container);
          }
        };
      });
    };

    document.getElementById('st-filter').oninput = (e) => renderRecords(e.target.value);
    renderRecords();
  }

  function renderReporting(container) {
    container.innerHTML = `
      <div class="notice">
        Use your organized case evidence when filing reports. AEGIS does not submit reports for you —
        it helps you prepare clear, structured documentation.
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Official reporting channels</span></div>
        <div class="report-links">
          <a class="report-link" href="https://www.ic3.gov/" target="_blank" rel="noopener">
            <div>
              <strong>FBI Internet Crime Complaint Center (IC3)</strong>
              <span>Primary channel for internet crime including extortion, ransomware, and online fraud.</span>
            </div>
          </a>
          <a class="report-link" href="https://tips.fbi.gov/" target="_blank" rel="noopener">
            <div>
              <strong>FBI Tips</strong>
              <span>Submit tips related to federal crimes. Include organized evidence from your case file.</span>
            </div>
          </a>
          <a class="report-link" href="https://www.justice.gov/action-center/report-crime" target="_blank" rel="noopener">
            <div>
              <strong>U.S. Department of Justice – Report a Crime</strong>
              <span>Additional federal reporting options and guidance.</span>
            </div>
          </a>
          <a class="report-link" href="https://discord.com/safety" target="_blank" rel="noopener">
            <div>
              <strong>Discord Safety / Trust & Safety</strong>
              <span>Report abusive users, servers, and content on Discord.</span>
            </div>
          </a>
          <a class="report-link" href="https://telegram.org/faq#q-how-do-i-report-abuse" target="_blank" rel="noopener">
            <div>
              <strong>Telegram Abuse Reporting</strong>
              <span>Report public channels and accounts that violate Telegram terms.</span>
            </div>
          </a>
          <a class="report-link" href="https://help.x.com/en/rules-and-policies/x-report-violation" target="_blank" rel="noopener">
            <div>
              <strong>X (Twitter) Report</strong>
              <span>Report violations including threats and scams.</span>
            </div>
          </a>
          <a class="report-link" href="https://www.instagram.com/help/contact/372321739929162" target="_blank" rel="noopener">
            <div>
              <strong>Instagram / Meta Reporting</strong>
              <span>Report accounts and content on Instagram.</span>
            </div>
          </a>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Report preparation checklist</span></div>
        <ul style="padding-left:1.2rem;font-size:0.875rem;color:var(--text-muted)">
          <li>Export your case as JSON (and optionally print/PDF from browser)</li>
          <li>Include chronological timeline of contact and demands</li>
          <li>List all usernames, platforms, message URLs, and payment addresses</li>
          <li>Attach or reference hashed screenshots and files</li>
          <li>Note confidence levels and original sources for each record</li>
          <li>Do not include private data of third parties unrelated to the case</li>
        </ul>
      </div>
    `;
  }

  function renderExport(container) {
    const active = S.getActiveCase();
    const cases = S.getCases();
    container.innerHTML = `
      <div class="card">
        <div class="card-header"><span class="card-title">Export options</span></div>
        <p class="text-muted mb-2">All data stays in your browser until you download it. JSON is machine-readable; use browser Print for PDF.</p>
        <div class="form-actions">
          <button class="btn btn-primary" id="ex-active" ${active ? '' : 'disabled'}>Export Active Case (JSON)</button>
          <button class="btn btn-secondary" id="ex-all">Export All Cases (JSON)</button>
          <button class="btn btn-secondary" id="ex-print" ${active ? '' : 'disabled'}>Print / Save PDF (Active Case)</button>
        </div>
      </div>
      <div class="card" id="ex-preview">
        <div class="card-header"><span class="card-title">Active case summary</span></div>
        <div id="ex-summary" class="result-panel empty">Select a case to preview.</div>
      </div>
    `;

    if (active) {
      const summary = {
        title: active.title,
        status: active.status,
        description: active.description,
        records: (active.records || []).length,
        evidence: (active.evidence || []).length,
        usernames: active.usernames,
        paymentDemands: active.paymentDemands,
        exportedAt: new Date().toISOString()
      };
      document.getElementById('ex-summary').textContent = JSON.stringify(summary, null, 2);
      document.getElementById('ex-summary').classList.remove('empty');
    }

    document.getElementById('ex-active').onclick = () => {
      if (!active) return;
      U.downloadFile(`aegis-${active.id}.json`, S.exportCaseJSON(active.id));
    };
    document.getElementById('ex-all').onclick = () => {
      U.downloadFile('aegis-all-cases.json', S.exportAllJSON());
    };
    document.getElementById('ex-print').onclick = () => {
      if (!active) return;
      const w = window.open('', '_blank');
      const recordsHtml = (active.records || []).map(r => `
        <tr>
          <td>${U.escapeHtml(r.type)}</td>
          <td>${U.escapeHtml(r.value)}</td>
          <td>${U.escapeHtml(r.source || '')}</td>
          <td>${U.formatDate(r.collectedAt)}</td>
          <td>${U.escapeHtml(r.confidence)}</td>
          <td>${U.escapeHtml(r.notes || '')}</td>
        </tr>
      `).join('');
      w.document.write(`
        <!DOCTYPE html><html><head><title>${U.escapeHtml(active.title)}</title>
        <style>
          body{font-family:system-ui,sans-serif;padding:24px;color:#111}
          h1{font-size:1.4rem} h2{font-size:1.1rem;margin-top:1.5rem}
          table{border-collapse:collapse;width:100%;font-size:12px}
          th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
          th{background:#f0f0f0}
          .meta{color:#555;font-size:13px}
        </style></head><body>
        <h1>AEGIS OPEN ARCHIVE – Case Report</h1>
        <p class="meta">Generated ${new Date().toLocaleString()}</p>
        <h2>${U.escapeHtml(active.title)}</h2>
        <p>${U.escapeHtml(active.description || '')}</p>
        <p class="meta">Status: ${U.escapeHtml(active.status)} · Created: ${U.formatDate(active.createdAt)}</p>
        <h2>Records</h2>
        <table>
          <thead><tr><th>Type</th><th>Value</th><th>Source</th><th>Collected</th><th>Confidence</th><th>Notes</th></tr></thead>
          <tbody>${recordsHtml || '<tr><td colspan="6">None</td></tr>'}</tbody>
        </table>
        <h2>Notes</h2>
        <pre style="white-space:pre-wrap">${U.escapeHtml(active.notes || '')}</pre>
        <p class="meta" style="margin-top:2rem">Public evidence documentation only. Submit via official channels (IC3, platform reports).</p>
        </body></html>
      `);
      w.document.close();
      setTimeout(() => w.print(), 400);
    };
  }

  return {
    renderDashboard,
    renderCases,
    renderStacker,
    renderReporting,
    renderExport,
    openNewCaseModal
  };
})();
