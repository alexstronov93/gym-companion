// All user data lives in localStorage on this device only.

const KEY = 'rovnaya-spina.v1';
const DEFAULTS = {
  version: 1,
  settings: { restStrength: 75, restCore: 40, vibrate: true },
  sessions: [], // finished workouts
  cardio: [], // { date, minutes, type }
  draft: null, // workout in progress
};

let state = load();

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { ...structuredClone(DEFAULTS), ...raw, settings: { ...DEFAULTS.settings, ...(raw.settings || {}) } };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

export const db = () => state;

/** Replace all data (null = reset to defaults). */
export function replaceAll(data) {
  state = data ? { ...structuredClone(DEFAULTS), ...data } : structuredClone(DEFAULTS);
  save();
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('localStorage unavailable', e);
  }
}

// ---- dates (local time, weeks start on Monday) ----
export const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function weekDays(d = new Date()) {
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
}

export const sessionsOn = (date) => state.sessions.filter((s) => s.date === date);

export function cardioMinutes(days) {
  const set = new Set(days.map(iso));
  return state.cardio.filter((c) => set.has(c.date)).reduce((a, c) => a + c.minutes, 0);
}

export function addCardio(minutes, type, date = iso(new Date())) {
  state.cardio.push({ date, minutes, type });
  save();
}

/** Last logged sets for an exercise (most recent finished session that has it). */
export function lastSets(exId) {
  for (let i = state.sessions.length - 1; i >= 0; i--) {
    const item = state.sessions[i].items.find((it) => it.ex === exId && it.sets.some((s) => s.done));
    if (item) return item.sets;
  }
  return null;
}
