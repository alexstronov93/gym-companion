// Library of all exercises with filters by day and muscle group, plus a page per exercise.
import { EXERCISES } from './exercises.gen.js';
import * as P from './program.js';
import { h, icon, ICON, go, onLeave, mediaBlock } from './ui.js';

const FILTER_DAYS = [['all', 'Все'], ['warmup', 'Разминка'], ['A', 'День A'], ['B', 'День B'], ['C', 'День C'], ['core', 'Кора']];
const filter = { day: 'all', group: 'all' };

/** ex -> [{ day, section, rx }] for every slot where the exercise is used */
function usage() {
  const out = {};
  for (const day of ['A', 'B', 'C']) {
    for (const section of P.sessionPlan(day)) {
      if (day !== 'A' && section.kind !== 'strength') continue; // warmup and core are the same every day: list once
      for (const rx of section.items) (out[rx.ex] ||= []).push({ day, section: section.kind, rx });
    }
  }
  return out;
}

const matchesDay = (uses, day) => day === 'all'
  || (uses || []).some((u) => (day === 'warmup' ? u.section === 'warmup'
    : day === 'core' ? u.section === 'core' : u.day === day && u.section === 'strength'));
const matchesGroup = (ex, group) => group === 'all'
  || EXERCISES[ex].muscles.some(([m, w]) => w >= 0.5 && P.GROUPS[group].muscles.includes(m));

export function Library() {
  const uses = usage();
  const grid = h('div', { class: 'lib-grid' });
  const draw = () => {
    const ids = Object.keys(EXERCISES).filter((ex) => matchesDay(uses[ex], filter.day) && matchesGroup(ex, filter.group));
    grid.replaceChildren(...ids.map((ex) => LibCard(ex, uses[ex])),
      ids.length ? '' : h('p', { class: 'muted' }, 'Нет упражнений с таким фильтром.'));
  };
  const chipRow = (options, key) => {
    const chips = options.map(([k, label]) => h('button', { class: 'chip', 'aria-pressed': String(filter[key] === k), onclick: () => {
      filter[key] = k;
      for (const c of chips) c.setAttribute('aria-pressed', String(c === chips.find((x) => x.dataset.k === k)));
      draw();
    }, 'data-k': k }, label));
    return h('div', { class: 'chips scroll' }, chips);
  };
  draw();
  return h('div', {},
    h('h1', {}, 'Библиотека'),
    h('p', { class: 'muted', style: 'margin-top:0' }, `${Object.keys(EXERCISES).length} упражнений с роликами техники.`),
    chipRow(FILTER_DAYS, 'day'),
    chipRow([['all', 'Все мышцы'], ...Object.entries(P.GROUPS).map(([k, g]) => [k, g.name])], 'group'),
    grid);
}

function dayBadges(list) {
  const labels = new Set();
  for (const u of list || []) labels.add(u.section === 'warmup' ? 'Разминка' : u.section === 'core' ? 'Кора' : `День ${u.day}`);
  return [...labels];
}

function LibCard(ex, list) {
  const data = EXERCISES[ex];
  return h('a', { class: 'lib-card', href: `#/ex/${ex}` },
    h('img', { src: data.poster, alt: '', loading: 'lazy' }),
    h('div', { class: 'lib-body' },
      h('div', { class: 'lib-title' }, data.title),
      h('div', { class: 'lib-muscles' }, data.muscles.filter(([, w]) => w >= 0.5).map(([m]) => P.MUSCLES[m]).join(', ')),
      h('div', { class: 'badges' }, dayBadges(list).map((b) => h('span', {}, b)))));
}

export function ExercisePage(ex) {
  const data = EXERCISES[ex];
  if (!data) { setTimeout(() => go('#/library'), 0); return h('div'); }
  const text = P.TEXT[ex];
  const list = usage()[ex] || [];
  const media = mediaBlock(ex);
  onLeave(() => media.stop());
  const subs = (P.SUBSTITUTES[ex] || []).filter((s) => EXERCISES[s]);
  return h('div', {},
    h('div', { class: 'topbar' },
      h('button', { class: 'icon-btn', 'aria-label': 'К библиотеке', onclick: () => history.length > 1 ? history.back() : go('#/library') }, icon(ICON.back)),
      h('div', { class: 'grow section-name' }, 'Библиотека')),
    media.el,
    h('div', { class: 'ex-title' }, data.title),
    h('div', { class: 'muscles' }, data.muscles.map(([m]) => h('span', {}, P.MUSCLES[m] || m))),
    list.length > 0 && h('section', { class: 'card' },
      h('h2', {}, 'В программе'),
      list.map((u) => h('div', { class: 'row', style: 'justify-content:space-between;padding:4px 0' },
        h('span', {}, u.section === 'warmup' ? 'Разминка' : u.section === 'core' ? 'Кора (каждый день)' : (u.rx.title || P.DAYS[u.day].title)),
        h('b', {}, P.targetText(u.rx)))),
      list.filter((u) => u.rx.note).map((u) => h('div', { class: 'callout note' }, u.rx.note))),
    text && h('div', { class: 'callout back' }, h('b', {}, 'Для спины'), text.back),
    text && h('details', { class: 'cues', open: true }, h('summary', {}, 'Техника'), h('ol', {}, text.cues.map((c) => h('li', {}, c)))),
    h('section', { class: 'card' },
      h('h2', {}, 'Фазы ролика'),
      h('ol', { class: 'phases' }, data.phases.filter((p, i, a) => i === 0 || p[2] !== a[i - 1][2])
        .map(([a, b, label]) => h('li', {}, label, h('span', { class: 'muted' }, ` · ${a.toFixed(1)}–${b.toFixed(1)} с`))))),
    subs.length > 0 && h('section', { class: 'card' },
      h('h2', {}, 'Замена при дискомфорте'),
      subs.map((s) => h('a', { class: 'btn sub block', href: `#/ex/${s}`, style: 'text-decoration:none;margin-top:8px' },
        h('img', { src: EXERCISES[s].poster, alt: '' }), h('span', {}, EXERCISES[s].title)))));
}
