# Cloudflare Workers hosting migration

Status: production cutover to Cloudflare Workers Static Assets completed on
2026-09-13. GitHub Pages, its deployment workflow, `public/CNAME`, and its
secrets remain available as the rollback path during stabilization. Disabling
or removing that path requires separate Human Gate F approval.

## Architecture

Previous production (retained temporarily for rollback):

```text
GitHub push or Sanity webhook
  -> GitHub Actions
  -> Astro static build
  -> GitHub Pages
  -> Cloudflare CDN/DNS
  -> gotlandstider.se
```

Current production:

```text
GitHub push or pull request
  -> Cloudflare Workers Builds
  -> Astro static build
  -> Workers Static Assets

Sanity publish/unpublish/delete
  -> Sanity webhook
  -> private Cloudflare Deploy Hook
  -> Workers Build
```

GitHub remains the source of truth for repository history, branches, pull
requests, Issues, review, and Codex workflows. The Astro application remains a
static site; no SSR adapter or Worker runtime code is introduced.

## Repository configuration

`wrangler.jsonc` describes an assets-only Worker serving `./dist`. Its HTML
handling preserves directory-style trailing slashes, and its 404 handling uses
the generated Astro 404 page. It deliberately contains no custom domain, route,
account identifier, or secret.

Workers Static Assets otherwise emits temporary `307` redirects when adding a
directory slash. `public/_redirects` makes the existing article and category
canonicalization permanent `301` redirects, matching current production. It is
not an SPA fallback and does not replace the external www or legacy URL rules.

`public/_headers` keeps the public `workers.dev` staging and preview hostnames
out of search results without applying `noindex` to the production custom
domain. It also gives Astro's fingerprinted `/_astro/` assets a long immutable
browser lifetime; HTML and non-fingerprinted content retain Workers Static
Assets' safe revalidation default.

Node 24 is pinned in `.node-version`. Install and build from a clean checkout:

```sh
npm ci
npm run build
npm run cloudflare:dry-run
```

The build uses published Sanity content by default. The post-build check scans
`dist/` for the configured Sanity credential without printing its value and
fails if it is present in a public artifact.

## Environment variables

| Variable                   | Cloudflare location                     | Classification    | Phase      | Required                            |
| -------------------------- | --------------------------------------- | ----------------- | ---------- | ----------------------------------- |
| `SANITY_API_READ_TOKEN`    | Workers Builds secret                   | Secret            | Build only | Yes for Sanity builds               |
| `CONTENT_SOURCE`           | Workers Builds variable, value `sanity` | Non-secret        | Build only | Recommended explicitly              |
| `PUBLIC_SANITY_PROJECT_ID` | Workers Builds variable                 | Non-secret/public | Build only | Optional; repository default exists |
| `PUBLIC_SANITY_DATASET`    | Workers Builds variable                 | Non-secret/public | Build only | Optional; repository default exists |

`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ZONE_ID` remain GitHub Actions secrets
only while the Pages deployment and cache purge remain available for rollback.
They are not required by Workers Builds. Never put secret values in Wrangler,
repository files, pull requests, screenshots, or build logs.

The Sanity credential must be read-only and limited to the minimum dataset
access needed to query the private production dataset. Do not use draft-preview
or write-capable credentials for production static builds.

## Manual Cloudflare setup (Human Gates B and C)

These account-level steps were completed manually. Keep them as the operational
reference; do not automate account authorization or secret entry:

1. In Cloudflare, create/connect a Workers Builds project to
   `kevve/gotlandstider-site` using Cloudflare's GitHub App.
2. Grant the GitHub App access to this repository only.
3. Set the production branch to `main`.
4. Set the build command to `npm run build`.
5. Set the deploy command to `npx wrangler deploy`.
6. Set the non-production branch deploy command to
   `npx wrangler versions upload`.
7. Add `CONTENT_SOURCE=sanity` as a non-secret build variable.
8. Enter `SANITY_API_READ_TOKEN` directly as a build secret. Verify presence by
   name only.
9. Leave custom domains and production DNS unchanged. First verify the
   `workers.dev` and branch-preview deployments.

Limit the Cloudflare Workers and Pages GitHub App installation to this repository
only and review the permissions requested by the official app. Do not authorize
all repositories. No Cloudflare API token is needed in GitHub for Workers Builds.

Cloudflare's automatically generated build token currently includes KV, R2, and
Workers Routes edit permissions that this assets-only preview does not need. For
least privilege, the human administrator should instead configure a user token
scoped to the selected account with Account Settings read, Workers Scripts edit,
User Details read, and Memberships read. Do not grant KV or R2 access. Do not
grant zone-level Workers Routes access before the custom-domain cutover gate.

