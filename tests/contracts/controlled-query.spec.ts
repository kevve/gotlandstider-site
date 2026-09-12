import { expect, test } from "@playwright/test";
import { evaluate, parse } from "groq-js";
import { SANITY_ARTICLES_QUERY } from "../../src/lib/sanity/queries";
import {
  mapSanityArticle,
  type SanityArticle,
} from "../../src/lib/content/sanity-mapper";

const controlledDocuments = [
  {
    _id: "controlled-location",
    _type: "location",
    title: "Kontrollerad plats",
    slug: { current: "kontrollerad-plats" },
  },
  article("controlled-published"),
  article("drafts.controlled-draft"),
  { ...article("controlled-missing-slug"), slug: undefined },
];

test("Sanity query includes only published articles with slugs", async () => {
  const actual = await queryIds(SANITY_ARTICLES_QUERY);
  const expected = ["controlled-published"];

  expect(actual).toEqual(expected);

  const draftPredicateRemoved = SANITY_ARTICLES_QUERY.replace(
    '!(_id in path("drafts.**")) &&',
    "",
  );
  const weakened = await queryIds(draftPredicateRemoved);

  // This proves the assertion would reject a query mutation that leaks drafts.
  expect(() => expect(weakened).toEqual(expected)).toThrow();
  expect(weakened).toContain("drafts.controlled-draft");
  expect(weakened).not.toContain("controlled-missing-slug");
});

test("Sanity query resolves real asset, location and video projections", async () => {
  const document = {
    ...article("controlled-projections"),
    coverImage: {
      asset: { _type: "reference", _ref: "controlled-image" },
      legacyPath: "/content/stale-cover.webp",
    },
    seo: {
      image: {
        asset: { _type: "reference", _ref: "controlled-image" },
        legacyPath: "/content/stale-seo.webp",
      },
    },
    video: {
      youtubeVideoId: "AbCdEf123_-",
      uploadDate: "2026-09-10T12:00:00+02:00",
    },
  };
  const value = await evaluate(parse(SANITY_ARTICLES_QUERY), {
    dataset: [
      controlledDocuments[0],
      {
        _id: "controlled-image",
        _type: "sanity.imageAsset",
        url: "https://cdn.sanity.io/controlled-cover.webp",
      },
      document,
    ],
  });
  const projected = (await value.get()) as SanityArticle[];
  expect(projected).toHaveLength(1);
  expect(projected[0]).toMatchObject({
    coverImage: "https://cdn.sanity.io/controlled-cover.webp",
    seo: { image: "https://cdn.sanity.io/controlled-cover.webp" },
    primaryLocation: {
      title: "Kontrollerad plats",
      slug: "kontrollerad-plats",
    },
    locations: [
      {
        _key: "primary-location",
        role: "primary",
        location: { slug: "kontrollerad-plats" },
      },
    ],
    video: {
      youtubeVideoId: "AbCdEf123_-",
      uploadDate: "2026-09-10T12:00:00+02:00",
    },
    sitemapLastModified: "2026-09-10",
  });
  expect(mapSanityArticle(projected[0]).data).toMatchObject({
    draft: false,
    coverImage: "https://cdn.sanity.io/controlled-cover.webp",
    primaryLocation: {
      title: "Kontrollerad plats",
      slug: "kontrollerad-plats",
    },
    video: {
      youtubeVideoId: "AbCdEf123_-",
      uploadDate: "2026-09-10T12:00:00+02:00",
    },
  });
});

async function queryIds(query: string): Promise<string[]> {
  const value = await evaluate(parse(query), { dataset: controlledDocuments });
  const result = (await value.get()) as Array<{ _id: string }>;
  return result.map((document) => document._id);
}

function article(_id: string) {
  return {
    _id,
    _type: "article",
    _updatedAt: "2026-09-10T12:00:00Z",
    title: "Kontrollerad artikel",
    slug: { current: _id.replace("drafts.", "") },
    excerpt: "En kontrollerad artikel för att prova den riktiga GROQ-frågan.",
    publishedAt: "2026-09-10",
    updatedAt: "2026-09-10",
    primaryTag: "Mat & dryck",
    qualifierTag: "Guide",
    locations: [
      {
        _key: "primary-location",
        role: "primary",
        location: { _ref: "controlled-location", _type: "reference" },
      },
    ],
    body: [
      {
        _key: "body",
        _type: "block",
        style: "normal",
        children: [{ _key: "span", _type: "span", text: "Brödtext." }],
      },
    ],
    coverImage: { legacyPath: "/content/controlled.webp" },
    seo: {},
  };
}
