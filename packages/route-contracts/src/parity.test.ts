import { describe, expect, test } from "bun:test";
import { routeContractFor, routeContracts } from "./index";

describe("Solid route contract schema", () => {
  test("keeps the bootstrap route set unique and read-only", () => {
    const paths = routeContracts.map(route => route.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(routeContracts.every(route => route.readOnly)).toBe(true);
  });

  test("resolves the P1 bootstrap route", () => {
    expect(routeContractFor("/")?.surface).toBe("app");
  });
});
