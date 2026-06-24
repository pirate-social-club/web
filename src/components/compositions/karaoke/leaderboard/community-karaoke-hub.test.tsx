import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";

import { installDomGlobals } from "@/test/setup-dom";
import { CommunityKaraokeHub } from "./community-karaoke-hub";
import { songStandings } from "./fixtures";

installDomGlobals();
afterEach(cleanup);

const noop = () => undefined;

function renderHub(props: Partial<React.ComponentProps<typeof CommunityKaraokeHub>> = {}) {
  return render(
    <CommunityKaraokeHub
      onRetry={props.onRetry ?? noop}
      onSing={props.onSing ?? noop}
      onViewRankings={props.onViewRankings ?? noop}
      songs={props.songs ?? songStandings}
      status={props.status}
    />,
  );
}

describe("CommunityKaraokeHub", () => {
  test("lists songs with leader, participant count, and the viewer's standing", () => {
    const text = renderHub().container.textContent ?? "";
    expect(text).toContain("Midnight Waves");
    expect(text).toContain("Harbor Lights");
    expect(text).toContain("singers");
    expect(text).toContain("Your best");
  });

  test("empty list says there are no karaoke songs", () => {
    expect(renderHub({ songs: [] }).container.textContent).toContain("No karaoke songs");
  });

  test("Sing fires with the song's postId", () => {
    const sang: string[] = [];
    // Harbor Lights: not sung -> "Sing".
    const view = renderHub({ songs: [songStandings[1]], onSing: (id) => sang.push(id) });
    fireEvent.click(view.getByText("Sing"));
    expect(sang).toEqual(["pst_2"]);
  });

  test("View rankings is disabled for a song with no board yet", () => {
    // Saltwater Hymn: participantCount 0.
    const view = renderHub({ songs: [songStandings[2]] });
    const button = view.getByText("View rankings").closest("button") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  test("loading shows a spinner; error offers retry", () => {
    const loading = renderHub({ status: "loading", songs: undefined });
    expect(loading.container.querySelector('svg[role="status"]')).toBeTruthy();
    cleanup();

    const retries: string[] = [];
    const errored = renderHub({ status: "error", songs: undefined, onRetry: () => retries.push("r") });
    fireEvent.click(errored.getByText("Try again"));
    expect(retries).toEqual(["r"]);
  });
});
