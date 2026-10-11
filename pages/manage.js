/**
 * pages/manage.js — Manage page renderer
 *
 * Sections:
 *  1. Activity list with edit / archive controls
 *  2. "Add activity" button → modal form
 *  3. Data export (JSON + CSV) + Data import (JSON) (1.8)
 *  4. Last exported date & 30-day reminder banner (1.8)
 *  5. Danger zone (clear all data)
 */

const PRESET_COLORS = [
  '#6366f1', '#0ea5e9', '#10b981', '#f59e0b',
  '#ec4899', '#8b5cf6', '#14b8a6', '#f97316',
  '#ef4444', '#84cc16', '#06b6d4', '#a78bfa',
];

function renderManagePage(container) {
  const activities = getActivities({ includeArchived: true });
  const active = activities.filter(a => !a.archived);
  const archived = activities.filter(a => a.archived);

  // 1.8: Last exported timestamp & 30-day banner
  const lastExport = getSetting('lastExportDate');
  const todayD = todayStr();
  let showExportReminder = false;
  if (!lastExport) {
    if (_store.entries.length > 10) showExportReminder = true;
  } else {
    const daysSince = Math.floor(
      (new Date(todayD + 'T00:00:00') - new Date(lastExport + 'T00:00:00')) / 86400000
    );
    if (daysSince >= 30) showExportReminder = true;
  }

  const isAnime = window.AnimeEngine && AnimeEngine.isEnabled();
  const legend = isAnime ? AnimeEngine.getLegend() : null;

  const animeManageBanner = isAnime ? `
    <div class="aesthetic-quote-box" style="margin-bottom:var(--space-4)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <span style="font-family:var(--anime-font-sub);font-size:0.75rem;font-weight:700;letter-spacing:0.14em;color:var(--char-accent);text-transform:uppercase">
          ✦ DISCIPLINE ARCHIVES · ${legend.name}
        </span>
        <span style="font-family:'Cinzel',serif;font-size:0.8rem;color:#94a3b8">${legend.kanji}</span>
      </div>
      <p class="aesthetic-quote-text" style="margin-bottom:10px">
        “Structure your daily protocols. A true master cultivates habits with surgical precision and unyielding resolve.”
      </p>
      <button class="aesthetic-cycle-btn" id="anime-presets-btn" style="width:100%;justify-content:center;padding:8px 12px">
        <span>✦</span> Initialize Anime Mastery Disciplines (Infinity Focus, Sun Breathing, Enma Kata)
      </button>
    </div>
  ` : '';

  container.innerHTML = `
    <div class="page" id="manage-page">
      <h1 class="page-title">${isAnime ? 'DISCIPLINE ARCHIVES' : 'Manage'}</h1>

      ${animeManageBanner}

      <!-- Activities -->
      <div class="manage-section">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3)">
          <div class="manage-section-title" style="margin-bottom:0">${isAnime ? 'Active Disciplines' : 'Activities'}</div>
          <button class="btn btn-primary btn-sm" id="add-activity-btn">+ Add</button>
        </div>
        <div id="activity-list-manage">
          ${active.length === 0 ? `
            <div class="empty-state" style="padding:var(--space-8)">
              <div class="empty-state-icon">✦</div>
              <div class="empty-state-text">No activities yet. Add one to get started.</div>
            </div>` :
            active.map(a => renderManageCard(a)).join('')
          }
        </div>
      </div>

      <!-- Archived -->
      ${archived.length > 0 ? `
      <div class="manage-section">
        <div class="manage-section-title">Archived (${archived.length})</div>
        ${archived.map(a => renderManageCard(a, true)).join('')}
      </div>` : ''}

      <!-- 1.8: Data Backup (Export + Import) -->
      <div class="manage-section">
        <div class="manage-section-title">Data Backup</div>
        <div class="metric-card">
          ${showExportReminder ? `
          <div class="nudge-bar" style="margin-bottom:var(--space-4)">
            <span>💾</span>
            <span>It's been over 30 days since your last export. Back up your data to keep your history safe!</span>
          </div>` : ''}

          <p style="font-size:.85rem;color:var(--text-secondary);margin-bottom:var(--space-4);line-height:1.6">
            Export all your activities, schedules, and entries. JSON preserves full structure; CSV is simpler for spreadsheets.
          </p>
          <div class="export-btns" style="display:flex;gap:var(--space-2);flex-wrap:wrap">
            <button class="btn btn-secondary" id="export-json-btn">Download JSON</button>
            <button class="btn btn-secondary" id="export-csv-btn">Download CSV</button>
            <button class="btn btn-secondary" id="import-json-btn">Import JSON</button>
            <input type="file" id="import-json-input" accept=".json" style="display:none" />
          </div>

          <div style="font-size:.75rem;color:var(--text-tertiary);margin-top:var(--space-3)">
            ${lastExport ? `Last exported: ${friendlyDate(lastExport)}` : 'Never exported yet'}
          </div>
        </div>
      </div>

      <!-- Danger zone -->
      <div class="manage-section">
        <div class="manage-section-title" style="color:#ef4444">Danger zone</div>
        <div class="metric-card" style="border-color:color-mix(in srgb, #ef4444 25%, var(--border))">
          <p style="font-size:.85rem;color:var(--text-secondary);margin-bottom:var(--space-4)">
            Permanently delete all data. This cannot be undone.
          </p>
          <button class="btn btn-danger" id="clear-all-btn">Clear all data</button>
        </div>
      </div>
    </div>`;

  attachManageListeners(container);
}

