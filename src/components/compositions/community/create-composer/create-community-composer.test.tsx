import * as BunTest from "bun:test";
import * as React from "react";

import { CreateCommunityComposer } from "./create-community-composer";
import type { CreateCommunityComposerProps, IdentityGateDraft } from "./create-community-composer.types";

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
    spyOn(React, "useEffect").mockImplementation((() => undefined) as unknown as typeof React.useEffect),
    spyOn(React, "useId").mockImplementation((() => "test-id") as unknown as typeof React.useId),
    spyOn(React, "useSyncExternalStore").mockImplementation(((
      _subscribe: unknown,
      _getSnapshot: unknown,
      getServerSnapshot?: () => unknown,
    ) => getServerSnapshot?.() ?? false) as unknown as typeof React.useSyncExternalStore),
  ];
}

function restoreHookStubs() {
  hookSpies.forEach((spy) => spy.mockRestore());
  hookSpies = [];
}

function shouldEvaluateComponent(element: TestElement) {
  return (
    typeof element.type === "function"
    && (
      element.type.name === "CommunityGatesEditorPage"
      || element.type.name === "CreateCommunityBasicsStep"
      || element.type.name === "CreateCommunityFooterActions"
      || element.type.name === "CommunityReviewStep"
      || element.type.name === "ReviewField"
      || element.type.name === "ReviewSection"
      || element.type.name === "Section"
    )
  );
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
  if (shouldEvaluateComponent(element)) {
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

function renderComposer(props: CreateCommunityComposerProps) {
  return CreateCommunityComposer(props);
}

describe("CreateCommunityComposer", () => {
  beforeEach(() => {
    installHookStubs();
  });

  afterEach(() => {
    restoreHookStubs();
  });

  test("disables first-step progress until a display name is present", () => {
    const emptyTree = renderComposer({});
    const namedTree = renderComposer({
      displayName: "Writers Room",
    });

    const emptyNext = findElement(
      emptyTree,
      (element) => element.props.children === "Next" && "disabled" in element.props,
    );
    const namedNext = findElement(
      namedTree,
      (element) => element.props.children === "Next" && "disabled" in element.props,
    );

    expect(emptyNext?.props.disabled).toBe(true);
    expect(namedNext?.props.disabled).toBe(false);
  });

  test("blocks access-step progress when creator age verification is required", () => {
    const tree = renderComposer({
      creatorVerificationState: {
        ageOver18Verified: false,
      },
      defaultAgeGatePolicy: "18_plus",
      displayName: "Adults Only",
      initialStep: 2,
    });

    const next = findElement(
      tree,
      (element) => element.props.children === "Next" && "disabled" in element.props,
    );
    const warning = findElement(
      tree,
      (element) => element.props.children === "This community is marked 18+, so the creator must also pass age verification before launch.",
    );

    expect(next?.props.disabled).toBe(true);
    expect(warning === null).toBe(false);
  });

  test("requires at least one valid gate for gated membership", () => {
    const emptyGateTree = renderComposer({
      creatorVerificationState: {
        ageOver18Verified: true,
      },
      displayName: "Collectors",
      gateDrafts: [],
      initialStep: 2,
      membershipMode: "gated",
    });
    const nationalityGate: IdentityGateDraft = {
      gateType: "nationality",
      provider: "self",
      requiredValues: ["US"],
    };
    const validGateTree = renderComposer({
      creatorVerificationState: {
        ageOver18Verified: true,
      },
      displayName: "Collectors",
      gateDrafts: [nationalityGate],
      initialStep: 2,
      membershipMode: "gated",
    });

    const emptyNext = findElement(
      emptyGateTree,
      (element) => element.props.children === "Next" && "disabled" in element.props,
    );
    const validNext = findElement(
      validGateTree,
      (element) => element.props.children === "Next" && "disabled" in element.props,
    );

    expect(emptyNext?.props.disabled).toBe(true);
    expect(validNext?.props.disabled).toBe(false);
  });

  test("renders and submits document sex marker gates", () => {
    let submitted: Parameters<NonNullable<CreateCommunityComposerProps["onCreate"]>>[0] | null = null;
    const genderGate: IdentityGateDraft = {
      gateType: "gender",
      provider: "self",
      requiredValue: "F",
    };
    const accessTree = renderComposer({
      creatorVerificationState: {
        ageOver18Verified: true,
      },
      displayName: "Marker Club",
      gateDrafts: [genderGate],
      initialStep: 2,
      membershipMode: "gated",
    });
    const submitTree = renderComposer({
      creatorVerificationState: {
        ageOver18Verified: true,
      },
      displayName: "Marker Club",
      gateDrafts: [genderGate],
      initialStep: 3,
      membershipMode: "gated",
      onCreate: (input) => {
        submitted = input;
        return Promise.resolve({ communityId: "community-marker" });
      },
    });

    const genderOption = findElement(
      accessTree,
      (element) => element.props.title === "Document sex marker (verified ID)",
    );
    const fMarkerOption = findElement(
      accessTree,
      (element) => element.props.title === "F marker",
    );
    const next = findElement(
      accessTree,
      (element) => element.props.children === "Next" && "disabled" in element.props,
    );
    const createButton = findElement(
      submitTree,
      (element) => element.props.children === "Create Community" && typeof element.props.onClick === "function",
    );
    if (!createButton) {
      throw new Error("Missing create button");
    }

    (createButton.props.onClick as (() => void) | undefined)?.();

    expect(genderOption === null).toBe(false);
    expect(fMarkerOption === null).toBe(false);
    expect(next?.props.disabled).toBe(false);
    expect((submitted as unknown as { gateDrafts?: IdentityGateDraft[] } | null)?.gateDrafts).toEqual([genderGate]);
  });

  test("submits the trimmed final payload with the effective age policy", () => {
    let submitted: Parameters<NonNullable<CreateCommunityComposerProps["onCreate"]>>[0] | null = null;
    const minimumAgeGate: IdentityGateDraft = {
      gateType: "minimum_age",
      provider: "self",
      minimumAge: 21,
    };
    const tree = renderComposer({
      allowAnonymousIdentity: false,
      creatorVerificationState: {
        ageOver18Verified: true,
      },
      databaseRegion: "aws-us-west-2",
      description: "  Good posts only.  ",
      displayName: "  Vinyl Club  ",
      gateDrafts: [minimumAgeGate],
      initialStep: 3,
      membershipMode: "gated",
      onCreate: (input) => {
        submitted = input;
        return Promise.resolve({ communityId: "community-1" });
      },
    });

    const createButton = findElement(
      tree,
      (element) => element.props.children === "Create Community" && typeof element.props.onClick === "function",
    );
    if (!createButton) {
      throw new Error("Missing create button");
    }

    (createButton.props.onClick as (() => void) | undefined)?.();

    expect(submitted).toEqual({
      allowAnonymousIdentity: false,
      anonymousIdentityScope: "community_stable",
      avatarFile: null,
      avatarRef: null,
      bannerFile: null,
      bannerRef: null,
      databaseRegion: "aws-us-west-2",
      defaultAgeGatePolicy: "18_plus",
      description: "Good posts only.",
      displayName: "Vinyl Club",
      gateDrafts: [minimumAgeGate],
      membershipMode: "gated",
    });
  });

  test("does not submit stale gate drafts for request membership", () => {
    let submitted: Parameters<NonNullable<CreateCommunityComposerProps["onCreate"]>>[0] | null = null;
    const passportGate: IdentityGateDraft = {
      gateType: "wallet_score",
      provider: "passport",
      minimumScore: 20,
    };
    const tree = renderComposer({
      creatorVerificationState: {
        ageOver18Verified: true,
      },
      displayName: "Request Club",
      gateDrafts: [passportGate],
      initialStep: 3,
      membershipMode: "request",
      onCreate: (input) => {
        submitted = input;
        return Promise.resolve({ communityId: "community-request" });
      },
    });

    const createButton = findElement(
      tree,
      (element) => element.props.children === "Create Community" && typeof element.props.onClick === "function",
    );
    if (!createButton) {
      throw new Error("Missing create button");
    }

    (createButton.props.onClick as (() => void) | undefined)?.();

    if (!submitted) {
      throw new Error("Create handler was not called");
    }
    const payload = submitted as Parameters<NonNullable<CreateCommunityComposerProps["onCreate"]>>[0];
    expect(payload.membershipMode).toBe("request");
    expect(payload.gateDrafts).toEqual([]);
  });
});
