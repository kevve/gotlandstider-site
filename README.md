# Gotlandstider site

The production frontend for [gotlandstider.se](https://gotlandstider.se). It is a clean, static Astro migration of the previous site, with its public URLs, content, design, interactions, and SEO contracts kept stable.

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
# Repository content source (default)
npm run build

# Published documents from Sanity
npm run build:sanity
```

`CONTENT_SOURCE=sanity` is intentionally strict: a missing document, image, body,
or featured-article invariant fails the build instead of silently falling back to
Markdown. Both sources map into the same strict YouTube-only site-facing type, so routes,
components, feeds, sitemap generation, and SEO stay source-independent.

Sanity project and dataset identifiers are public configuration with defaults of
`th4gij3b` and `production`; override them with `PUBLIC_SANITY_PROJECT_ID` and
`PUBLIC_SANITY_DATASET` if needed. No read token is committed or required for the
public production dataset.

Markdown remains in `src/content/articles/` as a repository fallback. Its `slug`
values are the public URL contract and must not be changed silently. Every video
uses a canonical YouTube ID and upload date; video files are not served by the site
or uploaded as Sanity file assets.

Run `npm run check`, `npm run build`, and `npm test` before opening a pull request. The CI workflow additionally enforces formatting and runs the same browser regression coverage.

## Deployment

Pushes to `main` deploy through the official Astro and GitHub Pages actions with `CONTENT_SOURCE=sanity`. The deployment is configured for the root custom-domain site, so transfer the Pages domain to this repository immediately after its first approved deployment.

Production uses the apex hostname `gotlandstider.se`, declared in `public/CNAME`. Cloudflare redirects `www.gotlandstider.se` to this canonical hostname and supplies the agent-discovery response headers. The legacy `/admin` path is intentionally absent and returns the static 404 page; editorial work happens in the standalone [Gotlandstider Studio](https://gotlandstider-studio.sanity.studio).

The site builds from published Sanity content. Markdown remains available as
the repository fallback and CI verifies both content sources. Production DNS remains
a separate approval.
