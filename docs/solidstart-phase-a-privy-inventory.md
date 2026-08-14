# Phase A — Privy usage inventory and Core JS parity

Status: **Core JS parity passes for a fresh embedded wallet; legacy test-wallet compatibility is excluded**

Date: 2026-08-13

Scope: read-only inventory of Pirate Web's actual `@privy-io/react-auth` usage, compared with the installed `@privy-io/js-sdk-core` package and current Privy documentation. This is not a migration implementation and no dependency or application code was changed.

## Decision rule

The relevant question is not whether Core JS has a similarly named feature. It is whether the exact flow Pirate Web calls can be reproduced without changing custody, signing, relay authorization, or user-visible behavior.

- **Supported** means a public Core JS API and current docs cover the call directly or through a bounded adapter.
- **Supported, adapter required** means the primitive exists, but Pirate must own UI/lifecycle/orchestration that React Auth currently supplies.
- **Unknown** means the installed public surface is insufficient to prove parity; Privy/provider confirmation or a focused spike is required.
- **Unsupported** means no corresponding public Core JS API was found for the exact flow. For a
  custody flow, an absent client API is still classified as **unknown for end-to-end parity** if a
  server-side, automatic-session, or provider-operated replacement has not been ruled out.

The installed package is `@privy-io/js-sdk-core@0.68.0`, brought in transitively by `@privy-io/react-auth@3.33.1` (`bun.lock:667,671`). Core's own README calls it a low-level library “not intended for general consumption” and asks integrators to contact Privy before building on it (`node_modules/@privy-io/js-sdk-core/README.md:3-5`). The current npm release was independently checked at `0.69.1`; the latest package's declarations and ESM bundle were also searched for migration support.

## 1. Complete import inventory

`rg` found six source/test files and one dependency declaration containing `@privy-io/react-auth`:

| File | Actual import/use |
| --- | --- |
| `src/components/auth/privy-auth-bridge.tsx:4-9` | `useModalStatus`, `usePrivy`, `useAuthorizationSignature`, `useCreateWallet`, `useMigrateWallets` |
| `src/components/auth/privy-provider.tsx:316-320` | Dynamic import of `PrivyProvider` |
| `src/components/auth/privy-wallet-bridge.tsx:4` | `useWallets` |
| `src/app/authenticated-routes/wallet-settings-route.tsx:19,544` | `useCreateWallet` |
| `src/components/auth/privy-auth-bridge.test.tsx:70-88` | Test doubles for all bridge hooks and `usePrivy` methods |
| `src/app/authenticated-routes/wallet-settings-route.test.tsx:123-125` | Test double for `useCreateWallet` |
| `package.json:67` | `@privy-io/react-auth: ^3.33.1` |

There are no other production imports of the React SDK. `useIdentityToken` appears only in the local SSR compatibility shim (`src/lib/auth/privy-react-auth.ssr.tsx:75-79`), not in a production call site.

## 2. Call-site inventory

### Authentication and session bridge

`PrivyAuthBridge` destructures these values (`src/components/auth/privy-auth-bridge.tsx:159-163`):

| React Auth call | How Pirate Web uses it | Evidence |
| --- | --- | --- |
| `ready`, `authenticated`, `user` | Gates bootstrap, session exchange, refresh, and UI state | `privy-auth-bridge.tsx:160`, `389-467` |
| `login({loginMethods})` / `login()` | Opens the login UI. The allowed list is origin-scoped: wallet, email, Google, Twitter, plus passkey on Pirate/localhost origins | `privy-auth-bridge.tsx:179-186`; `src/lib/auth/privy-login-methods.ts:1-25` |
| `connectWallet({walletChainType:"ethereum-only"})` | Opens the external EVM wallet connect UI and publishes a callback through Pirate's auth runtime | `privy-auth-bridge.tsx:173-175,235-248` |
| `linkWallet({walletChainType:"ethereum-only"})` | Opens the external EVM wallet link UI for an authenticated user | `privy-auth-bridge.tsx:176-178` |
| `getAccessToken()` | Exchanges the Privy token for a Pirate session and refreshes it | `privy-auth-bridge.tsx:304-319,351` |
| `logout()` | Registered as the session-store clear callback | `privy-auth-bridge.tsx:373-387` |
| `isOpen` from `useModalStatus()` | Only detects a previously-open modal closing while unauthenticated, to call `onModalClosed` | `privy-auth-bridge.tsx:159,425-448` |

