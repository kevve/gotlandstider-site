import { getCollection } from "astro:content";
import type { ArticleData, ArticleEntry } from "./types";
import { normalizeArticleVideo } from "./video";
import { resolveArticleCoverImage } from "./cover-image";

export async function getMarkdownArticles(): Promise<ArticleEntry[]> {
  const entries = await getCollection("articles", ({ data }) => !data.draft);

  return entries.map((entry) => {
    const { video, coverImage, heroImage, ...articleData } = entry.data;
    const normalizedVideo = video
      ? normalizeArticleVideo(video, entry.data.slug)
      : undefined;
    const data: ArticleData = {
      ...articleData,
      coverImage: resolveArticleCoverImage({
        slug: entry.data.slug,
        coverImage,
        videoThumbnail: video?.thumbnail,
        youtubeVideoId: normalizedVideo?.youtubeVideoId,
        heroImage,
      }),
      ...(normalizedVideo ? { video: normalizedVideo } : {}),
    };

    return {
      id: entry.id,
      source: "markdown",
      sourceFile: `content/articles/${entry.id}.md`,
      data,
    };
  });
}
