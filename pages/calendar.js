/**
 * pages/calendar.js — Calendar page renderer
 *
 * Two views:
 *  1. Year heatmap (GitHub-style) with done/partial/skipped/missed states
 *  2. Monthly calendar with tappable days → detail modal
 *
 * Requirements:
 *  - Filter chips show ONLY active (non-archived) activities (1.7)
 *  - Historical calculations & modal use getActivities({includeArchived:true}) (1.7)
 *  - 2.8: Month view dots & day detail modal include times_per_week ONLY if logged on that day
 *  - 3.3: Removed invalid role="grid" and role="gridcell" from heatmap. Kept role="button" on interactive cells and aria-label on all.
 */

// Module state
let _calYear = new Date().getFullYear();
let _calMonth = new Date().getMonth(); // 0-indexed
let _calFilter = null; // null = all activities; activityId = single

function renderCalendarPage(container) {
  const activeActivities = getActivities({ includeArchived: false });
  const todayD = todayStr();
  const isAnime = window.AnimeEngine && AnimeEngine.isEnabled();

  // Build filter chips HTML
  const chipsHtml = `
    <div class="filter-chips" id="cal-filter-chips">
      <button class="filter-chip ${_calFilter === null ? 'active' : ''}" data-filter="all">All</button>
      ${activeActivities.map(a => `
        <button class="filter-chip ${_calFilter === a.id ? 'active' : ''}"
          data-filter="${a.id}" style="border-left:3px solid ${a.color}">
          ${escHtml(a.name)}
        </button>`).join('')}
    </div>`;

  const legend = isAnime ? AnimeEngine.getLegend() : null;
  const animeVoyageBanner = isAnime ? `
    <div class="aesthetic-quote-box" style="margin-bottom:var(--space-4)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <span style="font-family:var(--anime-font-sub);font-size:0.75rem;font-weight:700;letter-spacing:0.14em;color:var(--char-accent);text-transform:uppercase">
          ✦ VOYAGE CHRONICLES · ${legend.name}
        </span>
        <span style="font-family:'Cinzel',serif;font-size:0.8rem;color:#94a3b8">${legend.kanji}</span>
      </div>
      <p class="aesthetic-quote-text" style="margin-bottom:4px">
        “Every square etched into the chronicle represents an unbroken commitment to your craft. Forge your destiny with relentless consistency.”
      </p>
    </div>
  ` : '';

  container.innerHTML = `
    <div class="page" id="calendar-page">
      <h1 class="page-title">${isAnime ? 'VOYAGE CHRONICLES' : 'Calendar'}</h1>
      <p class="page-subtitle">${isAnime ? `Consistency records under the aura of ${legend.name}` : 'Your activity history at a glance'}</p>

      ${animeVoyageBanner}
      ${chipsHtml}

      <div style="margin-bottom:var(--space-8)">
        <div style="font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--text-tertiary);margin-bottom:var(--space-3)">${isAnime ? `✦ ${_calYear} DISCIPLINE MATRIX` : _calYear}</div>
        ${renderYearHeatmap(_calYear, _calFilter, todayD)}
      </div>

      ${renderMonthCalendar(_calYear, _calMonth, _calFilter, todayD)}
    </div>`;

  attachCalendarListeners(container, todayD);
}

// ── Year heatmap ─────────────────────────────────────────────────────

