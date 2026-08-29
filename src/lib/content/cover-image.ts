import { youtubeThumbnailUrl } from "./video";

interface ArticleCoverInput {
  slug: string;
  coverImage?: string | null;
  youtubeVideoId?: string | null;
}

/** Resolve the stored cover or derive one for a video article. */
export function resolveArticleCoverImage({
  slug,
  coverImage,
  youtubeVideoId,
}: ArticleCoverInput): string {
  const resolved =
    coverImage ||
    (youtubeVideoId ? youtubeThumbnailUrl(youtubeVideoId) : undefined);

  if (!resolved) {
    throw new Error(`Non-video article ${slug} is missing a cover image`);
  }

  return resolved;
}
