// Workout flow: exercise cards, sets, rest and hold timers, pain stop, finish + pain question.
import { EXERCISES } from './exercises.gen.js';
import * as P from './program.js';
import { db, save, iso, lastSets } from './store.js';
import { h, icon, ICON, toast, vibrate, openSheet, exTitle, fmtTime, go, render, onLeave, mediaBlock } from './ui.js';
import { suggestion, acceptSuggestion, dismissSuggestion } from './progression.js';

const restEl = document.getElementById('rest');
const restFor = (section) => (section === 'strength' ? db().settings.restStrength : db().settings.restCore);

// ---------- workout ----------
function buildItems(day) {
  const items = [];
  for (const section of P.sessionPlan(day)) {
    for (const rx of section.items) items.push(newItem(rx, section.kind));
  }
  return items;
}

function newItem(rx, section, title) {
  const prev = lastSets(rx.ex);
  const n = rx.sets + (rx.extraSets || 0);
  return {
    ex: rx.ex, section, rx, title: title || rx.title || exTitle(rx.ex), status: 'todo',
    sets: Array.from({ length: n }, (_, i) => ({ w: prev?.[i]?.w ?? prev?.at(-1)?.w ?? '', r: '', done: false, extra: i >= rx.sets })),
  };
}

export function startWorkout(day) {
  const d = db();
  if (d.draft && !confirm(`Уже начата тренировка «${P.DAYS[d.draft.day].title}». Начать новую вместо неё?`)) return;
  d.draft = { id: Date.now().toString(36), day, date: iso(new Date()), startedAt: Date.now(), idx: 0, items: buildItems(day) };
  save();
  go('#/workout');
}

export function discardDraft() {
  if (!confirm('Сбросить начатую тренировку? Отметки подходов не сохранятся.')) return;
  db().draft = null; save(); render();
}

let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator && !wakeLock) wakeLock = await navigator.wakeLock.request('screen');
    if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch { /* not critical */ }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && location.hash.startsWith('#/workout')) { wakeLock = null; keepAwake(true); }
});

export function Workout() {
  const d = db().draft;
  if (!d) { setTimeout(() => go('#/'), 0); return h('div'); }
  const item = d.items[d.idx];
  const total = d.items.length;
  keepAwake(true);
  const data = EXERCISES[item.ex];
  const media = mediaBlock(item.ex);
  onLeave(() => { media.stop(); clearHold(); keepAwake(false); });

  const goTo = (i) => { d.idx = Math.max(0, Math.min(total - 1, i)); save(); render(); };

  const text = P.TEXT[item.ex];
  const rest = item.rx.sets + (item.rx.extraSets || 0) > 1 ? ` · отдых ${restFor(item.section)} с` : '';
  const sectionName = P.sessionPlan(d.day).find((s) => s.kind === item.section)?.name || '';

  const body = item.status === 'stopped'
    ? h('div', { class: 'callout warn stopped-banner' },
        h('div', { class: 'grow' }, h('b', {}, 'Остановлено из-за боли'), 'Упражнение пропущено в этой тренировке.'),
        h('button', { class: 'btn ghost', onclick: () => { item.status = 'todo'; save(); render(); } }, 'Вернуть'))
    : h('div', {},
        item.rx.note && h('div', { class: 'callout note' }, item.rx.note),
        text && h('div', { class: 'callout back' }, h('b', {}, 'Для спины'), text.back),
        text && h('details', { class: 'cues', open: d.idx === 0 || item.section === 'strength' },
          h('summary', {}, 'Техника'), h('ol', {}, text.cues.map((c) => h('li', {}, c)))),
        SuggestionBlock(item),
        SetsBlock(item),
        h('div', { class: 'ex-actions' },
          h('button', { class: 'btn danger block', onclick: () => painStop(item) }, 'Боль, остановиться')));

  const last = d.idx === total - 1;
  return h('div', {},
    h('div', { class: 'topbar' },
      h('button', { class: 'icon-btn', 'aria-label': 'На главный экран', onclick: () => go('#/') }, icon(ICON.back)),
      h('div', { class: 'grow' },
        h('div', { class: 'section-name' }, sectionName),
        h('div', { class: 'muted small' }, `${P.DAYS[d.day].title} · ${d.idx + 1} из ${total}`))),
    h('div', { class: 'progress', 'aria-hidden': 'true' }, d.items.map((it, i) =>
      h('i', { class: i === d.idx ? 'cur' : it.status === 'done' ? 'done' : it.status === 'stopped' ? 'stopped' : '' }))),
    media.el,
    h('div', { class: 'ex-title' }, item.title),
    h('div', { class: 'target' }, P.targetText(item.rx), h('span', { class: 'muted' }, rest)),
    data && h('div', { class: 'muscles' }, data.muscles.map(([m]) => h('span', {}, P.MUSCLES[m] || m))),
    body,
    h('div', { class: 'ex-nav', style: 'margin-top:10px' },
      h('button', { class: 'btn', disabled: d.idx === 0, onclick: () => goTo(d.idx - 1) }, '← Назад'),
      last
        ? h('button', { class: 'btn primary', onclick: () => go('#/finish') }, 'Завершить')
        : h('button', { class: 'btn primary', onclick: () => goTo(d.idx + 1) }, 'Далее →')),
  );
}

