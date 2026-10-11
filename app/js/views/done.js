// 今日の学習が終わったときの画面
import { el, pct, randomOf } from '../util.js';
import { mascot, toast } from '../ui.js';
import { streak, learnedCount, nextUp, addExtraRound, unstudiedIds, EXTRA_ROUND } from '../session.js';

const HEADLINES = ['今日もやりきった！', 'おつかれさま！', 'ナイス！', 'いい感じ！'];

export function render(ctx) {
  const { state, db, go } = ctx;
  const p = ctx.params || {};
  const s = streak(state);
  const learned = learnedCount(state, db);
  const total = (p.correct || 0) + (p.wrong || 0);
  const rate = pct(p.correct || 0, total);
  const next = nextUp(state, db, 5);

  const extra = () => {
    addExtraRound(state, db);
    ctx.save();
    if (unstudiedIds(state).length === 0) { toast('新しい単語はもうありません'); go('home'); return; }
    toast(`新しい単語を${EXTRA_ROUND}語追加しました`);
    go('study');
  };

  return el('div', { class: 'view-done fade-in' },
    el('div', { class: 'done-hero' },
      mascot('happy', 110),
      el('h1', {}, randomOf(HEADLINES)),
      el('p', {}, p.ngWords ? `まちがえた${p.ngWords}語は、明日また出てきます。` : (total ? '全部正解！すごい！' : ''))),
    el('div', { class: 'stats' },
      stat(p.newCount || 0, '新しい単語'),
      stat(p.reviewCount || 0, '復習した単語'),
      stat(`${rate}%`, '正解率'),
      stat(s, '日連続')),
    el('div', { class: 'progress-card', style: { marginTop: 0, marginBottom: '16px' } },
      el('div', { class: 'progress-big' }, el('strong', {}, String(learned)), el('span', {}, `/ ${db.words.length} 語 覚えた`)),
      el('div', { class: 'bar', style: { marginTop: '8px' } }, el('div', { class: 'fill', style: { width: `${pct(learned, db.words.length)}%` } }))),
    next.length ? el('div', { class: 'next-up' },
      el('h3', {}, '明日の単語（予告）'),
      el('div', { class: 'word-chips' }, next.map((w) => el('span', { class: 'word-chip', lang: 'en' }, w.word)))) : null,
    el('div', { class: 'study-actions' },
      el('button', { class: 'btn btn-primary btn-xl', type: 'button', onClick: () => go('home') }, 'ホームへ'),
      el('button', { class: 'btn btn-secondary btn-block', type: 'button', onClick: extra }, `もう${EXTRA_ROUND}語やる`)));
}

function stat(value, label) {
  return el('div', { class: 'stat' }, el('strong', {}, String(value)), el('span', {}, label));
}