Preview builds should be limited to trusted first-party branches while the
private Sanity dataset requires a credential; do not expose the production read
token to untrusted fork code. Pull requests continue to receive secret-free
GitHub CI checks.

## GitHub Actions disposition

- `.github/workflows/ci.yml`: **KEEP**, with authenticated Sanity tests restricted
  to trusted `main` pushes and manual runs. Pull requests retain formatting,
  type, contract, browser, and dependency-review checks without secrets.
- `.github/workflows/deploy.yml`: **DISABLE AFTER CUTOVER**, but only after
  production is verified and the separate approval gate is complete.
- The Pages deployment workflow, cache-purge secrets, and `public/CNAME`:
  **REMOVE AFTER STABILIZATION**, with explicit approval. Until then they are the
  rollback path.

## Security findings

- The production Sanity build requires one read-only, build-time credential.
  Draft-preview and write-capable tokens are unnecessary and must not be used.
- Pull-request code previously received the Sanity credential for same-repository
  branches. This migration removes that exposure while preserving secret-free PR
  checks and trusted authenticated checks.
- The generated `dist/` is now scanned for the configured Sanity credential after
  every build mode. The scanner reports only filenames, never the credential.
- An npm audit on 2026-09-13 reported 13 build-tool findings (11 moderate and 2
  high) through the existing Sanity CLI/workbench dependency chain. Wrangler did
  not introduce any of the reported paths, and no runtime server packages are
  deployed. Track and resolve these in a separate compatibility-tested dependency
  PR; do not run an unrelated mass upgrade during this migration.

## Sanity deploy hook (Human Gate D)

The deploy path was configured manually after the Cloudflare staging deployment
was verified healthy:

1. The Cloudflare Deploy Hook targets `main`.
2. Its generated URL is a credential. Never inspect, commit, log, screenshot, or
   paste it into chat; rotate it if exposed.
3. The Sanity webhook targets the `production` dataset with HTTP `POST`.
4. Create, update, and delete events are enabled for published documents. Drafts
   and document versions are disabled.
5. The filter is `_type in ["article", "location"]`, so referenced location
   changes also rebuild generated article output.
6. The existing Sanity-to-GitHub webhook remains enabled during stabilization so
   GitHub Pages stays current and usable for rollback.

Publishing, unpublishing, or deleting a relevant document should trigger one
build. Failed hooks leave the last successful static deployment serving; inspect
Sanity delivery attempts and Workers build logs, then retry after correcting the
cause. Do not point a deploy hook back at Sanity or otherwise create a trigger
loop.

Do not create artificial production content only to test the webhook. Confirm the
end-to-end trigger on the next approved editorial publish, unpublish, or delete by
matching its Sanity delivery timestamp to a successful Workers build. The deploy
hook URL itself does not need to be viewed for that verification.

## Preview verification and cutover gate

Compare the non-production Cloudflare URL with current production before any
domain change. Record representative URLs and verify HTTP status, navigation,
articles, embedded videos, Sanity content, images/assets, canonicals, sitemap,
robots, metadata, Open Graph, structured data, redirects, the custom 404 page,
trailing slashes, mobile rendering, major browsers, HTTPS, and basic performance.

Verified non-production evidence on 2026-09-13:

- A clean Node 24 build generated 29 Astro pages and passed the post-build secret
  scanner.
- The `main` Workers deployment and a branch preview completed successfully.
- All 28 sitemap pages returned the expected status and matched production for
  title, canonical URL, description, H1, robots metadata, Open Graph metadata,
  and JSON-LD types.
- Sitemap output was byte-for-byte identical to production and contained 19
  video entries.
- Representative navigation, article, category, embedded-video, image, asset,
  redirect, trailing-slash, and custom-404 behavior passed.
- Desktop and mobile Chromium/Brave rendering passed without horizontal
  overflow. The mobile menu and responsive navigation behaved correctly.
- The `workers.dev` hostname returns `X-Robots-Tag: noindex`; fingerprinted
  `/_astro/` assets return an immutable one-year browser cache policy.
- HTTPS and basic performance checks passed. No mixed-content, redirect-loop,
  CORS, or CSP regression was observed.
- GitHub Pages remains configured with `gotlandstider.se`, and the Pages workflow
  remained active with a successful deployment after the Workers migration PRs.

Known staging-only differences:

- Cloudflare's zone-managed additions to `robots.txt` are not present on the
  `workers.dev` hostname. Verify them after the custom domain is attached.
