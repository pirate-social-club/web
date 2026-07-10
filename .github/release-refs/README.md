# Release references

`api.sha` is the exact API commit deployed by the Web release workflow. Update it
only to a full commit SHA from API `main` after its `api-ci` push run succeeds.
The release preflight verifies that run before staging or production can start.

Web releases redeploy this pinned API commit; they never select the API repository's
current `main` implicitly.
