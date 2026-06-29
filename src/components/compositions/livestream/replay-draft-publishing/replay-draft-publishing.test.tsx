import "@/test/setup-runtime";

import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { ReplayDraftPublishing, type ReplayDraftPublishingProps } from "./replay-draft-publishing";
import type { AssetRoyaltySplitState } from "@/components/compositions/posts/post-composer/royalty-split-editor";

const split: AssetRoyaltySplitState = {
  allocations: [
    { id: "host", recipientKind: "creator", walletAddress: "0x1f2a4b8c9d0e1234567890abcdef1234567890ab", sharePct: 70 },
    { id: "guest", recipientKind: "collaborator", walletAddress: "0x2b3c5d9e0f1a2345678901bcdef23456789012cd", sharePct: 20 },
    { id: "venue", recipientKind: "collaborator", walletAddress: "0x3c4d6e0f1a2b3456789012cdef345678901234ef", sharePct: 10 },
  ],
};

const baseProps: ReplayDraftPublishingProps = {
  accessPolicy: "included_with_ticket",
  approvalStatus: "approved",
  caption: "Clean board mix from the late set.",
  durationLabel: "48 min",
  onRoyaltySplitChange: () => {},
  priceLabel: "$8.00",
  royaltySplit: split,
  status: "ready",
  title: "Friday Night Studio Set",
};

describe("ReplayDraftPublishing", () => {
  test("renders the shared wallet-address split editor without infra jargon or fake personas", () => {
    const markup = renderToStaticMarkup(<ReplayDraftPublishing {...baseProps} />);

    expect(markup).toContain("Review and publish recording");
    expect(markup).toContain("Draft ready");
    expect(markup).toContain("Royalty split");
    expect(markup).toContain("0x1f2a4b8c9d0e1234567890abcdef1234567890ab");
    expect(markup).toContain("Add wallet");
    expect(markup).toContain("Publish replay");
    expect(markup).not.toContain("Filebase");
    expect(markup).not.toContain("Story CDR");
    expect(markup).not.toContain("Mara Vale");
    expect(markup).not.toContain("Host performer");
  });

  test("blocks paid publication when split approval is pending", () => {
    const pendingSplit: AssetRoyaltySplitState = {
      allocations: [
        { id: "host", recipientKind: "creator", walletAddress: "0x1f2a4b8c9d0e1234567890abcdef1234567890ab", sharePct: 50 },
        { id: "guest", recipientKind: "collaborator", walletAddress: "0x2b3c5d9e0f1a2345678901bcdef23456789012cd", sharePct: 25 },
        { id: "label", recipientKind: "collaborator", walletAddress: "0x4d5e7f1a2b3c4567890123def456789012345fa", sharePct: 25 },
      ],
    };

    const markup = renderToStaticMarkup(
      <ReplayDraftPublishing
        {...baseProps}
        accessPolicy="paid"
        approvalStatus="pending"
        royaltySplit={pendingSplit}
      />,
    );

    expect(markup).toContain("Paid replay");
    expect(markup).toContain("0x4d5e7f1a2b3c4567890123def456789012345fa");
    expect(markup).toContain("Waiting on split approvals.");
  });

  test("can expose only the currently supported free publish path", () => {
    const markup = renderToStaticMarkup(
      <ReplayDraftPublishing
        {...baseProps}
        accessPolicy="free"
        status="ready"
        supportedAccessPolicies={["free"]}
      />,
    );

    expect(markup).toContain("Free replay");
    expect(markup).not.toContain("Paid replay");
    expect(markup).not.toContain("Included with live ticket");
  });

  test("renders not-recorded drafts without pretending work is still processing", () => {
    const markup = renderToStaticMarkup(
      <ReplayDraftPublishing
        {...baseProps}
        approvalStatus="not_required"
        status="not_recorded"
        thumbnailSrc={undefined}
      />,
    );

    expect(markup).toContain("Not recorded");
    expect(markup).toContain("This live room was not recorded.");
    expect(markup).not.toContain("Recording is still processing.");
  });

  test("can expose every publish mode once paid replay listing support is available", () => {
    const markup = renderToStaticMarkup(
      <ReplayDraftPublishing
        {...baseProps}
        accessPolicy="paid"
        priceLabel="8.00"
        status="ready"
        supportedAccessPolicies={["free", "included_with_ticket", "paid"]}
      />,
    );

    expect(markup).toContain("Paid replay");
    expect(markup).toContain("Price");
    expect(markup).toContain("8.00");
  });
});
