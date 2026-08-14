# SolidStart Migration Architecture Audit Specification

## Purpose

Audit whether Pirate Web should remain on React and RedwoodSDK, incrementally
adopt framework-neutral feature cores, or migrate some or all of the web
application to SolidJS and SolidStart.

This is an evidence-gathering and recommendation task. It does not authorize an
implementation, dependency changes, production changes, or broad local builds.

The audit must determine whether a migration would produce meaningful gains in:

- maintainability and feature-development speed;
- client and server performance;
- reliability of stateful workflows;
- bundle size and browser resource usage;
- architectural clarity and testability;
- operational simplicity on Cloudflare;
- long-term ecosystem and maintenance risk.

The audit must separately measure benefits attributable to:

1. ordinary refactoring and better boundaries;
2. Solid's reactive model;
3. SolidStart's framework and routing model;
4. removal of React, React Server Components, or RedwoodSDK.

Do not credit Solid for improvements that could be obtained with the same
framework-neutral extraction while retaining React.

## Repository and Safety Context

The repository root is:

```text
/home/t42/Documents/pirate-workspace/web
```

Read and follow the workspace and repository `AGENTS.md` files before running
commands. In particular:

- Prefix every shell command with `rtk`.
- Do not start Redwood/RWSDK development servers.
- Do not run broad type checks, builds, or validation commands unless explicitly
  authorized.
- Prefer read-only inspection and focused analysis.
- Do not modify application code as part of the audit.
- Never write personal names. Use role identifiers where an actor must be named.

The audit may create only its final report unless a separate implementation or
prototype is explicitly authorized.

## Required Decision Context

Before scoring opportunity cost or recommending migration work, obtain and
record these inputs from the project owner or an authoritative planning source:

- the top three product or platform priorities for the next two quarters;
- committed or likely work involving video Home, HNS, rewards, bookings, auth,
  wallets, messaging, and other affected surfaces;
- available human and agent capacity;
- the maximum acceptable period of dual-stack operation;
- the maximum acceptable feature-delivery slowdown;
- a completed project that can anchor effort estimates, preferably with elapsed
  time, changed surface area, and delivery impact;
- current performance objectives or budgets and the routes that matter most.

Do not infer missing business inputs from source-code activity. If they cannot
be obtained, mark opportunity-cost and schedule conclusions as low confidence
and do not issue an unconditional migrate recommendation. Effort terms such as
small, medium, or large must be calibrated against the supplied completed-project
anchor. If no suitable anchor is available, report ranges as uncalibrated.

## Audit Phases and Early Termination

Run the audit sequentially. Do not perform the expensive broad audit before the
cheap disqualifiers are resolved.

### Phase A: feasibility kill checks

Audit only:

1. Privy Core JS parity for required auth, custody, wallet, migration,
   authorization-signature, and sponsored-relay flows;
2. XMTP Browser SDK signing and lifecycle without React;
3. SolidStart v2 on Cloudflare for required bindings, Durable Objects, service
   bindings, middleware, CSP nonces, headers, SSR, routing, and deployment.

A confirmed hard failure with no safe, supportable adapter ends the migration
case. Produce a short `refactor only` report naming the failed gate and the
external change that would justify reopening it. Unknown or undocumented is not
automatically a failure: seek installed-package evidence, a focused prototype if
authorized, or provider confirmation.

### Phase B: current-state baseline

Establish whether a user-visible or engineering deficit exists before proposing
a replacement. Collect available RUM and production-equivalent lab evidence for
the highest-value representative routes, including:

- INP and interaction latency distributions;
- LCP and TTFB;
- route-level shipped and executed JavaScript;
- hydration/startup CPU and main-thread long tasks;
- memory during sustained video, chat, or other representative use;
- Worker CPU or SSR timing where observable;
- recent defects or engineering friction attributable to state/lifecycle
  architecture rather than product requirements.

If current performance meets the declared objectives and no material
user-visible deficit is established, strike performance as a migration driver.
It may remain a secondary benefit, but the recommendation must then stand on
maintainability, delivery, or risk evidence.

If production RUM is unavailable, state that limitation and use a reproducible
production-build lab baseline. Do not substitute framework benchmark results for
an application baseline.

### Phase C: architecture and counterfactual audit

