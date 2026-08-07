import { describe, expect, test } from "bun:test";

import { resolveApiOriginFromHostname } from "./agent-discovery";
import { resolveApiBaseUrl } from "./api/base-url";

function withProductionEnv(run: () => void) {
  const originalEnv = import.meta.env.VITE_PIRATE_APP_ENV;
  import.meta.env.VITE_PIRATE_APP_ENV = "prod";
  try {
    run();
  } finally {
    if (originalEnv === undefined) {
      delete import.meta.env.VITE_PIRATE_APP_ENV;
    } else {
      import.meta.env.VITE_PIRATE_APP_ENV = originalEnv;
    }
  }
}

describe("HNS API origin regression", () => {
  test("HNS app hosts use the HNS API origin in client codepaths", () => {
    withProductionEnv(() => {
      expect(resolveApiBaseUrl("app.pirate")).toBe("https://api.pirate");
    });
  });

  test("discovery codepaths keep the ICANN API origin for HNS hosts", () => {
    withProductionEnv(() => {
      // Discovery documents are consumed on the ICANN internet, whose readers
      // cannot resolve .pirate names; they must keep advertising api.pirate.sc.
      expect(resolveApiOriginFromHostname("app.pirate")).toBe("https://api.pirate.sc");
    });
  });
});
