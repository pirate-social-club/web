# Nationality-Gated Community: pirate-web Implementation Handoff

Backend surface is complete and tested. This document covers every file change needed in pirate-web.

These are **replacement** instructions. Unless explicitly noted as additive, every section replaces the current stale implementation in the named file. Do not layer new code on top of old models — remove the old model first.

---

## Backend Surface Available Now

| Endpoint | Method | Purpose |
|---|---|---|
| `/communities` | POST | Create community (sends `gate_rules`) |
| `/communities/:id/preview` | GET | Authenticated preview with gate summaries and viewer membership status |
| `/communities/:id/join-eligibility` | GET | Eligibility check for current user |
| `/communities/:id/join` | POST | Attempt to join or request to join |
| `/verification-sessions` | POST | Start self/very verification |
| `/verification-sessions/:id/complete` | POST | Complete verification |

**Important**: `/communities/:id/preview` and `/communities/:id/join-eligibility` are authenticated endpoints that require a valid Bearer token for a signed-in user. They are not anonymous-public. The preview endpoint exists specifically so signed-in non-owners can view a community without needing the owner-only `GET /communities/:id`.

### Key Eligibility Statuses

| `status` | `joinable_now` | UI CTA | Join mutation result |
|---|---|---|---|
| `joinable` | `true` | "Join" | `joined` |
| `requestable` | `false` | "Request to Join" | `requested` |
| `verification_required` | `false` | "Verify to Join" | N/A (launch verification first) |
| `gate_failed` | `false` | Blocked message | N/A |
| `already_joined` | `false` | "Joined" (disabled) | N/A |
| `banned` | `false` | Unavailable | N/A |

### Gate Failure Reasons (in `details.failure_reason` on 403)

| `failure_reason` | UI |
|---|---|
| `missing_verification` | Verification CTA |
| `nationality_mismatch` | Blocked — no retry |
| `banned` | Unavailable |
| `unsupported` | Generic blocked |

---

## File-by-File Changes

### 1. `src/lib/community-membership.ts`

**Delete the entire file content and replace with:**

```ts
export type CommunityMembershipMode = "open" | "request" | "gated";
```

The previous 3-line version only had `"open" | "gated"`. Adding `"request"` is not additive — it changes the semantic meaning of `"gated"` which previously covered both cases.

---

### 2. `src/lib/api/client.ts`

This file needs three separate modifications: new imports, new methods, and `ApiError` upgrade.

**2a. Add imports** — merge these into the existing `import type { ... } from "@pirate/api-contracts"` block:

```ts
import type {
  CommunityPreview,
  GateFailureDetails,
  JoinEligibility,
  // ...keep all existing imports...
} from "@pirate/api-contracts";
```

**2b. Upgrade `ApiError`** — replace the entire class:

Current:
```ts
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryable: boolean;

  constructor(code: string, message: string, status: number, retryable = false) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}
```

Replace with:
```ts
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryable: boolean;
  readonly details: Record<string, unknown> | null;

  constructor(
    code: string,
    message: string,
    status: number,
    retryable = false,
    details: Record<string, unknown> | null = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
    this.details = details;
  }
}
```

Also in the `request<T>` error-parsing block, capture the `details` field from the error response body. Replace the current throw:

```ts
throw new ApiError(code, message, res.status, retryable);
```

With:
```ts
const details = (body as Record<string, unknown> | null)?.details &&
  typeof (body as Record<string, unknown>).details === "object"
  ? (body as Record<string, unknown>).details as Record<string, unknown>
  : null;
throw new ApiError(code, message, res.status, retryable, details);
```

**2c. Add `preview` and `getJoinEligibility` methods** to the `communities` object. Insert after the existing `join` method:

```ts
preview: (communityId: string): Promise<CommunityPreview> => {
  return this.request<CommunityPreview>(
    `/communities/${encodeURIComponent(communityId)}/preview`,
  );
},

getJoinEligibility: (communityId: string): Promise<JoinEligibility> => {
  return this.request<JoinEligibility>(
    `/communities/${encodeURIComponent(communityId)}/join-eligibility`,
  );
},
```