Only after Phases A and B, perform the organization, maintainability,
dependency, target-architecture, and React-refactor analysis below. Give the
React counterfactual evidence and costing comparable depth to the Solid target.

### Phase D: comparative proof of concept

Only if the earlier phases leave migration credible, propose or, when separately
authorized, build matched refactored-React and Solid variants. Compare Solid
against the refactored React variant, never only against today's code.

### Phase E: independent adversarial review

The primary auditor must not be the final judge of their own report. A second,
independent agent must red-team the completed draft and evidence appendix. Give
the reviewer an explicit status-quo prior and ask them to identify unsupported
claims, asymmetric treatment, movable thresholds, missing counterfactual costs,
and conclusions not entailed by evidence. Preserve disagreements in the final
report and reconcile them explicitly; do not silently rewrite them away.

If independent-agent review is unavailable, run two separately prompted passes:
one prosecuting migration and one defending the status quo. Label this weaker
substitute in the report.

## Current Architecture Hypothesis

Treat the following as hypotheses to verify, not conclusions to repeat:

- RedwoodSDK supplies Cloudflare-oriented request handling, React Server
  Components, SSR, hydration, server functions, and client navigation.
- Most interactive application routes enter a large client-rendered React shell.
- Business and protocol logic is partly separated from React, especially API
  contracts, bookings, karaoke, crypto, formatting, and some workflow helpers.
- Complex features frequently combine API/cache state, workflow decisions,
  effects, refs, timers, view-model construction, and rendering.
- Solid could simplify fine-grained interactive state, but a mechanical JSX and
  hooks translation would preserve the existing architectural complexity.
- Cloudflare deployment is likely feasible with SolidStart v2, but its routing,
  middleware, SSR, server-function, binding, and deployment semantics are not a
  drop-in replacement for RedwoodSDK.
- Privy's `@privy-io/js-sdk-core` removes React as a fundamental authentication
  and embedded-wallet requirement, but feature parity for external wallets,
  linking, migrations, authorization signatures, and sponsored relay must be
  verified.
- XMTP's Browser SDK is framework-neutral; its current dependency on React is
  primarily application lifecycle/state binding and access to a wallet signer.

## Required Audit Questions

### 1. Code organization and boundaries

Map the effective architecture rather than relying only on directory names.

Determine:

- which modules own domain rules, remote state, local UI state, effects,
  subscriptions, navigation, presentation, and provider integration;
- whether dependency direction is clear and enforced;
- where React types or hooks leak into otherwise portable logic;
- where route modules act as composition roots versus oversized controllers;
- where state ownership is duplicated or synchronized through effects and refs;
- whether public, authenticated, Telegram, desktop, and sovereign-host flows
  share appropriate cores or duplicate behavior;
- which compatibility paths are deliberate and which are accidental debt;
- how consistently the primitive/composition/route/state/helper structure is
  followed.

Identify at least ten representative modules across these areas:

- application shell and routing;
- video feed/playback;
- chat and XMTP;
- authentication and wallets;
- post creation and post state;
- community moderation and gates;
- bookings or commerce;
- verification;
- design-system primitives;
- framework-neutral packages.

For each representative module, classify logic as:

- framework-neutral and reusable unchanged;
- reusable after a small extraction;
- coupled to React but conceptually portable;
- coupled to RedwoodSDK/RSC;
- view code requiring a rewrite;
- obsolete, duplicated, or a candidate for deletion.

### 2. Maintainability diagnosis

Find concrete maintenance costs. Examples include:

- large files with multiple reasons to change;
- long prop chains or broad context values;
- effects used to synchronize derived state;
- stale-closure or dependency-array hazards;
- state split between query cache, component state, refs, and storage;
- controllers whose lifecycle exists only because they are hooks;
- network calls embedded in presentation components;
- duplicated loading/error/optimistic-update behavior;
- tests coupled to React implementation details;
- abstractions with unclear ownership or misleading directory placement.

Do not use file size alone as proof of poor design. Cite the responsibilities
that make a file difficult to change.

Also identify strengths that should be preserved. The report must not frame a
mature, complex product as disorganized merely because it is large.

### 3. React refactor counterfactual

Describe the best credible architecture while retaining React and RedwoodSDK.
Include:

