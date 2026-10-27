import * as P from './program.js';
import { db, iso, weekDays, sessionsOn, cardioMinutes, addCardio } from './store.js';
import { h, icon, ICON, toast, openSheet, exTitle, go, render, route } from './ui.js';
import { Workout, Finish, startWorkout, discardDraft } from './workout.js';
import { Library, ExercisePage } from './library.js';
import { History } from './history.js';
import { Rules } from './rules.js';
import { Settings } from './settings.js';
import { recentStrongPain } from './progression.js';

// ---------- home ----------
// a day picked in the week strip or in "Другая тренировка" replaces today's plan in the top card
let picked = null; // { key: 'A' | 'B' | 'C' | 'core', label }

function Home() {
  const now = new Date();
  const todayKey = P.dayForDate(now);
  const dayKey = picked?.key || todayKey;
  const draft = db().draft;
  const plan = P.sessionPlan(dayKey);
  const strength = plan.find((s) => s.kind === 'strength');

  const todayCard = h('section', { class: 'card today' },
    h('div', { class: 'muted small' }, picked ? `Выбрано: ${picked.label}` : 'Сегодня по расписанию'),
    h('div', { class: 'day-title' }, P.DAYS[dayKey].title),
    dayKey === 'core'
      ? h('div', { class: 'muted' }, 'День без зала: кора 5–10 минут и лёгкое кардио.')
      : h('div', { class: 'muted' }, 'Разминка → кора по McGill → силовая часть'),
    h('ul', {}, (strength || plan[0]).items.map((it) => h('li', {}, it.title || exTitle(it.ex)))),
    draft
      ? h('div', { class: 'stack' },
          h('button', { class: 'btn primary block', onclick: () => go('#/workout') }, `Продолжить: ${P.DAYS[draft.day].title}`),
          h('button', { class: 'btn ghost block', onclick: () => discardDraft() }, 'Сбросить начатую тренировку'))
      : h('button', { class: 'btn primary block', onclick: () => { picked = null; startWorkout(dayKey); } },
          picked ? `Начать: ${P.DAYS[dayKey].title}` : 'Начать тренировку'),
    picked && h('button', { class: 'btn ghost block', style: 'margin-top:8px',
      onclick: () => { picked = null; render(); } }, '← Вернуться к плану на сегодня'),
  );

  const strong = recentStrongPain();
  return h('div', {},
    h('div', { class: 'header-row' },
      h('div', {},
        h('div', { class: 'eyebrow' }, now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })),
        h('h1', {}, 'Ровная спина')),
      h('a', { class: 'icon-btn', href: '#/settings', 'aria-label': 'Настройки' }, icon(ICON.gear))),
    strong && h('section', { class: 'callout warn' },
      h('b', {}, 'Недавно была сильная боль'),
      'Рост нагрузки на паузе. Если боль отдаёт в ногу, есть онемение или слабость в стопе — сначала к врачу. ',
      h('a', { href: '#/rules' }, 'Правила и симптомы')),
    todayCard,
    WeekCard(now),
    CardioCard(now),
    h('section', { class: 'card' },
      h('h2', {}, 'Другая тренировка'),
      h('div', { class: 'chips' }, ['A', 'B', 'C', 'core'].map((k) =>
        h('button', { class: 'chip', 'aria-pressed': String(picked?.key === k && !picked.date), onclick: () => pick(k, P.DAYS[k].title) },
          P.DAYS[k].title))),
      h('p', { class: 'muted small' }, 'Пропустил день или хочешь поменять порядок — выбери тренировку здесь или нажми на день недели. Она запишется на сегодняшнюю дату.')),
  );
}

function pick(key, label, date = null) {
  picked = { key, label, date };
  render();
}