The tests confirm this is the complete bridge contract, rather than unused destructuring: `privy-auth-bridge.test.tsx:70-88` mocks exactly these values and methods.

### Sponsored relay and authorization signatures

Pirate sends sponsored transaction intents through its relay. Before sending, it resolves the Privy wallet ID from the authenticated user's linked accounts, builds a canonical Privy Wallet API request, and calls `generateAuthorizationSignature` (`privy-auth-bridge.tsx:107-141,187-214`). The signed request contains:

- `POST /v1/wallets/{walletId}/rpc`;
- CAIP-2 chain, `eth_sendTransaction`, transaction data/to/value;
- `sponsor: true` and deterministic `reference_id`;
- `privy-app-id`, idempotency, and a 30-minute request expiry.

If the relay returns `wallet_needs_migration`, the bridge calls `migrate()` and retries the exact request (`privy-auth-bridge.tsx:217-227`). This is custody-critical: it is not a cosmetic wallet migration.

### Embedded wallet provisioning

The provider config asks React Auth to auto-create an EVM embedded wallet for users without one at login and hides Privy's wallet UI (`privy-provider.tsx:224-249`). A separate bounded retry provisioner covers already-authenticated wallet-less users (`embedded-wallet-provisioner.tsx:11-25,56-98`). The bridge and wallet settings route both call `createWallet()` (`privy-auth-bridge.tsx:358-371`; `wallet-settings-route.tsx:544-562`).

### Connected wallet surface

`PrivyWalletBridge` reads `useWallets()` and emits normalized EVM wallets (`privy-wallet-bridge.tsx:27-76`). Pirate requires each wallet to provide:

```ts
{
  address,
  getEthereumProvider(),
  switchChain(chainId),
  id?, connectorType?, walletClientType?
}
```

That contract is enforced in `src/lib/auth/privy-wallet.ts:5-55`. Downstream commerce, XMTP, identity, bookings, royalties, domains, and community flows consume the normalized list; they do not call React Auth directly.

### Provider configuration

Pirate currently supplies:

- Base, Ethereum, Optimism, and Story chains (`privy-provider.tsx:213-220`);
- ordered wallet choices: detected injected wallets, MetaMask, Coinbase Wallet, WalletConnect (`privy-provider.tsx:224-232`);
- `embeddedWallets.ethereum.createOnLogin = "users-without-wallets"` and `showWalletUIs: false` (`privy-provider.tsx:237-248`).

## 3. Core JS parity matrix

