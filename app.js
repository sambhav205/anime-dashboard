/**
 * app.js — Main application entry point
 *
 * Responsibilities:
 *  1. Theme initialization and toggle
 *  2. Router (which page to show)
 *  3. Modal close wiring
 *  4. First-run: seed sample data
 */

// ── Current page state ───────────────────────────────────────────────
let _currentPage = 'today';
let _lastRenderedDate = todayStr();

// Exposed globally so page modules can trigger re-render
function renderCurrentPage() {
  _lastRenderedDate = todayStr();
  const container = document.getElementById('page-container');
  switch (_currentPage) {
    case 'today':    renderTodayPage(container);    break;
    case 'calendar': renderCalendarPage(container); break;
    case 'insights': renderInsightsPage(container); break;
    case 'manage':   renderManagePage(container);   break;
  }
}

// ── Router ───────────────────────────────────────────────────────────
function navigate(page) {
  _currentPage = page;

  // Update nav button active state
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === page);
  });

  renderCurrentPage();
}

// ── Theme ─────────────────────────────────────────────────────────────
function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light') {
    root.style.colorScheme = 'light';
  } else if (theme === 'dark') {
    root.style.colorScheme = 'dark';
  } else {
    root.style.colorScheme = ''; // system
  }
  // Update icon
  const isDark = theme === 'dark' ||
    (theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.getElementById('theme-icon').textContent = isDark ? '☽' : '☀️';
}

function toggleTheme() {
  const cur = getSetting('theme') || 'system';
  const next = cur === 'system' ? 'dark' : cur === 'dark' ? 'light' : 'system';
  setSetting('theme', next);
  applyTheme(next);
}

// ── Init ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Seed sample data on first launch
  seedSampleData();

  // One-time corrupt data warning (1.8)
  if (sessionStorage.getItem('dt_corrupt_warning')) {
    sessionStorage.removeItem('dt_corrupt_warning');
    showErrorToast('⚠️ Corrupted storage detected and backed up to dt_v1_corrupt_backup. Data reset.');
  }

  // Apply saved theme
  applyTheme(getSetting('theme') || 'system');

  // Initialize Anime Theme Engine (Luffy & Naruto)
  if (window.AnimeEngine && typeof AnimeEngine.init === 'function') {
    AnimeEngine.init();
  }

  // Theme toggle
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

  // Navigation
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.page));
  });

  // Modal close
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  // Modal focus trap (2.7)
  if (typeof initModalFocusTrap === 'function') {
    initModalFocusTrap();
  }

  // System theme change listener
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if ((getSetting('theme') || 'system') === 'system') {
      applyTheme('system');
    }
  });

  // Re-render when tab becomes visible again or date changes (2.2)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const nowD = todayStr();
      if (nowD !== _lastRenderedDate) {
        _lastRenderedDate = nowD;
        renderCurrentPage();
      }
    }
  });

  // Register service worker for offline PWA (2.8)
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js?v=6').catch(() => {});
    });
  }

  // Render initial page
  navigate('today');
});