- framework-neutral feature services/controllers;
- reducers, state machines, external stores, or event-driven models where useful;
- smaller RSC/client boundaries;
- narrower contexts;
- query ownership and cache policy;
- route-level decomposition;
- test migration away from hook implementation details.

Estimate what portion of the expected maintainability and performance gain can
be achieved without changing frameworks.

### 4. Solid and SolidStart target architecture

Describe a credible target architecture, not a mechanical source translation.
At minimum, address:

- Solid signals, stores, resources, effects, and lifecycle ownership;
- Solid Query versus SolidStart queries/actions;
- SSR, streaming, hydration, and client navigation;
- file-based versus explicit routing and how existing route semantics map;
- request middleware, security headers, CSP nonces, canonical URLs, SEO, and
  special response routes;
- Cloudflare Worker entry points and bindings;
- D1, R2, Durable Objects, service bindings, queues, and environment access where
  applicable;
- Telegram Mini App and sovereign-host routing behavior;
- desktop-shell implications;
- error boundaries and observability;
- Storybook and component-test strategy;
- coexistence during an incremental migration.

Make explicit whether SolidStart v2 is stable enough for the proposed use and
which conclusions depend on release-candidate, newly documented, community, or
provider-specific behavior.

### 5. Third-party dependency parity

Produce a dependency matrix covering at least:

- `@privy-io/react-auth` and `@privy-io/js-sdk-core`;
- `@xmtp/browser-sdk`;
- `@tanstack/react-query` and `@tanstack/solid-query`;
- Radix UI and Base UI primitives;
- Vidstack;
- Sentry;
- Storybook;
- React Testing Library and likely Solid testing replacements;
- Sonner;
- Phosphor and Web3 icons;
- QR-code rendering;
- Story Protocol and Viem;
- Agora;
- verification SDKs;
- ALTCHA;
- any other production dependency with meaningful React coupling.

For every dependency, record:

- current role in Pirate Web;
- whether its core is framework-neutral;
- official Solid support, community support, Web Component support, or no support;
- required replacement or adapter;
- security/correctness sensitivity;
- migration difficulty;
- bundle/runtime implications;
- confidence and evidence source.

For every provider integration, also record who owns security and compatibility
maintenance after migration. In particular, compare the ongoing burden of
Privy's high-level React SDK with direct ownership of Core JS initialization,
secure iframe lifecycle, message handling, session restoration, signer plumbing,
and UI flows. Feature parity alone is not sufficient.

#### Privy parity gate

Do not conclude that Privy requires React. Audit the documented and installed
capabilities of `@privy-io/js-sdk-core` against actual application usage.

Verify parity for:

- initialization and returning-session restoration;
- access-token refresh;
- email, OAuth, custom-token, SIWE, and other authentication methods actually in
  use;
- user state and logout;
- embedded Ethereum wallet creation and restoration;
- EIP-1193 provider access;
- message signing used by XMTP;
- transaction submission;
- external-wallet connection and linking;
- wallet reconnection;
- embedded-wallet migration;
- user authorization signatures;
- sponsored transaction relay;
- server/SSR safety and secure-context iframe lifecycle.

Mark undocumented or uncertain capability as unknown, not unsupported. Identify
questions requiring confirmation from the provider.

### 6. Performance analysis

Assess expected changes to:

- shipped JavaScript by route;
- parse, compile, hydration, and startup CPU;
- main-thread long tasks;
- interaction latency and INP;
- memory use;
- update cost for feeds, chat, playback, timers, forms, and overlays;
- SSR CPU and memory on Cloudflare Workers;
- TTFB and streaming behavior;
- client-navigation payloads and round trips;
- LCP and media startup;
- caching and API waterfalls.

Distinguish framework effects from network, API, CDN, media-decoding, wallet,
XMTP, and third-party initialization costs.

Do not make numerical performance claims without measurements or an explicit
benchmark plan. Synthetic framework benchmarks may inform a hypothesis but are
not evidence of Pirate Web's real-world improvement.

Use the Phase B current-state baseline. If it did not establish a relevant
deficit, do not award migration points merely because a proof of concept is
faster in isolation.

If no prototype is authorized, specify a benchmark design that could falsify the
performance hypothesis. It should compare the same representative feature and
data flow across React and Solid, including production bundles and lower-end
mobile CPU conditions.

