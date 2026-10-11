// 学習記録の保存（端末内の localStorage）。書き出し・読み込みもここ。

const KEY = 'mainichi-eitango.state.v1';
export const APP_VERSION = '0.1.0';

export function defaultState() {
  return {
    version: 1,
    app: APP_VERSION,
    onboarded: false,
    settings: {
      dailyNew: 5,          // 1日の新しい単語の数
      showKana: true,       // カタカナ読み（目安）を表示
      slowRate: 0.6,        // 「ゆっくり」の速さ
      autoSpeak: true,      // カードを開いたら自動で読む
      homeHintDismissed: false,
    },
    words: {},              // 単語ごとの記録（srs.js の形）
    today: null,            // 今日の単語（session.js）
    history: {},            // 日付ごとの実績
    createdAt: new Date().toISOString(),
  };
}

export function normalize(s) {
  const d = defaultState();
  if (!s || typeof s !== 'object') return d;
  return {
    ...d,
    ...s,
    settings: { ...d.settings, ...(s.settings || {}) },
    words: s.words && typeof s.words === 'object' ? s.words : {},
    history: s.history && typeof s.history === 'object' ? s.history : {},
  };
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    return normalize(JSON.parse(raw));
  } catch (e) {
    console.warn('学習記録を読めませんでした。初期状態で始めます。', e);
    return defaultState();
  }
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.warn('学習記録を保存できませんでした', e);
    return false;
  }
}

export function clear() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

export function exportJSON(state) {
  return JSON.stringify({ app: 'mainichi-eitango', appVersion: APP_VERSION, exportedAt: new Date().toISOString(), state }, null, 2);
}

export function parseImport(text) {
  const obj = JSON.parse(text);
  const s = obj && obj.state ? obj.state : obj;
  if (!s || typeof s !== 'object' || typeof s.words !== 'object' || !s.settings) {
    throw new Error('このファイルは「まいにち英単語」の書き出しデータではないようです。');
  }
  return normalize(s);
}
