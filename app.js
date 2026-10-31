/**
 * AEGIS OPEN ARCHIVE – Main Application Router
 */
(function () {
  const views = {
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Intelligence workspace overview',
      render: (el) => AegisCases.renderDashboard(el)
    },
    cases: {
      title: 'Case Files',
      subtitle: 'Manage investigations and evidence',
      render: (el) => AegisCases.renderCases(el)
    },
    stacker: {
      title: 'Information Stacker',
      subtitle: 'Organize observations into case records',
      render: (el) => AegisCases.renderStacker(el)
    },
    dorks: {
      title: 'Google Dork Generator',
      subtitle: 'Build public search queries',
      render: (el) => AegisTools.renderDorks(el)
    },
    email: {
      title: 'Email / Domain',
      subtitle: 'Format and DNS checks',
      render: (el) => AegisTools.renderEmail(el)
    },
    ip: {
      title: 'IP Intelligence',
      subtitle: 'ASN, ISP, and public network data',
      render: (el) => AegisTools.renderIP(el)
    },
    dns: {
      title: 'DNS Lookup',
      subtitle: 'A, AAAA, MX, TXT, NS, CNAME',
      render: (el) => AegisTools.renderDNS(el)
    },
    discord: {
      title: 'Discord Tools',
      subtitle: 'Snowflake decode & link analysis',
      render: (el) => AegisTools.renderDiscord(el)
    },
    username: {
      title: 'Username Tracker',
      subtitle: 'Public profile evidence',
      render: (el) => AegisTools.renderUsername(el)
    },
    telegram: {
      title: 'Telegram Research',
      subtitle: 'Public channels and posts',
      render: (el) => AegisTools.renderTelegram(el)
    },
    url: {
      title: 'URL Analysis',
      subtitle: 'Structure and parameters',
      render: (el) => AegisTools.renderURL(el)
    },
    hash: {
      title: 'Hash Tools',
      subtitle: 'Evidence integrity hashes',
      render: (el) => AegisTools.renderHash(el)
    },
    whois: {
      title: 'Domain / WHOIS',
      subtitle: 'DNS and public RDAP',
      render: (el) => AegisTools.renderWhois(el)
    },
    phone: {
      title: 'Phone Analysis',
      subtitle: 'Format & country code (public only)',
      render: (el) => AegisTools.renderPhone(el)
    },
    name: {
      title: 'Name Evidence',
      subtitle: 'Record names from case materials',
      render: (el) => AegisTools.renderName(el)
    },
    reporting: {
      title: 'Report Guides',
      subtitle: 'IC3, FBI Tips, platform safety',
      render: (el) => AegisCases.renderReporting(el)
    },
    export: {
      title: 'Export & Reports',
      subtitle: 'JSON download and print/PDF',
      render: (el) => AegisCases.renderExport(el)
    }
  };

  // Add phone & name to sidebar if missing (dynamic for completeness)
  function ensureNavItems() {
    const nav = document.querySelector('.sidebar-nav .nav-section:nth-child(2)');
    if (!nav) return;
    if (!document.querySelector('[data-view="phone"]')) {
      const a1 = document.createElement('a');
      a1.href = '#phone';
      a1.className = 'nav-item';
      a1.dataset.view = 'phone';
      a1.innerHTML = '<span class="nav-icon">☎</span> Phone Analysis';
      nav.appendChild(a1);
    }
    if (!document.querySelector('[data-view="name"]')) {
      const a2 = document.createElement('a');
      a2.href = '#name';
      a2.className = 'nav-item';
      a2.dataset.view = 'name';
      a2.innerHTML = '<span class="nav-icon">☰</span> Name Evidence';
      nav.appendChild(a2);
    }
  }

  function navigateTo(viewId) {
    const view = views[viewId] || views.dashboard;
    document.getElementById('view-title').textContent = view.title;
    document.getElementById('view-subtitle').textContent = view.subtitle;
    document.querySelectorAll('.nav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.view === viewId);
    });
    const content = document.getElementById('content');
    content.innerHTML = '';
    view.render(content);
    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('open');
    // Update hash without jump
    if (location.hash !== '#' + viewId) {
      history.replaceState(null, '', '#' + viewId);
    }
  }

  function refreshActiveCaseSelect() {
    const sel = document.getElementById('active-case-select');
    if (!sel) return;
    const cases = AegisStorage.getCases();
    const activeId = AegisStorage.getActiveCaseId();
    sel.innerHTML = '<option value="">No active case</option>' +
      cases.map(c => `<option value="${c.id}" ${c.id === activeId ? 'selected' : ''}>${AegisUtils.escapeHtml(c.title)}</option>`).join('');
  }

  // Expose for tools / cases
  window.navigateTo = navigateTo;
  window.refreshActiveCaseSelect = refreshActiveCaseSelect;

  function init() {
    ensureNavItems();
    refreshActiveCaseSelect();

    // Nav clicks
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(item.dataset.view);
      });
    });

    // Mobile menu
    document.getElementById('menu-btn')?.addEventListener('click', () => {
      document.getElementById('sidebar').classList.add('open');
    });
    document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
      document.getElementById('sidebar').classList.remove('open');
    });

    // New case button
    document.getElementById('new-case-btn')?.addEventListener('click', () => {
      AegisCases.openNewCaseModal();
    });

    // Active case select
    document.getElementById('active-case-select')?.addEventListener('change', (e) => {
      AegisStorage.setActiveCaseId(e.target.value);
      const current = location.hash.slice(1) || 'dashboard';
      if (['stacker', 'cases', 'export'].includes(current)) {
        navigateTo(current);
      }
    });

    // Initial route
    const hash = (location.hash || '#dashboard').slice(1);
    navigateTo(views[hash] ? hash : 'dashboard');

    window.addEventListener('hashchange', () => {
      const h = location.hash.slice(1);
      if (views[h]) navigateTo(h);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
