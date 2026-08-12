const CACHE_NAME = "pirate-pwa-v2";
const STATIC_EXTENSIONS = new Set([
  ".js",
  ".css",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".svg",
  ".ico",
  ".woff2",
  ".woff",
  ".ttf",
  ".wasm",
]);

function isStaticAsset(url) {
  try {
    const pathname = new URL(url).pathname;
    const dot = pathname.lastIndexOf(".");
    if (dot === -1) return false;
    return STATIC_EXTENSIONS.has(pathname.slice(dot).toLowerCase());
  } catch {
    return false;
  }
}

function isImmutableAsset(url) {
  try {
    return new URL(url).pathname.startsWith("/assets/");
  } catch {
    return false;
  }
}

function isNavigationRequest(request) {
  return request.mode === "navigate";
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.flatMap((name) => name !== CACHE_NAME ? [caches.delete(name)] : []),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  if (isNavigationRequest(request)) return;

  if (!isStaticAsset(request.url)) return;

  if (isImmutableAsset(request.url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (!response || response.status !== 200) return response;
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone())));
          return response;
        });
      }),
    );
    return;
  }

  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