function renderManageCard(act, isArchived = false) {
  const sch = getCurrentSchedule(act.id);
  return `
    <div class="activity-manage-card">
      <div class="activity-manage-row" style="--activity-color:${act.color}">
        <div class="activity-manage-color-dot" style="background:${act.color}"></div>
        <div style="flex:1;min-width:0">
          <div class="activity-manage-name"
            style="${isArchived ? 'opacity:.55' : ''}">${escHtml(act.name)}</div>
          <div class="activity-manage-info">
            ${act.completionType === 'duration' ? `Duration` : 'Simple'} ·
            ${sch ? scheduleLabel(sch) : 'No schedule'}
            ${act.minDuration ? ` · ≥${act.minDuration}m` : ''}
            ${isArchived ? ' · Archived' : ''}
          </div>
        </div>
        <button class="icon-btn" data-action="edit" data-actid="${act.id}" aria-label="Edit ${escHtml(act.name)}">✏️</button>
        ${isArchived
          ? `<button class="icon-btn" data-action="unarchive" data-actid="${act.id}" aria-label="Restore ${escHtml(act.name)}">↩</button>`
          : `<button class="icon-btn" data-action="archive" data-actid="${act.id}" aria-label="Archive ${escHtml(act.name)}">📦</button>`
        }
      </div>
    </div>`;
}

// ── Activity form (create/edit) ───────────────────────────────────────

function openActivityForm(actId = null) {
  const isEdit = actId !== null;
  const act = isEdit ? getActivityById(actId) : null;
  const sch = isEdit ? getCurrentSchedule(actId) : null;

  const title = isEdit ? `Edit — ${act.name}` : 'New activity';

  const curColor = act?.color || PRESET_COLORS[0];
  const curType = act?.completionType || 'simple';
  const curMin  = act?.minDuration || '';
  const schType = sch?.type || 'weekdays';
  const curWeekdays = sch?.weekdays || [1,2,3,4,5];
  const curTimesPerWeek = sch?.timesPerWeek || 3;

  const colorSwatches = PRESET_COLORS.map(c => `
    <div class="color-swatch ${c === curColor ? 'selected' : ''}"
      style="background:${c}" data-color="${c}"></div>`).join('');

  const weekdayNames = ['Su','Mo','Tu','We','Th','Fr','Sa'];
  const weekdayBtns = weekdayNames.map((name, i) => `
    <button type="button" class="weekday-btn ${curWeekdays.includes(i) ? 'selected' : ''}"
      data-day="${i}">${name}</button>`).join('');

  const formHtml = `
    <form id="activity-form" autocomplete="off">
      <div class="form-group">
        <label class="form-label" for="act-name">Name</label>
        <input class="field-input" type="text" id="act-name" name="name"
          value="${escHtml(act?.name || '')}" placeholder="Activity name" maxlength="40" required />
      </div>

      <div class="form-group">
        <div class="form-label">Color</div>
        <div class="color-swatches" id="color-swatches">${colorSwatches}</div>
        <input type="hidden" id="act-color" value="${curColor}" />
      </div>

      <div class="form-group">
        <div class="form-label">Completion type</div>
        <div class="radio-group" id="completion-type-group">
          <button type="button" class="radio-btn ${curType === 'simple' ? 'selected' : ''}" data-ctype="simple">Simple done/not-done</button>
          <button type="button" class="radio-btn ${curType === 'duration' ? 'selected' : ''}" data-ctype="duration">Track duration</button>
        </div>
        <input type="hidden" id="act-completion-type" value="${curType}" />
      </div>

      <div class="form-group" id="min-dur-group" style="display:${curType === 'duration' ? 'flex' : 'none'}">
        <label class="form-label" for="act-min-dur">Min. duration to count as done (minutes)</label>
        <div class="form-row" style="align-items:center">
          <input class="field-input" type="number" id="act-min-dur" name="minDuration"
            value="${curMin}" placeholder="e.g. 30" min="1" max="600" style="width:100px" />
          <span class="field-label">minutes (optional)</span>
        </div>
      </div>

      <div class="form-group">
        <div class="form-label">Schedule</div>
        <div class="radio-group" id="sch-type-group">
          <button type="button" class="radio-btn ${schType === 'weekdays' ? 'selected' : ''}" data-schtype="weekdays">Specific days</button>
          <button type="button" class="radio-btn ${schType === 'times_per_week' ? 'selected' : ''}" data-schtype="times_per_week">X times/week</button>
        </div>
        <input type="hidden" id="act-sch-type" value="${schType}" />
      </div>

      <div class="form-group" id="weekday-group" style="display:${schType === 'weekdays' ? 'flex' : 'none'}">
        <div class="weekday-row" id="weekday-btns">${weekdayBtns}</div>
      </div>

      <div class="form-group" id="times-per-week-group" style="display:${schType === 'times_per_week' ? 'flex' : 'none'}">
        <label class="form-label" for="act-tpw">Times per week</label>
        <div class="form-row" style="align-items:center">
          <input class="field-input" type="number" id="act-tpw" name="timesPerWeek"
            value="${curTimesPerWeek}" min="1" max="7" style="width:80px" />
          <span class="field-label">days</span>
        </div>
      </div>

      <div class="btn-row" style="margin-top:var(--space-4)">
        ${isEdit ? `<button type="button" class="btn btn-danger" id="delete-act-btn" data-actid="${actId}">Archive</button>` : ''}
        <button type="button" class="btn btn-secondary" id="cancel-act-btn">Cancel</button>
        <button type="submit" class="btn btn-primary" id="save-act-btn">${isEdit ? 'Save changes' : 'Create'}</button>
      </div>
    </form>`;

  openModal(title, formHtml, () => renderCurrentPage());
  attachFormListeners(actId);
}

