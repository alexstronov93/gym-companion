// History of sessions, progress charts per exercise, weekly cardio.
import { EXERCISES } from './exercises.gen.js';
import * as P from './program.js';
import { db, iso, weekDays, cardioMinutes } from './store.js';
import { h, openSheet, exTitle, fmtDate } from './ui.js';

const PAIN = { none: 'Без боли', light: 'Лёгкая боль', strong: 'Сильная боль' };
const SVG = 'http://www.w3.org/2000/svg';
const s = (tag, attrs = {}, text) => {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (text != null) el.textContent = text;
  return el;
};
const num = (v) => Number(String(v ?? '').replace(',', '.')) || 0;
let selected = null;
const RANK = { strength: 0, core: 1, warmup: 2 };

const setText = (st) => (st.w ? `${st.w}×${st.r || '—'}` : st.r ? `${st.r}` : '✓');

/** [{ date, value, sets }] for one exercise; value = top weight, else total reps, else sets done */
function series(ex) {
  const rows = [];
  for (const sess of db().sessions) {
    // one point per session: the main slot (strength > core > warmup), e.g. the bridge is both warm-up and a lift
    const it = sess.items.filter((x) => x.ex === ex && x.status !== 'stopped' && x.sets.some((st) => st.done))
      .sort((a, b) => RANK[a.section] - RANK[b.section])[0];
    if (it) rows.push({ date: sess.date, done: it.sets.filter((x) => x.done), rx: it.rx });
  }
  const hasW = rows.some((r) => r.done.some((x) => num(x.w) > 0));
  const hasR = rows.some((r) => r.done.some((x) => num(x.r) > 0));
  const unit = hasW ? 'кг, лучший подход' : hasR ? 'повторов за тренировку' : 'подходов';
  return { unit, points: rows.map((r) => ({ date: r.date, sets: r.done,
    value: hasW ? Math.max(...r.done.map((x) => num(x.w))) : hasR ? r.done.reduce((a, x) => a + num(x.r), 0) : r.done.length })) };
}

