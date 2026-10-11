// 「今日の単語」の選び方、知ってる単語の扱い、クイズ問題づくり、集計
import { todayStr, addDays, shuffle } from './util.js';
import { ensureWS, markStudied, statusOf } from './srs.js';
import { primaryPos, blankable } from './data.js';

export const EXTRA_ROUND = 5;   // 「もう5語やる」で増える数
export const MAX_REVIEWS = 20;  // 1日に出す復習の上限

function isUnseen(state, id) {
  const ws = state.words[id];
  return !ws || (!ws.known && ws.seen === 0 && ws.correct + ws.wrong === 0);
}

/** まだ見ていない単語を、データの順番で n 語選ぶ */
export function pickNew(state, db, n, exclude = new Set()) {
  const out = [];
  for (const w of db.words) {
    if (out.length >= n) break;
    if (exclude.has(w.id)) continue;
    if (isUnseen(state, w.id)) out.push(w.id);
  }
  return out;
}

/** 今日が復習日になっている単語（古いものから） */
export function dueReviews(state, db, today) {
  return db.words
    .filter((w) => {
      const ws = state.words[w.id];
      return ws && !ws.known && ws.due && ws.due <= today && (ws.seen > 0 || ws.correct + ws.wrong > 0);
    })
    .sort((a, b) => state.words[a.id].due.localeCompare(state.words[b.id].due))
    .slice(0, MAX_REVIEWS)
    .map((w) => w.id);
}

/** 今日のセットを用意する（日付が変わっていれば作り直す） */
export function ensureToday(state, db) {
  const t = todayStr();
  if (state.today && state.today.date === t) {
    refillToday(state, db);
    return state.today;
  }
  state.today = {
    date: t,
    target: state.settings.dailyNew,
    newIds: [],
    reviewIds: dueReviews(state, db, t),
    studied: [],
    quizzed: [],
    completed: false,
    rounds: 0,
  };
  refillToday(state, db);
  return state.today;
}

/** 「知ってる」にした語を外し、目標の数まで新しい語を補う */
export function refillToday(state, db) {
  const t = state.today;
  if (!t) return;
  t.newIds = t.newIds.filter((id) => db.byId[id] && !(state.words[id] && state.words[id].known));
  t.reviewIds = t.reviewIds.filter((id) => db.byId[id] && !(state.words[id] && state.words[id].known));
  t.studied = t.studied.filter((id) => t.newIds.includes(id));
  // 多すぎる分（未学習のものを後ろから）を外す
  while (t.newIds.length > t.target) {
    const rev = [...t.newIds].reverse();
    const idx = rev.findIndex((id) => !t.studied.includes(id) && !t.quizzed.includes(id));
    if (idx < 0) break;
    t.newIds.splice(t.newIds.length - 1 - idx, 1);
  }
  // 足りない分を補う
  if (t.newIds.length < t.target) {
    const exclude = new Set([...t.newIds, ...t.reviewIds, ...t.quizzed]);
    t.newIds.push(...pickNew(state, db, t.target - t.newIds.length, exclude));
  }
}

/** 学習カードを見た */
export function studyWord(state, id) {
  const ws = ensureWS(state, id);
  markStudied(ws, state.today.date);
  if (!state.today.studied.includes(id)) state.today.studied.push(id);
}

/** 「もう知ってる」／「まだ」に切り替える */
export function setKnown(state, db, id, known) {
  applyKnown(state, id, known);
  refillToday(state, db);
}

export function setKnownMany(state, db, ids, known) {
  for (const id of ids) applyKnown(state, id, known);
  refillToday(state, db);
}

function applyKnown(state, id, known) {
  const ws = ensureWS(state, id);
  ws.known = known;
  ws.knownAt = known ? todayStr() : null;
  if (known) {
    ws.due = null;
  } else if (ws.seen > 0 || ws.correct + ws.wrong > 0) {
    ws.box = 0;
    ws.due = todayStr();
  }
}

export function unstudiedIds(state) {
  const t = state.today;
  return t.newIds.filter((id) => !t.studied.includes(id));
}

