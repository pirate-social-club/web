import { describe, expect, test } from "bun:test";

import { resolvePrivyLoginMethods } from "./privy-login-methods";

describe("resolvePrivyLoginMethods", () => {
  test("offers passkey login on the Pirate RP and its subdomains", () => {
    expect(resolvePrivyLoginMethods("pirate.sc")).toContain("passkey");
    expect(resolvePrivyLoginMethods("WWW.PIRATE.SC.")).toContain("passkey");
    expect(resolvePrivyLoginMethods("staging.pirate.sc")).toContain("passkey");
  });

  test("offers passkey login on local development origins", () => {
    expect(resolvePrivyLoginMethods("localhost")).toContain("passkey");
    expect(resolvePrivyLoginMethods("web.localhost")).toContain("passkey");
    expect(resolvePrivyLoginMethods("127.0.0.1")).toContain("passkey");
  });

  test("omits passkey login outside the Pirate RP", () => {
    expect(resolvePrivyLoginMethods("app.community-root")).toEqual([
      "wallet",
      "email",
      "google",
      "twitter",
    ]);
    expect(resolvePrivyLoginMethods("app.pirate")).not.toContain("passkey");
    expect(resolvePrivyLoginMethods("pirate.sc.example")).not.toContain("passkey");
    expect(resolvePrivyLoginMethods("")).not.toContain("passkey");
  });
});
