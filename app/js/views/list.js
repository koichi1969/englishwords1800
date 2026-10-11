// 単語一覧: まだ／あやふや／覚えた の箱、絞り込み、検索、仕分け
import { el, setChildren } from '../util.js';
import { openSheet, confirmDialog, toast } from '../ui.js';
import { wordCard, statusLine, speakButtons } from '../components.js';
import { statusOf } from '../srs.js';
import { setKnown, setKnownMany, countsByStatus } from '../session.js';

// 絞り込みの状態はアプリを開いている間おぼえておく
const F = { tab: 'new', level: 'all', theme: 'all', q: '' };
const PAGE = 100;

export function render(ctx) {
  const { state, db } = ctx;
  let shown = PAGE;

  const search = el('input', {
    class: 'search', type: 'search', placeholder: '単語・意味・カタカナで検索', value: F.q,
    autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
    onInput: (e) => { F.q = e.target.value; shown = PAGE; updateRows(); },
  });

  const segment = el('div', { class: 'segment' });
  const levelSel = el('select', { class: 'select', 'aria-label': 'レベル', onChange: (e) => { F.level = e.target.value; shown = PAGE; updateRows(); } },
    el('option', { value: 'all' }, 'すべてのレベル'),
    db.levelKeys.map((k) => el('option', { value: k, selected: F.level === k }, db.levels[k])));
  const themeSel = el('select', { class: 'select', 'aria-label': 'テーマ', onChange: (e) => { F.theme = e.target.value; shown = PAGE; updateRows(); } },
    el('option', { value: 'all' }, 'すべてのテーマ'),
    db.themes.map((th) => el('option', { value: th, selected: F.theme === th }, th)));
  const actions = el('div', { class: 'list-actions' });
  const rows = el('div', { class: 'rows' });
  const footer = el('div', {});

  function filtered() {
    const q = F.q.trim().toLowerCase();
    return db.words.filter((w) => statusOf(state.words[w.id]) === F.tab
      && (F.level === 'all' || w.level === Number(F.level))
      && (F.theme === 'all' || w.theme === F.theme)
      && (!q || w.word.toLowerCase().includes(q) || w.meanings.some((m) => m.includes(q)) || (w.kana || '').includes(q)));
  }

  function updateSegment() {
    const c = countsByStatus(state, db);
    segment.replaceChildren(...[['new', 'まだ'], ['fuzzy', 'あやふや'], ['learned', '覚えた']].map(([key, label]) =>
      el('button', { class: key === F.tab ? 'active' : '', type: 'button', onClick: () => { F.tab = key; shown = PAGE; updateSegment(); updateRows(); } },
        label, el('small', {}, `${c[key]}語`))));
  }

  function rowEl(w) {
    return el('button', { class: 'row', type: 'button', onClick: () => openDetail(w) },
      el('span', { class: 'r-main' },
        el('span', { class: 'r-word', lang: 'en' }, w.word, ' ', state.settings.showKana ? el('span', { class: 'r-kana' }, w.kana) : null),
        el('span', { class: 'r-meaning' }, w.meanings.join('、'))),
      el('span', { class: 'badge badge-pos' }, String(w.pos).split('・')[0]));
  }

  function updateRows() {
    const list = filtered();
    setChildren(actions,
      F.tab !== 'learned' && list.length ? el('button', { class: 'btn btn-secondary', type: 'button', onClick: () => openSorter(list) }, '⚡ さくさく仕分け') : null,
      F.tab !== 'learned' && list.length ? el('button', { class: 'btn btn-ghost', type: 'button', onClick: () => bulkKnown(list) }, `表示中の${list.length}語をまとめて「知ってる」に`) : null,
      F.tab === 'learned' && list.length ? el('button', { class: 'btn btn-ghost', type: 'button', onClick: () => bulkUnknown(list) }, `表示中の${list.length}語を「まだ」に戻す`) : null);
    if (!list.length) {
      rows.replaceChildren(el('div', { class: 'empty' }, F.q ? '見つかりませんでした' : 'この箱には単語がありません'));
      footer.replaceChildren();
      return;
    }
    rows.replaceChildren(...list.slice(0, shown).map(rowEl));
    footer.replaceChildren(list.length > shown
      ? el('button', { class: 'btn btn-ghost btn-block', type: 'button', style: { marginTop: '12px' }, onClick: () => { shown += PAGE; updateRows(); } }, `もっと見る（残り ${list.length - shown} 語）`)
      : el('p', { class: 'version' }, `${list.length} 語`));
  }

  function updateAll() { updateSegment(); updateRows(); }

  function openDetail(w) {
    const ws = state.words[w.id];
    const st = statusOf(ws);
    const btn = st === 'learned'
      ? el('button', { class: 'btn btn-secondary btn-block', type: 'button', onClick: () => { setKnown(state, db, w.id, false); ctx.save(); sheet.close(); toast(`「${w.word}」を「まだ」に戻しました`); updateAll(); } }, 'まだ覚えていない（学習に戻す）')
      : el('button', { class: 'btn btn-primary btn-block', type: 'button', onClick: () => { setKnown(state, db, w.id, true); ctx.save(); sheet.close(); toast(`「${w.word}」を覚えた箱に入れました`); updateAll(); } }, '✓ もう知ってる');
    const content = el('div', {}, wordCard(w, ctx), statusLine(ws), el('div', { style: { marginTop: '8px' } }, btn));
    const sheet = openSheet(content, { title: w.word });
  }

  async function bulkKnown(list) {
    const ok = await confirmDialog({
      title: `${list.length}語を「もう知ってる」にしますか？`,
      body: '表示中の単語がすべて「覚えた箱」に入り、今日の単語やクイズに出なくなります。あとで1語ずつ「まだ」に戻せます。',
      okLabel: 'まとめて入れる',
    });
    if (!ok) return;
    setKnownMany(state, db, list.map((w) => w.id), true);
    ctx.save();
    toast(`${list.length}語を覚えた箱に入れました`);
    updateAll();
  }

  async function bulkUnknown(list) {
    const ok = await confirmDialog({
      title: `${list.length}語を「まだ」に戻しますか？`,
      body: '表示中の単語がすべて学習の対象に戻ります。',
      okLabel: '戻す',
    });
    if (!ok) return;
    setKnownMany(state, db, list.map((w) => w.id), false);
    ctx.save();
    toast(`${list.length}語を「まだ」に戻しました`);
    updateAll();
  }

  function openSorter(list) {
    const items = list.slice();
    let i = 0;
    let known = 0;
    const body = el('div', { class: 'sorter' });
    const sheet = openSheet(body, { title: 'さくさく仕分け', onClose: () => { ctx.save(); updateAll(); } });
    const step = () => {
      if (i >= items.length) {
        body.replaceChildren(
          el('div', { class: 'empty' }, `おつかれさま！ ${known}語を覚えた箱に入れました。`),
          el('button', { class: 'btn btn-primary btn-block', type: 'button', onClick: () => sheet.close() }, 'とじる'));
        return;
      }
      const w = items[i];
      const reveal = el('div', { class: 's-reveal' },
        el('button', { class: 'btn btn-ghost', type: 'button', onClick: () => reveal.replaceChildren(
          el('div', { class: 'mc-meaning' }, w.meanings.join('、')),
          el('p', { class: 'example-ja', style: { margin: 0 }, lang: 'en' }, w.example)) }, '意味を見る'));
      setChildren(body,
        el('p', { class: 'counter', style: { margin: 0 } }, `${i + 1} / ${items.length}`),
        el('div', { class: 's-word', lang: 'en' }, w.word),
        state.settings.showKana ? el('div', { class: 's-kana' }, w.kana) : null,
        el('div', { style: { marginTop: '8px' } }, speakButtons(w.word, state, { compact: true })),
        reveal,
        el('div', { class: 's-buttons' },
          el('button', { class: 'btn btn-ghost', type: 'button', onClick: () => { i += 1; step(); } }, 'まだ'),
          el('button', { class: 'btn btn-primary', type: 'button', onClick: () => { setKnown(state, db, w.id, true); known += 1; i += 1; step(); } }, '✓ 知ってる')),
        el('p', { style: { color: 'var(--muted)', fontSize: '13px', marginTop: '14px' } }, '「知ってる」は覚えた箱へ。「まだ」はそのまま残ります。'));
    };
    step();
  }

  updateAll();

  return el('div', { class: 'view-list fade-in' },
    el('h1', { class: 'page-title' }, '単語一覧'),
    search,
    segment,
    el('div', { class: 'filters' }, levelSel, themeSel),
    actions,
    rows,
    footer);
}
