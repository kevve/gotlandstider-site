import type { ArticleEntry } from "./content";
import { articlePath } from "./content";
import { canonicalUrl } from "./urls";
import { buildVideoObject } from "./content/video";

export const SITE_NAME = "Gotlandstider";
export const DEFAULT_DESCRIPTION =
  "Upptäck Gotlands dolda pärlor och följ resan mot ett arkitektritat sommarhus i Ljugarn. Året runt.";

export const ORGANIZATION_JSON_LD = {
  "@type": "Organization",
  name: SITE_NAME,
  alternateName: "Gotlandstider - Din guide till det gotländska ö-livet",
  url: canonicalUrl("/"),
  logo: canonicalUrl("/gotlandstider-logo-512.png"),
  image: canonicalUrl("/content/hero-coastline.webp"),
  email: "info@gotlandstider.se",
  description: DEFAULT_DESCRIPTION,
  knowsAbout: [
    "Gotland Restips",
    "Gotländska Entreprenörer",
    "Husbygge & Arkitektur",
    "Hem & Hus",
    "Inredning & Design",
    "Loppis",
    "Gotland",
    "Ljugarn",
    "Content Production",
  ],
  areaServed: { "@type": "AdministrativeArea", name: "Gotlands län" },
  founders: [
    { "@type": "Person", name: "Kevin" },
    { "@type": "Person", name: "Henrik" },
  ],
  address: {
    "@type": "PostalAddress",
    addressLocality: "Ljugarn",
    addressRegion: "Gotland",
    postalCode: "623 65",
    addressCountry: "SE",
  },
  sameAs: [
    "https://www.instagram.com/gotlandstider/",
    "https://www.tiktok.com/@gotlandstider",
  ],
};

export function buildHomepageJsonLd(featured: ArticleEntry) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      ORGANIZATION_JSON_LD,
      ...(featured.data.video ? [buildVideoJsonLd(featured)] : []),
    ],
  };
}

export function buildArticleJsonLd(article: ArticleEntry) {
  const pageUrl = canonicalUrl(articlePath(article.data.slug));
  const image = article.data.coverImage;

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.data.title,
    description: article.data.excerpt,
    datePublished: article.data.publishedAt,
    dateModified: article.data.updatedAt,
    inLanguage: "sv-SE",
    image: canonicalUrl(image),
    mainEntityOfPage: pageUrl,
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: ORGANIZATION_JSON_LD,
    ...(article.data.video ? { video: buildVideoJsonLd(article) } : {}),
  };
}

export function buildVideoJsonLd(article: ArticleEntry) {
  const video = article.data.video;
  if (!video) {
    throw new Error(`Article ${article.data.slug} has no video metadata`);
  }

  return buildVideoObject(video, article.data);
}
