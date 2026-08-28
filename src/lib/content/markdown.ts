import { getCollection } from "astro:content";
import type { ArticleData, ArticleEntry } from "./types";
import { normalizeArticleVideo } from "./video";

export async function getMarkdownArticles(): Promise<ArticleEntry[]> {
  const entries = await getCollection("articles", ({ data }) => !data.draft);

  return entries.map((entry) => {
    const { video, ...articleData } = entry.data;
    const data: ArticleData = {
      ...articleData,
      ...(video
        ? { video: normalizeArticleVideo(video, entry.data.slug) }
        : {}),
    };

    return {
      id: entry.id,
      source: "markdown",
      sourceFile: `content/articles/${entry.id}.md`,
      data,
    };
  });
}
