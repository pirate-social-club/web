import * as BunTest from "bun:test";
import * as React from "react";

import { PostComposer } from "./post-composer";
import { defaultMonetizationState } from "./post-composer-config";
import type { MonetizationState, PostComposerProps } from "./post-composer.types";

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
  if (typeof element.type === "function" && element.type.name === "PostComposerSongAccessSection") {
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
    const regionalPricingCheckbox = findElement(
      tree,
      (element) => element.props.id === "regional-pricing" && typeof element.props.onCheckedChange === "function",
    );
    if (!regionalPricingCheckbox) {
      throw new Error("Missing regional pricing checkbox");
    }
    (regionalPricingCheckbox.props.onCheckedChange as ((next: boolean) => void) | undefined)?.(true);
    expect(monetization.regionalPricingEnabled).toBe(true);

    tree = renderComposer({
      ...baseProps,
      monetization,
    });
    const rightsCheckbox = findElement(
      tree,
      (element) => element.props.id === "rights-attested" && typeof element.props.onCheckedChange === "function",
    );
    if (!rightsCheckbox) {
      throw new Error("Missing rights attestation checkbox");
    }
    (rightsCheckbox.props.onCheckedChange as ((next: boolean) => void) | undefined)?.(true);
    expect(monetization.rightsAttested).toBe(true);

    tree = renderComposer({
      ...baseProps,
      monetization,
    });
    const publicOption = findElement(
      tree,
      (element) => element.props.title === "Public" && typeof element.props.onClick === "function",
    );
    if (!publicOption) {
      throw new Error("Missing public option");
    }
    (publicOption.props.onClick as (() => void) | undefined)?.();
    expect(monetization.priceUsd).toBe("4.99");
    expect(monetization.regionalPricingEnabled).toBe(false);
    expect(monetization.rightsAttested).toBe(true);
    expect(monetization.visible).toBe(false);
  });

  test("hides regional pricing controls when the community policy does not support them", () => {
    const tree = renderComposer({
      availableTabs: ["song"],
      canCreateSongPost: true,
      clubName: "Lane1",
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

  test("shows regional pricing controls when the community policy supports them", () => {
    const tree = renderComposer({
      availableTabs: ["song"],
      canCreateSongPost: true,
      clubName: "Lane1",
      mode: "song",
      monetization: defaultMonetizationState({
        regionalPricingAvailable: true,
        visible: true,
      } as MonetizationState),
    });

    expect(
      findElement(tree, (element) => element.props.id === "regional-pricing") === null,
    ).toBe(false);
  });

  test("uses only the route-provided submitDisabled state for the submit button", () => {
    const tree = renderComposer({
      availableTabs: ["song"],
      canCreateSongPost: true,
      clubName: "Lane1",
      mode: "song",
      monetization: defaultMonetizationState({
        rightsAttested: false,
        visible: true,
      } as MonetizationState),
      submitDisabled: false,
    });

    const submitButton = findElement(
      tree,
      (element) => element.props.children === "Post" && "disabled" in element.props,
    );
    if (!submitButton) {
      throw new Error("Missing submit button");
    }

    expect(submitButton.props.disabled).toBe(false);
  });
});
