# D1 attestation fast-path activation

Tracking issue: [#960](https://github.com/pirate-social-club/web/issues/960).

The REST full-fleet scan remains the release authority until an activation PR is reviewed and merged. Quiet green releases are not sufficient evidence.

## Automatic evidence capture

`D1 attestation shadow evidence` runs after every completed main `Release`, including failed releases. It reads that exact run attempt's staging schema manifest and compares `effective_policy_digest` and shadow state with the latest evidence recorded on #960.

It comments only when the digest or one of these decisions changes:

- `authoritative_pass`
- `would_fast_path_fire`
- `authoritative_match`

This intentionally preserves the failed-run decline as well as the later recovery. Release artifacts have finite retention; the issue comments are the durable evidence record.

## Activation evidence required

For one real effective-policy transition, #960 must contain both:

1. **Decline under the new digest:** the authoritative scan fails or the ledger abstains; the ledger must not remain stale-green. Review missing, invalid, policy-mismatch, generation, and roster counters.
2. **Recovery under that same digest:** after fleet migration, the authoritative scan passes, `would_fast_path_fire=true`, `authoritative_match=true`, and all missing/invalid/policy-mismatch counters are zero.

Also confirm the manifests cover every canonical staging profile and retain the already-recorded quarantine-removal and unavailable-observation evidence described in Core's Phase 0 document.

## Activation change

Activation requires a separate PR. Wire the release gate to try the aggregate ledger reader first and fall back to the unchanged REST scan whenever the reader abstains, errors, observes a zero-live roster, or disagrees with expected roster/policy identity. Keep scheduled full scans for drift detection.

Start on staging. Require the aggregate result and a fallback scan to agree before allowing production use. Record the activation run and resulting manifests on #960.

## Rollback

Set the release fast-path flag back to disabled. The REST full-fleet scan is unchanged and immediately resumes sole authority. Do not mutate or delete attestation rows during rollback; they are evidence and an optimization, not the source of schema truth.

