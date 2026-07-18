import "@/test/setup-runtime";

import { afterEach, describe, expect, test } from "bun:test";
import * as React from "react";

import { EditableNumberInput } from "./editable-number-input";

Object.defineProperty(window, "getComputedStyle", {
  configurable: true,
  value: () => ({ getPropertyValue: () => "", visibility: "visible" }),
});
Object.defineProperties(window.HTMLElement.prototype, {
  attachEvent: { configurable: true, value: () => undefined },
  detachEvent: { configurable: true, value: () => undefined },
});

const { act, cleanup, fireEvent, render } = await import("@testing-library/react");

afterEach(cleanup);

function inputProps(input: HTMLInputElement) {
  const key = Object.keys(input).find((candidate) => candidate.startsWith("__reactProps$"));
  return key ? (input as unknown as Record<string, {
    onBlur?: () => void;
    onChange?: (event: { target: HTMLInputElement }) => void;
  }>)[key] : null;
}

function edit(input: HTMLInputElement, value: string) {
  input.value = value;
  act(() => inputProps(input)?.onChange?.({ target: input }));
}

describe("EditableNumberInput", () => {
  test("allows clearing while entering a replacement value", () => {
    const changes: number[] = [];
    const view = render(<EditableNumberInput value={20} onValueChange={(value) => changes.push(value)} />);
    const input = view.container.querySelector("input")!;

    fireEvent.focus(input);
    edit(input, "");
    expect(input.value).toBe("");
    expect(changes).toEqual([]);

    edit(input, "35");
    expect(input.value).toBe("35");
    expect(changes).toEqual([35]);
  });

  test("restores the canonical value when an empty edit loses focus", () => {
    const view = render(<EditableNumberInput value={20} onValueChange={() => undefined} />);
    const input = view.container.querySelector("input")!;

    fireEvent.focus(input);
    edit(input, "");
    act(() => inputProps(input)?.onBlur?.());

    expect(input.value).toBe("20");
  });
});
