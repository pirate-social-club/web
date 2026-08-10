import { describe, expect, test } from "bun:test";

import { assertProgressiveMp4Layout, hasProgressiveMp4Layout } from "./progressive-mp4";

function box(type: string, payloadBytes = 0): Uint8Array {
  const bytes = new Uint8Array(8 + payloadBytes);
  new DataView(bytes.buffer).setUint32(0, bytes.byteLength);
  for (let index = 0; index < 4; index += 1) {
    bytes[4 + index] = type.charCodeAt(index);
  }
  return bytes;
}

function mp4File(boxes: Uint8Array[]): File {
  return new File(boxes, "clip.mp4", { type: "video/mp4" });
}

describe("progressive MP4 validation", () => {
  test("accepts metadata before media bytes", async () => {
    const file = mp4File([box("ftyp", 8), box("moov", 24), box("mdat", 32)]);
    expect(await hasProgressiveMp4Layout(file)).toBe(true);
    await expect(assertProgressiveMp4Layout(file)).resolves.toBeUndefined();
  });

  test("rejects metadata after media bytes", async () => {
    const file = mp4File([box("ftyp", 8), box("mdat", 32), box("moov", 24)]);
    expect(await hasProgressiveMp4Layout(file)).toBe(false);
    await expect(assertProgressiveMp4Layout(file)).rejects.toThrow("fast start");
  });

  test("does not reject non-MP4 or malformed input", async () => {
    const webm = new File(["video"], "clip.webm", { type: "video/webm" });
    const malformedMp4 = new File(["video"], "clip.mp4", { type: "video/mp4" });
    expect(await hasProgressiveMp4Layout(webm)).toBeNull();
    expect(await hasProgressiveMp4Layout(malformedMp4)).toBeNull();
  });
});
