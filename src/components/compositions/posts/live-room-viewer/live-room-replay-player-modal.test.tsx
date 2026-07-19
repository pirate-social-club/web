import "@/test/setup-runtime";

import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";

import { LiveRoomReplayPlayerSurface } from "./live-room-replay-player-modal";

Object.defineProperty(window, "getComputedStyle", {
  configurable: true,
  value: () => ({
    getPropertyValue: () => "",
  }),
});

afterEach(() => {
  cleanup();
});

describe("LiveRoomReplayPlayerSurface", () => {
  test("renders video replays in an in-app player", () => {
    const onClose = mock();
    const { getByText } = render(
      <LiveRoomReplayPlayerSurface
        mimeType="video/mp4"
        onClose={onClose}
        sourceUrl="blob:http://localhost/replay-video"
        title="Friday Night Studio Set"
      />,
    );

    expect(getByText("Friday Night Studio Set")).not.toBeNull();
    expect(getByText("Replay")).not.toBeNull();
    const video = document.querySelector("video");
    expect(video?.getAttribute("src")).toBe("blob:http://localhost/replay-video");
  });

  test("renders non-video replays as audio and closes through the modal action", () => {
    const onClose = mock();
    const { getByRole } = render(
      <LiveRoomReplayPlayerSurface
        mimeType="audio/mpeg"
        onClose={onClose}
        sourceUrl="blob:http://localhost/replay-audio"
        title="Studio Audio Replay"
      />,
    );

    const audio = document.querySelector("audio");
    expect(audio?.getAttribute("src")).toBe("blob:http://localhost/replay-audio");
    fireEvent.click(getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });
});
