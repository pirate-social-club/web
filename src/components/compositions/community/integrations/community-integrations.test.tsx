import "@/test/setup-runtime";

import { afterEach, describe, expect, mock, test } from "bun:test";
import * as React from "react";

import { CommunityIntegrationsPage } from "./community-integrations";
import {
  createDefaultCommunityAssistantPolicySettings,
  type CommunityAssistantPolicySettings,
} from "../assistant-policy/community-assistant-policy.types";

Object.defineProperty(globalThis, "HTMLInputElement", {
  configurable: true,
  value: window.HTMLInputElement,
});
Object.defineProperty(globalThis, "InputEvent", {
  configurable: true,
  value: window.InputEvent ?? window.Event,
});

const { act, cleanup, fireEvent, render, waitFor } = await import("@testing-library/react");

afterEach(() => {
  cleanup();
});

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

function renderIntegrations(initialSettings: CommunityAssistantPolicySettings = createDefaultCommunityAssistantPolicySettings()) {
  let latestSettings = initialSettings;
  const onOpenRouterKeySave = mock((apiKey: string) => {
    latestSettings = {
      ...latestSettings,
      openRouterKeyStatus: {
        connectedAt: "2026-07-06T00:00:00.000Z",
        kind: "connected",
        last4: apiKey.slice(-4),
      },
    };
  });
  const onOpenRouterKeyRevoke = mock(() => {
    latestSettings = {
      ...latestSettings,
      openRouterKeyStatus: { kind: "missing" },
    };
  });
  const onElevenLabsKeySave = mock((apiKey: string) => {
    latestSettings = {
      ...latestSettings,
      elevenLabsKeyStatus: {
        connectedAt: "2026-07-06T00:00:00.000Z",
        kind: "connected",
        last4: apiKey.slice(-4),
      },
    };
  });
  const onElevenLabsKeyRevoke = mock(() => {
    latestSettings = {
      ...latestSettings,
      elevenLabsKeyStatus: { kind: "missing" },
    };
  });

  function Harness() {
    const [settings, setSettings] = React.useState(initialSettings);

    return (
      <CommunityIntegrationsPage
        onElevenLabsKeyRevoke={() => {
          onElevenLabsKeyRevoke();
          setSettings((current) => ({ ...current, elevenLabsKeyStatus: { kind: "missing" } }));
        }}
        onElevenLabsKeySave={(apiKey) => {
          onElevenLabsKeySave(apiKey);
          setSettings((current) => ({
            ...current,
            elevenLabsKeyStatus: {
              connectedAt: "2026-07-06T00:00:00.000Z",
              kind: "connected",
              last4: apiKey.slice(-4),
            },
          }));
        }}
        onOpenRouterKeyRevoke={() => {
          onOpenRouterKeyRevoke();
          setSettings((current) => ({ ...current, openRouterKeyStatus: { kind: "missing" } }));
        }}
        onOpenRouterKeySave={(apiKey) => {
          onOpenRouterKeySave(apiKey);
          setSettings((current) => ({
            ...current,
            openRouterKeyStatus: {
              connectedAt: "2026-07-06T00:00:00.000Z",
              kind: "connected",
              last4: apiKey.slice(-4),
            },
          }));
        }}
        settings={settings}
      />
    );
  }

  return {
    ...render(<Harness />),
    getLatestSettings: () => latestSettings,
    onElevenLabsKeyRevoke,
    onElevenLabsKeySave,
    onOpenRouterKeyRevoke,
    onOpenRouterKeySave,
  };
}

describe("CommunityIntegrationsPage", () => {
  test("lists what each provider key powers", () => {
    const view = renderIntegrations();

    expect(view.getByText("OpenRouter")).not.toBeNull();
    expect(view.getByText("Assistant model")).not.toBeNull();
    expect(view.getByText("Assistant text")).not.toBeNull();
    expect(view.getByText("ElevenLabs")).not.toBeNull();
    expect(view.getByText("Assistant voice")).not.toBeNull();
    expect(view.getByText("Study say-it-back")).not.toBeNull();
    expect(view.getByText("Karaoke scoring")).not.toBeNull();
    view.unmount();
  });

  test("saves and masks the OpenRouter key", async () => {
    const view = renderIntegrations();

    editTextInput(view.getByPlaceholderText("sk-or-..."), "sk-or-123456789abc");
    fireEvent.click(view.getByRole("button", { name: "Save OpenRouter key" }));

    await waitFor(() => {
      expect(view.onOpenRouterKeySave).toHaveBeenCalledWith("sk-or-123456789abc");
      expect(view.getByText("Current key: sk-or-...9abc")).not.toBeNull();
    });
    expect(view.getLatestSettings().openRouterKeyStatus).toMatchObject({
      kind: "connected",
      last4: "9abc",
    });
    view.unmount();
  });

  test("saves and revokes the ElevenLabs key", async () => {
    const view = renderIntegrations({
      ...createDefaultCommunityAssistantPolicySettings(),
      elevenLabsKeyStatus: {
        connectedAt: "2026-07-06T00:00:00.000Z",
        kind: "connected",
        last4: "7xyz",
      },
    });

    expect(view.getByText("Current key: ...7xyz")).not.toBeNull();
    fireEvent.click(view.getByRole("button", { name: "Revoke" }));

    await waitFor(() => {
      expect(view.onElevenLabsKeyRevoke).toHaveBeenCalled();
      expect(view.queryByText("Current key: ...7xyz")).toBeNull();
    });
    expect(view.getLatestSettings().elevenLabsKeyStatus).toEqual({ kind: "missing" });
    view.unmount();
  });
});