- Plain HTTP behavior on `workers.dev` differs from the production zone. Verify
  the existing apex HTTP-to-HTTPS and www-to-apex rules immediately after
  cutover.

Pre-cutover routing inventory recorded on 2026-09-13:

| Host                   | Type  | Target            | Proxy   | TTL  |
| ---------------------- | ----- | ----------------- | ------- | ---- |
| `gotlandstider.se`     | A     | `185.199.108.153` | Proxied | Auto |
| `gotlandstider.se`     | A     | `185.199.109.153` | Proxied | Auto |
| `gotlandstider.se`     | A     | `185.199.110.153` | Proxied | Auto |
| `gotlandstider.se`     | A     | `185.199.111.153` | Proxied | Auto |
| `www.gotlandstider.se` | CNAME | `kevve.github.io` | Proxied | Auto |

There are no zone-level Worker Routes. Four active redirect rules must remain in
their current order:

1. `migrate-sommarens-konserter-slug`: the legacy concert article path redirects
   permanently to its current `/artiklar/` path.
2. `migrate-basta-strander-slug`: the legacy beach article path redirects
   permanently to its current `/artiklar/` path.
3. `Migrate legacy articles to artiklar`: `/articles` and `/articles/*` on apex
   or www redirect permanently to the corresponding `/artiklar` path on the
   apex.
4. `Canonicalize www to apex`: all www paths redirect permanently to the same
   path on `https://gotlandstider.se`.

Zone-wide Always Use HTTPS, TLS 1.3, and Automatic HTTPS Rewrites are enabled.
The apex is covered by active managed edge certificates. GitHub Pages uses the
custom domain `gotlandstider.se`, build type `workflow`, with `main` as its
configured source; Cloudflare currently provides HTTPS enforcement at the zone.

Production-cutover checklist:

- [x] Cloudflare preview deployment healthy
- [x] Clean build succeeds
- [x] Production-equivalent environment configured
- [x] Secrets configured manually
- [x] Main routes verified
- [x] Content verified
- [x] Assets verified
- [x] SEO metadata verified
- [x] Sitemap verified
- [x] robots.txt verified
- [x] Redirects verified
- [x] 404 verified
- [x] Sanity content verified
- [x] TLS/custom domain plan verified
- [x] Rollback procedure documented
- [x] Existing GitHub Pages deployment still operational
- [x] Human approval received

Before requesting cutover approval, record the exact existing apex and www DNS
records, proxy state, TTL, redirect rules, and Pages configuration. Do not store
unrelated DNS records or account data in the repository. Preserve the current
www-to-apex and legacy URL redirects.

## Manual production cutover (Human Gate E)

Human Gate E was approved and completed on 2026-09-13. Cloudflare would not add
the apex Custom Domain while the four externally managed GitHub Pages A records
were present. After separate confirmation for that deletion, only those four
records were removed and `gotlandstider.se` was immediately attached to the
existing `gotlandstider-site` Worker. Cloudflare created the managed apex Worker
DNS mapping. The proxied `www` CNAME, redirect rules, GitHub Pages configuration,
and all unrelated DNS records were left unchanged.

Cloudflare Workers Static Assets is the origin, so use a Worker Custom Domain,
not a Worker Route. A Custom Domain is an exact-hostname binding; the apex binding
does not include `www`.

Only after explicit Human Gate E approval:

1. Reconfirm the pre-cutover inventory above and that the latest GitHub Pages
   workflow is successful. Do not change the www CNAME or any redirect rule.
2. The apex currently uses four proxied GitHub Pages A records, not a CNAME, so
   Cloudflare's documented CNAME restriction does not apply. Do not pre-delete
   the A records. Use the Custom Domain flow and review its proposed DNS change;
   stop instead of deleting additional records if Cloudflare reports an
   unexpected conflict.
3. In Workers & Pages, open `gotlandstider-site`, then Settings > Domains & Routes
   > Add > Custom Domain. Add only `gotlandstider.se`.
4. Wait until the binding and automatically managed certificate are active. Do
   not bind `www.gotlandstider.se` to the Worker while www remains the redirecting
   hostname.
5. Confirm that the existing proxied www DNS record and redirect rule still send
   `www.gotlandstider.se` to `https://gotlandstider.se` in one hop.
6. Run the post-cutover checks for HTTPS, apex/www redirects, homepage,
   representative content, assets, sitemap, robots, canonicals, 404 behavior,
   cache headers, and current Sanity content.
7. Keep GitHub Pages, its deployment workflow, `public/CNAME`, and its secrets
   unchanged throughout the stabilization period.

## Post-cutover validation

Validation completed immediately after cutover on 2026-09-13 at approximately
21:34 CEST:

