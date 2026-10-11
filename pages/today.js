/**
 * pages/today.js — Today page renderer
 *
 * Requirements:
 *  - 1.5: "Log details ▾/▴" toggle button on each activity card (simple & duration)
 *         toggles .visible in place without re-render, sets aria-expanded
 *  - 2.1: times_per_week activities separated into "This week" section;
 *         daily count, progress bar, and risk banner count ONLY weekday activities
 *  - 2.3: quote shuffle passes same context and resets on date change
 *  - 2.4: note input only saves if entry exists; custom duration saves existing or creates done
 *  - 2.5: auto-partial entry tapping Done upgrades duration instead of deleting;
 *         state button deselect checks resolved state
 *  - 3.4: keyboard focus restoration after re-renders
 */

// Module state: set of open log panel keys: `${actId}-${dateStr}` (1.5)
const _openLogPanels = new Set();

// 3.4: Keyboard focus helper
let _lastFocusedSelector = null;

function rememberFocus() {
  const el = document.activeElement;
  if (!el) return;
  if (el.dataset?.actid && el.dataset?.state) {
    _lastFocusedSelector = `[data-actid="${el.dataset.actid}"][data-state="${el.dataset.state}"]`;
  } else if (el.dataset?.actid && el.classList.contains('done-tap')) {
    _lastFocusedSelector = `.done-tap[data-actid="${el.dataset.actid}"]`;
  } else if (el.dataset?.actid && el.classList.contains('log-toggle-btn')) {
    _lastFocusedSelector = `.log-toggle-btn[data-actid="${el.dataset.actid}"]`;
  } else if (el.dataset?.actid && el.classList.contains('streak-chip')) {
    _lastFocusedSelector = `.streak-chip[data-actid="${el.dataset.actid}"]`;
  } else if (el.id) {
    _lastFocusedSelector = `#${el.id}`;
  }
}

function restoreFocus() {
  if (_lastFocusedSelector) {
    const el = document.querySelector(_lastFocusedSelector);
    if (el) el.focus();
    _lastFocusedSelector = null;
  }
}

/**
 * Re-render page while preserving window scroll position and keyboard focus (1.5 & 3.4)
 */
function safeRenderTodayPage() {
  rememberFocus();
  const scrollY = window.scrollY;
  renderCurrentPage();
  window.scrollTo(0, scrollY);
  restoreFocus();
}

