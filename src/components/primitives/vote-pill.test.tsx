import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";

import { installDomGlobals } from "@/test/setup-dom";

import { VotePill } from "./vote-pill";

installDomGlobals();

describe("VotePill", () => {
  test("renders an active upvote as the filled primary state", () => {
    const view = render(<VotePill score={7} viewerVote="up" />);

    const upvote = view.getByLabelText("Upvote");
    const downvote = view.getByLabelText("Downvote");
    const upvoteIcon = upvote.querySelector("svg");

    expect(upvote.className).toContain("text-primary");
    expect(upvoteIcon?.getAttribute("class")).toContain("fill-current");
    expect(downvote.className).toContain("text-muted-foreground");
  });
});
