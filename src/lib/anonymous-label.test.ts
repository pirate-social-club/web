import { describe, expect, it } from "bun:test";
import { buildAnonymousLabel } from "./anonymous-label";

describe("buildAnonymousLabel", () => {
  it("matches server algorithm for community_stable scope", () => {
    expect(
      buildAnonymousLabel({ communityId: "cmt_test123", userId: "usr_user1" }),
    ).toBe("anon_ember-port-10");

    expect(
      buildAnonymousLabel({ communityId: "cmt_test123", userId: "usr_user2" }),
    ).toBe("anon_distant-port-10");

    expect(
      buildAnonymousLabel({ communityId: "cmt_other", userId: "usr_user1" }),
    ).toBe("anon_marble-harpoon-62");

    expect(
      buildAnonymousLabel({
        communityId: "cmt_c977d295167b4b219f753a1575725548",
        userId: "usr_a1b2c3d4e5f6",
      }),
    ).toBe("anon_jade-flag-81");

    expect(
      buildAnonymousLabel({ communityId: "cmt_x", userId: "usr_z" }),
    ).toBe("anon_ivory-oar-90");
  });

  it("is deterministic for the same inputs", () => {
    const first = buildAnonymousLabel({
      communityId: "cmt_test123",
      userId: "usr_user1",
    });
    const second = buildAnonymousLabel({
      communityId: "cmt_test123",
      userId: "usr_user1",
    });
    expect(first).toBe(second);
  });

  it("differs when communityId differs", () => {
    const a = buildAnonymousLabel({
      communityId: "cmt_alpha",
      userId: "usr_same",
    });
    const b = buildAnonymousLabel({
      communityId: "cmt_beta",
      userId: "usr_same",
    });
    expect(a).not.toBe(b);
  });

  it("differs when userId differs", () => {
    const a = buildAnonymousLabel({
      communityId: "cmt_same",
      userId: "usr_alpha",
    });
    const b = buildAnonymousLabel({
      communityId: "cmt_same",
      userId: "usr_beta",
    });
    expect(a).not.toBe(b);
  });
});
