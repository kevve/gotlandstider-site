# Content-source test coverage

This mapping was written before changing source selection. The final split retains
all 47 original contracts: ten once-only tests and 37 Markdown browser/request
tests. Eight controlled Sanity cases add deterministic query/adapter/rendering
coverage. Trusted CI then runs five live Sanity integration tests (four request
checks and one representative browser). Forks run the same controlled contracts
and full Markdown regression without secrets.

| Existing spec / contract                                                                                    | Retained test and layer                                                                                           | Source                       |
| ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `canonical-video.spec.ts`: nine video normalization, cover fallback, sitemap and query contracts            | Same file, selected by `playwright.contracts.config.ts`                                                           | Once, server-free            |
| `redirects.spec.ts`: coherent map                                                                           | `contracts/redirect-map.spec.ts`, unchanged assertions                                                            | Once, server-free            |
| `redirects.spec.ts`: target existence and mapped legacy absence                                             | Existing request tests; live route integration also checks the union of raw published routes and redirect targets | Markdown; Sanity requests    |
| `articles.spec.ts`: inventory, colors, layouts, bylines, media and privacy                                  | All 11 existing browser tests; archive now checks raw uniqueness before comparing inventory                       | Markdown                     |
| `categories.spec.ts`: all nine inventory/SEO, keyboard, mobile and no-JavaScript tests                      | All original browser tests; live category inventory/SEO uses parsed HTML with independent raw expectations        | Markdown; Sanity requests    |
| `homepage.spec.ts`: five navigation, random-card, highlight, menu and focus-restoration tests               | Same file                                                                                                         | Markdown; manual full Sanity |
| `internal-links.spec.ts`: first-party links/assets                                                          | Original browser/request test; dynamic equivalent in `sanity/full-sanity.spec.ts`                                 | Markdown; manual full Sanity |
| `json-ld-security.spec.ts`: hostile metadata remains data in a browser                                      | Same browser test, never replaced by a string-only check                                                          | Markdown; manual full Sanity |
| `routes-and-seo.spec.ts`: eight public/draft/legacy routes, Swedish SEO, feeds, discovery and sitemap tests | All original tests; five `sanity/live-integration.spec.ts` cases independently cover the live source              | Markdown; Sanity integration |

## Controlled Sanity coverage without credentials

The 18 once-only tests use no site build or listening preview server. Four
renderer cases use Astro's container and Vite in middleware mode to load the
real components. No new test framework was introduced. `groq-js` and `parse5`
were already transitive dependencies and are now explicit test dependencies.

The actual `SANITY_ARTICLES_QUERY` is evaluated against controlled published,
draft and missing-slug documents. Removing its draft predicate demonstrably
breaks the expected inventory. Another case resolves actual asset/location
references and video fields through that query, then the production mapper.
The mapper was moved unchanged into a module without the `sanity:client` virtual
import, allowing direct tests of projection handling and an inconsistent primary
location failure.

The real `ArticleBody.astro` renderer receives duplicate headings and a marked
link; tests verify distinct anchors, the link and rejection of an empty body.
The actual category page receives both an empty and populated article list;
its empty state and `noindex, follow` metadata must change accordingly. These
negative cases remain meaningful even if production has no drafts, no empty
categories or no articles using a particular Portable Text feature.

## Trusted Sanity integration

`npm run test:sanity` requires a token before starting its production-source
build. The five tests then compare all three feeds, every published route,
article JSON-LD/media/canonical metadata, category/archive inventory and covers,
sitemap/video metadata, robots, `llms.txt` and discovery resources with a separate
raw Sanity query. Four cases use HTTP requests and parsed HTML; only representative
Portable Text rendering uses a browser. The production-source build remains real.

The oracle uses the explicit `raw` HTTP perspective, includes actual draft slugs,
and excludes release versions from its published inventory. Draft-only slugs must 404. An unpublished revision sharing a published slug must not make that public
route disappear; feed/page fields are compared with the published record instead.
Exact inventories also reject extra leaked entries and duplicate cards. No feed
is the sole oracle for another generated resource.

No live expectation names a production title, date or Markdown slug. A separate
read-only snapshot is cached per test worker. Publishing during a build/test run
can produce a real snapshot mismatch; tests fail rather than accepting inconsistent
outputs. No test writes production content. The token is loaded from the same
production environment configuration as the build and is not included in reports.

## Manual full Sanity mode and coverage tradeoff

`npm run test:sanity:full`, or CI's manual `full_sanity` boolean, selects the five
integration tests plus five dynamic browser cases and the six unchanged homepage/
JSON-LD security tests. It builds Sanity once. Each discovered article retains the
exhaustive desktop layout bounds, canonical/video privacy, raw byline dates and
primary-tag checks. The additional cases cover archive uniqueness, category
membership/keyboard state, mobile layouts, same-origin resources and navigation
with JavaScript disabled. There is no recurring schedule.

The deliberate tradeoff is removing repeated execution of the shared visual suite
against live Sanity on every trusted change. Exact Markdown fixture geometry
(two-date identity/avatar sizing, 543/544px byline alignment, a specified narrow
copy-wrap state and cross-placement color fixtures) remains in the full deterministic
regression suite. Manual Sanity is an exhaustive live-content compatibility suite,
not a promise that mutable editorial data contains each of those fixed fixture
states. It requires enough published articles for related-story behavior, as did
the former live suite. Neither mode checks third-party playback availability.

## Why CI runs one Astro/TypeScript check

This decision was checked against PR 1, not inferred from two successful logs:

- `astro.config.mjs` enables the same Sanity integration and plugins in either
  source. Its only source-specific configuration branch validates the value and
  requires the token. The Sanity build still exercises that guard.
- `src/content.config.ts` always loads the same Markdown collection/schema;
  source selection happens at runtime in `src/lib/content.ts`.
- `@sanity/astro` 3.5.1's configuration hook injects the same client/Studio plugins
  for either source and does not generate source-specific declaration files.
- Astro 7.2.10's check command performs sync, then checks the complete tsconfig
  graph. The checked-in `src/sanity.types.ts` is not regenerated by either command.
- All four generated/static declaration hashes were identical after the two
  source checks. Deliberate type errors in the Sanity adapter and `ArticleBody`
  were detected by **both** configurations. Both final configurations also pass
  with the expanded test tree and zero diagnostics.

CI keeps `check:markdown`, both production builds, the required `verify` job name,
and the existing trusted/fork condition. Configuration or generation changes
should revisit this decision. `npm run check` remains available manually.

## Rollback

This PR stacks on the browser-fixture/report PR. Merge that PR first, retarget this
PR to `main`, and rerun its required check on the final base before merging. Revert
this PR first to restore duplicate full-source execution and both typechecks;
then revert the fixture/report PR if desired. Deployment remains independent and
unchanged. Measurements and validation are recorded in `test-suite-performance.md`.
