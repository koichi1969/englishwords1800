// はじめて開いたときの案内（2画面）
import { el } from '../util.js';
import { mascot, toast } from '../ui.js';
import { setKnownMany } from '../session.js';

export function render(ctx) {
  const { state, db, go } = ctx;
  const step = ctx.params.step || 1;

  if (step === 1) {
    return el('section', { class: 'view-onboard fade-in' },
      el('div', { class: 'onboard-hero' }, mascot('happy', 120)),
      el('h1', { class: 'title-xl' }, 'まいにち英単語へ', el('br'), 'ようこそ！'),
      el('ul', { class: 'onboard-list' },
        item(1, '1日5語だけ', '今日の単語が自動で選ばれます。5分で終わります。'),
        item(2, '例文と音声で覚える', '意味だけでなく、使われ方ごと頭に入れます。'),
        item(3, '知ってる単語はスキップ', '「もう知ってる」を押せば、わからない単語だけが残ります。')),
      el('button', { class: 'btn btn-primary btn-xl', type: 'button', onClick: () => go('onboarding', { step: 2 }) }, 'はじめる'));
  }

  const basics = db.words.filter((w) => w.theme === '基本の語');
  const finish = (markKnown) => {
    if (markKnown) {
      setKnownMany(state, db, basics.map((w) => w.id), true);
      toast(`基本の語 ${basics.length} 語を覚えた箱に入れました`);
    }
    state.onboarded = true;
    ctx.save();
    go('home');
  };
  return el('section', { class: 'view-onboard fade-in' },
    el('div', { class: 'onboard-hero' }, mascot('normal', 96)),
    el('h1', { class: 'title-xl' }, 'まず、基本の語をチェック'),
    el('p', { style: { textAlign: 'center', color: 'var(--muted)', margin: '0 0 14px' } },
      `I, you, the, in のような基本の語が ${basics.length} 語あります。`, el('br'), 'もう知っていますか？'),
    el('div', { class: 'word-chips', style: { justifyContent: 'center', marginBottom: '22px' } },
      basics.map((w) => el('span', { class: 'word-chip', lang: 'en' }, w.word))),
    el('div', { class: 'study-actions' },
      el('button', { class: 'btn btn-primary btn-xl', type: 'button', onClick: () => finish(true) }, 'ぜんぶ知ってる'),
      el('button', { class: 'btn btn-secondary btn-block', type: 'button', onClick: () => finish(false) }, 'まだ自信がない（今日の単語に出す）'),
      el('p', { style: { textAlign: 'center', color: 'var(--muted)', fontSize: '13px', margin: '4px 0 0' } }, 'あとから「単語一覧」で1語ずつ変えられます。')));
}

function item(n, title, desc) {
  return el('li', {}, el('span', { class: 'ob-num' }, String(n)), el('div', {}, el('strong', {}, title), el('span', {}, desc)));
}
