import { describe, expect, test, beforeEach } from "bun:test";
import { renderHook, waitFor } from "@testing-library/react";
import { installDomGlobals } from "@/test/setup-dom";

installDomGlobals();

const { mock } = await import("bun:test") as unknown as {
  mock: {
    module: (specifier: string, factory: () => unknown) => void;
  };
};

const publishCalls: Array<{ api: unknown; inboxId: string | null | undefined }> = [];
const ensureCalls: Array<{ allowRegistration: boolean }> = [];
const registrationHintCalls: string[] = [];
let xmtpRegistrationHint = true;
const fakeApi = {
  profiles: {
    publishXmtpInboxId: async () => ({}),
  },
};
const fakeWallet = {
  address: "0x1111111111111111111111111111111111111111",
  walletClientType: "embedded",
};
const fakeCache = {
  clientInstance: null,
  clientPromise: null,
  clientWalletAddress: null,
  registrationPromise: null,
};

mock.module("@/lib/api", () => ({
  useApi: () => fakeApi,
}));

mock.module("@/components/auth/privy-provider", () => ({
  usePiratePrivyRuntime: () => ({
    busy: false,
    configured: true,
    connect: () => undefined,
    loaded: true,
    privyAuthenticated: true,
    privyReady: true,
    reconnectEthereumWallet: () => undefined,
    walletSyncMounted: true,
  }),
  usePiratePrivyWallets: () => ({
    connectedWallets: [fakeWallet],
    walletsReady: true,
  }),
}));

mock.module("@/lib/chat/chat-xmtp-client", () => ({
  publishChatInboxId: async (api: unknown, inboxId: string | null | undefined) => {
    publishCalls.push({ api, inboxId });
  },
}));

mock.module("@/lib/chat/chat-xmtp-support", () => {
  class XmtpRegistrationRequiredError extends Error {}

  return {
    ensureXmtpClient: async (_session: unknown, options: { allowRegistration: boolean }) => {
      ensureCalls.push({ allowRegistration: options.allowRegistration });
      return {
        client: {
          inboxId: "xmtp-inbox-ready-path",
        },
        module: {},
        walletAddress: fakeWallet.address,
      };
    },
    getSessionWalletAddress: () => fakeWallet.address,
    getSessionWalletAddresses: () => [fakeWallet.address],
    getSharedXmtpClientCache: () => fakeCache,
    getXmtpRegistrationHint: () => xmtpRegistrationHint,
    isLikelyXmtpTabContentionError: () => false,
    resolveXmtpSignerWallet: () => fakeWallet,
    resolveXmtpWalletAddress: () => fakeWallet.address,
    setXmtpRegistrationHint: (walletAddress: string) => {
      registrationHintCalls.push(walletAddress);
    },
    XmtpRegistrationRequiredError,
  };
});

mock.module("@/lib/logger", () => ({
  logger: {
    debug: () => undefined,
    info: () => undefined,
    warn: () => undefined,
  },
}));

const { useXmtpSetup } = await import("./use-xmtp-setup");

const session = {
  user: {
    id: "usr_test",
    primary_wallet_attachment: "wal_test",
  },
  profile: {
    primary_wallet_address: fakeWallet.address,
  },
  walletAttachments: [
    {
      chain_namespace: "eip155:1",
      is_primary: true,
      wallet_address: fakeWallet.address,
    },
  ],
} as never;

describe("useXmtpSetup", () => {
  beforeEach(() => {
    ensureCalls.length = 0;
    publishCalls.length = 0;
    registrationHintCalls.length = 0;
    xmtpRegistrationHint = true;
  });

  test("backfills the published inbox when an existing XMTP client is already registered", async () => {
    const { result } = renderHook(() =>
      useXmtpSetup({
        clientHydrated: true,
        mode: { kind: "list" },
        routeConversationId: null,
        routeTarget: null,
        session,
      }),
    );

    await waitFor(() => {
      expect(result.current.xmtpSetupPhase).toBe("ready");
    });

    expect(publishCalls).toEqual([
      {
        api: fakeApi,
        inboxId: "xmtp-inbox-ready-path",
      },
    ]);
  });

  test("probes and marks ready when the local registration hint is missing but XMTP is already registered", async () => {
    xmtpRegistrationHint = false;

    const { result } = renderHook(() =>
      useXmtpSetup({
        clientHydrated: true,
        mode: { kind: "list" },
        routeConversationId: null,
        routeTarget: null,
        session,
      }),
    );

    await waitFor(() => {
      expect(result.current.xmtpSetupPhase).toBe("ready");
    });

    expect(ensureCalls).toEqual([{ allowRegistration: false }]);
    expect(registrationHintCalls).toEqual([fakeWallet.address]);
    expect(publishCalls).toEqual([
      {
        api: fakeApi,
        inboxId: "xmtp-inbox-ready-path",
      },
    ]);
  });
});