**2d. Fix `create` method type** — replace the entire `create` method. The current signature uses `Omit<CreateCommunityRequest, "namespace">` with a manual re-add that includes `gate_rules?: unknown[] | null`. This masks the real contract type. The contract `CreateCommunityRequest` (= `CreateCentralizedCommunityRequest`) already has the correct `namespace`, `gate_rules`, `description`, `membership_mode`, etc. fields with proper types. Replace the entire method with:

```ts
create: (
  body: CreateCommunityRequest,
): Promise<CommunityCreateAcceptedResponse> => {
  return this.request<CommunityCreateAcceptedResponse>("/communities", {
    method: "POST",
    body: JSON.stringify(body),
  });
},
```

The `CreateCommunityRequest` contract type already includes:
- `namespace?: { namespace_verification_id: string } | null` — optional, matches backend validation
- `gate_rules?: Array<{ scope, gate_family, gate_type, proof_requirements?, chain_namespace?, gate_config? }> | null` — properly typed, not `unknown[]`
- `display_name: string` — required
- All optional fields with correct types

No manual type overrides needed. Import `CreateCommunityRequest` from `@pirate/api-contracts` if not already imported.

**2e. Fix `completeSession` input type** — the current client omits the `proof` field that the backend accepts. The `CompleteVerificationSessionRequest` contract type has `proof`, `attestation_id`, `proof_hash`, and `provider_payload_ref`. Update the input to match:

```ts
completeSession: (
  verificationSessionId: string,
  input?: {
    attestation_id?: string | null;
    proof?: string | null;
    proof_hash?: string | null;
    provider_payload_ref?: string | null;
  },
): Promise<VerificationSession> => {
  return this.request<VerificationSession>(
    `/verification-sessions/${encodeURIComponent(verificationSessionId)}/complete`,
    {
      method: "POST",
      body: JSON.stringify(input ?? {}),
    },
  );
},
```

---

### 3. `src/components/compositions/create-community-composer/create-community-composer.types.ts`

**This is a structural rewrite, not a small patch.** The current file defines a chip-based `GateType`/`GateFamily` model where the composer tracks a `Set<GateType>`. That model cannot carry the structured data (country code, provider) that the backend requires. Replace it entirely.

**Delete** `GateFamily` and `GateType` type exports.

**Delete** the `onCreate` callback shape that takes `gateTypes: Set<GateType>`.

**Add**:

```ts
export type NationalityGateDraft = {
  gateType: "nationality";
  provider: "self";
  requiredValue: string;
};
```

**Replace** the `onCreate` callback in `CreateCommunityComposerProps`:

Old:
```ts
onCreate?: (input: {
  displayName: string;
  description: string | null;
  membershipMode: CommunityMembershipMode;
  defaultAgeGatePolicy: CommunityDefaultAgeGatePolicy;
  allowAnonymousIdentity: boolean;
  anonymousIdentityScope: AnonymousIdentityScope;
  gateTypes: Set<GateType>;
  namespaceVerificationId: string | null;
}) => Promise<{
  communityId: string;
}>;
```

New:
```ts
onCreate?: (input: {
  displayName: string;
  description: string | null;
  membershipMode: CommunityMembershipMode;
  defaultAgeGatePolicy: CommunityDefaultAgeGatePolicy;
  allowAnonymousIdentity: boolean;
  anonymousIdentityScope: AnonymousIdentityScope;
  gateDrafts: NationalityGateDraft[];
  namespaceVerificationId: string | null;
}) => Promise<{
  communityId: string;
}>;
```

---

### 4. `src/components/compositions/create-community-composer/create-community-composer.tsx`

**This is a structural rewrite of the access step.** The current implementation uses chip-based `Set<GateType>` state (`activeGateTypes`), the `toggleGateType` callback, and the `identityGateTypes`/`gateTypeMeta` lookup arrays. All of these must be removed and replaced with a structured gate draft model. Do not try to shoehorn `NationalityGateDraft` into the chip system.

**Remove entirely:**
- `activeGateTypes` state (`Set<GateType>`)
- `toggleGateType` callback
- `identityGateTypes` array
- `gateTypeMeta` record
- The chip-based `GateType` rendering block (the `<div className="flex flex-wrap gap-2">` with `identityGateTypes.map`)
- The `gateTypes.size` count in `canProceed` and `canCreateCommunity`

