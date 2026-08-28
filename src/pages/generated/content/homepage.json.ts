import type { APIRoute } from "astro";
import {
  getFeaturedArticle,
  getPublishedArticles,
  serializeArticle,
  serializeHomepageCandidate,
} from "../../../lib/content";

export const prerender = true;

export const GET: APIRoute = async () => {
  const [featured, articles] = await Promise.all([
    getFeaturedArticle(),
    getPublishedArticles(),
  ]);
  const video = featured.data.video;

  if (!video) {
    throw new Error(
      `Featured article ${featured.data.slug} must include video metadata`,
    );
  }

  const serialized = serializeArticle(featured);
  const hero = featured.data.homepage?.hero;
  const featuredVideo = {
    title: serialized.title,
    slug: serialized.slug,
    excerpt: serialized.excerpt,
    publishedAt: serialized.publishedAt,
    thumbnail: video.thumbnail,
    youtubeVideoId: video.youtubeVideoId,
    uploadDate: video.uploadDate,
    socialLinks: video.socialLinks,
    featured: serialized.featured,
    draft: serialized.draft,
    urlPath: serialized.urlPath,
    sourceFile: serialized.sourceFile,
    heading: hero?.heading ?? { prefix: serialized.title, accent: "" },
    description: hero?.description ?? serialized.excerpt,
    highlights: hero?.highlights ?? [],
  };

  return json({
    featuredVideo,
    archiveCandidates: articles
      .filter(({ data }) => !data.featured)
      .map(serializeHomepageCandidate),
  });
};

function json(value: unknown): Response {
  return new Response(`${JSON.stringify(value, null, 2)}\n`, {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
