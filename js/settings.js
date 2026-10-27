// Settings and data export/import (JSON, CSV). Everything stays on this device.
import * as P from './program.js';
import { db, save, iso, replaceAll } from './store.js';
import { h, icon, ICON, toast, vibrate, go, render } from './ui.js';

function stepper(label, hint, key, min, max, step) {
  const out = h('output', {}, `${db().settings[key]} с`);
  const set = (v) => {
    db().settings[key] = Math.max(min, Math.min(max, v));
    out.textContent = `${db().settings[key]} с`;
    save();
  };
  return h('div', { class: 'setting' },
    h('div', {}, h('div', {}, label), h('div', { class: 'muted small' }, hint)),
    h('div', { class: 'stepper' },
      h('button', { class: 'icon-btn', 'aria-label': `${label}: меньше`, onclick: () => set(db().settings[key] - step) }, '−'),
      out,
      h('button', { class: 'icon-btn', 'aria-label': `${label}: больше`, onclick: () => set(db().settings[key] + step) }, '+')));
}

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = h('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- CSV ----------
const COLS = ['тип', 'id', 'дата', 'день', 'упражнение_id', 'упражнение', 'подход', 'вес_кг', 'повторы', 'выполнен',
  'статус', 'боль', 'минуты', 'вид_кардио', 'начало', 'конец'];
const cell = (v) => {
  const t = v == null ? '' : String(v);
  return /[;"\n,]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

export function toCSV(d = db()) {
  const rows = [COLS];
  for (const s of d.sessions) {
    for (const it of s.items) {
      const sets = it.sets.length ? it.sets : [{}];
      sets.forEach((st, i) => rows.push(['подход', s.id, s.date, s.day, it.ex, it.title, i + 1, st.w, st.r, st.done ? 1 : 0,
        it.status, s.pain, '', '', s.startedAt && new Date(s.startedAt).toISOString(), s.finishedAt && new Date(s.finishedAt).toISOString()]));
    }
  }
  for (const c of d.cardio) rows.push(['кардио', '', c.date, '', '', '', '', '', '', '', '', '', c.minutes, c.type, '', '']);
  return '﻿' + rows.map((r) => r.map(cell).join(';')).join('\r\n');
}

function parseCSV(text) {
  text = text.replace(/^﻿/, '');
  const sep = text.split(/\r?\n/, 1)[0].includes(';') ? ';' : ',';
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === sep) { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const head = rows.shift() || [];
  return rows.filter((r) => r.some(Boolean)).map((r) => Object.fromEntries(head.map((k, i) => [k.trim(), r[i] ?? ''])));
}

/** Rebuild { sessions, cardio } from CSV rows; prescriptions are matched back to the program. */
function fromCSV(text) {
  const rows = parseCSV(text);
  if (!rows.length || !('тип' in rows[0])) throw new Error('Не похоже на CSV, выгруженный из приложения');
  const sessions = new Map();
  const cardio = [];
  for (const r of rows) {
    if (r['тип'] === 'кардио') { cardio.push({ date: r['дата'], minutes: Number(r['минуты']) || 0, type: r['вид_кардио'] }); continue; }
    if (r['тип'] !== 'подход') continue;
    let s = sessions.get(r.id);
    if (!s) {
      s = { id: r.id, date: r['дата'], day: r['день'], pain: r['боль'] || null, items: [],
        startedAt: Date.parse(r['начало']) || undefined, finishedAt: Date.parse(r['конец']) || undefined };
      sessions.set(r.id, s);
    }
    let it = s.items.at(-1);
    if (!it || it.ex !== r['упражнение_id'] || Number(r['подход']) === 1) {
      const plan = P.sessionPlan(s.day in P.DAYS ? s.day : 'core').flatMap((sec) => sec.items.map((rx) => ({ rx, section: sec.kind })));
      const used = s.items.filter((x) => x.ex === r['упражнение_id']).length;
      const match = plan.filter((p) => p.rx.ex === r['упражнение_id'])[used];
      it = { ex: r['упражнение_id'], title: r['упражнение'], status: r['статус'] || 'done', sets: [],
        rx: match?.rx || null, section: match?.section || 'strength' };
      s.items.push(it);
    }
    it.sets.push({ w: r['вес_кг'], r: r['повторы'], done: r['выполнен'] === '1', extra: false });
  }
  return { sessions: [...sessions.values()], cardio };
}

function merge(incoming) {
  const d = db();
  const ids = new Set(d.sessions.map((s) => s.id));
  const newSessions = (incoming.sessions || []).filter((s) => s && s.id && !ids.has(s.id) && Array.isArray(s.items));
  const key = (c) => `${c.date}|${c.minutes}|${c.type}`;
  const have = new Set(d.cardio.map(key));
  const newCardio = (incoming.cardio || []).filter((c) => c && c.date && c.minutes > 0 && !have.has(key(c)));
  d.sessions.push(...newSessions);
  d.sessions.sort((a, b) => (a.date + (a.startedAt || '')).localeCompare(b.date + (b.startedAt || '')));
  d.cardio.push(...newCardio);
  if (incoming.settings && !newSessions.length && !newCardio.length) Object.assign(d.settings, incoming.settings);
  save();
  return [newSessions.length, newCardio.length];
}

async function importFile(file) {
  try {
    const text = await file.text();
    const data = file.name.toLowerCase().endsWith('.csv') ? fromCSV(text) : JSON.parse(text);
    if (!Array.isArray(data.sessions) && !Array.isArray(data.cardio)) throw new Error('В файле нет тренировок');
    const [s, c] = merge(data);
    toast(`Добавлено: тренировок ${s}, записей кардио ${c}`);
    render();
  } catch (e) {
    alert(`Не удалось импортировать: ${e.message}`);
  }
}

export function Settings() {
  const st = db().settings;
  const vib = h('button', { class: 'switch', role: 'switch', 'aria-checked': String(st.vibrate), 'aria-label': 'Вибрация',
    onclick: () => { st.vibrate = !st.vibrate; vib.setAttribute('aria-checked', String(st.vibrate)); save(); if (st.vibrate) vibrate(200); } });
  const fileInput = h('input', { type: 'file', accept: '.json,.csv,application/json,text/csv', hidden: true,
    onchange: (e) => { if (e.target.files[0]) importFile(e.target.files[0]); e.target.value = ''; } });
  const stamp = iso(new Date());
  return h('div', {},
    h('div', { class: 'topbar' },
      h('button', { class: 'icon-btn', 'aria-label': 'Назад', onclick: () => (history.length > 1 ? history.back() : go('#/')) }, icon(ICON.back)),
      h('div', { class: 'grow section-name' }, 'Настройки')),
    h('h1', {}, 'Настройки'),
    h('section', { class: 'card' },
      h('h2', {}, 'Отдых между подходами'),
      stepper('Силовые', 'рекомендуется 60–90 с', 'restStrength', 30, 180, 15),
      stepper('Кора и разминка', 'рекомендуется 30–45 с', 'restCore', 15, 90, 5),
      h('div', { class: 'setting' },
        h('div', {}, h('div', {}, 'Вибрация'), h('div', { class: 'muted small' }, 'в конце отдыха и удержания (Android; iPhone не поддерживает)')),
        vib)),
    h('section', { class: 'card stack' },
      h('h2', { style: 'margin:0' }, 'Данные'),
      h('p', { class: 'muted small', style: 'margin:0' }, 'Всё хранится только на этом устройстве. Делай резервную копию — при очистке данных браузера записи пропадут.'),
      h('button', { class: 'btn block', onclick: () => download(`rovnaya-spina-${stamp}.json`, JSON.stringify(db(), null, 1), 'application/json') }, 'Экспорт JSON (полная копия)'),
      h('button', { class: 'btn block', onclick: () => download(`rovnaya-spina-${stamp}.csv`, toCSV(), 'text/csv;charset=utf-8') }, 'Экспорт CSV (для таблиц)'),
      h('button', { class: 'btn block', onclick: () => fileInput.click() }, 'Импорт JSON или CSV'),
      fileInput,
      h('p', { class: 'muted small', style: 'margin:0' }, 'Импорт добавляет только записи, которых ещё нет.'),
      h('button', { class: 'btn danger block', onclick: () => {
        if (!confirm('Удалить все тренировки, кардио и настройки с этого устройства? Это нельзя отменить.')) return;
        replaceAll(null); toast('Данные удалены'); go('#/');
      } }, 'Удалить все данные')));
}
