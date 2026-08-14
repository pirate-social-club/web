# Solid 2 Cloudflare seam-spike verdict

Date: 2026-08-14  
Owner: `workspace_owner`  
Repository: `solid2-seam-poc/` (standalone repository; no deployment)
Spike commit: `0b5a0f4`

## Verdict

The Solid 2 RC start-mode server can be built and served through Cloudflare's
Vite/Workers toolchain. The Worker adapter, CSP nonce propagation, auxiliary
Worker service binding, HNS host routing, and streamed SSR seams are green in
the bounded probe. The spike is **RED for the M1 go decision** until the
authored client hydration click-through is resolved. The failure is not caused
by CSP or by the pinned Solid 2 start-mode runtime: removing CSP still left the
SSR button at `0`, the authored server/client entry pair is coherent, and a
pristine pinned fixture with no middleware hydrated successfully (`0 → 1`).
The remaining failure is therefore local to this app composition, most likely
the streamed async `Loading` boundary. The fallback tripwire does not fire,
but M1 remains blocked until the composition is isolated and fixed.

## Evidence

| Seam | Result | Evidence |
| --- | --- | --- |
| Worker adapter boundary | GREEN | `rtk bun run build` emitted `dist/ssr/index.js`, `dist/client`, and `dist/ssr/wrangler.json`; foreground `vite preview` served the SSR response through workerd. |
| CSP nonce | GREEN | `rtk bun run probe`: 16/16. All six SSR-emitted script tags, including late stream patches, carried the per-request nonce. |
| Two-Worker topology | GREEN | `/seam/binding` returned `solid2-seam-poc-public` through the `PUBLIC` service binding. |
| HNS routing | GREEN | Wire-level `Host: example.hns` returned `307` to `https://app.example.hns/`; app host returned `x-seam-host-surface: app`. |
| Streaming SSR | GREEN | `rtk bun run stream-check` returned `{"chunks":3,"firstMs":18,"spanMs":76,...}` through the Worker preview adapter. |
| Hydration click-through | RED / app-composition follow-up | CSP-off stayed at `0 → 0`; `Document` includes `HydrationScript`, the server passes the request client entry, and the client calls `hydrate()` over the same tree. A pristine pinned start-mode fixture with no middleware incremented `0 → 1`. |

## Working arrangement

The successful arrangement is the Cloudflare Vite plugin owning the `ssr`
environment and Solid owning start-mode entries:

```ts
plugins: [
  fileRoutes(),
  cloudflare({
    viteEnvironment: { name: "ssr" },
    auxiliaryWorkers: [{ configPath: "./workers/public/wrangler.jsonc" }],
  }),
  solid({
    ssr: true,
    serverFunctions: true,
    start: {
      middleware: "./src/middleware.ts",
      external: true,
    },
  }),
]
```

The generated `dist/ssr/wrangler.json` points at `index.js`, keeps the
`ASSETS` binding for `dist/client`, and retains the `PUBLIC` service binding.
The source fallback contract is `src/worker.ts`, which imports
`virtual:solid-ssr-handler` and forwards non-asset requests to
`handleRequest(request)`.

Generated start entries did not provide a nonce option for the injected module
tag. The working CSP arrangement is therefore an authored entry pair:
`src/entry-server.tsx` reads the middleware nonce and passes
`{ nonce }` to `renderToStream`; `src/Document.tsx` emits the nonce-bearing
client entry tag. This also nonce-protects Solid's late streaming patch scripts.

## Follow-up before M1

1. Reduce the authored hydration case by removing the streamed async `Loading`
   boundary, then reintroduce it incrementally while preserving the nonce and
   streaming options.
2. Capture the hydration runtime state (`_$HY.completed`, queued events, and
   hydration keys) for each reduced fixture; the no-middleware control already
   proves this is not a Cloudflare binding or upstream RC failure.
3. Keep the Solid 1.9 + SolidStart 2 fallback available, but do not trigger it
   from this result: the pristine pinned Solid 2 fixture hydrates successfully.

No shared Cloudflare account was used and no Worker was deployed by this spike.
