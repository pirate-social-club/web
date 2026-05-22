import "@/test/setup-runtime";

import { afterEach, describe, expect, mock, test } from "bun:test";
import * as React from "react";

import {
  CommunityAssistantPolicyPage,
} from "./community-assistant-policy";
import {
  createDefaultCommunityAssistantPolicySettings,
  type CommunityAssistantPolicySettings,
  type CommunityAssistantSubmitState,
} from "./community-assistant-policy.types";

Object.defineProperty(globalThis, "getComputedStyle", {
  configurable: true,
  value: () => ({
    getPropertyValue: () => "",
  }),
});
Object.defineProperty(window, "getComputedStyle", {
  configurable: true,
  value: globalThis.getComputedStyle,
});
Object.defineProperty(globalThis, "DocumentFragment", {
  configurable: true,
  value: function DocumentFragment() {
    return document.createDocumentFragment();
  },
});
for (const key of ["Event", "HTMLInputElement", "HTMLTextAreaElement", "Node"] as const) {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    value: window[key],
  });
}
Object.defineProperty(globalThis, "InputEvent", {
  configurable: true,
  value: window.InputEvent ?? window.Event,
});

const { act, cleanup, fireEvent, render, waitFor } = await import("@testing-library/react");

afterEach(() => {
  cleanup();
});

type RenderOptions = {
  initialSettings?: CommunityAssistantPolicySettings;
  saveDisabled?: boolean;
  submitState?: CommunityAssistantSubmitState;
};

function renderPolicy({
  initialSettings = createDefaultCommunityAssistantPolicySettings(),
  saveDisabled = false,
  submitState = { kind: "idle" },
}: RenderOptions = {}) {
  let latestSettings = initialSettings;
  const onSave = mock(() => undefined);
  const onSettingsChange = mock((next: CommunityAssistantPolicySettings) => {
    latestSettings = next;
  });

  function Harness() {
    const [settings, setSettings] = React.useState(initialSettings);

    return (
      <CommunityAssistantPolicyPage
        onSave={onSave}
        onSettingsChange={(next) => {
          onSettingsChange(next);
          setSettings(next);
        }}
        saveDisabled={saveDisabled}
        settings={settings}
        submitState={submitState}
      />
    );
  }

  return {
    ...render(<Harness />),
    getLatestSettings: () => latestSettings,
    onSave,
    onSettingsChange,
  };
}

function modelSelect(view: ReturnType<typeof renderPolicy>) {
  return view.getByRole("combobox", { name: "OpenRouter model" });
}

function isDisabled(element: Element) {
  return (
    element.hasAttribute("disabled")
    || element.getAttribute("aria-disabled") === "true"
    || element.hasAttribute("data-disabled")
  );
}

function saveButtons(container: HTMLElement) {
  return Array.from(container.querySelectorAll("button"))
    .filter((button) => button.textContent?.trim() === "Save");
}

function editTextInput(element: HTMLElement, value: string) {
  if (!("value" in element)) {
    throw new Error("Expected an editable input element");
  }
  (element as HTMLInputElement).value = value;
  const reactPropsKey = Object.keys(element).find((key) => key.startsWith("__reactProps$"));
  const reactProps = reactPropsKey
    ? (element as unknown as Record<string, { onChange?: (event: { currentTarget: HTMLInputElement; target: HTMLInputElement }) => void }>)[reactPropsKey]
    : null;

  act(() => {
    reactProps?.onChange?.({
      currentTarget: element as HTMLInputElement,
      target: element as HTMLInputElement,
    });
  });
}

