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
  test("disables the model picker when the OpenRouter key is missing", () => {
    const view = renderPolicy({
      initialSettings: {
        ...createDefaultCommunityAssistantPolicySettings(),
        openRouterKeyStatus: { kind: "missing" },
      },
    });

    expect(isDisabled(modelSelect(view))).toBe(true);
    expect(view.getByText("Connect OpenRouter in Integrations to choose a model.")).not.toBeNull();
    expect(view.getAllByText("Manage in Integrations").length).toBe(2);
    view.unmount();
  });

  test("shows connected provider status without key editing fields", () => {
    const view = renderPolicy({
      initialSettings: {
        ...createDefaultCommunityAssistantPolicySettings(),
        openRouterKeyStatus: {
          connectedAt: "2026-05-22T00:00:00.000Z",
          kind: "connected",
          last4: "9f3a",
        },
        elevenLabsKeyStatus: {
          connectedAt: "2026-05-22T00:00:00.000Z",
          kind: "connected",
          last4: "7xyz",
        },
      },
    });

    expect(view.getAllByText("Connected").length).toBeGreaterThanOrEqual(2);
    expect(view.queryByPlaceholderText("sk-or-...")).toBeNull();
    expect(view.queryByPlaceholderText("ElevenLabs API key")).toBeNull();
    view.unmount();
  });

  test("searches live OpenRouter model options and selects a model", async () => {
    const view = renderPolicy({
      initialSettings: {
        ...createDefaultCommunityAssistantPolicySettings(),
        openRouterKeyStatus: {
          connectedAt: "2026-05-22T00:00:00.000Z",
          kind: "connected",
          last4: "9f3a",
        },
        selectedModelId: "mistralai/mistral-small-3.2-24b-instruct",
        availableModels: [
          {
            contextLength: 1_000_000,
            description: "Fresh OpenRouter model.",
            id: "openai/gpt-5.4",
            inputCostUsdPerMillionTokens: 1.25,
            label: "GPT-5.4",
            outputCostUsdPerMillionTokens: 10,
          },
          {
            id: "mistralai/mistral-small-3.2-24b-instruct",
            label: "Mistral Small 3.2",
          },
        ],
      },
    });

    const input = modelSelect(view);

    editTextInput(input, "gpt");

    await waitFor(() => {
      expect(view.getByText("GPT-5.4")).not.toBeNull();
    });
    expect(view.queryByText("Fresh OpenRouter model.")).toBeNull();
    expect(view.queryByText("1M context")).toBeNull();
    expect(view.queryByText("$1.3 in / $10 out per 1M")).toBeNull();
    fireEvent.click(view.getByRole("option", { name: "GPT-5.4" }));

    await waitFor(() => {
      expect(view.getLatestSettings().selectedModelId).toBe("openai/gpt-5.4");
    });
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

    const invalidText = view.getByText("Invalid key");

    expect(invalidText.className).toContain("text-destructive");
    expect(view.queryByText("OpenRouter rejected this key.")).toBeNull();
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

  test("hides future-only memory, action, and export controls", () => {
    const view = renderPolicy();
    const renderedText = view.container.textContent ?? "";

    expect(view.queryByText("Memory")).toBeNull();
    expect(renderedText).not.toContain("Use chat memory");
    expect(renderedText).not.toContain("Save chats in community DB");
    expect(renderedText).not.toContain("Retention scope");
    expect(view.queryByText("Actions")).toBeNull();
    expect(renderedText).not.toContain("Allowed actions");
    expect(renderedText).not.toContain("Require approval for writes");
    expect(renderedText).not.toContain("Sovereign export");
    expect(view.getByText("Retention")).not.toBeNull();
    view.unmount();
  });

  test("renders voice configuration controls", () => {
    const view = renderPolicy({
      initialSettings: {
        ...createDefaultCommunityAssistantPolicySettings(),
        voiceMode: "voice_replies",
        sttModel: "scribe_v2",
        ttsVoice: "voice_123",
      },
    });

    expect(view.getByText("Voice")).not.toBeNull();
    expect(view.getByText("ElevenLabs key")).not.toBeNull();
    expect(view.getByText("Voice mode")).not.toBeNull();
    expect(view.getByText("STT provider")).not.toBeNull();
    expect(view.getByDisplayValue("ElevenLabs Scribe")).not.toBeNull();
    expect(view.getByDisplayValue("scribe_v2")).not.toBeNull();
    expect(view.getByText("TTS provider")).not.toBeNull();
    expect(view.getByDisplayValue("ElevenLabs")).not.toBeNull();
    expect(view.getByDisplayValue("voice_123")).not.toBeNull();
    view.unmount();
  });

  test("renders TTS controls for text and voice replies", () => {
    const view = renderPolicy({
      initialSettings: {
        ...createDefaultCommunityAssistantPolicySettings(),
        voiceMode: "text_and_voice_replies",
        sttModel: "scribe_v2",
        ttsVoice: "voice_both",
      },
    });

    expect(view.getByText("TTS provider")).not.toBeNull();
    expect(view.getByDisplayValue("ElevenLabs")).not.toBeNull();
    expect(view.getByDisplayValue("voice_both")).not.toBeNull();
    view.unmount();
  });

  test("renders Telegram controls with the preview cap bounds", () => {
    const view = renderPolicy();

    expect(view.getByText("Telegram")).not.toBeNull();
    fireEvent.click(view.getByRole("switch", { name: "Private bot DMs" }));
    expect(view.getLatestSettings().telegramPrivateAssistantEnabled).toBe(true);

    const previewCapInput = Array.from(view.container.querySelectorAll<HTMLInputElement>('input[type="number"]'))
      .find((input) => input.getAttribute("min") === "0");
    expect(previewCapInput).not.toBeNull();
    expect(previewCapInput?.getAttribute("max")).toBe("50");

    editTextInput(previewCapInput!, "51");
    expect(view.getLatestSettings().telegramPreviewDailyCap).toBe(5);

    editTextInput(previewCapInput!, "50");
    expect(view.getLatestSettings().telegramPreviewDailyCap).toBe(50);
    view.unmount();
  });

  test("updates TTS voice", () => {
    const view = renderPolicy({
      initialSettings: {
        ...createDefaultCommunityAssistantPolicySettings(),
        voiceMode: "voice_replies",
        ttsVoice: "",
      },
    });

    editTextInput(view.getByPlaceholderText("ElevenLabs voice ID"), "voice_new");

    expect(view.getLatestSettings().ttsVoice).toBe("voice_new");
    expect(view.getLatestSettings().ttsProvider).toBe("elevenlabs");
    view.unmount();
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
