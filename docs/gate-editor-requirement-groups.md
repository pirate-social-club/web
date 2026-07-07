# Gate Editor Requirement Groups

## Current State

The community gates editor currently exposes a flat list of gate atoms plus one global `gateMatchMode` flag:

- `gateMatchMode: "all"` means members must pass every selected atom.
- `gateMatchMode: "any"` means members may pass any selected atom.
- The editor-side draft helpers do not change structure for either mode. `normalizeGateDraftsForMatchMode` is currently a no-op, and `upsertGateDraftForMatchMode` performs the same replace-by-atom-type operation in both modes.

That makes the UI easy to enter incoherent policies. The concrete bad case is not abstract OR logic; it is the standalone top-level `altcha_pow` atom. With global `any`, the editor can express "browser anti-bot OR nationality" as a peer choice. That is not a useful membership rule for normal communities.

The backend gate policy model is more capable than this editor. It can preserve and evaluate advanced policies that the visible editor cannot author. The editor already has an advanced-policy passthrough banner, so the redesign should be a constrained authoring layer over the policy model, not a general recursive policy builder.

## Goals

1. Make normal gate authoring match product language: communities configure requirements, and each requirement can have local ways to satisfy it.
2. Remove the default path to nonsensical peer ORs such as anti-bot OR nationality.
3. Preserve advanced policies without flattening or data loss.
4. Keep document proof provider selection per document requirement, not as a global community setting.
5. Keep member-side provider routing separate from admin-side accepted-provider authoring.

## Non-Goals

- Do not make ZKPassport satisfy `unique_human`. ZKPassport only provides document attributes: `nationality`, `minimum_age`, and `gender`.
- Do not build a fully recursive visual policy editor.
- Do not make the admin editor decide member-side provider preference when both Self.xyz and ZKPassport are accepted.

## Requirement Groups

The normal editor should present four requirement groups. The saved policy shape should be an AND of selected groups by default. Local OR is allowed only inside a group where the alternatives satisfy the same product requirement.

### Humanity

Draft atoms:

- `unique_human`
- `altcha_pow` only when `fallbackFor: "unique_human"`

Authoring behavior:

- Primary options: Very palm scan, Self.xyz private ID proof, or none.
- If Very is selected, the existing "Allow browser check instead of palm scan" option remains as a local fallback. It serializes to `altcha_pow` with `fallbackFor: "unique_human"`.
- ZKPassport is not offered here.
- Standalone top-level browser anti-bot should not appear in the normal editor. If an existing policy contains standalone `altcha_pow`, treat it as advanced unless it can be safely represented as a humanity fallback.

### Document Attributes

Draft atoms:

- `nationality`
- `minimum_age`
- `gender`

Authoring behavior:

- Each selected document attribute remains independently configurable.
- Accepted proof apps are selected per attribute using the existing three-option model:
  - Self.xyz only -> `["self"]`
  - ZKPassport only -> `["zkpassport"]`
  - Self.xyz or ZKPassport -> `["self", "zkpassport"]`
- Missing or empty `acceptedProviders` normalize to `["self"]` for existing data compatibility.
- ZKPassport can only appear in this group.

Open product decision:

- If multiple document attributes are selected, decide whether provider choice is per-attribute, shared across all selected document attributes, or shown per-attribute with an "apply to all document checks" affordance. The current data model supports per-attribute accepted providers.

### Token Holdings

Draft atoms:

- `erc721_holding`
- `erc721_inventory_match`

Authoring behavior:

- Keep the existing ERC-721 contract input.
- Keep Courtyard inventory match authoring gated by available inventory groups.
- Local OR is not part of the normal token group initially. "Hold collection A OR collection B" or "NFT OR human" should be an advanced access path, not the default flat mode.

### Reputation

Draft atoms:

- `wallet_score`

Authoring behavior:

- Keep Gitcoin Passport wallet score threshold authoring.
- This remains separate from ZKPassport. The current naming collision between "passport" wallet score and ZKPassport is a recurring source of confusion and should stay visually distinct.

## Advanced Access Paths

