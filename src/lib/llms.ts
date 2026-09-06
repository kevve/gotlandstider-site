import { articlePath, articlesPath, type ArticleEntry } from "./content";
import { categoriesPath } from "./categories";
import { canonicalUrl } from "./urls";

export function renderLlmsTxt(articles: readonly ArticleEntry[]): string {
  const publicArticles = articles.filter(
    (article) => !article.data.seo?.noIndex,
  );

  const lines = [
    "# Gotlandstider",
    "",
    "> Gotlandstider är en svensk redaktionell guide till Gotlands platser, människor, mat, kultur, natur och öliv.",
    "",
    "Innehållet är på svenska och bygger på Gotlandstiders egna urval, guider och upplevelser. Artikellänkarna nedan leder till webbplatsens kanoniska HTML-sidor. Publicerings- och uppdateringsdatum finns på respektive artikel och i det maskinläsbara artikelindexet.",
    "",
    "## Börja här",
    "",
    `- [Startsidan](${canonicalUrl("/")}): En introduktion till Gotlandstider och aktuellt utvalt innehåll.`,
    `- [Alla artiklar](${canonicalUrl(articlesPath())}): Hela det publicerade artikelarkivet i omvänd kronologisk ordning.`,
    `- [Kategorier](${canonicalUrl(categoriesPath())}): Artiklar grupperade efter Gotlandstiders huvudkategorier.`,
    "",
    "## Artiklar",
    "",
    ...publicArticles.map(
      (article) =>
        `- [${escapeMarkdown(article.data.title)}](${canonicalUrl(articlePath(article.data.slug))}): ${escapeMarkdown(article.data.excerpt)}`,
    ),
    "",
    "## Maskinläsbara resurser",
    "",
    `- [Artikelindex](${canonicalUrl("/generated/content/articles.json")}): Metadata för alla publicerade artiklar i JSON-format.`,
    `- [API-katalog](${canonicalUrl("/.well-known/api-catalog")}): Upptäckt av webbplatsens offentliga innehållsresurser.`,
    `- [OpenAPI-beskrivning](${canonicalUrl("/agent/openapi.json")}): Schema för de offentliga, skrivskyddade innehållsflödena.`,
    `- [Webbplatsmetadata](${canonicalUrl("/agent/site.jsonld")}): Strukturerad beskrivning av Gotlandstider i JSON-LD-format.`,
    "",
    "## Optional",
    "",
    `- [Dokumentation för innehållsflöden](${canonicalUrl("/agent/docs/")}): Människoläsbar dokumentation för de offentliga resurserna.`,
    `- [Sitemap](${canonicalUrl("/sitemap.xml")}): Fullständig lista över indexerbara webbsidor.`,
    "",
  ];

  return lines.join("\n");
}

function escapeMarkdown(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .replace(/([\\[\]])/g, "\\$1");
}