function renderYearHeatmap(year, filterActId, todayD) {
  const allDates = datesInYear(year);
  const jan1 = new Date(year, 0, 1);
  const startDow = jan1.getDay();

  const cells = [];

  // Pad empty cells before Jan 1
  for (let i = 0; i < startDow; i++) {
    cells.push(`<div class="heatmap-cell" data-state="noexpect" style="grid-column:1;grid-row:${i+1}" aria-hidden="true"></div>`);
  }

  for (let idx = 0; idx < allDates.length; idx++) {
    const ds = allDates[idx];
    const col = Math.floor((idx + startDow) / 7) + 1;
    const row = (idx + startDow) % 7 + 1;

    let state;
    if (ds > todayD) {
      state = 'future';
    } else {
      state = dayOverallState(ds, filterActId) || 'noexpect';
    }

    const label = `${friendlyDate(ds)}: ${state === 'noexpect' ? 'no activities' : state}`;
    const isInteractive = (ds <= todayD && state !== 'noexpect' && state !== 'future');

    // 3.3: Valid ARIA — role="button" only on interactive cells, no role="gridcell"
    cells.push(`<div class="heatmap-cell" data-state="${state}" data-date="${ds}"
      title="${label}" aria-label="${label}"
      ${isInteractive ? 'role="button"' : ''}
      tabindex="${isInteractive ? '0' : '-1'}"
      style="grid-column:${col};grid-row:${row}"></div>`);
  }

  // Month labels
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthLabels = [];
  for (let m = 0; m < 12; m++) {
    const firstOfMonth = new Date(year, m, 1);
    const col = Math.floor((Math.floor((firstOfMonth - jan1) / 86400000) + startDow) / 7) + 1;
    monthLabels.push({ label: months[m], col });
  }

  const labelCells = monthLabels.map(({ label, col }) =>
    `<div class="heatmap-month-label" style="grid-column:${col}">${label}</div>`
  ).join('');

  const dayLabels = ['Su','Mo','Tu','We','Th','Fr','Sa']
    .map((d, i) => i % 2 === 1 ? `<div style="line-height:16px;font-size:.6rem;color:var(--text-tertiary)">${d}</div>` : '<div></div>')
    .join('');

  return `
    <div style="display:flex;gap:4px">
      <div class="heatmap-days">${dayLabels}</div>
      <div style="flex:1;overflow-x:auto">
        <div class="heatmap-months" style="display:grid;grid-template-columns:repeat(53,16px);gap:2px;margin-bottom:4px">
          ${labelCells}
        </div>
        <!-- 3.3: removed invalid role="grid" -->
        <div class="heatmap-grid" id="heatmap-grid">
          ${cells.join('')}
        </div>
      </div>
    </div>
    <div class="heatmap-legend">
      <span style="font-size:.7rem;color:var(--text-tertiary)">Less</span>
      <div class="legend-item"><div class="legend-dot" style="background:var(--state-pending);border:1px solid var(--border)"></div> <span>No entry</span></div>
      <div class="legend-item"><div class="legend-dot" style="background:var(--state-done)"></div> <span>Done</span></div>
      <div class="legend-item"><div class="legend-dot" style="background:var(--state-partial)"></div> <span>Partial</span></div>
      <div class="legend-item"><div class="legend-dot" style="background:var(--state-skipped)"></div> <span>Skipped</span></div>
      <div class="legend-item"><div class="legend-dot" style="background:var(--gray-300)"></div> <span>Missed</span></div>
      <span style="font-size:.7rem;color:var(--text-tertiary)">More</span>
    </div>`;
}

// ── Monthly calendar ──────────────────────────────────────────────────

function renderMonthCalendar(year, month, filterActId, todayD) {
  const monthNames = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December'];
  const shortDays = ['Su','Mo','Tu','We','Th','Fr','Sa'];

  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay();

  const headers = shortDays.map(d =>
    `<div class="month-cal-header">${d}</div>`).join('');

  const empties = Array.from({ length: startDow }, () =>
    `<div class="month-cal-day month-cal-day--empty" aria-hidden="true"></div>`).join('');

  const allActivities = getActivities({ includeArchived: true });

  const dayCells = [];
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const ds = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const isToday = ds === todayD;
    const isFuture = ds > todayD;

    let stateClass = '';
    let dotsHtml = '';

    if (!isFuture) {
      const overallState = dayOverallState(ds, filterActId);
      if (overallState) stateClass = `month-cal-day--${overallState}`;

      // 2.8: Include times_per_week activity ONLY if logged that day
      const relevant = allActivities.filter(a => {
        if (filterActId && a.id !== filterActId) return false;
        const sch = getScheduleForDate(a.id, ds);
        if (!sch) return false;
        if (sch.type === 'times_per_week') {
          return Boolean(getEntry(ds, a.id));
        }
        return sch.weekdays.includes(dow(ds));
      }).slice(0, 5);

      const dotColors = relevant.map(a => {
        const st = resolveState(a.id, ds, a.minDuration);
        const dotColor =
          st === 'done'    ? a.color :
          st === 'partial' ? '#f59e0b' :
          st === 'skipped' ? '#8b5cf6' :
          'var(--gray-300)';
        return `<div class="day-state-dot" style="background:${dotColor}"></div>`;
      }).join('');
      dotsHtml = `<div class="day-state-dots">${dotColors}</div>`;
    }

    dayCells.push(`
      <div class="month-cal-day ${stateClass} ${isToday ? 'month-cal-day--today' : ''} ${isFuture ? 'month-cal-day--future' : ''}"
        data-date="${ds}" tabindex="${isFuture ? -1 : 0}" role="button" aria-label="${friendlyDate(ds)}">
        <span>${day}</span>
        ${dotsHtml}
      </div>`);
  }

  return `
    <div class="month-nav">
      <button class="month-nav-btn" id="month-prev" aria-label="Previous month">‹</button>
      <div class="month-nav-label">${monthNames[month]} ${year}</div>
      <button class="month-nav-btn" id="month-next" aria-label="Next month">›</button>
    </div>
    <div class="month-cal-grid">
      ${headers}
      ${empties}
      ${dayCells.join('')}
    </div>`;
}

