import * as BunTest from "bun:test";
import * as React from "react";

import type { PostCardProps } from "@/components/compositions/posts/post-card/post-card.types";
import { postCardReadableWidth } from "@/components/compositions/posts/post-card/post-card.styles";

import { PostComposer } from "./post-composer";
import { PostComposerAttachmentCard } from "./post-composer-attachment-card";
import { defaultMonetizationState } from "./post-composer-config";
import { PostComposerEventSection } from "./post-composer-event-section";
import { LiveTabContent } from "./post-composer-live-tab";
import { SearchReferencePicker, SelectedReferenceCard } from "./post-composer-references";
import { PostComposerDerivativeSection } from "./post-composer-sections";
import { RoyaltySplitEditor } from "./royalty-split-editor";
import type { AssetLicenseState, AuthorAgeGatePolicy, ComposerEventState, MonetizationState, PostComposerProps } from "./post-composer.types";

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

const testLocaleContext = {
  dir: "ltr",
  isRtl: false,
  locale: "en",
  setLocale: () => undefined,
};

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
    spyOn(React, "useContext").mockImplementation((() => testLocaleContext) as unknown as typeof React.useContext),
    spyOn(React, "useEffect").mockImplementation((() => undefined) as unknown as typeof React.useEffect),
    spyOn(React, "useId").mockImplementation((() => "test-id") as unknown as typeof React.useId),
    spyOn(React, "useRef").mockImplementation(((
      initial: unknown,
    ) => ({ current: initial })) as unknown as typeof React.useRef),
    spyOn(React, "useSyncExternalStore").mockImplementation((() => false) as unknown as typeof React.useSyncExternalStore),
    spyOn(React, "use").mockImplementation((() => testLocaleContext) as unknown as typeof React.use),
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
  const elementTypeName = typeof element.type === "function"
    ? element.type.name
    : typeof element.type === "object" && element.type && "displayName" in element.type
      ? String(element.type.displayName)
      : "";
  if (
    (typeof element.type === "function" || (typeof element.type === "object" && element.type !== null))
    && (
      elementTypeName === "PostComposerDesktopFooter"
      || elementTypeName === "AccessReview"
      || elementTypeName === "CheckboxCard"
      || elementTypeName === "FeedPreview"
      || elementTypeName === "IdentityReview"
      || elementTypeName === "PostComposerDetailsStep"
      || elementTypeName === "PostComposerMobileSubmitBar"
      || elementTypeName === "PostComposerPublishSettings"
      || elementTypeName === "PostComposerSettingsHub"
      || elementTypeName === "PostComposerSettingsSections"
      || elementTypeName === "PostComposerAssetLicenseSection"
      || elementTypeName === "PostComposerCommerceAccessSection"
      || elementTypeName === "PostComposerDerivativeSection"
      || elementTypeName === "TimeZonePicker"
      || elementTypeName === "PublishSummary"
      || elementTypeName === "ReferenceMeta"
      || elementTypeName === "ReviewOption"
      || elementTypeName === "VisibilityReview"
    )
  ) {
    const rendered = typeof element.type === "function"
      ? (element.type as (props: Record<string, unknown>) => React.ReactNode)(element.props)
      : typeof element.type === "object" && element.type && "render" in element.type && typeof element.type.render === "function"
        ? (element.type.render as (props: Record<string, unknown>, ref: unknown) => React.ReactNode)(element.props, null)
        : null;
    walkTree(rendered, visit);
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
      vinylReleaseUrl: "https://elasticstage.com/saint-pablo/releases/free-single",
      regionalPricingAvailable: true,
    } as MonetizationState);
    let previewStartSeconds = "0";

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
      onSongChange: (next) => {
        previewStartSeconds = next.previewStartSeconds ?? "";
      },
      song: {
        previewStartSeconds,
      },
    };

    let tree = renderComposer({
      ...baseProps,
      monetization,
    });
    expect(findElement(tree, (element) => element.props.children === "Pay to access") === null).toBe(false);
    expect(findElement(tree, (element) => element.props.children === "Price")).toBe(null);
    expect(findElement(tree, (element) => element.props.children === "30-second preview starts at")).toBe(null);
    expect(
      findElement(tree, (element) => element.props.placeholder === "https://elasticstage.com/artist/releases/release-singleep") === null,
    ).toBe(false);

    const paidAccessCheckbox = findElement(
      tree,
      (element) =>
        element.props.checked === false
        && element.props["aria-label"] === "Pay to access"
        && typeof element.props.onCheckedChange === "function",
    );
    if (!paidAccessCheckbox) {
      throw new Error("Missing paid access checkbox");
    }
    (paidAccessCheckbox.props.onCheckedChange as ((checked: boolean) => void) | undefined)?.(true);
    expect(monetization.visible).toBe(true);

    tree = renderComposer({
      ...baseProps,
      monetization,
    });

    const priceInput = findElement(
      tree,
      (element) => element.props.placeholder === "0" && typeof element.props.onChange === "function",
    );
    if (!priceInput) {
      throw new Error("Missing unlock price input");
    }
    const previewStartInput = findElement(
      tree,
      (element) => element.props.placeholder === "0" && element.props.inputMode === "numeric" && typeof element.props.onChange === "function",
    );
    if (!previewStartInput) {
      throw new Error("Missing preview start input");
    }
    expect(monetization.priceUsd).toBe("0");
    expect(monetization.visible).toBe(true);

    (previewStartInput.props.onChange as ((event: { target: { value: string } }) => void) | undefined)?.({
      target: { value: "42" },
    });
    expect(previewStartSeconds).toBe("42");

    (priceInput.props.onChange as ((event: { target: { value: string } }) => void) | undefined)?.({
      target: { value: "4.99" },
    });
    expect(monetization.priceUsd).toBe("4.99");
    expect(monetization.visible).toBe(true);

    tree = renderComposer({
      ...baseProps,
      monetization,
    });
    const updatedPriceInput = findElement(
      tree,
      (element) => element.props.placeholder === "0" && typeof element.props.onChange === "function",
    );
    if (!updatedPriceInput) {
      throw new Error("Missing updated unlock price input");
    }
    (updatedPriceInput.props.onChange as ((event: { target: { value: string } }) => void) | undefined)?.({
      target: { value: "0" },
    });
    expect(monetization.priceUsd).toBe("0");
    expect(monetization.visible).toBe(true);

    const updatedPaidAccessCheckbox = findElement(
      tree,
      (element) =>
        element.props.checked === true
        && element.props["aria-label"] === "Pay to access"
        && typeof element.props.onCheckedChange === "function",
    );
    if (!updatedPaidAccessCheckbox) {
      throw new Error("Missing updated paid access checkbox");
    }
    (updatedPaidAccessCheckbox.props.onCheckedChange as ((checked: boolean) => void) | undefined)?.(false);
    expect(monetization.visible).toBe(false);
    expect(monetization.vinylReleaseUrl).toBe("https://elasticstage.com/saint-pablo/releases/free-single");
  });

  test("keeps charity and wallets in one sale-proceeds split without stale dollar hints or zero-share errors", () => {
    let nextSplit: Parameters<typeof RoyaltySplitEditor>[0]["value"] | null = null;
    let nextCharity: Parameters<typeof RoyaltySplitEditor>[0]["charityContribution"] | null = null;
    const tree = RoyaltySplitEditor({
      charityContribution: { percentagePct: 10 },
      charityPartner: {
        partnerId: "endaoment:mock-charity-water",
        displayName: "charity: water",
      },
      onChange: (value) => {
        nextSplit = value;
      },
      onCharityContributionChange: (updater) => {
        nextCharity = updater({ percentagePct: 10 });
      },
      value: {
        allocations: [{
          id: "creator",
          recipientKind: "creator",
          walletAddress: "0x1111111111111111111111111111111111111111",
          sharePct: 90,
        }],
      },
    });

    expect(findElement(tree, (element) => element.props.children === "Charity · $0.40")).toBeNull();
    expect(findElement(tree, (element) => element.props.children === "Your primary wallet")).toBeNull();
    expect(findElement(tree, (element) => element.props.children === "Every recipient needs a share greater than 0%.")).toBeNull();

    const removeCharity = findElement(
      tree,
      (element) => element.props["aria-label"] === "Remove charity donation" && typeof element.props.onClick === "function",
    );
    if (!removeCharity) {
      throw new Error("Missing remove charity button");
    }
    (removeCharity.props.onClick as (() => void) | undefined)?.();
    expect(nextCharity?.percentagePct).toBe(0);
    expect(nextSplit?.allocations.map((allocation) => allocation.sharePct)).toEqual([100]);

    const addWallet = findElement(
      tree,
      (element) => element.props.children === "Add wallet" && typeof element.props.onClick === "function",
    );
    if (!addWallet) {
      throw new Error("Missing add wallet button");
    }
    (addWallet.props.onClick as (() => void) | undefined)?.();

    expect(nextSplit?.allocations.map((allocation) => allocation.sharePct)).toEqual([45, 45]);

    nextCharity = null;
    nextSplit = null;
    const removedCharityTree = RoyaltySplitEditor({
      charityContribution: { percentagePct: 0 },
      charityPartner: {
        partnerId: "endaoment:mock-charity-water",
        displayName: "charity: water",
      },
      onChange: (value) => {
        nextSplit = value;
      },
      onCharityContributionChange: (updater) => {
        nextCharity = updater({ percentagePct: 0 });
      },
      value: {
        allocations: [{
          id: "creator",
          recipientKind: "creator",
          walletAddress: "0x1111111111111111111111111111111111111111",
          sharePct: 100,
        }],
      },
    });
    expect(findElement(removedCharityTree, (element) => element.props.children === "Charity")).toBeNull();
    const addCharity = findElement(
      removedCharityTree,
      (element) => element.props.children === "Add charity" && typeof element.props.onClick === "function",
    );
    if (!addCharity) {
      throw new Error("Missing add charity button");
    }
    (addCharity.props.onClick as (() => void) | undefined)?.();
    expect(nextCharity?.percentagePct).toBe(10);
    expect(nextSplit?.allocations.map((allocation) => allocation.sharePct)).toEqual([90]);
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

  test("lets paid songs opt into community regional pricing when the policy supports it", () => {
    let monetization = defaultMonetizationState({
      regionalPricingAvailable: true,
      visible: true,
    } as MonetizationState);

    const tree = renderComposer({
      availableTabs: ["song"],
      canCreateSongPost: true,
      clubName: "Lane1",
      composerStep: "settings",
      mode: "song",
      monetization,
      onMonetizationChange: (next) => {
        monetization = next;
      },
    });

    const regionalPricing = findElement(
      tree,
      (element) =>
        element.props.checked === false
        && element.props["aria-label"] === "Use community regional pricing"
        && typeof element.props.id === "string"
        && typeof element.props.onCheckedChange === "function",
    );
    if (!regionalPricing) {
      throw new Error("Missing regional pricing option");
    }

    (regionalPricing.props.onCheckedChange as ((value: boolean) => void) | undefined)?.(true);
    expect(monetization.regionalPricingEnabled).toBe(true);
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
      findElement(tree, (element) => element.props.placeholder === "0") === null,
    ).toBe(false);
    expect(
      findElement(tree, (element) => element.props.id === "regional-pricing") === null,
    ).toBe(true);
    expect(
      findElement(
        tree,
        (element) =>
          element.props.checked === false
          && typeof element.props.id === "string"
          && typeof element.props.onCheckedChange === "function",
      ) === null,
    ).toBe(false);
    expect(
      findElement(tree, (element) => element.props.placeholder === "0" && element.props.inputMode === "numeric"),
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
    expect(findElement(tree, (element) => element.props.placeholder === "0")).toBeNull();
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
    expect(findElement(tree, (element) => element.props.title === "Non-commercial remixing")).toBeNull();
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
      findElement(tree, (element) => element.props.title === "Non-commercial remixing") === null,
    ).toBe(false);
    expect(
      findElement(tree, (element) => element.props.description === "Others can monetize and publish derivative videos with attribution.") === null,
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

    expect(findElement(tree, (element) => element.props.title === "Non-commercial remixing")).toBeNull();
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

  test("renders asset license controls for original and remix songs", () => {
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
      findElement(originalSongTree, (element) => element.props.title === "Non-commercial remixing") === null,
    ).toBe(false);
    expect(
      findElement(remixSongTree, (element) => element.props.title === "Non-commercial remixing"),
    ).not.toBeNull();
    expect(
      findElement(remixSongTree, (element) => element.props.children === "New remix terms"),
    ).not.toBeNull();
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

    expect(findElement(settingsTree, (element) => element.props.placeholder === "0" && element.props.inputMode === "decimal") === null).toBe(false);
    expect(findElement(settingsTree, (element) => element.props.title === "@saint-pablo") === null).toBe(false);
    expect(findElement(settingsTree, (element) => element.props.title === "Public") === null).toBe(false);

    expect(findElement(publishTree, (element) => element.props.title === "Paid unlock")).toBeNull();
    expect(findElement(publishTree, (element) => element.props.title === "Public")).toBeNull();
  });

  test("renders anonymous identity in settings for eligible post types", () => {
    let identityMode: NonNullable<PostComposerProps["identity"]>["identityMode"] = "public";

    const tree = renderComposer({
      availableTabs: ["video"],
      clubName: "Lane1",
      composerStep: "settings",
      identity: {
        allowAnonymousIdentity: true,
        anonymousLabel: "anon_amber-anchor-00",
        identityMode,
        publicHandle: "saint-pablo.pirate",
      },
      mode: "video",
      monetization: defaultMonetizationState({
        visible: false,
      } as MonetizationState),
      onIdentityModeChange: (next) => {
        identityMode = next;
      },
    });

    const anonymousOption = findElement(
      tree,
      (element) => element.props.title === "anon_amber-anchor-00" && typeof element.props.onClick === "function",
    );

    if (!anonymousOption) {
      throw new Error("Missing anonymous settings option");
    }

    (anonymousOption.props.onClick as (() => void) | undefined)?.();

    expect(identityMode).toBe("anonymous");
  });

  test("renders anonymous identity in settings for song posts", () => {
    let identityMode: NonNullable<PostComposerProps["identity"]>["identityMode"] = "public";
    const tree = renderComposer({
      availableTabs: ["song"],
      canCreateSongPost: true,
      clubName: "Lane1",
      composerStep: "settings",
      identity: {
        allowAnonymousIdentity: true,
        anonymousLabel: "anon_amber-anchor-00",
        identityMode,
        publicHandle: "saint-pablo.pirate",
      },
      mode: "song",
      monetization: defaultMonetizationState({
        visible: true,
      } as MonetizationState),
      onIdentityModeChange: (next) => {
        identityMode = next;
      },
    });

    const anonymousOption = findElement(
      tree,
      (element) => element.props.title === "anon_amber-anchor-00" && typeof element.props.onClick === "function",
    );
    if (!anonymousOption) {
      throw new Error("Missing anonymous settings option for song posts");
    }

    (anonymousOption.props.onClick as (() => void) | undefined)?.();

    expect(identityMode).toBe("anonymous");
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
    let ageGatePolicy: AuthorAgeGatePolicy = "none";

    const tree = renderComposer({
      ageGatePolicy,
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
      onAgeGatePolicyChange: (next) => {
        ageGatePolicy = next;
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

    const communityOption = findElement(
      tree,
      (element) => element.props.title === "Community" && typeof element.props.onClick === "function",
    );
    const priceInput = findElement(
      tree,
      (element) => element.props.placeholder === "0" && typeof element.props.onChange === "function",
    );
    const commercialRemix = findElement(
      tree,
      (element) => element.props.title === "Commercial derivatives" && typeof element.props.onClick === "function",
    );
    const ageGateCheckbox = findElement(
      tree,
      (element) =>
        element.props.checked === false
        && element.props["aria-label"] === "18+ content"
        && typeof element.props.onCheckedChange === "function"
    );

    if (!communityOption || !priceInput || !commercialRemix || !ageGateCheckbox) {
      throw new Error("Missing inline settings option");
    }

    (communityOption.props.onClick as (() => void) | undefined)?.();
    (ageGateCheckbox.props.onCheckedChange as ((checked: boolean) => void) | undefined)?.(true);
    (priceInput.props.onChange as ((event: { target: { value: string } }) => void) | undefined)?.({
      target: { value: "6.66" },
    });
    (commercialRemix.props.onClick as (() => void) | undefined)?.();

    expect(findElement(
      tree,
      (element) => element.props.title === "anon_amber-anchor-00" && typeof element.props.onClick === "function",
    )).not.toBeNull();
    expect(ageGatePolicy).toBe("18_plus");
    expect(identityMode).toBe("public");
    expect(audience.visibility).toBe("members_only");
    expect(monetization.visible).toBe(true);
    expect(monetization.priceUsd).toBe("6.66");
    expect(license).toEqual({
      presetId: "commercial-remix",
      commercialRevSharePct: 10,
    });
  });

  test("renders paid live ticket price without a paid access checkbox or summary row", () => {
    let monetization = defaultMonetizationState({
      priceUsd: "12",
      regionalPricingAvailable: true,
      visible: false,
    } as MonetizationState);

    const tree = renderComposer({
      availableTabs: ["live"],
      clubName: "Lane1",
      composerStep: "settings",
      live: {
        accessMode: "paid",
        performerAllocations: [{ role: "host", sharePct: 100, userId: "usr_host" }],
        roomKind: "solo",
        scheduleAt: "2026-05-22T20:00",
        setlistItems: [{ performanceKind: "original", titleText: "Song" }],
        setlistStatus: "ready",
        visibility: "public",
      },
      mode: "live",
      monetization,
      onMonetizationChange: (next) => {
        monetization = next;
      },
      titleValue: "Paid room",
    });

    const ticketPriceLabel = findElement(
      tree,
      (element) => element.props.children === "Ticket price",
    );
    const priceInput = findElement(
      tree,
      (element) => element.props.inputMode === "decimal" && typeof element.props.onChange === "function",
    );
    const paidAccessCheckbox = findElement(
      tree,
      (element) =>
        element.props.checked === true
        && element.props["aria-label"] !== "18+ content"
        && typeof element.props.onCheckedChange === "function"
        && typeof element.props.id === "string"
        && element.props.id === "test-id",
    );

    if (!ticketPriceLabel || !priceInput) {
      throw new Error("Missing live ticket price controls");
    }

    expect(paidAccessCheckbox).toBeNull();
    expect(findElement(tree, (element) => element.props.label === "Live event")).toBeNull();

    (priceInput.props.onChange as ((event: { target: { value: string } }) => void) | undefined)?.({
      target: { value: "15.50" },
    });
    expect(monetization.priceUsd).toBe("15.50");
    expect(monetization.visible).toBe(false);
  });

  test("does not render ticket price or performer allocation controls for free live events", () => {
    const tree = renderComposer({
      availableTabs: ["live"],
      clubName: "Lane1",
      composerStep: "settings",
      live: {
        accessMode: "free",
        performerAllocations: [{ role: "host", sharePct: 100, userId: "usr_host" }],
        roomKind: "solo",
        scheduleAt: "2026-05-22T20:00",
        setlistItems: [{ performanceKind: "original", titleText: "Song" }],
        setlistStatus: "ready",
        visibility: "public",
      },
      mode: "live",
      monetization: defaultMonetizationState({
        regionalPricingAvailable: true,
        visible: false,
      } as MonetizationState),
      titleValue: "Free room",
    });

    expect(findElement(tree, (element) => element.props.children === "Ticket price")).toBeNull();
    expect(findElement(tree, (element) => element.props.inputMode === "decimal")).toBeNull();
    expect(findElement(tree, (element) => element.props.title === "Performer allocations")).toBeNull();
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

  test("desktop video details back preserves uploaded video for write-step continue", () => {
    const uploadedVideo = new File(["video"], "dance-cut.mp4", { type: "video/mp4" });
    let step: PostComposerProps["composerStep"] = "details";
    const detailsTree = renderComposer({
      availableTabs: ["video"],
      clubName: "Lane1",
      composerStep: step,
      derivativeStep: {
        visible: true,
        required: false,
        trigger: "uses_song",
        references: [],
        sourceTermsAccepted: false,
      },
      mode: "video",
      onComposerStepChange: (next) => {
        step = next;
      },
      titleValue: "Dance cut",
      video: {
        primaryVideoLabel: uploadedVideo.name,
        primaryVideoUpload: uploadedVideo,
      },
    });
    const back = findElement(
      detailsTree,
      (element) => element.props.children === "Back" && typeof element.props.onClick === "function",
    );
    if (!back) {
      throw new Error("Missing video details back button");
    }
    (back.props.onClick as (() => void) | undefined)?.();
    expect(step).toBe("write");

    const writeTree = renderComposer({
      availableTabs: ["video"],
      clubName: "Lane1",
      composerStep: step,
      derivativeStep: {
        visible: true,
        required: false,
        trigger: "uses_song",
        references: [],
        sourceTermsAccepted: false,
      },
      mode: "video",
      titleValue: "Dance cut",
      video: {
        primaryVideoLabel: uploadedVideo.name,
        primaryVideoUpload: uploadedVideo,
      },
    });
    const continueButton = findElement(
      writeTree,
      (element) => element.props.children === "Continue" && "disabled" in element.props,
    );
    if (!continueButton) {
      throw new Error("Missing video write continue button");
    }
    expect(continueButton.props.disabled).toBe(false);
  });

  test("renders optional Genius annotations URL in song details and updates song state", () => {
    let geniusAnnotationsUrl = "";
    const tree = renderComposer({
      availableTabs: ["song"],
      canCreateSongPost: true,
      clubName: "Lane1",
      composerStep: "details",
      lyricsValue: "Lyrics",
      mode: "song",
      onSongChange: (next) => {
        geniusAnnotationsUrl = next.geniusAnnotationsUrl ?? "";
      },
      song: {
        geniusAnnotationsUrl,
        title: "Midnight Waves",
      },
    });

    const geniusInput = findElement(
      tree,
      (element) => element.props.placeholder === "https://genius.com/..." && typeof element.props.onChange === "function",
    );
    if (!geniusInput) {
      throw new Error("Missing Genius annotations URL input");
    }

    (geniusInput.props.onChange as ((event: { target: { value: string } }) => void) | undefined)?.({
      target: { value: "https://genius.com/34172986" },
    });
    expect(geniusAnnotationsUrl).toBe("https://genius.com/34172986");
  });

  test("allows optional stem uploads to be removed from song details", () => {
    const instrumental = new File(["stem"], "instrumental.wav", { type: "audio/wav" });
    const vocal = new File(["stem"], "vocal.wav", { type: "audio/wav" });
    let songState: PostComposerProps["song"] = {
      instrumentalAudioUpload: instrumental,
      title: "Midnight Waves",
      vocalAudioUpload: vocal,
    };
    const tree = renderComposer({
      availableTabs: ["song"],
      canCreateSongPost: true,
      clubName: "Lane1",
      composerStep: "details",
      lyricsValue: "",
      mode: "song",
      onSongChange: (next) => {
        songState = next;
      },
      song: songState,
    });

    const instrumentalUpload = findElement(
      tree,
      (element) => typeof element.type === "function" && element.type.name === "UploadField" && element.props.label === "Instrumental stem",
    );
    if (!instrumentalUpload) {
      throw new Error("Missing instrumental stem upload");
    }
    expect(instrumentalUpload.props.selectedLabel).toBe("instrumental.wav");
    (instrumentalUpload.props.onClear as (() => void) | undefined)?.();
    expect(songState?.instrumentalAudioUpload).toBeNull();
    expect(songState?.instrumentalAudioLabel).toBeUndefined();

    const vocalUpload = findElement(
      tree,
      (element) => typeof element.type === "function" && element.type.name === "UploadField" && element.props.label === "Vocal stem",
    );
    if (!vocalUpload) {
      throw new Error("Missing vocal stem upload");
    }
    expect(vocalUpload.props.selectedLabel).toBe("vocal.wav");
    (vocalUpload.props.onClear as (() => void) | undefined)?.();
    expect(songState?.vocalAudioUpload).toBeNull();
    expect(songState?.vocalAudioLabel).toBeUndefined();
  });

  test("desktop write step blocks live until the setlist is ready and only requires time when scheduling", () => {
    let step: PostComposerProps["composerStep"] = "write";
    const blockedTree = renderComposer({
      availableTabs: ["live"],
      clubName: "Lane1",
      composerStep: "write",
      live: {
        accessMode: "paid",
        performerAllocations: [{ role: "host", sharePct: 100, userId: "usr_host" }],
        roomKind: "solo",
        scheduleAt: "2026-05-22T20:00",
        setlistItems: [],
        setlistStatus: "draft",
        visibility: "public",
      },
      mode: "live",
      onComposerStepChange: (next) => {
        step = next;
      },
      titleValue: "Paid room",
    });
    const blockedContinue = findElement(
      blockedTree,
      (element) => element.props.children === "Continue" && "disabled" in element.props,
    );
    if (!blockedContinue) {
      throw new Error("Missing blocked live continue button");
    }
    expect(blockedContinue.props.disabled).toBe(true);

    const emptyScheduledTree = renderComposer({
      availableTabs: ["live"],
      clubName: "Lane1",
      composerStep: "write",
      live: {
        accessMode: "paid",
        performerAllocations: [{ role: "host", sharePct: 100, userId: "usr_host" }],
        roomKind: "solo",
        scheduleForLater: true,
        setlistItems: [{ performanceKind: "original", titleText: "Song" }],
        setlistStatus: "ready",
        visibility: "public",
      },
      mode: "live",
      titleValue: "Paid room",
    });
    const emptyScheduledContinue = findElement(
      emptyScheduledTree,
      (element) => element.props.children === "Continue" && "disabled" in element.props,
    );
    if (!emptyScheduledContinue) {
      throw new Error("Missing scheduled live continue button");
    }
    expect(emptyScheduledContinue.props.disabled).toBe(true);

    const goLiveNowTree = renderComposer({
      availableTabs: ["live"],
      clubName: "Lane1",
      composerStep: "write",
      live: {
        accessMode: "paid",
        performerAllocations: [{ role: "host", sharePct: 100, userId: "usr_host" }],
        roomKind: "solo",
        scheduleForLater: false,
        setlistItems: [{ performanceKind: "original", titleText: "Song" }],
        setlistStatus: "ready",
        visibility: "public",
      },
      mode: "live",
      titleValue: "Paid room",
    });
    const goLiveNowContinue = findElement(
      goLiveNowTree,
      (element) => element.props.children === "Continue" && "disabled" in element.props,
    );
    if (!goLiveNowContinue) {
      throw new Error("Missing go-live-now continue button");
    }
    expect(goLiveNowContinue.props.disabled).toBe(false);

    const readyTree = renderComposer({
      availableTabs: ["live"],
      clubName: "Lane1",
      composerStep: "write",
      live: {
        accessMode: "paid",
        performerAllocations: [{ role: "host", sharePct: 100, userId: "usr_host" }],
        roomKind: "solo",
        scheduleForLater: true,
        scheduleAt: "2026-05-22T20:00",
        setlistItems: [{ performanceKind: "original", titleText: "Song" }],
        setlistStatus: "ready",
        visibility: "public",
      },
      mode: "live",
      onComposerStepChange: (next) => {
        step = next;
      },
      titleValue: "Paid room",
    });
    const readyContinue = findElement(
      readyTree,
      (element) => element.props.children === "Continue" && "disabled" in element.props,
    );
    if (!readyContinue) {
      throw new Error("Missing ready live continue button");
    }
    expect(readyContinue.props.disabled).toBe(false);
    (readyContinue.props.onClick as (() => void) | undefined)?.();
    expect(step).toBe("settings");
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

  test("restores the publish label when a submit fails with stale progress", () => {
    const tree = renderComposer({
      availableTabs: ["video"],
      clubName: "Lane1",
      composerStep: "publish",
      mode: "video",
      submitError: "primary_video must be uploaded with direct_multipart",
      submitLoading: false,
      submitProgress: {
        currentIndex: 1,
        display: "pipeline",
        label: "Uploading video",
        phase: "uploading_media",
        totalSteps: 4,
      },
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

  test("constrains the desktop publish preview shell to the post card width", () => {
    const tree = renderComposer({
      availableTabs: ["song"],
      canCreateSongPost: true,
      clubName: "Lane1",
      composerStep: "publish",
      mode: "song",
      song: {
        primaryAudioLabel: "demo-song.mp3",
        title: "Benefit single",
      },
      titleValue: "Benefit single for the club drop",
    });

    const publishShell = findElement(
      tree,
      (element) =>
        element.type === "div"
        && typeof element.props.className === "string"
        && element.props.className.includes(postCardReadableWidth)
        && element.props.className.includes("overflow-hidden"),
    );

    expect(publishShell).not.toBeNull();
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

  test("does not render song lyrics as the publish preview caption", () => {
    const tree = renderComposer({
      availableTabs: ["song"],
      canCreateSongPost: true,
      clubName: "Lane1",
      composerStep: "publish",
      lyricsValue: "[Verse 1]\nThese are bundle lyrics, not post caption.",
      mode: "song",
      song: {
        primaryAudioLabel: "track.mp3",
        title: "Palestine",
      },
      titleValue: "New song",
    });

    const previewCard = findElement(
      tree,
      (element) => typeof element.type !== "string" && element.type.name === "PostCard",
    );
    if (!previewCard) {
      throw new Error("Missing preview post card");
    }

    const content = previewCard.props.content as PostCardProps["content"];
    expect(content.type).toBe("song");
    expect(content.type === "song" ? content.caption : undefined).toBeUndefined();
    expect(previewCard.props.viewContext).toBe("post");
    expect(previewCard.props.previewMode).toBe(true);
    expect((previewCard.props.byline as PostCardProps["byline"]).timestampLabel).toBe("now");
    expect(previewCard.props.menuItems).toBeUndefined();
    expect(previewCard.props.shareActions).toBeUndefined();
  });

  test("uses the stored video aspect ratio in the publish preview", () => {
    const tree = renderComposer({
      availableTabs: ["video"],
      clubName: "Lane1",
      composerStep: "publish",
      mode: "video",
      titleValue: "Portrait video",
      video: {
        primaryVideoAspectRatio: 9 / 16,
        primaryVideoLabel: "portrait.mp4",
        primaryVideoUpload: new File(["video"], "portrait.mp4", { type: "video/mp4" }),
      },
    });

    const previewCard = findElement(
      tree,
      (element) => typeof element.type !== "string" && element.type.name === "PostCard",
    );
    if (!previewCard) {
      throw new Error("Missing preview post card");
    }

    const content = previewCard.props.content as PostCardProps["content"];
    expect(content.type).toBe("video");
    expect(content.type === "video" ? content.aspectRatio : undefined).toBe(9 / 16);
  });

  test("shows the selected source song in the video publish preview", () => {
    const tree = renderComposer({
      availableTabs: ["video"],
      clubName: "Lane1",
      composerStep: "publish",
      derivativeStep: {
        visible: true,
        trigger: "uses_song",
        references: [{
          id: "story:asset:source-song",
          title: "Midnight Signal",
          subtitle: "artist.pirate",
        }],
        sourceTermsAccepted: true,
      },
      mode: "video",
      titleValue: "Dance clip",
      video: {
        primaryVideoLabel: "dance.mp4",
        primaryVideoUpload: new File(["video"], "dance.mp4", { type: "video/mp4" }),
      },
    });

    const previewCard = findElement(
      tree,
      (element) => typeof element.type !== "string" && element.type.name === "PostCard",
    );
    if (!previewCard) {
      throw new Error("Missing preview post card");
    }

    const content = previewCard.props.content as PostCardProps["content"];
    expect(content).toMatchObject({
      type: "video",
      upstreamAttributions: [{
        assetId: "story:asset:source-song",
        relationshipType: "references_song",
        title: "Midnight Signal",
        artist: "artist.pirate",
      }],
    });
  });

  test("renders live publish preview as the live post page surface", () => {
    const tree = renderComposer({
      availableTabs: ["live"],
      clubName: "Lane1",
      composerStep: "publish",
      mode: "live",
      monetization: defaultMonetizationState({
        visible: true,
        priceUsd: "5",
      } as MonetizationState),
      textBodyValue: "A short live set.",
      titleValue: "Friday night set",
      live: {
        roomKind: "solo",
        accessMode: "paid",
        visibility: "public",
        scheduleAt: "2026-05-22T20:00",
        setlistItems: [
          {
            titleText: "After Hours",
            artistText: "DJ Solar",
            performanceKind: "original",
          },
        ],
        setlistStatus: "draft",
        performerAllocations: [{ userId: "", role: "host", sharePct: 100 }],
      },
    });

    const previewCard = findElement(
      tree,
      (element) => typeof element.type !== "string" && element.type.name === "PostCard",
    );
    if (!previewCard) {
      throw new Error("Missing preview post card");
    }

    const content = previewCard.props.content as PostCardProps["content"];
    expect(previewCard.props.title).toBeUndefined();
    expect(previewCard.props.viewContext).toBe("post");
    expect(previewCard.props.engagement.unlock).toBeUndefined();
    expect(content).toMatchObject({
      type: "live_room",
      title: "Friday night set",
      description: "A short live set.",
    });
    expect(content.type === "live_room" ? typeof content.onBuy : "missing").toBe("function");
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

  test("blocks continue when optional video source terms are not accepted after selection", () => {
    const blockedTree = renderComposer({
      availableTabs: ["video"],
      clubName: "Lane1",
      composerStep: "details",
      derivativeStep: {
        visible: true,
        required: false,
        trigger: "uses_song",
        references: [{ id: "song-1", title: "Source Song" }],
        sourceTermsAccepted: false,
      },
      mode: "video",
      submitDisabled: false,
      video: {
        primaryVideoLabel: "dance.mp4",
      },
    });
    const acceptedTree = renderComposer({
      availableTabs: ["video"],
      clubName: "Lane1",
      composerStep: "details",
      derivativeStep: {
        visible: true,
        required: false,
        trigger: "uses_song",
        references: [{ id: "song-1", title: "Source Song" }],
        sourceTermsAccepted: true,
      },
      mode: "video",
      submitDisabled: false,
      video: {
        primaryVideoLabel: "dance.mp4",
      },
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

  test("creates a video source reference step when switching original video to uses song", () => {
    let derivativeStep: PostComposerProps["derivativeStep"];
    const tree = renderComposer({
      availableTabs: ["video"],
      clubName: "Lane1",
      composerStep: "details",
      mode: "video",
      onDerivativeStepChange: (next) => {
        derivativeStep = next;
      },
      video: {
        primaryVideoLabel: "dance.mp4",
      },
    });

    const videoModeTabs = findElement(
      tree,
      (element) => element.props.value === "original" && typeof element.props.onValueChange === "function",
    );
    if (!videoModeTabs) {
      throw new Error("Missing video mode tabs");
    }

    (videoModeTabs.props.onValueChange as ((value: string) => void) | undefined)?.("uses_song");

    expect(derivativeStep).toMatchObject({
      visible: true,
      required: true,
      trigger: "uses_song",
      searchResults: [],
      references: [],
      sourceTermsAccepted: false,
    });
  });

  test("clears the video source reference step when switching back to original video", () => {
    let derivativeStep: PostComposerProps["derivativeStep"] = {
      visible: true,
      required: false,
      trigger: "uses_song",
      references: [{ id: "song-1", title: "Source Song" }],
      sourceTermsAccepted: false,
    };
    const tree = renderComposer({
      availableTabs: ["video"],
      clubName: "Lane1",
      composerStep: "details",
      derivativeStep,
      mode: "video",
      onDerivativeStepChange: (next) => {
        derivativeStep = next;
      },
      video: {
        primaryVideoLabel: "dance.mp4",
      },
    });

    const videoModeTabs = findElement(
      tree,
      (element) => element.props.value === "uses_song" && typeof element.props.onValueChange === "function",
    );
    if (!videoModeTabs) {
      throw new Error("Missing video mode tabs");
    }

    (videoModeTabs.props.onValueChange as ((value: string) => void) | undefined)?.("original");

    expect(derivativeStep).toBeUndefined();
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

    const songModeTabs = findElement(
      tree,
      (element) => element.props.value === "original" && typeof element.props.onValueChange === "function",
    );
    if (!songModeTabs) {
      throw new Error("Missing song mode tabs");
    }

    (songModeTabs.props.onValueChange as ((value: string) => void) | undefined)?.("remix");

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

  test("describes live event covers as wide across feed, preview, and event page surfaces", () => {
    let nextLiveState: unknown;
    const tree = LiveTabContent({
      copy: {
        buttons: { chooseFile: "Choose file", replace: "Replace" },
        fields: { coverArt: "Cover art" },
        live: {
          eventCover: "Event cover",
          eventCoverHelp: "Upload a 16:9 event cover. Feed, preview, and event page show it wide.",
          eventCoverUpload: "Upload event cover",
          scheduleForLater: "Schedule for later",
          startTime: "Start time",
          startTimeNote: "Required for scheduled live events.",
          recordThisLivestream: "Record this livestream",
          recordThisLivestreamNote: "Creates a private replay draft after the stream ends.",
        },
        placeholders: {},
        upload: {
          artworkHelp: "Shows in feed, release, and player surfaces.",
          cover: "Cover",
          noFileSelected: "No file selected",
          squareArtwork: "Upload square artwork",
        },
      },
      live: {
        accessMode: "free",
        performerAllocations: [{ role: "host", sharePct: 100, userId: "usr_host" }],
        roomKind: "solo",
        scheduleForLater: true,
        scheduleAt: "2026-05-22T20:00",
        setlistItems: [],
        setlistStatus: "ready",
        visibility: "public",
      },
      onLiveChange: (next) => {
        nextLiveState = next;
      },
    });

    const coverUpload = findElement(
      tree,
      (element) => typeof element.type === "function" && element.type.name === "UploadField",
    );

    expect(coverUpload?.props.label).toBe("Event cover");
    expect(coverUpload?.props.artworkHelp).toBe("Upload a 16:9 event cover. Feed, preview, and event page show it wide.");
    expect(coverUpload?.props.artworkPlaceholderLabel).toBe("Upload event cover");
    expect(coverUpload?.props.artworkPreviewAspect).toBe("video");

    const scheduleCheckbox = findElement(
      tree,
      (element) => element.props.id === "live-schedule-for-later" && typeof element.props.onCheckedChange === "function",
    );
    expect(scheduleCheckbox?.props.checked).toBe(true);
    (scheduleCheckbox?.props.onCheckedChange as ((checked: boolean) => void) | undefined)?.(false);
    expect(nextLiveState).toMatchObject({ scheduleAt: undefined, scheduleForLater: false });

    const scheduleInput = findElement(
      tree,
      (element) => element.props.type === "datetime-local" && typeof element.props.onChange === "function",
    );
    expect(scheduleInput?.props.value).toBe("2026-05-22T20:00");
    (scheduleInput?.props.onChange as ((event: { target: { value: string } }) => void) | undefined)?.({
      target: { value: "2026-05-23T21:30" },
    });
    expect(nextLiveState).toMatchObject({ scheduleAt: "2026-05-23T21:30", scheduleForLater: true });
  });

  test("keeps an unlisted choice visible when paid access is selected and explains the public requirement", () => {
    let nextLiveState: PostComposerProps["live"];
    const tree = LiveTabContent({
      copy: {
        buttons: {},
        fields: {},
        live: {
          access: "Access",
          accessFree: "Free",
          accessGated: "Gated",
          accessPaid: "Paid",
          paidVisibilityNote: "Paid livestreams must be public. Select Public to continue.",
          visibility: "Visibility",
          visibilityPublic: "Public",
          visibilityUnlisted: "Unlisted",
        },
        placeholders: {},
        upload: {},
      },
      live: {
        accessMode: "free",
        performerAllocations: [{ role: "host", sharePct: 100, userId: "usr_host" }],
        roomKind: "solo",
        setlistItems: [],
        setlistStatus: "draft",
        visibility: "unlisted",
      },
      onLiveChange: (next) => {
        nextLiveState = next;
      },
    });

    const paidChip = findElement(
      tree,
      (element) => typeof element.type === "function"
        && element.type.name === "Chip"
        && element.props.children === "Paid",
    );
    if (!paidChip) throw new Error("Missing paid access chip");
    (paidChip.props.onClick as (() => void) | undefined)?.();
    expect(nextLiveState).toMatchObject({ accessMode: "paid", visibility: "unlisted" });

    if (!nextLiveState) throw new Error("Paid access did not update live state");
    const paidTree = LiveTabContent({
      copy: {
        buttons: {},
        fields: {},
        live: {
          access: "Access",
          accessFree: "Free",
          accessGated: "Gated",
          accessPaid: "Paid",
          paidVisibilityNote: "Paid livestreams must be public. Select Public to continue.",
          visibility: "Visibility",
          visibilityPublic: "Public",
          visibilityUnlisted: "Unlisted",
        },
        placeholders: {},
        upload: {},
      },
      live: nextLiveState,
      onLiveChange: (next) => {
        nextLiveState = next;
      },
    });
    const unlistedChip = findElement(
      paidTree,
      (element) => typeof element.type === "function"
        && element.type.name === "Chip"
        && element.props.children === "Unlisted",
    );
    expect(unlistedChip?.props.disabled).toBe(true);
    expect(findElement(paidTree, (element) => element.props.children === "Paid livestreams must be public. Select Public to continue.")).not.toBeNull();
  });

  test("does not force image attachment previews into a square crop", () => {
    const tree = PostComposerAttachmentCard({
      attachment: {
        kind: "image",
        label: "wide-cover.svg",
        previewUrl: "blob:https://app.test/wide-cover",
      },
      onChange: () => undefined,
      onRemove: () => undefined,
    });

    const previewImage = findElement(
      tree,
      (element) => element.type === "img" && element.props.src === "blob:https://app.test/wide-cover",
    );
    const squareContainer = findElement(
      tree,
      (element) => typeof element.props.className === "string" && element.props.className.includes("aspect-square"),
    );

    expect(previewImage?.props.className).toContain("object-contain");
    expect(squareContainer).toBe(null);
  });

  test("keeps portrait video attachment previews narrow", () => {
    const wrapper = PostComposerAttachmentCard({
      attachment: {
        aspectRatio: 9 / 16,
        kind: "video",
        label: "portrait.mp4",
        posterUrl: "blob:https://app.test/portrait-poster",
        previewUrl: "blob:https://app.test/portrait-video",
      },
      onChange: () => undefined,
      onRemove: () => undefined,
    });
    if (!React.isValidElement(wrapper) || typeof wrapper.type !== "function") {
      throw new Error("Missing video preview wrapper");
    }

    const tree = (wrapper.type as (props: typeof wrapper.props) => React.ReactNode)(wrapper.props);

    const previewContainer = findElement(
      tree,
      (element) => element.props.role === "button" && typeof element.props.className === "string",
    );
    const previewVideo = findElement(
      tree,
      (element) => element.type === "video" && element.props.src === "blob:https://app.test/portrait-video",
    );

    const previewContainerClassName = String(previewContainer?.props.className ?? "");
    const previewVideoClassName = String(previewVideo?.props.className ?? "");

    expect(previewContainerClassName).toContain("max-w-[22rem]");
    expect(previewVideo?.props.muted).not.toBe(true);
    expect(previewContainerClassName).not.toContain("aspect-video");
    expect(previewContainer?.props.style).toEqual({ aspectRatio: 9 / 16 });
    expect(previewVideoClassName).toContain("object-contain");
  });

  test("clears the remix derivative step when switching back to original", () => {
    let derivativeStep: PostComposerProps["derivativeStep"] = {
      visible: true,
      required: true,
      trigger: "remix",
      searchResults: [],
      references: [],
      sourceTermsAccepted: false,
    };
    let songMode: PostComposerProps["songMode"] = "remix";
    const tree = renderComposer({
      availableTabs: ["song"],
      canCreateSongPost: true,
      clubName: "Lane1",
      composerStep: "details",
      derivativeStep,
      mode: "song",
      onDerivativeStepChange: (next) => {
        derivativeStep = next;
      },
      onSongModeChange: (next) => {
        songMode = next;
      },
      songMode,
    });

    const songModeTabs = findElement(
      tree,
      (element) => element.props.value === "remix" && typeof element.props.onValueChange === "function",
    );
    if (!songModeTabs) {
      throw new Error("Missing song mode tabs");
    }

    (songModeTabs.props.onValueChange as ((value: string) => void) | undefined)?.("original");

    expect(songMode).toBe("original");
    expect(derivativeStep).toBeUndefined();
  });

  test("clears the remix search bar on remix→original when the parent starts uncontrolled", () => {
    let derivativeStep: PostComposerProps["derivativeStep"];
    let songMode: PostComposerProps["songMode"];
    const findTabs = (tree: React.ReactNode, value: string) => findElement(
      tree,
      (element) => element.props.value === value && typeof element.props.onValueChange === "function",
    );

    const initialTree = renderComposer({
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
    });

    const remixTabs = findTabs(initialTree, "original");
    if (!remixTabs) {
      throw new Error("Missing song mode tabs");
    }
    (remixTabs.props.onValueChange as ((value: string) => void) | undefined)?.("remix");

    expect(songMode).toBe("remix");
    expect(derivativeStep).toEqual(expect.objectContaining({
      visible: true,
      required: true,
      trigger: "remix",
    }));

    const remixedTree = renderComposer({
      availableTabs: ["song"],
      canCreateSongPost: true,
      clubName: "Lane1",
      composerStep: "details",
      derivativeStep,
      mode: "song",
      onDerivativeStepChange: (next) => {
        derivativeStep = next;
      },
      onSongModeChange: (next) => {
        songMode = next;
      },
      songMode: "remix",
    });

    const originalTabs = findTabs(remixedTree, "remix");
    if (!originalTabs) {
      throw new Error("Missing song mode tabs after switching to remix");
    }
    (originalTabs.props.onValueChange as ((value: string) => void) | undefined)?.("original");

    expect(songMode).toBe("original");
    expect(derivativeStep).toBeUndefined();
  });
});

describe("PostComposer event details", () => {
  beforeEach(() => {
    installHookStubs();
  });

  afterEach(() => {
    restoreHookStubs();
  });

  test("uses a timezone combobox instead of a free text timezone input", () => {
    let eventState: ComposerEventState = {
      enabled: true,
      startsAt: "2026-06-12T20:00",
      timezone: "Asia/Tbilisi",
    };
    const tree = PostComposerEventSection({
      event: eventState,
      onChange: (next) => {
        eventState = next;
      },
    });
    const timezoneCombobox = findElement(
      tree,
      (element) => typeof element.props.itemToStringValue === "function"
        && typeof element.props.onValueChange === "function",
    );
    const timezoneTextInput = findElement(
      tree,
      (element) => element.props.id === "post-event-timezone"
        && element.props.placeholder === "Asia/Tbilisi",
    );

    if (!timezoneCombobox) {
      throw new Error("Timezone combobox not found");
    }

    const items = timezoneCombobox.props.items as Array<{ label: string; value: string }>;
    const newYork = items.find((item) => item.value === "America/New_York");
    if (!newYork) {
      throw new Error("New York timezone option not found");
    }
    (timezoneCombobox.props.onValueChange as (value: typeof newYork) => void)(newYork);

    expect(timezoneTextInput).toBeNull();
    expect(newYork.label).toContain("New York");
    expect(eventState.timezone).toBe("America/New_York");
  });

  test("stores a date without requiring a time", () => {
    let eventState: ComposerEventState = {
      enabled: true,
      isOnline: true,
      timezone: "Asia/Tbilisi",
    };
    let tree = PostComposerEventSection({
      event: eventState,
      onChange: (next) => {
        eventState = next;
      },
    });
    const startDateInput = findElement(
      tree,
      (element) => element.props.id === "post-event-start-date",
    );

    if (!startDateInput) {
      throw new Error("Start date input not found");
    }
    (startDateInput.props.onChange as (event: { target: { value: string } }) => void)({
      target: { value: "2026-06-12" },
    });

    expect(eventState.startsAt).toBe("2026-06-12");

    tree = PostComposerEventSection({
      event: eventState,
      onChange: (next) => {
        eventState = next;
      },
    });
    const startTimeInput = findElement(
      tree,
      (element) => element.props.id === "post-event-start-time",
    );

    if (!startTimeInput) {
      throw new Error("Start time input not found");
    }
    (startTimeInput.props.onChange as (event: { target: { value: string } }) => void)({
      target: { value: "20:30" },
    });

    expect(eventState.startsAt).toBe("2026-06-12T20:30");
  });
});

describe("PostComposerDerivativeSection", () => {
  beforeEach(() => {
    installHookStubs();
  });

  afterEach(() => {
    restoreHookStubs();
  });

  const copy = {
    derivative: {
      acceptSourceTerms: "I accept the source terms.",
      searchSourceTracks: "Search remix-eligible source tracks",
    },
    empty: {
      noSourceTracks: "No source tracks",
    },
    placeholders: {
      sourceTrackSearch: "Search songs",
    },
    sections: {
      sourceTrack: "Source track",
    },
  };

  test("shows derivative search errors instead of empty-result copy", () => {
    const tree = PostComposerDerivativeSection({
      copy,
      derivativePickerKey: 0,
      derivativeSearchResults: [],
      derivativeState: {
        visible: true,
        trigger: "uses_song",
        searchError: "Couldn’t load songs. Try again.",
        searchLoading: false,
      },
      onAdvancePicker: () => undefined,
      updateDerivativeState: () => undefined,
    });
    const picker = findElement(
      tree,
      (element) => element.type === SearchReferencePicker,
    );

    expect(picker?.props.emptyLabel).toBe("Couldn’t load songs. Try again.");
    expect(picker?.props.loading).toBe(false);
  });

  test("clears derivative search errors when a new query starts", () => {
    let nextState: PostComposerProps["derivativeStep"];
    const tree = PostComposerDerivativeSection({
      copy,
      derivativePickerKey: 0,
      derivativeSearchResults: [],
      derivativeState: {
        visible: true,
        trigger: "uses_song",
        searchError: "Couldn’t load songs. Try again.",
        searchLoading: false,
      },
      onAdvancePicker: () => undefined,
      updateDerivativeState: (updater) => {
        nextState = updater({
          visible: true,
          trigger: "uses_song",
          searchError: "Couldn’t load songs. Try again.",
          searchLoading: false,
        });
      },
    });
    const picker = findElement(
      tree,
      (element) => element.type === SearchReferencePicker,
    );

    if (!picker || typeof picker.props.onQueryChange !== "function") {
      throw new Error("Search picker not found");
    }
    (picker.props.onQueryChange as (query: string) => void)("Travel Guide");

    expect(nextState).toMatchObject({
      query: "Travel Guide",
      searchLoading: true,
    });
    expect(nextState?.searchError).toBeUndefined();
  });
});

describe("SearchReferencePicker", () => {
  beforeEach(() => {
    installHookStubs();
  });

  afterEach(() => {
    restoreHookStubs();
  });

  test("forwards typed source search queries to the caller", () => {
    let query = "";
    const tree = SearchReferencePicker({
      ariaLabel: "Search remix-eligible source tracks",
      emptyLabel: "No source tracks",
      items: [],
      onQueryChange: (nextQuery) => {
        query = nextQuery;
      },
      onSelect: () => undefined,
      placeholder: "Search songs",
    });
    const combobox = findElement(
      tree,
      (element) => typeof element.props.onInputValueChange === "function",
    );

    if (!combobox) {
      throw new Error("Combobox not found");
    }
    (combobox.props.onInputValueChange as (value: string) => void)("Travel Guide");

    expect(query).toBe("Travel Guide");
  });

  test("ignores the input fill emitted by selecting a source", () => {
    const source = {
      id: "story:ip:0x1111111111111111111111111111111111111111#licenseTermsId=17",
      title: "Story Source",
    };
    let query = "";
    let selected: typeof source | undefined;
    const tree = SearchReferencePicker({
      ariaLabel: "Search remix-eligible source tracks",
      emptyLabel: "No source tracks",
      items: [source],
      onQueryChange: (nextQuery) => {
        query = nextQuery;
      },
      onSelect: (next) => {
        selected = next;
      },
      placeholder: "Search songs",
    });
    const combobox = findElement(
      tree,
      (element) => typeof element.props.onInputValueChange === "function"
        && typeof element.props.onValueChange === "function",
    );

    if (!combobox) {
      throw new Error("Combobox not found");
    }
    (combobox.props.onValueChange as (value: typeof source) => void)(source);
    (combobox.props.onInputValueChange as (value: string) => void)("Story Source");

    expect(selected).toBe(source);
    expect(query).toBe("");
  });

  test("shows loading copy before source search results settle", () => {
    const tree = SearchReferencePicker({
      ariaLabel: "Search remix-eligible source tracks",
      emptyLabel: "No source tracks",
      items: [],
      loading: true,
      onSelect: () => undefined,
      placeholder: "Search songs",
    });
    const loadingEmpty = findElement(
      tree,
      (element) => element.props.children === "Loading...",
    );

    expect(loadingEmpty).not.toBeNull();
  });

  test("keeps Story explorer links out of source picker rows", () => {
    const source = {
      id: "story:asset:asset_ast_source_song",
      title: "Story Source",
      subtitle: "source.pirate",
      parentIpId: "0xbB0a33bd07e7c813963b569f1202047a92b38d48",
    };
    const tree = SearchReferencePicker({
      ariaLabel: "Search remix-eligible source tracks",
      emptyLabel: "No source tracks",
      items: [source],
      onSelect: () => undefined,
      placeholder: "Search songs",
    });
    const list = findElement(
      tree,
      (element) => typeof element.type === "function" && element.type.name === "ComboboxList",
    );

    if (!list || typeof list.props.children !== "function") {
      throw new Error("Combobox list renderer not found");
    }

    const row = (list.props.children as (item: typeof source) => React.ReactNode)(source);
    const storyLink = findElement(
      row,
      (element) => element.type === "a" && String(element.props.href).includes("explorer.story.foundation/ipa/"),
    );
    const storyStatus = findElement(
      row,
      (element) => element.props.children === "Story registered",
    );

    expect(storyLink).toBeNull();
    expect(storyStatus).not.toBeNull();
  });

  test("shows Story IP Explorer links for selected remix sources", () => {
    const tree = SelectedReferenceCard({
      item: {
        id: "story:asset:asset_ast_source_song",
        title: "Story Source",
        subtitle: "source.pirate",
        upstreamRoyaltyPct: 10,
        parentIpId: "0xbB0a33bd07e7c813963b569f1202047a92b38d48",
      },
      onClear: () => undefined,
    });
    const storyLink = findElement(
      tree,
      (element) => element.type === "a" && element.props.children
        && String(element.props.href).includes("explorer.story.foundation/ipa/0xbB0a33bd07e7c813963b569f1202047a92b38d48"),
    );

    expect(storyLink).not.toBeNull();
  });
});
