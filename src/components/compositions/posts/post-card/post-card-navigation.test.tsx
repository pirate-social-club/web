import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";

import { installDomGlobals } from "@/test/setup-dom";

installDomGlobals();
afterEach(cleanup);
beforeEach(() => {
  navigate.mockClear();
  onSeek.mockClear();
});

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(globalThis, "ResizeObserver", { configurable: true, value: ResizeObserverStub });
Object.defineProperty(window, "ResizeObserver", { configurable: true, value: ResizeObserverStub });

// Radix slider captures the pointer on press; linkedom has no pointer capture,
// so track captured pointer ids per element for down/move/up sequences.
const pointerCaptures = new WeakMap<Element, number>();
Object.defineProperty(window.HTMLElement.prototype, "setPointerCapture", {
  configurable: true,
  value(pointerId: number) {
    pointerCaptures.set(this as Element, pointerId);
  },
});
Object.defineProperty(window.HTMLElement.prototype, "releasePointerCapture", {
  configurable: true,
  value(pointerId: number) {
    if (pointerCaptures.get(this as Element) === pointerId) {
      pointerCaptures.delete(this as Element);
    }
  },
});
Object.defineProperty(window.HTMLElement.prototype, "hasPointerCapture", {
  configurable: true,
  value(pointerId: number) {
    return pointerCaptures.get(this as Element) === pointerId;
  },
});

// linkedom has no MouseEvent/KeyboardEvent constructors and drops event init
// fields, so build plain events and attach the fields React and Radix read.
function pointerEvent(
  type: "click" | "pointerdown" | "pointermove" | "pointerup" | "pointercancel",
  x: number,
  y: number,
  { isPrimary = true, pointerId = 1 } = {},
) {
  const event = new window.Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    button: { value: 0 },
    clientX: { value: x },
    clientY: { value: y },
    isPrimary: { value: isPrimary },
    pointerId: { value: pointerId },
  });
  return event;
}

function keyEvent(key: string, { shiftKey = false } = {}) {
  const event = new window.Event("keydown", { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    key: { value: key },
    shiftKey: { value: shiftKey },
  });
  return event;
}

const navigate = mock(() => {});
const onSeek = mock(() => {});
mock.module("@/app/router", () => ({ navigate }));

const { PostCard } = await import("./post-card");
const { UiLocaleProvider } = await import("@/lib/ui-locale");

function renderSongCard() {
  const view = render(
    <UiLocaleProvider locale="en">
      <PostCard
        byline={{ author: { kind: "user", label: "u/artist" }, timestampLabel: "now" }}
        content={{
          type: "song",
          accessMode: "public",
          durationMs: 187000,
          onPause: () => undefined,
          onSeek,
          playbackState: "playing",
          progressMs: 1000,
          title: "Sweet Into Bitter",
        }}
        engagement={{ commentCount: 0, score: 0 }}
        postHref="/p/post_song"
        title="Sweet Into Bitter"
      />
    </UiLocaleProvider>,
  );
  const sliderRoot = view.container.querySelector<HTMLElement>("[data-orientation]");
  expect(sliderRoot).toBeTruthy();
  // linkedom returns zero rects; Radix converts pointer x to a seek value from
  // the slider root rect, so give it a deterministic 100px-wide track.
  sliderRoot!.getBoundingClientRect = () => ({
    bottom: 44,
    height: 44,
    left: 0,
    right: 100,
    top: 0,
    width: 100,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  return { ...view, sliderRoot: sliderRoot! };
}

test("clicking the card body navigates to the post", () => {
  const { container } = renderSongCard();
  const article = container.querySelector("article")!;

  fireEvent(article, pointerEvent("pointerdown", 10, 10));
  fireEvent(article, pointerEvent("click", 10, 10));

  expect(navigate).toHaveBeenCalledWith("/p/post_song");
});

test("pointer down/move/up on the track seeks without navigating", () => {
  const { sliderRoot } = renderSongCard();

  fireEvent(sliderRoot, pointerEvent("pointerdown", 50, 22));
  fireEvent(sliderRoot, pointerEvent("pointermove", 75, 22));
  fireEvent(sliderRoot, pointerEvent("pointerup", 75, 22));

  // 50% of 187s snapped to the 1s step.
  expect(onSeek).toHaveBeenCalledWith(94000);
  expect(onSeek).toHaveBeenLastCalledWith(140000);
  expect(navigate).not.toHaveBeenCalled();
});

test("clicking the scrubber thumb does not navigate to the post", () => {
  const { getByRole } = renderSongCard();
  const thumb = getByRole("slider");

  fireEvent(thumb, pointerEvent("pointerdown", 50, 22));
  fireEvent(thumb, pointerEvent("click", 50, 22));

  expect(navigate).not.toHaveBeenCalled();
});

test("arrow keys seek in seconds without navigating", () => {
  const { getByRole } = renderSongCard();
  const thumb = getByRole("slider");

  fireEvent(thumb, keyEvent("ArrowRight"));
  expect(onSeek).toHaveBeenLastCalledWith(2000);

  fireEvent(thumb, keyEvent("ArrowRight", { shiftKey: true }));
  expect(onSeek).toHaveBeenLastCalledWith(11000);

  expect(navigate).not.toHaveBeenCalled();
});

test("Enter on the focused slider does not navigate, Enter on the card body does", () => {
  const { container, getByRole } = renderSongCard();
  const article = container.querySelector("article")!;

  fireEvent(getByRole("slider"), keyEvent("Enter"));
  expect(navigate).not.toHaveBeenCalled();

  fireEvent(article, keyEvent("Enter"));
  expect(navigate).toHaveBeenCalledWith("/p/post_song");
});

test("a click that ends a drag does not navigate to the post", () => {
  const { container } = renderSongCard();
  const article = container.querySelector("article")!;

  fireEvent(article, pointerEvent("pointerdown", 10, 10));
  fireEvent(article, pointerEvent("click", 80, 14));

  expect(navigate).not.toHaveBeenCalled();
});

test("releasing a scrub outside the scrubber does not navigate", () => {
  const { container, getByRole } = renderSongCard();
  const article = container.querySelector("article")!;

  fireEvent(getByRole("slider"), pointerEvent("pointerdown", 50, 22));
  fireEvent(getByRole("slider"), pointerEvent("pointermove", 75, 22));
  fireEvent(article, pointerEvent("click", 300, 260));

  expect(onSeek).toHaveBeenCalled();
  expect(navigate).not.toHaveBeenCalled();
});

test("a cancelled gesture clears drag state so the next click navigates", () => {
  const { container } = renderSongCard();
  const article = container.querySelector("article")!;

  fireEvent(article, pointerEvent("pointerdown", 10, 10));
  fireEvent(article, pointerEvent("pointercancel", 10, 10));
  fireEvent(article, pointerEvent("click", 80, 14));

  expect(navigate).toHaveBeenCalledWith("/p/post_song");
});

test("a secondary pointer neither overwrites nor clears the primary drag state", () => {
  const { container } = renderSongCard();
  const article = container.querySelector("article")!;

  fireEvent(article, pointerEvent("pointerdown", 10, 10));
  fireEvent(article, pointerEvent("pointerdown", 40, 40, { isPrimary: false, pointerId: 2 }));
  fireEvent(article, pointerEvent("pointercancel", 40, 40, { isPrimary: false, pointerId: 2 }));
  fireEvent(article, pointerEvent("click", 80, 14));

  expect(navigate).not.toHaveBeenCalled();
});
