import { describe, expect, test } from "bun:test";

import {
  resolveXmtpMessageStream,
  type XmtpMessageStream,
} from "./chat-xmtp-support";

describe("resolveXmtpMessageStream", () => {
  test("closes a stream that resolves after cancellation", async () => {
    let resolveStream!: (stream: XmtpMessageStream) => void;
    const streamPromise = new Promise<XmtpMessageStream>((resolve) => {
      resolveStream = resolve;
    });
    let retainedStream: XmtpMessageStream | null = null;
    let closeCalls = 0;
    const resolution = resolveXmtpMessageStream(
      streamPromise,
      () => true,
      (stream) => { retainedStream = stream; },
    );

    resolveStream({ return: () => { closeCalls += 1; } });
    await resolution;

    expect(closeCalls).toBe(1);
    expect(retainedStream).toBeNull();
  });

  test("retains a stream while active", async () => {
    const stream: XmtpMessageStream = { return: () => undefined };
    let retainedStream: XmtpMessageStream | null = null;
    await resolveXmtpMessageStream(
      Promise.resolve(stream),
      () => false,
      (nextStream) => { retainedStream = nextStream; },
    );
    expect(retainedStream).toBe(stream);
  });
});
