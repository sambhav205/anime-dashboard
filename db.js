/**
 * db.js — Data layer for Daily Activity Tracker
 *
 * All data lives in localStorage under the key "dt_v1".
 * Shape: { activities, schedules, entries, weeklyReflections, settings }
 *
 * Key rule: NEVER store computed values (streaks, percentages).
 * All stats are derived from entries[] at read time.
 */

const DB_KEY = 'dt_v1';

// ─── In-memory entry index: Map<"date|actId", Entry> ─────────────────
// Rebuilt after every mutateStore call. Speeds up getEntry in O(1).
let _entryIndex = new Map();

function _rebuildIndex(store) {
  _entryIndex = new Map();
  if (!store || !store.entries) return;
  for (const e of store.entries) {
    if (e.state === 'pending') continue;
    _entryIndex.set(`${e.date}|${e.activityId}`, e);
  }
}

// ─── Default/empty store shape ─────────────────────────────────────
function emptyStore() {
  return {
    activities: [],
    schedules: [],
    entries: [],
    weeklyReflections: [],
    settings: {
      theme: 'system',
    },
  };
}

// ─── Load / save ──────────────────────────────────────────────────
function loadStore() {
  let raw;
  try {
    raw = localStorage.getItem(DB_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw);
    // Migrate: remove any stored 'pending' entries so old data is clean
    if (parsed.entries) {
      parsed.entries = parsed.entries.filter(e => e.state !== 'pending');
    }
    return parsed;
  } catch {
    // 1.8: Backup corrupt data before discarding
    if (raw) {
      try { localStorage.setItem(DB_KEY + '_corrupt_backup', raw); } catch {}
    }
    sessionStorage.setItem('dt_corrupt_warning', '1');
    return emptyStore();
  }
}

function saveStore(store) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(store));
  } catch (e) {
    showErrorToast('⚠️ Storage full or unavailable — data could not be saved.');
  }
}

/** Show a brief error toast at the top of the screen */
function showErrorToast(msg) {
  const id = 'dt-error-toast';
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    el.style.cssText = [
      'position:fixed', 'top:60px', 'left:50%', 'transform:translateX(-50%)',
      'background:#ef4444', 'color:#fff', 'padding:10px 18px',
      'border-radius:8px', 'font-size:.85rem', 'font-weight:600',
      'z-index:9999', 'box-shadow:0 4px 12px rgba(0,0,0,.3)',
      'max-width:90vw', 'text-align:center',
    ].join(';');
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.style.display = 'none'; }, 5000);
}

// Singleton store in memory (re-saved on every write)
let _store = loadStore();
_rebuildIndex(_store);

function getStore() { return _store; }

function mutateStore(fn) {
  fn(_store);
  _rebuildIndex(_store);
  saveStore(_store);
}

// ─── Activity CRUD ─────────────────────────────────────────────────
/**
 * Activity shape:
 * {
 *   id: string,
 *   name: string,
 *   color: string (hex),
 *   completionType: 'simple' | 'duration',
 *   minDuration: number | null,
 *   archived: boolean,
 *   archivedAt: string | null,
 *   createdAt: string (ISO),
 * }
 */
function createActivity(fields) {
  const act = {
    id: uid(),
    name: fields.name,
    color: fields.color || '#6366f1',
    completionType: fields.completionType || 'simple',
    minDuration: fields.minDuration || null,
    archived: false,
    archivedAt: null,
    createdAt: new Date().toISOString(),
  };
  mutateStore(s => s.activities.push(act));
  return act;
}

function updateActivity(id, fields) {
  mutateStore(s => {
    const idx = s.activities.findIndex(a => a.id === id);
    if (idx === -1) return;
    Object.assign(s.activities[idx], fields);
  });
}

/**
 * 1.1: ARCHIVING BREAKS HISTORY
 * - On archive: close the activity's open schedule (validUntil = todayStr()) and set archivedAt = todayStr()
 * - On unarchive: clear archived, and open a NEW schedule from today with the same type,
 *   weekdays and timesPerWeek as the most recently closed one (and the activity's current minDuration).
 */
