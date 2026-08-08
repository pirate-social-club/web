const HASHED_BUILD_ASSET_PATH = /^\/assets\/.+-[A-Za-z0-9_-]{8,}\.[A-Za-z0-9]+$/;

export const IMMUTABLE_BUILD_ASSET_CACHE_CONTROL = "public, max-age=31536000, immutable";

export function isHashedBuildAssetPath(pathname: string): boolean {
  return HASHED_BUILD_ASSET_PATH.test(pathname);
}

export function applyImmutableBuildAssetCacheHeader(
  request: Request,
  response: Response,
): Response {
  const pathname = new URL(request.url).pathname;
  if (
    (request.method !== "GET" && request.method !== "HEAD")
    || response.status !== 200
    || !isHashedBuildAssetPath(pathname)
  ) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set("cache-control", IMMUTABLE_BUILD_ASSET_CACHE_CONTROL);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
