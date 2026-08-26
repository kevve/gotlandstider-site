import { getCollection, type CollectionEntry } from "astro:content";

export type ArticleEntry = CollectionEntry<"articles">;
export type ArticleVideo = NonNullable<ArticleEntry["data"]["video"]>;

export interface CardPresentation {
  cardImage: string;
  badge: string;
  subtitle: string;
}

export type SerializedArticle = ArticleEntry["data"] & {
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
  const entries = await getCollection("articles", ({ data }) => !data.draft);
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
  const [firstTag, ...otherTags] = data.tags;

  return {
    cardImage: data.video?.thumbnail ?? data.heroImage,
    badge: data.homepage?.card?.badge ?? firstTag,
    subtitle:
      data.homepage?.card?.subtitle ??
      (otherTags.length > 0 ? otherTags.slice(0, 2).join(" • ") : firstTag),
  };
}

export function getArchiveCardPresentation(
  article: ArticleEntry,
): CardPresentation {
  const { data } = article;
  const [metaPrefix, badge = metaPrefix, metaSuffix] = data.tags;

  return {
    cardImage: data.video?.thumbnail ?? data.heroImage,
    badge,
    subtitle: [metaPrefix, metaSuffix].filter(Boolean).join(" • "),
  };
}

/** Preserve the established public JSON feed shape without an intermediate build artifact. */
export function serializeArticle(article: ArticleEntry): SerializedArticle {
  const { video, homepage, ...data } = article.data;

  return {
    ...data,
    urlPath: articlePath(article.data.slug),
    sourceFile: legacySourcePath(article),
    ...(video ? { video } : {}),
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
    sourceFile: legacySourcePath(article),
  };
}

export function articlePath(slug: string): string {
  return `/articles/${slug}/`;
}

function legacySourcePath(article: ArticleEntry): string {
  return `content/articles/${article.id}.md`;
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

function assertUniqueSlugs(entries: ArticleEntry[]): void {
  const slugs = new Set<string>();

  for (const { data } of entries) {
    if (slugs.has(data.slug)) {
      throw new Error(`Duplicate public article slug: ${data.slug}`);
    }
    slugs.add(data.slug);
  }
}
