import { beforeEach, describe, expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";

import { installDomGlobals } from "@/test/setup-dom";

installDomGlobals();

const { mock } = await import("bun:test") as unknown as {
  mock: {
    module: (specifier: string, factory: () => unknown) => void;
  };
};

class FakeMutationObserver {
  static instances: FakeMutationObserver[] = [];
  private callback: () => void;
  observing = false;

  constructor(callback: () => void) {
    this.callback = callback;
    FakeMutationObserver.instances.push(this);
  }

  observe() {
    this.observing = true;
  }

  disconnect() {
    this.observing = false;
  }

  trigger() {
    if (this.observing) this.callback();
  }

  static reset() {
    FakeMutationObserver.instances = [];
  }
}

Object.defineProperty(globalThis, "MutationObserver", {
  configurable: true,
  value: FakeMutationObserver,
});

type VeryWidgetConfig = {
  onSuccess?: (proof: string) => Promise<void>;
  onError?: (error: string) => void;
};

let lastWidgetConfig: VeryWidgetConfig | null = null;
let overlay: HTMLElement | null = null;
const widgetDestroyCalls: number[] = [];

function removeOverlay() {
  overlay?.parentNode?.removeChild(overlay);
  overlay = null;
}

mock.module("@veryai/widget", () => ({
  createVeryWidget: (config: VeryWidgetConfig) => {
    lastWidgetConfig = config;
    return {
      destroy: () => {
        widgetDestroyCalls.push(1);
        removeOverlay();
      },
      open: () => {
        overlay = document.createElement("div");
        overlay.className = "very-dialog-overlay";
        document.body.appendChild(overlay);
      },
    };
  },
}));

const verificationSession = {
  id: "vs_test",
  launch: {
    very_widget: {
      app_id: "app",
      context: "ctx",
      query: { key: "value" },
      type_id: "type",
      verify_url: "https://verify.example/",
    },
  },
  status: "pending",
};

mock.module("@/lib/api", () => ({
  useApi: () => ({
    onboarding: {
      getStatus: async () => ({
        missing_requirements: [],
        unique_human_verification_status: "verified",
      }),
    },
    verification: {
      completeSession: async () => ({ ...verificationSession, status: "verified" }),
      startSession: async () => verificationSession,
    },
  }),
}));

mock.module("@/lib/api/session-store", () => ({
  updateSessionOnboarding: () => undefined,
}));

mock.module("@/lib/platform-detection", () => ({
  isMobileDeviceRuntime: () => false,
}));

mock.module("@/lib/verification/very-bridge-fetch-proxy", () => ({
  installVeryBridgeFetchProxy: () => () => undefined,
}));

const { useVeryVerification } = await import("./use-very-verification");

beforeEach(() => {
  FakeMutationObserver.reset();
  lastWidgetConfig = null;
  widgetDestroyCalls.length = 0;
  removeOverlay();
});

describe("useVeryVerification", () => {
  test("clears the pending state when the widget overlay is dismissed", async () => {
    const { result } = renderHook(() =>
      useVeryVerification({
        verificationIntent: "community_join",
        verified: false,
      })
    );

    await act(async () => {
      const startResult = await result.current.startVerification();
      expect(startResult).toEqual({ started: true });
    });

    expect(result.current.verificationLoading).toBe(true);
    expect(result.current.verificationState).toBe("pending");
    expect(document.querySelector(".very-dialog-overlay")).not.toBe(null);

    // The widget removes its overlay on X/backdrop clicks without any callback.
    act(() => {
      removeOverlay();
      FakeMutationObserver.instances.forEach((observer) => observer.trigger());
    });

    expect(result.current.verificationLoading).toBe(false);
    expect(result.current.verificationState).toBe("not_started");
    expect(result.current.verificationError).toBe(null);
  });

  test("does not treat the success teardown as a dismissal", async () => {
    let verifiedCalls = 0;
    const { result } = renderHook(() =>
      useVeryVerification({
        onVerified: () => {
          verifiedCalls += 1;
        },
        verificationIntent: "community_join",
        verified: false,
      })
    );

    await act(async () => {
      await result.current.startVerification();
    });
    expect(result.current.verificationLoading).toBe(true);

    await act(async () => {
      await lastWidgetConfig?.onSuccess?.("proof");
    });
    FakeMutationObserver.instances.forEach((observer) => observer.trigger());

    expect(verifiedCalls).toBe(1);
    expect(result.current.verificationLoading).toBe(false);
    expect(result.current.verificationError).toBe(null);
  });
});