function attachFormListeners(actId) {
  const isEdit = actId !== null;

  // Color swatches
  document.querySelectorAll('.color-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      sw.classList.add('selected');
      document.getElementById('act-color').value = sw.dataset.color;
    });
  });

  // Completion type radio
  document.querySelectorAll('[data-ctype]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-ctype]').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      document.getElementById('act-completion-type').value = btn.dataset.ctype;
      document.getElementById('min-dur-group').style.display =
        btn.dataset.ctype === 'duration' ? 'flex' : 'none';
    });
  });

  // Schedule type radio
  document.querySelectorAll('[data-schtype]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-schtype]').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      document.getElementById('act-sch-type').value = btn.dataset.schtype;
      document.getElementById('weekday-group').style.display =
        btn.dataset.schtype === 'weekdays' ? 'flex' : 'none';
      document.getElementById('times-per-week-group').style.display =
        btn.dataset.schtype === 'times_per_week' ? 'flex' : 'none';
    });
  });

  // Weekday toggle buttons
  document.querySelectorAll('.weekday-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('selected');
    });
  });

  // Cancel
  document.getElementById('cancel-act-btn')?.addEventListener('click', closeModal);

  // Archive
  document.getElementById('delete-act-btn')?.addEventListener('click', () => {
    if (confirm('Archive this activity? It will be hidden from Today but history is preserved.')) {
      archiveActivity(actId);
      closeModal();
      renderCurrentPage();
    }
  });

  // Submit
  document.getElementById('activity-form')?.addEventListener('submit', e => {
    e.preventDefault();
    saveActivityForm(actId);
  });

  document.getElementById('save-act-btn')?.addEventListener('click', e => {
    const form = document.getElementById('activity-form');
    if (form && form.reportValidity()) {
      e.preventDefault();
      saveActivityForm(actId);
    }
  });
}

function saveActivityForm(actId) {
  const isEdit = actId !== null;
  const name = document.getElementById('act-name').value.trim();
  const color = document.getElementById('act-color').value;
  const completionType = document.getElementById('act-completion-type').value;
  const minDurRaw = document.getElementById('act-min-dur')?.value;
  const minDuration = minDurRaw ? parseInt(minDurRaw, 10) : null;

  const schType = document.getElementById('act-sch-type').value;
  let weekdays = null;
  let timesPerWeek = null;

  if (schType === 'weekdays') {
    weekdays = [...document.querySelectorAll('.weekday-btn.selected')]
      .map(b => parseInt(b.dataset.day, 10));
    if (weekdays.length === 0) { alert('Select at least one day.'); return; }
  } else {
    timesPerWeek = parseInt(document.getElementById('act-tpw').value, 10) || 3;
  }

  if (!name) { alert('Please enter an activity name.'); return; }

  let finalActId = actId;
  if (isEdit) {
    updateActivity(actId, { name, color, completionType, minDuration: minDuration || null });
  } else {
    const newAct = createActivity({ name, color, completionType, minDuration: minDuration || null });
    finalActId = newAct.id;
  }

  // Version schedule and threshold (1.6 & 1.7)
  setSchedule(finalActId, { type: schType, weekdays, timesPerWeek, minDurationAtTime: minDuration || null });

  closeModal();
  renderCurrentPage();
}

