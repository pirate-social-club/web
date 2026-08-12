import { afterEach, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";

import { installDomGlobals } from "@/test/setup-dom";

import { SongStudySurface } from "./song-study-surface";

installDomGlobals();
afterEach(cleanup);

test("renders a fill-blank word bank without embedding correctness", () => {
  const select = mock(() => undefined);
  const view = render(
    <SongStudySurface
      onFillBlankTokenSelect={select}
      state={{
        attemptNumber: 1,
        exercise: {
          id: "fill_1",
          prompt: "Fill in the lyric.",
          segments: [
            { kind: "text", text: "We " },
            { id: "blank_1", kind: "blank" },
            { kind: "text", text: " tonight" },
          ],
          tokens: [
            { id: "token_1", text: "drift" },
            { id: "token_2", text: "wait" },
          ],
        },
        kind: "fill_blank",
        selectedTokenIds: [],
      }}
    />,
  );

  fireEvent.click(view.getByRole("button", { name: "drift" }));
  expect(select).toHaveBeenCalledWith("token_1");
  expect(view.queryByRole("button", { name: "Check" })).toBeNull();
});

test("offers another try after a retryable fill-blank miss", () => {
  const view = render(
    <SongStudySurface
      state={{
        attemptNumber: 1,
        exercise: {
          id: "fill_1",
          prompt: "Fill in the lyric.",
          segments: [{ id: "blank_1", kind: "blank" }],
          tokens: [{ id: "token_1", text: "drift" }],
        },
        kind: "fill_blank",
        result: "wrong",
        selectedTokenIds: ["token_1"],
      }}
    />,
  );

  expect(view.getByRole("button", { name: "Try again" })).toBeTruthy();
});