function archiveActivity(id, archived = true) {
  const today = todayStr();
  const act = getActivityById(id);
  if (!act) return;

  if (archived) {
    mutateStore(s => {
      const a = s.activities.find(item => item.id === id);
      if (a) {
        a.archived = true;
        a.archivedAt = today;
      }
      const openSch = s.schedules.find(sch => sch.activityId === id && sch.validUntil === null);
      if (openSch) {
        openSch.validUntil = today;
      }
    });
  } else {
    mutateStore(s => {
      const a = s.activities.find(item => item.id === id);
      if (a) {
        a.archived = false;
        a.archivedAt = null;
      }
      // Most recently closed schedule
      const closedSchedules = s.schedules
        .filter(sch => sch.activityId === id)
        .sort((x, y) => (y.validUntil || y.validFrom).localeCompare(x.validUntil || x.validFrom));
      const lastSch = closedSchedules[0];

      if (lastSch) {
        s.schedules.push({
          id: uid(),
          activityId: id,
          type: lastSch.type,
          weekdays: lastSch.weekdays ? [...lastSch.weekdays] : null,
          timesPerWeek: lastSch.timesPerWeek || null,
          validFrom: today,
          validUntil: null,
          minDurationAtTime: a?.minDuration || null,
        });
      }
    });
  }
}

function getActivities({ includeArchived = false } = {}) {
  return _store.activities.filter(a => includeArchived || !a.archived);
}

function getActivityById(id) {
  return _store.activities.find(a => a.id === id);
}

// ─── Schedule CRUD ─────────────────────────────────────────────────
/**
 * Schedule shape:
 * {
 *   id: string,
 *   activityId: string,
 *   type: 'weekdays' | 'times_per_week',
 *   weekdays: number[] | null,
 *   timesPerWeek: number | null,
 *   validFrom: string (YYYY-MM-DD),
 *   validUntil: string | null,
 *   minDurationAtTime: number | null,
 * }
 *
 * 1.6 & 1.7: changing schedule or minDurationAtTime closes the old record (validUntil = yesterday)
 * and opens a new one from today. No-op if identical.
 */
function setSchedule(activityId, fields) {
  const today = todayStr();
  const act = getActivityById(activityId);
  const newMinDuration = fields.minDurationAtTime !== undefined ? fields.minDurationAtTime : (act?.minDuration || null);

  mutateStore(s => {
    const current = s.schedules.find(
      sch => sch.activityId === activityId && sch.validUntil === null
    );

    if (current) {
      const sameType = current.type === fields.type;
      const sameWeekdays = JSON.stringify((current.weekdays || []).slice().sort()) ===
                           JSON.stringify((fields.weekdays || []).slice().sort());
      const sameTPW = current.timesPerWeek === (fields.timesPerWeek || null);
      const sameMinDur = (current.minDurationAtTime ?? null) === (newMinDuration ?? null);

      if (sameType && sameWeekdays && sameTPW && sameMinDur) return;

      current.validUntil = yesterday(today);
    }

    s.schedules.push({
      id: uid(),
      activityId,
      type: fields.type,
      weekdays: fields.weekdays ? [...fields.weekdays] : null,
      timesPerWeek: fields.timesPerWeek || null,
      validFrom: today,
      validUntil: null,
      minDurationAtTime: newMinDuration,
    });
  });
}

function getScheduleForDate(activityId, dateStr) {
  return _store.schedules.find(sch =>
    sch.activityId === activityId &&
    sch.validFrom <= dateStr &&
    (sch.validUntil === null || sch.validUntil >= dateStr)
  ) || null;
}

function getCurrentSchedule(activityId) {
  return _store.schedules.find(
    sch => sch.activityId === activityId && sch.validUntil === null
  ) || null;
}

// ─── Entry CRUD ─────────────────────────────────────────────────────
/**
 * Entry shape:
 * {
 *   id: string,
 *   date: string (YYYY-MM-DD),
 *   activityId: string,
 *   state: 'done' | 'partial' | 'skipped' | 'missed',
 *   duration: number | null,
 *   note: string | null,
 *   loggedAt: string (ISO),
 * }
 */
function upsertEntry(date, activityId, fields) {
  if (fields.state === 'pending') {
    deleteEntry(date, activityId);
    return;
  }
  mutateStore(s => {
    const idx = s.entries.findIndex(
      e => e.date === date && e.activityId === activityId
    );
    const entry = {
      id: idx >= 0 ? s.entries[idx].id : uid(),
      date,
      activityId,
      state: fields.state,
      duration: fields.duration !== undefined ? fields.duration : (idx >= 0 ? s.entries[idx].duration : null),
      note: fields.note !== undefined ? fields.note : (idx >= 0 ? s.entries[idx].note : null),
      loggedAt: new Date().toISOString(),
    };
    if (idx >= 0) {
      s.entries[idx] = entry;
    } else {
      s.entries.push(entry);
    }
  });
}

