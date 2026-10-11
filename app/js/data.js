// 単語データの読み込みと、例文の中の単語を見つける処理

let DB = null;

export async function loadWords() {
  const res = await fetch('./data/words.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`単語データを読み込めませんでした（${res.status}）`);
  const json = await res.json();
  const byId = {};
  json.words.forEach((w, i) => {
    w.order = i;
    byId[w.id] = w;
  });
  const levels = json.levels || { 1: '中1レベル', 2: '中2レベル', 3: '中3レベル' };
  DB = { ...json, levels, byId, levelKeys: Object.keys(levels) };
  return DB;
}

export function db() {
  return DB;
}

/** 品詞の最初の1つ（「動詞・名詞」→「動詞」） */
export function primaryPos(w) {
  return String(w.pos || '').split('・')[0];
}

/** 単語の活用形の候補（tools/check_words.py と同じ規則） */
export function variants(word) {
  const w = word.toLowerCase();
  const out = new Set([w, `${w}s`, `${w}es`, `${w}ed`, `${w}d`, `${w}ing`]);
  if (w.endsWith('e')) { out.add(`${w.slice(0, -1)}ing`); out.add(`${w.slice(0, -1)}ed`); }
  if (w.endsWith('y')) { out.add(`${w.slice(0, -1)}ies`); out.add(`${w.slice(0, -1)}ied`); }
  if (/[^aeiou][aeiou][^aeiouwxy]$/.test(w)) { const c = w[w.length - 1]; out.add(`${w}${c}ing`); out.add(`${w}${c}ed`); }
  return [...out].sort((a, b) => b.length - a.length);
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 例文の中で、その単語が出てくる場所 { text, start, end }。見つからなければ null */
export function findForm(w) {
  const text = w.example || '';
  const cands = w.form ? [w.form] : variants(w.word);
  for (const c of cands) {
    const re = new RegExp(`\\b${escapeRe(c)}\\b`, 'i');
    const m = re.exec(text);
    if (m) return { text: m[0], start: m.index, end: m.index + m[0].length };
  }
  return null;
}

/** 例文を [前, 単語, 後] に分ける */
export function exampleParts(w) {
  const f = findForm(w);
  if (!f) return [w.example, '', ''];
  return [w.example.slice(0, f.start), f.text, w.example.slice(f.end)];
}

/** 空らん問題に使えるか（例文の形が見出し語と同じとき） */
export function blankable(w) {
  const f = findForm(w);
  return !!f && f.text.toLowerCase() === w.word.toLowerCase();
}
