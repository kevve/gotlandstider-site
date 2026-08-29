import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { PRIMARY_TAGS, QUALIFIER_TAGS } from "./lib/content/taxonomy";

const dateString = z.preprocess(
  (value) => (value instanceof Date ? value.toISOString().slice(0, 10) : value),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
);
const dateTimeString = z.preprocess(
  (value) => (value instanceof Date ? value.toISOString() : value),
  z.iso.datetime({ offset: true }),
);
const slug = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers and hyphens",
  );
const publicAssetPath = z
  .string()
  .regex(/^\/content\//, "Use a root-relative /content/ path");
const socialUrl = z
  .string()
  .regex(/^https:\/\/\S+$/, "Use an https URL")
  .nullable();

const socialLinks = z.object({
  instagram: socialUrl,
  tiktok: socialUrl,
});

const video = z.object({
  youtubeVideoId: z
    .string()
    .regex(/^[A-Za-z0-9_-]{11}$/, "Use an 11-character YouTube video ID"),
  uploadDate: dateTimeString,
  socialLinks,
});

const homepage = z.object({
  card: z
    .object({
      badge: z.string().min(1).optional(),
      subtitle: z.string().min(1).optional(),
    })
    .optional(),
  hero: z
    .object({
      heading: z.object({
        prefix: z.string().min(1),
        accent: z.string().min(1),
      }),
      description: z.string().min(1),
      highlights: z.array(
        z.object({
          label: z.string().min(1),
          title: z.string().min(1),
          description: z.string().min(1),
        }),
      ),
    })
    .optional(),
});

const seo = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  image: publicAssetPath.optional(),
  noIndex: z.boolean().default(false),
});

const articles = defineCollection({
  loader: glob({
    base: "./src/content/articles",
    pattern: "**/*.{md,mdx}",
    // Keep the source filename available for the established public feed contract.
    // Public routes continue to use the explicit frontmatter slug.
    generateId: ({ entry }) => entry.replace(/\.(?:md|mdx)$/i, ""),
  }),
  schema: z
    .object({
      title: z.string().min(1),
      slug,
      excerpt: z.string().min(1),
      publishedAt: dateString,
      updatedAt: dateString,
      coverImage: publicAssetPath.optional(),
      primaryTag: z.enum(PRIMARY_TAGS),
      locationTag: z.string().trim().min(1).max(60),
      qualifierTag: z.enum(QUALIFIER_TAGS),
      featured: z.boolean().default(false),
      draft: z.boolean().default(false),
      video: video.optional(),
      homepage: homepage.optional(),
      seo: seo.optional(),
    })
    .superRefine((article, context) => {
      if (!article.video && !article.coverImage) {
        context.addIssue({
          code: "custom",
          path: ["coverImage"],
          message: "Non-video articles require a cover image",
        });
      }

      if (article.homepage?.hero && (!article.featured || !article.video)) {
        context.addIssue({
          code: "custom",
          path: ["homepage", "hero"],
          message:
            "Homepage hero requires a featured article with video metadata",
        });
      }
    }),
});

export const collections = { articles };
