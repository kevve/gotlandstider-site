# Gotlandstider site

The future production frontend for [gotlandstider.se](https://www.gotlandstider.se). It is a clean, static Astro migration of the current site, with its public URLs, content, design, interactions, and SEO contracts kept stable. The existing `kevve/gotlandstider` repository remains the production reference until a separately approved cutover.

## Architecture

- Astro static output and TypeScript, with no client framework or runtime server.
- Tailwind CSS through its Vite plugin, using the existing Gotlandstider visual tokens and local fonts.
- Typed Markdown articles in `src/content/articles/`.
- Astro layouts and small reusable components in `src/layouts/` and `src/components/`.
- A small content query boundary in `src/lib/` so a later Sanity source does not require page redesign.
- Public assets in `public/`, retaining established `/content/`, discovery, font, and favicon paths.
- Astro routes generate article pages, SEO files, and the three compatibility JSON feeds directly; generated HTML and JSON are not committed.

This migration deliberately omits Decap CMS, its OAuth worker and editorial PR machinery, the old page-generation scripts, generated content indexes as an internal rendering layer, and publisher/worktree orchestration. Sanity is also not connected in this phase.

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

## Content workflow

Create or edit an article in `src/content/articles/` using the established frontmatter fields. `slug` is the public URL contract and must not be changed silently. Draft articles remain in the collection but do not appear in public pages, feeds, or the sitemap. Media referenced as `/content/...` belongs in `public/content/`.

Run `npm run check`, `npm run build`, and `npm test` before opening a pull request. The CI workflow additionally enforces formatting and runs the same browser regression coverage.

## Preview deployment and cutover

Pushes to `main` deploy through the official Astro and GitHub Pages actions. The preview build sets `DEPLOY_TARGET=github-pages-preview`, producing the project site at:

<https://kevve.github.io/gotlandstider-site/>

The preview has the `/gotlandstider-site` base path and must not be connected to production DNS. There is intentionally no `CNAME` in this repository during parity review.

Production cutover is a separate, explicit operation. It requires changing the deployment target to the root custom-domain configuration, adding the approved `CNAME`, validating Cloudflare redirects/headers and robots behavior, and comparing the final deployment against the current production site. Do not archive or modify the current production repository as part of normal work here.

The recommended next phase after parity and cutover approval is to make the existing `studio-gotlandstider` Sanity project the canonical content source while keeping this Astro frontend stable.
