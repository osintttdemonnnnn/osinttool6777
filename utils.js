/**
 * AEGIS OPEN ARCHIVE – Shared Utilities
 */
const AegisUtils = (() => {
  function toast(msg, type = 'info', duration = 3200) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'toast ' + (type || '');
    el.hidden = false;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.hidden = true; }, duration);
  }

  function copyText(text) {
    if (!text) return Promise.reject();
    return navigator.clipboard.writeText(text).then(() => {
      toast('Copied to clipboard', 'success');
    }).catch(() => {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        toast('Copied to clipboard', 'success');
      } catch (e) {
        toast('Copy failed', 'error');
      }
      document.body.removeChild(ta);
    });
  }

  function downloadFile(filename, content, mime = 'application/json') {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast('Download started', 'success');
  }

  function formatDate(iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return iso;
    }
  }

  function formatDateShort(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString();
    } catch {
      return iso;
    }
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function confidenceBadge(level) {
    const map = {
      high: 'badge-high',
      medium: 'badge-medium',
      low: 'badge-low'
    };
    const cls = map[level] || 'badge-low';
    return `<span class="badge ${cls}">${escapeHtml(level || 'unknown')}</span>`;
  }

  function statusDot(status) {
    const s = (status || 'open').toLowerCase();
    return `<span class="case-item-status ${s}" title="${escapeHtml(s)}"></span>`;
  }

  // Simple modal
  function showModal(title, bodyHtml, onClose) {
    const root = document.getElementById('modal-root');
    root.innerHTML = `
      <div class="modal-backdrop" id="modal-backdrop">
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-header">
            <h2>${escapeHtml(title)}</h2>
            <button class="icon-btn" id="modal-close" aria-label="Close">✕</button>
          </div>
          <div class="modal-body">${bodyHtml}</div>
        </div>
      </div>
    `;
    const close = () => {
      root.innerHTML = '';
      if (onClose) onClose();
    };
    document.getElementById('modal-close').onclick = close;
    document.getElementById('modal-backdrop').onclick = (e) => {
      if (e.target.id === 'modal-backdrop') close();
    };
    return { close };
  }

  function confirmDialog(message) {
    return new Promise((resolve) => {
      const body = `
        <p style="margin-bottom:1rem">${escapeHtml(message)}</p>
        <div class="form-actions">
          <button class="btn btn-danger" id="confirm-yes">Confirm</button>
          <button class="btn btn-secondary" id="confirm-no">Cancel</button>
        </div>
      `;
      const m = showModal('Confirm', body);
      document.getElementById('confirm-yes').onclick = () => { m.close(); resolve(true); };
      document.getElementById('confirm-no').onclick = () => { m.close(); resolve(false); };
    });
  }

  // Discord snowflake decoder (client-side, pure JS)
  function decodeDiscordSnowflake(idStr) {
    try {
      const id = BigInt(String(idStr).trim());
      if (id < 0n) throw new Error('Invalid ID');
      const DISCORD_EPOCH = 1420070400000n;
      const ms = (id >> 22n) + DISCORD_EPOCH;
      const worker = Number((id >> 17n) & 0x1Fn);
      const process = Number((id >> 12n) & 0x1Fn);
      const increment = Number(id & 0xFFFn);
      const date = new Date(Number(ms));
      return {
        valid: true,
        id: String(id),
        timestampMs: Number(ms),
        iso: date.toISOString(),
        local: date.toLocaleString(),
        unix: Math.floor(Number(ms) / 1000),
        workerId: worker,
        processId: process,
        increment,
        age: formatAge(date)
      };
    } catch (e) {
      return { valid: false, error: e.message || 'Invalid snowflake' };
    }
  }

  function formatAge(date) {
    const sec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (sec < 60) return sec + 's ago';
    if (sec < 3600) return Math.floor(sec / 60) + 'm ago';
    if (sec < 86400) return Math.floor(sec / 3600) + 'h ago';
    if (sec < 2592000) return Math.floor(sec / 86400) + 'd ago';
    if (sec < 31536000) return Math.floor(sec / 2592000) + 'mo ago';
    return Math.floor(sec / 31536000) + 'y ago';
  }

  // Extract Discord IDs from links
  function extractDiscordIds(text) {
    const results = [];
    // Message links: discord.com/channels/guild/channel/message
    const msgRe = /discord(?:app)?\.com\/channels\/(\d+)\/(\d+)\/(\d+)/gi;
    let m;
    while ((m = msgRe.exec(text)) !== null) {
      results.push({ type: 'message', guild: m[1], channel: m[2], message: m[3] });
    }
    // User links
    const userRe = /discord(?:app)?\.com\/users\/(\d+)/gi;
    while ((m = userRe.exec(text)) !== null) {
      results.push({ type: 'user', user: m[1] });
    }
    // Raw snowflakes (17-20 digits)
    const rawRe = /\b(\d{17,20})\b/g;
    while ((m = rawRe.exec(text)) !== null) {
      if (!results.some(r => Object.values(r).includes(m[1]))) {
        results.push({ type: 'raw', id: m[1] });
      }
    }
    return results;
  }

  // Hash functions (Web Crypto)
  async function hashText(algo, text) {
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest(algo, enc);
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async function hashFile(algo, file) {
    const buf = await file.arrayBuffer();
    const hashBuf = await crypto.subtle.digest(algo, buf);
    return Array.from(new Uint8Array(hashBuf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Phone helpers (format / validation only – public metadata)
  function parsePhone(input) {
    const cleaned = String(input).replace(/[^\d+]/g, '');
    // Basic E.164-ish check
    const e164 = cleaned.startsWith('+') ? cleaned : (cleaned.length > 10 ? '+' + cleaned : cleaned);
    const digits = cleaned.replace(/\D/g, '');
    let country = null;
    let countryName = null;
    // Common country codes (public knowledge)
    const codes = [
      { code: '1', name: 'US/Canada', len: [10, 11] },
      { code: '44', name: 'United Kingdom', len: [10, 12] },
      { code: '91', name: 'India', len: [10, 12] },
      { code: '86', name: 'China', len: [11, 13] },
      { code: '49', name: 'Germany', len: [10, 13] },
      { code: '33', name: 'France', len: [9, 12] },
      { code: '61', name: 'Australia', len: [9, 11] },
      { code: '81', name: 'Japan', len: [10, 12] },
      { code: '7', name: 'Russia/Kazakhstan', len: [10, 11] },
      { code: '55', name: 'Brazil', len: [10, 13] },
      { code: '52', name: 'Mexico', len: [10, 12] },
      { code: '34', name: 'Spain', len: [9, 11] },
      { code: '39', name: 'Italy', len: [9, 12] },
      { code: '82', name: 'South Korea', len: [9, 11] },
      { code: '31', name: 'Netherlands', len: [9, 11] },
      { code: '46', name: 'Sweden', len: [9, 11] },
      { code: '47', name: 'Norway', len: [8, 10] },
      { code: '48', name: 'Poland', len: [9, 11] },
      { code: '90', name: 'Turkey', len: [10, 12] },
      { code: '966', name: 'Saudi Arabia', len: [9, 12] },
      { code: '971', name: 'UAE', len: [9, 12] },
      { code: '65', name: 'Singapore', len: [8, 10] },
      { code: '60', name: 'Malaysia', len: [9, 11] },
      { code: '62', name: 'Indonesia', len: [9, 12] },
      { code: '63', name: 'Philippines', len: [10, 12] },
      { code: '66', name: 'Thailand', len: [9, 11] },
      { code: '84', name: 'Vietnam', len: [9, 11] },
      { code: '234', name: 'Nigeria', len: [10, 13] },
      { code: '27', name: 'South Africa', len: [9, 11] },
      { code: '254', name: 'Kenya', len: [9, 12] }
    ];
    for (const c of codes) {
      if (digits.startsWith(c.code) && c.len.some(l => digits.length === l || digits.length === c.code.length + (l - (c.code === '1' ? 1 : 0)))) {
        country = c.code;
        countryName = c.name;
        break;
      }
      if (digits.startsWith(c.code) && digits.length >= 8) {
        country = c.code;
        countryName = c.name;
        break;
      }
    }
    return {
      input: input,
      cleaned,
      e164: e164.startsWith('+') ? e164 : (country ? '+' + digits : cleaned),
      digits,
      length: digits.length,
      countryCode: country,
      countryName,
      validFormat: digits.length >= 8 && digits.length <= 15
    };
  }

  // Google dork builder
  function buildDork(parts) {
    return parts.filter(Boolean).join(' ');
  }

  return {
    toast,
    copyText,
    downloadFile,
    formatDate,
    formatDateShort,
    escapeHtml,
    confidenceBadge,
    statusDot,
    showModal,
    confirmDialog,
    decodeDiscordSnowflake,
    extractDiscordIds,
    formatAge,
    hashText,
    hashFile,
    parsePhone,
    buildDork
  };
})();
