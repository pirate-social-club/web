import { describe, expect, test } from "bun:test";
import {
  routeContractFor,
  routeContractForId,
  routeContracts,
  routeIdFor,
  SOLID_ROUTE_IDS,
} from "./index";

describe("Solid route contract schema", () => {
  test("keeps the bootstrap route set unique and read-only", () => {
    const paths = routeContracts.map(route => route.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(routeContracts.every(route => route.readOnly)).toBe(true);
  });

  test("resolves the P1 bootstrap route", () => {
    expect(routeContractFor("/")?.surface).toBe("app");
  });

  test("tracks the Slice 0 routes as migrating", () => {
    expect(routeContractFor("/privacy")?.migration).toBe("migrating");
    expect(routeContractFor("/robots.txt")?.migration).toBe("migrating");
    expect(routeContractFor("/u/alice")?.migration).toBe("migrating");
  });

  test("matches one safe public-profile segment to its frozen route ID", () => {
    expect(routeIdFor("/u/alice")).toBe("v1:/u/:handle");
    expect(routeIdFor("/u/%40Alice.pirate")).toBe("v1:/u/:handle");
    for (const path of [
      "/u/",
      "/u/alice/posts",
      "/u/%2Fadmin",
      "/u/%5Cadmin",
      "/u/%00admin",
      "/u/%ZZ",
      "/u/..",
    ]) {
      expect(routeIdFor(path)).toBeUndefined();
    }
  });

  test("does not allow prototype-only routes into the Solid migration set", () => {
    for (const path of ["/", "/auth", "/api/health", "/seam/host"]) {
      expect(routeContractFor(path)?.migration).toBe("react");
    }
  });

  test("freezes the Slice 0 edge IDs and keeps them tied to the inventory", () => {
    expect(SOLID_ROUTE_IDS).toEqual([
      "v1:/privacy",
      "v1:/robots.txt",
      "v1:/u/:handle",
    ]);
    for (const routeId of SOLID_ROUTE_IDS) {
      const route = routeContractForId(routeId);
      expect(route).toBeDefined();
      expect(routeIdFor(route!.path)).toBe(routeId);
      expect(route!.signedIn).toBe(false);
      expect(route!.readOnly).toBe(true);
      expect(["migrating", "solid"]).toContain(route!.migration);
    }
    expect(routeIdFor("/")).toBeUndefined();
    expect(routeContractForId("v2:/privacy")).toBeUndefined();
  });
});
