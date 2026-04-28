import { Client } from "@xmtp/node-sdk";

import { createHarnessClient, describeDm, dumpDms, getConsentStates, getHarnessEnv, getOptionalMessage, getRequiredAddress, logJson, resolvePeer } from "./_lib/xmtp-dev-harness";

const peerAddress = getRequiredAddress("XMTP_PEER_ADDRESS");
const message = getOptionalMessage(process.argv.slice(2));
const client = await createHarnessClient("sender");

await client.conversations.syncAll(getConsentStates());
await dumpDms(client, "before-send");

const peer = await resolvePeer(peerAddress, getHarnessEnv());
logJson("peer:resolved", {
  address: peerAddress,
  canMessage: peer.canMessage,
  inboxId: peer.inboxId,
});

if (!peer.inboxId) {
  throw new Error(`No XMTP inbox found for ${peerAddress} on ${getHarnessEnv()}.`);
}

let dm = client.conversations.getDmByInboxId(peer.inboxId);
if (!dm) {
  logJson("dm:create:start", {
    peerAddress,
    peerInboxId: peer.inboxId,
  });
  dm = await client.conversations.createDm(peer.inboxId);
  logJson("dm:create:success", {
    conversationId: dm.id,
    peerAddress,
    peerInboxId: peer.inboxId,
  });
}

logJson("dm:selected", await describeDm(dm));

if (message) {
  logJson("dm:send:start", {
    contentLength: message.length,
    conversationId: dm.id,
    peerAddress,
    peerInboxId: peer.inboxId,
  });
  await dm.sendText(message);
  await client.conversations.syncAll(getConsentStates());
  const refreshed = client.conversations.getDmByInboxId(peer.inboxId) ?? dm;
  logJson("dm:send:success", {
    contentLength: message.length,
    conversationId: refreshed.id,
    peerAddress,
    peerInboxId: peer.inboxId,
    summary: await describeDm(refreshed),
  });
} else {
  logJson("dm:send:skipped", {
    conversationId: dm.id,
    peerAddress,
    peerInboxId: peer.inboxId,
    reason: "No message provided. Set XMTP_MESSAGE or pass CLI args.",
  });
}

await dumpDms(client, "after-send");
