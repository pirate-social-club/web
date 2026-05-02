import * as BunTest from "bun:test";
import * as React from "react";

import type { PostCardProps } from "@/components/compositions/posts/post-card/post-card.types";

import { PostComposer } from "./post-composer";
import { defaultMonetizationState } from "./post-composer-config";
import type { AssetLicenseState, MonetizationState, PostComposerProps } from "./post-composer.types";

const { describe, expect, test } = BunTest;
const { afterEach, beforeEach } = BunTest as unknown as {
  afterEach: (callback: () => void) => void;
  beforeEach: (callback: () => void) => void;
};
const { spyOn } = BunTest as unknown as {
  spyOn: <T extends object, K extends keyof T>(object: T, method: K) => {
    mockImplementation: (implementation: T[K]) => { mockRestore: () => void };
  };
};

let hookSpies: Array<{ mockRestore: () => void }> = [];

type TestElement = React.ReactElement<Record<string, unknown>>;

function installHookStubs() {
  hookSpies = [
    spyOn(React, "useState").mockImplementation(((
      initial?: unknown,
    ) => [
      typeof initial === "function" ? (initial as () => unknown)() : initial,
      () => undefined,
    ]) as unknown as typeof React.useState),
    spyOn(React, "useMemo").mockImplementation(((
      factory: () => unknown,
    ) => factory()) as unknown as typeof React.useMemo),
    spyOn(React, "useCallback").mockImplementation(((
      callback: unknown,
    ) => callback) as unknown as typeof React.useCallback),
    spyOn(React, "useContext").mockImplementation((() => ({
      dir: "ltr",
      isRtl: false,
      locale: "en",
      setLocale: () => undefined,
    })) as unknown as typeof React.useContext),
    spyOn(React, "useEffect").mockImplementation((() => undefined) as unknown as typeof React.useEffect),
    spyOn(React, "useId").mockImplementation((() => "test-id") as unknown as typeof React.useId),
    spyOn(React, "useRef").mockImplementation(((
      initial: unknown,
    ) => ({ current: initial })) as unknown as typeof React.useRef),
    spyOn(React, "useSyncExternalStore").mockImplementation((() => false) as unknown as typeof React.useSyncExternalStore),
  ];
}

function restoreHookStubs() {
  hookSpies.forEach((spy) => spy.mockRestore());
  hookSpies = [];
}

function walkTree(node: React.ReactNode, visit: (element: TestElement) => void) {
  if (Array.isArray(node)) {
    node.forEach((child) => walkTree(child, visit));
    return;
  }

  if (!React.isValidElement(node)) {
    return;
  }

  const element = node as TestElement;
  visit(element);
  if (
    typeof element.type === "function"
    && (
      element.type.name === "PostComposerDesktopFooter"
      || element.type.name === "AccessReview"
      || element.type.name === "FeedPreview"
      || element.type.name === "IdentityReview"
      || element.type.name === "PostComposerDetailsStep"
      || element.type.name === "PostComposerMobileSubmitBar"
      || element.type.name === "PostComposerPublishSettings"
      || element.type.name === "PostComposerSettingsHub"
      || element.type.name === "PostComposerSettingsSections"
      || element.type.name === "PostComposerAssetLicenseSection"
      || element.type.name === "PostComposerCommerceAccessSection"
      || element.type.name === "PostComposerDerivativeSection"
      || element.type.name === "PublishSummary"
      || element.type.name === "ReviewOption"
      || element.type.name === "VisibilityReview"
    )
  ) {
    walkTree((element.type as (props: Record<string, unknown>) => React.ReactNode)(element.props), visit);
    return;
  }
  walkTree(element.props.children as React.ReactNode, visit);
}

function findElement(
  tree: React.ReactNode,
  predicate: (element: TestElement) => boolean,
): TestElement | null {
  let match: TestElement | null = null;
  walkTree(tree, (element) => {
    if (match) {
      return;
    }
    if (predicate(element)) {
      match = element;
    }
  });
  return match;
}