**Add:**
- `activeGateDrafts` state: `NationalityGateDraft[]` (initially `[]`)
- `nationalityRequiredValue` state: `string` (initially `""`)
- A boolean `nationalityGateEnabled` derived from whether `activeGateDrafts` contains a nationality draft

**When membership mode is "gated"**, replace the chip list with:

1. A single "Nationality verification" option card that toggles the nationality draft on/off
2. When nationality is enabled, a country code input:
   ```tsx
   <Input
     placeholder="US"
     maxLength={2}
     value={nationalityRequiredValue}
     onChange={(e) => setNationalityRequiredValue(e.target.value.toUpperCase())}
   />
   ```
3. Validation: country code must match `/^[A-Z]{2}$/` before step 2 "Next" is enabled, and before step 3 "Create Community" is enabled

**When the nationality option is toggled on:** push a `NationalityGateDraft` into `activeGateDrafts` with the current `nationalityRequiredValue`.
**When toggled off:** remove it.
**When the country code input changes:** update the draft in-place.

**Update `canProceed` for step 2**: when gated, require `activeGateDrafts.length > 0` AND every draft's `requiredValue` passes the 2-letter validation.

**Update `canCreateCommunity`**: same gate-draft validation as step 2.

**Update review step (step 3)**: show "Required nationality: {country name} ({code})" using the `formatGateRequirement` helper from `src/lib/nationality-gate.ts`. Do not render raw ISO codes directly — always go through the utility.

**Update `handleCreate`**: pass `gateDrafts: activeGateDrafts` instead of `gateTypes: activeGateTypes`.

---

### 5. `src/app/pages.tsx` — `CreateCommunityPage.handleCreate`

**Replace the entire `handleCreate` callback.** The current version sends no `gate_rules` and uses `gateTypes: Set<GateType>`. It must be replaced to serialize real nationality gate rules from the new `gateDrafts` input. The `api.communities.create()` body type is now `CreateCommunityRequest` directly (see section 2d).

```ts
const handleCreate = React.useCallback(async (input: {
  displayName: string;
  description: string | null;
  membershipMode: "open" | "request" | "gated";
  defaultAgeGatePolicy: "none" | "18_plus";
  allowAnonymousIdentity: boolean;
  anonymousIdentityScope: "community_stable" | "thread_stable" | "post_ephemeral";
  gateDrafts: NationalityGateDraft[];
  namespaceVerificationId: string | null;
}) => {
  try {
    const gateRules = input.gateDrafts.map((draft) => ({
      scope: "membership" as const,
      gate_family: "identity_proof" as const,
      gate_type: "nationality" as const,
      proof_requirements: [
        {
          proof_type: "nationality",
          accepted_providers: ["self"],
          config: { required_value: draft.requiredValue },
        },
      ],
    }));

    const result = await api.communities.create({
      display_name: input.displayName,
      description: input.description,
      membership_mode: input.membershipMode,
      default_age_gate_policy: input.defaultAgeGatePolicy,
      allow_anonymous_identity: input.allowAnonymousIdentity,
      anonymous_identity_scope: input.anonymousIdentityScope,
      handle_policy: { policy_template: "standard" },
      governance_mode: "centralized",
      gate_rules: gateRules.length > 0 ? gateRules : undefined,
      namespace: input.namespaceVerificationId
        ? { namespace_verification_id: input.namespaceVerificationId }
        : null,
    });

    navigate(`/c/${result.community.community_id}`);
    return { communityId: result.community.community_id };
  } catch (e: unknown) {
    const apiError = e as ApiError;
    throw new Error(apiError?.message ?? "Community creation failed");
  }
}, [api]);
```

---

### 6. `src/app/pages.tsx` — `CommunityPage` (viewer-facing)

**Replace `useCommunity` with `useCommunityPreview`.** The current `useCommunity` hook loads the owner-only `GET /communities/:id` endpoint. Non-owners need the preview and eligibility endpoints. Replace it entirely:

```ts
function useCommunityPreview(communityId: string) {
  const api = useApi();
  const [preview, setPreview] = React.useState<CommunityPreview | null>(null);
  const [eligibility, setEligibility] = React.useState<JoinEligibility | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void Promise.all([
      api.communities.preview(communityId),
      api.communities.getJoinEligibility(communityId),
    ])
      .then(([p, e]) => {
        if (cancelled) return;
        setPreview(p);
        setEligibility(e);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load community");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [api, communityId]);

  const refetchEligibility = React.useCallback(async () => {
    const e = await api.communities.getJoinEligibility(communityId);
    setEligibility(e);
    return e;
  }, [api, communityId]);

  return { preview, eligibility, error, loading, refetchEligibility };
}
```

