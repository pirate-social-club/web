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

Current release intent: deploy the Telegram channel inline-keyboard fix with API
`18434ab6214ec2ddd4a0168a832b9925dee78cc4` and Core
`da95b3974908a907a4d4027b7fec097ed653221e` (Core unchanged). Channel posts
carried a `web_app` inline button, which Telegram permits only in private chats,
so every channel send failed with BUTTON_TYPE_INVALID and the feature could not
deliver a post. The button is now a standard URL to the public post page.
