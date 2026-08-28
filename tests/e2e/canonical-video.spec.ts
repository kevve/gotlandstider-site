import { expect, test } from "@playwright/test";
import type { ArticleEntry } from "../../src/lib/content";
import {
  buildVideoObject,
  normalizeArticleVideo,
  youtubeEmbedUrl,
} from "../../src/lib/content/video";
import { renderVideoSitemapXml } from "../../src/lib/video-sitemap";

const VIDEO_ID = "AbCdEf123_-";
const UPLOAD_DATE = "2026-08-20T13:14:15+02:00";

function canonicalArticle(): ArticleEntry {
  const video = normalizeArticleVideo(
    {
      youtubeVideoId: VIDEO_ID,
      uploadDate: UPLOAD_DATE,
      thumbnail: "/content/canonical-thumbnail.webp",
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
      heroImage: "/content/canonical-thumbnail.webp",
      tags: ["Test"],
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
        thumbnail: "/content/canonical-thumbnail.webp",
        socialLinks: { instagram: null, tiktok: null },
      },
      "missing-upload-date",
    ),
  ).toThrow(/missing uploadDate/);

  expect(() =>
    normalizeArticleVideo(
      {
        uploadDate: UPLOAD_DATE,
        thumbnail: "/content/canonical-thumbnail.webp",
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
  expect(xml).not.toContain("<video:content_loc>");
});
