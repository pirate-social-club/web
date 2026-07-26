# React Server Components denial-of-service review — 2026-07-26

## Decision

GHSA-wx67-qw84-cm4g was reachable in Pirate production and is classified as a
bounded availability incident. It is not merely an unused transitive
dependency.

The advisory describes remote denial of service from a crafted request to a
React Server Function endpoint. Pirate runs RedwoodSDK's React Server
Components Worker runtime. That runtime accepts requests containing
`__rsc_action_id` and calls `react-server-dom-webpack`'s `decodeReply` before
checking whether the requested Server Function exists. Therefore the vulnerable
decoder was reachable even though Pirate currently defines no application
modules containing a `"use server"` directive.

This path processes request payloads; rendering user-generated profile or post
content is not the exploit path.

## Exposure window

- Vulnerable version deployed: `react-server-dom-webpack@19.2.6` in Web commit
  `3535ce8c7e548c33b263cb8ddafc40a18a3727ea`; its successful Release completed
  at 2026-06-01 15:27:15 UTC.
- Fixed version merged: `19.2.8` in Web commit
  `84b20c9a90dd7f32f1141684795b2c08c3dcfea3` at 2026-07-26 06:39:57 UTC.
- Fixed production deployment: Web Release run `30192620579` completed its
  `Deploy production` job successfully at 2026-07-26 07:41:43 UTC.

The maximum confirmed exposure was 54 days, 16 hours, 14 minutes, and 28
seconds, from the vulnerable deployment through the fixed production
deployment. No conclusion about exploitation is made here; that requires a
separate review of edge request/error telemetry for crafted RSC action requests
and unexplained Worker resource exhaustion.

## Evidence

- Advisory: <https://github.com/advisories/GHSA-wx67-qw84-cm4g>
- Pirate Worker registration: `src/worker.tsx` uses RedwoodSDK `defineApp` and
  `render`.
- RedwoodSDK request path:
  `node_modules/rwsdk/dist/runtime/register/methodEnforcer.js` invokes
  `decodeReply` before `getServerModuleExport`.
- React decoder export:
  `react-server-dom-webpack/server.edge.js`.

## Containment

- React, React DOM, and React Server DOM Webpack are pinned to patched version
  19.2.8.
- `Advisory audit (high and above)` is a required Web `main` pull-request check.
- Release preflight independently re-runs the shared audit at high severity and
  fails closed on transport, parsing, unaccepted findings, or expired
  exceptions. This closes the merge-to-deploy advisory-publication gap.
