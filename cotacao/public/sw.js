// Service worker do app de Cotação. Mesma estratégia deliberada do Caderno:
// - navegação (abrir o app): tenta a rede, cai pro app shell em cache se offline.
// - /api/*: nunca intercepta — a fila de sincronização offline já vive em
//   src/lib/store.tsx (localStorage), duplicar essa lógica aqui só criaria
//   duas fontes de verdade.
// - tudo o mais (JS/CSS/fontes/ícones do Next): cache-first, já que o Next
//   coloca hash no nome do arquivo — o mesmo nome nunca muda de conteúdo.
const CACHE = "cotacao-v1";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((chaves) => Promise.all(chaves.filter((c) => c !== CACHE).map((c) => caches.delete(c)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.pathname.startsWith("/api/")) return; // sempre rede, sem cache

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/").then((r) => r || caches.match(request))),
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((resp) => {
            if (resp.ok) {
              const copia = resp.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copia));
            }
            return resp;
          }),
      ),
    );
  }
});