**Render gate requirement info** — use the `formatGateRequirement` helper from `src/lib/nationality-gate.ts`. Do not render raw ISO codes directly:

```tsx
{preview.membership_gate_summaries.map((gate, i) => (
  <div key={i}>{formatGateRequirement(gate)}</div>
))}
```

**Render join CTA from eligibility** using the helpers from `src/lib/nationality-gate.ts`:

```tsx
function JoinCta({
  eligibility,
  onJoin,
}: {
  eligibility: JoinEligibility;
  onJoin: () => void;
}) {
  const label = getJoinCtaLabel(eligibility);
  const actionable = isJoinCtaActionable(eligibility);
  return (
    <Button disabled={!actionable} onClick={actionable ? onJoin : undefined}>
      {label}
    </Button>
  );
}
```

---

### 7. `src/app/pages.tsx` — `CommunityPage` join flow

**Replace the join handler entirely.** The handler must branch on the join mutation result (`joined` vs `requested`) and handle gate failures with structured error parsing:

```ts
const handleJoin = React.useCallback(async () => {
  try {
    const result = await api.communities.join(communityId);

    if (result.status === "joined") {
      const updated = await refetchEligibility();
      // UI now shows "Joined" because updated.status === "already_joined"
    } else if (result.status === "requested") {
      const updated = await refetchEligibility();
      // UI now shows "Requested" — the user is not a member yet
      // The eligibility endpoint does not currently return a "requested" status,
      // so the page should track this locally or show a pending state
    }
  } catch (e: unknown) {
    const apiError = e as ApiError;
    if (apiError?.code === "gate_failed" && apiError.details) {
      const details = apiError.details as GateFailureDetails;
      switch (details.failure_reason) {
        case "missing_verification":
          // Launch self verification (see section 8)
          break;
        case "nationality_mismatch":
          // Show blocked message — the user's verified nationality does not match.
          // No retry CTA; this is a hard block.
          break;
        case "banned":
          // Show unavailable state
          break;
        default:
          toast.error(apiError.message);
      }
    } else {
      toast.error(apiError?.message ?? "Join failed");
    }
  }
}, [api, communityId, refetchEligibility]);
```

**Critical: `joinable` vs `requestable` join results are different.**

When eligibility returns:
- `status: "joinable"` → the join mutation returns `status: "joined"` — user is now a member
- `status: "requestable"` → the join mutation returns `status: "requested"` — user is NOT a member, they have a pending request

The page must track these outcomes differently. After a `requested` result, the UI should show a pending/requested state, not a "Joined" state.

---

### 8. Self verification integration for `verification_required`

When eligibility says `verification_required` with `suggested_verification_provider: "self"`:

**Start self session**:
```ts
const session = await api.verification.startSession({
  provider: "self",
  requested_capabilities: ["nationality"],
  verification_intent: "community_join",
});
```

**Render the self launch** — `session.launch.self_app` is a `SelfVerificationLaunch` containing:

```ts
// From @pirate/api-contracts:
type SelfVerificationLaunch = {
  app_name: string;
  logo_base64?: string | null;
  header?: string | null;
  endpoint: string;                          // e.g. "https://self.xyz/verify"
  endpoint_type: "https" | "staging_https" | "celo" | "staging_celo";
  scope: string;
  session_id: string;
  user_id: string;
  user_id_type: "uuid" | "hex";
  disclosures: SelfVerificationDisclosures;  // includes nationality: true
  deeplink_callback?: string | null;
  version?: 1 | 2 | null;
};
```

Construct a QR code or deeplink URL from `endpoint`, `session_id`, and `scope`. The `disclosures.nationality` will be `true` for this flow.

**After the user completes self verification in the self.xyz app, the app returns a proof string to the browser.** The proof arrives via one of two mechanisms:

1. **Deeplink callback**: if `SelfVerificationLaunch.deeplink_callback` is set, the self.xyz app redirects back to that URL with the proof as a query parameter or fragment. The web should listen for this redirect on the callback path and extract the proof.

