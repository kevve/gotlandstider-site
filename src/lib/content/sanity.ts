import { sanityClient } from "sanity:client";
import { SANITY_ARTICLES_QUERY } from "../sanity/queries";
import { mapSanityArticle } from "./sanity-mapper";
import type { ArticleEntry } from "./types";

export { mapSanityArticle } from "./sanity-mapper";

export async function getSanityArticles(): Promise<ArticleEntry[]> {
  const documents = await sanityClient.fetch(SANITY_ARTICLES_QUERY);
  return documents.map(mapSanityArticle);
}
