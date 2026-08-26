import type { APIRoute } from "astro";
import {
  getPublishedArticles,
  articlePath,
  type ArticleEntry,
} from "../lib/content";
import { canonicalUrl } from "../lib/urls";

export const prerender = true;

const HOMEPAGE_IMAGES = [
  {
    loc: canonicalUrl("/content/hero-coastline.webp"),
    title: "Gotlandstider vid Langhammars raukfält på Fårö",
  },
  {
    loc: canonicalUrl("/content/about-kevinhenrik.webp"),
    title: "Grundarna Kevin och Henrik",
  },
];

export const GET: APIRoute = async () => {
  const articles = (await getPublishedArticles()).filter(
    (article) => !article.data.seo?.noIndex,
  );
  const latest = articles.reduce(
    (date, article) =>
      article.data.publishedAt > date ? article.data.publishedAt : date,
    "2026-01-01",
  );
  const entries = [
    renderEntry({
      loc: canonicalUrl("/"),
      lastmod: latest,
      changefreq: "weekly",
      priority: "1.0",
      images: HOMEPAGE_IMAGES,
    }),
    renderEntry({
      loc: canonicalUrl("/articles/"),
      lastmod: latest,
      changefreq: "weekly",
      priority: "0.8",
    }),
    ...articles.map((article) =>
      renderEntry({
        loc: canonicalUrl(articlePath(article.data.slug)),
        lastmod: article.data.publishedAt,
        changefreq: "monthly",
        priority: "0.7",
        article,
      }),
    ),
  ];

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"',
    '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    "",
    ...entries,
    "</urlset>",
    "",
  ].join("\n");

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};

interface SitemapEntry {
  loc: string;
  lastmod: string;
  changefreq: "weekly" | "monthly";
  priority: string;
  images?: Array<{ loc: string; title: string }>;
  article?: ArticleEntry;
}

function renderEntry({
  loc,
  lastmod,
  changefreq,
  priority,
  images = [],
  article,
}: SitemapEntry) {
  const lines = [
    "   <url>",
    `      <loc>${escapeXml(loc)}</loc>`,
    `      <lastmod>${escapeXml(lastmod)}</lastmod>`,
    `      <changefreq>${changefreq}</changefreq>`,
    `      <priority>${priority}</priority>`,
  ];

  for (const image of images) {
    lines.push("      <image:image>");
    lines.push(`         <image:loc>${escapeXml(image.loc)}</image:loc>`);
    lines.push(`         <image:title>${escapeXml(image.title)}</image:title>`);
    lines.push("      </image:image>");
  }

  if (article?.data.video) {
    const { video } = article.data;
    lines.push("      <video:video>");
    lines.push(
      `         <video:thumbnail_loc>${escapeXml(canonicalUrl(video.thumbnail))}</video:thumbnail_loc>`,
    );
    lines.push(
      `         <video:title>${escapeXml(article.data.title)}</video:title>`,
    );
    lines.push(
      `         <video:description>${escapeXml(article.data.excerpt)}</video:description>`,
    );
    if (video.legacySources?.webm) {
      lines.push(
        `         <video:content_loc>${escapeXml(canonicalUrl(video.legacySources.webm))}</video:content_loc>`,
      );
    } else {
      lines.push(
        `         <video:player_loc allow_embed="yes">${escapeXml(video.embedUrl)}</video:player_loc>`,
      );
    }
    lines.push(
      `         <video:publication_date>${article.data.publishedAt}T00:00:00+00:00</video:publication_date>`,
    );
    lines.push("         <video:family_friendly>yes</video:family_friendly>");
    lines.push("         <video:live>no</video:live>");
    lines.push("      </video:video>");
  }

  lines.push("   </url>");
  return lines.join("\n");
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