function SuggestionBlock(item) {
  if (item.section !== 'strength' && item.section !== 'core') return null;
  const sug = suggestion(item.ex, item.rx);
  if (!sug) return null;
  const box = h('div', { class: 'callout up' },
    h('b', {}, 'Можно прибавить'),
    h('div', {}, sug.text),
    h('div', { class: 'muted small' }, `${sug.weeks} нед. подряд все подходы выполнены без боли. Решение за тобой.`),
    h('div', { class: 'row', style: 'margin-top:8px' },
      h('button', { class: 'btn primary', onclick: () => {
        acceptSuggestion(item.ex);
        if (sug.weight) for (const s of item.sets) if (!s.done) s.w = String(sug.weight);
        if (sug.reps) item.targetReps = sug.reps;
        save(); toast('Принято'); render();
      } }, 'Принять'),
      h('button', { class: 'btn ghost', onclick: () => { dismissSuggestion(item.ex); box.remove(); } }, 'Не сейчас')));
  return box;
}

function SetsBlock(item) {
  const rx = item.rx;
  const weighted = P.TEXT[item.ex]?.weighted && !rx.noWeight;
  const wrap = h('div', { class: 'sets' });
  const refresh = () => wrap.replaceWith(SetsBlock(item));

  item.sets.forEach((s, i) => {
    const toggle = () => {
      s.done = !s.done;
      if (s.done && rx.reps && !s.r) s.r = String(item.targetReps || rx.reps[1]);
      const required = item.sets.filter((x) => !x.extra);
      item.status = required.every((x) => x.done) ? 'done' : 'todo';
      save();
      if (s.done) {
        // rest after every set of multi-set exercises, including before the next exercise
        if (item.sets.length > 1) startRest(restFor(item.section));
        if (item.status === 'done' && item.sets.every((x) => x.done || x.extra)) toast('Упражнение выполнено');
      }
      refresh();
    };
    const check = h('button', { class: 'check', 'aria-pressed': String(s.done),
      'aria-label': `Подход ${i + 1}: ${s.done ? 'выполнен' : 'отметить выполненным'}`, onclick: toggle }, icon(ICON.check));
    const n = h('div', { class: 'n' }, s.extra ? 'доп.' : String(i + 1));

    let cells;
    if (rx.minutes) {
      cells = [h('div', { class: 'muted' }, `${P.range(rx.minutes)} мин в лёгком темпе`)];
    } else if (rx.hold) {
      const secs = rx.hold[1];
      const btn = h('button', { class: 'hold', onclick: () => runHold(btn, secs, () => { if (!s.done) toggle(); }) },
        s.done ? `✓ ${secs} с` : `▶ Удержание ${secs} с`);
      cells = [btn];
    } else {
      const reps = h('input', { type: 'number', inputmode: 'numeric', min: 0, max: 100, value: s.r,
        placeholder: item.targetReps ? String(item.targetReps) : P.range(rx.reps), 'aria-label': `Повторы, подход ${i + 1}`,
        onchange: (e) => { s.r = e.target.value; save(); } });
      cells = [h('label', {}, rx.side ? `повторы ${rx.sideWord || 'на сторону'}` : 'повторы', reps)];
      if (weighted) {
        const w = h('input', { type: 'number', inputmode: 'decimal', step: '0.5', min: 0, max: 500, value: s.w,
          placeholder: 'кг', 'aria-label': `Вес, подход ${i + 1}`,
          onchange: (e) => {
            s.w = e.target.value;
            // carry the weight forward to the following sets that are still empty
            const fill = item.sets.slice(i + 1).filter((x) => !x.done && x.w === '');
            for (const x of fill) x.w = s.w;
            save();
            if (fill.length) refresh();
          } });
        cells.unshift(h('label', {}, 'вес, кг', w));
      }
    }
    const twoCols = cells.length === 1;
    wrap.append(h('div', { class: ['set', twoCols && 'no-weight', s.done && 'done', s.extra && 'extra'].filter(Boolean).join(' ') },
      n, ...cells, check));
  });
  if (item.sets.some((x) => x.extra)) wrap.append(h('div', { class: 'muted small' }, 'Доп. подход — по самочувствию.'));
  return wrap;
}

