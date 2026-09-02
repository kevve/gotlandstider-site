import type { CollectionEntry } from "astro:content";
import type { TypedObject } from "astro-portabletext/types";

type MarkdownArticleData = CollectionEntry<"articles">["data"];

export interface PrimaryLocation {
  title: string;
  /** Null only for the display-only Markdown transition archive. */
  slug: string | null;
}

export interface ArticleLocation {
  _key: string;
  role: "primary" | "featured" | "mentioned";
  location: { title: string; slug: string };
}

export interface ArticleVideo {
  youtubeVideoId: string;
  uploadDate: string;
  socialLinks: { instagram: string | null; tiktok: string | null };
}

/** Normalized contract consumed by routes regardless of the configured source. */
export type ArticleData = Omit<
  MarkdownArticleData,
  "video" | "coverImage" | "locationTag"
> & {
  /** The single effective image used everywhere the article needs artwork. */
  coverImage: string;
  primaryLocation: PrimaryLocation;
  /** Canonical Sanity relations. Markdown fallback entries intentionally omit these. */
  locations?: ArticleLocation[];
  video?: ArticleVideo;
};

export interface ArticleEntry {
  id: string;
  source: "markdown" | "sanity";
  sourceFile: string;
  /** Last significant editorial update used by sitemap consumers. */
  sitemapLastModified: string;
  /** Sanity's automatic document timestamp, retained for audit/debugging. */
  systemUpdatedAt?: string;
  data: ArticleData;
  body?: TypedObject[];
}
