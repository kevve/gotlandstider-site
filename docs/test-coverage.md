# Content-source test coverage

The site has two content sources with different risks. The tests intentionally
run the shared visual and interaction regression suite against deterministic
Markdown once, and reserve Sanity runs for source-bound contracts.

| Contract                                                                                                                                                                | Layer                            | Source   | Expectation source                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | -------- | ------------------------------------------------------------- |
| YouTube normalization, cover fallback, video sitemap, Sanity query shape and redirect-map coherence                                                                     | Server-free unit contracts       | Once     | Controlled values and source modules                          |
| Layout, responsive states, keyboard navigation, no-JavaScript navigation, JSON-LD injection safety, redirect targets and public resources                               | Full browser regression          | Markdown | Checked-in Markdown fixtures                                  |
| Published inventory, draft exclusion, article/category routes and membership, Portable Text, covers, videos, canonical URLs, feeds, sitemaps and `llms.txt`             | Trusted Sanity integration       | Sanity   | Independent raw Sanity GROQ queries plus controlled documents |
| Every discovered live article route, category, homepage/category interactions, responsive and no-JavaScript behavior, resource checks, video privacy and article layout | Manual full Sanity browser suite | Sanity   | Raw published inventory queried at run time                   |

## Server-free contracts

The ten existing inexpensive contracts run once with no Astro build or web
server: nine canonical-video/query/cover tests and redirect-map coherence.
They must not be included in either browser source run.

The controlled Sanity query fixture contains a published article, a
`drafts.*` article and an article without a slug. It executes the production
`SANITY_ARTICLES_QUERY` through `groq-js`. The expected inventory contains
only the published document. A deliberately weakened draft predicate is also
evaluated and must make the assertion fail, so the draft check cannot pass
vacuously. These fixtures are local and no test writes to the production
dataset.

## Trusted Sanity integration

This suite requires `SANITY_API_READ_TOKEN` and fails before a build if the
token is absent. It never skips live assertions. Its raw GROQ inventory query
is separate from the app feed query and returns published articles, draft
identifiers and the fields needed to form expectations. The resulting values
are compared with generated feed and route output; the generated feed alone
is never the oracle.

Live tests do not name production titles, dates or Markdown slugs. They choose
published documents dynamically, then compare page headings, Portable Text
headings/links, cover/video output, canonical metadata, feeds and sitemap
entries to the raw record. Draft identifiers are queried independently and
must stay absent from generated pages and discovery output.

Portable Text edge cases are also rendered through the real Astro component in
an Astro container using controlled content: duplicated headings receive stable
distinct anchors, link marks render as links, and an empty Sanity body throws.
Category empty-state and `noindex` behavior use controlled source data through
the page rendering seam rather than relying on the changing production
inventory.

## Manual full Sanity browser mode

The explicit manual option is deliberately exhaustive and dynamic. It walks
every raw published article route and category, then applies the existing
article layout/privacy, homepage/category interaction, responsive,
no-JavaScript and resource contracts with raw-inventory expectations where
content membership matters. This catches compatibility changes in editor data
that a representative smoke cannot. It costs more and is unsuitable for every
trusted change; it has no fixed production-content assertions, so ordinary
editorial changes do not require updating test fixtures.

The full mode cannot guarantee visual review of every possible text wrap or
third-party video availability. It retains every discovered route and the
source-specific layout/privacy checks, while the deterministic Markdown suite
is the stable visual baseline.
