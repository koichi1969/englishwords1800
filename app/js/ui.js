// 画面の共通部品: トースト、下から出るシート、確認ダイアログ、マスコット、アイコン
import { el, svg } from './util.js';

export const ICONS = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h10"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>',
  chevronLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
};

/** 画面下に短いメッセージを出す */
export function toast(message, { ms = 1800 } = {}) {
  const host = document.getElementById('toast');
  if (!host) return;
  const t = el('div', { class: 'toast' }, message);
  host.append(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 300);
  }, ms);
}

/** 下から出てくるパネル。戻り値の close() で閉じる */
export function openSheet(content, { title = '', onClose } = {}) {
  let closed = false;
  const overlay = el('div', { class: 'sheet-overlay' });
  const close = () => {
    if (closed) return;
    closed = true;
    overlay.classList.remove('show');
    document.body.classList.remove('no-scroll');
    setTimeout(() => overlay.remove(), 250);
    if (onClose) onClose();
  };
  const panel = el('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' },
    el('div', { class: 'sheet-head' },
      el('div', { class: 'sheet-title', lang: /^[A-Za-z' .!?-]+$/.test(title) ? 'en' : 'ja' }, title),
      el('button', { class: 'icon-btn', type: 'button', 'aria-label': '閉じる', onClick: close }, svg(ICONS.close))),
    el('div', { class: 'sheet-body' }, content));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.append(panel);
  document.body.append(overlay);
  document.body.classList.add('no-scroll');
  requestAnimationFrame(() => overlay.classList.add('show'));
  return { close, panel };
}

/** 「はい／いいえ」を聞く。Promise<boolean> */
export function confirmDialog({ title, body, okLabel = 'OK', cancelLabel = 'キャンセル', danger = false }) {
  return new Promise((resolve) => {
    let done = false;
    let sheet = null;
    const finish = (v) => {
      if (done) return;
      done = true;
      resolve(v);
      if (sheet) sheet.close();
    };
    const content = el('div', { class: 'confirm' },
      body ? el('p', { class: 'confirm-body' }, body) : null,
      el('div', { class: 'btn-row' },
        el('button', { class: 'btn btn-secondary', type: 'button', onClick: () => finish(false) }, cancelLabel),
        el('button', { class: `btn ${danger ? 'btn-danger' : 'btn-primary'}`, type: 'button', onClick: () => finish(true) }, okLabel)));
    sheet = openSheet(content, { title, onClose: () => finish(false) });
  });
}

/** マスコット「ふきだしくん」。mood: normal | happy | oops */
export function mascot(mood = 'normal', size = 80) {
  const ink = '#2B2B3B';
  let eyes;
  let mouth;
  if (mood === 'happy') {
    eyes = `<path d="M38 52q8-10 16 0" stroke="${ink}" stroke-width="4.5" fill="none" stroke-linecap="round"/><path d="M68 52q8-10 16 0" stroke="${ink}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
    mouth = `<path d="M49 60q12 14 24 0z" fill="${ink}"/><path d="M54 66q7 5 14 0z" fill="#FF8A7A"/>`;
  } else if (mood === 'oops') {
    eyes = `<circle cx="46" cy="52" r="5.5" fill="${ink}"/><circle cx="76" cy="52" r="5.5" fill="${ink}"/><path d="M36 40l16 5" stroke="${ink}" stroke-width="3.5" stroke-linecap="round"/><path d="M86 40l-16 5" stroke="${ink}" stroke-width="3.5" stroke-linecap="round"/>`;
    mouth = `<ellipse cx="61" cy="67" rx="5" ry="4" fill="${ink}"/>`;
  } else {
    eyes = `<circle cx="46" cy="52" r="6" fill="${ink}"/><circle cx="76" cy="52" r="6" fill="${ink}"/><circle cx="44" cy="50" r="2" fill="#fff"/><circle cx="74" cy="50" r="2" fill="#fff"/>`;
    mouth = `<path d="M52 63q9 8 18 0" stroke="${ink}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  }
  return svg(`<svg class="mascot mascot-${mood}" viewBox="0 0 122 122" width="${size}" height="${size}" aria-hidden="true">
    <path d="M22 16h78a14 14 0 0 1 14 14v46a14 14 0 0 1-14 14H60l-18 17V90H22a14 14 0 0 1-14-14V30a14 14 0 0 1 14-14z" fill="#FF6B4A"/>
    <circle cx="34" cy="62" r="5" fill="#FFB4A8"/><circle cx="88" cy="62" r="5" fill="#FFB4A8"/>
    ${eyes}${mouth}
  </svg>`);
}