/** Remove an entry completely (1.4) */
function deleteEntry(date, activityId) {
  mutateStore(s => {
    s.entries = s.entries.filter(
      e => !(e.date === date && e.activityId === activityId)
    );
  });
}

function getEntry(date, activityId) {
  return _entryIndex.get(`${date}|${activityId}`) || null;
}

function getEntriesForDate(date) {
  return _store.entries.filter(e => e.date === date && e.state !== 'pending');
}

function getEntriesForActivity(activityId) {
  return _store.entries.filter(e => e.activityId === activityId && e.state !== 'pending');
}

function getEntriesInRange(startDate, endDate) {
  return _store.entries.filter(e =>
    e.date >= startDate && e.date <= endDate && e.state !== 'pending'
  );
}

// ─── Weekly reflections ─────────────────────────────────────────────
function upsertReflection(wk, text) {
  mutateStore(s => {
    const idx = s.weeklyReflections.findIndex(r => r.weekKey === wk);
    if (idx >= 0) {
      s.weeklyReflections[idx].text = text;
    } else {
      s.weeklyReflections.push({ weekKey: wk, text });
    }
  });
}

function getReflection(wk) {
  return _store.weeklyReflections.find(r => r.weekKey === wk) || null;
}

// ─── Settings ──────────────────────────────────────────────────────
function getSetting(key) {
  return _store.settings?.[key];
}

function setSetting(key, value) {
  mutateStore(s => {
    if (!s.settings) s.settings = {};
    s.settings[key] = value;
  });
}

// ─── Helpers ───────────────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/**
 * fmtDate(d) — Format Date as YYYY-MM-DD using local getters (1.1).
 */
function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayStr() {
  return fmtDate(new Date());
}

function yesterday(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  return fmtDate(d);
}

function shiftDate(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return fmtDate(d);
}

// ─── Data export ───────────────────────────────────────────────────
function exportJSON() {
  setSetting('lastExportDate', todayStr());
  return JSON.stringify(_store, null, 2);
}

