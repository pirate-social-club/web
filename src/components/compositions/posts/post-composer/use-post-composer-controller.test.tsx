import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, test } from "bun:test";

import { installDomGlobals } from "@/test/setup-dom";
import { usePostComposerController } from "./use-post-composer-controller";
import type { CharityContributionState, PostComposerProps } from "./post-composer.types";

installDomGlobals();
Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: () => ({
    addEventListener: () => undefined,
    matches: false,
    removeEventListener: () => undefined,
  }),
});

afterEach(() => {
  cleanup();
});

function baseProps(overrides: Partial<PostComposerProps> = {}): PostComposerProps {
  return {
    availableTabs: ["song"],
    canCreateSongPost: true,
    charityPartner: {
      partnerId: "endaoment:mock-charity-water",
      displayName: "charity: water",
    },
    composerStep: "settings",
    mode: "song",
    titleValue: "Benefit single",
    ...overrides,
  };
}

describe("usePostComposerController charity defaults", () => {
  test("does not re-default charity after the user removes it and the editor remounts", async () => {
    let charityContribution: CharityContributionState = { percentagePct: 0 };
    const onCharityContributionChange = (next: CharityContributionState) => {
      charityContribution = next;
    };
    const { rerender, result } = renderHook(
      (props: PostComposerProps) => usePostComposerController(props),
      {
        initialProps: baseProps({
          charityContribution,
          onCharityContributionChange,
        }),
      },
    );

    await act(async () => {});
    expect(charityContribution).toEqual({ percentagePct: 10 });

    act(() => {
      result.current.charity.update((current) => ({
        ...current,
        percentagePct: 0,
      }));
    });
    expect(charityContribution).toEqual({ percentagePct: 0, userConfigured: true });

    rerender(baseProps({
      charityContribution,
      onCharityContributionChange,
    }));
    await act(async () => {});

    expect(charityContribution).toEqual({ percentagePct: 0, userConfigured: true });
  });
});
