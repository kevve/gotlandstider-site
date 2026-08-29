import { expect, test } from "@playwright/test";
import type { ArticleEntry } from "../../src/lib/content";
import {
  buildVideoObject,
  normalizeArticleVideo,
  youtubeEmbedUrl,
} from "../../src/lib/content/video";
import { renderVideoSitemapXml } from "../../src/lib/video-sitemap";
import { resolveArticleCoverImage } from "../../src/lib/content/cover-image";
import { SANITY_ARTICLES_QUERY } from "../../src/lib/sanity/queries";

const VIDEO_ID = "AbCdEf123_-";
const UPLOAD_DATE = "2026-08-20T13:14:15+02:00";

function canonicalArticle(): ArticleEntry {
  const video = normalizeArticleVideo(
    {
      youtubeVideoId: VIDEO_ID,
      uploadDate: UPLOAD_DATE,
      socialLinks: { instagram: null, tiktok: null },
    },
    "canonical-video",
  );

  return {
    id: "canonical-video",
    source: "sanity",
    sourceFile: "content/articles/canonical-video.md",
    data: {
      title: "Canonical video",
      slug: "canonical-video",
      excerpt: "Canonical YouTube metadata test article.",
      publishedAt: "2026-08-22",
      updatedAt: "2026-08-25",
      coverImage: "/content/canonical-thumbnail.webp",
      primaryTag: "Upplevelser & nöjen",
      locationTag: "Gotland",
      qualifierTag: "Guide",
      featured: false,
      draft: false,
      video,
    },
  };
}

test("canonical YouTube identity derives a privacy-enhanced player URL", () => {
  const article = canonicalArticle();
  expect(youtubeEmbedUrl(article.data.video!.youtubeVideoId)).toBe(
    `https://www.youtube-nocookie.com/embed/${VIDEO_ID}`,
  );
});

test("canonical YouTube identity and upload date are an inseparable pair", () => {
  expect(() =>
    normalizeArticleVideo(
      {
        youtubeVideoId: VIDEO_ID,
        socialLinks: { instagram: null, tiktok: null },
      },
      "missing-upload-date",
    ),
  ).toThrow(/missing uploadDate/);

  expect(() =>
    normalizeArticleVideo(
      {
        uploadDate: UPLOAD_DATE,
        socialLinks: { instagram: null, tiktok: null },
      },
      "missing-video-id",
    ),
  ).toThrow(/missing or invalid YouTube video ID/);
});

test("canonical VideoObject uses the actual video upload timestamp", () => {
  const article = canonicalArticle();
  const jsonLd = buildVideoObject(article.data.video!, article.data);
  expect(jsonLd).toMatchObject({
    "@type": "VideoObject",
    uploadDate: UPLOAD_DATE,
    embedUrl: `https://www.youtube-nocookie.com/embed/${VIDEO_ID}`,
    thumbnailUrl:
      "https://www.gotlandstider.se/content/canonical-thumbnail.webp",
  });
  expect(jsonLd).not.toHaveProperty("contentUrl");
});

test("canonical video sitemap uses player_loc and video upload date", () => {
  const xml = renderVideoSitemapXml(canonicalArticle()).join("\n");
  expect(xml).toContain(
    `<video:player_loc allow_embed="yes">https://www.youtube-nocookie.com/embed/${VIDEO_ID}</video:player_loc>`,
  );
  expect(xml).toContain(
    `<video:publication_date>${UPLOAD_DATE}</video:publication_date>`,
  );
  expect(xml).toContain(
    `<video:thumbnail_loc>https://www.gotlandstider.se/content/canonical-thumbnail.webp</video:thumbnail_loc>`,
  );
  expect(xml).not.toContain("<video:content_loc>");
});

test("cover resolution follows the cross-source compatibility precedence", () => {
  expect(
    resolveArticleCoverImage({
      slug: "precedence",
      coverImage: "/content/new-cover.webp",
      videoThumbnail: "/content/old-thumbnail.webp",
      youtubeVideoId: VIDEO_ID,
      heroImage: "/content/legacy-hero.webp",
    }),
  ).toBe("/content/new-cover.webp");

  expect(
    resolveArticleCoverImage({
      slug: "legacy-video",
      videoThumbnail: "/content/old-thumbnail.webp",
      youtubeVideoId: VIDEO_ID,
      heroImage: "/content/legacy-hero.webp",
    }),
  ).toBe("/content/old-thumbnail.webp");

  expect(
    resolveArticleCoverImage({
      slug: "youtube-fallback",
      youtubeVideoId: VIDEO_ID,
      heroImage: "/content/legacy-hero.webp",
    }),
  ).toBe(`https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`);

  expect(
    resolveArticleCoverImage({
      slug: "legacy-article",
      heroImage: "/content/legacy-hero.webp",
    }),
  ).toBe("/content/legacy-hero.webp");
});

test("non-video articles fail clearly without a current or legacy cover", () => {
  expect(() => resolveArticleCoverImage({ slug: "missing-cover" })).toThrow(
    /Non-video article missing-cover is missing a cover image/,
  );
});

test("Sanity image projections prefer assets over stale legacy paths", () => {
  expect(SANITY_ARTICLES_QUERY).toContain(
    "coalesce(coverImage.asset->url, coverImage.legacyPath)",
  );
  expect(SANITY_ARTICLES_QUERY).toContain(
    "coalesce(thumbnail.asset->url, thumbnail.legacyPath)",
  );
  expect(SANITY_ARTICLES_QUERY).toContain(
    "coalesce(heroImage.asset->url, heroImage.legacyPath)",
  );
});