| Pirate flow | Core JS evidence (installed 0.68.0; latest spot-check 0.69.1 where noted) | Status | Migration implication |
| --- | --- | --- | --- |
| Client/provider bootstrap | `new Privy({storage, appId, clientId, supportedChains})`, `initialize()`, `setMessagePoster()`, `embeddedWallet.getURL()`, `embeddedWallet.onMessage()` (`index.d.mts:1948-2045,1071-1088`). Official Core JS recipe documents manual iframe mounting and message wiring. | **Supported, adapter required** | Replace `PrivyProvider` with one singleton client plus an app-owned context/store and secure-iframe lifecycle. |
| `ready`, auth state, `user` | `initialize()` followed by `user.get()` (`index.d.mts:1106-1127,2037-2045`); official recipe uses this as the session source of truth. | **Supported, adapter required** | App owns reactive state and readiness notifications. |
| Access token | `privy.getAccessToken()` (`index.d.mts:2042-2045`); official recipe documents backend token retrieval. | **Supported** | Direct replacement behind an auth service. |
| Logout | `privy.auth.logout({userId})` (`index.d.mts:1674-1725`); official recipe also removes the iframe/listener. | **Supported, adapter required** | App must perform iframe/listener cleanup and update its own store. |
| Email login | `auth.email.sendCode()` + `loginWithCode()` (`index.d.mts:1159-1176`); official recipe documents it. | **Supported, adapter required** | Pirate owns OTP UI and state. |
| Google/Twitter OAuth login | `auth.oauth.generateURL()` + `loginWithCode()` (`index.d.mts:1282-1301`). | **Supported, adapter required** | Pirate owns redirect/callback UI and error state; verify provider IDs/config in a spike. |
| Passkey login | `auth.passkey.generateAuthenticationOptions()` + `loginWithPasskey()` (`index.d.mts:1323-1347`). | **Supported, adapter required** | Pirate owns WebAuthn browser ceremony and challenge state. |
| Wallet login | `auth.siwe.init()` + `loginWithSiwe()` (`index.d.mts:1481-1552`). | **Supported, adapter required** | Core has the SIWE protocol, not the connector discovery/modal used by React Auth. |
| `connectWallet({ethereum-only})` | No `connectWallet` method or modal/connector manager is exposed by the Core `Privy` class. Core has `siwe.init()` and `ExternalWallet` types; the React SDK separately provides EIP-6963/WalletConnect discovery and modal UI. | **Supported only with a replacement connector/UI stack** | This is not a drop-in port. Pirate must own injected-wallet discovery, WalletConnect, chain switching, disconnects, and the normalized wallet list. |
| `linkWallet({ethereum-only})` | `auth.siwe.init()` + `linkWithSiwe()` (`index.d.mts:1496-1515`); no Core modal. | **Supported only with a replacement connector/UI stack** | Headless linking is possible, but the current Privy wallet picker behavior is not supplied. |
| `useWallets()` / `ready` | Core can read linked user accounts and create an embedded provider (`getUserEmbeddedEthereumWallet`, `getEntropyDetailsFromUser`, `embeddedWallet.getEthereumProvider`); no Core `useWallets` collection or readiness API. Official docs describe the React hook as combining EIP-6963/WalletConnect external discovery with iframe-backed embedded discovery. | **Unknown for full parity; embedded subset supported** | Embedded wallet can be adapted. Full external + embedded list requires an owned connector/discovery implementation and a readiness contract matching Pirate's `walletsReady`. |
| Embedded wallet auto-create | Core `LoginOptions` includes `embedded.ethereum.createOnLogin` (`index.d.mts:1130-1139`); `embeddedWallet.create()` is public (`index.d.mts:967-992`). Official recipe documents manual create and provider recovery. | **Supported, adapter required** | Pass the option on each headless login and retain the existing bounded provisioner. |
| Embedded provider / EIP-1193 methods | `getEthereumProvider()` (`index.d.mts:1020-1041`) returns an embedded provider; official recipe documents `personal_sign` and `eth_sendTransaction`. | **Supported** | Adapter must expose Pirate's `getEthereumProvider()` and `switchChain()` wallet contract. |
| Authorization signature for sponsored relay | Core exports `generateAuthorizationSignature(sign, payload)` (`index.d.mts:2870-2899`) and `embeddedWallet.signWithUserSigner({message})` (`index.d.mts:922-936`). The payload type exactly covers Pirate's version/method/url/body/Privy headers. | **Supported, high implementation risk** | React's hook hides the signer callback and canonicalization. A Core adapter must prove that `signWithUserSigner` is the correct authorization-key signer for this app/environment, then test byte-for-byte relay compatibility. |
| `useMigrateWallets().migrate()` | React Auth documents this as on-device → TEE migration (`react-auth/dist/dts/index.d.mts:4158-4167`). Core 0.68.0 public declarations contain no `migrate`/`migration` API or migration event. The latest npm package, 0.69.1, was independently checked: its full declarations and ESM bundle likewise contain no migration API; the bundle's migration references are error strings that direct callers to the TEE migration guide from raw signing, session-signer, and delegated-action paths when the wallet/execution environment is incompatible. | **Unknown for end-to-end migration; direct Core API absent** | This is a blocker only if legacy wallets remain in the supported product contract. Under the selected clean-slate test scope, legacy migration is explicitly dropped. Do not infer equivalence from `delegateWallets`, recovery, or a provider call. |
| Modal close detection | Core has no modal, so no `isOpen` equivalent. Pirate only uses this to detect an abandoned login modal (`privy-auth-bridge.tsx:425-448`). | **Supported by app state** | Replace with local login-flow state; no Privy parity blocker. |
| SSR shim | Existing shim is an app-owned no-op boundary (`privy-react-auth.ssr.tsx:1-89`). | **Framework-neutral** | Solid would keep an app auth boundary, but the Core client must never initialize during SSR. |