2. **Post-message / app link**: on mobile, the self.xyz app may open the browser with the proof in the URL fragment or via `window.postMessage`. The web should listen for the `message` event and extract the proof from `event.data`.

The exact integration depends on the self.xyz SDK version. The key point is: **the web must obtain the proof string from the self.xyz app and pass it to `completeSession`**. The proof is a base64-encoded string that the self.xyz app generates after the user completes identity verification.

**Do NOT call `completeSession` with an empty object.** The backend's self provider checks for the presence of a proof string (`self-provider.ts:222`):

```ts
async getSessionOutcome(input) {
  const proof = input.proof?.trim()
  if (!proof) {
    return { status: "pending" }  // <-- session stays stuck in "pending" forever
  }
  return await verifySelfProof({ proof, ... })
}
```

If `proof` is null or empty, the session returns `{ status: "pending" }` and the verification never completes.

**Correct completion call** — pass the proof from the self.xyz app:

```ts
// proofString comes from the self.xyz app callback/deeplink/postMessage
await api.verification.completeSession(session.verification_session_id, {
  proof: proofString,
});
```

**Then refetch eligibility and auto-retry join based on the new status**:

```ts
const updatedEligibility = await refetchEligibility();

if (updatedEligibility.status === "joinable") {
  const joinResult = await api.communities.join(communityId);
  // joinResult.status === "joined"
  await refetchEligibility();
} else if (updatedEligibility.status === "requestable") {
  const joinResult = await api.communities.join(communityId);
  // joinResult.status === "requested" — NOT "joined"
  // Show pending/requested state, not "Joined"
  await refetchEligibility();
} else if (updatedEligibility.status === "gate_failed") {
  // Verification succeeded but gate still fails (e.g. nationality_mismatch)
  // Show blocked message
} else {
  // verification_required again or other — show appropriate CTA
}
```

**Self integration helper**: isolate the proof-handling logic in a focused utility rather than spreading it across page code. Suggested pattern:

```ts
// src/lib/self-verification.ts
export type SelfVerificationResult =
  | { status: "completed"; proof: string }
  | { status: "expired" }
  | { status: "failed"; reason: string };

export function parseSelfCallback(url: URL): SelfVerificationResult {
  const proof = url.searchParams.get("proof")?.trim();
  if (proof) return { status: "completed", proof };

  const error = url.searchParams.get("error");
  if (error) return { status: "failed", reason: error };

  const expired = url.searchParams.get("expired");
  if (expired === "true") return { status: "expired" };

  return { status: "failed", reason: "no_proof_returned" };
}
```

The actual callback URL format depends on the self.xyz SDK. Adjust `parseSelfCallback` to match the real callback schema. The important thing is that the web extracts the proof string and passes it to `completeSession`.

---

### 9. `src/components/compositions/community-sidebar/community-sidebar.tsx`

**Replace the access label mapping.** Current:

```ts
const accessLabel = membershipMode === "open" ? "Open" : "Gated";
```

Replace with:

```ts
const accessLabel = membershipMode === "open"
  ? "Open"
  : membershipMode === "request"
    ? "Request to join"
    : "Gated";
```

Also update the icon logic — currently it only distinguishes `open` vs everything else. A `request` mode community should show the same `Lock` icon as `gated`:

```ts
const AccessIcon = membershipMode === "open" ? Globe : Lock;
```

This is unchanged but now correctly applies `Lock` to both `"request"` and `"gated"`.

---

### 10. `src/app/pages.tsx` — `CommunityPage` sidebar mapping

**Remove the `request → open` coercion.** Current:

```ts
membershipMode={community.membership_mode === "request" ? "open" : community.membership_mode}
```

Replace with:

```ts
membershipMode={preview.membership_mode}
```

Also switch the entire `CommunityPage` render from `community` (owner-only `ApiCommunity`) to `preview` (`CommunityPreview`). The `preview` object contains `community_id`, `display_name`, `description`, `membership_mode`, `membership_gate_summaries`, `viewer_membership_status`, and `created_at`. Update all references accordingly.

The `CommunitySidebar` props map from `preview`:

