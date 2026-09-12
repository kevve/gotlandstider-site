export interface RawSanityArticle {
  _id: string;
  slug: string;
  title: string;
  excerpt: string;
  qualifierTag: string;
  primaryTag: string;
  publishedAt: string;
  updatedAt: string;
  sitemapLastModified: string;
  noIndex: boolean;
  seo: {
    title: string | null;
    description: string | null;
    image: string | null;
  };
  coverImage: string | null;
  locations: Array<{
    _key: string;
    role: string;
    location: { title: string; slug: string } | null;
  }>;
  featured: boolean;
  video: {
    youtubeVideoId: string;
    uploadDate: string;
    socialLinks: { instagram: string | null; tiktok: string | null };
  } | null;
  body: unknown[];
}

export interface RawSanityDraft {
  _id: string;
  slug: string | null;
}

export interface RawSanityInventory {
  published: RawSanityArticle[];
  drafts: RawSanityDraft[];
}

const RAW_INVENTORY_QUERY = /* groq */ `{
  "published": *[
    _type == "article" &&
    !(_id in path("drafts.**")) &&
    !(_id in path("versions.**")) &&
    defined(slug.current)
  ] | order(publishedAt desc, slug.current asc) {
    _id,
    "slug": slug.current,
    title,
    excerpt,
    "qualifierTag": coalesce(qualifierTag, tags[2]),
    "primaryTag": coalesce(primaryTag, tags[0]),
    publishedAt,
    updatedAt,
    "sitemapLastModified": coalesce(updatedAt, _updatedAt),
    "noIndex": seo.noIndex == true,
    "seo": {
      "title": seo.title,
      "description": seo.description,
      "image": coalesce(seo.image.asset->url, seo.image.legacyPath)
    },
    "coverImage": coalesce(coverImage.asset->url, coverImage.legacyPath),
    locations[]{
      _key,
      role,
      location->{ title, "slug": slug.current }
    },
    featured,
    "video": video {
      youtubeVideoId,
      uploadDate,
      "socialLinks": {
        "instagram": coalesce(socialLinks.instagram, null),
        "tiktok": coalesce(socialLinks.tiktok, null)
      }
    },
    body
  },
  "drafts": *[_type == "article" && _id in path("drafts.**")] {
    _id,
    "slug": slug.current
  }
}`;

let inventory: Promise<RawSanityInventory> | undefined;

// One read-only snapshot per worker, reused across tests. Never use a generated
// feed as the source oracle. A new retry worker gets a fresh snapshot.
export function getRawSanityInventory(): Promise<RawSanityInventory> {
  return (inventory ??= fetchRawSanityInventory());
}

async function fetchRawSanityInventory(): Promise<RawSanityInventory> {
  const token = process.env.SANITY_API_READ_TOKEN;
  if (!token) {
    throw new Error(
      "Sanity integration tests require SANITY_API_READ_TOKEN; refusing to skip live source assertions.",
    );
  }

  const projectId = process.env.PUBLIC_SANITY_PROJECT_ID || "th4gij3b";
  const dataset = process.env.PUBLIC_SANITY_DATASET || "production";
  const response = await fetch(
    `https://${projectId}.api.sanity.io/v2026-08-26/data/query/${dataset}?perspective=raw`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: RAW_INVENTORY_QUERY }),
      signal: AbortSignal.timeout(20_000),
    },
  );
  if (!response.ok) {
    throw new Error(
      `Raw Sanity inventory query failed (${response.status} ${response.statusText}).`,
    );
  }

  const payload = (await response.json()) as { result?: RawSanityInventory };
  if (!payload.result)
    throw new Error("Raw Sanity inventory query returned no result.");
  return payload.result;
}
