import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";

import { installDomGlobals } from "@/test/setup-dom";
import { KaraokeLyricStage, type KaraokeStageLine } from "./karaoke-lyric-stage";

installDomGlobals();

afterEach(cleanup);

const lines: KaraokeStageLine[] = [
  {
    endMs: 4_000,
    id: "line-1",
    startMs: 0,
    text: "In a house on a hill with the rise above the river",
  },
  {
    endMs: 8_000,
    id: "line-2",
    startMs: 4_001,
    text: "And the dogs out back digging up some bones from who knows when",
  },
];

describe("KaraokeLyricStage layout", () => {
  test("keeps wrapped active and next lines in the same flow layout", () => {
    const view = render(
      <KaraokeLyricStage currentTimeMs={2_000} lines={lines} />,
    );

    const active = view.container.querySelector(".karaoke-lyric-stage__slot--active");
    const next = view.container.querySelector(".karaoke-lyric-stage__slot--next");
    const lineStack = view.container.querySelector(".karaoke-lyric-stage__lines");

    expect(active).not.toBeNull();
    expect(next).not.toBeNull();
    expect(active?.parentElement).toBe(lineStack);
    expect(next?.parentElement).toBe(lineStack);
  });
});
