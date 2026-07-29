# Release references

`api.sha` is the exact API commit deployed by the Web release workflow. Update it
only to a full commit SHA from API `main` after its `api-ci` push run succeeds.
`core.sha` is the exact Core commit used for migrations and cross-repository
packages. Update it only after its `core-ci` push run succeeds and the pinned API
commit records the same Core SHA in `.github/ci-refs/core.sha`.

The release preflight verifies both CI runs and the API/Core compatibility pair
before staging or production can start.

Pull requests may keep `api.sha` unchanged or advance it to a descendant of the
base branch's pin. The preflight rejects valid-but-older and divergent commits so
a routine rebase cannot silently roll production backwards. An intentional
incident rollback requires the auditable `release-pin-rollback-approved` PR label.
Missing or orphaned API commits fail the ancestry check.

`API pin monotonicity` is an always-running required PR context. Unchanged pins
exit without cloning API history, while changed pins run the ancestry check.
The guarantee also depends on branch protection keeping strict status checks
enabled: an out-of-date branch must rerun against the latest base pin before it
can merge.

Web releases use these pinned commits; they never select the API or Core
repository's current `main` implicitly.

Current release intent: deploy the /admin cache authorization-bypass fix with API
`6e48c2189d103f9aff891d5cbe0dc88d10650382` and Core
`3b109ab98e5a1a4e08fd17472779470bd45e5c25` (Core unchanged). Edge-cached
/admin/ops 200 responses were served to UNAUTHENTICATED callers on staging
(cf-cache-status HIT, age 1164) because a cache hit answers before handler
authorization runs. api#899/#900 send `private, no-store` across the whole
/admin namespace, including error responses, from middleware registered ahead of
every /admin mount. Also carries scheduler lane isolation (#893) and the
Telegram dispatch-timeout classification (#896), both already verified on
staging.
