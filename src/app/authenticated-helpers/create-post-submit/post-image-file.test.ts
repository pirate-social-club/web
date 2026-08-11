import { describe, expect, test } from "bun:test";

import { assertPostImageFile } from "./post-image-file";

function fileDescriptor(input: {
  name?: string;
  size?: number;
  type?: string;
} = {}): File {
  return {
    name: input.name ?? "image.png",
    size: input.size ?? 1024,
    type: input.type ?? "image/png",
  } as File;
}

describe("assertPostImageFile", () => {
  test("accepts supported image types and filename inference", () => {
    expect(() => assertPostImageFile(fileDescriptor())).not.toThrow();
    expect(() => assertPostImageFile(fileDescriptor({ name: "image.webp", type: "" }))).not.toThrow();
  });

  test("rejects invalid images before upload", () => {
    expect(() => assertPostImageFile(fileDescriptor({ size: 0 }))).toThrow("empty");
    expect(() => assertPostImageFile(fileDescriptor({ size: 20 * 1024 * 1024 + 1 }))).toThrow("20MB");
    expect(() => assertPostImageFile(fileDescriptor({ name: "notes.txt", type: "text/plain" })))
      .toThrow("JPEG, PNG, WebP, GIF, or AVIF");
  });
});