## 4. Hard-gate assessment

The direct Core JS surface is broad enough for ordinary auth, embedded wallet creation/provider access, access tokens, logout, SIWE linking, and authorization-signature construction. The two important caveats are:

1. External wallet connection is not a Core replacement for the React SDK's connector discovery and modal. It is feasible only if Pirate takes ownership of that UI/connector lifecycle.
2. The sponsored relay's migration retry calls `useMigrateWallets().migrate()`. Neither Core 0.68.0 nor the latest checked 0.69.1 has a public migration method. Core 0.69.1 also emits migration-guide errors from raw signing, session-signer, and delegated-action paths rather than performing the upgrade. The lower-level APIs are not evidence of parity with the on-device → TEE migration protocol.

Because migration is a custody-critical recovery path, a product that must preserve legacy wallets still has a hard blocker:

> **Do not port legacy-wallet support to Core JS without a Privy-supported migration recipe/API for the exact app execution environment.**

The workspace owner has explicitly classified the existing Privy accounts as disposable test fixtures,
mostly inactive and outside the supported production-user migration contract. This is a product-scope
decision, not evidence that Core JS implements migration parity.

Under that scope, Pirate may declare legacy on-device wallets unsupported, create only fresh TEE wallets, remove the legacy migration-retry requirement from the new product path, and prove sponsored relay authorization with a fresh wallet. The old test fixtures can remain disposable or be reset; they do not justify preserving a migration protocol in Solid.

This is not a claim that Privy can never support a Solid/Core integration. It is a pre-registered kill-check result: direct client API parity is absent, and guessing at the migration protocol would transfer security ownership to Pirate.

## 5. Required provider questions before reopening

Ask Privy for an explicit, versioned answer to each item below. “The underlying API exists” is not sufficient.

1. Is on-device → TEE embedded-wallet migration available outside `@privy-io/react-auth`—through a Core JS client API, server REST endpoint, or automatic migration on the next authenticated session—and if not, is such a path planned?
2. What exact versioned API or documented sequence replaces `useMigrateWallets().migrate()`? Include required iframe events, recovery material, wallet IDs, and post-migration user refresh behavior.
3. Does `embeddedWallet.signWithUserSigner()` produce the authorization-key signature expected by `generateAuthorizationSignature()` for Wallet API sponsored relay requests in this app's execution environment?
4. Is the Core JS external-wallet connector/discovery layer (EIP-6963, WalletConnect, chain switching, disconnect) supported as a production integration, or must Pirate use a separate connector library?
5. Which Core login options preserve `createOnLogin: "users-without-wallets"` for each of Pirate's email, Google, Twitter, wallet, and passkey flows?

Questions 1–2 are deferred unless legacy-wallet support is brought back into scope. For the selected
clean-slate path, the direct Core-to-Privy fresh-wallet authorization proof passes and the React-vs-Core
relay differential classifies the wrapper's 500 as a framework-neutral API defect. The matrix remains
the implementation contract for the Core adapter and Solid-owned UI.

## 6. Reopening conditions and clean-slate scope

The blocker can decay without a framework decision. `migrate()` exists to upgrade legacy on-device
wallets; wallets created after the app's TEE cutover should not need that path.

The selected path can proceed when both of these are understood:

1. **Provider path:** Privy confirms that the selected new-app configuration creates TEE-native
   wallets, and the fresh-wallet Core-to-Privy authorization path is verified.
