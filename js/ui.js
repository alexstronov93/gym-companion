// Shared DOM helpers and the hash router.
import { EXERCISES } from './exercises.gen.js';
import { db } from './store.js';

export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
  return el;
}

const SVG = 'http://www.w3.org/2000/svg';
export function icon(d) {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG, 'path');
  path.setAttribute('d', d);
  svg.append(path);
  return svg;
}
export const ICON = {
  back: 'M15 5l-7 7 7 7',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  walk: 'M13 4.5a1.5 1.5 0 1 0 0-.01M10 21l2-6 3 3v4M8 12l2-4 4 1 2 4M10 8l-3 2v3',
  gear: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  chevron: 'M9 5l7 7-7 7',
  trend: 'M4 17l6-6 4 4 6-7M14 8h6v6',
};

export function toast(text) {
  const t = h('div', { class: 'toast', role: 'status' }, text);
  document.body.append(t);
  setTimeout(() => t.remove(), 2400);
}

export function vibrate(pattern) {
  if (db().settings.vibrate && navigator.vibrate) navigator.vibrate(pattern);
}

const sheetRoot = () => document.getElementById('sheet-root');
export function openSheet(build) {
  const close = () => { sheetRoot().innerHTML = ''; };
  const backdrop = h('div', { class: 'backdrop', onclick: close });
  const sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' }, build(close));
  sheetRoot().replaceChildren(backdrop, sheet);
  return close;
}

export const exTitle = (ex) => EXERCISES[ex]?.title || ex;

/** Looping muted video with the current phase label; returns { el, stop }. */
export function mediaBlock(ex) {
  const data = EXERCISES[ex];
  if (!data) {
    return { el: h('div', { class: 'media placeholder' }, h('div', {}, icon(ICON.walk), h('div', {}, 'Без ролика'))), stop() {} };
  }
  const phase = h('span', {}, data.phases[0][2]);
  const video = h('video', { src: data.video, poster: data.poster, muted: true, autoplay: true, loop: true,
    playsinline: true, preload: 'auto', 'aria-label': `Ролик: ${data.title}` });
  video.muted = true;
  const timer = setInterval(() => {
    const t = video.currentTime % data.duration;
    const p = data.phases.find(([a, b]) => t >= a && t < b) || data.phases.at(-1);
    if (phase.textContent !== p[2]) phase.textContent = p[2];
  }, 120);
  const el = h('div', { class: 'media' }, video, h('div', { class: 'phase', 'aria-hidden': 'true' }, phase));
  return { el, stop: () => clearInterval(timer) };
}
export const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, '0')}`;
export const fmtDate = (isoDate, opts = { day: 'numeric', month: 'short' }) =>
  new Date(`${isoDate}T12:00:00`).toLocaleDateString('ru-RU', opts);

// ---------- router: #/name/arg ----------
const routes = {};
const TAB_OF = { '': 'home', library: 'library', ex: 'library', history: 'history', rules: 'rules', settings: 'home' };
let leave = null;

export const route = (name, fn, opts = {}) => { routes[name] = { fn, ...opts }; };
/** Cleanup to run when the current screen is replaced. */
export const onLeave = (fn) => { leave = fn; };

export function render() {
  const [name = '', ...args] = location.hash.replace(/^#\/?/, '').split('/');
  const r = routes[name] || routes[''];
  if (leave) { leave(); leave = null; }
  document.body.classList.toggle('no-tabs', !!r.full);
  for (const a of document.querySelectorAll('.tabs a')) a.classList.toggle('on', a.dataset.tab === TAB_OF[name]);
  document.getElementById('view').replaceChildren(r.fn(...args.map(decodeURIComponent)));
  window.scrollTo(0, 0);
}
export const go = (hash) => { if (location.hash === hash) render(); else location.hash = hash; };
window.addEventListener('hashchange', render);
