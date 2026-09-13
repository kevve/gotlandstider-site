import { expect, test } from "@playwright/test";
import { mapSanityArticle } from "../../src/lib/content/sanity-mapper";

test("controlled Sanity projection maps into the source-neutral article contract", () => {
  const article = mapSanityArticle(projectedArticle());

  expect(article).toMatchObject({
    id: "controlled-mapper",
    source: "sanity",
    sourceFile: "content/articles/controlled-mapper.md",
    sitemapLastModified: "2026-09-10",
    data: {
      slug: "controlled-mapper",
      coverImage: "/content/controlled-cover.webp",
      primaryLocation: { title: "Visby", slug: "visby" },
      video: {
        youtubeVideoId: "AbCdEf123_-",
        uploadDate: "2026-09-10T12:00:00+02:00",
      },
    },
  });
});

test("controlled inconsistent primary location fails before content reaches a route", () => {
  const projection = projectedArticle() as {
    primaryLocation: { title: string; slug: string };
  };
  projection.primaryLocation = { title: "Fel plats", slug: "fel-plats" };

  expect(() =>
    mapSanityArticle(projection as Parameters<typeof mapSanityArticle>[0]),
  ).toThrow(/inconsistent primary location projections/);
});

function projectedArticle(): Parameters<typeof mapSanityArticle>[0] {
  return {
    _id: "controlled-mapper",
    title: "Kontrollerad adapter",
    slug: "controlled-mapper",
    excerpt: "Kontrollerad Sanity-projektion för adaptern.",
    publishedAt: "2026-09-10",
    updatedAt: "2026-09-10",
    systemUpdatedAt: "2026-09-10T10:00:00Z",
    sitemapLastModified: "2026-09-10",
    primaryTag: "Mat & dryck",
    qualifierTag: "Guide",
    locations: [
      {
        _key: "visby-primary",
        role: "primary",
        location: { _id: "visby", title: "Visby", slug: "visby" },
      },
    ],
    primaryLocation: { _id: "visby", title: "Visby", slug: "visby" },
    featured: false,
    body: [
      {
        _key: "body",
        _type: "block",
        style: "normal",
        children: [{ _key: "span", _type: "span", text: "Brödtext." }],
      },
    ],
    coverImage: "/content/controlled-cover.webp",
    video: {
      youtubeVideoId: "AbCdEf123_-",
      uploadDate: "2026-09-10T12:00:00+02:00",
      socialLinks: { instagram: null, tiktok: null },
    },
    homepage: null,
    seo: { title: null, description: null, image: null, noIndex: false },
    sourceFile: "content/articles/controlled-mapper.md",
  } as Parameters<typeof mapSanityArticle>[0];
}