// hold countdown (core holds, side plank)
let hold = null;
function clearHold() { if (hold) { clearInterval(hold.timer); hold = null; } }
function runHold(btn, secs, onDone) {
  if (hold && hold.btn === btn) { clearHold(); btn.classList.remove('running'); btn.textContent = `▶ Удержание ${secs} с`; return; }
  clearHold();
  stopRest();
  const end = Date.now() + secs * 1000;
  btn.classList.add('running');
  const tick = () => {
    const left = Math.ceil((end - Date.now()) / 1000);
    if (left <= 0) { clearHold(); vibrate([250, 100, 250]); onDone(); return; }
    btn.textContent = `Держи… ${left} с`;
  };
  hold = { btn, timer: setInterval(tick, 200) };
  tick();
}

// rest timer
let rest = null;
function startRest(secs) {
  stopRest();
  rest = { end: Date.now() + secs * 1000, total: secs, over: false };
  restEl.hidden = false;
  rest.timer = setInterval(drawRest, 250);
  drawRest();
}
function stopRest() {
  if (rest) clearInterval(rest.timer);
  rest = null;
  restEl.hidden = true;
}
function drawRest() {
  if (!rest) return;
  const left = (rest.end - Date.now()) / 1000;
  if (left <= 0 && !rest.over) {
    rest.over = true;
    vibrate([300, 120, 300]);
    setTimeout(() => { if (rest?.over) stopRest(); }, 4000);
  }
  restEl.classList.toggle('over', rest.over);
  restEl.replaceChildren(
    h('div', { class: 'row' },
      h('div', {}, h('div', { class: 'lbl' }, rest.over ? 'Можно начинать' : 'Отдых'),
        h('div', { class: 'time', role: 'timer' }, rest.over ? 'Пора!' : fmtTime(Math.ceil(left)))),
      h('div', { class: 'grow' }),
      !rest.over && h('button', { class: 'btn', 'aria-label': 'Минус 15 секунд', onclick: () => { rest.end -= 15000; drawRest(); } }, '−15'),
      !rest.over && h('button', { class: 'btn', 'aria-label': 'Плюс 15 секунд', onclick: () => { rest.end += 15000; drawRest(); } }, '+15'),
      h('button', { class: 'btn primary', onclick: stopRest }, rest.over ? 'Ок' : 'Пропустить')),
    h('div', { class: 'bar' }, h('i', { style: `width:${Math.max(0, Math.min(100, (left / rest.total) * 100))}%` })));
}