// ── Day detail modal ──────────────────────────────────────────────────

function openDayDetailModal(dateStr) {
  const activities = getActivities({ includeArchived: true });
  // 2.8: Include times_per_week activity ONLY if it has an entry on this date
  const expected = activities.filter(a => {
    const sch = getScheduleForDate(a.id, dateStr);
    if (!sch) return false;
    if (sch.type === 'times_per_week') {
      return Boolean(getEntry(dateStr, a.id));
    }
    return sch.weekdays.includes(dow(dateStr));
  });

  const todayD = todayStr();
  const isPast = dateStr < todayD;

  if (expected.length === 0) {
    openModal(friendlyDate(dateStr), `
      <p style="color:var(--text-secondary);font-size:.875rem">
        No activities scheduled or logged for this day.
      </p>`);
    return;
  }

  const rows = expected.map(a => {
    const state = resolveState(a.id, dateStr, a.minDuration);
    const entry = getEntry(dateStr, a.id);
    const stateIcon = { done:'✓', partial:'◐', skipped:'⊘', missed:'✕', pending:'○' }[state] || '○';
    const stateColor = { done:'var(--state-done)', partial:'var(--state-partial)', skipped:'var(--state-skipped)', missed:'var(--gray-400)', pending:'var(--text-tertiary)' }[state];

    return `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border-subtle)">
        <div style="width:4px;height:36px;border-radius:4px;background:${a.color};flex-shrink:0"></div>
        <div style="flex:1">
          <div style="font-weight:600;font-size:.9rem">
            ${escHtml(a.name)}
            ${a.archived ? `<span class="badge" style="margin-left:6px">Archived</span>` : ''}
          </div>
          ${entry?.duration ? `<div style="font-size:.75rem;color:var(--text-tertiary)">${fmtMinutes(entry.duration)}</div>` : ''}
          ${entry?.note ? `<div style="font-size:.75rem;color:var(--text-secondary);margin-top:2px;font-style:italic">“${escHtml(entry.note)}”</div>` : ''}
        </div>
        <div style="font-size:1.2rem;color:${stateColor}">${stateIcon}</div>
      </div>`;
  }).join('');

  const editBtn = isPast || dateStr === todayD
    ? `<button class="btn btn-secondary btn-sm" id="day-edit-btn" data-date="${dateStr}">Edit this day</button>`
    : '';

  openModal(
    friendlyDate(dateStr),
    `<div>${rows}</div><div style="margin-top:16px;display:flex;justify-content:flex-end">${editBtn}</div>`,
    () => renderCurrentPage()
  );

  document.getElementById('day-edit-btn')?.addEventListener('click', () => {
    closeModal();
    openBackfillModal(dateStr);
  });
}

// ── Event listeners ──────────────────────────────────────────────────

function attachCalendarListeners(container, todayD) {
  // Filter chips
  container.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      _calFilter = chip.dataset.filter === 'all' ? null : chip.dataset.filter;
      renderCurrentPage();
    });
  });

  // Heatmap cells click & keyboard support
  container.querySelectorAll('.heatmap-cell').forEach(cell => {
    const dateStr = cell.dataset.date;
    if (!dateStr || cell.dataset.state === 'future' || cell.dataset.state === 'noexpect') return;

    cell.addEventListener('click', () => openDayDetailModal(dateStr));
    cell.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openDayDetailModal(dateStr);
      }
    });
    cell.addEventListener('mouseenter', e => showTooltip(cell.title, e.clientX, e.clientY));
    cell.addEventListener('mouseleave', hideTooltip);
  });

  // Monthly calendar day cells
  container.querySelectorAll('.month-cal-day:not(.month-cal-day--empty):not(.month-cal-day--future)').forEach(cell => {
    cell.addEventListener('click', () => openDayDetailModal(cell.dataset.date));
    cell.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openDayDetailModal(cell.dataset.date);
      }
    });
  });

  // Month navigation
  container.querySelector('#month-prev')?.addEventListener('click', () => {
    _calMonth--;
    if (_calMonth < 0) { _calMonth = 11; _calYear--; }
    renderCurrentPage();
  });

  container.querySelector('#month-next')?.addEventListener('click', () => {
    _calMonth++;
    if (_calMonth > 11) { _calMonth = 0; _calYear++; }
    renderCurrentPage();
  });
}
