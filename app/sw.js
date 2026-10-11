/* まいにち英単語 - Service Worker
 * 役割: ファイルを端末に保存して、電波がなくても開けるようにする。
 * 更新のしかた: アプリのファイルを変えたら、下の VERSION を変える（古い保存を捨てて新しいものを取り直す）。
 */
const VERSION = '0.1.0-2026-10-11a';
const CACHE = `mainichi-eitango-${VERSION}`;
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/app.js',
  './js/util.js',
  './js/ui.js',
  './js/tts.js',
  './js/data.js',
  './js/srs.js',
  './js/store.js',
  './js/session.js',
  './js/components.js',
  './js/views/onboarding.js',
  './js/views/home.js',
  './js/views/study.js',
  './js/views/quiz.js',
  './js/views/done.js',
  './js/views/list.js',
  './js/views/settings.js',
  './data/words.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// HTML と単語データは「まずネット、だめなら保存分」。それ以外は「まず保存分、なければネット」。
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const networkFirst = req.mode === 'navigate' || url.pathname.endsWith('.json') || url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  if (networkFirst) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((cache) => cache.put(req, copy));
      return res;
    }))
  );
});
