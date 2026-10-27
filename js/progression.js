// Load progression: only suggestions, the decision is always the user's.
import { db, save, iso } from './store.js';
import { TEXT, range } from './program.js';

const DAY = 86400000;
const mondayOf = (dateIso) => {
  const d = new Date(`${dateIso}T12:00:00`);
  return iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)));
};
const progress = () => (db().progress ||= {});

/** Latest finished session with strong pain within `days`, or null. */
export function recentStrongPain(days = 14) {
  const cutoff = iso(new Date(Date.now() - days * DAY));
  return db().sessions.filter((s) => s.pain === 'strong' && s.date >= cutoff).at(-1) || null;
}

const sameRx = (a, b) => !!a && a.sets === b.sets && String(a.reps) === String(b.reps) && String(a.hold) === String(b.hold);
const num = (v) => (v === '' || v == null ? NaN : Number(String(v).replace(',', '.')));

/**
 * Suggest +1 rep or +2–5 % weight when the exercise was fully completed without pain
 * in 2–3 consecutive weeks (counted after the last accepted change). Null otherwise.
 */
export function suggestion(ex, rx) {
  if (recentStrongPain()) return null;
  const pr = progress()[ex] || {};
  if (pr.dismissedAt && Date.now() - pr.dismissedAt < 7 * DAY) return null;

  const entries = [];
  for (const s of db().sessions) {
    if (pr.acceptedAt && s.finishedAt <= pr.acceptedAt) continue;
    for (const it of s.items) if (it.ex === ex && sameRx(it.rx, rx)) entries.push({ s, it });
  }
  if (!entries.length) return null;

  // trailing run of consecutive calendar weeks that contain this exercise
  const weeks = [...new Set(entries.map((e) => mondayOf(e.s.date)))].sort();
  let run = 1;
  for (let i = weeks.length - 1; i > 0 && run < 3; i--) {
    if (new Date(weeks[i]) - new Date(weeks[i - 1]) === 7 * DAY) run++;
    else break;
  }
  const lastWeek = weeks.at(-1);
  if (run < 2 || Date.now() - new Date(`${lastWeek}T00:00:00`) > 14 * DAY) return null;
  const inRun = entries.filter((e) => weeks.slice(-run).includes(mondayOf(e.s.date)));
  const clean = inRun.every(({ s, it }) => s.pain === 'none' && it.status !== 'stopped'
    && it.sets.filter((x) => !x.extra).every((x) => x.done));
  if (!clean) return null;

  const last = inRun.at(-1).it;
  const done = last.sets.filter((x) => x.done);
  if (rx.hold) return { text: 'Попробуй держать удержание на 1–2 с дольше.', weeks: run };
  const reps = done.map((x) => num(x.r)).filter((v) => v > 0);
  const minReps = reps.length ? Math.min(...reps) : rx.reps[1];
  const weight = Math.max(0, ...done.map((x) => num(x.w)).filter((v) => v > 0));
  const weighted = TEXT[ex]?.weighted && !rx.noWeight && weight > 0;

  if (weighted && minReps >= rx.reps[1]) {
    const step = weight < 20 ? 0.5 : 1;
    let next = Math.round((weight * 1.04) / step) * step;
    if (next <= weight) next = weight + step;
    const pct = Math.round(((next - weight) / weight) * 100);
    return { text: `+2–5% веса: ${weight} → ${next} кг (≈+${pct}%) или ближайший вес, который есть в зале; повторы снова ${range(rx.reps)}.`, weight: next, weeks: run };
  }
  const target = minReps + 1;
  return { text: `+1 повтор: целься в ${target} в каждом подходе${weighted ? ` с весом ${weight} кг` : ''}.`, reps: target, weeks: run };
}

export function acceptSuggestion(ex) {
  progress()[ex] = { ...progress()[ex], acceptedAt: Date.now() };
  save();
}

export function dismissSuggestion(ex) {
  progress()[ex] = { ...progress()[ex], dismissedAt: Date.now() };
  save();
}