2. **Scope:** Legacy test fixtures are explicitly excluded from the supported product contract; no
   production-user migration promise is made.

No migration sweep, balance analysis, or user-population estimate is required for the selected product
scope. Create fresh TEE wallets in a clean environment and explicitly drop legacy-wallet compatibility.
The clean-slate option required a fresh-wallet mode check and completion of the React-vs-Core wrapper
differential; both are now complete. The remaining item is the API fix for the wrapper's 500.

The clean-room proof now confirms fresh embedded-wallet creation, Core provider access, Pirate session
exchange, Core authorization-signature generation, and direct Privy Wallet API acceptance. The Pirate
relay wrapper still returns a retryable HTTP 500 and is recorded separately in
[the relay proof](solidstart-phase-a-privy-relay-proof.md). The completed React-vs-Core differential
shows that this is an API-side/framework-neutral relay defect, not React-only Privy functionality.

## 7. What Privy looks like in SolidJS

The clean-slate Solid integration is **custody-equivalent, not UI-equivalent**:

| Concern | React Auth today | Solid/Core target |
| --- | --- | --- |
| Embedded-wallet custody | Privy-managed embedded EVM wallet, surfaced through `useWallets()` | The same Privy embedded EVM wallet and EIP-1193 provider, surfaced through `getUserEmbeddedEthereumWallet()` and `getEthereumProvider()` |
| Auth/session | `PrivyProvider`, `usePrivy`, and React state | One browser-only `Privy` singleton, `initialize()`, `user.get()`, and a Solid signal/store |
| Secure wallet context | React Auth owns the hidden Privy iframe and message lifecycle | Pirate mounts the same secure Privy iframe, wires `setMessagePoster()`/`onMessage()`, and cleans it up on logout |
| Login UI | Privy's React modal and appearance configuration | Pirate-owned Solid modal/forms for OTP, OAuth callback, SIWE, and errors |
| External wallets | Privy's discovery/modal stack | A separate connector/discovery layer, or an explicit embedded-only product scope |
| Sponsored relay | React hook wraps canonical signing | Core signing adapter, verified byte-for-byte against the relay using a fresh TEE wallet |

Privy's official Core JS recipe explicitly describes the library as framework-independent, requires a
single client instance, and documents manual iframe mounting/message passing, auth, access tokens,
embedded-wallet creation, provider access, and logout cleanup. The iframe and Privy custody remain;
the React component tree and Privy modal do not. See [Privy's vanilla JavaScript SDK recipe](https://docs.privy.io/recipes/core-js).

This is why the modal can plausibly become faster: a Solid-owned modal can render immediately, avoid
the React Auth UI/connector bundle, lazy-load external-wallet connectors, and prewarm the hidden
Privy iframe once per app session. It is not a guaranteed removal of all latency. Iframe startup,
TEE/network operations, OAuth redirects, and wallet-provider responses remain. The first PoC should
measure modal-open time separately from iframe-ready time and from post-login wallet readiness.

For this product scope, do not attempt to preserve the legacy migration retry. After confirming the
Privy app is TEE-enabled, authenticate a fresh test account, create or auto-create its embedded EVM
wallet, obtain its provider, and run the sponsored-relay authorization test through both the Core
control and the existing React wrapper control. The embedded-wallet custody model is suitable for
Solid; the UI is intentionally a replacement. The API relay defect remains an M2 shipping item,
not a framework-selection blocker.

## Sources

- [Privy: Using the vanilla JavaScript SDK](https://docs.privy.io/recipes/core-js)
- [Privy: Migrating wallets from on-device to TEEs](https://docs.privy.io/recipes/tee-wallet-migration-guide)
- [Privy: Authorization signatures](https://docs.privy.io/api-reference/authorization-signatures)
- [Privy: Get user connected wallets](https://docs.privy.io/wallets/wallets/get-a-wallet/get-connected-wallet)
- Installed package declarations: `node_modules/@privy-io/js-sdk-core/dist/dts/index.d.mts` and `node_modules/@privy-io/react-auth/dist/dts/index.d.mts`
