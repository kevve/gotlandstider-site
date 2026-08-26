import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const dateString = z.preprocess(
  (value) => (value instanceof Date ? value.toISOString().slice(0, 10) : value),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
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
  provider: z.enum(["youtube", "legacy-local"]),
  embedUrl: z.string().regex(/^https:\/\/\S+$/, "Use an https URL"),
  thumbnail: publicAssetPath,
  socialLinks,
  legacySources: z
    .object({
      webm: publicAssetPath,
      mp4: publicAssetPath,
    })
    .optional(),
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
      heroImage: publicAssetPath,
      tags: z.array(z.string().min(1)).min(1),
      featured: z.boolean().default(false),
      draft: z.boolean().default(false),
      video: video.optional(),
      homepage: homepage.optional(),
      seo: seo.optional(),
    })
    .superRefine((article, context) => {
      if (
        article.video?.provider === "legacy-local" &&
        !article.video.legacySources
      ) {
        context.addIssue({
          code: "custom",
          path: ["video", "legacySources"],
          message: "Legacy-local video requires webm and mp4 sources",
        });
      }

      if (
        article.video?.provider === "youtube" &&
        article.video.legacySources
      ) {
        context.addIssue({
          code: "custom",
          path: ["video", "legacySources"],
          message: "YouTube video cannot define legacy local sources",
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
