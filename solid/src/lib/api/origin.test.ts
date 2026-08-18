import { describe, expect, test } from "bun:test";
import { resolveApiOriginFromExecution, resolveApiOriginFromHostname } from "./origin";
import { resolveApiUrl } from "./request-origin";

describe("API origin resolution", () => {
  test("canonical and sovereign app hosts use the production API", () => {
    expect(resolveApiOriginFromHostname("pirate.sc")).toBe("https://api.pirate.sc");
    expect(resolveApiOriginFromHostname("app.example.hns")).toBe("https://api.pirate.sc");
    expect(resolveApiOriginFromHostname("example.hns")).toBe("https://api.pirate.sc");
  });

  test("staging and local hosts remain explicit", () => {
    expect(resolveApiOriginFromHostname("app.staging.pirate.sc")).toBe("https://api-staging.pirate.sc");
    expect(resolveApiOriginFromHostname("localhost")).toBe("http://127.0.0.1:8787");
    expect(resolveApiOriginFromHostname("preview.localhost")).toBe("http://127.0.0.1:8787");
  });

  test("request URLs preserve the selected origin", () => {
    const request = new Request("https://example.hns/seam/api");
    expect(resolveApiUrl("/__version", request)).toBe("https://api.pirate.sc/__version");
  });

  test("local and staging execution never fall through to production for HNS hosts", () => {
    expect(resolveApiOriginFromExecution("app.example.hns", "local")).toBe("http://127.0.0.1:8787");
    expect(resolveApiOriginFromExecution("app.example.hns", "staging")).toBe("https://api-staging.pirate.sc");
  });

});
