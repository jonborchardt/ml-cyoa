// Basic offline-first service worker for ml-cyoa.
// - Precaches the app shell + ChoiceScript engine on install.
// - Network-first for HTML so updates reach users on next launch.
// - Cache-first for everything else (engine JS/CSS, JS bundles, fonts, etc.).
// Bump CACHE_VERSION to invalidate the precache on the next visit.

const CACHE_VERSION = 'ml-cyoa-v1';
const PRECACHE_URLS = [
    './',
    'index.html',
    'manifest.webmanifest',
    'icon.svg',
    'choicescript/host.html',
    'choicescript/scene.js',
    'choicescript/navigator.js',
    'choicescript/util.js',
    'choicescript/ui.js',
    'choicescript/persist.js',
    'choicescript/style.css',
    'choicescript/alertify.min.js',
    'choicescript/alertify.css',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION).then((cache) =>
            // Precache best-effort — a single missing file shouldn't block install.
            Promise.all(
                PRECACHE_URLS.map((url) =>
                    cache.add(new Request(url, { cache: 'reload' })).catch(() => {})
                )
            )
        )
    );
    // Do NOT call skipWaiting() here — taking control mid-session can disrupt
    // an active game. The new SW activates on the next navigation instead.
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    const isNavigation = req.mode === 'navigate' || req.destination === 'document';

    if (isNavigation) {
        event.respondWith(
            fetch(req)
                .then((res) => {
                    const copy = res.clone();
                    caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
                    return res;
                })
                .catch(() =>
                    caches.match(req).then((cached) => cached || caches.match('index.html'))
                )
        );
        return;
    }

    event.respondWith(
        caches.match(req).then(
            (cached) =>
                cached ||
                fetch(req).then((res) => {
                    if (res.ok && res.type === 'basic') {
                        const copy = res.clone();
                        caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
                    }
                    return res;
                })
        )
    );
});
