// 確認クイズ: 今日の単語（新しい語 + 復習の語）
import { el, svg, randomOf, shuffle } from '../util.js';
import { ICONS, mascot, toast, confirmDialog } from '../ui.js';
import { speakButtons, miniCard } from '../components.js';
import { speak } from '../tts.js';
import { exampleParts } from '../data.js';
import { ensureWS, answer } from '../srs.js';
import { pendingQuizIds, buildQuestions } from '../session.js';

const INSTRUCTION = { meaning: 'この単語の意味は？', blank: '空らんに入る単語は？', reverse: 'この意味の英単語は？' };
const CHEERS = ['いいね！', 'ナイス！', 'その調子！', 'せいかい！', 'おお、できてる！', 'さすが！'];
const OOPS = ['惜しい！', 'だいじょうぶ、次で覚えよう', 'もう一度見てみよう', 'これは明日また出るよ'];

export function render(ctx) {
  const { state, db, go } = ctx;
  const { news, revs } = pendingQuizIds(state);

  if (!news.length && !revs.length) {
    return el('section', { class: 'view-quiz fade-in' },
      el('div', { class: 'empty' }, '今日のクイズはありません'),
      el('button', { class: 'btn btn-primary btn-block', type: 'button', onClick: () => go('home') }, 'ホームへ'));
  }

  const questions = buildQuestions(db, news, revs);
  const total = questions.length;
  const queue = questions.slice();
  const retry = [];
  const results = {}; // 単語ごと: 初回で全部正解なら true
  let answered = 0;
  let correctN = 0;
  let wrongN = 0;

  const root = el('section', { class: 'view-quiz fade-in' });

  const quit = async () => {
    const ok = await confirmDialog({ title: 'クイズをやめますか？', body: 'ここまでの答えは記録されません。あとでまた「確認クイズへ」から始められます。', okLabel: 'やめる', cancelLabel: 'つづける' });
    if (ok) go('home');
  };

  function correctLabel(q) {
    const c = q.choices.find((x) => x.id === q.wordId);
    return c ? c.label : '';
  }

  function buildPrompt(q, w) {
    if (q.type === 'meaning') {
      return el('div', { class: 'prompt' },
        el('div', { class: 'prompt-word', lang: 'en' }, w.word),
        state.settings.showKana ? el('div', { class: 'prompt-kana' }, w.kana) : null,
        speakButtons(w.word, state, { compact: true }));
    }
    if (q.type === 'blank') {
      const [a, , b] = exampleParts(w);
      return el('div', { class: 'prompt' },
        el('p', { class: 'prompt-sentence', lang: 'en' }, a, el('span', { class: 'blank' }, '＿＿＿'), b),
        el('p', { class: 'prompt-ja' }, w.exampleJa));
    }
    return el('div', { class: 'prompt' },
      el('div', { class: 'prompt-meaning' }, w.meanings.join('、')),
      el('div', { class: 'prompt-pos' }, w.pos));
  }

  function renderQuestion() {
    const q = queue.shift();
    if (!q) {
      if (retry.length) { queue.push(...retry.splice(0)); renderQuestion(); return; }
      finish();
      return;
    }
    const w = db.byId[q.wordId];
    const progress = el('div', { class: 'quiz-progress' },
      el('div', { class: 'bar' }, el('div', { class: 'fill', style: { width: `${Math.round((answered / total) * 100)}%` } })),
      el('span', { class: 'counter' }, q.retry ? 'もう一度' : `${Math.min(answered + 1, total)} / ${total}`));
    const header = el('div', { class: 'topbar' },
      el('button', { class: 'btn-text', type: 'button', onClick: quit }, svg(ICONS.close), 'やめる'),
      progress);

    const choicesEl = el('div', { class: 'choices' });
    let locked = false;
    for (const c of q.choices) {
      const b = el('button', { class: 'choice', type: 'button', lang: q.type === 'meaning' ? 'ja' : 'en' }, c.label);
      b.addEventListener('click', () => {
        if (locked) return;
        locked = true;
        onAnswer(q, w, c.id === q.wordId, b, choicesEl);
      });
      choicesEl.append(b);
    }
    const feedback = el('div', { class: 'feedback' });
    root.replaceChildren(header,
      el('div', { class: 'quiz-body' },
        el('p', { class: 'quiz-instruction' }, INSTRUCTION[q.type]),
        buildPrompt(q, w),
        choicesEl,
        feedback));
    root.feedbackEl = feedback;
    window.scrollTo({ top: 0 });
    if (q.type === 'meaning' && state.settings.autoSpeak) {
      setTimeout(() => speak(w.word, { slowRate: state.settings.slowRate }), 150);
    }
  }

  function onAnswer(q, w, ok, btn, choicesEl) {
    if (!q.retry) {
      results[q.wordId] = (q.wordId in results) ? (results[q.wordId] && ok) : ok;
      answered += 1;
      if (ok) correctN += 1; else wrongN += 1;
    }
    btn.classList.add(ok ? 'is-correct' : 'is-wrong');
    const right = correctLabel(q);
    for (const b of choicesEl.children) {
      b.disabled = true;
      if (!ok && b.textContent === right) b.classList.add('is-correct');
    }
    const fb = root.feedbackEl;
    if (ok) {
      fb.replaceChildren(el('div', { class: 'fb-ok pop' }, mascot('happy', 48), el('span', {}, randomOf(CHEERS))));
      setTimeout(renderQuestion, 900);
    } else {
      if (!q.retry) retry.push({ ...q, retry: true, choices: shuffle(q.choices) });
      fb.replaceChildren(el('div', { class: 'fb-ng fade-in' },
        el('div', { class: 'fb-head' }, mascot('oops', 48), el('span', {}, randomOf(OOPS))),
        miniCard(w, ctx),
        el('button', { class: 'btn btn-primary btn-block', type: 'button', style: { marginTop: '12px' }, onClick: renderQuestion }, 'つぎへ')));
      setTimeout(() => fb.scrollIntoView({ behavior: 'smooth', block: 'end' }), 50);
    }
  }

  function finish() {
    const today = state.today.date;
    let okWords = 0;
    let ngWords = 0;
    for (const [id, ok] of Object.entries(results)) {
      const ws = ensureWS(state, id);
      answer(ws, ok, today);
      if (!state.today.quizzed.includes(id)) state.today.quizzed.push(id);
      if (ok) okWords += 1; else ngWords += 1;
    }
    state.today.completed = true;
    if (!state.history[today]) state.history[today] = { completed: false, newCount: 0, reviewCount: 0, correct: 0, wrong: 0 };
    const h = state.history[today];
    h.completed = true;
    h.newCount += news.length;
    h.reviewCount += revs.length;
    h.correct += correctN;
    h.wrong += wrongN;
    ctx.save();
    go('done', { newCount: news.length, reviewCount: revs.length, correct: correctN, wrong: wrongN, okWords, ngWords });
  }

  renderQuestion();
  return root;
}

export { toast };