### 7. Migration strategies

Evaluate at least these options:

1. Remain on React/RedwoodSDK and perform targeted architecture refactoring.
2. Extract framework-neutral feature cores first, defer the framework decision.
3. Introduce an isolated Solid application or route while retaining the current
   application.
4. Incrementally replace feature surfaces with a dual-runtime boundary.
5. Build a parallel SolidStart application and cut routes over by cohort.
6. Perform a full replacement.

For each option assess:

- user-visible benefit;
- engineering effort and duration calibrated against the required
  completed-project anchor;
- delivery slowdown and opportunity cost;
- rollback and coexistence strategy;
- duplicated runtime or infrastructure cost;
- test and release implications;
- likely failure modes;
- conditions under which the option becomes preferable.

Explicitly test the dominance argument for extracting framework-neutral cores
while deferring the framework decision. Because that work can improve the
current application and lower the cost of a later migration, explain why any
immediate framework migration dominates it before recommending one.

Do not recommend a big-bang rewrite without demonstrating why incremental
coexistence is infeasible.

### 8. Refactoring opportunities independent of migration

Produce a prioritized backlog of concrete extractions or decompositions. Each
item must include:

- affected modules;
- current mixed responsibilities;
- proposed boundary;
- whether it is framework-neutral;
- expected maintenance or performance benefit;
- risk;
- focused verification strategy;
- whether it should happen before any migration decision.

Candidates should be discovered from the code, but inspect at least:

- video feed and playback coordination;
- chat controller and XMTP session lifecycle;
- Privy auth/wallet bridge;
- post creation workflow;
- post query/mutation state;
- community gate editor;
- route composition and shell state;
- query definitions and cache mutation;
- modal/toast/navigation side effects.

## Evidence Standards

Every material finding must cite one or more of:

- repository file and line number;
- dependency manifest or installed package exports/types;
- focused static count with the command recorded;
- official current documentation;
- a reproducible benchmark or focused test.

For current framework and provider capabilities, use current official sources.
Clearly label inference. Do not rely on old SolidStart v1 material when making
claims about v2.

Avoid vanity metrics. Counts such as hooks, contexts, TSX files, or lines of code
are supporting context, not conclusions.

Compare ecosystem risk symmetrically. RedwoodSDK is a specialized dependency and
must be evaluated for maintenance activity, release stability, bus factor,
security response, documentation, Cloudflare alignment, and exit options using
the same standards applied to SolidStart.

Assess AI-agent implementation fluency separately from general ecosystem size.
Evaluate framework representation in current documentation and examples,
frequency of incorrect generated patterns, availability of reliable linting and
tests, and the expected review burden. Do not assume that syntactic familiarity
equals correctness; support claims with a small blinded task or documented
repository experience where possible.

Use these confidence levels:

- **High:** verified directly in code, installed types/exports, or current official
  documentation.
- **Medium:** strong architectural inference with supporting evidence.
- **Low:** plausible but requires a prototype or provider confirmation.

## Required Scoring Model

Score each option from 1 to 5, with a short justification, using the fixed
weights below. Higher is always better; therefore score safety instead of risk,
simplicity instead of complexity, and cost efficiency instead of raw cost.

- maintainability after completion: **14%**;
- near-term delivery speed: **10%**;
- long-term feature velocity: **12%**;
- client performance against the established deficit: **10%**;
- server/edge performance against the established deficit: **4%**;
- ecosystem health and fit: **7%**;
- AI-agent implementation fluency: **7%**;
- provider parity and supportability: **8%**;
- migration safety: **8%**;
- operational simplicity: **5%**;
- rollback safety: **5%**;
- testability: **5%**;
- engineering cost efficiency: **5%**.

Calculate the weighted result, but do not let it override a failed hard gate.
Include a sensitivity analysis that varies each weight by plus or minus 50% and
reports whether the recommendation changes. Do not change the weights after
evidence collection; proposed alternative weights may appear only in the
sensitivity analysis.

### Pre-registered proof-of-concept thresholds

Migration does not pass the comparative proof-of-concept gate unless the Solid
variant, compared with the equally refactored React variant, satisfies all
correctness and accessibility requirements and achieves:

