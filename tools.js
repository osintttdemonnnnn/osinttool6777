/**
 * AEGIS OPEN ARCHIVE – OSINT / CSINT Tool Implementations
 * All lookups use public endpoints or pure client-side logic.
 * Limitations are documented in the UI.
 */
const AegisTools = (() => {
  const U = AegisUtils;

  // ---------- Google Dork Generator ----------
  function renderDorks(container) {
    container.innerHTML = `
      <div class="notice">
        <strong>Google Dork Generator</strong> — Builds search queries for publicly indexed information.
        Always respect robots.txt and applicable laws. Results open in Google; this tool only generates the query.
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Build Query</span></div>
        <div class="form-row">
          <div class="form-group">
            <label>Target site / domain (optional)</label>
            <input type="text" id="dork-site" placeholder="example.com" class="input" />
          </div>
          <div class="form-group">
            <label>Keywords</label>
            <input type="text" id="dork-keywords" placeholder="extortion OR blackmail" class="input" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Filetype</label>
            <select id="dork-filetype">
              <option value="">Any</option>
              <option value="pdf">PDF</option>
              <option value="doc">DOC</option>
              <option value="docx">DOCX</option>
              <option value="xls">XLS</option>
              <option value="txt">TXT</option>
              <option value="csv">CSV</option>
            </select>
          </div>
          <div class="form-group">
            <label>In URL contains</label>
            <input type="text" id="dork-inurl" placeholder="login OR admin" class="input" />
          </div>
          <div class="form-group">
            <label>In title</label>
            <input type="text" id="dork-intitle" placeholder="" class="input" />
          </div>
        </div>
        <div class="form-group">
          <label>Quick operators</label>
          <div class="dork-tags" id="dork-quick">
            <span class="dork-tag" data-op='site:'>site:</span>
            <span class="dork-tag" data-op='filetype:pdf'>filetype:pdf</span>
            <span class="dork-tag" data-op='inurl:'>inurl:</span>
            <span class="dork-tag" data-op='intitle:'>intitle:</span>
            <span class="dork-tag" data-op='"exact phrase"'>"exact phrase"</span>
            <span class="dork-tag" data-op='-exclude'>-exclude</span>
            <span class="dork-tag" data-op='OR'>OR</span>
            <span class="dork-tag" data-op='after:2024-01-01'>after:YYYY-MM-DD</span>
            <span class="dork-tag" data-op='before:2025-01-01'>before:YYYY-MM-DD</span>
          </div>
        </div>
        <div class="form-group">
          <label>Generated dork</label>
          <textarea id="dork-output" readonly rows="3" placeholder="Query will appear here…"></textarea>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" id="dork-generate">Generate</button>
          <button class="btn btn-secondary" id="dork-copy">Copy</button>
          <button class="btn btn-secondary" id="dork-open">Open in Google</button>
          <button class="btn btn-ghost" id="dork-add-case">Add to Active Case</button>
        </div>
      </div>
    `;

    const build = () => {
      const site = document.getElementById('dork-site').value.trim();
      const kw = document.getElementById('dork-keywords').value.trim();
      const ft = document.getElementById('dork-filetype').value;
      const inurl = document.getElementById('dork-inurl').value.trim();
      const intitle = document.getElementById('dork-intitle').value.trim();
      const parts = [];
      if (site) parts.push('site:' + site);
      if (kw) parts.push(kw);
      if (ft) parts.push('filetype:' + ft);
      if (inurl) parts.push('inurl:' + inurl);
      if (intitle) parts.push('intitle:' + intitle);
      const q = parts.join(' ');
      document.getElementById('dork-output').value = q;
      return q;
    };

    document.getElementById('dork-generate').onclick = build;
    document.getElementById('dork-copy').onclick = () => U.copyText(document.getElementById('dork-output').value);
    document.getElementById('dork-open').onclick = () => {
      const q = build();
      if (q) window.open('https://www.google.com/search?q=' + encodeURIComponent(q), '_blank', 'noopener');
    };
    document.getElementById('dork-quick').onclick = (e) => {
      const tag = e.target.closest('.dork-tag');
      if (!tag) return;
      const out = document.getElementById('dork-output');
      out.value = (out.value + ' ' + tag.dataset.op).trim();
    };
    document.getElementById('dork-add-case').onclick = () => {
      const q = document.getElementById('dork-output').value.trim();
      if (!q) return U.toast('Generate a dork first', 'error');
      addToCase('google_dork', q, 'Generated Google dork query');
    };
  }

  // ---------- Email / Domain format ----------
  function renderEmail(container) {
    container.innerHTML = `
      <div class="notice">
        <strong>Email & Domain checks</strong> — Format validation, MX presence (via public DNS), and basic domain structure.
        Does not verify mailbox existence or ownership (that would require private probes).
      </div>
      <div class="card">
        <div class="form-group">
          <label>Email address or domain</label>
          <input type="text" id="email-input" placeholder="user@example.com or example.com" class="input" />
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" id="email-run">Analyze</button>
          <button class="btn btn-ghost" id="email-add">Add to Active Case</button>
        </div>
        <div id="email-result" class="result-panel empty mt-2">Results will appear here.</div>
      </div>
    `;

    document.getElementById('email-run').onclick = async () => {
      const raw = document.getElementById('email-input').value.trim();
      const out = document.getElementById('email-result');
      if (!raw) return U.toast('Enter an email or domain', 'error');
      out.innerHTML = '<span class="spinner"></span> Looking up…';
      out.classList.remove('empty');

      const isEmail = raw.includes('@');
      let domain = isEmail ? raw.split('@')[1] : raw;
      domain = domain.replace(/^https?:\/\//, '').split('/')[0].toLowerCase();

      const result = {
        input: raw,
        isEmail,
        domain,
        localPart: isEmail ? raw.split('@')[0] : null,
        formatValid: isEmail ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw) : /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)
      };

      // Public DNS MX via Cloudflare DoH (CORS-friendly)
      try {
        const doh = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`, {
          headers: { Accept: 'application/dns-json' }
        });
        const dns = await doh.json();
        result.mx = (dns.Answer || []).map(a => a.data).filter(Boolean);
        result.hasMX = result.mx.length > 0;
      } catch (e) {
        result.mxError = e.message;
        result.hasMX = null;
      }

      // A record presence
      try {
        const dohA = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=A`, {
          headers: { Accept: 'application/dns-json' }
        });
        const dnsA = await dohA.json();
        result.aRecords = (dnsA.Answer || []).map(a => a.data).filter(Boolean);
      } catch (e) {
        result.aError = e.message;
      }

      out.textContent = JSON.stringify(result, null, 2);
      out.dataset.last = JSON.stringify(result);
    };

    document.getElementById('email-add').onclick = () => {
      const last = document.getElementById('email-result').dataset.last;
      if (!last) return U.toast('Run analysis first', 'error');
      const r = JSON.parse(last);
      addToCase('email_domain', r.input, 'Email/domain analysis', last);
    };
  }

  // ---------- IP Intelligence ----------
  function renderIP(container) {
    container.innerHTML = `
      <div class="notice">
        <strong>IP Intelligence</strong> — Public ASN, ISP, geolocation (country/city level), and network info.
        Uses free public APIs. Geolocation is approximate and not evidence of a person's location.
      </div>
      <div class="card">
        <div class="form-group">
          <label>IP address (IPv4 or IPv6)</label>
          <input type="text" id="ip-input" placeholder="8.8.8.8" class="input" />
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" id="ip-run">Lookup</button>
          <button class="btn btn-secondary" id="ip-my">My public IP</button>
          <button class="btn btn-ghost" id="ip-add">Add to Active Case</button>
        </div>
        <div id="ip-result" class="result-panel empty mt-2">Results will appear here.</div>
      </div>
    `;

    const lookup = async (ip) => {
      const out = document.getElementById('ip-result');
      out.innerHTML = '<span class="spinner"></span> Querying public sources…';
      out.classList.remove('empty');
      let data = { ip, sources: {} };

      // ipwho.is (no key, CORS ok, ~1k/day)
      try {
        const r = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`);
        const j = await r.json();
        if (j.success !== false) {
          data.sources.ipwho = {
            country: j.country,
            country_code: j.country_code,
            region: j.region,
            city: j.city,
            isp: j.connection?.isp,
            org: j.connection?.org,
            asn: j.connection?.asn,
            latitude: j.latitude,
            longitude: j.longitude,
            timezone: j.timezone?.id,
            type: j.type
          };
        }
      } catch (e) {
        data.sources.ipwho = { error: e.message };
      }

      // Fallback / supplement: ip-api.com (HTTP only on free, may fail on HTTPS pages – try anyway)
      try {
        const r2 = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`);
        const j2 = await r2.json();
        if (!j2.error) {
          data.sources.ipapi = {
            country: j2.country_name,
            country_code: j2.country_code,
            region: j2.region,
            city: j2.city,
            org: j2.org,
            asn: j2.asn,
            latitude: j2.latitude,
            longitude: j2.longitude
          };
        }
      } catch (e) {
        data.sources.ipapi = { error: e.message };
      }

      out.textContent = JSON.stringify(data, null, 2);
      out.dataset.last = JSON.stringify(data);
    };

    document.getElementById('ip-run').onclick = () => {
      const ip = document.getElementById('ip-input').value.trim();
      if (!ip) return U.toast('Enter an IP', 'error');
      lookup(ip);
    };
    document.getElementById('ip-my').onclick = async () => {
      try {
        const r = await fetch('https://api.ipify.org?format=json');
        const j = await r.json();
        document.getElementById('ip-input').value = j.ip;
        lookup(j.ip);
      } catch (e) {
        U.toast('Could not detect public IP', 'error');
      }
    };
    document.getElementById('ip-add').onclick = () => {
      const last = document.getElementById('ip-result').dataset.last;
      if (!last) return U.toast('Run lookup first', 'error');
      const r = JSON.parse(last);
      addToCase('ip_address', r.ip, 'IP intelligence lookup', last);
    };
  }

  // ---------- DNS Lookup ----------
  function renderDNS(container) {
    container.innerHTML = `
      <div class="notice">
        <strong>DNS Lookup</strong> — A, AAAA, MX, TXT, NS, CNAME via Cloudflare DNS-over-HTTPS (public, CORS-enabled).
      </div>
      <div class="card">
        <div class="form-row">
          <div class="form-group">
            <label>Domain</label>
            <input type="text" id="dns-domain" placeholder="example.com" class="input" />
          </div>
          <div class="form-group">
            <label>Record types</label>
            <select id="dns-types" multiple style="height:90px">
              <option value="A" selected>A</option>
              <option value="AAAA" selected>AAAA</option>
              <option value="MX" selected>MX</option>
              <option value="TXT" selected>TXT</option>
              <option value="NS" selected>NS</option>
              <option value="CNAME" selected>CNAME</option>
              <option value="SOA">SOA</option>
            </select>
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" id="dns-run">Lookup</button>
          <button class="btn btn-ghost" id="dns-add">Add to Active Case</button>
        </div>
        <div id="dns-result" class="result-panel empty mt-2">Results will appear here.</div>
      </div>
    `;

    document.getElementById('dns-run').onclick = async () => {
      const domain = document.getElementById('dns-domain').value.trim().replace(/^https?:\/\//, '').split('/')[0];
      const types = Array.from(document.getElementById('dns-types').selectedOptions).map(o => o.value);
      if (!domain) return U.toast('Enter a domain', 'error');
      const out = document.getElementById('dns-result');
      out.innerHTML = '<span class="spinner"></span> Resolving…';
      out.classList.remove('empty');

      const results = { domain, records: {} };
      for (const type of types) {
        try {
          const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`, {
            headers: { Accept: 'application/dns-json' }
          });
          const j = await r.json();
          results.records[type] = (j.Answer || []).map(a => ({
            name: a.name,
            type: a.type,
            TTL: a.TTL,
            data: a.data
          }));
        } catch (e) {
          results.records[type] = { error: e.message };
        }
      }
      out.textContent = JSON.stringify(results, null, 2);
      out.dataset.last = JSON.stringify(results);
    };

    document.getElementById('dns-add').onclick = () => {
      const last = document.getElementById('dns-result').dataset.last;
      if (!last) return U.toast('Run lookup first', 'error');
      const r = JSON.parse(last);
      addToCase('dns_records', r.domain, 'DNS lookup', last);
    };
  }

  // ---------- Discord Tools ----------
  function renderDiscord(container) {
    container.innerHTML = `
      <div class="notice">
        <strong>Discord Tools</strong> — Snowflake creation-time decoding and ID extraction from public links.
        Works entirely in-browser. Does not access Discord accounts or private data.
      </div>
      <div class="card">
        <div class="form-group">
          <label>Discord ID, message link, or user link</label>
          <input type="text" id="discord-input" placeholder="User ID, or https://discord.com/channels/..." class="input" />
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" id="discord-run">Decode</button>
          <button class="btn btn-ghost" id="discord-add">Add to Active Case</button>
        </div>
        <div id="discord-result" class="result-panel empty mt-2">Results will appear here.</div>
      </div>
    `;

    document.getElementById('discord-run').onclick = () => {
      const input = document.getElementById('discord-input').value.trim();
      if (!input) return U.toast('Enter an ID or link', 'error');
      const out = document.getElementById('discord-result');
      const extracted = U.extractDiscordIds(input);
      const decoded = [];

      const idsToDecode = [];
      if (extracted.length) {
        extracted.forEach(e => {
          if (e.message) idsToDecode.push({ label: 'message', id: e.message, meta: e });
          if (e.user) idsToDecode.push({ label: 'user', id: e.user, meta: e });
          if (e.guild) idsToDecode.push({ label: 'guild', id: e.guild, meta: e });
          if (e.channel) idsToDecode.push({ label: 'channel', id: e.channel, meta: e });
          if (e.id) idsToDecode.push({ label: 'raw', id: e.id, meta: e });
        });
      } else if (/^\d{17,20}$/.test(input)) {
        idsToDecode.push({ label: 'raw', id: input });
      }

      idsToDecode.forEach(item => {
        const d = U.decodeDiscordSnowflake(item.id);
        decoded.push({ ...item, decode: d });
      });

      const result = { input, extracted, decoded };
      out.textContent = JSON.stringify(result, null, 2);
      out.dataset.last = JSON.stringify(result);
      out.classList.remove('empty');
    };

    document.getElementById('discord-add').onclick = () => {
      const last = document.getElementById('discord-result').dataset.last;
      if (!last) return U.toast('Decode first', 'error');
      const r = JSON.parse(last);
      const primary = r.decoded?.[0]?.id || r.input;
      addToCase('discord_id', primary, 'Discord snowflake / link analysis', last);
    };
  }

  // ---------- Username Tracker ----------
  function renderUsername(container) {
    container.innerHTML = `
      <div class="notice">
        <strong>Username & Public Profile Tracker</strong> — Records observed public usernames and platform links.
        Does not scrape private profiles or attempt account takeover. Add evidence you have already collected from public pages.
      </div>
      <div class="card">
        <div class="form-row">
          <div class="form-group">
            <label>Username</label>
            <input type="text" id="user-name" placeholder="observed_username" class="input" />
          </div>
          <div class="form-group">
            <label>Platform</label>
            <select id="user-platform">
              <option value="discord">Discord</option>
              <option value="telegram">Telegram</option>
              <option value="twitter">X / Twitter</option>
              <option value="instagram">Instagram</option>
              <option value="reddit">Reddit</option>
              <option value="tiktok">TikTok</option>
              <option value="youtube">YouTube</option>
              <option value="github">GitHub</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Public profile / message URL (if available)</label>
          <input type="url" id="user-url" placeholder="https://..." class="input" />
        </div>
        <div class="form-group">
          <label>Notes / context</label>
          <textarea id="user-notes" placeholder="Where observed, what was said…"></textarea>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" id="user-add">Add to Active Case</button>
          <button class="btn btn-secondary" id="user-open">Open common search links</button>
        </div>
      </div>
    `;

    document.getElementById('user-add').onclick = () => {
      const name = document.getElementById('user-name').value.trim();
      const platform = document.getElementById('user-platform').value;
      const url = document.getElementById('user-url').value.trim();
      const notes = document.getElementById('user-notes').value.trim();
      if (!name) return U.toast('Enter a username', 'error');
      const value = `${platform}:${name}`;
      addToCase('username', value, notes || `Observed on ${platform}`, JSON.stringify({ name, platform, url, notes }));
      // Also update case usernames list
      const active = AegisStorage.getActiveCase();
      if (active) {
        const usernames = active.usernames || [];
        if (!usernames.some(u => u.name === name && u.platform === platform)) {
          usernames.push({ name, platform, url });
          AegisStorage.updateCase(active.id, { usernames });
        }
      }
      U.toast('Username record added', 'success');
    };

    document.getElementById('user-open').onclick = () => {
      const name = document.getElementById('user-name').value.trim();
      if (!name) return U.toast('Enter a username', 'error');
      const platform = document.getElementById('user-platform').value;
      const links = {
        discord: `https://www.google.com/search?q=${encodeURIComponent('"' + name + '" site:discord.com OR site:discord.gg')}`,
        telegram: `https://t.me/${encodeURIComponent(name)}`,
        twitter: `https://x.com/${encodeURIComponent(name)}`,
        instagram: `https://www.instagram.com/${encodeURIComponent(name)}/`,
        reddit: `https://www.reddit.com/user/${encodeURIComponent(name)}`,
        github: `https://github.com/${encodeURIComponent(name)}`,
        youtube: `https://www.youtube.com/@${encodeURIComponent(name)}`,
        other: `https://www.google.com/search?q=${encodeURIComponent('"' + name + '"')}`
      };
      window.open(links[platform] || links.other, '_blank', 'noopener');
    };
  }

  // ---------- Telegram ----------
  function renderTelegram(container) {
    container.innerHTML = `
      <div class="notice">
        <strong>Telegram Public Research</strong> — Helpers for public channels and posts.
        This tool does not join private groups or scrape private content. Use official Telegram clients and public t.me links.
      </div>
      <div class="card">
        <div class="form-group">
          <label>Channel / username (without @)</label>
          <input type="text" id="tg-user" placeholder="channelname" class="input" />
        </div>
        <div class="form-group">
          <label>Message / post link (optional)</label>
          <input type="url" id="tg-link" placeholder="https://t.me/channel/123" class="input" />
        </div>
        <div class="form-group">
          <label>Notes</label>
          <textarea id="tg-notes" placeholder="Public post content summary, context…"></textarea>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" id="tg-open">Open t.me</button>
          <button class="btn btn-secondary" id="tg-add">Add to Active Case</button>
        </div>
      </div>
    `;

    document.getElementById('tg-open').onclick = () => {
      const u = document.getElementById('tg-user').value.trim().replace(/^@/, '');
      const link = document.getElementById('tg-link').value.trim();
      if (link) window.open(link, '_blank', 'noopener');
      else if (u) window.open('https://t.me/' + encodeURIComponent(u), '_blank', 'noopener');
      else U.toast('Enter a username or link', 'error');
    };

    document.getElementById('tg-add').onclick = () => {
      const u = document.getElementById('tg-user').value.trim();
      const link = document.getElementById('tg-link').value.trim();
      const notes = document.getElementById('tg-notes').value.trim();
      if (!u && !link) return U.toast('Enter something to record', 'error');
      const value = link || ('@' + u);
      addToCase('telegram', value, notes || 'Telegram public reference', JSON.stringify({ user: u, link, notes }));
    };
  }

  // ---------- URL Analysis ----------
  function renderURL(container) {
    container.innerHTML = `
      <div class="notice">
        <strong>URL Analysis</strong> — Parse structure, extract host, path, query parameters.
        Optional HEAD-style checks are limited by browser CORS; use external tools for deep inspection.
      </div>
      <div class="card">
        <div class="form-group">
          <label>URL</label>
          <input type="url" id="url-input" placeholder="https://example.com/path?q=1" class="input" />
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" id="url-run">Analyze</button>
          <button class="btn btn-ghost" id="url-add">Add to Active Case</button>
        </div>
        <div id="url-result" class="result-panel empty mt-2">Results will appear here.</div>
      </div>
    `;

    document.getElementById('url-run').onclick = () => {
      const raw = document.getElementById('url-input').value.trim();
      if (!raw) return U.toast('Enter a URL', 'error');
      const out = document.getElementById('url-result');
      try {
        const u = new URL(raw.startsWith('http') ? raw : 'https://' + raw);
        const params = {};
        u.searchParams.forEach((v, k) => { params[k] = v; });
        const result = {
          href: u.href,
          protocol: u.protocol,
          host: u.host,
          hostname: u.hostname,
          port: u.port || '(default)',
          pathname: u.pathname,
          search: u.search,
          hash: u.hash,
          params,
          isIP: /^\d{1,3}(\.\d{1,3}){3}$/.test(u.hostname) || u.hostname.includes(':')
        };
        out.textContent = JSON.stringify(result, null, 2);
        out.dataset.last = JSON.stringify(result);
        out.classList.remove('empty');
      } catch (e) {
        out.textContent = 'Invalid URL: ' + e.message;
        out.classList.remove('empty');
      }
    };

    document.getElementById('url-add').onclick = () => {
      const last = document.getElementById('url-result').dataset.last;
      if (!last) return U.toast('Analyze first', 'error');
      const r = JSON.parse(last);
      addToCase('url', r.href, 'URL analysis', last);
    };
  }

  // ---------- Hash Tools ----------
  function renderHash(container) {
    container.innerHTML = `
      <div class="notice">
        <strong>Hash Generation & Verification</strong> — SHA-256, SHA-1, SHA-384, SHA-512 for text or files.
        Useful for evidence integrity (hash a screenshot or export before sharing).
      </div>
      <div class="card">
        <div class="form-group">
          <label>Text to hash</label>
          <textarea id="hash-text" placeholder="Paste text or leave empty to use file only"></textarea>
        </div>
        <div class="form-group">
          <label>Or select a file</label>
          <input type="file" id="hash-file" />
        </div>
        <div class="form-group">
          <label>Algorithms</label>
          <div class="confidence-group">
            <label><input type="checkbox" value="SHA-256" checked /> SHA-256</label>
            <label><input type="checkbox" value="SHA-1" /> SHA-1</label>
            <label><input type="checkbox" value="SHA-384" /> SHA-384</label>
            <label><input type="checkbox" value="SHA-512" /> SHA-512</label>
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" id="hash-run">Compute</button>
          <button class="btn btn-ghost" id="hash-add">Add hashes to Active Case</button>
        </div>
        <div id="hash-result" class="result-panel empty mt-2">Results will appear here.</div>
      </div>
    `;

    document.getElementById('hash-run').onclick = async () => {
      const text = document.getElementById('hash-text').value;
      const fileInput = document.getElementById('hash-file');
      const algos = Array.from(document.querySelectorAll('#hash-result, .confidence-group input[type=checkbox]:checked'))
        .filter(el => el.type === 'checkbox' && el.checked)
        .map(el => el.value);
      // Fix selector
      const checked = Array.from(document.querySelectorAll('.confidence-group input[type=checkbox]:checked')).map(c => c.value);
      if (!checked.length) return U.toast('Select at least one algorithm', 'error');
      if (!text && !fileInput.files?.length) return U.toast('Provide text or a file', 'error');

      const out = document.getElementById('hash-result');
      out.innerHTML = '<span class="spinner"></span> Computing…';
      out.classList.remove('empty');
      const result = { algorithms: checked, hashes: {} };

      try {
        if (fileInput.files?.length) {
          const file = fileInput.files[0];
          result.source = { type: 'file', name: file.name, size: file.size };
          for (const algo of checked) {
            result.hashes[algo] = await U.hashFile(algo, file);
          }
        } else {
          result.source = { type: 'text', length: text.length };
          for (const algo of checked) {
            result.hashes[algo] = await U.hashText(algo, text);
          }
        }
        out.textContent = JSON.stringify(result, null, 2);
        out.dataset.last = JSON.stringify(result);
      } catch (e) {
        out.textContent = 'Error: ' + e.message;
      }
    };

    document.getElementById('hash-add').onclick = () => {
      const last = document.getElementById('hash-result').dataset.last;
      if (!last) return U.toast('Compute hashes first', 'error');
      const r = JSON.parse(last);
      const val = r.hashes['SHA-256'] || Object.values(r.hashes)[0] || '';
      addToCase('hash', val, 'Evidence hash', last);
    };
  }

  // ---------- Domain / WHOIS (limited public) ----------
  function renderWhois(container) {
    container.innerHTML = `
      <div class="notice warning">
        <strong>Domain Intelligence</strong> — DNS-based signals and public RDAP where available.
        Full historical WHOIS often requires paid services. This module uses public DNS and free RDAP endpoints.
        Registration privacy (GDPR redaction) is common; do not expect private contact details.
      </div>
      <div class="card">
        <div class="form-group">
          <label>Domain</label>
          <input type="text" id="whois-domain" placeholder="example.com" class="input" />
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" id="whois-run">Lookup</button>
          <button class="btn btn-ghost" id="whois-add">Add to Active Case</button>
        </div>
        <div id="whois-result" class="result-panel empty mt-2">Results will appear here.</div>
      </div>
    `;

    document.getElementById('whois-run').onclick = async () => {
      const domain = document.getElementById('whois-domain').value.trim().replace(/^https?:\/\//, '').split('/')[0].toLowerCase();
      if (!domain) return U.toast('Enter a domain', 'error');
      const out = document.getElementById('whois-result');
      out.innerHTML = '<span class="spinner"></span> Querying…';
      out.classList.remove('empty');

      const result = { domain, dns: {}, rdap: null };

      // DNS summary
      for (const type of ['A', 'NS', 'MX', 'TXT']) {
        try {
          const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`, {
            headers: { Accept: 'application/dns-json' }
          });
          const j = await r.json();
          result.dns[type] = (j.Answer || []).map(a => a.data);
        } catch (e) {
          result.dns[type] = { error: e.message };
        }
      }

      // RDAP (public, CORS varies – try)
      try {
        const r = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`);
        if (r.ok) {
          const j = await r.json();
          result.rdap = {
            handle: j.handle,
            ldhName: j.ldhName,
            status: j.status,
            events: j.events,
            nameservers: (j.nameservers || []).map(n => n.ldhName),
            entities: (j.entities || []).map(e => ({
              roles: e.roles,
              handle: e.handle,
              // vcard often redacted
              vcardArray: e.vcardArray
            }))
          };
        } else {
          result.rdap = { status: r.status, note: 'RDAP not available or redirected' };
        }
      } catch (e) {
        result.rdap = { error: e.message, note: 'RDAP fetch failed (CORS or network). Use whois.icann.org manually.' };
      }

      out.textContent = JSON.stringify(result, null, 2);
      out.dataset.last = JSON.stringify(result);
    };

    document.getElementById('whois-add').onclick = () => {
      const last = document.getElementById('whois-result').dataset.last;
      if (!last) return U.toast('Run lookup first', 'error');
      const r = JSON.parse(last);
      addToCase('domain', r.domain, 'Domain / RDAP lookup', last);
    };
  }

  // ---------- Phone number (public format / country only) ----------
  function renderPhone(container) {
    container.innerHTML = `
      <div class="notice warning">
        <strong>Phone Number Analysis</strong> — Format validation, country-code identification, and public structure checks only.
        This tool does <em>not</em> perform carrier lookup that reveals private subscriber data, reverse phone directories, or owner identity.
        Carrier information from free public sources is limited and often inaccurate; treat as non-authoritative.
      </div>
      <div class="card">
        <div class="form-group">
          <label>Phone number (include country code if possible)</label>
          <input type="text" id="phone-input" placeholder="+1 555 123 4567" class="input" />
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" id="phone-run">Analyze</button>
          <button class="btn btn-ghost" id="phone-add">Add to Active Case</button>
        </div>
        <div id="phone-result" class="result-panel empty mt-2">Results will appear here.</div>
      </div>
    `;

    document.getElementById('phone-run').onclick = () => {
      const input = document.getElementById('phone-input').value.trim();
      if (!input) return U.toast('Enter a phone number', 'error');
      const parsed = U.parsePhone(input);
      const out = document.getElementById('phone-result');
      out.textContent = JSON.stringify(parsed, null, 2);
      out.dataset.last = JSON.stringify(parsed);
      out.classList.remove('empty');
    };

    document.getElementById('phone-add').onclick = () => {
      const last = document.getElementById('phone-result').dataset.last;
      if (!last) return U.toast('Analyze first', 'error');
      const r = JSON.parse(last);
      addToCase('phone', r.e164 || r.cleaned, 'Phone format / country analysis', last);
    };
  }

  // ---------- Name evidence (organization only, not search) ----------
  function renderName(container) {
    container.innerHTML = `
      <div class="notice warning">
        <strong>Name Evidence Recorder</strong> — Organize names that appear in <em>submitted evidence</em> (messages, public posts, payment notes).
        This is not a people-search or doxxing tool. Do not use it to identify private individuals behind accounts.
        Record only what is already public in the case materials, with source links.
      </div>
      <div class="card">
        <div class="form-group">
          <label>Name as it appears in evidence</label>
          <input type="text" id="name-input" placeholder="As written in message / post" class="input" />
        </div>
        <div class="form-group">
          <label>Source URL or evidence reference</label>
          <input type="text" id="name-source" placeholder="Message URL, filename, or description" class="input" />
        </div>
        <div class="form-group">
          <label>Context / notes</label>
          <textarea id="name-notes" placeholder="How the name appeared, relation to case…"></textarea>
        </div>
        <div class="form-group">
          <label>Confidence that this is relevant public evidence</label>
          <div class="confidence-group" id="name-conf">
            <label><input type="radio" name="name-conf" value="high" /> High</label>
            <label><input type="radio" name="name-conf" value="medium" checked /> Medium</label>
            <label><input type="radio" name="name-conf" value="low" /> Low</label>
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" id="name-add">Add to Active Case</button>
        </div>
      </div>
    `;

    document.getElementById('name-add').onclick = () => {
      const name = document.getElementById('name-input').value.trim();
      const source = document.getElementById('name-source').value.trim();
      const notes = document.getElementById('name-notes').value.trim();
      const conf = document.querySelector('input[name="name-conf"]:checked')?.value || 'medium';
      if (!name) return U.toast('Enter a name', 'error');
      addToCase('name', name, notes, JSON.stringify({ name, source, notes }), conf, source);
    };
  }

  // Helper: add any tool result to active case
  function addToCase(type, value, notes, rawJson, confidence = 'medium', source = '') {
    const active = AegisStorage.getActiveCase();
    if (!active) {
      U.toast('Select or create an active case first', 'error');
      return;
    }
    AegisStorage.addRecord(active.id, {
      type,
      value: String(value),
      source: source || (type + ' tool'),
      notes: notes || '',
      confidence,
      collectedAt: new Date().toISOString()
    });
    // Optionally store raw in notes if short
    if (rawJson && rawJson.length < 2000) {
      // already passed notes
    }
    U.toast('Added to case: ' + active.title, 'success');
    // Refresh active case select if needed
    if (typeof window.refreshActiveCaseSelect === 'function') {
      window.refreshActiveCaseSelect();
    }
  }

  return {
    renderDorks,
    renderEmail,
    renderIP,
    renderDNS,
    renderDiscord,
    renderUsername,
    renderTelegram,
    renderURL,
    renderHash,
    renderWhois,
    renderPhone,
    renderName,
    addToCase
  };
})();
