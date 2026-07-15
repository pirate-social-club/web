# Release pipeline

## Shape

```
release-inputs ──> schema-gate ──> staging ──> release-gate ──> production-freshness ──> production
                                      │                                    (environment: production; re-checks prod fleet)
                                      ├──────> commerce-gate  (non-blocking canary)  ──┐
                                      └──────> canaries       (non-blocking canary)  ──┴─> canary-alert
```

`schema-gate` runs **before** the staging deploy: the invariant is that the pinned API may
deploy only after the live fleet satisfies its schema requirements, so an incompatible pin is
caught before it reaches staging — not after. `production` and `production-freshness` still
list it explicitly (it is transitively required through `staging`, but naming it is clearer).

## The one rule

**A third-party system must never be a prerequisite for deploying the web app.**

`release-gate` blocks production. It contains only things we own and control:

- the app boots and serves (`smoke-test.sh`, `test:e2e` browser smoke)
- auth works and a community follow round-trips
- a global booking hold quotes
- one controlled direct-multipart upload completes
- the song-preview container is healthy

`commerce-gate` and `canaries` never block production. They drive systems we do not control — the Story/Aeneid testnet, its RPC, DKG servicers, operator wallet funding — plus the broad live-browser journey suite. They run *in parallel* with `release-gate`, so they add **zero** latency to the deploy path. Failures raise a tracking issue (`canary-failure` label) and upload artifacts.

## Community schema gate

`schema-gate` blocks production alongside `release-gate`. It answers one question:
**does every live community shard satisfy the pinned API's declared community-template
schema requirements?** Nothing gated this before, and it broke production twice — 1124
(async post publish) and 1127 (every publish). It runs the read-only verifier from the
pinned Core (`core/scripts/community/verify-community-schema-requirements.ts`) against the
requirements manifest from the pinned API (`api/services/api/community-schema-requirements.json`).

- The **staging** run is the promotion gate. The **production** job re-runs it `--prod`
  immediately before migrations/deploy — the live allocated fleet can change between the two,
  so production is attested fresh, never on the staging pass.
- It is schema **attestation** across the whole fleet. The multipart test in `release-gate`
  is **behavioural** on one community. They catch different failures — the gate found 1124
  missing on 104 live staging shards that the multipart test passed anyway. **Keep both.**
- Requirements have two classes: `unconditional` (always) and `features` (only required when
  that flag bundle is being enabled, so e.g. flipping `REWARDS_*` cannot bypass its migration).
- When a Core pin adds a new `community-template` migration, the `release-inputs` ratchet
  requires it to be classified exactly once in the pinned API manifest: unconditional,
  feature-conditional, or explicitly deferred with a non-empty rationale. The comparison
  runs against the previous Web commit's Core pin on pull requests and main pushes, so a pin
  bump cannot silently introduce an unclassified shard migration.

## Community provisioning coverage

Per-release tests use persistent staging fixtures and must not create communities. A loaded
community owns its D1 binding permanently until a verified erase-and-quarantine lifecycle exists.

Fresh provisioning is covered by the manual `Manual staging community provisioning` workflow.
Each invocation permanently consumes exactly one staging binding, so it requires the confirmation
`ALLOCATE_ONE_STAGING_D1`, disables test retries by running a single Bun script, and refuses to run
unless one allocation would leave the pool at or above its configured free-capacity threshold. The
workflow records capacity before and after, the created fixture id, and routed read/write evidence.
Do not schedule this workflow or add it to `release.yml` until safe fixture reclamation exists.
If a run allocates a fixture but fails during verification, resume that exact fixture with confirmation
`RESUME_STAGING_PROVISIONING_FIXTURE`, budget `0`, and the community/run ids from its artifact. Never
spend a second binding merely to retry post-allocation assertions.

## Production migration OIDC doctor

Production migration access is verified by the manual, read-only
`Production migration OIDC doctor` workflow. Dispatch it from `main`; any other ref is rejected so
the GitHub OIDC `sub` claim remains `repo:pirate-social-club/web:ref:refs/heads/main`.

Set repository variable `INFISICAL_WEB_PROD_MIGRATION_IDENTITY_ID` to the dedicated
`github-web-prod-migration` identity. That identity may read only
`prod:/services/control-plane/CONTROL_PLANE_MIGRATOR_DATABASE_URL`. The doctor checks out the exact
Core SHA pinned by Web, fetches the credential through OIDC, and compares the production ledger to
that pinned migration tree. It never applies migrations or deploys.

Do not make the release migration steps fail closed until this doctor has passed end-to-end with
the dedicated identity. Once release is fail closed, a doctor failure remains diagnostic evidence;
it is never permission to restore silent migration skips.

## Why (read before you "fix" this)

On **2026-07-13** the Story derivative-royalty E2E and the broad live-browser suite were hard prerequisites for `production`, inside one monolithic job with no concurrency group.

Result that day:

| | |
| --- | --- |
| Release runs on `main` | 19 |
| Failed | 17 |
| Reached production | **0** |
| Commits stranded on `main` | 53 |

The failures were not 17 distinct defects. They clustered on **two** steps — `Story derivative royalty E2E` (11) and `Smoke staging` (6). A CSS change could not ship unless a testnet cooperated. Each retry cost 25–50 minutes, so an agent chasing them burned ~12 hours without ever deploying.

The origin of the mistake was an overcorrection of a real audit finding:

> "Failed tests must not silently permit production"

is true. But it is **not** the same claim as:

> "Every live external integration must block every production deploy"

and that second claim is what got encoded. Release-critical smoke on infrastructure we own must block. Long testnet and broad live-browser canaries must not.

## If you want to make a canary blocking again

Don't do it by adding the job to `production.needs`. That is exactly how 2026-07-13 happened. Instead:

1. Identify what regression you are actually trying to catch.
2. Cover it with a **deterministic** check we own — contract test, unit test, or a fake-shard integration test — and put *that* in `release-gate`.
3. Leave the live third-party journey as a canary.

A canary that fails is a signal to investigate, from its uploaded artifacts, on a branch. It is never a reason to push to `main` and watch a release.

## Guards

- **`concurrency: release-${{ github.ref }}`** (`cancel-in-progress: false`) — releases serialize instead of racing. A run mid-migration is never killed.
- **`production-freshness`** — compares the run SHA to the live `main` tip immediately before deploying. If `main` has advanced, production is **skipped** (not failed) and the newer run deploys. An older run can never overwrite a newer deployment.

## Validating a change to release.yml

```sh
actionlint -ignore 'label ".+" is unknown' .github/workflows/release.yml
```

The suppressed rule is only the Blacksmith self-hosted runner labels, which actionlint does not know about.

Note that on `pull_request`, every job except `release-inputs` is skipped by design (`if: github.event_name != 'pull_request'`), so a PR validates that the workflow parses and that the pinned API/Core refs are green — nothing more. That is intended.
