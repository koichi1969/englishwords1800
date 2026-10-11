// 学習: 1語ずつカードを見る
import { el, svg } from '../util.js';
import { ICONS, toast } from '../ui.js';
import { wordCard } from '../components.js';
import { speak } from '../tts.js';
import { studyWord, setKnown, pendingQuizIds } from '../session.js';

export function render(ctx) {
  const { state, db, go } = ctx;
  const t = state.today;
  const customIds = ctx.params.ids ? ctx.params.ids.filter((id) => db.byId[id]) : null;
  const ids = customIds || t.newIds;

  if (!ids.length) {
    return el('section', { class: 'view-study fade-in' },
      el('div', { class: 'empty' }, '学習する単語がありません'),
      el('button', { class: 'btn btn-primary btn-block', type: 'button', onClick: () => go('home') }, 'ホームへ'));
  }

  let index = ctx.params.index;
  if (index === undefined || index === null) {
    index = ids.findIndex((id) => !t.studied.includes(id));
    if (index < 0) index = 0;
  }
  index = Math.max(0, Math.min(index, ids.length - 1));

  const w = db.byId[ids[index]];
  const isLast = index === ids.length - 1;

  const onNext = () => {
    studyWord(state, w.id);
    ctx.save();
    if (!isLast) { go('study', customIds ? { ids: customIds, index: index + 1 } : { index: index + 1 }); return; }
    const { news, revs } = pendingQuizIds(state);
    if (news.length || revs.length) go('quiz');
    else go('home');
  };

  const onKnown = () => {
    setKnown(state, db, w.id, true);
    ctx.save();
    toast(`「${w.word}」を覚えた箱に入れました`);
    if (customIds) {
      const rest = customIds.filter((id) => id !== w.id);
      if (!rest.length) { go('home'); return; }
      go('study', { ids: rest, index: Math.min(index, rest.length - 1) });
    } else if (!t.newIds.length) {
      go('home');
    } else {
      go('study', { index: Math.min(index, t.newIds.length - 1) });
    }
  };

  if (state.settings.autoSpeak) {
    setTimeout(() => speak(w.word, { slowRate: state.settings.slowRate }), 150);
  }

  const dots = el('div', { class: 'dots' }, ids.map((id, i) => el('span', {
    class: `dot${i === index ? ' current' : ''}${t.studied.includes(id) ? ' done' : ''}`,
  })));

  return el('section', { class: 'view-study fade-in' },
    el('div', { class: 'topbar' },
      el('button', { class: 'btn-text', type: 'button', onClick: () => go('home') }, svg(ICONS.chevronLeft), 'ホーム'),
      dots,
      el('span', { class: 'counter' }, `${index + 1} / ${ids.length}`)),
    wordCard(w, ctx),
    el('div', { class: 'study-actions' },
      el('button', { class: 'btn btn-primary btn-xl', type: 'button', onClick: onNext }, isLast ? '確認クイズへ' : 'つぎへ'),
      el('button', { class: 'btn btn-ghost btn-block', type: 'button', onClick: onKnown }, '✓ もう知ってる（今日の単語から外す）')));
}
