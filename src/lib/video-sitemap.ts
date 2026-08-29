import type { ArticleEntry } from "./content/types";
import { videoPublicationDate, youtubeEmbedUrl } from "./content/video";
import { canonicalUrl } from "./urls";

export function renderVideoSitemapXml(article: ArticleEntry): string[] {
  const { video } = article.data;
  if (!video) return [];

  const lines = [
    "      <video:video>",
    `         <video:thumbnail_loc>${escapeXml(canonicalUrl(article.data.coverImage))}</video:thumbnail_loc>`,
    `         <video:title>${escapeXml(article.data.title)}</video:title>`,
    `         <video:description>${escapeXml(article.data.excerpt)}</video:description>`,
  ];

  lines.push(
    `         <video:player_loc allow_embed="yes">${escapeXml(youtubeEmbedUrl(video.youtubeVideoId))}</video:player_loc>`,
    `         <video:publication_date>${escapeXml(videoPublicationDate(video))}</video:publication_date>`,
    "         <video:family_friendly>yes</video:family_friendly>",
    "         <video:live>no</video:live>",
    "      </video:video>",
  );
  return lines;
}

export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
