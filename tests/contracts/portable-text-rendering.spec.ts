import { expect, test } from "@playwright/test";
import type { ArticleEntry } from "../../src/lib/content";
import {
  closeAstroContainerServer,
  renderAstroComponent,
} from "../support/astro-container";

test.afterAll(async () => {
  await closeAstroContainerServer();
});

test("controlled Sanity Portable Text renders duplicate heading anchors and links", async () => {
  const html = await renderAstroComponent("/src/components/ArticleBody.astro", {
    article: controlledArticle(),
  });

  expect(html).toContain('<h2 id="samma-rubrik">Samma rubrik</h2>');
  expect(html).toContain('<h3 id="samma-rubrik-1">Samma rubrik</h3>');
  expect(html).toContain('<a href="https://example.test/guide">Läs guiden</a>');
});

test("controlled Sanity Portable Text rejects an empty body", async () => {
  await expect(
    renderAstroComponent("/src/components/ArticleBody.astro", {
      article: { ...controlledArticle(), body: [] },
    }),
  ).rejects.toThrow(/Portable Text article body not found/);
});

function controlledArticle(): ArticleEntry {
  return {
    id: "controlled-portable-text",
    source: "sanity",
    sourceFile: "content/articles/controlled-portable-text.md",
    sitemapLastModified: "2026-09-10",
    data: {
      title: "Kontrollerad Portable Text",
      slug: "controlled-portable-text",
      excerpt: "Kontrollerat innehåll för Astro-renderingen.",
      publishedAt: "2026-09-10",
      updatedAt: "2026-09-10",
      coverImage: "/content/controlled.webp",
      primaryTag: "Mat & dryck",
      primaryLocation: { title: "Visby", slug: "visby" },
      locations: [
        {
          _key: "visby-primary",
          role: "primary",
          location: { title: "Visby", slug: "visby" },
        },
      ],
      qualifierTag: "Guide",
      featured: false,
      draft: false,
    },
    body: [
      block("h2", "Samma rubrik"),
      {
        _key: "linked-block",
        _type: "block",
        style: "normal",
        markDefs: [
          {
            _key: "guide-link",
            _type: "link",
            href: "https://example.test/guide",
          },
        ],
        children: [
          {
            _key: "linked-span",
            _type: "span",
            marks: ["guide-link"],
            text: "Läs guiden",
          },
        ],
      },
      block("h3", "Samma rubrik"),
    ],
  };
}

function block(style: "h2" | "h3", text: string) {
  return {
    _key: `${style}-${text}`,
    _type: "block" as const,
    style,
    children: [{ _key: `${style}-span`, _type: "span" as const, text }],
  };
}