describe("CommunityAssistantPolicyPage", () => {
  test("renders an OpenRouter password input with the expected placeholder", () => {
    const view = renderPolicy({
      initialSettings: {
        ...createDefaultCommunityAssistantPolicySettings(),
        openRouterKeyStatus: { kind: "missing" },
      },
    });

    const input = view.getByPlaceholderText("sk-or-...");

    expect(input).toBeInstanceOf(HTMLInputElement);
    expect((input as HTMLInputElement).type).toBe("password");
    view.unmount();
  });

  test("disables the model picker when the OpenRouter key is missing", () => {
    const view = renderPolicy({
      initialSettings: {
        ...createDefaultCommunityAssistantPolicySettings(),
        openRouterKeyStatus: { kind: "missing" },
      },
    });

    expect(isDisabled(modelSelect(view))).toBe(true);
    expect(view.getByText("Save an OpenRouter key to choose a model.")).not.toBeNull();
    view.unmount();
  });

  test("saving a key masks the last four characters and enables model selection", async () => {
    const view = renderPolicy({
      initialSettings: {
        ...createDefaultCommunityAssistantPolicySettings(),
        openRouterKeyStatus: { kind: "missing" },
      },
    });

    editTextInput(view.getByPlaceholderText("sk-or-..."), "sk-or-123456789abc");
    fireEvent.click(view.getByRole("button", { name: "Save key" }));

    await waitFor(() => {
      expect(view.getByText("Current key: sk-or-...9abc")).not.toBeNull();
      expect(isDisabled(modelSelect(view))).toBe(false);
    });
    expect(view.getLatestSettings().openRouterKeyStatus).toMatchObject({
      kind: "connected",
      last4: "9abc",
    });
    view.unmount();
  });

  test("revoking a key clears key state and disables model selection", async () => {
    const view = renderPolicy({
      initialSettings: {
        ...createDefaultCommunityAssistantPolicySettings(),
        openRouterKeyStatus: {
          connectedAt: "2026-05-22T00:00:00.000Z",
          kind: "connected",
          last4: "9f3a",
        },
      },
    });

    fireEvent.click(view.getByRole("button", { name: "Revoke" }));

    await waitFor(() => {
      expect(view.queryByText("Current key: sk-or-...9f3a")).toBeNull();
      expect(isDisabled(modelSelect(view))).toBe(true);
    });
    expect(view.getLatestSettings().openRouterKeyStatus).toEqual({ kind: "missing" });
    view.unmount();
  });

  test("shows invalid OpenRouter key state", () => {
    const view = renderPolicy({
      initialSettings: {
        ...createDefaultCommunityAssistantPolicySettings(),
        openRouterKeyStatus: {
          kind: "invalid",
          last4: "9f3a",
          message: "OpenRouter rejected this key.",
        },
      },
    });

    const invalidText = view.getByText("Invalid key: sk-or-...9f3a");

    expect(invalidText.className).toContain("text-destructive");
    expect(view.getByText("OpenRouter rejected this key.")).not.toBeNull();
    view.unmount();
  });

  test("uses an image file input for avatar upload without a text media reference field", () => {
    const view = renderPolicy();

    const fileInput = view.container.querySelector('input[type="file"][accept="image/*"]');

    expect(fileInput).not.toBeNull();
    expect(view.queryByPlaceholderText("Avatar URL")).toBeNull();
    expect(view.queryByPlaceholderText("Media ref")).toBeNull();
    expect(view.queryByPlaceholderText("avatar_ref")).toBeNull();
    view.unmount();
  });

  test("adds, edits, and removes suggested questions", async () => {
    const view = renderPolicy();

    fireEvent.click(view.getByRole("button", { name: "Add question" }));

    await waitFor(() => {
      expect(view.getByLabelText("Suggested question 4")).not.toBeNull();
    });
    expect(view.getLatestSettings().starterPrompts).toHaveLength(4);

    editTextInput(view.getByLabelText("Suggested question 3"), "What changed today?");
    await waitFor(() => {
      expect(view.getLatestSettings().starterPrompts[2]).toBe("What changed today?");
    });

    fireEvent.click(view.getByRole("button", { name: "Remove suggested question 2" }));
    await waitFor(() => {
      expect(view.getLatestSettings().starterPrompts).toEqual([
        "What are the community rules?",
        "What changed today?",
        "",
      ]);
    });
    view.unmount();
  });

  test("keeps locked context sources enabled", () => {
    const view = renderPolicy();

    const communityProfile = view.getByRole("checkbox", { name: "Community profile" });
    const rules = view.getByRole("checkbox", { name: "Rules" });

    expect(isDisabled(communityProfile)).toBe(true);
    expect(isDisabled(rules)).toBe(true);
    expect(communityProfile.getAttribute("data-state")).toBe("checked");
    expect(rules.getAttribute("data-state")).toBe("checked");
    view.unmount();
  });

  test("disables TTS voice unless voice replies are selected", async () => {
    const voiceRepliesSettings = {
      ...createDefaultCommunityAssistantPolicySettings(),
      voiceMode: "voice_replies" as const,
    };

    const offView = renderPolicy({
      initialSettings: {
        ...createDefaultCommunityAssistantPolicySettings(),
        voiceMode: "off",
      },
    });
    const disabledVoiceInput = offView.getByPlaceholderText("voice id");

    expect(isDisabled(disabledVoiceInput)).toBe(true);
    offView.unmount();

    const repliesView = renderPolicy({ initialSettings: voiceRepliesSettings });
    const enabledVoiceInput = repliesView.getByPlaceholderText("voice id");

    await waitFor(() => {
      expect(isDisabled(enabledVoiceInput)).toBe(false);
    });
    repliesView.unmount();
  });

  test("does not render removed model configuration copy", () => {
    const view = renderPolicy();
    const renderedText = view.container.textContent ?? "";

    expect(renderedText).not.toContain("Temperature");
    expect(renderedText).not.toContain("Text model");
    expect(renderedText).not.toContain("connect key");
    expect(renderedText).not.toContain("Connect key");
    view.unmount();
  });

  test("shows saving state on save actions", () => {
    const view = renderPolicy({ submitState: { kind: "saving" } });
    const buttons = saveButtons(view.container);

    expect(buttons.length).toBe(2);
    expect(buttons.every(isDisabled)).toBe(true);
    expect(view.container.querySelectorAll("svg").length).toBeGreaterThan(0);
    view.unmount();
  });

  test("keeps inline and footer save buttons in sync", () => {
    const view = renderPolicy({
      saveDisabled: true,
      submitState: { kind: "saving" },
    });
    const buttons = saveButtons(view.container);

    expect(buttons).toHaveLength(2);
    expect(buttons.every(isDisabled)).toBe(true);
    view.unmount();
  });
});
