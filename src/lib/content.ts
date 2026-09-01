import { getMarkdownArticles } from "./content/markdown";
import type { ArticleData, ArticleEntry } from "./content/types";
import { orderedArticleTags } from "./content/taxonomy";

export type { ArticleData, ArticleEntry, ArticleVideo } from "./content/types";

export interface CardPresentation {
  cardImage: string;
  badge: string;
  subtitle: string;
}

export type SerializedArticle = ArticleData & {
  tags: [string, string, string];
  urlPath: string;
  sourceFile: string;
};

export interface HomepageArchiveCandidate {
  title: string;
  slug: string;
  excerpt: string;
  publishedAt: string;
  cardImage: string;
  badge: string;
  subtitle: string;
  urlPath: string;
  sourceFile: string;
}

export async function getPublishedArticles(): Promise<ArticleEntry[]> {
  const entries = await getArticlesFromConfiguredSource();
  assertUniqueSlugs(entries);
  return entries.sort(compareArticlesNewestFirst);
}

export async function getFeaturedArticle(): Promise<ArticleEntry> {
  const featured = (await getPublishedArticles()).filter(
    ({ data }) => data.featured,
  );

  if (featured.length !== 1) {
    throw new Error(
      `Expected exactly one published featured article, found ${featured.length}: ${
        featured.map(({ data }) => data.slug).join(", ") || "none"
      }`,
    );
  }

  return featured[0];
}

export async function getRelatedArticles(
  slug: string,
  limit = 4,
): Promise<ArticleEntry[]> {
  if (!Number.isInteger(limit) || limit < 0) {
    throw new TypeError("Related article limit must be a non-negative integer");
  }

  return (await getPublishedArticles())
    .filter(({ data }) => data.slug !== slug)
    .slice(0, limit);
}

export function getCardPresentation(article: ArticleEntry): CardPresentation {
  const { data } = article;

  return {
    cardImage: data.coverImage,
    badge: data.homepage?.card?.badge ?? data.primaryTag,
    subtitle:
      data.homepage?.card?.subtitle ??
      `${data.locationTag} • ${data.qualifierTag}`,
  };
}

export function getArchiveCardPresentation(
  article: ArticleEntry,
): CardPresentation {
  const { data } = article;

  return {
    cardImage: data.coverImage,
    badge: data.primaryTag,
    subtitle: `${data.locationTag} • ${data.qualifierTag}`,
  };
}

/** Preserve the established public JSON feed shape without an intermediate build artifact. */
export function serializeArticle(article: ArticleEntry): SerializedArticle {
  const { homepage, seo: _seo, ...data } = article.data;

  return {
    ...data,
    tags: orderedArticleTags(article.data),
    urlPath: articlePath(article.data.slug),
    sourceFile: article.sourceFile,
    ...(homepage ? { homepage } : {}),
  };
}

export function serializeHomepageCandidate(
  article: ArticleEntry,
): HomepageArchiveCandidate {
  const presentation = getCardPresentation(article);

  return {
    title: article.data.title,
    slug: article.data.slug,
    excerpt: article.data.excerpt,
    publishedAt: article.data.publishedAt,
    cardImage: presentation.cardImage,
    badge: presentation.badge,
    subtitle: presentation.subtitle,
    urlPath: articlePath(article.data.slug),
    sourceFile: article.sourceFile,
  };
}

export function articlePath(slug: string): string {
  return `/artiklar/${slug}/`;
}

/** The canonical archive route shared by navigation, metadata, and sitemaps. */
export function articlesPath(): string {
  return "/artiklar/";
}

function compareArticlesNewestFirst(
  left: ArticleEntry,
  right: ArticleEntry,
): number {
  if (left.data.publishedAt === right.data.publishedAt) {
    return left.data.slug.localeCompare(right.data.slug);
  }

  return right.data.publishedAt.localeCompare(left.data.publishedAt);
}

let configuredArticles: Promise<ArticleEntry[]> | undefined;

function getArticlesFromConfiguredSource(): Promise<ArticleEntry[]> {
  if (configuredArticles) return configuredArticles;

  const source = process.env.CONTENT_SOURCE || "markdown";
  if (source === "markdown") {
    configuredArticles = getMarkdownArticles();
    return configuredArticles;
  }

  if (source === "sanity") {
    configuredArticles = import("./content/sanity").then(
      ({ getSanityArticles }) => getSanityArticles(),
    );
    return configuredArticles;
  }

  throw new Error(
    `Unsupported CONTENT_SOURCE=${source}. Use "markdown" or "sanity".`,
  );
}

function assertUniqueSlugs(entries: ArticleEntry[]): void {
  const slugs = new Set<string>();

  for (const { data } of entries) {
    if (slugs.has(data.slug)) {
      throw new Error(`Duplicate public article slug: ${data.slug}`);
    }
    slugs.add(data.slug);
  }
}
