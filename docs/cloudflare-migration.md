# Cloudflare Workers hosting migration

Status: repository preparation only. Production still uses GitHub Pages until the
separate production-cutover approval gate is completed.

## Architecture

Current production:

```text
GitHub push or Sanity webhook
  -> GitHub Actions
  -> Astro static build
  -> GitHub Pages
  -> Cloudflare CDN/DNS
  -> gotlandstider.se
```

Target production:

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

## Manual Cloudflare setup (Human Gate B and C)

Do not perform these steps until their explicit approval gate:

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

Create the deploy path only after a Cloudflare preview/staging deployment is
healthy:

1. Create a Cloudflare Deploy Hook for the production branch.
2. Treat the generated URL as a secret and do not commit or paste it into logs.
3. Replace the existing Sanity-to-GitHub deployment webhook only after explicit
   approval.
4. Configure create, update, and delete events for published documents. Disable
   drafts and version documents.
5. Use `_type in ["article", "location"]` so referenced location changes also
   rebuild generated article output.

Publishing, unpublishing, or deleting a relevant document should trigger one
build. Failed hooks leave the last successful static deployment serving; inspect
Sanity delivery attempts and Workers build logs, then retry after correcting the
cause. Do not point a deploy hook back at Sanity or otherwise create a trigger
loop.

## Preview verification and cutover gate

Compare the non-production Cloudflare URL with current production before any
domain change. Record representative URLs and verify HTTP status, navigation,
articles, embedded videos, Sanity content, images/assets, canonicals, sitemap,
robots, metadata, Open Graph, structured data, redirects, the custom 404 page,
trailing slashes, mobile rendering, major browsers, HTTPS, and basic performance.

Production-cutover checklist:

- [ ] Cloudflare preview deployment healthy
- [ ] Clean build succeeds
- [ ] Production-equivalent environment configured
- [ ] Secrets configured manually
- [ ] Main routes verified
- [ ] Content verified
- [ ] Assets verified
- [ ] SEO metadata verified
- [ ] Sitemap verified
- [ ] robots.txt verified
- [ ] Redirects verified
- [ ] 404 verified
- [ ] Sanity content verified
- [ ] TLS/custom domain plan verified
- [ ] Rollback procedure documented
- [ ] Existing GitHub Pages deployment still operational
- [ ] Human approval received

Before requesting cutover approval, record the exact existing DNS records,
proxy state, redirect rules, and Pages configuration. Bind the apex custom domain
only after approval. Preserve the current www-to-apex and legacy URL redirects.

## Rollback during stabilization

Rollback is triggered by an unavailable production hostname, broken primary
routes/content/assets, incorrect redirects or canonicals, TLS failure, or another
material regression that cannot be corrected immediately.

1. Remove or detach the new Workers custom-domain binding.
2. Restore the exact pre-cutover apex DNS record and proxy state recorded during
   the cutover checklist.
3. Confirm the GitHub Pages deployment and `public/CNAME` are still enabled.
4. Purge the Cloudflare zone cache using the existing least-privilege GitHub
   workflow or the Cloudflare dashboard.
5. Verify the apex, www redirect, representative pages/assets, sitemap, robots,
   canonical URLs, HTTPS, and 404 response against the last known-good Pages
   deployment.

DNS recovery can be delayed by resolver caching up to the previous record TTL,
although proxied Cloudflare changes normally become visible sooner. Keep the
Pages workflow, `public/CNAME`, its secrets, and the previous deployment intact
through the agreed stabilization period. Disabling or deleting them requires a
separate approval gate.

## Current references

- [Astro: deploy a static site to Cloudflare Workers](https://docs.astro.build/en/guides/deploy/cloudflare/)
- [Cloudflare: Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Cloudflare: GitHub integration and repository scoping](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/)
- [Cloudflare: Static Assets redirects](https://developers.cloudflare.com/workers/static-assets/redirects/)
- [Cloudflare: SSG and custom 404 handling](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/)
- [Cloudflare: Deploy Hooks](https://developers.cloudflare.com/workers/ci-cd/builds/deploy-hooks/)
