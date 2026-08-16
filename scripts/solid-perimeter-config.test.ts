import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";

function readJsonc(path: string): Record<string, any> {
  return JSON.parse(readFileSync(path, "utf8").replace(/\/\/.*$/gm, ""));
}

describe("Solid staging perimeter configuration", () => {
  test("declares isolated main and PUBLIC staging environments", () => {
    const main = readJsonc("solid/wrangler.jsonc");
    const publicWorker = readJsonc("solid/workers/public/wrangler.jsonc");

    expect(main.env?.staging?.name).toBe("pirate-web-solid-staging");
    expect(main.env?.staging?.vars?.SOLID_ENV).toBe("staging");
    expect(main.env?.staging?.services).toEqual([
      { binding: "PUBLIC", service: "pirate-web-solid-public-staging" },
    ]);
    expect(main.env?.production?.name).toBe("pirate-web-solid");
    expect(publicWorker.env?.staging?.name).toBe("pirate-web-solid-public-staging");
  });

  test("builds the auxiliary PUBLIC Worker before the entry Worker", () => {
    const vite = readFileSync("solid/vite.config.ts", "utf8");
    const worker = readFileSync("solid/src/worker.ts", "utf8");
    const workflow = readFileSync(".github/workflows/solid-release.yml", "utf8");
    expect(vite).toContain('auxiliaryWorkers: [{ configPath: "./workers/public/wrangler.jsonc" }]');
    expect(worker).toContain('pathname === "/favicon.ico"');
    expect(workflow).toContain("solid/dist/pirate_web_solid_public/wrangler.json");
    expect(workflow).toContain("solid/dist/ssr/wrangler.json");
    expect(workflow.indexOf("Deploy Solid PUBLIC staging Worker")).toBeLessThan(
      workflow.indexOf("Deploy Solid entry staging Worker"),
    );
    expect(workflow).toContain("SOLID_STAGING_HOST");
  });

  test("resolves authentication and disposition before home or binding I/O", () => {
    const middleware = readFileSync("solid/src/middleware.ts", "utf8");
    const authentication = middleware.indexOf("authenticateHnsForwarderRequest(request");
    const disposition = middleware.indexOf("const disposition = resolveSolidRequestDisposition");
    const homeFetch = middleware.indexOf("const feed = await createApiClient");
    const bindingFetch = middleware.indexOf("const upstream = await fetchWithTimeout");

    expect(authentication).toBeGreaterThan(-1);
    expect(authentication).toBeLessThan(disposition);
    expect(disposition).toBeLessThan(homeFetch);
    expect(disposition).toBeLessThan(bindingFetch);
    expect(middleware).not.toContain('apiOrigin = "https://api.pirate.sc"');
  });
});
