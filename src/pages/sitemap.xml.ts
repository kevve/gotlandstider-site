import type { APIRoute } from "astro";
import {
  getPublishedArticles,
  articlePath,
  articlesPath,
  type ArticleEntry,
} from "../lib/content";
import { canonicalUrl } from "../lib/urls";
import { escapeXml, renderVideoSitemapXml } from "../lib/video-sitemap";
import {
  categoriesPath,
  categoryPath,
  groupArticlesByCategory,
} from "../lib/categories";

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
  const publishedArticles = await getPublishedArticles();
  const articles = publishedArticles.filter(
    (article) => !article.data.seo?.noIndex,
  );
  const latest = articles.reduce(
    (date, article) =>
      article.sitemapLastModified > date ? article.sitemapLastModified : date,
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
      loc: canonicalUrl(articlesPath()),
      lastmod: latest,
      changefreq: "weekly",
      priority: "0.8",
    }),
    renderEntry({
      loc: canonicalUrl(categoriesPath()),
      changefreq: "weekly",
      priority: "0.7",
    }),
    ...groupArticlesByCategory(publishedArticles)
      .filter(({ articles: categoryArticles }) => categoryArticles.length > 0)
      .map(({ category }) =>
        renderEntry({
          loc: canonicalUrl(categoryPath(category.slug)),
          changefreq: "weekly",
          priority: "0.7",
        }),
      ),
    ...articles.map((article) =>
      renderEntry({
        loc: canonicalUrl(articlePath(article.data.slug)),
        lastmod: article.sitemapLastModified,
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
  lastmod?: string;
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
  const lines = ["   <url>", `      <loc>${escapeXml(loc)}</loc>`];

  if (lastmod) lines.push(`      <lastmod>${escapeXml(lastmod)}</lastmod>`);
  lines.push(`      <changefreq>${changefreq}</changefreq>`);
  lines.push(`      <priority>${priority}</priority>`);

  for (const image of images) {
    lines.push("      <image:image>");
    lines.push(`         <image:loc>${escapeXml(image.loc)}</image:loc>`);
    lines.push(`         <image:title>${escapeXml(image.title)}</image:title>`);
    lines.push("      </image:image>");
  }

  if (article?.data.video) {
    lines.push(...renderVideoSitemapXml(article));
  }

  lines.push("   </url>");
  return lines.join("\n");
}