// "Боль, остановиться": collapse the exercise, offer a substitute or finishing
function painStop(item) {
  const d = db().draft;
  stopRest(); clearHold();
  item.status = 'stopped';
  item.stopReason = 'pain';
  save();
  render();
  const subs = (P.SUBSTITUTES[item.ex] || []).filter((ex) => EXERCISES[ex]);
  openSheet((close) => h('div', { class: 'stack' },
    h('h2', {}, 'Остановись'),
    h('div', { class: 'callout warn' }, h('b', {}, 'Через боль не продолжай'),
      'Если боль стреляет в ногу, появилось онемение или слабость в стопе — закончи тренировку и обратись к врачу.'),
    subs.length > 0 && h('div', { class: 'muted small' }, 'Замена — только если боль была от конкретного движения и уже прошла:'),
    subs.map((ex) => h('button', { class: 'btn sub', onclick: () => {
      const idx = d.items.indexOf(item);
      d.items.splice(idx + 1, 0, newItem({ ...item.rx, ex, title: undefined, note: undefined }, item.section, `Замена: ${exTitle(ex)}`));
      d.idx = idx + 1; save(); close(); render();
    } }, h('img', { src: EXERCISES[ex].poster, alt: '' }), h('span', {}, `Заменить на «${exTitle(ex)}»`))),
    h('button', { class: 'btn block', onclick: () => {
      close(); if (d.idx < d.items.length - 1) { d.idx += 1; save(); render(); }
    } }, 'Пропустить и продолжить'),
    h('button', { class: 'btn danger block', onclick: () => { close(); go('#/finish'); } }, 'Закончить тренировку')));
}

// ---------- finish ----------
export function Finish() {
  const d = db().draft;
  if (!d) { setTimeout(() => go('#/'), 0); return h('div'); }
  stopRest();
  const done = d.items.filter((it) => it.status === 'done').length;
  const stopped = d.items.filter((it) => it.status === 'stopped');
  const sets = d.items.reduce((a, it) => a + it.sets.filter((s) => s.done).length, 0);
  const minutes = Math.max(1, Math.round((Date.now() - d.startedAt) / 60000));
  let pain = d.painAnswer || null;

  const warn = h('div', { class: 'callout warn', hidden: pain !== 'strong' },
    h('b', {}, 'Сильная боль — повод к врачу'),
    'Рост нагрузки не предлагаю, пока боль не пройдёт. Срочно к врачу, если есть стреляющая боль или онемение в ноге, слабость в стопе, нарушения мочеиспускания или онемение в паховой области.');
  const saveBtn = h('button', { class: 'btn primary block', disabled: !pain, onclick: () => {
    const s = { ...d, finishedAt: Date.now(), pain };
    delete s.idx; delete s.painAnswer;
    db().sessions.push(s);
    db().draft = null;
    save();
    toast('Тренировка сохранена');
    go('#/');
  } }, 'Сохранить тренировку');
  const opts = [['none', 'Нет'], ['light', 'Лёгкая'], ['strong', 'Сильная']];
  const chips = opts.map(([k, label]) => h('button', { class: 'chip', 'aria-pressed': String(pain === k), onclick: () => {
    pain = k; d.painAnswer = k; save();
    for (const c of chips) c.setAttribute('aria-pressed', String(c.dataset.k === k));
    warn.hidden = k !== 'strong';
    saveBtn.disabled = false;
  }, 'data-k': k }, label));

  return h('div', {},
    h('div', { class: 'topbar' },
      h('button', { class: 'icon-btn', 'aria-label': 'Вернуться к тренировке', onclick: () => go('#/workout') }, icon(ICON.back)),
      h('div', { class: 'grow' }, h('div', { class: 'section-name' }, 'Итог'), h('div', { class: 'muted small' }, P.DAYS[d.day].title))),
    h('h1', {}, 'Тренировка завершена'),
    h('section', { class: 'card' },
      h('div', {}, `Упражнений выполнено: ${done} из ${d.items.length}`),
      h('div', {}, `Подходов: ${sets}`),
      h('div', {}, `Время: ${minutes} мин`),
      stopped.length > 0 && h('div', { class: 'muted small', style: 'margin-top:6px' },
        `Остановлено из-за боли: ${stopped.map((it) => it.title).join(', ')}`)),
    h('section', { class: 'card stack' },
      h('h2', { style: 'margin:0' }, 'Была ли боль в спине или ноге?'),
      h('div', { class: 'chips' }, chips),
      warn),
    saveBtn);
}

