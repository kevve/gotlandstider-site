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
    "primaryTag": coalesce(primaryTag, tags[0]),
    "locationTag": coalesce(locationTag, tags[1]),
    "qualifierTag": coalesce(qualifierTag, tags[2]),
    featured,
    body,
    "coverImage": coalesce(coverImage.asset->url, coverImage.legacyPath),
    "heroImage": coalesce(heroImage.asset->url, heroImage.legacyPath),
    video {
      youtubeVideoId,
      uploadDate,
      "thumbnail": coalesce(thumbnail.asset->url, thumbnail.legacyPath),
      socialLinks {
        "instagram": coalesce(instagram, null),
        "tiktok": coalesce(tiktok, null)
      }
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
      "image": coalesce(seo.image.asset->url, seo.image.legacyPath),
      "noIndex": seo.noIndex == true
    },
    "sourceFile": coalesce(
      migration.sourceFile,
      "content/articles/" + slug.current + ".md"
    )
  }
`);
