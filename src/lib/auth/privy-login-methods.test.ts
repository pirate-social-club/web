import { describe, expect, test } from "bun:test";

import {
  resolvePrivyLoginMethodsAndOrder,
  resolvePrivyLoginMethods,
  resolvePrivyLoginMethodState,
} from "./privy-login-methods";

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

  test("does not mount Privy with server-rendered fallback methods", () => {
    expect(resolvePrivyLoginMethodState(null)).toEqual({
      loginMethods: ["wallet", "email", "google", "twitter"],
      originReady: false,
    });

    expect(resolvePrivyLoginMethodState("app.community-root")).toEqual({
      loginMethods: ["wallet", "email", "google", "twitter"],
      originReady: true,
    });
  });

  test("keeps passkey only in the canonical ordered login configuration", () => {
    expect(resolvePrivyLoginMethodsAndOrder(resolvePrivyLoginMethods("pirate.sc"))).toEqual({
      primary: ["wallet", "email", "google", "twitter"],
      overflow: ["passkey"],
    });
    expect(resolvePrivyLoginMethodsAndOrder(resolvePrivyLoginMethods("app.community-root"))).toEqual({
      primary: ["wallet", "email", "google", "twitter"],
      overflow: [],
    });
  });
});
