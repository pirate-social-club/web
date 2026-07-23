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

Web releases use these pinned commits; they never select the API or Core
repository's current `main` implicitly.

Current release intent: deploy the public-read cache eviction canary with API
`1eded9e82dcc32a0c8f9d0025d933f4a4164a935` and Core
`387968e2008891b30cbcaa38a40233fc2341f612`.
