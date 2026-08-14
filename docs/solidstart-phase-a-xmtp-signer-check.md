# Phase A — XMTP signer and React-boundary check

Status: **Pass for framework portability; no XMTP terminal blocker found**

Date: 2026-08-13

Scope: read-only inventory of where XMTP touches React and how the browser SDK obtains its signer. This checks the migration hypothesis that XMTP is a framework-neutral client plus lifecycle binding and an EVM wallet signer.

## 1. XMTP dependency and import inventory

The browser app declares `@xmtp/browser-sdk: ^7.0.0` and the lockfile resolves `7.0.0` (`package.json:87`; `bun.lock:1229`). The browser SDK is loaded only at runtime from `src/lib/chat/chat-xmtp-support.ts:210-227`:

```ts
modulePromise = import("@xmtp/browser-sdk");
```

There is no `@xmtp/react` package and no XMTP React hook. `@xmtp/node-sdk` is used only by the development harness (`scripts/xmtp-dev-send.ts` and `scripts/_lib/xmtp-dev-harness.ts`), not by the browser application.

The XMTP implementation files under `src/lib/chat/` contain no React import. Their framework-neutral responsibilities are:

- dynamic SDK loading;
- signer construction;
- client creation, registration, caching, reset, and close;
- conversations, streaming, consent states, and message operations;
- local registration hints and error normalization.

The only React-specific binding is `src/app/chat/use-xmtp-setup.ts:3-21,86-142`, which reads Pirate's auth/wallet runtime and owns setup state. `src/app/chat/use-chat-controller.tsx:132-153` consumes that hook and routes the returned client state into the UI.

## 2. Actual signer flow

The signer is selected by address, not by a Privy-specific XMTP API:

1. `resolveXmtpSignerWallet()` compares connected wallet addresses against the session's primary wallet and wallet attachments (`src/lib/chat/chat-xmtp-wallets.ts:10-52`).
2. `useXmtpSetup` memoizes that result and waits for both Privy/wallet hydration and a matching wallet (`src/app/chat/use-xmtp-setup.ts:114-135`).
3. `ensureXmtpClient()` rejects if there is no matching signer, loads the browser SDK, and passes the wallet to `Client.create()` (`src/lib/chat/chat-xmtp-support.ts:342-368,398-442`).
4. `createConnectedWalletSigner()` adapts the generic Pirate wallet contract to XMTP (`src/lib/chat/chat-xmtp-support.ts:231-253`):

```ts
{
  type: "EOA",
  getIdentifier: () => ({
    identifier: walletAddress,
    identifierKind: module.IdentifierKind.Ethereum,
  }),
  signMessage: async (message) => {
    const provider = await wallet.getEthereumProvider();
    const walletClient = createWalletClient({
      account: walletAddress,
      transport: custom(provider),
    });
    return hexToBytes(await walletClient.signMessage({
      account: walletAddress,
      message,
    }));
  },
}
```

The installed XMTP declarations define the same contract: `Signer` requires `type: "EOA"`, `getIdentifier()`, and `signMessage(message): Promise<Uint8Array> | Uint8Array` (`node_modules/@xmtp/browser-sdk/dist/index.d.ts:234-251`). `Client.create(signer, options)` accepts that signer directly (`index.d.ts:2176-2184`). This is an exact type/behavioral match, not an inferred hook equivalence.

The wallet boundary is Pirate-owned and already generic:

```ts
type PirateConnectedEvmWallet = {
  address: `0x${string}`;
  getEthereumProvider: () => Promise<unknown>;
  switchChain: (targetChainId: number | string) => Promise<void>;
  // connector metadata is optional
};
```

(`src/lib/auth/privy-wallet.ts:5-12`.) XMTP only requires the first two fields plus the session address; it does not inspect `walletClientType`, `connectorType`, Privy user objects, or React state.

## 3. React lifecycle responsibilities

React currently owns orchestration, not XMTP protocol behavior:

| React responsibility | Evidence | Solid replacement shape |
| --- | --- | --- |
| Read session and connected wallets | `use-xmtp-setup.ts:114-131` | Solid signal/store subscription to the auth boundary |
| Expose setup phases (`checking`, `needs-enablement`, `enabling`, `ready`, `error`) | `use-xmtp-setup.ts:25,117-129` | Framework-local state machine |
| Trigger explicit registration after user consent | `use-xmtp-setup.ts:221-260`; `ensureXmtpClient(...allowRegistration:true)` | Framework-local action calling the same core function |
| Probe existing client and publish inbox ID | `use-xmtp-setup.ts:272-310`; `chat-xmtp-client.ts:43-47` | Same async service + store update |
| Start/stop message stream | `use-chat-controller.tsx:548-638` | Framework-local effect/cleanup; XMTP stream API is unchanged |
| Render setup errors and reconnect action | `use-chat-controller.tsx:821-872` | Solid component state and event handlers |

The core service already handles wallet changes and logout cleanup by closing and resetting the shared client cache (`chat-xmtp-support.ts:192-208,353-359`).

## 4. XMTP-specific parity risks

No framework blocker was found. The remaining risks are implementation details that should be tested in a later proof of concept:

- **Provider signing semantics:** the current adapter relies on the wallet's EIP-1193 provider and viem's `signMessage`. A Solid/Core Privy adapter must preserve the same `personal_sign` behavior and return bytes in the XMTP-required encoding.
- **Wallet identity selection:** the session address must continue to match a connected wallet before creating or reusing the XMTP client. The current code deliberately rejects unrelated connected wallets (`chat-xmtp-wallets.ts:43-52`).
- **Client cache lifecycle:** only one client is shared per wallet/environment, and it must be closed on wallet changes or logout. This is independent of React but must remain owned by a service/store boundary.
- **Registration behavior:** `disableAutoRegister: true` is intentional (`chat-xmtp-support.ts:256-262`); the UI-controlled `allowRegistration` path must not be changed during a framework port.
- **Browser storage/worker behavior:** XMTP uses its browser SDK storage and WASM/worker internals. This is a browser-runtime concern, not a React dependency, but it should be included in the same production PoC as any SolidStart deployment.

## 5. Result

The XMTP hypothesis is confirmed:

> XMTP is a framework-neutral browser client. Pirate's React coupling is limited to setup state, auth/wallet subscriptions, registration UI, and stream cleanup. The signer is a small adapter over `getEthereumProvider()` and viem, and its shape exactly matches `@xmtp/browser-sdk`'s public `Signer` type.

XMTP therefore does **not** terminate the SolidStart investigation. If the Privy migration gate reopens, the XMTP work is a bounded port of the lifecycle hook/store and a signer integration test—not an XMTP rewrite.

## Sources

- Installed browser SDK declarations: `node_modules/@xmtp/browser-sdk/dist/index.d.ts`
- `src/lib/chat/chat-xmtp-support.ts`
- `src/lib/chat/chat-xmtp-wallets.ts`
- `src/app/chat/use-xmtp-setup.ts`
- `src/app/chat/use-chat-controller.tsx`
