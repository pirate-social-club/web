# Solid 2 Cloudflare seam-spike verdict

Date: 2026-08-14  
Owner: `workspace_owner`  
Repository: `solid2-seam-poc/` (standalone repository; no deployment)
Spike commit: `87d651d`

## Verdict

The Solid 2 RC start-mode server can be built and served through Cloudflare's
Vite/Workers toolchain. The Worker adapter, CSP nonce propagation, auxiliary
Worker service binding, HNS host routing, streamed SSR, and hydration seams are
green in the bounded probe. The M1 seam is **GREEN**: the full streamed app's
SSR button increments `0 → 1` in the browser, with 16/16 seam checks passing.
The fix is an explicit app-root hydration boundary: the server `Document`
consumes the first hydration-ID scopes, so the client hydrates `#app-root` with
`{ renderId: "2" }` rather than attempting to hydrate the whole `Document`.

## Evidence

| Seam | Result | Evidence |
| --- | --- | --- |
| Worker adapter boundary | GREEN | `rtk bun run build` emitted `dist/ssr/index.js`, `dist/client`, and `dist/ssr/wrangler.json`; foreground `vite preview` served the SSR response through workerd. |
| CSP nonce | GREEN | `rtk bun run probe`: 16/16. All six SSR-emitted script tags, including late stream patches, carried the per-request nonce. |
| Two-Worker topology | GREEN | `/seam/binding` returned `solid2-seam-poc-public` through the `PUBLIC` service binding. |
| HNS routing | GREEN | Wire-level `Host: example.hns` returned `307` to `https://app.example.hns/`; app host returned `x-seam-host-surface: app`. |
| Streaming SSR | GREEN | `rtk bun run stream-check` returned `{"chunks":3,"firstMs":18,"spanMs":76,...}` through the Worker preview adapter. |
| Hydration click-through | GREEN | Full streamed app increments `0 → 1` with the authored nonce-bearing entry; the app hydrates inside `#app-root` using `renderId: "2"`. |

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
The authored `Document` wraps the app in `#app-root`; the client entry hydrates
that element with `{ renderId: "2" }`, matching the server's hydration-ID scope
after the Document's `0`/`1` nodes.

## M1 closeout

1. Keep the `#app-root`/`renderId: "2"` pairing as part of the authored entry
   contract; changing the Document shell requires rechecking the scope.
2. Preserve the existing 16/16 probe and streaming checks as the seam regression
   gate.

No shared Cloudflare account was used and no Worker was deployed by this spike.
