// 設定: 1日の語数、カタカナ表示、音声、データの書き出し・読み込み、使い方
import { el, todayStr } from '../util.js';
import { toast, confirmDialog } from '../ui.js';
import { speak, canSpeak } from '../tts.js';
import * as store from '../store.js';
import { retargetToday } from '../session.js';

export function render(ctx) {
  const { state, db, go } = ctx;
  const s = state.settings;

  const rerender = () => go('settings');

  const toggle = (key, after) => el('button', {
    class: `toggle${s[key] ? ' on' : ''}`, type: 'button', role: 'switch', 'aria-checked': String(!!s[key]),
    onClick: () => { s[key] = !s[key]; ctx.save(); if (after) after(); rerender(); },
  });

  const seg = (key, options, after) => el('div', { class: 'seg-small' },
    options.map(([val, label]) => el('button', {
      class: s[key] === val ? 'active' : '', type: 'button',
      onClick: () => { s[key] = val; ctx.save(); if (after) after(); rerender(); },
    }, label)));

  const setting = (label, desc, control) => el('div', { class: 'setting' },
    el('div', {}, el('div', { class: 's-label' }, label), desc ? el('div', { class: 's-desc' }, desc) : null),
    control);

  // ---- データ ----
  const fileInput = el('input', { class: 'file-input', type: 'file', accept: 'application/json,.json' });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = store.parseImport(text);
      const n = Object.keys(imported.words || {}).length;
      const ok = await confirmDialog({
        title: '学習記録を読み込みますか？',
        body: `ファイルには ${n} 語分の記録があります。今の記録はこのファイルの内容に置きかわります。`,
        okLabel: '読み込む',
      });
      if (!ok) return;
      ctx.replaceState(imported);
      toast('学習記録を読み込みました');
      go('home');
    } catch (e) {
      toast(e.message || '読み込みに失敗しました', { ms: 3000 });
    } finally {
      fileInput.value = '';
    }
  });

  const exportData = () => {
    const text = store.exportJSON(state);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: `mainichi-eitango-${todayStr()}.json` });
    document.body.append(a);
    a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1500);
    toast('書き出しファイルを作りました');
  };

  const resetAll = async () => {
    const ok1 = await confirmDialog({ title: '学習記録をすべて消しますか？', body: '覚えた箱・連続日数・今日の単語がすべて消え、最初の状態に戻ります。元に戻せません。', okLabel: '消す', danger: true });
    if (!ok1) return;
    const ok2 = await confirmDialog({ title: '本当に消しますか？', body: '心配なときは、先に「学習記録を書き出す」で保存してください。', okLabel: 'はい、消します', cancelLabel: 'やめる', danger: true });
    if (!ok2) return;
    store.clear();
    ctx.replaceState(store.defaultState());
    toast('学習記録を消しました');
    go('onboarding');
  };

  const voiceTest = () => {
    if (!canSpeak()) { toast('このブラウザでは音声を再生できません'); return; }
    speak('Hello! Nice to meet you.', { slowRate: s.slowRate });
  };

  return el('div', { class: 'view-settings fade-in' },
    el('h1', { class: 'page-title' }, '設定'),

    el('section', { class: 'settings-group' },
      el('h2', {}, '学習'),
      setting('1日の新しい単語', '多いほど早く進みますが、無理のない数で。', seg('dailyNew', [[3, '3語'], [5, '5語'], [10, '10語']], () => retargetToday(state, db))),
      setting('カタカナ読み（目安）を表示', '英語の音とは違います。音声と聞き比べて。', toggle('showKana')),
      setting('カードを開いたら自動で読む', '単語の音声が自動で流れます。', toggle('autoSpeak'))),

    el('section', { class: 'settings-group' },
      el('h2', {}, '音声'),
      setting('「ゆっくり」の速さ', null, seg('slowRate', [[0.5, 'かなり'], [0.6, 'ふつう'], [0.75, 'すこし']])),
      setting('音声テスト', '音が出ないときは、端末の音量とマナーモードを確認。', el('button', { class: 'btn btn-secondary', type: 'button', onClick: voiceTest }, '🔊 テスト'))),

    el('section', { class: 'settings-group' },
      el('h2', {}, 'データ'),
      setting('学習記録を書き出す', 'ファイルとして保存。機種変更や保護者への共有に。', el('button', { class: 'btn btn-secondary', type: 'button', onClick: exportData }, '書き出す')),
      setting('学習記録を読み込む', '書き出したファイルから復元します。', el('button', { class: 'btn btn-secondary', type: 'button', onClick: () => fileInput.click() }, '読み込む')),
      setting('学習記録をすべて消す', '最初からやり直したいときに。', el('button', { class: 'btn btn-danger', type: 'button', onClick: resetAll }, '消す')),
      fileInput),

    el('section', { class: 'settings-group howto' },
      el('h2', {}, '使い方'),
      el('div', { class: 'setting', style: { display: 'block' } },
        el('div', { class: 's-label' }, '毎日の流れ'),
        el('ol', {},
          el('li', {}, 'ホームの「はじめる」を押す'),
          el('li', {}, '1語ずつ、意味・例文・音声を確認して「つぎへ」'),
          el('li', {}, '最後に確認クイズ。まちがえた単語は明日また出ます'),
          el('li', {}, '知っている単語は「もう知ってる」で外せます'))),
      el('div', { class: 'setting', style: { display: 'block' } },
        el('div', { class: 's-label' }, 'iPhone のホーム画面に追加する'),
        el('ol', {},
          el('li', {}, 'Safari でこのページを開く'),
          el('li', {}, '画面下の共有ボタン（四角から矢印が出ているマーク）を押す'),
          el('li', {}, '「ホーム画面に追加」を選び、「追加」'),
          el('li', {}, 'ホーム画面の「英単語」から開くと、アプリのように使えます')))),

    el('p', { class: 'version' }, `まいにち英単語 v${store.APP_VERSION}　単語データ ${db.version}（${db.words.length}語）`));
}
