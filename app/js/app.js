// 起動と画面の切り替え
import { loadWords } from './data.js';
import * as store from './store.js';
import { ensureToday } from './session.js';
import { el, svg } from './util.js';
import { ICONS } from './ui.js';
import * as Onboarding from './views/onboarding.js';
import * as Home from './views/home.js';
import * as Study from './views/study.js';
import * as Quiz from './views/quiz.js';
import * as Done from './views/done.js';
import * as List from './views/list.js';
import * as Settings from './views/settings.js';

const VIEWS = { onboarding: Onboarding, home: Home, study: Study, quiz: Quiz, done: Done, list: List, settings: Settings };
const TABS = [
  { id: 'home', label: 'ホーム', icon: 'home' },
  { id: 'list', label: '単語一覧', icon: 'list' },
  { id: 'settings', label: '設定', icon: 'settings' },
];
// 集中したい画面ではメニューを隠す
const FOCUS_VIEWS = new Set(['study', 'quiz', 'onboarding']);

const ctx = {
  state: null,
  db: null,
  view: 'home',
  params: {},
  go,
  save() { store.save(ctx.state); },
  replaceState(s) { ctx.state = s; store.save(s); },
};

function go(view, params = {}) {
  if (!VIEWS[view]) view = 'home';
  ctx.view = view;
  ctx.params = params || {};
  render();
}

function render() {
  const viewEl = document.getElementById('view');
  const appEl = document.getElementById('app');
  if (!ctx.db || !ctx.state) return;
  if (ctx.state.onboarded) {
    ensureToday(ctx.state, ctx.db);
    ctx.save();
  }
  let node;
  try {
    node = VIEWS[ctx.view].render(ctx);
  } catch (e) {
    console.error(e);
    node = errorView(e);
  }
  viewEl.replaceChildren(node);
  appEl.classList.toggle('focus', FOCUS_VIEWS.has(ctx.view));
  renderTabbar();
  window.scrollTo({ top: 0 });
}

function renderTabbar() {
  const bar = document.getElementById('tabbar');
  if (FOCUS_VIEWS.has(ctx.view)) { bar.classList.add('hidden'); return; }
  bar.classList.remove('hidden');
  bar.replaceChildren(el('div', { class: 'tabbar-inner' }, TABS.map((t) => el('button', {
    class: `tab${ctx.view === t.id || (t.id === 'home' && ctx.view === 'done') ? ' active' : ''}`,
    type: 'button',
    'aria-current': ctx.view === t.id ? 'page' : null,
    onClick: () => go(t.id),
  }, svg(ICONS[t.icon]), el('span', {}, t.label)))));
}

function errorView(e) {
  return el('div', { class: 'error-view' },
    el('p', {}, 'ごめんなさい、画面を表示できませんでした。'),
    el('p', { style: { fontSize: '12px' } }, String(e && e.message ? e.message : e)),
    el('button', { class: 'btn btn-primary', type: 'button', onClick: () => window.location.reload() }, '再読み込み'));
}

function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  if (!/^https?:$/.test(window.location.protocol)) return;
  navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('sw register failed', e));
}

async function boot() {
  const viewEl = document.getElementById('view');
  viewEl.replaceChildren(el('div', { class: 'loading' }, 'よみこみ中…'));
  try {
    ctx.db = await loadWords();
  } catch (e) {
    viewEl.replaceChildren(errorView(e));
    return;
  }
  ctx.state = store.load();
  go(ctx.state.onboarded ? 'home' : 'onboarding');
  registerSW();
  // 日付が変わった状態で戻ってきたら、今日の単語を作り直す
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !FOCUS_VIEWS.has(ctx.view) && ctx.state.onboarded) {
      const before = ctx.state.today && ctx.state.today.date;
      ensureToday(ctx.state, ctx.db);
      if (ctx.state.today.date !== before) render();
    }
  });
}

boot();
