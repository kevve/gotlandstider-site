/**
 * Legacy article slugs that were renamed during the September 2026 migration
 * from /articles/ to /artiklar/ and the Markdown-to-Sanity content transition.
 *
 * This map is the single source of truth mirroring the exact-match Cloudflare
 * Redirect Rules that 301 the old URLs to their current slugs. When an article
 * slug changes in Sanity, add the old slug here AND create the matching
 * redirect rule in Cloudflare, otherwise the old URL lands on a 404 and its
 * search signals are lost. The Playwright guardrails in
 * tests/e2e/redirects.spec.ts enforce that every target exists.
 */
export const LEGACY_ARTICLE_SLUG_MAP = {
  "basta-strander-for-ett-aventyr": "basta-stranderna-for-ett-aventyr",
  "sommarens-basta-konserter-pa-gotland":
    "sommarens-basta-konserter-pa-gotland-2026",
} as const satisfies Record<string, string>;

export type LegacyArticleSlug = keyof typeof LEGACY_ARTICLE_SLUG_MAP;

/** Build the legacy production URL path for a renamed article slug. */
export function legacyArticlePath(slug: LegacyArticleSlug): string {
  return `/articles/${slug}/`;
}