function csvQuote(val) {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function exportCSV() {
  setSetting('lastExportDate', todayStr());
  const rows = [['date', 'activity', 'state', 'duration_min', 'note'].map(csvQuote)];
  for (const e of _store.entries) {
    if (e.state === 'pending') continue;
    const act = getActivityById(e.activityId);
    rows.push([
      csvQuote(e.date),
      csvQuote(act ? act.name : e.activityId),
      csvQuote(e.state),
      csvQuote(e.duration ?? ''),
      csvQuote(e.note ?? ''),
    ]);
  }
  return rows.map(r => r.join(',')).join('\n');
}

// ─── Data import (2.6) ─────────────────────────────────────────────
/**
 * Strict validation against XSS and corrupt shapes.
 */
function importJSON(jsonStr) {
  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return { ok: false, error: 'Invalid JSON — could not parse file.' };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'Invalid data format — must be a JSON object.' };
  }

  if (!Array.isArray(parsed.activities) ||
      !Array.isArray(parsed.schedules) ||
      !Array.isArray(parsed.entries)) {
    return { ok: false, error: 'Missing required arrays: activities, schedules, entries.' };
  }

  const actIdRegex = /^[a-z0-9]+$/i;
  const colorRegex = /^#[0-9a-f]{6}$/i;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const validActIds = new Set();

  for (const a of parsed.activities) {
    if (!a || typeof a !== 'object') return { ok: false, error: 'Invalid activity entry.' };
    if (typeof a.id !== 'string' || !actIdRegex.test(a.id)) {
      return { ok: false, error: `Invalid activity ID: ${a.id}` };
    }
    if (typeof a.name !== 'string' || a.name.trim().length === 0 || a.name.length > 40) {
      return { ok: false, error: 'Invalid activity name: must be string <= 40 chars.' };
    }
    if (typeof a.color !== 'string' || !colorRegex.test(a.color)) {
      return { ok: false, error: `Invalid color format for activity "${a.name}": must be 6-digit hex (#rrggbb).` };
    }
    if (a.completionType !== 'simple' && a.completionType !== 'duration') {
      return { ok: false, error: `Invalid completionType: must be 'simple' or 'duration'.` };
    }
    if (a.minDuration !== null && a.minDuration !== undefined && (typeof a.minDuration !== 'number' || isNaN(a.minDuration) || a.minDuration < 0)) {
      return { ok: false, error: `Invalid minDuration for activity "${a.name}".` };
    }
    validActIds.add(a.id);
  }

  for (const sch of parsed.schedules) {
    if (!sch || typeof sch !== 'object') return { ok: false, error: 'Invalid schedule entry.' };
    if (!validActIds.has(sch.activityId)) {
      return { ok: false, error: `Schedule references non-existent activityId: ${sch.activityId}` };
    }
    if (sch.type !== 'weekdays' && sch.type !== 'times_per_week') {
      return { ok: false, error: `Invalid schedule type: ${sch.type}` };
    }
    if (sch.type === 'weekdays') {
      if (!Array.isArray(sch.weekdays) || !sch.weekdays.every(d => Number.isInteger(d) && d >= 0 && d <= 6)) {
        return { ok: false, error: 'Schedule weekdays must be an array of integers 0–6.' };
      }
    } else {
      if (sch.weekdays !== null && sch.weekdays !== undefined && !Array.isArray(sch.weekdays)) {
        return { ok: false, error: 'Schedule weekdays must be null or an array.' };
      }
    }
    if (sch.type === 'times_per_week') {
      if (!Number.isInteger(sch.timesPerWeek) || sch.timesPerWeek < 1 || sch.timesPerWeek > 7) {
        return { ok: false, error: 'Schedule timesPerWeek must be an integer between 1 and 7.' };
      }
    } else {
      if (sch.timesPerWeek !== null && sch.timesPerWeek !== undefined && !Number.isInteger(sch.timesPerWeek)) {
        return { ok: false, error: 'Schedule timesPerWeek must be null or integer.' };
      }
    }
    if (typeof sch.validFrom !== 'string' || !dateRegex.test(sch.validFrom)) {
      return { ok: false, error: `Invalid validFrom date format: ${sch.validFrom}` };
    }
    if (sch.validUntil !== null && sch.validUntil !== undefined && (typeof sch.validUntil !== 'string' || !dateRegex.test(sch.validUntil))) {
      return { ok: false, error: `Invalid validUntil date format: ${sch.validUntil}` };
    }
  }

  const validStates = new Set(['done', 'partial', 'skipped', 'missed']);
  for (const e of parsed.entries) {
    if (!e || typeof e !== 'object') return { ok: false, error: 'Invalid entry object.' };
    if (typeof e.date !== 'string' || !dateRegex.test(e.date)) {
      return { ok: false, error: `Invalid entry date format: ${e.date}` };
    }
    if (!validActIds.has(e.activityId)) {
      return { ok: false, error: `Entry references non-existent activityId: ${e.activityId}` };
    }
    if (!validStates.has(e.state)) {
      return { ok: false, error: `Invalid entry state: ${e.state}` };
    }
    if (e.duration !== null && e.duration !== undefined && (typeof e.duration !== 'number' || isNaN(e.duration) || e.duration < 0)) {
      return { ok: false, error: `Invalid entry duration: ${e.duration}` };
    }
    if (e.note !== null && e.note !== undefined && (typeof e.note !== 'string' || e.note.length > 120)) {
      return { ok: false, error: 'Invalid entry note: must be string <= 120 chars.' };
    }
  }

  parsed.entries = parsed.entries.filter(e => e.state !== 'pending');
  if (!parsed.settings) parsed.settings = _store.settings || {};
  if (!parsed.weeklyReflections) parsed.weeklyReflections = [];

  _store = parsed;
  _rebuildIndex(_store);

  // 1.3: Set milestonesShown to the highest threshold already reached so old streaks don't fire toasts
  if (!_store.settings.milestonesShown) _store.settings.milestonesShown = {};
  for (const a of _store.activities) {
    if (typeof computeStreak === 'function') {
      const st = computeStreak(a.id, a.minDuration);
      const thresholds = st.unit === 'wk' ? [2, 4, 8, 12, 26, 52] : [7, 14, 30, 50, 100];
      const reached = thresholds.filter(t => st.current >= t);
      if (reached.length > 0) {
        _store.settings.milestonesShown[a.id] = reached[reached.length - 1];
      }
    }
  }

  saveStore(_store);
  return { ok: true };
}

// ─── Sample data seeding ───────────────────────────────────────────
/**
 * 1.2: If settings.seeded is set, return.
 * If _store.activities.length > 0, set seeded = true and return.
 */
