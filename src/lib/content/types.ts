import type { CollectionEntry } from "astro:content";
import type { TypedObject } from "astro-portabletext/types";

export type ArticleData = CollectionEntry<"articles">["data"];
export type ArticleVideo = NonNullable<ArticleData["video"]>;

export interface ArticleEntry {
  id: string;
  source: "markdown" | "sanity";
  sourceFile: string;
  data: ArticleData;
  body?: TypedObject[];
}
