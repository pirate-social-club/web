import "@/test/setup-runtime";

import { afterEach, describe, expect, test } from "bun:test";

import { VotePill } from "./vote-pill";

const { act, cleanup, fireEvent, render } = await import("@testing-library/react");

afterEach(cleanup);

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

describe("VotePill", () => {
  test("locks both vote directions and shows pending feedback until the vote settles", async () => {
    const pendingVote = deferred();
    const votes: Array<"up" | "down" | null> = [];
    const view = render(
      <VotePill
        onVote={async (direction) => {
          votes.push(direction);
          await pendingVote.promise;
        }}
        score={4}
      />,
    );
    const upvote = view.getByRole("button", { name: "Upvote" });
    const downvote = view.getByRole("button", { name: "Downvote" });

    fireEvent.click(upvote);
    fireEvent.click(upvote);
    fireEvent.click(downvote);

    expect(votes).toEqual(["up"]);
    expect((upvote as HTMLButtonElement).disabled).toBe(true);
    expect((downvote as HTMLButtonElement).disabled).toBe(true);
    expect(upvote.closest('[aria-busy="true"]')).not.toBeNull();
    expect(upvote.querySelector("svg.animate-spin")).not.toBeNull();

    await act(async () => {
      pendingVote.resolve();
      await pendingVote.promise;
    });

    expect((upvote as HTMLButtonElement).disabled).toBe(false);
    expect((downvote as HTMLButtonElement).disabled).toBe(false);
    expect(upvote.closest('[aria-busy="true"]')).toBeNull();
  });

  test("makes the selected direction pressed and inert while allowing a vote change", async () => {
    const votes: Array<"up" | "down" | null> = [];
    const view = render(
      <VotePill
        onVote={(direction) => votes.push(direction)}
        score={4}
        viewerVote="up"
      />,
    );
    const upvote = view.getByRole("button", { name: "Upvote" });
    const downvote = view.getByRole("button", { name: "Downvote" });

    expect(upvote.getAttribute("aria-pressed")).toBe("true");
    expect(downvote.getAttribute("aria-pressed")).toBe("false");
    expect((upvote as HTMLButtonElement).disabled).toBe(true);
    expect((downvote as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(upvote);
    await act(async () => {
      fireEvent.click(downvote);
      await Promise.resolve();
    });

    expect(votes).toEqual(["down"]);
  });

  test("keeps the normal vote pill disabled and busy during external revalidation", () => {
    const votes: Array<"up" | "down" | null> = [];
    const view = render(<VotePill busy onVote={(direction) => votes.push(direction)} score={4} viewerVote="up" />);
    const upvote = view.getByRole("button", { name: "Upvote" });
    const downvote = view.getByRole("button", { name: "Downvote" });

    expect(upvote.closest('[aria-busy="true"]')).not.toBeNull();
    expect((upvote as HTMLButtonElement).disabled).toBe(true);
    expect((downvote as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(downvote);
    expect(votes).toEqual([]);
  });
});