function seedSampleData() {
  if (getSetting('seeded')) return;
  if (_store.activities.length > 0) {
    setSetting('seeded', true);
    return;
  }

  const ACTIVITIES = [
    { name: 'DSA Practice',    color: '#6366f1', completionType: 'simple',   minDuration: null,
      schedule: { type: 'weekdays', weekdays: [1,2,3,4,5] } },
    { name: 'Web Development', color: '#0ea5e9', completionType: 'duration', minDuration: 45,
      schedule: { type: 'weekdays', weekdays: [1,2,3,4,5] } },
    { name: 'College Study',   color: '#10b981', completionType: 'duration', minDuration: 60,
      schedule: { type: 'weekdays', weekdays: [1,2,3,4,5] } },
    { name: 'Gym',             color: '#f59e0b', completionType: 'simple',   minDuration: null,
      schedule: { type: 'times_per_week', timesPerWeek: 4 } },
    { name: 'Project Work',    color: '#ec4899', completionType: 'duration', minDuration: 30,
      schedule: { type: 'weekdays', weekdays: [1,2,3,4,5,6] } },
    { name: 'Revision',        color: '#8b5cf6', completionType: 'simple',   minDuration: null,
      schedule: { type: 'weekdays', weekdays: [1,2,3,4,5] } },
    { name: 'Reading',         color: '#14b8a6', completionType: 'duration', minDuration: 20,
      schedule: { type: 'times_per_week', timesPerWeek: 5 } },
    { name: 'Personal Tasks',  color: '#f97316', completionType: 'simple',   minDuration: null,
      schedule: { type: 'times_per_week', timesPerWeek: 3 } },
  ];

  const actIds = [];
  const today = todayStr();
  const originDate = shiftDate(today, -90);

  for (const def of ACTIVITIES) {
    const act = createActivity({
      name: def.name,
      color: def.color,
      completionType: def.completionType,
      minDuration: def.minDuration,
    });
    actIds.push({ id: act.id, def, minDur: def.minDuration });

    mutateStore(s => {
      s.schedules.push({
        id: uid(),
        activityId: act.id,
        type: def.schedule.type,
        weekdays: def.schedule.weekdays || null,
        timesPerWeek: def.schedule.timesPerWeek || null,
        validFrom: originDate,
        validUntil: null,
        minDurationAtTime: def.minDuration,
      });
    });
  }

  // Seed entries for past 90 days
  for (let d = 0; d < 90; d++) {
    const dateStr = shiftDate(today, -(90 - d));
    const dayOfWeek = new Date(dateStr + 'T00:00:00').getDay();

    for (const { id, def } of actIds) {
      if (def.schedule.type === 'times_per_week') {
        if (Math.random() > (def.schedule.timesPerWeek / 7) * 1.1) continue;
      } else {
        if (!def.schedule.weekdays.includes(dayOfWeek)) continue;
      }

      const roll = Math.random();
      let state, duration = null;

      if (roll < 0.68) {
        state = 'done';
        if (def.completionType === 'duration') {
          const base = def.minDuration || 30;
          duration = Math.round(base + Math.random() * base * 0.8);
        }
      } else if (roll < 0.78) {
        state = 'partial';
        if (def.completionType === 'duration') {
          duration = Math.round((def.minDuration || 30) * 0.6);
        }
      } else if (roll < 0.84) {
        state = 'skipped';
      } else {
        state = 'missed';
      }

      upsertEntry(dateStr, id, { state, duration });
    }
  }

  const wk = weekKeyFor(today);
  upsertReflection(wk, 'Sample reflection: busy week but staying consistent.');

  // 1.3: Set milestonesShown so fake sample streaks never fire toasts
  const milestonesShown = {};
  for (const { id, minDur } of actIds) {
    if (typeof computeStreak === 'function') {
      const st = computeStreak(id, minDur);
      const thresholds = st.unit === 'wk' ? [2, 4, 8, 12, 26, 52] : [7, 14, 30, 50, 100];
      const reached = thresholds.filter(t => st.current >= t);
      if (reached.length > 0) {
        milestonesShown[id] = reached[reached.length - 1];
      }
    }
  }
  setSetting('milestonesShown', milestonesShown);

  setSetting('seeded', true);
  setSetting('sampleDataLoaded', true);
}

function clearSampleData() {
  const theme = getSetting('theme') || 'system';
  const seeded = getSetting('seeded');
  mutateStore(s => {
    s.activities = [];
    s.schedules = [];
    s.entries = [];
    s.weeklyReflections = [];
    s.settings = {
      theme,
      seeded,
      sampleDataLoaded: false,
      milestonesShown: {},
    };
  });
}