function baseComposerProps(): PostComposerProps {
  return {
    availableTabs: ["text"],
    clubName: "Lane1",
    identity: {
      allowAnonymousIdentity: true,
      identityMode: "public",
      publicHandle: "@saint-pablo",
    },
    mode: "text",
    monetization: defaultMonetizationState({
      visible: true,
    } as MonetizationState),
    textBodyValue: "Body",
    titleValue: "Title",
  };
}

function renderComposer(props: PostComposerProps) {
  return PostComposer(props);
}

describe("PostComposer monetization", () => {
  beforeEach(() => {
    installHookStubs();
  });

  afterEach(() => {
    restoreHookStubs();
  });

  test("keeps controlled monetization state in sync across paid-song edits", () => {
    let monetization = defaultMonetizationState({
      visible: false,
      regionalPricingAvailable: true,
    } as MonetizationState);

    const baseProps: PostComposerProps = {
      availableTabs: ["song"],
      canCreateSongPost: true,
      clubName: "Lane1",
      composerStep: "settings",
      mode: "song",
      monetization,
      onMonetizationChange: (next) => {
        monetization = next;
      },
    };

    let tree = renderComposer({
      ...baseProps,
      monetization,
    });

    const paidUnlock = findElement(
      tree,
      (element) => element.props.title === "Paid unlock" && typeof element.props.onClick === "function",
    );
    if (!paidUnlock) {
      throw new Error("Missing paid unlock option");
    }
    (paidUnlock.props.onClick as (() => void) | undefined)?.();
    expect(monetization.visible).toBe(true);

    tree = renderComposer({
      ...baseProps,
      monetization,
    });
    const priceInput = findElement(
      tree,
      (element) => element.props.placeholder === "1.00" && typeof element.props.onChange === "function",
    );
    if (!priceInput) {
      throw new Error("Missing unlock price input");
    }
    (priceInput.props.onChange as ((event: { target: { value: string } }) => void) | undefined)?.({
      target: { value: "4.99" },
    });
    expect(monetization.priceUsd).toBe("4.99");

    tree = renderComposer({
      ...baseProps,
      monetization,
    });
    const paidUnlockOff = findElement(
      tree,
      (element) => element.props.title === "Paid unlock" && typeof element.props.onClick === "function",
    );
    if (!paidUnlockOff) {
      throw new Error("Missing paid unlock toggle");
    }
    (paidUnlockOff.props.onClick as (() => void) | undefined)?.();
    expect(monetization.priceUsd).toBe("4.99");
    expect(monetization.visible).toBe(false);
  });

  test("hides regional pricing controls when the community policy does not support them", () => {
    const tree = renderComposer({
      availableTabs: ["song"],
      canCreateSongPost: true,
      clubName: "Lane1",
      composerStep: "settings",
      mode: "song",
      monetization: defaultMonetizationState({
        regionalPricingAvailable: false,
        visible: true,
      } as MonetizationState),
    });

    expect(
      findElement(tree, (element) => element.props.id === "regional-pricing"),
    ).toBeNull();
  });

  test("keeps regional pricing collapsed even when the community policy supports it", () => {
    const tree = renderComposer({
      availableTabs: ["song"],
      canCreateSongPost: true,
      clubName: "Lane1",
      composerStep: "settings",
      mode: "song",
      monetization: defaultMonetizationState({
        regionalPricingAvailable: true,
        visible: true,
      } as MonetizationState),
    });

    expect(
      findElement(tree, (element) => element.props.id === "regional-pricing") === null,
    ).toBe(true);
  });

  test("reuses monetization controls for paid video without song preview fields", () => {
    const tree = renderComposer({
      availableTabs: ["video"],
      clubName: "Lane1",
      composerStep: "settings",
      mode: "video",
      monetization: defaultMonetizationState({
        regionalPricingAvailable: true,
        visible: true,
      } as MonetizationState),
    });

    expect(
      findElement(tree, (element) => element.props.placeholder === "1.00") === null,
    ).toBe(false);
    expect(
      findElement(tree, (element) => element.props.id === "regional-pricing") === null,
    ).toBe(true);
    expect(
      findElement(tree, (element) => element.props.placeholder === "0"),
    ).toBeNull();
  });

  test("does not offer paid access controls for image posts", () => {
    const tree = renderComposer({
      availableTabs: ["image"],
      clubName: "Lane1",
      composerStep: "settings",
      mode: "image",
      monetization: defaultMonetizationState({
        regionalPricingAvailable: true,
        visible: true,
      } as MonetizationState),
    });

    expect(findElement(tree, (element) => element.props.title === "Free to view")).toBeNull();
    expect(findElement(tree, (element) => element.props.title === "Paid unlock")).toBeNull();
    expect(findElement(tree, (element) => element.props.placeholder === "1.00")).toBeNull();
  });

  test("does not offer paid access controls for text posts", () => {
    const tree = renderComposer({
      availableTabs: ["text"],
      clubName: "Lane1",
      composerStep: "settings",
      mode: "text",
      monetization: defaultMonetizationState({
        regionalPricingAvailable: true,
        visible: true,
      } as MonetizationState),
    });

    expect(findElement(tree, (element) => element.props.title === "Free to view")).toBeNull();
    expect(findElement(tree, (element) => element.props.title === "Paid unlock")).toBeNull();
    expect(findElement(tree, (element) => element.props.children === "I have the rights to monetize this post.")).toBeNull();
    expect(findElement(tree, (element) => element.props.placeholder === "0")).toBeNull();
    expect(findElement(tree, (element) => element.props.title === "Non-commercial only")).toBeNull();
  });

  test("renders asset license controls for paid video", () => {
    const tree = renderComposer({
      availableTabs: ["video"],
      clubName: "Lane1",
      composerStep: "settings",
      mode: "video",
      monetization: defaultMonetizationState({
        visible: true,
      } as MonetizationState),
    });

    expect(
      findElement(tree, (element) => element.props.title === "Non-commercial only") === null,
    ).toBe(false);
    expect(
      findElement(tree, (element) => element.props.description === "Others can monetize and publish derivative videos using your work.") === null,
    ).toBe(false);
  });

  test("does not render asset license controls for public video", () => {
    const tree = renderComposer({
      availableTabs: ["video"],
      clubName: "Lane1",
      composerStep: "settings",
      mode: "video",
      monetization: defaultMonetizationState({
        visible: false,
      } as MonetizationState),
    });

    expect(findElement(tree, (element) => element.props.title === "Non-commercial only")).toBeNull();
  });

  test("renders video commercial derivative revenue share", () => {
    const tree = renderComposer({
      availableTabs: ["video"],
      clubName: "Lane1",
      composerStep: "settings",
      license: {
        presetId: "commercial-remix",
        commercialRevSharePct: 15,
      },
      mode: "video",
      monetization: defaultMonetizationState({
        visible: true,
      } as MonetizationState),
    });

    expect(
      findElement(tree, (element) => element.props.value === "15" && typeof element.props.onChange === "function") === null,
    ).toBe(false);
    expect(
      findElement(tree, (element) => element.props.title === "Commercial derivatives") === null,
    ).toBe(false);
  });

  test("clears revenue share when selecting a non-derivative asset license", () => {
    let license: AssetLicenseState = {
      presetId: "commercial-remix",
      commercialRevSharePct: 15,
    };
    const tree = renderComposer({
      availableTabs: ["video"],
      clubName: "Lane1",
      composerStep: "settings",
      license,
      mode: "video",
      monetization: defaultMonetizationState({
        visible: true,
      } as MonetizationState),
      onLicenseChange: (next) => {
        license = next;
      },
    });

    const commercialUseOption = findElement(
      tree,
      (element) => element.props.title === "Commercial use" && typeof element.props.onClick === "function",
    );
    if (!commercialUseOption) {
      throw new Error("Missing commercial use license option");
    }

    (commercialUseOption.props.onClick as (() => void) | undefined)?.();
    expect(license).toEqual({
      presetId: "commercial-use",
      commercialRevSharePct: undefined,
    });
  });

  test("renders asset license controls for original songs only", () => {
    const originalSongTree = renderComposer({
      availableTabs: ["song"],
      canCreateSongPost: true,
      clubName: "Lane1",
      composerStep: "settings",
      mode: "song",
      monetization: defaultMonetizationState({
        visible: true,
      } as MonetizationState),
      songMode: "original",
    });
    const remixSongTree = renderComposer({
      availableTabs: ["song"],
      canCreateSongPost: true,
      clubName: "Lane1",
      composerStep: "settings",
      mode: "song",
      monetization: defaultMonetizationState({
        visible: true,
      } as MonetizationState),
      songMode: "remix",
    });

    expect(
      findElement(originalSongTree, (element) => element.props.title === "Non-commercial only") === null,
    ).toBe(false);
    expect(
      findElement(remixSongTree, (element) => element.props.title === "Non-commercial only"),
    ).toBeNull();
  });

  test("keeps editable controls in settings and off write/review", () => {
    const writeTree = renderComposer({
      ...baseComposerProps(),
      availableTabs: ["video"],
      composerStep: "write",
      mode: "video",
    });
    const publishTree = renderComposer({
      ...baseComposerProps(),
      availableTabs: ["video"],
      composerStep: "publish",
      mode: "video",
    });
    const settingsTree = renderComposer({
      ...baseComposerProps(),
      availableTabs: ["video"],
      composerStep: "settings",
      mode: "video",
    });

    expect(findElement(writeTree, (element) => element.props.title === "Paid unlock")).toBeNull();
    expect(findElement(writeTree, (element) => element.props.postAsLabel === "Post as")).toBeNull();
    expect(findElement(writeTree, (element) => element.props.label === "Visibility")).toBeNull();
    expect(findElement(writeTree, (element) => element.props.children === "I have the rights to monetize this post.")).toBeNull();

    expect(findElement(settingsTree, (element) => element.props.title === "Paid unlock") === null).toBe(false);
    expect(findElement(settingsTree, (element) => element.props.title === "@saint-pablo") === null).toBe(false);
    expect(findElement(settingsTree, (element) => element.props.title === "Public") === null).toBe(false);

    expect(findElement(publishTree, (element) => element.props.title === "Paid unlock")).toBeNull();
    expect(findElement(publishTree, (element) => element.props.title === "Public")).toBeNull();
  });

  test("renders inline settings controls and updates controlled settings state", () => {
    let monetization = defaultMonetizationState({
      visible: true,
    } as MonetizationState);
    let license: AssetLicenseState = {
      presetId: "non-commercial",
    };
    let identityMode: NonNullable<PostComposerProps["identity"]>["identityMode"] = "public";
    let audience: PostComposerProps["audience"] = { visibility: "public" };

    const tree = renderComposer({
      availableTabs: ["video"],
      audience,
      clubName: "Lane1",
      composerStep: "settings",
      identity: {
        allowAnonymousIdentity: true,
        anonymousLabel: "anon_amber-anchor-00",
        identityMode,
        publicHandle: "saint-pablo.pirate",
      },
      license,
      mode: "video",
      monetization,
      onAudienceChange: (next) => {
        audience = next;
      },
      onIdentityModeChange: (next) => {
        identityMode = next;
      },
      onLicenseChange: (next) => {
        license = next;
      },
      onMonetizationChange: (next) => {
        monetization = next;
      },
    });

    const anonymousOption = findElement(
      tree,
      (element) => element.props.title === "anon_amber-anchor-00" && typeof element.props.onClick === "function",
    );
    const communityOption = findElement(
      tree,
      (element) => element.props.title === "Community" && typeof element.props.onClick === "function",
    );
    const priceInput = findElement(
      tree,
      (element) => element.props.placeholder === "1.00" && typeof element.props.onChange === "function",
    );
    const commercialRemix = findElement(
      tree,
      (element) => element.props.title === "Commercial derivatives" && typeof element.props.onClick === "function",
    );

    if (!anonymousOption || !communityOption || !priceInput || !commercialRemix) {
      throw new Error("Missing inline settings option");
    }

    (anonymousOption.props.onClick as (() => void) | undefined)?.();
    (communityOption.props.onClick as (() => void) | undefined)?.();
    (priceInput.props.onChange as ((event: { target: { value: string } }) => void) | undefined)?.({
      target: { value: "6.66" },
    });
    (commercialRemix.props.onClick as (() => void) | undefined)?.();

    expect(identityMode).toBe("anonymous");
    expect(audience.visibility).toBe("members_only");
    expect(monetization.visible).toBe(true);
    expect(monetization.priceUsd).toBe("6.66");
    expect(license).toEqual({
      presetId: "commercial-remix",
      commercialRevSharePct: 10,
    });
  });

  test("desktop write step routes song and video through details", () => {
    let songStep: PostComposerProps["composerStep"] = "write";
    const songTree = renderComposer({
      availableTabs: ["song"],
      canCreateSongPost: true,
      clubName: "Lane1",
      composerStep: "write",
      mode: "song",
      onComposerStepChange: (next) => {
        songStep = next;
      },
      song: {
        primaryAudioUpload: new File(["audio"], "track.mp3", { type: "audio/mpeg" }),
      },
    });
    const songContinue = findElement(
      songTree,
      (element) => element.props.children === "Continue" && "disabled" in element.props,
    );
    if (!songContinue) {
      throw new Error("Missing song continue button");
    }
    expect(songContinue.props.disabled).toBe(false);
    (songContinue.props.onClick as (() => void) | undefined)?.();
    expect(songStep).toBe("details");

    let videoStep: PostComposerProps["composerStep"] = "write";
    const videoTree = renderComposer({
      availableTabs: ["video"],
      clubName: "Lane1",
      composerStep: "write",
      mode: "video",
      onComposerStepChange: (next) => {
        videoStep = next;
      },
      titleValue: "Video title",
      video: {
        primaryVideoUpload: new File(["video"], "clip.mp4", { type: "video/mp4" }),
      },
    });
    const videoContinue = findElement(
      videoTree,
      (element) => element.props.children === "Continue" && "disabled" in element.props,
    );
    if (!videoContinue) {
      throw new Error("Missing video continue button");
    }
    expect(videoContinue.props.disabled).toBe(false);
    (videoContinue.props.onClick as (() => void) | undefined)?.();
    expect(videoStep).toBe("details");
  });

  test("desktop settings back returns to details for song and video", () => {
    let step: PostComposerProps["composerStep"] = "settings";
    const tree = renderComposer({
      availableTabs: ["video"],
      clubName: "Lane1",
      composerStep: "settings",
      mode: "video",
      onComposerStepChange: (next) => {
        step = next;
      },
    });

    const back = findElement(
      tree,
      (element) => element.props.children === "Back" && typeof element.props.onClick === "function",
    );
    if (!back) {
      throw new Error("Missing back button");
    }
    (back.props.onClick as (() => void) | undefined)?.();
    expect(step).toBe("details");
  });

  test("invalid link cannot advance from desktop write step", () => {
    const tree = renderComposer({
      availableTabs: ["link"],
      clubName: "Lane1",
      composerStep: "write",
      linkUrlValue: "sdkljfn",
      mode: "link",
    });

    const continueButton = findElement(
      tree,
      (element) => element.props.children === "Continue" && "disabled" in element.props,
    );
    if (!continueButton) {
      throw new Error("Missing continue button");
    }
    expect(continueButton.props.disabled).toBe(true);
  });

  test("uses only the route-provided submitDisabled state for the submit button", () => {
    const tree = renderComposer({
      availableTabs: ["song"],
      canCreateSongPost: true,
      clubName: "Lane1",
      composerStep: "publish",
      mode: "song",
      monetization: defaultMonetizationState({
        visible: true,
      }),
      submitDisabled: false,
    });

    const submitButton = findElement(
      tree,
      (element) => element.props.children === "Publish" && "disabled" in element.props,
    );
    if (!submitButton) {
      throw new Error("Missing submit button");
    }

    expect(submitButton.props.disabled).toBe(false);
  });

  test("uses the anonymous DiceBear fallback in the publish preview", () => {
    const tree = renderComposer({
      ...baseComposerProps(),
      composerStep: "publish",
      identity: {
        allowAnonymousIdentity: true,
        anonymousLabel: "anon_amber-anchor-00",
        identityMode: "anonymous",
        publicAvatarSeed: "profile-id-1",
        publicAvatarSrc: "https://media.pirate.test/profile-avatar.png",
        publicHandle: "@saint-pablo",
      },
    });

    const previewCard = findElement(
      tree,
      (element) => typeof element.type !== "string" && element.type.name === "PostCard",
    );
    if (!previewCard) {
      throw new Error("Missing preview post card");
    }

    const byline = previewCard.props.byline as PostCardProps["byline"];
    expect(byline.author?.label).toBe("anon_amber-anchor-00");
    expect(byline.author?.avatarSrc).toBeUndefined();
    expect(byline.author?.avatarSeed).toBe("anon_amber-anchor-00");
  });

  test("blocks continue when a required derivative source is missing", () => {
    const tree = renderComposer({
      availableTabs: ["song"],
      canCreateSongPost: true,
      clubName: "Lane1",
      composerStep: "details",
      derivativeStep: {
        visible: true,
        required: true,
        trigger: "remix",
        references: [],
      },
      lyricsValue: "Lyrics",
      mode: "song",
      song: {
        primaryAudioUpload: new File(["audio"], "track.mp3", { type: "audio/mpeg" }),
      },
      songMode: "remix",
      submitDisabled: false,
    });

    const continueButton = findElement(
      tree,
      (element) => element.props.children === "Continue" && "disabled" in element.props,
    );
    if (!continueButton) {
      throw new Error("Missing continue button");
    }

    expect(continueButton.props.disabled).toBe(true);
  });

  test("blocks continue until selected derivative source terms are accepted", () => {
    const blockedTree = renderComposer({
      availableTabs: ["song"],
      canCreateSongPost: true,
      clubName: "Lane1",
      composerStep: "details",
      derivativeStep: {
        visible: true,
        required: true,
        trigger: "remix",
        references: [{ id: "song-1", title: "Source Song" }],
        sourceTermsAccepted: false,
      },
      lyricsValue: "Lyrics",
      mode: "song",
      song: {
        primaryAudioUpload: new File(["audio"], "track.mp3", { type: "audio/mpeg" }),
      },
      songMode: "remix",
      submitDisabled: false,
    });
    const acceptedTree = renderComposer({
      availableTabs: ["song"],
      canCreateSongPost: true,
      clubName: "Lane1",
      composerStep: "details",
      derivativeStep: {
        visible: true,
        required: true,
        trigger: "remix",
        references: [{ id: "song-1", title: "Source Song" }],
        sourceTermsAccepted: true,
      },
      lyricsValue: "Lyrics",
      mode: "song",
      song: {
        primaryAudioUpload: new File(["audio"], "track.mp3", { type: "audio/mpeg" }),
      },
      songMode: "remix",
      submitDisabled: false,
    });

    const blockedContinue = findElement(
      blockedTree,
      (element) => element.props.children === "Continue" && "disabled" in element.props,
    );
    const acceptedContinue = findElement(
      acceptedTree,
      (element) => element.props.children === "Continue" && "disabled" in element.props,
    );

    expect(blockedContinue?.props.disabled).toBe(true);
    expect(acceptedContinue?.props.disabled).toBe(false);
  });

  test("creates a required derivative step when switching an original song to remix", () => {
    let derivativeStep: PostComposerProps["derivativeStep"];
    let songMode: PostComposerProps["songMode"];
    const tree = renderComposer({
      availableTabs: ["song"],
      canCreateSongPost: true,
      clubName: "Lane1",
      composerStep: "details",
      mode: "song",
      onDerivativeStepChange: (next) => {
        derivativeStep = next;
      },
      onSongModeChange: (next) => {
        songMode = next;
      },
      songMode: "original",
    });

    const remixButton = findElement(
      tree,
      (element) => element.props.children === "Remix" && typeof element.props.onClick === "function",
    );
    if (!remixButton) {
      throw new Error("Missing remix button");
    }

    (remixButton.props.onClick as (() => void) | undefined)?.();

    expect(songMode).toBe("remix");
    expect(derivativeStep).toEqual({
      visible: true,
      required: true,
      trigger: "remix",
      searchResults: [],
      references: [],
      sourceTermsAccepted: false,
    });
  });
});
