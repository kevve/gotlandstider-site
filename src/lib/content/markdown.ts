import { getCollection } from "astro:content";
import type { ArticleEntry } from "./types";

export async function getMarkdownArticles(): Promise<ArticleEntry[]> {
  const entries = await getCollection("articles", ({ data }) => !data.draft);

  return entries.map((entry) => ({
    id: entry.id,
    source: "markdown",
    sourceFile: `content/articles/${entry.id}.md`,
    data: entry.data,
  }));
}