```tsx
<CommunitySidebar
  createdAt={preview.created_at}
  description={preview.description ?? ""}
  displayName={preview.display_name}
  membershipMode={preview.membership_mode}
  memberCount={0}
/>
```

(`member_count` is `null` from the preview endpoint currently — pass `0` as the sidebar expects a number.)

---

## New Files

### `src/lib/self-verification.ts`

Utility for handling the self.xyz proof callback. Isolate proof extraction logic here rather than spreading it across page code.

```ts
export type SelfVerificationResult =
  | { status: "completed"; proof: string }
  | { status: "expired" }
  | { status: "failed"; reason: string };

export function parseSelfCallback(url: URL): SelfVerificationResult {
  const proof = url.searchParams.get("proof")?.trim();
  if (proof) return { status: "completed", proof };

  const error = url.searchParams.get("error");
  if (error) return { status: "failed", reason: error };

  const expired = url.searchParams.get("expired");
  if (expired === "true") return { status: "expired" };

  return { status: "failed", reason: "no_proof_returned" };
}
```

Note: the exact callback URL format depends on the self.xyz SDK version. Adjust `parseSelfCallback` to match the real callback schema at integration time. The critical invariant is that the proof string is extracted and passed to `completeSession`.

---

### `src/lib/nationality-gate.ts`

Utility helpers for rendering nationality gate info and eligibility states. All gate display copy must go through this file — do not format gate requirements or CTA labels inline.

```ts
import type { MembershipGateSummary, JoinEligibility } from "@pirate/api-contracts";

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States",
  AR: "Argentina",
  // extend as needed, or use a locale-based country list
};

export function formatGateRequirement(gate: MembershipGateSummary): string {
  if (gate.gate_type === "nationality" && gate.required_value) {
    const name = COUNTRY_NAMES[gate.required_value] ?? gate.required_value;
    return `Requires ${name} nationality`;
  }
  return `Requires ${gate.gate_type} verification`;
}

export function getJoinCtaLabel(eligibility: JoinEligibility): string {
  switch (eligibility.status) {
    case "joinable": return "Join";
    case "requestable": return "Request to Join";
    case "verification_required": return "Verify to Join";
    case "already_joined": return "Joined";
    case "banned": return "Unavailable";
    case "gate_failed": return "Not eligible";
  }
}

export function isJoinCtaActionable(eligibility: JoinEligibility): boolean {
  return eligibility.status === "joinable"
    || eligibility.status === "requestable"
    || eligibility.status === "verification_required";
}
```

---

## Tests

### `src/test/nationality-gate.test.ts`

```ts
import { describe, expect, test } from "bun:test";
import { formatGateRequirement, getJoinCtaLabel, isJoinCtaActionable } from "../lib/nationality-gate";
import type { MembershipGateSummary, JoinEligibility } from "@pirate/api-contracts";

describe("formatGateRequirement", () => {
  test("formats nationality gate with known country code", () => {
    const gate: MembershipGateSummary = { gate_type: "nationality", required_value: "US" };
    expect(formatGateRequirement(gate)).toContain("United States");
  });

  test("formats unknown country code as raw code", () => {
    const gate: MembershipGateSummary = { gate_type: "nationality", required_value: "XX" };
    expect(formatGateRequirement(gate)).toContain("XX");
  });

  test("formats non-nationality gate generically", () => {
    const gate: MembershipGateSummary = { gate_type: "unique_human" };
    expect(formatGateRequirement(gate)).toContain("unique_human");
  });
});

describe("getJoinCtaLabel", () => {
  test("returns Join for joinable", () => {
    const e = { status: "joinable" } as JoinEligibility;
    expect(getJoinCtaLabel(e)).toBe("Join");
  });

  test("returns Request to Join for requestable", () => {
    const e = { status: "requestable" } as JoinEligibility;
    expect(getJoinCtaLabel(e)).toBe("Request to Join");
  });

  test("returns Verify to Join for verification_required", () => {
    const e = { status: "verification_required" } as JoinEligibility;
    expect(getJoinCtaLabel(e)).toBe("Verify to Join");
  });

  test("returns Not eligible for gate_failed", () => {
    const e = { status: "gate_failed" } as JoinEligibility;
    expect(getJoinCtaLabel(e)).toBe("Not eligible");
  });
});

describe("isJoinCtaActionable", () => {
  test("actionable for joinable", () => {
    const e = { status: "joinable" } as JoinEligibility;
    expect(isJoinCtaActionable(e)).toBe(true);
  });

  test("actionable for requestable", () => {
    const e = { status: "requestable" } as JoinEligibility;
    expect(isJoinCtaActionable(e)).toBe(true);
  });

  test("actionable for verification_required", () => {
    const e = { status: "verification_required" } as JoinEligibility;
    expect(isJoinCtaActionable(e)).toBe(true);
  });

  test("not actionable for gate_failed", () => {
    const e = { status: "gate_failed" } as JoinEligibility;
    expect(isJoinCtaActionable(e)).toBe(false);
  });

  test("not actionable for already_joined", () => {
    const e = { status: "already_joined" } as JoinEligibility;
    expect(isJoinCtaActionable(e)).toBe(false);
  });
});
```

