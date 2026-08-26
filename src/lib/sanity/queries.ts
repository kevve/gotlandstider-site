import { defineQuery } from "groq";

export const SANITY_ARTICLES_QUERY = defineQuery(/* groq */ `
  *[
    _type == "article" &&
    !(_id in path("drafts.**")) &&
    defined(slug.current)
  ] | order(publishedAt desc, slug.current asc) {
    _id,
    title,
    "slug": slug.current,
    excerpt,
    publishedAt,
    updatedAt,
    tags,
    featured,
    body,
    "heroImage": coalesce(heroImage.legacyPath, heroImage.asset->url),
    video {
      provider,
      embedUrl,
      "thumbnail": coalesce(thumbnail.legacyPath, thumbnail.asset->url),
      socialLinks {
        "instagram": coalesce(instagram, null),
        "tiktok": coalesce(tiktok, null)
      },
      legacySources { webm, mp4 }
    },
    homepage {
      card { badge, subtitle },
      hero {
        heading { prefix, accent },
        description,
        highlights[] { _key, label, title, description }
      }
    },
    "seo": {
      "title": seo.title,
      "description": seo.description,
      "image": coalesce(seo.image.legacyPath, seo.image.asset->url),
      "noIndex": seo.noIndex == true
    },
    "sourceFile": coalesce(
      migration.sourceFile,
      "content/articles/" + slug.current + ".md"
    )
  }
`);
