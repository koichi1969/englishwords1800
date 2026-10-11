// 復習のタイミングを決める（間隔反復）。
// 箱（box）0〜5。正解するほど箱が進み、次に出るまでの日数が長くなる。まちがえると箱0に戻る。
import { addDays } from './util.js';

export const INTERVALS = [1, 1, 3, 7, 14, 30]; // 箱ごとの「次に出るまでの日数」
export const LEARNED_BOX = 4;                  // この箱以上は「覚えた」扱い

export function newWordState() {
  return { box: 0, due: null, seen: 0, correct: 0, wrong: 0, known: false, knownAt: null, firstSeen: null, lastSeen: null };
}

export function ensureWS(state, id) {
  if (!state.words[id]) state.words[id] = newWordState();
  return state.words[id];
}

/** 学習画面でカードを見た */
export function markStudied(ws, today) {
  ws.seen += 1;
  if (!ws.firstSeen) ws.firstSeen = today;
  ws.lastSeen = today;
  if (!ws.due) ws.due = today;
}

/** クイズの結果を反映する */
export function answer(ws, correct, today) {
  if (correct) {
    ws.correct += 1;
    ws.box = Math.min(ws.box + 1, INTERVALS.length - 1);
  } else {
    ws.wrong += 1;
    ws.box = 0;
  }
  ws.due = addDays(today, INTERVALS[ws.box]);
  ws.lastSeen = today;
}

/** 'new'（まだ） | 'fuzzy'（あやふや） | 'learned'（覚えた） */
export function statusOf(ws) {
  if (!ws) return 'new';
  if (ws.known || ws.box >= LEARNED_BOX) return 'learned';
  if (ws.seen > 0 || ws.correct + ws.wrong > 0) return 'fuzzy';
  return 'new';
}

export const STATUS_LABEL = { new: 'まだ', fuzzy: 'あやふや', learned: '覚えた' };
