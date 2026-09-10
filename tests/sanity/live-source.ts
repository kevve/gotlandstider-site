export interface RawSanityArticle {
  _id: string;
  slug: string;
  title: string;
  primaryTag: string;
  publishedAt: string;
  updatedAt: string;
  sitemapLastModified: string;
  noIndex: boolean;
  coverImage: string | null;
  video: { youtubeVideoId: string; uploadDate: string } | null;
  body: unknown[];
}

export interface RawSanityInventory {
  published: RawSanityArticle[];
  draftIds: string[];
}

const RAW_INVENTORY_QUERY = /* groq */ `{
  "published": *[
    _type == "article" &&
    !(_id in path("drafts.**")) &&
    defined(slug.current)
  ] | order(publishedAt desc, slug.current asc) {
    _id,
    "slug": slug.current,
    title,
    "primaryTag": coalesce(primaryTag, tags[0]),
    publishedAt,
    updatedAt,
    "sitemapLastModified": coalesce(updatedAt, _updatedAt),
    "noIndex": seo.noIndex == true,
    "coverImage": coalesce(coverImage.asset->url, coverImage.legacyPath),
    "video": video { youtubeVideoId, uploadDate },
    body
  },
  "draftIds": *[_type == "article" && _id in path("drafts.**")]._id
}`;

export async function getRawSanityInventory(): Promise<RawSanityInventory> {
  const token = process.env.SANITY_API_READ_TOKEN;
  if (!token) {
    throw new Error(
      "Sanity integration tests require SANITY_API_READ_TOKEN; refusing to skip live source assertions.",
    );
  }

  const projectId = process.env.PUBLIC_SANITY_PROJECT_ID || "th4gij3b";
  const dataset = process.env.PUBLIC_SANITY_DATASET || "production";
  const response = await fetch(
    `https://${projectId}.api.sanity.io/v2026-08-26/data/query/${dataset}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: RAW_INVENTORY_QUERY }),
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
