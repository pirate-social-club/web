const CACHE_PREFIX = "pirate-pwa-";
const BUILD_RELEASE = "__PIRATE_BUILD_ID__";
const CURRENT_ASSET_URLS = "__PIRATE_ASSET_MANIFEST__";
const IMMUTABLE_CACHE_NAME = `${CACHE_PREFIX}assets-v5`;
const RUNTIME_CACHE_NAME = `${CACHE_PREFIX}runtime-v3`;
const ACTIVE_CACHE_NAMES = new Set([IMMUTABLE_CACHE_NAME, RUNTIME_CACHE_NAME]);
const MAX_RUNTIME_ENTRIES = 64;
const ASSET_MANIFEST_KEY = "/__pirate_asset_manifest__";
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

function hasExpectedAssetContentType(request, response) {
  const pathname = new URL(request.url).pathname.toLowerCase();
  const dot = pathname.lastIndexOf(".");
  const extension = dot === -1 ? "" : pathname.slice(dot);
  const contentType = (response.headers.get("content-type") || "").toLowerCase();

  // A SPA fallback can return index.html with status 200 for a missing hashed
  // module. Never put that HTML response into the asset cache: Chromium will
  // later reject it as a module because its MIME type is text/html.
  if (extension === ".js" || extension === ".mjs") {
    return /(?:java|ecma)script|wasm/u.test(contentType);
  }
  if (extension === ".css") return contentType.includes("text/css");
  if (extension === ".wasm") return contentType.includes("application/wasm");
  if ([".png", ".jpg", ".jpeg", ".webp", ".svg", ".ico"].includes(extension)) {
    return contentType.startsWith("image/");
  }
  if ([".woff2", ".woff", ".ttf"].includes(extension)) {
    return contentType.startsWith("font/")
      || contentType.includes("woff")
      || contentType.includes("truetype");
  }
  return false;
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

async function readPreviousAssetManifest(cache) {
  try {
    const response = await cache.match(ASSET_MANIFEST_KEY);
    if (!response) return null;
    const urls = await response.json();
    if (!Array.isArray(urls) || urls.some((url) => typeof url !== "string" || !url.startsWith("/assets/"))) {
      return null;
    }
    return urls;
  } catch {
    return null;
  }
}

async function activateCaches() {
  const names = await caches.keys();
  const immutable = await caches.open(IMMUTABLE_CACHE_NAME);
  const previousAssetUrls = await readPreviousAssetManifest(immutable);

  for (const name of names.filter((name) => name.startsWith(`${CACHE_PREFIX}assets-v4-`))) {
    const oldCache = await caches.open(name);
    for (const request of await oldCache.keys()) {
      const response = await oldCache.match(request);
      if (response) await immutable.put(request, response);
    }
  }

  if (previousAssetUrls) {
    const retained = new Set([...CURRENT_ASSET_URLS, ...previousAssetUrls]);
    for (const request of await immutable.keys()) {
      const pathname = new URL(request.url).pathname;
      if (pathname.startsWith("/assets/") && !retained.has(pathname)) {
        await immutable.delete(request);
      }
    }
  }

  await immutable.put(ASSET_MANIFEST_KEY, new Response(JSON.stringify(CURRENT_ASSET_URLS), {
    headers: { "content-type": "application/json" },
  }));
  await Promise.all(names.flatMap((name) =>
    name.startsWith(CACHE_PREFIX) && !ACTIVE_CACHE_NAMES.has(name) ? [caches.delete(name)] : []));
  await self.clients.claim();
}

self.addEventListener("activate", (event) => {
  event.waitUntil(activateCaches());
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
  if (!response || response.status !== 200 || !hasExpectedAssetContentType(request, response)) return;
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
