import type { ArticleVideo } from "./types";
import { canonicalUrl } from "../urls";

const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

type VideoInput = Omit<ArticleVideo, "youtubeVideoId" | "uploadDate"> & {
  youtubeVideoId?: string | null;
  uploadDate?: string | null;
};

/** Validate the canonical YouTube metadata shared by Markdown and Sanity sources. */
export function normalizeArticleVideo(
  video: VideoInput,
  articleSlug: string,
): ArticleVideo {
  if (!video.youtubeVideoId || !YOUTUBE_VIDEO_ID.test(video.youtubeVideoId)) {
    throw new Error(
      `Article ${articleSlug} has a missing or invalid YouTube video ID`,
    );
  }
  if (!video.uploadDate) {
    throw new Error(
      `Article ${articleSlug} canonical YouTube video is missing uploadDate`,
    );
  }

  return {
    youtubeVideoId: video.youtubeVideoId,
    uploadDate: video.uploadDate,
    socialLinks: video.socialLinks,
  };
}

/** Stable YouTube-hosted fallback used when a video has no stored cover asset. */
export function youtubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}

export function videoPublicationDate(
  video: Pick<ArticleVideo, "uploadDate">,
): string {
  return video.uploadDate;
}

export function buildVideoObject(
  video: ArticleVideo,
  article: {
    title: string;
    excerpt: string;
    publishedAt: string;
    coverImage: string;
  },
) {
  return {
    "@type": "VideoObject",
    name: article.title,
    description: article.excerpt,
    thumbnailUrl: canonicalUrl(article.coverImage),
    uploadDate: videoPublicationDate(video),
    embedUrl: youtubeEmbedUrl(video.youtubeVideoId),
  };
}
