/**
 * pages/insights.js — Insights + Weekly Summary page
 *
 * Requirements:
 *  - Historical calculations include archived activities (1.7)
 *  - Rename "Time this week" to "Last 7 days" (2.3)
 *  - Headline note: "Excludes skipped days from rate" (2.4)
 *  - Streak hero (overall + best) at the top of Insights page (3.5)
 *  - Show 🔥 next to current streaks in the streak table (3.5)
 */

let _insightsPeriod = 30; // days

function renderInsightsPage(container) {
  // Use all activities for historical calculations (1.7)
  const allActivities = getActivities({ includeArchived: true });
  const activeActivities = getActivities({ includeArchived: false });
  const todayD = todayStr();

  // ── Overall streak hero (3.5) ──
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
  if (curStreak >= 30) subline = "A month of consistency.";
  else if (curStreak >= 7) subline = "A full week. Don't break the chain.";
  else if (curStreak >= 1) subline = "Keep it going!";

  // ── Overall headline rate ──
  // Count done/expected across all activities for the period
  let totalExpected = 0;
  let totalDone = 0;
  for (const a of allActivities) {
    const r = completionRate(a.id, _insightsPeriod, a.minDuration);
    totalExpected += r.expected;
    totalDone += r.done;
  }
  const overallRate = totalExpected > 0 ? totalDone / totalExpected : 0;

  // ── Per-activity bars ──
  const rateBars = allActivities.map(a => {
    const r = completionRate(a.id, _insightsPeriod, a.minDuration);
    if (r.expected === 0) return '';
    return `
      <div class="rate-bar-row">
        <div class="rate-bar-name" style="color:${a.color}">
          ${escHtml(a.name)}
          ${a.archived ? `<span class="badge" style="margin-left:4px">Archived</span>` : ''}
        </div>
        <div class="rate-bar-track">
          <div class="rate-bar-fill" style="width:${Math.round(r.rate * 100)}%;background:${a.color}"></div>
        </div>
        <div class="rate-bar-pct">${pct(r.rate)}</div>
      </div>`;
  }).filter(Boolean).join('');

  // ── Streaks table (3.5: show 🔥 next to current streaks) ──
  const streakRows = allActivities.map(a => {
    const { current, best, unit } = computeStreak(a.id, a.minDuration);
    const streakDisplay = current > 0 ? `🔥 ${current}${unit === 'wk' ? ' wk' : ''}` : '–';
    const bestDisplay = best > 0 ? `${best}${unit === 'wk' ? ' wk' : ''}` : '0';

    return `
      <div class="streak-item">
        <div>
          <div class="streak-name">
            ${escHtml(a.name)}
            ${a.archived ? `<span class="badge" style="margin-left:4px">Archived</span>` : ''}
          </div>
        </div>
        <div class="streak-values">
          <div>
            <div class="streak-num" style="font-size:1rem">${streakDisplay}</div>
            <div class="streak-sub">Current</div>
          </div>
          <div>
            <div class="streak-num" style="font-size:1rem;color:var(--text-tertiary)">${bestDisplay}</div>
            <div class="streak-sub">Best</div>
          </div>
        </div>
      </div>`;
  }).join('');

  // ── Time spent (duration activities, last 7 days) (2.3) ──
  const durationActs = allActivities.filter(a => a.completionType === 'duration');
  const maxTime = durationActs.reduce((mx, a) => Math.max(mx, totalDuration(a.id, 7)), 0);
  const timeRows = durationActs.map(a => {
    const mins = totalDuration(a.id, 7);
    if (mins === 0 && a.archived) return '';
    const barW = maxTime > 0 ? Math.round((mins / maxTime) * 100) : 0;
    return `
      <div class="time-chart-row">
        <div class="time-chart-label">
          ${escHtml(a.name)}
          ${a.archived ? `<span class="badge" style="margin-left:4px">Archived</span>` : ''}
        </div>
        <div class="time-chart-bar-wrap">
          <div class="time-chart-bar" style="width:${barW}%;background:${a.color}"></div>
        </div>
        <div class="time-chart-value">${fmtMinutes(mins)}</div>
      </div>`;
  }).filter(Boolean).join('');

  // ── Weekly target hit rate (active times_per_week activities) ──
  const weeklyRows = activeActivities.map(a => {
    const hit = weeklyTargetHit(a.id, a.minDuration);
    if (!hit) return '';
    const done = hit.achieved;
    const target = hit.target;
    const onTrack = done >= target;
    return `
      <div class="streak-item">
        <div>
          <div class="streak-name">${escHtml(a.name)}</div>
          <div class="streak-sub" style="margin-top:2px">${done}/${target} this week</div>
        </div>
        <div style="font-size:1.5rem">${onTrack ? '✓' : '·'}</div>
      </div>`;
  }).filter(Boolean).join('');

  // ── Weekly summary section ──
  const wk = weekKeyFor(todayD);
  const reflection = getReflection(wk);
  const weeklyProgRows = renderWeeklyProgressRows(activeActivities, todayD);

  // ── Aesthetic Mastery & Spiritual Energy Analysis ──
  const isAnime = window.AnimeEngine && AnimeEngine.isEnabled();
  let animePowerCard = '';
  if (isAnime) {
    const powerLvl = AnimeEngine.getPowerLevel(allActivities, _store.entries);
    const rankInfo = AnimeEngine.getRank(curStreak, overallRate);
    const legend = AnimeEngine.getLegend();
    animePowerCard = `
      <div class="aesthetic-mastery-card">
        <div class="aesthetic-mastery-header">
          <div class="aesthetic-mastery-title">✦ SPIRITUAL DISCIPLINE & MASTERY INDEX</div>
          <span class="aesthetic-mastery-tier">${rankInfo.tier}</span>
        </div>
        <div class="aesthetic-mastery-number-row">
          <div class="aesthetic-mastery-value">${powerLvl.toLocaleString()}</div>
          <div class="aesthetic-mastery-label">${rankInfo.aura}</div>
        </div>
        <div style="font-family:'Cinzel',serif;font-size:0.85rem;color:var(--char-accent);margin-bottom:8px">
          ${legend.name} · ${rankInfo.series}
        </div>
        <p style="font-size:0.82rem;color:#94a3b8;line-height:1.5">${rankInfo.desc}</p>
        <div class="aesthetic-mastery-ranks">
          <div class="aesthetic-rank-box">
            <div class="aesthetic-rank-label">Current Mastery Rank</div>
            <div class="aesthetic-rank-name" style="color:var(--char-accent)">${rankInfo.rankName}</div>
          </div>
          <div class="aesthetic-rank-box">
            <div class="aesthetic-rank-label">Active Discipline Aura</div>
            <div class="aesthetic-rank-name">${rankInfo.aura}</div>
          </div>
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="page" id="insights-page">
      <h1 class="page-title">${isAnime ? 'MASTERY ANALYTICS' : 'Insights'}</h1>

      ${animePowerCard}

      <!-- 3.5 Streak Hero Card at top of Insights -->
      <div class="streak-hero ${curStreak >= 7 ? 'streak-hero--active' : ''}" style="margin-bottom:var(--space-6)">
        <div class="streak-hero-header">
          <div class="streak-hero-main">
            <span class="streak-hero-count">${fireIcons}${curStreak}</span>
            <span class="streak-hero-label">day streak</span>
          </div>
          <div class="streak-hero-best">Best: ${overallStreak.best} 🏆</div>
        </div>
        <p class="streak-hero-sub">${subline}</p>
      </div>

      <div class="period-toggle">
        ${[7, 30, 90].map(p => `
          <button class="period-btn ${_insightsPeriod === p ? 'active' : ''}" data-period="${p}">
            ${p}d
          </button>`).join('')}
      </div>

      <!-- Headline -->
      <div class="insights-section">
        <div class="metric-cards">
          <div class="metric-card">
            <div class="metric-value">${pct(overallRate)}</div>
            <div class="metric-label">Completion rate</div>
            <div class="metric-sub">Last ${_insightsPeriod} days</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${totalDone}</div>
            <div class="metric-label">Activities done</div>
            <div class="metric-sub">out of ${totalExpected} expected</div>
          </div>
        </div>
        <!-- 2.4 Note explaining skipped exclusion -->
        <div style="font-size:.75rem;color:var(--text-tertiary);margin-top:var(--space-2);text-align:right">
          Excludes skipped days from rate
        </div>
      </div>

      <!-- Per-activity completion -->
      <div class="insights-section">
        <div class="insights-section-title">Completion by activity</div>
        <div class="metric-card metric-card--wide" style="padding: var(--space-3) var(--space-4)">
          ${rateBars || '<div class="empty-state-text" style="color:var(--text-tertiary);font-size:.85rem;padding:12px 0">No data yet</div>'}
        </div>
      </div>

      <!-- Streaks -->
      <div class="insights-section">
        <div class="insights-section-title">Streaks</div>
        <div class="metric-card metric-card--wide" style="padding: var(--space-2) var(--space-4)">
          ${streakRows || '<div style="color:var(--text-tertiary);font-size:.85rem;padding:12px 0">No streaks yet</div>'}
        </div>
      </div>

      <!-- Weekly target -->
      ${weeklyRows ? `
      <div class="insights-section">
        <div class="insights-section-title">Weekly targets (this week)</div>
        <div class="metric-card metric-card--wide" style="padding: var(--space-2) var(--space-4)">
          ${weeklyRows}
        </div>
      </div>` : ''}

      <!-- Time spent: renamed to Last 7 days (2.3) -->
      ${timeRows ? `
      <div class="insights-section">
        <div class="insights-section-title">Last 7 days (time spent)</div>
        <div class="metric-card metric-card--wide" style="padding: var(--space-4)">
          <div class="time-chart">
            ${timeRows}
          </div>
        </div>
      </div>` : ''}

      <!-- Weekly summary -->
      <div class="insights-section">
        <div class="insights-section-title">This week's summary</div>
        <div class="metric-card metric-card--wide" style="padding: var(--space-4)">
          ${weeklyProgRows}
          <div style="margin-top:var(--space-4)">
            <div class="form-label" style="margin-bottom:8px">Reflection — what got in the way?</div>
            <textarea class="reflection-box" id="reflection-text" placeholder="Optional note about this week…" maxlength="500">${escHtml(reflection?.text || '')}</textarea>
            <div style="text-align:right;margin-top:6px">
              <button class="btn btn-secondary btn-sm" id="save-reflection-btn">Save note</button>
            </div>
          </div>
        </div>
      </div>

    </div>`;

  attachInsightsListeners(container, todayD, wk);
}

/** Weekly progress rows: activity vs weekly target */
function renderWeeklyProgressRows(activities, todayD) {
  return activities.map(a => {
    const sch = getCurrentSchedule(a.id);
    if (!sch) return '';

    const weekDates = currentWeekDates().filter(d => d <= todayD);
    let target, achieved = 0;

    if (sch.type === 'weekdays') {
      const expectedDays = weekDates.filter(d => sch.weekdays.includes(dow(d)));
      target = expectedDays.length;
      achieved = expectedDays.filter(d => {
        const st = resolveState(a.id, d, a.minDuration);
        return st === 'done' || st === 'partial';
      }).length;
    } else {
      target = sch.timesPerWeek;
      achieved = weekDates.filter(d => {
        const st = resolveState(a.id, d, a.minDuration);
        return st === 'done' || st === 'partial';
      }).length;
    }

    if (target === 0) return '';
    const rate = achieved / target;

    return `
      <div class="weekly-progress-row">
        <div class="weekly-prog-name" style="color:${a.color}">${escHtml(a.name)}</div>
        <div class="weekly-prog-bar">
          <div class="rate-bar-track">
            <div class="rate-bar-fill" style="width:${Math.min(100, Math.round(rate * 100))}%;background:${a.color}"></div>
          </div>
        </div>
        <div class="weekly-prog-count">${achieved}/${target}</div>
      </div>`;
  }).join('');
}

function attachInsightsListeners(container, todayD, wk) {
  // Period toggle
  container.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _insightsPeriod = parseInt(btn.dataset.period, 10);
      renderCurrentPage();
    });
  });

  // Save reflection
  container.querySelector('#save-reflection-btn')?.addEventListener('click', () => {
    const text = document.getElementById('reflection-text')?.value || '';
    upsertReflection(wk, text);
    const btn = container.querySelector('#save-reflection-btn');
    if (btn) {
      btn.textContent = 'Saved ✓';
      setTimeout(() => { btn.textContent = 'Save note'; }, 1800);
    }
  });
}
