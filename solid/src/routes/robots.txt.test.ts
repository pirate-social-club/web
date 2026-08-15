import { describe, expect, test } from "bun:test";
import { buildRobotsBody, GET } from "./robots.txt";

describe("robots.txt", () => {
  test("matches the public discovery response", async () => {
    const response = GET({ request: new Request("https://pirate.sc/robots.txt") });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe(
      "User-agent: *\nAllow: /\n\nSitemap: https://pirate.sc/sitemap.xml\n",
    );
    expect(response.headers.get("cache-control")).toBe("public, max-age=300, s-maxage=600");
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(buildRobotsBody("https://preview.example")).toContain(
      "Sitemap: https://preview.example/sitemap.xml",
    );
  });
});
