/**
 * utils.js — Shared utilities and computed statistics
 *
 * All streak and rate calculations live here.
 * Functions are pure (take data as arguments, return values).
 * Called fresh on every render — never cached or stored.
 */

// ── Date helpers ────────────────────────────────────────────────────

/** Returns YYYY-MM-DD for today */
function today() { return todayStr(); }

/** Returns array of YYYY-MM-DD strings for the last N days (incl. today) */
function lastNDays(n) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    days.push(shiftDate(todayStr(), -i));
  }
  return days;
}

/**
 * Returns all YYYY-MM-DD dates in a calendar year.
 * Uses fmtDate (local getters) to avoid UTC-shift bug (1.1).
 */
function datesInYear(year) {
  const dates = [];
  const cur = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  while (cur <= end) {
    dates.push(fmtDate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

/** Day-of-week as 0=Sun…6=Sat */
function dow(dateStr) {
  return new Date(dateStr + 'T00:00:00').getDay();
}

/** Short weekday name */
function shortDow(dateStr) {
  return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dow(dateStr)];
}

/** Format date as "Mon, Oct 11" */
function friendlyDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * weekKeyFor(dateStr) — canonical ISO week key "YYYY-Www" (Monday-based).
 */
function weekKeyFor(dateStr) {
  const monStr = weekStart(dateStr);
  const mon = new Date(monStr + 'T00:00:00');
  const jan4 = new Date(mon.getFullYear(), 0, 4);
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const weekNum = Math.round((mon - startOfWeek1) / 604800000) + 1;
  return `${mon.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * weekStart(dateStr) — returns the Monday of the ISO week containing dateStr.
 */
function weekStart(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0=Sun
  const diff = (day === 0) ? -6 : 1 - day; // move to Monday
  d.setDate(d.getDate() + diff);
  return fmtDate(d);
}

/** End (Sunday) of the ISO week */
function weekEnd(dateStr) {
  return shiftDate(weekStart(dateStr), 6);
}

/** Array of 7 dates (Mon–Sun) for the week containing dateStr */
function weekDates(dateStr) {
  const mon = weekStart(dateStr);
  return Array.from({ length: 7 }, (_, i) => shiftDate(mon, i));
}

/** Array of 7 dates (Mon–Sun) for current week */
function currentWeekDates() {
  return weekDates(todayStr());
}

// ── Schedule helpers ────────────────────────────────────────────────

/**
 * isExpectedOnDate(activityId, dateStr)
 *
 * Returns true if the activity's schedule includes this date:
 * - 'weekdays': true if the date's day-of-week is in schedule.weekdays
 * - 'times_per_week': true for any date within the valid schedule window
 * (2.8: Note: for calendar month dots and day-detail modal, times_per_week is checked for entry existence)
 */
function isExpectedOnDate(activityId, dateStr) {
  const sch = getScheduleForDate(activityId, dateStr);
  if (!sch) return false;
  if (sch.type === 'weekdays') {
    return sch.weekdays.includes(dow(dateStr));
  }
  return true;
}

/** Humanised schedule description */
function scheduleLabel(sch) {
  if (!sch) return 'No schedule';
  if (sch.type === 'weekdays') {
    const names = ['Su','Mo','Tu','We','Th','Fr','Sa'];
    return sch.weekdays.map(d => names[d]).join(' · ');
  }
  return `${sch.timesPerWeek}× per week`;
}

// ── Completion state helpers ────────────────────────────────────────

/**
 * resolveState(activityId, dateStr, minDuration)
 *
 * Returns the effective state for a (date, activity) pair.
 * 1.6: Uses getScheduleForDate(activityId, dateStr)?.minDurationAtTime when defined
 * (falls back to passed minDuration for legacy data without the field).
 */
function resolveState(activityId, dateStr, minDuration) {
  const entry = getEntry(dateStr, activityId);
  const todayD = todayStr();
  const sch = getScheduleForDate(activityId, dateStr);

  const effectiveMinDur = (sch && sch.minDurationAtTime !== undefined && sch.minDurationAtTime !== null)
    ? sch.minDurationAtTime
    : minDuration;

  if (entry) {
    // Auto-partial: duration logged but below minimum threshold
    if (
      entry.state === 'done' &&
      effectiveMinDur !== null &&
      entry.duration !== null &&
      entry.duration < effectiveMinDur
    ) {
      return 'partial';
    }
    return entry.state;
  }

  // No entry
  if (!sch) return null;

  if (sch.type === 'times_per_week') {
    // Unlogged past days for TPW are rest days, not missed (1.3)
    if (dateStr < todayD) return null;
    return 'pending'; // today: show so user can log
  }

  // weekdays type
  if (!sch.weekdays.includes(dow(dateStr))) return null;
  if (dateStr < todayD) return 'missed';
  return 'pending';
}

// ── Streak computation ──────────────────────────────────────────────

/**
 * computeStreak(activityId, minDuration)
 * Returns: { current: number, best: number, unit: 'day' | 'wk' }
 */
function computeStreak(activityId, minDuration) {
  const sch = getCurrentSchedule(activityId);

  if (sch && sch.type === 'times_per_week') {
    return computeWeeklyStreak(activityId, minDuration, sch);
  }

  return computeDayStreak(activityId, minDuration);
}

/** Day-based streak for 'weekdays' activities */
function computeDayStreak(activityId, minDuration) {
  const todayD = todayStr();

  const schStart = _store.schedules
    .filter(s => s.activityId === activityId)
    .map(s => s.validFrom)
    .sort()[0];

  if (!schStart) return { current: 0, best: 0, unit: 'day' };

  // Build ordered list of days when activity was expected, up to today
  const allDates = [];
  const cur = new Date(schStart + 'T00:00:00');
  const todayDate = new Date(todayD + 'T00:00:00');
  while (cur <= todayDate) {
    const ds = fmtDate(cur);
    const sch = getScheduleForDate(activityId, ds);
    if (sch && sch.type === 'weekdays' && sch.weekdays.includes(cur.getDay())) {
      allDates.push(ds);
    }
    cur.setDate(cur.getDate() + 1);
  }

  // Compute best streak (oldest → newest)
  let best = 0;
  let run = 0;
  for (const ds of allDates) {
    const state = resolveState(activityId, ds, minDuration);
    if (state === 'done' || state === 'partial') {
      run++;
      if (run > best) best = run;
    } else if (state === 'skipped') {
      // pause: don't increment, don't reset
    } else {
      run = 0; // missed or null
    }
  }

  // Compute current streak (newest → oldest)
  run = 0;
  for (let i = allDates.length - 1; i >= 0; i--) {
    const state = resolveState(activityId, allDates[i], minDuration);
    if (state === 'done' || state === 'partial') {
      run++;
    } else if (state === 'skipped') {
      continue; // pause
    } else if (state === 'pending') {
      continue; // today not yet logged
    } else {
      break; // missed → streak ends
    }
  }

  return { current: run, best, unit: 'day' };
}

/**
 * Weekly streak for 'times_per_week' activities (1.3 & 2.2).
 * If this week's target is already met, include the current week in current/best.
 * If it is not yet met, do not break the streak (the week is in progress).
 */
function computeWeeklyStreak(activityId, minDuration, sch) {
  const todayD = todayStr();
  const target = sch.timesPerWeek;

  const schStart = _store.schedules
    .filter(s => s.activityId === activityId)
    .map(s => s.validFrom)
    .sort()[0];

  if (!schStart) return { current: 0, best: 0, unit: 'wk' };

  // Collect completed weeks (Mon–Sun) from schStart through last completed week
  const currentWeekMon = weekStart(todayD);
  const weeks = [];
  let cur = weekStart(schStart);
  while (cur < currentWeekMon) {
    const sun = shiftDate(cur, 6);
    weeks.push({ mon: cur, sun });
    cur = shiftDate(cur, 7);
  }

  // For each completed week compute whether achieved >= target
  const results = weeks.map(({ mon, sun }) => {
    let achieved = 0;
    let d = mon;
    while (d <= sun) {
      const st = resolveState(activityId, d, minDuration);
      if (st === 'done' || st === 'partial') achieved++;
      d = shiftDate(d, 1);
    }
    return achieved >= target;
  });

  // Current week progress (2.2)
  let currentWeekAchieved = 0;
  let dCur = currentWeekMon;
  while (dCur <= todayD) {
    const st = resolveState(activityId, dCur, minDuration);
    if (st === 'done' || st === 'partial') currentWeekAchieved++;
    dCur = shiftDate(dCur, 1);
  }
  const currentWeekMet = currentWeekAchieved >= target;

  // Best streak
  const sequenceForBest = currentWeekMet ? [...results, true] : results;
  let best = 0, tempRun = 0;
  for (const hit of sequenceForBest) {
    if (hit) {
      tempRun++;
      if (tempRun > best) best = tempRun;
    } else {
      tempRun = 0;
    }
  }

  // Current streak (newest → oldest)
  let run = 0;
  if (currentWeekMet) {
    run = 1;
    for (let i = results.length - 1; i >= 0; i--) {
      if (results[i]) run++;
      else break;
    }
  } else {
    // Current week not yet met: do not break the streak (week is in progress)
    for (let i = results.length - 1; i >= 0; i--) {
      if (results[i]) run++;
      else break;
    }
  }

  return { current: run, best, unit: 'wk' };
}

// ── Completion rate ─────────────────────────────────────────────────

function completionRate(activityId, days, minDuration) {
  const sch = getCurrentSchedule(activityId);

  if (sch && sch.type === 'times_per_week') {
    return completionRateTPW(activityId, days, minDuration, sch);
  }

  return completionRateWeekdays(activityId, days, minDuration);
}

function completionRateWeekdays(activityId, days, minDuration) {
  const todayD = todayStr();
  const startDate = shiftDate(todayD, -(days - 1));
  let expected = 0;
  let done = 0;

  const cur = new Date(startDate + 'T00:00:00');
  const todayDate = new Date(todayD + 'T00:00:00');
  while (cur <= todayDate) {
    const ds = fmtDate(cur);
    const sch = getScheduleForDate(activityId, ds);
    if (sch && sch.type === 'weekdays' && sch.weekdays.includes(cur.getDay())) {
      const state = resolveState(activityId, ds, minDuration);
      // 2.9: Do not count today in expected unless it has been logged
      if (ds === todayD && state === 'pending') {
        cur.setDate(cur.getDate() + 1);
        continue;
      }
      // 2.4: Exclude 'skipped' from denominator
      if (state === 'skipped') {
        cur.setDate(cur.getDate() + 1);
        continue;
      }
      expected++;
      if (state === 'done' || state === 'partial') done++;
    }
    cur.setDate(cur.getDate() + 1);
  }

  return { done, expected, rate: expected > 0 ? done / expected : 0 };
}

function completionRateTPW(activityId, days, minDuration, sch) {
  const todayD = todayStr();
  const startDate = shiftDate(todayD, -(days - 1));
  const target = sch.timesPerWeek;
  let totalExpected = 0;
  let totalDone = 0;

  let weekMon = weekStart(startDate);
  const curWeekMon = weekStart(todayD);

  while (weekMon <= curWeekMon) {
    const weekSun = shiftDate(weekMon, 6);
    const periodStart = weekMon < startDate ? startDate : weekMon;
    const periodEnd = weekSun > todayD ? todayD : weekSun;

    let achieved = 0;
    let d = periodStart;
    while (d <= periodEnd) {
      const st = resolveState(activityId, d, minDuration);
      if (st === 'done' || st === 'partial') achieved++;
      d = shiftDate(d, 1);
    }

    const daysInWindow = Math.round((new Date(periodEnd + 'T00:00:00') -
                          new Date(periodStart + 'T00:00:00')) / 86400000) + 1;
    const weekTarget = Math.round(target * (daysInWindow / 7));

    if (weekTarget > 0) {
      totalExpected += weekTarget;
      totalDone += Math.min(achieved, weekTarget);
    }

    weekMon = shiftDate(weekMon, 7);
  }

  return { done: totalDone, expected: totalExpected, rate: totalExpected > 0 ? totalDone / totalExpected : 0 };
}

// ── Weekly target hit rate ──────────────────────────────────────────

function weeklyTargetHit(activityId, minDuration) {
  const todayD = todayStr();
  const sch = getCurrentSchedule(activityId);
  if (!sch || sch.type !== 'times_per_week') return null;

  const target = sch.timesPerWeek;
  const weekDates = currentWeekDates().filter(d => d <= todayD);
  let achieved = 0;

  for (const ds of weekDates) {
    const state = resolveState(activityId, ds, minDuration);
    if (state === 'done' || state === 'partial') achieved++;
  }

  return { target, achieved, weekKey: weekKeyFor(todayD) };
}

// ── Time spent ─────────────────────────────────────────────────────

function totalDuration(activityId, days) {
  const todayD = todayStr();
  const startDate = shiftDate(todayD, -(days - 1));
  return getEntriesForActivity(activityId)
    .filter(e => e.date >= startDate && e.date <= todayD && e.duration)
    .reduce((sum, e) => sum + e.duration, 0);
}

// ── Day-level summary for calendar ─────────────────────────────────

function dayOverallState(dateStr, activityFilter = null) {
  const activities = getActivities({ includeArchived: true });
  let totalExpected = 0;
  let doneCount = 0;
  let skippedCount = 0;
  let pendingCount = 0;
  let missedCount = 0;

  for (const act of activities) {
    if (activityFilter && act.id !== activityFilter) continue;
    const sch = getScheduleForDate(act.id, dateStr);
    if (!sch) continue;

    if (sch.type === 'times_per_week') {
      const entry = getEntry(dateStr, act.id);
      if (!entry) continue; // rest day — don't count as expected
    } else {
      if (!sch.weekdays.includes(dow(dateStr))) continue;
    }

    totalExpected++;
    const state = resolveState(act.id, dateStr, act.minDuration);
    if (state === 'done' || state === 'partial') doneCount++;
    else if (state === 'skipped') skippedCount++;
    else if (state === 'pending') pendingCount++;
    else missedCount++;
  }

  if (totalExpected === 0) return null;
  if (doneCount === totalExpected) return 'done';
  if (doneCount > 0) return 'partial';
  if (skippedCount === totalExpected) return 'skipped';
  if (pendingCount > 0) return 'pending';
  return 'missed';
}

// ── Overall streak (3.1 & 1.4) ───────────────────────────────────────

/**
 * computeOverallStreak()
 * 1.4: dayGate() returns 'carry' when all activities are skipped.
 * Returns 'done' only if at least one activity is done/partial and the rest are done/partial/skipped.
 */
function computeOverallStreak() {
  const todayD = todayStr();
  const weekdayActs = getActivities({ includeArchived: false })
    .filter(a => {
      const sch = getCurrentSchedule(a.id);
      return sch && sch.type === 'weekdays';
    });

  if (weekdayActs.length === 0) return { current: 0, best: 0 };

  let earliest = todayD;
  for (const a of weekdayActs) {
    const schStart = _store.schedules
      .filter(s => s.activityId === a.id)
      .map(s => s.validFrom)
      .sort()[0];
    if (schStart && schStart < earliest) earliest = schStart;
  }

  const allDays = [];
  const cur = new Date(earliest + 'T00:00:00');
  const todayDate = new Date(todayD + 'T00:00:00');
  while (cur <= todayDate) {
    allDays.push(fmtDate(cur));
    cur.setDate(cur.getDate() + 1);
  }

  function dayGate(ds) {
    let anyExpected = false;
    let allDoneOrSkip = true;
    let anyMissed = false;
    let anyPending = false;
    let anyDone = false;

    for (const a of weekdayActs) {
      const sch = getScheduleForDate(a.id, ds);
      if (!sch || sch.type !== 'weekdays') continue;
      if (!sch.weekdays.includes(dow(ds))) continue;
      anyExpected = true;
      const st = resolveState(a.id, ds, a.minDuration);
      if (st === 'done' || st === 'partial') { anyDone = true; }
      else if (st === 'skipped') { /* allowed */ }
      else if (st === 'pending') { anyPending = true; allDoneOrSkip = false; }
      else { anyMissed = true; allDoneOrSkip = false; }
    }
    if (!anyExpected) return 'rest';
    if (anyMissed) return 'missed';
    if (anyPending) return 'pending';
    if (allDoneOrSkip) {
      if (anyDone) return 'done';
      return 'carry'; // 1.4: all skipped -> streak unchanged, carry
    }
    return 'missed';
  }

  // Compute best streak
  let best = 0, run = 0;
  for (const ds of allDays) {
    const g = dayGate(ds);
    if (g === 'done') {
      run++;
      if (run > best) best = run;
    } else if (g === 'rest' || g === 'carry') {
      // carry: streak unchanged
    } else {
      run = 0;
    }
  }

  // Compute current streak (newest → oldest)
  run = 0;
  for (let i = allDays.length - 1; i >= 0; i--) {
    const g = dayGate(allDays[i]);
    if (g === 'done') run++;
    else if (g === 'rest' || g === 'carry') continue;
    else if (g === 'pending') continue;
    else break;
  }

  return { current: run, best };
}

// ── Modal system ────────────────────────────────────────────────────

let _onModalClose = null;
let _modalFocusTrigger = null;

function openModal(title, bodyHTML, onClose = null) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('hidden');
  _onModalClose = onClose;
  _modalFocusTrigger = document.activeElement;
  requestAnimationFrame(() => {
    const focusable = document.getElementById('modal-box')
      .querySelector('button, input, textarea, select, [tabindex]:not([tabindex="-1"])');
    if (focusable) focusable.focus();
  });
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  if (_onModalClose) { _onModalClose(); _onModalClose = null; }
  if (_modalFocusTrigger) {
    try { _modalFocusTrigger.focus(); } catch {}
    _modalFocusTrigger = null;
  }
}

function initModalFocusTrap() {
  document.getElementById('modal-overlay').addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const box = document.getElementById('modal-box');
    const focusable = [...box.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )];
    if (focusable.length === 0) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
}

// ── Tooltip ──────────────────────────────────────────────────────────

let _tooltip = null;
function showTooltip(text, x, y) {
  if (!_tooltip) {
    _tooltip = document.createElement('div');
    _tooltip.className = 'tooltip';
    document.body.appendChild(_tooltip);
  }
  _tooltip.textContent = text;
  _tooltip.style.left = `${x + 8}px`;
  _tooltip.style.top  = `${y - 28}px`;
  _tooltip.classList.add('visible');
}
function hideTooltip() {
  if (_tooltip) _tooltip.classList.remove('visible');
}

// ── Download helper (2.7: iOS safe) ──────────────────────────────────
function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Format helpers ──────────────────────────────────────────────────
function fmtMinutes(min) {
  if (!min) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function pct(rate) {
  return `${Math.round(rate * 100)}%`;
}

/**
 * escHtml — escape HTML special characters (2.6).
 * Coerces with String(str) and handles null/undefined.
 */
function escHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Milestone toasts (1.3) ───────────────────────────────────────────

const DAILY_MILESTONES = [7, 14, 30, 50, 100];
const WEEKLY_MILESTONES = [2, 4, 8, 12, 26, 52];

/**
 * checkMilestones(activities)
 * 1.3: Finds highest threshold <= current streak that is > highestShown.
 * Shows exactly ONE toast for it and records it. Uses streak.unit.
 */
function checkMilestones(activities) {
  const shown = getSetting('milestonesShown') || {};
  let updated = false;

  for (const a of activities) {
    const { current, unit } = computeStreak(a.id, a.minDuration);
    const highestShown = shown[a.id] || 0;
    const thresholds = unit === 'wk' ? WEEKLY_MILESTONES : DAILY_MILESTONES;

    const eligible = thresholds.filter(t => current >= t && t > highestShown);
    if (eligible.length > 0) {
      const highest = eligible[eligible.length - 1];
      showMilestoneToast(a, highest, unit);
      shown[a.id] = highest;
      updated = true;
      break;
    }
  }

  if (updated) setSetting('milestonesShown', shown);
}

function showMilestoneToast(act, threshold, unit = 'day') {
  const id = 'dt-milestone-toast';
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    el.style.cssText = [
      'position:fixed', 'bottom:80px', 'left:50%', 'transform:translateX(-50%)',
      'background:var(--surface-raised)', 'border:1px solid var(--border)',
      'padding:12px 20px', 'border-radius:14px', 'font-size:.9rem', 'font-weight:600',
      'z-index:9998', 'box-shadow:var(--shadow-lg)',
      'max-width:90vw', 'text-align:center',
      'color:var(--text-primary)', 'animation:slideUp .25s ease',
    ].join(';');
    document.body.appendChild(el);
  }
  const unitText = unit === 'wk' ? 'week' : 'day';
  el.innerHTML = `🔥 ${threshold} ${unitText} streak on <span style="color:${act.color}">${escHtml(act.name)}</span>!`;
  el.style.display = 'block';
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.style.display = 'none'; }, 4500);
}
