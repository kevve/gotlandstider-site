# Test-suite optimization evidence

Measured 10 September 2026 against remote `main` at `92109e9` (the current
parent, rather than the audit checkout). The parent still has 47 tests:
29 browser, eight request-only, ten synchronous. Both sources passed all 47
in two baseline runs and two runs with the player fixture, without retries,
failures or skips. No assertions or coverage selections changed in this PR.

## Local measurements

Elapsed wall time includes the selected source build, Python preview startup,
Playwright startup, tests and HTML/JSON reporting. Runs were sequential with no
competing builds or browser suites: macOS arm64, Node 26.8.1, npm 11.19.0,
Playwright 1.62.1, bundled Chromium headless shell, `CI=1`, two workers, two
configured retries (none used), port 4327. The same installed lockfile dependencies
were copied into isolated worktrees. CI uses Node 24 on Ubuntu, so these are local
comparisons, not CI forecasts. Ordinary cache and live-network variation remains;
in particular, the first optimized Markdown run had slower startup.

Command in each worktree:
`CI=1 CONTENT_SOURCE=<source> PLAYWRIGHT_PORT=4327 npx playwright test --reporter=html,json`.
Report environment variables pointed each run at a unique evidence directory.

| Source   | Baseline run 1 | With fixture run 1 | Baseline run 2 | With fixture run 2 |
| -------- | -------------: | -----------------: | -------------: | -----------------: |
| Markdown |       17.260 s |           12.982 s |       16.977 s |            8.044 s |
| Sanity   |       13.698 s |            8.492 s |       13.288 s |            9.225 s |

The exhaustive 16-article desktop layout test fell from 5.407/7.001 s to
1.750/1.694 s on Markdown, and from 2.656/4.395 s to 1.987/2.076 s on Sanity.
It remains exhaustive. At this remaining cost, sampling or extra browser contexts
are not justified without another focused experiment.

## CI and coverage

The latest parent [CI run](https://github.com/kevve/gotlandstider-site/actions/runs/34498100062)
passed 47/47 for each source. Its verification job took about 94 seconds;
Chromium installation took 29 seconds, Markdown build/tests 18 seconds, Sanity
build/tests 14 seconds, and the two checks five seconds each. Older audited
112–116 second workflow runs are not treated as this change's current baseline.

The installed CLI supports `--only-shell`, and the configuration uses headless
Chromium without a channel override, matching [Playwright's supported shell-only
configuration](https://playwright.dev/docs/browsers#chromium-headless-shell).
GitHub runs are needed to measure download/install savings.

Each source now retains its own HTML report, JSON per-test timing report and
result/trace directory. Artifact uploads use `!cancelled()` so a failed test step
still uploads its evidence; tests keep their failing status. The protected branch
requires `verify`, whose name and fork behavior are unchanged.

The browser fixture automatically applies through the lazy context fixture,
including `javaScriptEnabled: false`. It only fulfills document requests to
`https://www.youtube-nocookie.com/embed/*`. The iframe URL remains visible to the
existing privacy assertions. Playback was never tested. First-party resources and
other external URLs continue to load. Request-only and synchronous tests do not
request a browser context.

Concurrency cancellation saves redundant runner work on superseded runs for the
same workflow and PR/ref. It does not accelerate one run. Deployment continues to
run independently; none of these changes shorten its critical path.

## Deferred changes

No worker/retry changes, sharding, browser cache or containers: no evidence that
setup cost and contention would pay off. No layout sampling, route/category
consolidation or cosmetic assertion removal: their remaining cost is small and
coverage is retained. Artifact reuse for deployment would change release ordering
and may increase publish latency; it is outside this test-only scope.

Rollback is a normal revert of this PR. If the subsequent content-source coverage
PR has been merged, revert it first, then this PR. Neither PR changes deployment.

Temporary validation probes also passed: request and pure tests used an invalid
browser executable path without launching it; first-party CSS, JavaScript and
images loaded normally; the iframe stub applied with JavaScript disabled.
Deliberate failures returned exit status 1 for each source, produced HTML/JSON
and retry traces, and the Sanity invocation preserved the Markdown artifacts.
Those temporary tests were removed, preserving the 47-test inventory. Generated
Playwright reports/results are excluded from formatting and typechecking so
retained report bundles are not mistaken for project source files.

## PR 2: content-source division

Measured 12 September against PR 1 (`bb67e47`) in the same macOS arm64,
Node 26.8.1/npm 11.19.0/Playwright 1.62.1 environment. Remote `main` remained
`92109e9`. Four sequences alternated parent → PR 2 → parent → PR 2, with no
concurrent builds or browser suites. `CI=1`, two workers, two configured retries,
port 4327 and native HTML/JSON reporters were identical. No successful test retried
or skipped.

Parent sequence: `check:markdown`, `test:markdown`, `check`, `test:sanity`.
PR 2 sequence: `check:markdown`, `test:contracts`, `test:markdown`, `test:sanity`.
Each step was invoked through `npm run`; wall time includes checks, builds,
preview/test startup and reports. Dependency/browser installation and artifact
upload are excluded. Caches and read-only live source latency can still vary.

| Step                           |     Parent 1 |   PR 2 run 1 |     Parent 2 |   PR 2 run 2 |
| ------------------------------ | -----------: | -----------: | -----------: | -----------: |
| First Astro/TypeScript check   |      5.299 s |      5.269 s |      5.008 s |      5.315 s |
| Once-only controlled contracts |            — |      3.363 s |            — |      3.340 s |
| Markdown build/tests           |      8.088 s |      7.827 s |      7.706 s |      8.030 s |
| Second Astro/TypeScript check  |      4.662 s |            — |      4.586 s |            — |
| Sanity build/tests             |      8.151 s |      3.360 s |      7.493 s |      3.537 s |
| Entire measured sequence       | **26.201 s** | **19.821 s** | **24.794 s** | **20.223 s** |

The parent passed 47 Markdown + 47 Sanity tests per sequence. PR 2 passed
18 controlled + 37 Markdown + five Sanity tests per sequence. All original
contracts remain, with shared regression execution removed from the second
source and eight deterministic Sanity cases added. See `test-coverage.md` for
the exact mapping and manual-mode limits. Routine trusted browser execution
falls from 58 cases to 30; this is reduced runner work, separate from elapsed
time. The optional full Sanity mode passed 16/16 locally without retries/skips.

Validation also included both final Astro/TypeScript configurations (74 files,
zero diagnostics), formatting, and focused negative probes. An empty local feed
and a duplicated local archive card each failed the new raw-inventory checks;
restoring the original outputs passed. A missing trusted token failed before
suite execution, while all 18 controlled tests passed with an empty token and
an invalid browser directory. Temporary mutations/configs were removed.

## Observed GitHub evidence

[PR 1 CI](https://github.com/kevve/gotlandstider-site/actions/runs/34500037294)
passed `verify` and dependency review. Both uploaded JSON reports confirmed
47 expected, zero skipped, zero unexpected and zero flaky. Its verification
job took 119 s versus the parent's 94 s: dependency installation rose from
10 to 41 s, browser installation fell from 29 to 19 s, and the two test steps
took 17 s each. This one run does **not** demonstrate a net CI speedup. The
local percentage is not extrapolated to GitHub or deployment latency.
