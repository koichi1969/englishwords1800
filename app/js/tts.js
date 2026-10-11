// 音声読み上げ（ブラウザ内蔵の Web Speech API）。追加費用なし。
// iPhone の Safari は英語音声（Samantha など）を持っている。

const supported = typeof window !== 'undefined'
  && 'speechSynthesis' in window
  && 'SpeechSynthesisUtterance' in window;

let voices = [];

function refresh() {
  try { voices = window.speechSynthesis.getVoices() || []; } catch { voices = []; }
}

if (supported) {
  refresh();
  try { window.speechSynthesis.addEventListener('voiceschanged', refresh); } catch { /* 古いブラウザ */ }
  window.speechSynthesis.onvoiceschanged = refresh;
}

export function canSpeak() {
  return supported;
}

// 聞きやすい声を優先する（あれば）
const PREFERRED = ['Samantha', 'Google US English', 'Microsoft Aria', 'Microsoft Jenny', 'Microsoft Zira', 'Ava', 'Allison', 'Alex'];

function pickVoice() {
  if (!voices.length) refresh();
  const en = voices.filter((v) => /^en([-_]|$)/i.test(v.lang));
  if (!en.length) return null;
  const us = en.filter((v) => /en[-_]US/i.test(v.lang));
  const pool = us.length ? us : en;
  for (const name of PREFERRED) {
    const v = pool.find((x) => x.name && x.name.includes(name));
    if (v) return v;
  }
  return pool.find((v) => v.default) || pool[0];
}

/** 英語を読み上げる。slow=true でゆっくり。 */
export function speak(text, { slow = false, slowRate = 0.6 } = {}) {
  if (!supported || !text) return false;
  const synth = window.speechSynthesis;
  try { synth.cancel(); } catch { /* ignore */ }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = slow ? slowRate : 1;
  u.pitch = 1;
  u.volume = 1;
  const v = pickVoice();
  if (v) u.voice = v;
  // Chrome は cancel() 直後の speak() が鳴らないことがあるので少し待つ
  setTimeout(() => {
    try { synth.speak(u); } catch (e) { console.warn('speak failed', e); }
  }, 60);
  return true;
}

export function stop() {
  if (!supported) return;
  try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
}
