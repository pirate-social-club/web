import { describe, expect, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import * as React from "react";
import type { SelfApp } from "@selfxyz/sdk-common";

import { installDomGlobals } from "@/test/setup-dom";

const { window } = installDomGlobals();

const { mock } = await import("bun:test") as unknown as {
  mock: {
    module: (specifier: string, factory: () => unknown) => void;
  };
};

Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: () => ({
    addEventListener: () => undefined,
    matches: false,
    removeEventListener: () => undefined,
  }),
});

class FakeMutationObserver {
  observe() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

Object.defineProperty(globalThis, "MutationObserver", {
  configurable: true,
  value: FakeMutationObserver,
});

// The real wrapper opens a socket.io connection to the Self relay; the stall
// notice must not depend on it (its connect_error handler never surfaces).
mock.module("@selfxyz/qrcode", () => ({
  SelfQRcodeWrapper: () => <div data-testid="self-qr-stub" />,
}));

// Render the modal shell inline: the stall behavior lives in this component,
// and the Radix shell dispatches custom events linkedom cannot deliver.
mock.module("@/components/compositions/system/modal/modal", () => ({
  Modal: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
  ModalContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ModalDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  ModalFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ModalHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ModalTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

const { SelfVerificationModal } = await import("./self-verification-modal");

const STALL_NOTICE = /Still waiting for the Self app/;
const CSP_DIAGNOSIS = /blocked the connection to the verification service/;

function dispatchCspViolation(init: { directive?: string; disposition?: string } = {}) {
  const event = new window.Event("securitypolicyviolation");
  Object.assign(event, {
    blockedURI: "wss://websocket.self.xyz/websocket",
    disposition: init.disposition ?? "enforce",
    effectiveDirective: init.directive ?? "connect-src",
    violatedDirective: init.directive ?? "connect-src",
  });
  window.document.dispatchEvent(event);
}

const BASE_PROPS = {
  actionLabel: "Open Self",
  description: "Scan the QR code with the Self app.",
  onOpenChange: () => {},
  open: true,
  selfApp: {} as unknown as SelfApp,
  title: "Verify with Self",
};

describe("SelfVerificationModal stall notice", () => {
  test("shows the stall notice after the configured delay", async () => {
    const rendered = render(<SelfVerificationModal {...BASE_PROPS} stallNoticeMs={10} />);

    expect(rendered.queryByText(STALL_NOTICE)).toBeNull();

    await waitFor(() => {
      expect(rendered.queryByText(STALL_NOTICE)).not.toBeNull();
    });
  });

  test("stays hidden before the delay elapses", () => {
    const rendered = render(<SelfVerificationModal {...BASE_PROPS} stallNoticeMs={60_000} />);

    expect(rendered.queryByText(STALL_NOTICE)).toBeNull();
  });

  test("is suppressed while an error is shown", async () => {
    const rendered = render(
      <SelfVerificationModal {...BASE_PROPS} error="Verification failed" stallNoticeMs={10} />,
    );

    await waitFor(() => {
      expect(rendered.queryByText("Verification failed")).not.toBeNull();
    });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(rendered.queryByText(STALL_NOTICE)).toBeNull();
  });

  test("diagnoses an enforced CSP block immediately, without the stall notice", async () => {
    const rendered = render(<SelfVerificationModal {...BASE_PROPS} stallNoticeMs={60_000} />);

    dispatchCspViolation();

    await waitFor(() => {
      expect(rendered.queryByText(CSP_DIAGNOSIS)).not.toBeNull();
    });
    expect(rendered.queryByText(/connect-src/)).not.toBeNull();
    expect(rendered.queryByText(/websocket\.self\.xyz/)).not.toBeNull();
    expect(rendered.queryByText(STALL_NOTICE)).toBeNull();
  });

  test("ignores report-only CSP violations", async () => {
    const rendered = render(<SelfVerificationModal {...BASE_PROPS} stallNoticeMs={60_000} />);

    dispatchCspViolation({ disposition: "report" });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(rendered.queryByText(CSP_DIAGNOSIS)).toBeNull();
  });

  test("ignores CSP violations outside connect-src", async () => {
    const rendered = render(<SelfVerificationModal {...BASE_PROPS} stallNoticeMs={60_000} />);

    dispatchCspViolation({ directive: "img-src" });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(rendered.queryByText(CSP_DIAGNOSIS)).toBeNull();
  });
});