// ── Manage listeners ──────────────────────────────────────────────────

function attachManageListeners(container) {
  // Add activity
  container.querySelector('#add-activity-btn')?.addEventListener('click', () => {
    openActivityForm(null);
  });

  // Anime starter quests preset button
  container.querySelector('#anime-presets-btn')?.addEventListener('click', () => {
    const existing = getActivities({ includeArchived: true }).map(a => a.name.toLowerCase());
    const presets = [
      { name: "✦ Domain Expansion: Deep Work", color: "#00f0ff", completionType: "duration", minDuration: 50, schedule: { type: "weekdays", weekdays: [1,2,3,4,5] } },
      { name: "✦ Sun Breathing: Physical Mastery", color: "#ef4444", completionType: "duration", minDuration: 30, schedule: { type: "weekdays", weekdays: [0,1,2,3,4,5,6] } },
      { name: "✦ Enma Kata: Strength & Resolve", color: "#10b981", completionType: "duration", minDuration: 30, schedule: { type: "weekdays", weekdays: [0,1,2,3,4,5,6] } },
      { name: "✦ Sage Meditation: Mind Clarity", color: "#f59e0b", completionType: "duration", minDuration: 20, schedule: { type: "weekdays", weekdays: [0,1,2,3,4,5,6] } }
    ];

    let addedCount = 0;
    presets.forEach(p => {
      const simplified = p.name.slice(2).trim().toLowerCase();
      if (!existing.some(e => e.includes(simplified))) {
        createActivity({
          name: p.name,
          color: p.color,
          completionType: p.completionType,
          minDuration: p.minDuration || null,
          schedule: p.schedule
        });
        addedCount++;
      }
    });

    if (window.AnimeEngine && AnimeEngine.isEnabled()) {
      AnimeEngine.burst();
      AnimeEngine.playSound('success');
    }
    alert(addedCount > 0 ? `✦ Initialized ${addedCount} Anime Mastery Disciplines!` : `Your anime mastery disciplines are already active.`);
    renderCurrentPage();
  });

  // Edit buttons
  container.querySelectorAll('[data-action="edit"]').forEach(btn => {
    btn.addEventListener('click', () => openActivityForm(btn.dataset.actid));
  });

  // Archive buttons
  container.querySelectorAll('[data-action="archive"]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Archive this activity?')) {
        archiveActivity(btn.dataset.actid, true);
        renderCurrentPage();
      }
    });
  });

  // Unarchive
  container.querySelectorAll('[data-action="unarchive"]').forEach(btn => {
    btn.addEventListener('click', () => {
      archiveActivity(btn.dataset.actid, false);
      renderCurrentPage();
    });
  });

  // Export JSON
  container.querySelector('#export-json-btn')?.addEventListener('click', () => {
    const dateStr = todayStr();
    downloadFile(`daily-tracker-${dateStr}.json`, exportJSON(), 'application/json');
    renderCurrentPage();
  });

  // Export CSV
  container.querySelector('#export-csv-btn')?.addEventListener('click', () => {
    const dateStr = todayStr();
    downloadFile(`daily-tracker-${dateStr}.csv`, exportCSV(), 'text/csv');
    renderCurrentPage();
  });

  // 1.8: Import JSON
  const importInput = container.querySelector('#import-json-input');
  container.querySelector('#import-json-btn')?.addEventListener('click', () => {
    importInput?.click();
  });

  importInput?.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      const content = evt.target?.result;
      if (typeof content !== 'string') return;

      if (!confirm('Replace all current tracker data with the contents of this file?')) {
        importInput.value = '';
        return;
      }

      const res = importJSON(content);
      if (res.ok) {
        showMilestoneToast({ name: 'Data Imported', color: '#10b981' }, 100);
        const toast = document.getElementById('dt-milestone-toast');
        if (toast) toast.innerHTML = `✓ Backup successfully restored!`;
        renderCurrentPage();
      } else {
        alert(`Import failed: ${res.error}`);
      }
      importInput.value = '';
    };
    reader.readAsText(file);
  });

  // Clear all
  container.querySelector('#clear-all-btn')?.addEventListener('click', () => {
    if (confirm('Delete ALL data? This cannot be undone.')) {
      clearSampleData();
      renderCurrentPage();
    }
  });
}
