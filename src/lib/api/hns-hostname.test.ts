import { describe, expect, test } from "bun:test";

import {
  HNS_API_ORIGIN,
  isHnsHostname,
  resolveBrowserReachableApiOrigin,
} from "./hns-hostname";

describe("resolveBrowserReachableApiOrigin", () => {
  test("HNS hosts reach the API through the HNS origin", () => {
    expect(resolveBrowserReachableApiOrigin("app.pirate", "https://api.pirate.sc")).toBe(HNS_API_ORIGIN);
    expect(resolveBrowserReachableApiOrigin("captain.pirate", "https://api.pirate.sc")).toBe(HNS_API_ORIGIN);
    expect(resolveBrowserReachableApiOrigin("dankmeme", "https://api.pirate.sc")).toBe(HNS_API_ORIGIN);
    expect(resolveBrowserReachableApiOrigin("app.dankmeme", "https://api.pirate.sc")).toBe(HNS_API_ORIGIN);
  });

  test("ICANN and staging hosts keep the caller's origin", () => {
    expect(resolveBrowserReachableApiOrigin("pirate.sc", "https://api.pirate.sc")).toBe("https://api.pirate.sc");
    expect(resolveBrowserReachableApiOrigin("www.pirate.sc", "https://api.pirate.sc")).toBe("https://api.pirate.sc");
    expect(
      resolveBrowserReachableApiOrigin("staging.pirate.sc", "https://api-staging.pirate.sc"),
    ).toBe("https://api-staging.pirate.sc");
  });

  test("local and empty hosts keep the caller's origin", () => {
    expect(resolveBrowserReachableApiOrigin("", "https://api.pirate.sc")).toBe("https://api.pirate.sc");
    expect(resolveBrowserReachableApiOrigin("localhost", "http://127.0.0.1:8787")).toBe("http://127.0.0.1:8787");
    expect(resolveBrowserReachableApiOrigin("127.0.0.1", "http://127.0.0.1:8787")).toBe("http://127.0.0.1:8787");
  });
});

describe("isHnsHostname", () => {
  test("recognizes first-party and imported HNS hosts", () => {
    expect(isHnsHostname("app.pirate")).toBe(true);
    expect(isHnsHostname("xn--pokmon-dva")).toBe(true);
    expect(isHnsHostname("app.xn--pokmon-dva")).toBe(true);
  });

  test("rejects ICANN, local, and unrecognized subdomain hosts", () => {
    expect(isHnsHostname("pirate.sc")).toBe(false);
    expect(isHnsHostname("www.pirate.sc")).toBe(false);
    expect(isHnsHostname("localhost")).toBe(false);
    expect(isHnsHostname("v.xn--pokmon-dva")).toBe(false);
  });
});