- at least **20% less compressed, route-attributable shipped JavaScript** for the
  representative route;
- at least **20% lower median hydration/startup main-thread CPU**, or at least
  **50 ms lower p75 interaction latency** under the same 4x CPU-throttled lab
  scenario, without a regression greater than 5% in the other measure;
- at least **25% fewer manually reviewed reactive-coordination sites**, defined
  before implementation as effects, lifecycle handlers, synchronization refs,
  subscription bridges, and memoization constructs required for correctness;
- no material regression in SSR timing, memory, accessibility, test coverage,
  operational complexity, or provider behavior.

Report confidence intervals or run-to-run spread and use enough repeated runs to
avoid treating noise as a pass. These are necessary, not sufficient, thresholds:
passing them does not by itself outweigh migration cost or roadmap impact.

## Required Deliverable

Write the final audit to:

```text
/home/t42/Documents/pirate-workspace/web/docs/solidstart-migration-architecture-audit.md
```

Use this structure:

1. Executive conclusion
2. Supplied decision context and missing business inputs
3. Phase A feasibility kill-check results
4. Current-state performance and engineering-pain baseline
5. Decision and confidence
6. Current architecture map
7. Organizational strengths
8. Maintenance pain points
9. React refactor counterfactual
10. SolidStart target architecture
11. Dependency parity matrix
12. Privy Core JS parity findings
13. XMTP and wallet-signer findings
14. Performance hypotheses and evidence
15. Migration-option comparison
16. Prioritized framework-neutral refactoring backlog
17. Recommended proof-of-concept
18. Go/no-go gates
19. Risks and unknowns
20. Evidence appendix with commands and sources
21. Independent adversarial review and unresolved disagreements

The executive conclusion must answer directly:

- How clean and maintainable is the current organization?
- What are the top five structural problems?
- How much improvement is available without leaving React?
- What additional improvement is plausibly attributable to Solid?
- Is SolidStart likely to make feature work meaningfully easier?
- Is the expected performance gain material for Pirate Web?
- What should be done next?

## Recommended Proof-of-Concept Shape

The audit should select a proof-of-concept only after examining the code. A good
candidate should exercise difficult architecture rather than a trivial static
page.

The preferred candidate will cover most of:

- a framework-neutral stateful controller;
- server data and cache behavior;
- a subscription, timer, or media lifecycle;
- optimistic mutation or command execution;
- authentication or wallet access where safe;
- route SSR and hydration;
- meaningful interactive rendering;
- focused tests and measurable production output.

Potential candidates include chat/XMTP or the video feed. Explain the choice.

The proof-of-concept plan must define comparable React and Solid variants and
measure:

- implementation size and conceptual complexity;
- state ownership and effect count;
- production JavaScript size;
- hydration/startup CPU;
- interaction latency under CPU throttling;
- memory during sustained use;
- SSR timing where applicable;
- test clarity;
- defects or parity gaps encountered.

Freeze the exact feature scope, fixtures, browser/runtime versions, build mode,
device or CPU-throttle profile, network profile, measurement scripts, and the
pre-registered thresholds above before implementing either variant. Where
possible, have different agents implement the two variants and a third agent run
the measurements.

## Decision Gates

Recommend proceeding beyond refactoring only if evidence supports all applicable
gates:

- Privy Core JS can satisfy required custody, auth, wallet, migration, and
  authorization-signature flows, or a safe alternative is accepted.
- XMTP signing and lifecycle work without a React dependency.
- Cloudflare bindings, routing, headers, CSP, SSR, and deployment behavior have a
  credible production path.
- A representative Solid implementation is materially clearer or faster than
  the refactored React equivalent under the pre-registered thresholds.
- The gain remains meaningful after accounting for migration cost and dual-stack
  operation.
- Accessibility and design-system behavior have viable replacements.
- Test and Storybook replacements meet required coverage and reliability.
- Incremental rollout and rollback are possible without jeopardizing production
  auth, wallet, payment, messaging, or sovereign-host flows.
- An independent adversarial review has not found an unreconciled evidence or
  methodology defect capable of changing the recommendation.

If the evidence does not meet those gates, recommend the highest-value
framework-neutral refactoring plan and state what future evidence should reopen
the framework decision.