function WeekCard(now) {
  const days = weekDays(now);
  const names = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const cells = days.map((d, i) => {
    const key = P.dayForDate(d);
    const done = sessionsOn(iso(d));
    const gym = done.some((s) => s.day !== 'core');
    const full = key === 'core' ? done.length > 0 : gym;
    const isToday = iso(d) === iso(now);
    const sel = picked?.date === iso(d);
    const cls = ['d', isToday && 'today', sel && 'sel', full && 'done', !full && done.length && 'part'].filter(Boolean).join(' ');
    const label = d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
    return h('button', { class: cls, 'aria-pressed': String(sel), 'aria-label': `${label}: ${P.DAYS[key].title}`,
      onclick: () => (isToday ? (picked = null, render()) : pick(key, label, iso(d))) },
      names[i], h('b', {}, P.DAYS[key].short), h('span', { class: 'mark' }, full ? '✓' : ''));
  });
  return h('section', { class: 'card' },
    h('h2', {}, 'Неделя'),
    h('div', { class: 'week' }, cells),
    h('div', { class: 'legend' }, 'A, B, C — силовые в зале, К — кора по McGill дома. Нажми на день, чтобы посмотреть или начать его тренировку.'));
}

function CardioCard(now) {
  const min = cardioMinutes(weekDays(now));
  const [lo, hi] = P.CARDIO_GOAL;
  return h('section', { class: 'card' },
    h('div', { class: 'row' },
      h('div', { class: 'grow' },
        h('h2', { style: 'margin:0' }, 'Кардио за неделю'),
        h('div', {}, h('span', { class: 'big-num' }, String(min)), h('span', { class: 'muted' }, ` / ${lo}–${hi} мин`))),
      h('button', { class: 'btn', onclick: () => cardioSheet() }, '+ Добавить')),
    h('div', { class: 'meter', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': hi, 'aria-valuenow': min },
      h('i', { style: `width:${Math.min(100, (min / hi) * 100)}%` }),
      h('s', { style: `left:${(lo / hi) * 100}%` })),
    h('div', { class: 'muted small' }, 'Лёгкая зона: можешь говорить фразами. Ходьба, велосипед, эллипс, плавание — без бега и прыжков.'));
}

function cardioSheet() {
  let type = P.CARDIO_TYPES[0];
  let minutes = 30;
  openSheet((close) => {
    const minInput = h('input', { type: 'number', inputmode: 'numeric', min: 1, max: 300, value: minutes,
      'aria-label': 'Минуты', class: 'chip', style: 'width:96px',
      oninput: (e) => { minutes = +e.target.value; } });
    const typeChips = P.CARDIO_TYPES.map((t) => h('button', { class: 'chip', 'aria-pressed': String(t === type),
      onclick: (e) => { type = t; for (const c of typeChips) c.setAttribute('aria-pressed', String(c === e.currentTarget)); } }, t));
    return h('div', { class: 'stack' },
      h('h2', {}, 'Добавить кардио'),
      h('div', { class: 'chips' }, typeChips),
      h('div', { class: 'chips' },
        [10, 20, 30, 45, 60].map((m) => h('button', { class: 'chip', onclick: () => { minutes = m; minInput.value = m; } }, `${m} мин`)),
        minInput),
      h('button', { class: 'btn primary block', onclick: () => {
        if (!(minutes > 0)) return;
        addCardio(Math.round(minutes), type);
        close(); toast(`+${Math.round(minutes)} мин: ${type.toLowerCase()}`); render();
      } }, 'Сохранить'));
  });
}


route('', Home);
route('workout', Workout, { full: true });
route('finish', Finish, { full: true });
route('library', Library);
route('ex', ExercisePage);
route('history', History);
route('rules', Rules);
route('settings', Settings);

render();

// offline: cache the app and all videos (needs https or localhost)
// ?nosw skips it while developing (otherwise the cache serves the previous build)
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost') && !location.search.includes('nosw')) {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
    .then((reg) => reg.update())
    .catch((e) => console.warn('SW registration failed', e));
  // a new version took over: reload unless a workout is on screen (the draft survives a reload anyway)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return;
    if (!location.hash.startsWith('#/workout')) location.reload();
    else toast('Приложение обновлено — изменения появятся после тренировки');
  });
}
