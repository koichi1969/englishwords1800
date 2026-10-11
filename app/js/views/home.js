// ホーム: 今日の単語、はじめるボタン、すすみ具合
import { el, svg, fmtDateJa, pct } from '../util.js';
import { ICONS, mascot, toast } from '../ui.js';
import { statusOf } from '../srs.js';
import { unstudiedIds, pendingQuizIds, addExtraRound, streak, learnedCount, EXTRA_ROUND } from '../session.js';

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return 'おはよう！';
  if (h < 18) return 'こんにちは！';
  return 'こんばんは！';
}

export function render(ctx) {
  const { state, db, go } = ctx;
  const t = state.today;
  const s = streak(state);
  const learned = learnedCount(state, db);
  const total = db.words.length;
  const unstudied = unstudiedIds(state);
  const { revs } = pendingQuizIds(state);
  const hasWork = t.newIds.length > 0 || revs.length > 0;

  let sub;
  if (t.completed) sub = '今日の学習は完了。おつかれさま！';
  else if (!hasWork) sub = '学習できる単語がありません';
  else if (s > 0) sub = `${s}日連続で学習中。今日も続けよう！`;
  else sub = `今日の単語を${t.newIds.length}語、やってみよう`;

  const head = el('div', { class: 'home-head' },
    mascot(t.completed ? 'happy' : 'normal', 72),
    el('div', { class: 'greeting' }, el('h1', {}, greeting()), el('p', {}, sub)));

  const chips = el('div', { class: 'chips' },
    el('span', { class: 'chip' }, '🔥 ', String(s), '日連続'),
    el('span', { class: 'chip' }, '✅ 覚えた ', String(learned), ' 語'));

  const items = t.newIds.map((id, i) => {
    const w = db.byId[id];
    const done = t.studied.includes(id);
    return el('button', { class: `today-item${done ? ' done' : ''}`, type: 'button', onClick: () => go('study', { index: i }) },
      el('span', { class: 'ti-num' }, String(i + 1)),
      el('span', { class: 'ti-main' },
        el('span', { class: 'ti-word', lang: 'en' }, w.word),
        el('span', { class: 'ti-sub' }, done ? w.meanings[0] : (state.settings.showKana ? w.kana : '　'))),
      el('span', { class: 'ti-status' }, done ? svg(ICONS.check) : null));
  });

  const extra = () => {
    addExtraRound(state, db);
    ctx.save();
    if (unstudiedIds(state).length === 0) { toast('新しい単語はもうありません'); go('home'); return; }
    toast(`新しい単語を${EXTRA_ROUND}語追加しました`);
    go('study');
  };

  let cta;
  if (!hasWork) {
    cta = el('div', { class: 'done-card' }, el('p', { style: { margin: 0 } }, 'すべての単語が「覚えた箱」にあります。単語一覧で「まだ」に戻すと、また学習できます。'));
  } else if (t.completed) {
    cta = el('div', { class: 'done-card' },
      el('h3', { style: { margin: '0 0 6px' } }, '今日の学習は完了！'),
      el('p', { style: { margin: '0 0 12px', color: 'var(--muted)' } }, 'まだ元気があれば、追加の5語もどうぞ。'),
      el('button', { class: 'btn btn-secondary btn-block', type: 'button', onClick: extra }, `もう${EXTRA_ROUND}語やる`));
  } else if (t.newIds.length === 0) {
    cta = el('button', { class: 'btn btn-primary btn-xl', type: 'button', onClick: () => go('quiz') }, `復習クイズへ（${revs.length}語）`);
  } else if (unstudied.length === t.newIds.length) {
    cta = el('button', { class: 'btn btn-primary btn-xl', type: 'button', onClick: () => go('study') }, 'はじめる');
  } else if (unstudied.length > 0) {
    cta = el('button', { class: 'btn btn-primary btn-xl', type: 'button', onClick: () => go('study') }, `つづきから（あと${unstudied.length}語）`);
  } else {
    cta = el('button', { class: 'btn btn-primary btn-xl', type: 'button', onClick: () => go('quiz') }, '確認クイズへ');
  }

  const todaySection = el('section', {},
    el('div', { class: 'section-title' }, el('h2', {}, '今日の単語'), el('span', { class: 'sub' }, fmtDateJa(t.date))),
    revs.length ? el('div', { class: 'chips' }, el('span', { class: 'chip review-chip' }, `🔁 復習 ${revs.length}語（クイズで出ます）`)) : null,
    items.length ? el('div', { class: 'today-list' }, items) : null,
    cta);

  const byLevel = db.levelKeys.map((k) => {
    const lvl = Number(k);
    const ws = db.words.filter((w) => w.level === lvl);
    const ln = ws.filter((w) => statusOf(state.words[w.id]) === 'learned').length;
    return { label: db.levels[k], total: ws.length, learned: ln };
  }).filter((r) => r.total > 0);

  const progress = el('section', { class: 'progress-card' },
    el('div', { class: 'section-title' }, el('h2', {}, 'すすみ具合')),
    el('div', { class: 'progress-big' }, el('strong', {}, String(learned)), el('span', {}, `/ ${total} 語 覚えた`)),
    el('div', { class: 'bar', style: { margin: '8px 0 4px' } }, el('div', { class: 'fill', style: { width: `${pct(learned, total)}%` } })),
    el('div', { class: 'level-rows' }, byLevel.map((r) => el('div', { class: 'level-row' },
      el('span', {}, r.label),
      el('div', { class: 'bar' }, el('div', { class: 'fill', style: { width: `${pct(r.learned, r.total)}%` } })),
      el('span', { style: { textAlign: 'right' } }, `${r.learned}/${r.total}`)))));

  return el('div', { class: 'view-home fade-in' }, head, chips, iosHint(ctx), todaySection, progress);
}

function iosHint(ctx) {
  const ua = navigator.userAgent || '';
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const standalone = window.navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  if (!isIOS || standalone || ctx.state.settings.homeHintDismissed) return null;
  return el('div', { class: 'hint-banner' },
    el('span', {}, '📱'),
    el('span', {}, 'ホーム画面に追加すると、アプリのように使えます。', el('br'), 'Safari の共有ボタン → 「ホーム画面に追加」'),
    el('button', { class: 'btn-text close', type: 'button', 'aria-label': '閉じる', onClick: () => { ctx.state.settings.homeHintDismissed = true; ctx.save(); ctx.go('home'); } }, svg(ICONS.close)));
}