/** まだクイズをしていない語（新しい語・復習の語） */
export function pendingQuizIds(state) {
  const t = state.today;
  const news = t.newIds.filter((id) => t.studied.includes(id) && !t.quizzed.includes(id));
  const revs = t.reviewIds.filter((id) => !t.quizzed.includes(id));
  return { news, revs };
}

/** 「もう5語やる」 */
export function addExtraRound(state, db) {
  const t = state.today;
  t.target += EXTRA_ROUND;
  t.rounds += 1;
  t.completed = false;
  refillToday(state, db);
}

/** 1日の目標数を変えたときに今日のセットを合わせる */
export function retargetToday(state, db) {
  const t = state.today;
  if (!t) return;
  t.target = state.settings.dailyNew + EXTRA_ROUND * t.rounds;
  refillToday(state, db);
}

/** 連続学習日数 */
export function streak(state) {
  let n = 0;
  let d = todayStr();
  if (!(state.history[d] && state.history[d].completed)) d = addDays(d, -1);
  while (state.history[d] && state.history[d].completed) {
    n += 1;
    d = addDays(d, -1);
  }
  return n;
}

export function learnedCount(state, db) {
  let n = 0;
  for (const w of db.words) if (statusOf(state.words[w.id]) === 'learned') n += 1;
  return n;
}

export function countsByStatus(state, db) {
  const c = { new: 0, fuzzy: 0, learned: 0 };
  for (const w of db.words) c[statusOf(state.words[w.id])] += 1;
  return c;
}

/** 次に出てくる予定の新しい単語 */
export function nextUp(state, db, n) {
  const t = state.today;
  const exclude = new Set([...(t ? t.newIds : []), ...(t ? t.reviewIds : [])]);
  return pickNew(state, db, n, exclude).map((id) => db.byId[id]);
}

// ---------- クイズ問題 ----------

function distractors(db, w, n, labelFn) {
  const pos = primaryPos(w);
  const used = new Set([labelFn(w)]);
  const pool = db.words.filter((x) => x.id !== w.id);
  const sameIds = new Set();
  const same = shuffle(pool.filter((x) => primaryPos(x) === pos && Math.abs(x.level - w.level) <= 1));
  same.forEach((x) => sameIds.add(x.id));
  const rest = shuffle(pool.filter((x) => !sameIds.has(x.id)));
  const out = [];
  for (const x of [...same, ...rest]) {
    const l = labelFn(x);
    if (used.has(l)) continue;
    used.add(l);
    out.push(x);
    if (out.length >= n) break;
  }
  return out;
}

const meaningLabel = (x) => x.meanings[0];
const wordLabel = (x) => x.word;

function meaningQ(db, w) {
  const ds = distractors(db, w, 3, meaningLabel);
  return { type: 'meaning', wordId: w.id, choices: shuffle([w, ...ds].map((x) => ({ id: x.id, label: meaningLabel(x) }))) };
}

function blankQ(db, w) {
  const ds = distractors(db, w, 3, wordLabel);
  return { type: 'blank', wordId: w.id, choices: shuffle([w, ...ds].map((x) => ({ id: x.id, label: wordLabel(x) }))) };
}

function reverseQ(db, w) {
  const ds = distractors(db, w, 3, wordLabel);
  return { type: 'reverse', wordId: w.id, choices: shuffle([w, ...ds].map((x) => ({ id: x.id, label: wordLabel(x) }))) };
}

/** 新しい語は2問（意味 + 空らん or 日→英）、復習の語は1問 */
export function buildQuestions(db, newIds, reviewIds) {
  const qs = [];
  for (const id of newIds) {
    const w = db.byId[id];
    if (!w) continue;
    qs.push(meaningQ(db, w));
    qs.push(blankable(w) ? blankQ(db, w) : reverseQ(db, w));
  }
  for (const id of reviewIds) {
    const w = db.byId[id];
    if (!w) continue;
    const r = Math.random();
    if (r < 0.4) qs.push(meaningQ(db, w));
    else if (r < 0.75 && blankable(w)) qs.push(blankQ(db, w));
    else qs.push(reverseQ(db, w));
  }
  return shuffle(qs);
}
