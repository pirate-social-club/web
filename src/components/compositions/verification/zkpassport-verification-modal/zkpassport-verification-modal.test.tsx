import { describe, expect, test } from "bun:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parseHTML } from "linkedom";

const { mock } = await import("bun:test") as unknown as {
  mock: {
    module: (specifier: string, factory: () => unknown) => void;
  };
};

let mockedIsMobile = false;

mock.module("@/hooks/use-mobile", () => ({
  useIsMobile: () => mockedIsMobile,
}));

mock.module("@/lib/platform-detection", () => ({
  isAndroidRuntime: () => false,
}));

mock.module("@/components/compositions/system/modal/modal", () => ({
  Modal: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="modal">{children}</div> : null,
}));

mock.module("@/components/compositions/system/modal/standard-modal-layout", () => ({
  StandardModalContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="modal-content">{children}</div>
  ),
  StandardModalHeader: ({
    description,
    icon,
    title,
  }: {
    description: string;
    icon: React.ReactNode;
    title: string;
  }) => (
    <header>
      {icon}
      <h2>{title}</h2>
      <p>{description}</p>
    </header>
  ),
}));

const { ZkPassportVerificationModal } = await import("./zkpassport-verification-modal");

function renderModal({
  href = "https://zkpassport.id/r?d=staging.pirate.sc&t=test",
  open = true,
}: {
  href?: string | null;
  open?: boolean;
} = {}) {
  return parseHTML(renderToStaticMarkup(
    <ZkPassportVerificationModal
      actionLabel="Open ZKPassport"
      description="Verify with ZKPassport to continue."
      href={href}
      onCheckPending={() => undefined}
      onOpenChange={() => undefined}
      open={open}
      title="Verify with ZKPassport"
    />,
  )).document;
}

describe("ZkPassportVerificationModal", () => {
  test("renders a QR code instead of an external link on desktop", () => {
    mockedIsMobile = false;

    const rendered = renderModal();

    expect(rendered.querySelector("[aria-label='ZKPassport verification QR code']")).not.toBeNull();
    expect(rendered.querySelector("a[href^='https://zkpassport.id/r']")).toBeNull();
    expect(rendered.toString()).toContain("Check verification");
  });

  test("renders an external launch link on mobile", () => {
    mockedIsMobile = true;

    const rendered = renderModal();
    const link = rendered.querySelector("a[href^='https://zkpassport.id/r']");

    expect(link?.textContent).toContain("Open ZKPassport");
    expect(rendered.querySelector("[aria-label='ZKPassport verification QR code']")).toBeNull();
  });

  test("warns when opened without a launch href", () => {
    mockedIsMobile = false;

    const rendered = renderModal({ href: null });

    expect(rendered.toString()).toContain("Verification link is unavailable.");
    expect(rendered.querySelector("[aria-label='ZKPassport verification QR code']")).toBeNull();
    expect(rendered.querySelector("a")).toBeNull();
  });
});
