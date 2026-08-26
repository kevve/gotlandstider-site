# Gotlandstider site

The future production frontend for [gotlandstider.se](https://www.gotlandstider.se). It is a clean, static Astro migration of the current site, with its public URLs, content, design, interactions, and SEO contracts kept stable. The existing `kevve/gotlandstider` repository remains the production reference until a separately approved cutover.

## Architecture

- Astro static output and TypeScript, with no client framework or runtime server.
- Tailwind CSS through its Vite plugin, using the existing Gotlandstider visual tokens and local fonts.
- A dual-source content boundary: typed Markdown remains the migration rollback,
  while the sibling `studio-gotlandstider` project supplies canonical Sanity articles.
- Astro layouts and small reusable components in `src/layouts/` and `src/components/`.
- A small content query boundary in `src/lib/` so a later Sanity source does not require page redesign.
- Public assets in `public/`, retaining established `/content/`, discovery, font, and favicon paths.
- Astro routes generate article pages, SEO files, and the three compatibility JSON feeds directly; generated HTML and JSON are not committed.

This migration deliberately omits Decap CMS, its OAuth worker and editorial PR machinery, the old page-generation scripts, generated content indexes as an internal rendering layer, and publisher/worktree orchestration. The Sanity Studio remains a standalone sibling project and is never embedded at `/admin`.

## Local development

Use a current Node.js release supported by Astro, then install from the lockfile:

```sh
npm ci
npm run dev
```

The main verification commands are:

```sh
npm run format:check
npm run check
npm run build
npm test
```

`npm test` builds the static site, serves the output locally, and runs the Chromium Playwright suite. Install its browser once on a new machine with `npx playwright install chromium`.

## Content sources

The source is selected at build time:

```sh
# Transitional rollback source (default)
npm run build

# Published documents from Sanity
npm run build:sanity
```

`CONTENT_SOURCE=sanity` is intentionally strict: a missing document, image, body,
or featured-article invariant fails the build instead of silently falling back to
Markdown. Both providers map into the same site-facing type, so routes,
components, feeds, sitemap generation, and SEO stay source-independent.

Sanity project and dataset identifiers are public configuration with defaults of
`th4gij3b` and `production`; override them with `PUBLIC_SANITY_PROJECT_ID` and
`PUBLIC_SANITY_DATASET` if needed. No read token is committed or required for the
public production dataset.

During migration, Markdown remains in `src/content/articles/`. Its `slug` values
are the public URL contract and must not be changed silently. Legacy local videos
remain in `public/content/`; production video is not uploaded as a Sanity file
asset.

Run `npm run check`, `npm run build`, and `npm test` before opening a pull request. The CI workflow additionally enforces formatting and runs the same browser regression coverage.

## Preview deployment and cutover

Pushes to `main` deploy through the official Astro and GitHub Pages actions. The preview build sets `CONTENT_SOURCE=sanity` and `DEPLOY_TARGET=github-pages-preview`, producing the project site at:

<https://kevve.github.io/gotlandstider-site/>

The preview has the `/gotlandstider-site` base path and must not be connected to production DNS. There is intentionally no `CNAME` in this repository during parity review.

Production cutover is a separate, explicit operation. It requires changing the deployment target to the root custom-domain configuration, adding the approved `CNAME`, validating Cloudflare redirects/headers and robots behavior, and comparing the final deployment against the current production site. Do not archive or modify the current production repository as part of normal work here.

The preview now builds from published Sanity content. Markdown remains available as
the rollback source and CI verifies both providers. Production DNS remains a separate
approval.
