import type { CollectionEntry } from "astro:content";
import type { TypedObject } from "astro-portabletext/types";

type MarkdownArticleData = CollectionEntry<"articles">["data"];

export interface ArticleVideo {
  youtubeVideoId: string;
  uploadDate: string;
  socialLinks: { instagram: string | null; tiktok: string | null };
}

/** Normalized contract consumed by routes regardless of the configured source. */
export type ArticleData = Omit<MarkdownArticleData, "video" | "coverImage"> & {
  /** The single effective image used everywhere the article needs artwork. */
  coverImage: string;
  video?: ArticleVideo;
};

export interface ArticleEntry {
  id: string;
  source: "markdown" | "sanity";
  sourceFile: string;
  data: ArticleData;
  body?: TypedObject[];
}
