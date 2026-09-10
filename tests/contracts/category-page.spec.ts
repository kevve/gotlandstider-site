import { expect, test } from "@playwright/test";
import { CATEGORIES } from "../../src/lib/categories";
import type { ArticleEntry } from "../../src/lib/content";
import {
  closeAstroContainerServer,
  renderAstroComponent,
} from "../support/astro-container";

const category = CATEGORIES[0];

test.afterAll(async () => {
  await closeAstroContainerServer();
});

test("controlled empty category renders its empty state and noindex metadata", async () => {
  const html = await renderCategory([]);

  expect(html).toContain("data-category-empty");
  expect(html).toContain("Här är det tomt just nu");
  expect(html).toContain('<meta name="robots" content="noindex, follow">');
});

test("controlled populated category renders article cards without noindex metadata", async () => {
  const html = await renderCategory([controlledArticle()]);

  expect(html).toContain('href="/artiklar/kontrollerad-kategoriartikel/"');
  expect(html).not.toContain("data-category-empty");
  expect(html).not.toContain('<meta name="robots" content="noindex, follow">');
});

function renderCategory(articles: ArticleEntry[]) {
  return renderAstroComponent(
    "/src/pages/kategorier/[tag].astro",
    { category, articles },
    {
      params: { tag: category.slug },
      url: `https://gotlandstider.se/kategorier/${category.slug}/`,
    },
  );
}

function controlledArticle(): ArticleEntry {
  return {
    id: "controlled-category-article",
    source: "sanity",
    sourceFile: "content/articles/controlled-category-article.md",
    sitemapLastModified: "2026-09-10",
    data: {
      title: "Kontrollerad kategoriartikel",
      slug: "kontrollerad-kategoriartikel",
      excerpt: "Kontrollerad artikel för kategorisidans riktiga mall.",
      publishedAt: "2026-09-10",
      updatedAt: "2026-09-10",
      coverImage: "/content/controlled.webp",
      primaryTag: category.tag,
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
  };
}