Top-level OR can be valid, for example "hold our NFT OR prove you are human." The problem is that the current editor makes every selected atom part of one untyped global OR.

Normal authoring should not expose the current global `Require all` / `Allow any one` switch. Instead:

- Default normal editor: AND of selected requirement groups.
- Local OR: only inside a group where alternatives satisfy the same requirement.
- Cross-group OR: available only through an explicit "Advanced access paths" mode.

Advanced access paths can be implemented in a later phase. Until then, policies that are not representable by the normal grouped editor must show the existing advanced-policy banner and be preserved unless the admin explicitly confirms replacement.

## Loading And Preservation Rules

The risky layer is loader-to-draft mapping, not the current upsert helpers. A redesign must classify saved policy into one of three states:

1. `normal`: fully representable by grouped requirements.
2. `normal_with_warnings`: representable, but includes legacy defaults or normalization such as missing document `acceptedProviders`.
3. `advanced`: not representable without changing meaning.

Rules:

- Loading an advanced policy must not flatten it into normal drafts.
- Saving unrelated settings must preserve the advanced policy.
- Replacing an advanced policy requires explicit confirmation through the existing advanced-policy banner flow.
- Legacy standalone `altcha_pow` is advanced unless it has `fallbackFor: "unique_human"`.
- Existing nested AND/OR policies authored by scripts are advanced unless they match the supported group template exactly.

## Serialization Shape

The normal grouped editor should serialize to a constrained depth-2 policy:

- Top level: AND set of selected requirement groups.
- Group level:
  - Humanity can contain local OR between `unique_human` and fallback `altcha_pow` only when fallback is selected.
  - Document attributes serialize as selected document atoms. Provider alternatives are represented by each atom's `accepted_providers`, not by OR branches.
  - Token holdings serialize as selected token atom.
  - Reputation serializes as selected wallet score atom.

This keeps the normal editor aligned with existing atom semantics and avoids inventing a new backend policy primitive.

## Member Routing Is Separate

The admin editor only controls what a gate accepts. It does not decide which provider a member sees first.

Current relevant behavior:

- Document gates can accept Self.xyz, ZKPassport, or both through `acceptedProviders`.
- `unique_human` accepts Self.xyz or Very, not ZKPassport.
- Main-web provider suggestion currently prefers Self for missing document capabilities unless a ZKPassport-only path is required.

Therefore, grouped editor work does not make ZKPassport user-facing by itself. Member-side provider chooser or preference logic is a separate product surface.

## Test Requirements

Before changing editor draft shape, add tests that prove loader and serializer fidelity:

1. Load a normal grouped policy, save without changes, reload, and assert semantic equality.
2. Load document gates with missing `accepted_providers`; assert they display as Self.xyz only and do not silently backfill ZKPassport unless the admin selects it.
3. Load document gates with each provider choice: Self-only, ZKPassport-only, both.
4. Load Very `unique_human` with `altcha_pow.fallbackFor = "unique_human"`; assert it maps to the local humanity fallback.
5. Load standalone top-level `altcha_pow`; assert it is advanced and preserved.
6. Load a nested cross-group OR such as NFT OR humanity; assert it is advanced and preserved.
7. Confirm replacing an advanced policy requires explicit replacement confirmation.
8. Round-trip all eight current draft atom types:
   - `altcha_pow`
   - `unique_human`
   - `nationality`
   - `minimum_age`
   - `gender`
   - `wallet_score`
   - `erc721_holding`
   - `erc721_inventory_match`

The existing helper tests around document proof provider normalization are useful but insufficient. The safety tests need to target the loader and save/reload path where flattening bugs occur.

## Suggested Implementation Phases

1. Keep the already-shipped document proof app selector. It fixes the immediate checkbox ambiguity without changing policy shape.
2. Add loader/serializer round-trip tests for current behavior.
3. Introduce internal grouped view-model helpers that map `IdentityGateDraft[]` plus `gateMatchMode` into requirement groups.
4. Render the grouped editor from that view model while preserving existing save output.
5. Remove or demote standalone top-level anti-bot from normal authoring.
6. Add explicit advanced access paths only after the normal grouped editor is stable.

