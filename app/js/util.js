// 小さな道具箱: 要素づくり、日付、乱数

/** 要素を作る。el('div', {class:'a', onClick: fn}, '文字', 子要素, [配列も可]) */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k === 'text') node.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'dataset') Object.assign(node.dataset, v);
      else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
      else node.setAttribute(k, v === true ? '' : String(v));
    }
  }
  appendChildren(node, children);
  return node;
}

function appendChildren(node, children) {
  for (const c of children) {
    if (c === null || c === undefined || c === false || c === true) continue;
    if (Array.isArray(c)) { appendChildren(node, c); continue; }
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

/** 子要素を入れ替える（null / false は無視する） */
export function setChildren(node, ...children) {
  node.replaceChildren();
  appendChildren(node, children);
  return node;
}

/** SVG などの文字列から要素を作る */
export function svg(markup) {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return t.content.firstChild;
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function randomOf(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 今日の日付を "YYYY-MM-DD"（端末の時刻） */
export function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(dateStr, n) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + n);
  return todayStr(d);
}

const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土'];

export function fmtDateJa(dateStr, { weekday = true } = {}) {
  if (!dateStr) return '';
  const d = parseDate(dateStr);
  return `${d.getMonth() + 1}月${d.getDate()}日` + (weekday ? `（${WEEKDAYS_JA[d.getDay()]}）` : '');
}

export function pct(a, b) {
  return b ? Math.round((a / b) * 100) : 0;
}
