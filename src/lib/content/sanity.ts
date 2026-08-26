import { sanityClient } from "sanity:client";
import type { SANITY_ARTICLES_QUERY_RESULT } from "../../sanity.types";
import { SANITY_ARTICLES_QUERY } from "../sanity/queries";
import type { ArticleData, ArticleEntry } from "./types";

type SanityArticle = SANITY_ARTICLES_QUERY_RESULT[number];

export async function getSanityArticles(): Promise<ArticleEntry[]> {
  const documents = await sanityClient.fetch(SANITY_ARTICLES_QUERY);
  return documents.map(mapSanityArticle);
}

function mapSanityArticle(document: SanityArticle): ArticleEntry {
  const heroImage = requiredString(
    document.heroImage,
    document.slug,
    "heroImage",
  );
  const video = document.video
    ? {
        provider: document.video.provider,
        embedUrl: document.video.embedUrl,
        thumbnail: requiredString(
          document.video.thumbnail,
          document.slug,
          "video.thumbnail",
        ),
        socialLinks: {
          instagram: document.video.socialLinks?.instagram ?? null,
          tiktok: document.video.socialLinks?.tiktok ?? null,
        },
        ...(document.video.legacySources
          ? { legacySources: document.video.legacySources }
          : {}),
      }
    : undefined;

  if (video?.provider === "legacy-local" && !video.legacySources) {
    throw new Error(
      `Sanity article ${document.slug} has legacy-local video without sources`,
    );
  }

  const homepage = document.homepage
    ? {
        ...(document.homepage.card
          ? {
              card: {
                ...(document.homepage.card.badge
                  ? { badge: document.homepage.card.badge }
                  : {}),
                ...(document.homepage.card.subtitle
                  ? { subtitle: document.homepage.card.subtitle }
                  : {}),
              },
            }
          : {}),
        ...(document.homepage.hero
          ? {
              hero: {
                heading: requiredHeading(
                  document.homepage.hero.heading,
                  document.slug,
                ),
                description: document.homepage.hero.description,
                highlights: (document.homepage.hero.highlights ?? []).map(
                  (highlight) => ({
                    label: requiredString(
                      highlight.label,
                      document.slug,
                      "homepage.hero.highlights.label",
                    ),
                    title: requiredString(
                      highlight.title,
                      document.slug,
                      "homepage.hero.highlights.title",
                    ),
                    description: requiredString(
                      highlight.description,
                      document.slug,
                      "homepage.hero.highlights.description",
                    ),
                  }),
                ),
              },
            }
          : {}),
      }
    : undefined;

  const seo =
    document.seo.title ||
    document.seo.description ||
    document.seo.image ||
    document.seo.noIndex
      ? {
          ...(document.seo.title ? { title: document.seo.title } : {}),
          ...(document.seo.description
            ? { description: document.seo.description }
            : {}),
          ...(document.seo.image ? { image: document.seo.image } : {}),
          noIndex: document.seo.noIndex,
        }
      : undefined;

  const data: ArticleData = {
    title: document.title,
    slug: document.slug,
    excerpt: document.excerpt,
    publishedAt: document.publishedAt,
    updatedAt: document.updatedAt,
    heroImage,
    tags: document.tags,
    featured: document.featured ?? false,
    draft: false,
    ...(video ? { video } : {}),
    ...(homepage ? { homepage } : {}),
    ...(seo ? { seo } : {}),
  };

  return {
    id: document._id,
    source: "sanity",
    sourceFile: document.sourceFile,
    data,
    body: document.body,
  };
}

function requiredString(
  value: string | null,
  slug: string,
  field: string,
): string {
  if (!value) throw new Error(`Sanity article ${slug} is missing ${field}`);
  return value;
}

function requiredHeading(
  value: { prefix: string; accent: string } | null,
  slug: string,
) {
  if (!value) {
    throw new Error(`Sanity article ${slug} is missing homepage.hero.heading`);
  }
  return value;
}
