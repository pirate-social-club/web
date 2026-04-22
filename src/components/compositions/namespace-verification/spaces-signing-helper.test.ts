import { describe, expect, test } from "bun:test";

import {
  buildSpacesSigningHelperCommand,
  buildSpacesSigningHelperSteps,
} from "./spaces-signing-helper";

describe("Spaces signing helper command", () => {
  test("builds a Bun command for the canonical Spaces root and digest", () => {
    const command = buildSpacesSigningHelperCommand({
      root_label: "@xn--t77hga",
      digest: "63e92442ace712086059ec808d23e3ac39de9e74bd4cda9621452c91c3853488",
    });

    expect(command).toContain("git clone https://github.com/pirate-social-club/pirate-spaces-signer.git");
    expect(command).toContain("bun install");
    expect(command).toContain("SPACES_NATIVE_ALLOW_BUILD_FALLBACK=true bun scripts/sign-digest.ts");
    expect(command).toContain("--space @xn--t77hga");
    expect(command).toContain("--digest 63e92442ace712086059ec808d23e3ac39de9e74bd4cda9621452c91c3853488");
  });

  test("builds exactly three UI steps", () => {
    const steps = buildSpacesSigningHelperSteps({
      root_label: "@xn--t77hga",
      digest: "63e92442ace712086059ec808d23e3ac39de9e74bd4cda9621452c91c3853488",
    });

    expect(steps).toHaveLength(3);
    expect(steps[0]).toBe("git clone https://github.com/pirate-social-club/pirate-spaces-signer.git");
    expect(steps[1]).toBe("cd pirate-spaces-signer");
    expect(steps[2]).toContain("SPACES_NATIVE_ALLOW_BUILD_FALLBACK=true bun scripts/sign-digest.ts");
  });

  test("adds the Spaces route prefix when the payload root is bare", () => {
    const command = buildSpacesSigningHelperCommand({
      root_label: "xn--t77hga",
      digest: "63e92442ace712086059ec808d23e3ac39de9e74bd4cda9621452c91c3853488",
    });

    expect(command).toContain("--space @xn--t77hga");
  });
});