function lineChart(points) {
  const W = 340, H = 150, L = 34, R = 8, T = 10, B = 24;
  const vals = points.map((p) => p.value);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (lo === hi) { lo -= 1; hi += 1; }
  const x = (i) => L + (points.length === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (points.length - 1));
  const y = (v) => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img',
    'aria-label': `График: от ${vals[0]} до ${vals.at(-1)}` });
  for (const v of [lo, hi]) {
    svg.append(s('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: 'grid' }));
    svg.append(s('text', { x: L - 6, y: y(v) + 4, 'text-anchor': 'end' }, String(+v.toFixed(1))));
  }
  svg.append(s('polyline', { class: 'line', points: points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ') }));
  points.forEach((p, i) => svg.append(s('circle', { class: 'dot', cx: x(i), cy: y(p.value), r: 3.5 })));
  svg.append(s('text', { x: L, y: H - 6 }, fmtDate(points[0].date)));
  if (points.length > 1) svg.append(s('text', { x: W - R, y: H - 6, 'text-anchor': 'end' }, fmtDate(points.at(-1).date)));
  return svg;
}

function cardioChart() {
  const weeks = Array.from({ length: 8 }, (_, i) => weekDays(new Date(Date.now() - (7 - i) * 7 * 86400000)));
  const mins = weeks.map((w) => cardioMinutes(w));
  const W = 340, H = 140, L = 30, B = 22, T = 10;
  const top = Math.max(P.CARDIO_GOAL[1], ...mins);
  const bw = (W - L) / 8;
  const y = (v) => T + (H - T - B) * (1 - v / top);
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': `Кардио по неделям: ${mins.join(', ')} мин` });
  mins.forEach((m, i) => {
    svg.append(s('rect', { class: 'bar', x: L + i * bw + 4, width: bw - 8, y: y(m), height: H - B - y(m), rx: 4, opacity: i === 7 ? 1 : 0.6 }));
    svg.append(s('text', { x: L + i * bw + bw / 2, y: H - 6, 'text-anchor': 'middle' }, fmtDate(iso(weeks[i][0]), { day: 'numeric', month: 'numeric' })));
  });
  svg.append(s('line', { class: 'goal', x1: L, x2: W, y1: y(P.CARDIO_GOAL[0]), y2: y(P.CARDIO_GOAL[0]) }));
  svg.append(s('text', { x: L - 4, y: y(P.CARDIO_GOAL[0]) + 4, 'text-anchor': 'end' }, String(P.CARDIO_GOAL[0])));
  return svg;
}

function sessionSheet(sess) {
  openSheet((close) => h('div', { class: 'stack' },
    h('h2', {}, `${P.DAYS[sess.day]?.title || sess.day} · ${fmtDate(sess.date, { weekday: 'short', day: 'numeric', month: 'long' })}`),
    h('div', {}, h('span', { class: `pain ${sess.pain}` }, PAIN[sess.pain] || '—')),
    h('table', { class: 'log' }, sess.items.map((it) => h('tr', {},
      h('td', {}, it.title || exTitle(it.ex)),
      h('td', {}, it.status === 'stopped' ? 'остановлено: боль'
        : it.sets.filter((x) => x.done).map(setText).join(' · ') || '—')))),
    h('button', { class: 'btn block', onclick: close }, 'Закрыть')));
}

export function History() {
  const sessions = db().sessions;
  // exercises with logged sets, main lifts first
  const best = {};
  for (const x of sessions) x.items.forEach((it, i) => {
    if (it.sets.some((st) => st.done)) best[it.ex] = Math.min(best[it.ex] ?? 1e9, (RANK[it.section] ?? 9) * 100 + i);
  });
  const withData = Object.keys(EXERCISES).filter((ex) => ex in best).sort((a, b) => best[a] - best[b]);
  if (!withData.includes(selected)) selected = withData[0] || null;
  const week = weekDays();
  const weekSessions = sessions.filter((x) => week.some((d) => iso(d) === x.date));

  const progress = h('section', { class: 'card' }, h('h2', {}, 'Прогресс по упражнениям'));
  const drawProgress = () => {
    progress.replaceChildren(h('h2', {}, 'Прогресс по упражнениям'));
    if (!selected) { progress.append(h('p', { class: 'muted' }, 'Графики появятся после первых тренировок.')); return; }
    const chips = withData.map((ex) => h('button', { class: 'chip', 'aria-pressed': String(ex === selected),
      onclick: () => { selected = ex; drawProgress(); } }, exTitle(ex)));
    const { unit, points } = series(selected);
    progress.append(h('div', { class: 'chips scroll' }, chips),
      h('div', { class: 'muted small' }, unit),
      lineChart(points),
      h('table', { class: 'log' }, points.slice(-6).reverse().map((p) =>
        h('tr', {}, h('td', {}, fmtDate(p.date)), h('td', {}, p.sets.map(setText).join(' · '))))));
  };
  drawProgress();

  return h('div', {},
    h('h1', {}, 'История'),
    h('section', { class: 'card' },
      h('div', { class: 'row' },
        h('div', { class: 'grow' }, h('div', { class: 'big-num' }, String(weekSessions.length)), h('div', { class: 'muted small' }, 'тренировок на этой неделе')),
        h('div', { class: 'grow' }, h('div', { class: 'big-num' }, String(sessions.length)), h('div', { class: 'muted small' }, 'всего')))),
    progress,
    h('section', { class: 'card' }, h('h2', {}, 'Кардио по неделям, мин'), cardioChart(),
      h('div', { class: 'muted small' }, `Пунктир — минимум ${P.CARDIO_GOAL[0]} мин в неделю.`)),
    h('section', {},
      h('h2', { style: 'margin-top:18px' }, 'Тренировки'),
      sessions.length === 0 && h('p', { class: 'muted' }, 'Пока пусто. Завершённые тренировки появятся здесь.'),
      [...sessions].reverse().slice(0, 60).map((sess) => {
        const sets = sess.items.reduce((a, it) => a + it.sets.filter((x) => x.done).length, 0);
        return h('button', { class: 'sess', onclick: () => sessionSheet(sess) },
          h('div', {}, h('b', {}, P.DAYS[sess.day]?.title || sess.day),
            h('div', { class: 'muted small' }, `${fmtDate(sess.date, { weekday: 'short', day: 'numeric', month: 'long' })} · ${sets} подх.`)),
          h('span', { class: `pain ${sess.pain}` }, PAIN[sess.pain] || '—'));
      })));
}
