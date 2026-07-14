# Release pipeline

## Shape

```
release-inputs ──> staging ──> release-gate ──> production-freshness ──> production
                      │                                                  (environment: production)
                      ├──────> commerce-gate  (non-blocking canary)  ──┐
                      └──────> canaries       (non-blocking canary)  ──┴─> canary-alert
```

## The one rule

**A third-party system must never be a prerequisite for deploying the web app.**

`release-gate` blocks production. It contains only things we own and control:

- the app boots and serves (`smoke-test.sh`, `test:e2e` browser smoke)
- auth works and a community follow round-trips
- a global booking hold quotes
- one controlled direct-multipart upload completes
- the song-preview container is healthy

`commerce-gate` and `canaries` never block production. They drive systems we do not control — the Story/Aeneid testnet, its RPC, DKG servicers, operator wallet funding — plus the broad live-browser journey suite. They run *in parallel* with `release-gate`, so they add **zero** latency to the deploy path. Failures raise a tracking issue (`canary-failure` label) and upload artifacts.

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