function renderTodayPage(container) {
  const todayD = todayStr();
  const activities = getActivities({ includeArchived: false });

  // Check milestones on page render (1.3)
  if (typeof checkMilestones === 'function') {
    checkMilestones(activities);
  }

  // 2.1: Filter to 'weekdays' activities scheduled for today
  const weekdayTodayItems = activities.filter(a => {
    const sch = getCurrentSchedule(a.id);
    return sch && sch.type === 'weekdays' && sch.weekdays.includes(dow(todayD));
  });

  // 2.1: Filter to 'times_per_week' activities (shown in "This week" section)
  const tpwItems = activities.filter(a => {
    const sch = getCurrentSchedule(a.id);
    return sch && sch.type === 'times_per_week';
  });

  // Daily progress counts ONLY weekday activities scheduled today (2.1)
  let doneCount = 0;
  let pendingCount = 0;
  for (const a of weekdayTodayItems) {
    const st = resolveState(a.id, todayD, a.minDuration);
    if (st === 'done' || st === 'partial') doneCount++;
    else if (st === 'pending') pendingCount++;
  }

  const total = weekdayTodayItems.length;
  const rate = total > 0 ? doneCount / total : 0;

  // Check if yesterday had any missed (for nudge and quote mood)
  const yesterday = shiftDate(todayD, -1);
  const yesterdayWeekdayItems = activities.filter(a => {
    const sch = getScheduleForDate(a.id, yesterday);
    return sch && sch.type === 'weekdays' && sch.weekdays.includes(dow(yesterday));
  });
  const yesterdayMissed = yesterdayWeekdayItems.some(a =>
    resolveState(a.id, yesterday, a.minDuration) === 'missed'
  );

  // Overall streak calculation (3.1 & 1.4)
  const overallStreak = typeof computeOverallStreak === 'function'
    ? computeOverallStreak()
    : { current: 0, best: 0 };

  const curStreak = overallStreak.current;
  let fireIcons = '';
  if (curStreak >= 100) fireIcons = '🔥🔥🔥🔥 ';
  else if (curStreak >= 30) fireIcons = '🔥🔥🔥 ';
  else if (curStreak >= 7) fireIcons = '🔥🔥 ';
  else if (curStreak >= 1) fireIcons = '🔥 ';

  let subline = "Start today. One thing counts.";
  if (curStreak >= 30) {
    subline = "A month of consistency.";
  } else if (curStreak >= 7) {
    subline = "A full week. Don't break the chain.";
  } else if (curStreak >= 1) {
    subline = "Keep it going!";
  }

  // Evening streak at risk warning (6pm+ and pending weekday items exist) (2.1)
  const currentHour = new Date().getHours();
  const streakAtRisk = curStreak > 0 && pendingCount > 0 && currentHour >= 18;

  // Motivation quote (3.4 & 2.3)
  const quoteContext = { yesterdayHadGaps: yesterdayMissed, currentStreak: curStreak, dateStr: todayD };
  const quote = typeof getMotivationQuote === 'function'
    ? getMotivationQuote(quoteContext)
    : { text: "Long-term consistency beats short-term intensity.", author: "Daily Tracker" };

  const topAccentColor = activities[0]?.color || '#6366f1';
  const sampleActive = Boolean(getSetting('sampleDataLoaded'));

  // Activity streak chips (3.2)
  const streakChipsHtml = activities.map(a => {
    const st = computeStreak(a.id, a.minDuration);
    const streakDisplay = st.current > 0
      ? `🔥 ${st.current}${st.unit === 'wk' ? ' wk' : ''}`
      : '–';
    return `
      <button class="streak-chip" data-actid="${a.id}" title="${escHtml(a.name)}: ${streakDisplay}">
        <span class="streak-chip-dot" style="background:${a.color}"></span>
        <span class="streak-chip-name">${escHtml(a.name)}</span>
        <span class="streak-chip-count">${streakDisplay}</span>
      </button>
    `;
  }).join('');

  // Aesthetic Anime Mode enhancements (Daily Rotating Famous Legends)
  const isAnime = window.AnimeEngine && AnimeEngine.isEnabled();
  let animeHeroHtml = '';
  let animeQuoteHtml = '';

  if (isAnime) {
    const legend = AnimeEngine.getLegend();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[new Date().getDay()];
    const missionPercent = total ? Math.round(rate * 100) : 100;
    const missionLabel = total
      ? `${doneCount}/${total} Missions Cleared`
      : 'Rest Day · Recover Your Focus';
    animeHeroHtml = `
      <section class="anime-spotlight" aria-label="Anime motivation">
        <video
          class="anime-spotlight-video"
          src="assets/Anime%20video.mp4"
          autoplay muted loop playsinline preload="metadata"
          aria-label="Anime motivation video"
        ></video>
        <div class="anime-spotlight-shade" aria-hidden="true"></div>
        <div class="anime-spotlight-content">
          <div class="anime-spotlight-copy">
            <p class="anime-spotlight-series">${legend.series}</p>
            <blockquote>${legend.quote}</blockquote>
            <p class="anime-spotlight-name">— ${legend.name}</p>
          </div>
          <button class="anime-spotlight-next" id="anime-cycle-btn" title="Show another character" aria-label="Show another character">↻</button>
        </div>
      </section>
    `;
  }

  container.innerHTML = `
    <div class="page" id="today-page">
      ${sampleActive ? `
      <div id="sample-banner">
        <span>📊 Sample data is loaded so you can explore the app.</span>
        <button class="btn btn-sm btn-secondary" id="clear-sample-btn">Clear sample</button>
      </div>` : ''}

      ${animeHeroHtml}

      <!-- 3.1 Streak Hero Card -->
      <div class="streak-hero ${curStreak >= 7 ? 'streak-hero--active' : ''}">
        <div class="streak-hero-header">
          <div class="streak-hero-main">
            <span class="streak-hero-count">${fireIcons}${curStreak}</span>
            <span class="streak-hero-label">day streak</span>
          </div>
          <div class="streak-hero-best">Best: ${overallStreak.best} 🏆</div>
        </div>
        <p class="streak-hero-sub">${subline}</p>
        ${streakAtRisk ? `
        <div class="streak-risk-banner">
          ⚠️ ${pendingCount} ${pendingCount === 1 ? 'activity' : 'activities'} left to keep your streak alive!
        </div>` : ''}
      </div>

      <!-- 3.2 Per-Activity Streak Chips Row -->
      ${activities.length > 0 ? `
      <div class="streak-chips-wrapper">
        <div class="streak-chips-row" id="streak-chips-row">
          ${streakChipsHtml}
        </div>
      </div>` : ''}

      ${yesterdayMissed ? `
      <div class="nudge-bar" style="margin-top:var(--space-3)">
        <span>↗️</span>
        <span>Yesterday had some gaps — back on track today!</span>
      </div>` : ''}

      <div style="margin-top:var(--space-4)">
        <h1 class="page-title">${formatTodayHeading(todayD)}</h1>
        <p class="page-subtitle">${doneCount} of ${total} done today</p>
      </div>

      <div class="progress-line">
        <div class="progress-fill" style="width:${Math.round(rate * 100)}%"></div>
      </div>

      <!-- Motivation Quote Card / Aesthetic Legend Quote -->
      ${isAnime ? animeQuoteHtml : `
      <div class="quote-card" style="border-left: 3px solid ${topAccentColor}">
        <div class="quote-card-body">
          <p class="quote-card-text">“${escHtml(quote.text)}”</p>
          <div class="quote-card-footer">
            <span class="quote-card-author">— ${escHtml(quote.author)}</span>
            <button class="quote-shuffle-btn" id="quote-shuffle-btn" title="Get another quote">↻ New quote</button>
          </div>
        </div>
      </div>`}

      <!-- Today's scheduled activities (weekdays) -->
      <div class="activity-list" id="today-activity-list">
        ${total === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon">✦</div>
            <div class="empty-state-text">No weekday activities scheduled for today.<br>Check <strong>This week</strong> below or go to <strong>Manage</strong>.</div>
          </div>` :
          weekdayTodayItems.map(a => renderActivityCard(a, todayD, false)).join('')
        }
      </div>

      <!-- 2.1: This week section (times_per_week activities) -->
      ${tpwItems.length > 0 ? `
      <div style="margin-top:var(--space-8)">
        <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:var(--space-3)">
          <div style="font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text-tertiary)">This week</div>
          <div style="font-size:.75rem;color:var(--text-tertiary)">Weekly targets</div>
        </div>
        <div class="activity-list" id="tpw-activity-list">
          ${tpwItems.map(a => renderActivityCard(a, todayD, false)).join('')}
        </div>
      </div>` : ''}

      ${(total > 0 || tpwItems.length > 0) ? `
      <div class="backfill-section">
        <div class="backfill-label">Fix a recent day</div>
        <div class="backfill-days" id="backfill-days">
          ${[3,2,1].map(n => {
            const d = shiftDate(todayD, -n);
            return `<button class="backfill-day-btn" data-date="${d}">${friendlyDate(d)}</button>`;
          }).join('')}
        </div>
      </div>` : ''}
    </div>
  `;

  attachTodayListeners(container, todayD, false, '', quoteContext);

  if (window.AnimeEngine && typeof AnimeEngine.mountHeroFX === 'function') {
    AnimeEngine.mountHeroFX();
  }
}

/** Renders a single activity card for a given date */
function renderActivityCard(act, dateStr, isPast, idPrefix = '') {
  const entry = getEntry(dateStr, act.id);
  const state = resolveState(act.id, dateStr, act.minDuration);
  const sch = getCurrentSchedule(act.id);
  const streak = computeStreak(act.id, act.minDuration);

  // 7-day dots (last 7 days before this date)
  const dots = Array.from({ length: 7 }, (_, i) => {
    const d = shiftDate(dateStr, -(7 - i));
    const st = resolveState(act.id, d, act.minDuration);
    const label = `${shortDow(d)}: ${st || 'no entry'}`;
    return `<div class="history-dot" data-state="${st || 'pending'}" data-date="${d}" data-actid="${act.id}" title="${label}"></div>`;
  }).join('');

  // Done-tap checkmark
  const isDone = state === 'done' || state === 'partial';
  const tapClass = isDone ? 'done-tap--done' : '';
  const tapIcon = state === 'done' ? '✓' : state === 'partial' ? '◐' : state === 'skipped' ? '⊘' : '○';

  // State buttons with aria-pressed (2.7)
  const states = [
    { id: 'done',    label: '✓ Done' },
    { id: 'partial', label: '◐ Partial' },
    { id: 'skipped', label: '⊘ Skipped' },
    { id: 'missed',  label: '✕ Missed' },
  ];

  const stateBtns = states.map(s => `
    <button class="state-btn ${state === s.id ? 'state-btn--active' : ''}"
      data-state="${s.id}" data-actid="${act.id}" data-date="${dateStr}"
      aria-pressed="${state === s.id}">
      ${s.label}
    </button>`).join('');

  // Duration shortcuts (shown for duration-type activities)
  const showDuration = act.completionType === 'duration';
  const curDuration = entry?.duration || '';
  const curNote = entry?.note || '';

  // 1.5: Log panel toggle state
  const panelKey = `${act.id}-${dateStr}`;
  const isPanelOpen = _openLogPanels.has(panelKey);
  const panelId = `${idPrefix}log-panel-${act.id}-${dateStr.replace(/-/g, '')}`;

  const pastIndicator = isPast ? `<span class="badge">Past</span>` : '';
  const cardId = `${idPrefix}card-${act.id}`;

  const streakBadge = streak.current > 0
    ? `<span class="activity-streak-tag">🔥 ${streak.current}${streak.unit === 'wk' ? ' wk' : ''}</span>`
    : '';

  // 2.1: If times_per_week, show "X/Y this week" in schedule label
  let scheduleMeta = '';
  if (sch) {
    if (sch.type === 'times_per_week') {
      const hit = weeklyTargetHit(act.id, act.minDuration);
      scheduleMeta = hit ? `${hit.achieved}/${hit.target} this week` : scheduleLabel(sch);
    } else {
      scheduleMeta = scheduleLabel(sch);
    }
  }

  return `
  <div class="activity-card" id="${cardId}" style="--activity-color: ${act.color}">
    <div class="activity-card-inner">
      <div class="activity-card-info">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px;flex-wrap:wrap">
          <div class="activity-name">${escHtml(act.name)}</div>
          ${streakBadge}
          ${pastIndicator}
        </div>
        <div class="activity-meta">
          ${scheduleMeta}
          ${act.minDuration ? ` · ≥ ${act.minDuration}m` : ''}
        </div>
        <div class="state-row">${stateBtns}</div>
        <div class="history-strip" style="margin-top:10px">${dots}</div>
        <div style="margin-top:8px">
          <!-- 1.5: Manual toggle for log details (simple & duration) -->
          <button type="button" class="log-toggle-btn" data-actid="${act.id}" data-date="${dateStr}"
            aria-expanded="${isPanelOpen}">
            Log details ${isPanelOpen ? '▴' : '▾'}
          </button>
        </div>
      </div>
      <button class="done-tap ${tapClass}" data-actid="${act.id}" data-date="${dateStr}"
        aria-label="Toggle done for ${escHtml(act.name)}" style="--activity-color:${act.color}">
        ${tapIcon}
      </button>
    </div>
    <div class="log-panel ${isPanelOpen ? 'visible' : ''}" id="${panelId}">
      <div class="log-panel-title">Log details</div>
      ${showDuration ? `
      <div>
        <div class="form-label" style="margin-bottom:6px">Duration</div>
        <div class="duration-shortcuts">
          ${[30,60,90].map(m => `
            <button class="duration-btn ${curDuration == m ? 'active' : ''}"
              data-dur="${m}" data-actid="${act.id}" data-date="${dateStr}">${m} min</button>`).join('')}
        </div>
        <div class="duration-input-row" style="margin-top:8px">
          <input type="number" class="field-input" placeholder="Custom…" min="1" max="600"
            id="${idPrefix}dur-input-${act.id}" value="${curDuration}"
            data-actid="${act.id}" data-date="${dateStr}" style="width:90px" />
          <span class="field-label">minutes</span>
        </div>
      </div>` : ''}
      <div>
        <div class="form-label" style="margin-bottom:6px">Note <span style="font-weight:400;opacity:.6">(optional)</span></div>
        <input type="text" class="field-input" placeholder="Short note…" maxlength="120"
          id="${idPrefix}note-input-${act.id}" value="${escHtml(curNote)}"
          data-actid="${act.id}" data-date="${dateStr}" />
      </div>
    </div>
  </div>`;
}

function attachTodayListeners(container, targetDate, isModal = false, idPrefix = '', quoteContext = {}) {
  // Clear sample data
  container.querySelector('#clear-sample-btn')?.addEventListener('click', () => {
    if (confirm('Remove all sample data? This cannot be undone.')) {
      clearSampleData();
      safeRenderTodayPage();
    }
  });

  // 2.3: Quote shuffle button passes current context
  container.querySelector('#quote-shuffle-btn')?.addEventListener('click', () => {
    if (typeof nextRandomQuote === 'function') {
      nextRandomQuote(quoteContext);
      safeRenderTodayPage();
    }
  });

  // Aesthetic Anime Cycle Legend button
  container.querySelector('#anime-cycle-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (window.AnimeEngine && typeof AnimeEngine.cycleLegend === 'function') {
      AnimeEngine.cycleLegend();
    }
  });

  // 1.5: Log details manual toggle button (in-place toggle, no re-render)
  container.querySelectorAll('.log-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const { actid, date } = btn.dataset;
      const key = `${actid}-${date}`;
      const panelId = `${idPrefix}log-panel-${actid}-${date.replace(/-/g, '')}`;
      const panel = document.getElementById(panelId);
      if (!panel) return;

      if (_openLogPanels.has(key)) {
        _openLogPanels.delete(key);
        panel.classList.remove('visible');
        btn.textContent = 'Log details ▾';
        btn.setAttribute('aria-expanded', 'false');
      } else {
        _openLogPanels.add(key);
        panel.classList.add('visible');
        btn.textContent = 'Log details ▴';
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // Streak chips click: smooth scroll to card
  container.querySelectorAll('.streak-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const actId = chip.dataset.actid;
      const card = document.getElementById(`card-${actId}`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.remove('highlight-card');
        void card.offsetWidth;
        card.classList.add('highlight-card');
        setTimeout(() => card.classList.remove('highlight-card'), 1500);
      }
    });
  });

  // Done-tap button: toggles done / upgrades auto-partial / deletes entry (2.5)
  container.querySelectorAll('.done-tap').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const actId = btn.dataset.actid;
      const dateStr = btn.dataset.date;
      const act = getActivityById(actId);
      const resolved = resolveState(actId, dateStr, act?.minDuration);

      if (resolved === 'done') {
        // Fully done: toggle off -> deleteEntry
        deleteEntry(dateStr, actId);
        _openLogPanels.delete(`${actId}-${dateStr}`);
      } else if (resolved === 'partial') {
        // 2.5: Auto-partial entry: upgrade duration to minDuration so it stays Done
        const entry = getEntry(dateStr, actId);
        let duration = entry?.duration;
        if (act?.minDuration && (!duration || duration < act.minDuration)) {
          duration = act.minDuration;
        }
        upsertEntry(dateStr, actId, { state: 'done', duration });
        if (window.AnimeEngine && AnimeEngine.isEnabled()) {
          AnimeEngine.burst(e.clientX, e.clientY);
        }
      } else {
        // Pending / skipped / missed: mark done
        upsertEntry(dateStr, actId, { state: 'done' });
        if (act?.completionType === 'duration') {
          _openLogPanels.add(`${actId}-${dateStr}`);
        }
        if (window.AnimeEngine && AnimeEngine.isEnabled()) {
          AnimeEngine.burst(e.clientX, e.clientY);
          // Check if user completed all scheduled items for today
          if (dateStr === todayStr()) {
            const allItems = getActivities({ includeArchived: false }).filter(a => {
              const sch = getCurrentSchedule(a.id);
              return sch && sch.type === 'weekdays' && sch.weekdays.includes(dow(dateStr));
            });
            const remainingPending = allItems.filter(a => a.id !== actId && resolveState(a.id, dateStr, a.minDuration) === 'pending');
            if (remainingPending.length === 0 && allItems.length > 0) {
              setTimeout(() => {
                AnimeEngine.celebrate();
              }, 400);
            }
          }
        }
      }

      if (isModal) {
        refreshBackfillModal(dateStr);
      } else {
        safeRenderTodayPage();
      }
    });
  });

  // State buttons (2.5: deselect compares against resolved state)
  container.querySelectorAll('.state-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const { state, actid, date } = btn.dataset;
      const act = getActivityById(actid);
      const resolved = resolveState(actid, date, act?.minDuration);

      if (resolved === state) {
        // Deselect only if current resolved state matches the clicked button
        deleteEntry(date, actid);
        _openLogPanels.delete(`${actid}-${date}`);
      } else {
        const entry = getEntry(date, actid);
        let duration = entry?.duration;
        // 2.5: If tapping Done on auto-partial, ensure duration is >= minDuration
        if (state === 'done' && act?.minDuration && duration && duration < act.minDuration) {
          duration = act.minDuration;
        }
        upsertEntry(date, actid, { state, duration });
        if (act?.completionType === 'duration' && (state === 'done' || state === 'partial')) {
          _openLogPanels.add(`${actid}-${date}`);
        }
        if (state === 'done' && window.AnimeEngine && AnimeEngine.isEnabled()) {
          AnimeEngine.burst(e.clientX, e.clientY);
        }
      }

      if (isModal) {
        refreshBackfillModal(date);
      } else {
        safeRenderTodayPage();
      }
    });
  });

  // Duration shortcuts
  container.querySelectorAll('.duration-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const { dur, actid, date } = btn.dataset;
      const durVal = parseInt(dur, 10);
      const entry = getEntry(date, actid);
      upsertEntry(date, actid, {
        state: entry?.state || 'done',
        duration: durVal,
      });

      if (isModal) {
        refreshBackfillModal(date);
      } else {
        safeRenderTodayPage();
      }
    });
  });

  // Duration custom input (2.4: only saves if entry exists, otherwise creates done)
  container.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener('change', () => {
      const { actid, date } = input.dataset;
      const durVal = parseInt(input.value, 10);
      if (!isNaN(durVal) && durVal > 0) {
        const entry = getEntry(date, actid);
        upsertEntry(date, actid, {
          state: entry?.state || 'done',
          duration: durVal,
        });
      }
    });
  });

  // 2.4: Note input (only saves if entry exists!)
  let noteTimer;
  container.querySelectorAll(`input[id*="note-input-"]`).forEach(input => {
    input.addEventListener('input', () => {
      clearTimeout(noteTimer);
      const { actid, date } = input.dataset;
      noteTimer = setTimeout(() => {
        const entry = getEntry(date, actid);
        // Do not create an entry if none exists! (2.4)
        if (!entry) return;
        upsertEntry(date, actid, {
          state: entry.state,
          note: input.value,
        });
      }, 500);
    });
  });

  // Backfill day buttons
  container.querySelectorAll('.backfill-day-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openBackfillModal(btn.dataset.date);
    });
  });

  // 7-day dots → click opens backfill
  container.querySelectorAll('.history-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      openBackfillModal(dot.dataset.date);
    });
    dot.addEventListener('mouseenter', e => {
      showTooltip(dot.title, e.clientX, e.clientY);
    });
    dot.addEventListener('mouseleave', hideTooltip);
  });
}

/** Opens a backfill modal for a past date with self-refresh and "m-" prefix (1.6) */
function openBackfillModal(dateStr) {
  openModal(
    `Edit — ${friendlyDate(dateStr)}`,
    renderBackfillModalHTML(dateStr),
    () => safeRenderTodayPage()
  );

  const modalBody = document.getElementById('modal-body');
  attachTodayListeners(modalBody, dateStr, true, 'm-');
}

/** Re-renders the modal content in-place without closing or re-opening (1.6) */
function refreshBackfillModal(dateStr) {
  const modalBody = document.getElementById('modal-body');
  if (!modalBody) return;
  modalBody.innerHTML = renderBackfillModalHTML(dateStr);
  attachTodayListeners(modalBody, dateStr, true, 'm-');
}

/** Helper to generate backfill modal HTML */
function renderBackfillModalHTML(dateStr) {
  const activities = getActivities({ includeArchived: true }).filter(a => isExpectedOnDate(a.id, dateStr));
  if (activities.length === 0) {
    return `<p style="color:var(--text-secondary);font-size:.9rem;padding:var(--space-4) 0">No activities were scheduled for this day.</p>`;
  }
  return `<div class="activity-list">${activities.map(a => renderActivityCard(a, dateStr, true, 'm-')).join('')}</div>`;
}

/** Format heading like "Sunday, October 11" */
function formatTodayHeading(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}
