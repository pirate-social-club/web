# Home feed performance decision

Date: 2026-08-12

## Decision

Defer feed virtualization. The measured long-feed problem is batched row mount
cost during pagination, not steady-state reconciliation or scrolling cost.
Variable-height windowing would add scroll anchoring, height measurement,
overscan, and restoration complexity without addressing a demonstrated scroll
bottleneck.

Keep append latency and playback transitions as targeted follow-ups. If a
production-profiled append remains visibly blocking, investigate `PostCard`
mount cost, smaller or progressively mounted pages, and `content-visibility`
before adopting full virtualization.

## Scope and method

The benchmark exercised the authenticated home route at web commit
`f841c4545d76646fa3f1334e48106f76bb754008`, after the per-post projection cache
and stable feed-action work landed. A deterministic mock API appended 40 posts
per page. Media bytes were fulfilled locally to exclude external network
variance.

Temporary instrumentation wrapped the real `Feed` with `React.Profiler` and
recorded browser long tasks. It did not replace `PostCard`. The browser used a
1280 by 900 viewport. The final feed contained 320 mounted posts, 13,515 DOM
nodes, a 133,146 px document height, and approximately 93 MiB of reported JavaScript
heap.

These are development-build results. They establish scaling behavior and locate
the expensive phase, but they must not be compared directly with production
React timing thresholds.

## Results

### Page append growth

| Posts before | Posts after | React total (ms) | Commit p95 (ms) | Long tasks | Long-task maximum (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 40 | 80 | 611.4 | 124.9 | 9 | 264 |
| 80 | 120 | 439.9 | 349.6 | 4 | 482 |
| 120 | 160 | 473.6 | 317.1 | 3 | 420 |
| 160 | 200 | 534.1 | 308.1 | 3 | 435 |
| 200 | 240 | 438.4 | 231.9 | 2 | 337 |
| 240 | 280 | 446.5 | 260.4 | 2 | 382 |
| 280 | 320 | 483.5 | 272.4 | 2 | 420 |

After the first warm-up append, mounting each 40-post page consumed roughly
438–534 ms of development React work. The cost did not increase as the retained
feed grew from 80 to 320 posts. This corroborates the render regression test:
pagination work scales with the new page rather than the complete accumulated
feed.

### Full-length scroll

Scrolling across all 320 mounted posts produced 50 React commits totaling
20.5 ms. Commit p95 was 0.8 ms, the maximum was 1.1 ms, and the browser reported
no long tasks. A separate pass measured a 0.9 ms p95 and 1.4 ms maximum, also
with no long tasks.

This is the decisive virtualization result. Retaining 320 rows did not produce
material React or browser main-thread cost during the measured scroll.

### Other interactions

- A vote mutation produced two commits totaling 3.6 ms, with a 2.8 ms maximum.
- The attempted fresh-object scenario produced no React commits and is not a
  valid measurement of auth or feed refresh behavior.
- The playback scenario included one 357.9 ms development React commit and one
  595 ms long task. The current sample cannot distinguish initial media setup
  from an expensive card update. Because the activated row is visible,
  virtualization is not assumed to solve this result.

## Interpretation

The per-post projection cache is working: append cost is approximately flat as
the retained feed grows. Memoized rows also keep steady-state scrolling well
below the previously selected 8–10 ms React p95 budget, even in a slower
development build.

Pagination still mounts 40 complex cards in a burst. Full virtualization would
avoid mounting off-screen additions, but that benefit must be weighed against
the feed's variable heights, asynchronous media, translations, expanded text,
commerce surfaces, and scroll restoration requirements. The current evidence
does not justify that trade.

## Revisit triggers

Reconsider the decision when any of these is observed in a production-profiled
route:

- accumulated-feed scrolling exceeds an 8–10 ms React commit p95;
- scrolling produces repeatable long tasks or visible dropped frames;
- retained-feed memory becomes a demonstrated device constraint;
- a production page append causes a repeatable user-visible main-thread stall;
- product requirements introduce substantially denser or more dynamic rows.

Before full windowing, evaluate the cheapest intervention matching the observed
cost: `PostCard` mount profiling, a smaller page size, progressive insertion, or
`content-visibility`. Preserve stable post keys, row identities, and scroll
position in any implementation.

## Measurement limitations

- The run used a development build because the attempted production build was
  stopped under workstation memory pressure.
- The sample used deterministic mocked data rather than a production account's
  exact content distribution.
- The auth-refresh and wallet-refresh scenarios remain unmeasured.
- The playback sample requires a narrower trace before it can support a code
  change.

No benchmark-only instrumentation belongs in production. The temporary
Profiler wrapper, profiling alias, and browser drivers were removed after this
record was written.
