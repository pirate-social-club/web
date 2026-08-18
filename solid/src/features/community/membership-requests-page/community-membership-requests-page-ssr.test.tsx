import { afterAll, describe, expect, mock, test } from "bun:test";
import { renderToString, ssrElement } from "@solidjs/web";
import { createComponent } from "solid-js";

const designSystemPath = new URL("../../../design-system.ts", import.meta.url).pathname;
const uiLocalePath = new URL("../../../lib/ui-locale.tsx", import.meta.url).pathname;
const jsxRuntimePath = new URL("../../../../node_modules/@solidjs/web/types/jsx.d.ts", import.meta.url).pathname;

function element(tag: string, props: Record<string, unknown>) {
  const { children, class: className, ...rest } = props;
  return ssrElement(tag, { ...rest, ...(className ? { class: className } : {}) }, children, false);
}

const primitive = (tag: string) => (props: Record<string, unknown>) => element(tag, props);

mock.module(designSystemPath, () => ({
  Avatar: primitive("span"),
  Button: (props: Record<string, unknown>) => {
    const { children, loading, ...rest } = props;
    return element("button", {
      ...rest,
      "aria-busy": loading ? "true" : undefined,
      children,
      disabled: Boolean(props.disabled) || Boolean(loading),
    });
  },
  Card: primitive("section"),
  Separator: primitive("hr"),
  Type: (props: Record<string, unknown>) => element(String(props.as ?? "span"), props),
}));

mock.module(uiLocalePath, () => ({
  useUiLocale: () => ({ locale: () => "en" }),
}));

mock.module(jsxRuntimePath, () => ({
  Fragment: (props: { children?: unknown }) => props.children,
  jsx: (type: unknown, props: Record<string, unknown>) => typeof type === "string" ? ssrElement(type, props, props.children, false) : createComponent(type as never, props),
  jsxs: (type: unknown, props: Record<string, unknown>) => typeof type === "string" ? ssrElement(type, props, props.children, false) : createComponent(type as never, props),
  jsxDEV: (type: unknown, props: Record<string, unknown>) => typeof type === "string" ? ssrElement(type, props, props.children, false) : createComponent(type as never, props),
}));

const { CommunityMembershipRequestsPage } = await import("./community-membership-requests-page");

const requests = [
  {
    id: "mreq_1",
    object: "membership_request_summary" as const,
    community: "cmt_signal",
    applicant_user: "usr_1",
    applicant_handle: "maya.pirate",
    applicant_avatar_ref: null,
    status: "pending" as const,
    note: "I have been following the community and would like to participate.",
    created: 1777024800,
  },
  {
    id: "mreq_2",
    object: "membership_request_summary" as const,
    community: "cmt_signal",
    applicant_user: "usr_2",
    applicant_handle: "noor.pirate",
    applicant_avatar_ref: null,
    status: "pending" as const,
    note: null,
    created: 1776958200,
  },
];

const callbacks = {
  onApprove: () => undefined,
  onReject: () => undefined,
};

describe("CommunityMembershipRequestsPage SSR", () => {
  test("renders deterministic request rows, profile hrefs, notes, and epoch-second dates", () => {
    const html = renderToString(() => createComponent(CommunityMembershipRequestsPage, {
      ...callbacks,
      requests,
    }));

    expect(html).toContain("Requests");
    expect(html).toContain("Review who can join this community.");
    expect(html).toContain('data-membership-request-id="mreq_1"');
    expect(html).toContain('data-membership-request-id="mreq_2"');
    expect(html).toContain('href="/u/maya.pirate"');
    expect(html).toContain('href="/u/noor.pirate"');
    expect(html).toContain("I have been following the community and would like to participate.");
    expect(html).toContain("No message.");
    expect(html).toContain("2026");
    expect(html).not.toContain("58000");
    expect(html).not.toContain("fetch(");
    expect(html).not.toContain("Math.random");
  });

  test("gives loading precedence over supplied rows", () => {
    const html = renderToString(() => createComponent(CommunityMembershipRequestsPage, {
      ...callbacks,
      loading: true,
      requests,
    }));

    expect(html).toContain("Loading requests");
    expect(html).not.toContain("maya.pirate");
    expect(html).not.toContain("Approve");
  });

  test("exposes only the matching processing row as busy", () => {
    const html = renderToString(() => createComponent(CommunityMembershipRequestsPage, {
      ...callbacks,
      processingRequestId: "mreq_1",
      requests,
    }));

    expect((html.match(/aria-busy="true"/g) ?? []).length).toBe(1);
    expect(html).toContain("data-membership-request-id=\"mreq_1\"");
    expect(html).toContain("data-membership-request-id=\"mreq_2\"");
  });

  test("renders the empty state without action controls", () => {
    const html = renderToString(() => createComponent(CommunityMembershipRequestsPage, {
      ...callbacks,
      requests: [],
    }));

    expect(html).toContain("No pending requests.");
    expect(html).not.toContain("Approve");
    expect(html).not.toContain("Reject");
  });
});

afterAll(() => mock.restore());
