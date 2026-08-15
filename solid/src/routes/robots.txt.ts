const CACHE_CONTROL = "public, max-age=300, s-maxage=600";

export function buildRobotsBody(origin: string): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`;
}

export function GET(event: { request: Request }): Response {
  const origin = new URL(event.request.url).origin;
  return new Response(buildRobotsBody(origin), {
    headers: {
      "cache-control": CACHE_CONTROL,
      "content-type": "text/plain; charset=utf-8",
    },
  });
}
