const CACHE_PREFIX = "pirate-pwa-";
const BUILD_RELEASE = "__PIRATE_BUILD_ID__";
const IMMUTABLE_CACHE_NAME = `${CACHE_PREFIX}assets-v4-${BUILD_RELEASE}`;
const RUNTIME_CACHE_NAME = `${CACHE_PREFIX}runtime-v3`;
const ACTIVE_CACHE_NAMES = new Set([IMMUTABLE_CACHE_NAME, RUNTIME_CACHE_NAME]);
const MAX_IMMUTABLE_ENTRIES = 256;
const MAX_RUNTIME_ENTRIES = 64;
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
        names.flatMap((name) =>
          name.startsWith(CACHE_PREFIX) && !ACTIVE_CACHE_NAMES.has(name)
            ? [caches.delete(name)]
            : []),
      ),
    ).then(() => self.clients.claim()),
  );
});

async function cacheResponse(cacheName, request, response, maxEntries) {
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response);
    if (!maxEntries) return;

    const keys = await cache.keys();
    const excess = keys.length - maxEntries;
    if (excess > 0) {
      await Promise.all(keys.slice(0, excess).map((key) => cache.delete(key)));
    }
  } catch {
    // Cache quota and storage failures must not reject the fetch lifecycle.
  }
}

function cacheSuccessfulResponse(event, cacheName, request, response, maxEntries) {
  if (!response || response.status !== 200) return;
  event.waitUntil(cacheResponse(cacheName, request, response.clone(), maxEntries));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  if (isNavigationRequest(request)) return;

  if (!isStaticAsset(request.url)) return;

  if (isImmutableAsset(request.url)) {
    event.respondWith(
      caches.open(IMMUTABLE_CACHE_NAME).then((cache) => cache.match(request)).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          cacheSuccessfulResponse(
            event,
            IMMUTABLE_CACHE_NAME,
            request,
            response,
            MAX_IMMUTABLE_ENTRIES,
          );
          return response;
        });
      }),
    );
    return;
  }

  event.respondWith(
    fetch(request).then((response) => {
      cacheSuccessfulResponse(
        event,
        RUNTIME_CACHE_NAME,
        request,
        response,
        MAX_RUNTIME_ENTRIES,
      );
      return response;
    }).catch(async (error) => {
      const cached = await caches.open(RUNTIME_CACHE_NAME).then((cache) => cache.match(request));
      if (cached) return cached;
      throw error;
    }),
  );
});
