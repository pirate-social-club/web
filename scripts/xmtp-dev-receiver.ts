import { createHarnessClient, describeDm, dumpDms, getConsentStates, getHarnessEnv, getRequiredAddress, logJson, resolvePeer } from "./_lib/xmtp-dev-harness";

const client = await createHarnessClient("receiver");

const expectedPeerAddress = process.env.XMTP_EXPECT_PEER_ADDRESS?.trim()
  ? getRequiredAddress("XMTP_EXPECT_PEER_ADDRESS")
  : null;

await client.conversations.syncAll(getConsentStates());
await dumpDms(client, "startup");

if (expectedPeerAddress) {
  const peer = await resolvePeer(expectedPeerAddress, getHarnessEnv());
  logJson("peer:expected", {
    address: expectedPeerAddress,
    canMessage: peer.canMessage,
    inboxId: peer.inboxId,
  });

  if (peer.inboxId) {
    const dm = client.conversations.getDmByInboxId(peer.inboxId);
    logJson("peer:expected:dm", {
      address: expectedPeerAddress,
      existsLocally: Boolean(dm),
      inboxId: peer.inboxId,
      summary: dm ? await describeDm(dm) : null,
    });
  }
}

const dmStream = await client.conversations.streamDms({
  onError: (error) => {
    logJson("stream:dms:error", { error: error instanceof Error ? error.message : String(error) });
  },
  onValue: async (dm) => {
    logJson("stream:dms:value", await describeDm(dm));
  },
});

const messageStream = await client.conversations.streamAllMessages({
  consentStates: getConsentStates(),
  onError: (error) => {
    logJson("stream:messages:error", { error: error instanceof Error ? error.message : String(error) });
  },
  onValue: (message) => {
    logJson("stream:messages:value", {
      content: typeof message.content === "string" ? message.content : message.fallback ?? null,
      conversationId: message.conversationId,
      id: message.id,
      senderInboxId: message.senderInboxId,
      sentAt: message.sentAt.toISOString(),
    });
  },
});

const close = async () => {
  await Promise.allSettled([
    dmStream.return?.(),
    messageStream.return?.(),
  ]);
  process.exit(0);
};

process.on("SIGINT", () => void close());
process.on("SIGTERM", () => void close());

logJson("receiver:ready", {
  inboxId: client.inboxId,
  installationId: client.installationId,
});

await new Promise(() => {});