---

## Build Order

1. `src/lib/community-membership.ts` — add `"request"`
2. `src/lib/api/client.ts` — add imports, `preview`/`getJoinEligibility` methods, fix `create` type (use `CreateCommunityRequest` directly), add `details` to `ApiError`, fix `completeSession` input
3. `src/lib/nationality-gate.ts` — new utility file
4. `src/lib/self-verification.ts` — new self proof callback handler
5. `src/components/compositions/create-community-composer/create-community-composer.types.ts` — replace `GateType`/`GateFamily`/`Set<GateType>` with `NationalityGateDraft`/`gateDrafts`
6. `src/components/compositions/create-community-composer/create-community-composer.tsx` — remove chip model, add draft model + country picker
7. `src/app/pages.tsx` — replace `useCommunity` with `useCommunityPreview`, replace `handleCreate`, add join flow, add self verification
8. `src/components/compositions/community-sidebar/community-sidebar.tsx` — update access label
9. `src/test/nationality-gate.test.ts` — tests
9. Run `rtk bun run types` to verify typecheck
10. Run `rtk ./node_modules/.bin/vite build --ssr src/worker.tsx --minify false --sourcemap false` for light build check

---

## Constraints

- These are replacement instructions, not additive patches. Remove the old model before adding the new one.
- Do not re-open backend semantics unless a real mismatch is found.
- Do not blur nationality into residency.
- Do not keep fake gate chips if they are not backed by real request data — the chip system must be removed, not extended.
- Do not ignore `requestable` — it must produce "Request to Join" UI and the join handler must expect `status: "requested"` from the join mutation (not `"joined"`).
- Do not treat `gate_failed` as a generic opaque error — parse `details.failure_reason`.
- Do not render raw ISO country codes in the UI — always go through `formatGateRequirement`.
- Do not read top-level `user.nationality` — use `verification_capabilities.nationality` if needed.
- Do not run `rtk bun run build` as a first check — use narrow type/build checks per AGENTS.md.
- Preview and join-eligibility are authenticated endpoints — they require a Bearer token for a signed-in user.
- Do NOT call `completeSession(sessionId, {})` with an empty object for self verification — the backend will return `pending` and the session will be stuck. The web must pass actual proof from the self.xyz app callback.
- `namespace` is optional at community create time (the spec, generated contract, and backend all agree: `namespace?: ... | null`). Communities can be created without a namespace and attach one later.

---

## Spec Fixes Applied

The following spec/source-of-truth fixes were made alongside this handoff:

- `specs/api/src/components/schemas/communities-core.yaml`: removed `namespace` from the `required` array in `CreateCommunityRequestBase` and marked the property as `nullable: true`. Updated descriptions to reflect that namespace is optional at create time. This aligns the spec with the generated contract and backend behavior.
- `specs/api/src/paths/communities.yaml`: updated the POST `/communities` description to cover both namespace-present and namespace-omitted cases.

## Out of Scope

The following backend endpoints exist but are outside the nationality-gate web handoff scope:

- `POST /communities/:id/namespace` — namespace attachment after create. This is used by the owner-only namespace management flow and is already implemented in `community-service.ts`. No changes needed for nationality-gate web work.
- The namespace-attachment and namespace-verification-modal code in `pages.tsx` (`CreateCommunityPage` and `CommunityPage`) is separate from the nationality-gate join/viewer flow. It should not be removed or disrupted during the web implementation.