- The Worker Custom Domain `gotlandstider.se` is attached, and its Cloudflare-
  managed apex DNS mapping is present. HTTPS serves a trusted certificate.
- Workers deployment `37ba8a02` is active at 100% traffic from successful
  `main` build `20948b8`.
- `http://gotlandstider.se/` redirects once to the HTTPS apex; HTTP and HTTPS
  `www` requests redirect once to the same HTTPS apex URL.
- The homepage, article archive, representative articles, category archive,
  representative category, `sitemap.xml`, and `robots.txt` return `200`.
- A missing route and `/videos/` return `404`. There is no standalone video
  archive by design; embedded YouTube privacy-mode media renders within article
  and homepage content.
- Slashless canonical routes and all three legacy article redirect cases return
  `301` to the expected `/artiklar/` URL.
- The sitemap remains byte-for-byte identical to the pre-cutover version
  (`SHA-256 1c40c876b18e19b4740e3ab61256bd81500d5feeec2ed84f9ff48d2bd57840f1`),
  contains 28 page entries and 19 video entries, and every page entry returns
  `200`.
- Homepage and article canonical URLs, Open Graph URLs, descriptions, Article
  and VideoObject structured data, Sanity-derived content, and
  `youtube-nocookie.com` embeds are correct on the production hostname.
- The current fingerprinted CSS asset returns `200` with the intended immutable
  one-year cache policy. HTML retains revalidation caching.
- The production apex does not receive the staging-only `X-Robots-Tag: noindex`.
  The expected Cloudflare-managed content signals are present in `robots.txt`.
- A warm production request returned a verified TLS result, approximately 51 ms
  time to first byte, and approximately 52 ms total from the validation host.
- Desktop Brave rendered the homepage, primary navigation, current Sanity
  content, responsive images, an embedded video, and a representative article
  without an observed structural regression. The broader desktop/mobile checks
  completed before cutover remain applicable to the same static build.
- The retained GitHub Pages workflow completed successfully for `20948b8` after
  cutover, preserving a current rollback artifact.

The Sanity deploy-hook URL was not inspected during cutover. End-to-end webhook
delivery remains intentionally deferred until the next approved real editorial
publish, unpublish, or delete; validate it using timestamps only, without viewing
or exposing the hook URL.

Keep the rollback path intact for at least seven days and through one successful
Sanity-triggered production rebuild. After both conditions are met and production
remains healthy, present the exact Pages workflow, secrets, `public/CNAME`, and
other obsolete items proposed for disablement or removal at Human Gate F. Prefer
disabling deployment first and deleting only after an additional review.

## Rollback during stabilization

Rollback is triggered by an unavailable production hostname, broken primary
routes/content/assets, incorrect redirects or canonicals, TLS failure, or another
material regression that cannot be corrected immediately.

1. Remove or detach the `gotlandstider.se` Workers Custom Domain.
2. Remove the generated Worker DNS mapping if it remains, then restore the four
   proxied apex A records listed in the pre-cutover inventory with TTL Auto.
3. Confirm the GitHub Pages deployment and `public/CNAME` are still enabled.
4. Purge the Cloudflare zone cache using the existing least-privilege GitHub
   workflow or the Cloudflare dashboard.
5. Verify the apex, www redirect, representative pages/assets, sitemap, robots,
   canonical URLs, HTTPS, and 404 response against the last known-good Pages
   deployment.

Cloudflare proxied records normally use a 300-second TTL, but local resolvers can
take longer to refresh. Removing a Worker Custom Domain does not automatically
remove its generated Advanced Certificate; leaving it temporarily does not affect
rollback functionality. Keep the Pages workflow, `public/CNAME`, its secrets, and
the previous deployment intact through the agreed stabilization period. Disabling
or deleting them requires a separate approval gate.

## Current references

- [Astro: deploy a static site to Cloudflare Workers](https://docs.astro.build/en/guides/deploy/cloudflare/)
- [Cloudflare: Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Cloudflare: GitHub integration and repository scoping](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/)
- [Cloudflare: Static Assets redirects](https://developers.cloudflare.com/workers/static-assets/redirects/)
- [Cloudflare: Static Assets headers](https://developers.cloudflare.com/workers/static-assets/headers/)
- [Cloudflare: SSG and custom 404 handling](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/)
- [Cloudflare: Deploy Hooks](https://developers.cloudflare.com/workers/ci-cd/builds/deploy-hooks/)
- [Cloudflare: Worker Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Cloudflare: DNS TTL](https://developers.cloudflare.com/dns/manage-dns-records/reference/ttl/)
