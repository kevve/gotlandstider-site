import { sanityClient } from "sanity:client";
import type { SANITY_ARTICLES_QUERY_RESULT } from "../../sanity.types";
import { SANITY_ARTICLES_QUERY } from "../sanity/queries";
import type { ArticleData, ArticleEntry } from "./types";
import { normalizeArticleVideo } from "./video";
import { resolveArticleCoverImage } from "./cover-image";

type SanityArticle = SANITY_ARTICLES_QUERY_RESULT[number];

export async function getSanityArticles(): Promise<ArticleEntry[]> {
  const documents = await sanityClient.fetch(SANITY_ARTICLES_QUERY);
  return documents.map(mapSanityArticle);
}

function mapSanityArticle(document: SanityArticle): ArticleEntry {
  const videoDocument = document.video;
  const video = videoDocument
    ? normalizeArticleVideo(
        {
          youtubeVideoId: requiredString(
            videoDocument.youtubeVideoId,
            document.slug,
            "video.youtubeVideoId",
          ),
          uploadDate: requiredString(
            videoDocument.uploadDate,
            document.slug,
            "video.uploadDate",
          ),
          socialLinks: {
            instagram: videoDocument.socialLinks?.instagram ?? null,
            tiktok: videoDocument.socialLinks?.tiktok ?? null,
          },
        },
        document.slug,
      )
    : undefined;
  const coverImage = resolveArticleCoverImage({
    slug: document.slug,
    coverImage: document.coverImage,
    youtubeVideoId: video?.youtubeVideoId,
  });

  const homepage = document.homepage
    ? {
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

  const locations = (document.locations ?? []).map((relation) => ({
    _key: requiredString(relation._key, document.slug, "locations._key"),
    role: requiredLocationRole(relation.role, document.slug),
    location: {
      title: requiredString(
        relation.location?.title,
        document.slug,
        "locations.location.title",
      ),
      slug: requiredString(
        relation.location?.slug,
        document.slug,
        "locations.location.slug",
      ),
    },
  }));
  const primaryRelations = locations.filter(
    (relation) => relation.role === "primary",
  );
  if (primaryRelations.length !== 1) {
    throw new Error(
      `Sanity article ${document.slug} must resolve exactly one primary location; found ${primaryRelations.length}`,
    );
  }
  const primaryLocation = {
    title: requiredString(
      document.primaryLocation?.title,
      document.slug,
      "primaryLocation.title",
    ),
    slug: requiredString(
      document.primaryLocation?.slug,
      document.slug,
      "primaryLocation.slug",
    ),
  };
  if (
    primaryRelations[0].location.title !== primaryLocation.title ||
    primaryRelations[0].location.slug !== primaryLocation.slug
  ) {
    throw new Error(
      `Sanity article ${document.slug} has inconsistent primary location projections`,
    );
  }

  const data: ArticleData = {
    title: document.title,
    slug: document.slug,
    excerpt: document.excerpt,
    publishedAt: document.publishedAt,
    updatedAt: document.updatedAt,
    coverImage,
    primaryTag: document.primaryTag,
    primaryLocation,
    locations,
    qualifierTag: document.qualifierTag,
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
    sitemapLastModified: document.sitemapLastModified,
    systemUpdatedAt: document.systemUpdatedAt,
    data,
    body: document.body,
  };
}

function requiredString(
  value: string | null | undefined,
  slug: string,
  field: string,
): string {
  if (!value) throw new Error(`Sanity article ${slug} is missing ${field}`);
  return value;
}

function requiredLocationRole(
  value: string | null | undefined,
  slug: string,
): "primary" | "featured" | "mentioned" {
  if (value === "primary" || value === "featured" || value === "mentioned") {
    return value;
  }
  throw new Error(`Sanity article ${slug} has an invalid location role`);
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
