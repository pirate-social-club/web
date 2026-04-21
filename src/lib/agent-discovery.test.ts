import { describe, expect, test } from "bun:test";

import { getDiscoveryContext, resolveApiOriginFromHostname } from "./agent-discovery";

describe("agent discovery origins", () => {
  test("uses HNS API origin for the HNS app host", () => {
    expect(resolveApiOriginFromHostname("app.pirate")).toBe("https://api.pirate");
    expect(getDiscoveryContext("https://app.pirate/c/crew").apiOrigin).toBe("https://api.pirate");
  });
});
