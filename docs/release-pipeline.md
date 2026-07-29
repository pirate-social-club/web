# Release pipeline

## Shape

```
release-inputs ──> staging-freshness ──> schema-gate ──> staging ──┬─> release-gate ───────────┐
                                                                  └─> api-contract-gate ──────┴─> production-freshness ──> production
                                                                                                  (re-checks prod fleet)

successful current Release ──workflow_run──> verify deployed SHA ──┬─> Story commerce canary ─┐
                                                                   └─> live browser canary ───┴─> canary alert
```

`schema-gate` runs **before** the staging deploy: the invariant is that the pinned API may
deploy only after the live fleet satisfies its schema requirements, so an incompatible pin is
caught before it reaches staging — not after. `production` and `production-freshness` still
list it explicitly (it is transitively required through `staging`, but naming it is clearer).

The latest measured natural release (`30450485117`, 2026-07-29) completed in
14m52s. Treat that as a baseline, not a service-level promise: runner pickup,
fleet growth, and live-contract latency vary.

## The one rule

**A third-party system must never be a prerequisite for deploying the web app.**

The blocking `release-gate` and API-owned `api-staging-contract-gate` contain only things we own
and control:

- `release-gate`: the app boots and serves (`smoke-test.sh`, `test:e2e` browser smoke), and the
  song-preview container is healthy
- `api-staging-contract-gate`: auth works and a community follow round-trips, a global booking hold
  quotes, one controlled direct-multipart upload completes, and a real post/comment round-trips

`release-canaries.yml` runs only after a successful current `Release` workflow and verifies that
staging still serves that release's exact Web/API pair before testing. Its Story and live-browser
jobs drive systems we do not control — the Story/Aeneid testnet, its RPC, DKG servicers, operator
wallet funding — plus the broad live-browser journey suite. They have their own concurrency group,
so a slow canary cannot hold or delay the next release. Failures raise a tracking issue
(`canary-failure` label) and upload artifacts; setup or SHA-verification failures alert as blind
canaries rather than passing silently. Stale completed releases are skipped without alerting, and
a new `main` push cancels the older canary before its staging target can change underneath it.

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
- The verifier uses the D1 REST query endpoint and batches both probes for a
  shard into one request. The staging manifest must report
  `d1_query_transport: "rest_batch"` and includes logical batches, HTTP
  attempts, retries, cumulative attempt duration, and `errors_by_code`.
- Staging currently runs at concurrency 3. This was raised only after two
  zero-retry concurrency-2 scans. If code `7429` or a sustained retry increase
  appears, first rule out overlapping scans and then restore concurrency 2;
  never weaken the fail-closed result checks.
- The long-term fleet-size-independent improvement is the approved attestation
  ledger. Until its fast path is separately reviewed and activated, the REST
  full scan remains the release authority.

## API staging contract gate

The reusable API workflow first inventories the required tests, then runs
exactly six live staging contracts in one Playwright process and exactly three
mobile non-member contracts in a second process. The `--expected-count` checks
are coverage guards: changing a title or grep without updating the inventory
must fail rather than silently run fewer tests.

GitHub snapshots the reusable workflow ref for each run attempt. If
`api/.github/workflows/staging-contract-gate.yml` changes, start a new Web push
run. Re-running an old attempt continues to use the API workflow revision that
GitHub resolved for that attempt.

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

- **No workflow-wide release lock** — read-only validation may overlap. Only the
  jobs that mutate shared environments are serialized.
- **`staging-promotion` and `production-deploy`** use
  `cancel-in-progress: false`. A run applying migrations or deploying is never
  killed midway; both lanes repeat freshness checks while holding their locks.
- **`community-schema-gate-main`** is read-only and uses
  `cancel-in-progress: true`, so a newer `main` push kills an obsolete fleet
  scan instead of doubling D1 load.
- **`production-freshness`** — compares the run SHA to the live `main` tip
  immediately before deploying. If `main` has advanced and another live
  Release run can still reach production, this run defers. If no live successor
  remains, the already validated run may deploy only after proving that its SHA
  is an ancestor of `main` and strictly advances the last successful production
  deployment. API or ancestry uncertainty fails closed. This gives sustained
  merge traffic a winner without allowing rollback or deploying an unvalidated
  tip.
- **`concurrency: release-canaries-*`** (`cancel-in-progress: true`) — observational canaries serialize separately. A newer completed release may replace an older canary run, but can never cancel or queue a production deploy.

## Operating a release

1. Monitor the run to a terminal state and inspect every individual job.
2. A cancelled schema gate on an obsolete SHA is expected supersession. Do not
   re-run it.
3. Re-run a failed schema gate only if that run's SHA is still the current
   `main` tip. Re-running an old attempt can cancel the tip run's scan.
4. For a schema failure, download
   `schema-gate-staging-<run-id>-<attempt>` and inspect
   `d1_query_metrics`, shard statuses, quarantines, and the transport before
   deciding whether the failure is schema drift, credentials, or D1 load.
5. Never call a release deployed when `Deploy production` is skipped. After a
   successful production job, directly verify the Web/API SHA pair at
   `https://pirate.sc/__version` and
   `https://api.pirate.sc/__version`.
6. Do not push a no-op commit solely to gather timing data. Use natural releases
   for observational performance samples.
7. Treat a manually disabled `Release` workflow as an explicit operator pause,
   not as supersession or a pipeline result. Record the incident or maintenance
   reason and inspect active staging/production jobs before disabling it.
   Re-enabling the workflow does not replay pushes received while it was
   disabled; when deployment is required, dispatch `Release` from current
   `main` with `deploy_production: true` and monitor that new run normally.

## Validating a change to release.yml

```sh
actionlint -ignore 'label ".+" is unknown' \
  .github/workflows/release.yml \
  .github/workflows/release-canaries.yml
```

The suppressed rule is only the Blacksmith self-hosted runner labels, which actionlint does not know about.

Note that on `pull_request`, every job except `release-inputs` is skipped by design (`if: github.event_name != 'pull_request'`), so a PR validates that the workflow parses and that the pinned API/Core refs are green — nothing more. That is intended.
