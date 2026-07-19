import "@/test/setup-runtime";

import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, waitFor } from "@testing-library/react";

import { RoyaltySplitEditor } from "./royalty-split-editor";
import type { AssetRoyaltySplitState } from "./post-composer.types";

afterEach(cleanup);

const creatorAllocation = {
  id: "creator",
  recipientKind: "creator" as const,
  walletAddress: "0x1111111111111111111111111111111111111111",
};

describe("RoyaltySplitEditor", () => {
  test("resynchronizes a replaced solo allocation when the charity percentage is unchanged", async () => {
    const changes: AssetRoyaltySplitState[] = [];
    const onChange = (value: AssetRoyaltySplitState) => changes.push(value);
    const props = {
      charityContribution: { percentagePct: 10 },
      charityPartner: {
        partnerId: "endaoment:mock-charity-water",
        displayName: "charity: water",
      },
      onChange,
      value: {
        allocations: [{ ...creatorAllocation, sharePct: 90 }],
      },
    };
    const view = render(<RoyaltySplitEditor {...props} />);

    expect(changes).toEqual([]);

    view.rerender(
      <RoyaltySplitEditor
        {...props}
        value={{ allocations: [{ ...creatorAllocation, sharePct: 80 }] }}
      />,
    );

    await waitFor(() => {
      expect(changes.at(-1)?.allocations[0]?.sharePct).toBe(90);
    });
  });
});
