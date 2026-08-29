import { youtubeThumbnailUrl } from "./video";

interface ArticleCoverInput {
  slug: string;
  coverImage?: string | null;
  videoThumbnail?: string | null;
  youtubeVideoId?: string | null;
  heroImage?: string | null;
}

/** Normalize legacy and current source fields to one required article cover. */
export function resolveArticleCoverImage({
  slug,
  coverImage,
  videoThumbnail,
  youtubeVideoId,
  heroImage,
}: ArticleCoverInput): string {
  const resolved =
    coverImage ||
    videoThumbnail ||
    (youtubeVideoId ? youtubeThumbnailUrl(youtubeVideoId) : undefined) ||
    heroImage;

  if (!resolved) {
    throw new Error(
      `Non-video article ${slug} is missing a cover image (coverImage or legacy heroImage)`,
    );
  }

  return resolved;
}
