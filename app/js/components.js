// 画面をまたいで使う部品: 単語カード、音声ボタン、例文のハイライト
import { el } from './util.js';
import { toast } from './ui.js';
import { speak, canSpeak } from './tts.js';
import { exampleParts } from './data.js';
import { statusOf } from './srs.js';
import { fmtDateJa } from './util.js';

/** 「🔊 きく」「🐢 ゆっくり」の2つのボタン */
export function speakButtons(text, state, { compact = false } = {}) {
  const slowRate = state.settings.slowRate;
  const say = (slow) => (e) => {
    e.stopPropagation();
    if (!canSpeak()) { toast('このブラウザでは音声を再生できません'); return; }
    speak(text, { slow, slowRate });
  };
  const cls = `btn-speak${compact ? ' compact' : ''}`;
  return el('span', { class: 'speak-group' },
    el('button', { class: cls, type: 'button', 'aria-label': `${text} を聞く`, onClick: say(false) }, '🔊', compact ? null : el('span', {}, 'きく')),
    el('button', { class: cls, type: 'button', 'aria-label': `${text} をゆっくり聞く`, onClick: say(true) }, '🐢', compact ? null : el('span', {}, 'ゆっくり')));
}

/** 例文（単語の部分をマーカーで目立たせる） */
export function highlightedExample(w, { cls = 'example' } = {}) {
  const [a, m, b] = exampleParts(w);
  return el('p', { class: cls, lang: 'en' }, a, m ? el('mark', {}, m) : null, b);
}

/** 学習画面・詳細で使う大きな単語カード */
export function wordCard(w, ctx) {
  const s = ctx.state.settings;
  return el('article', { class: 'word-card' },
    el('div', { class: 'wc-badges' },
      el('span', { class: 'badge badge-pos' }, w.pos),
      el('span', { class: 'badge badge-level' }, ctx.db.levels[w.level] || `レベル${w.level}`),
      el('span', { class: 'badge' }, w.theme)),
    el('h2', { class: 'wc-word', lang: 'en' }, w.word),
    s.showKana ? el('p', { class: 'wc-kana' }, el('span', { class: 'kana-label' }, 'カタカナ読み・目安'), w.kana) : null,
    speakButtons(w.word, ctx.state),
    el('ul', { class: 'wc-meanings' }, w.meanings.map((m, i) => el('li', {}, el('span', { class: 'num' }, String(i + 1)), m))),
    el('div', { class: 'wc-example' },
      el('div', { class: 'wc-example-label' }, '例文'),
      highlightedExample(w),
      el('p', { class: 'example-ja' }, w.exampleJa),
      speakButtons(w.example, ctx.state)),
    w.note ? el('p', { class: 'wc-note' }, '💡 ', w.note) : null);
}

/** まちがえたときなどに出す小さなカード */
export function miniCard(w, ctx) {
  const s = ctx.state.settings;
  return el('div', { class: 'mini-card' },
    el('div', { class: 'mc-word', lang: 'en' }, w.word, ' ', s.showKana ? el('span', { class: 'mc-kana' }, w.kana) : null),
    el('div', { class: 'mc-meaning' }, w.meanings.join('、')),
    highlightedExample(w),
    el('p', { class: 'example-ja' }, w.exampleJa),
    speakButtons(w.example, ctx.state, { compact: true }));
}

/** 「次の復習: 10月13日」のような1行 */
export function statusLine(ws) {
  const st = statusOf(ws);
  const pill = el('span', { class: `status-pill status-${st}` }, { new: 'まだ', fuzzy: 'あやふや', learned: '覚えた' }[st]);
  let text = 'まだ学習していません';
  if (st === 'fuzzy') text = `次の復習: ${fmtDateJa(ws.due)}　正解 ${ws.correct} / まちがい ${ws.wrong}`;
  if (st === 'learned') text = ws.known ? '「もう知ってる」で覚えた箱に入れました' : `しっかり覚えました（次の確認: ${fmtDateJa(ws.due)}）`;
  return el('div', { class: 'status-line' }, pill, el('span', {}, text));
}
