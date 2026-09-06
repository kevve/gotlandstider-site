import { PRIMARY_TAGS, type PrimaryTag } from "./content/taxonomy";

export interface CategoryDefinition {
  tag: PrimaryTag;
  slug: string;
  title: string;
  intro: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
}

export interface CategoryGroup<T> {
  category: CategoryDefinition;
  articles: T[];
}

export const CATEGORY_BY_TAG = {
  "Mat & dryck": {
    tag: "Mat & dryck",
    slug: "mat-och-dryck",
    title: "Mat & dryck på Gotland",
    intro:
      "Smaka dig fram bland gotländska restauranger, bagerier och andra platser där råvaror, människor och miljö gör besöket minnesvärt.",
    description:
      "Restauranger, bagerier och smakupplevelser värda en omväg på Gotland.",
    seoTitle: "Mat & dryck på Gotland | Gotlandstider",
    seoDescription:
      "Upptäck Gotlandstiders guider till restauranger, bagerier och smakupplevelser på Gotland.",
  },
  "Loppis & second hand": {
    tag: "Loppis & second hand",
    slug: "loppis-och-second-hand",
    title: "Loppis & second hand på Gotland",
    intro:
      "Följ med till loppisar, gårdsbutiker och second hand-fynd runt ön.",
    description:
      "Loppisar, second hand och platser att fynda runt hela ön.",
    seoTitle: "Loppis & second hand på Gotland | Gotlandstider",
    seoDescription:
      "Hitta Gotlandstiders tips om loppisar, second hand och unika platser att fynda på Gotland.",
  },
  "Hem & inredning": {
    tag: "Hem & inredning",
    slug: "hem-och-inredning",
    title: "Hem & inredning på Gotland",
    intro:
      "Vi lyfter hem och inredning värd att inspireras av. Här får du också följa bygget av vårt eget sommarhus i Ljugarn.",
    description:
      "Hem och inredning, samt resan mot ett sommarhus i Ljugarn.",
    seoTitle: "Hem & inredning på Gotland | Gotlandstider",
    seoDescription:
      "Inspireras av hem, inredning, arkitektur och Gotlandstiders sommarhusprojekt i Ljugarn.",
  },
  "Upplevelser & nöjen": {
    tag: "Upplevelser & nöjen",
    slug: "upplevelser-och-nojen",
    title: "Upplevelser & nöjen på Gotland",
    intro:
      "Upptäck hantverk, evenemang och andra upplevelser som ger Gotland sin särskilda puls under hela året.",
    description:
      "Hantverk, evenemang och upplevelser under hela året.",
    seoTitle: "Upplevelser & nöjen på Gotland | Gotlandstider",
    seoDescription:
      "Upptäck hantverk, evenemang och andra upplevelser på Gotland.",
  },
  "Utflykter & natur": {
    tag: "Utflykter & natur",
    slug: "utflykter-och-natur",
    title: "Utflykter & natur på Gotland",
    intro:
      "Hitta stränder och utflyktsmål på Gotland som är värda omvägen.",
    description:
      "Stränder och utflyktsmål i det gotländska landskapet.",
    seoTitle: "Utflykter & natur på Gotland | Gotlandstider",
    seoDescription:
      "Hitta Gotlandstiders guider till stränder, naturupplevelser och utflyktsmål på Gotland.",
  },
} as const satisfies Record<PrimaryTag, CategoryDefinition>;

export const CATEGORIES: readonly CategoryDefinition[] = PRIMARY_TAGS.map(
  (tag) => CATEGORY_BY_TAG[tag],
);

export function categoriesPath(): string {
  return "/kategorier/";
}

export function categoryPath(slug: string): string {
  return `${categoriesPath()}${slug}/`;
}

export function getCategoryBySlug(
  slug: string,
): CategoryDefinition | undefined {
  return CATEGORIES.find((category) => category.slug === slug);
}

export function filterArticlesByPrimaryTag<
  T extends { data: { primaryTag: string } },
>(articles: readonly T[], tag: PrimaryTag): T[] {
  return articles.filter((article) => article.data.primaryTag === tag);
}

export function groupArticlesByCategory<
  T extends { data: { primaryTag: string } },
>(articles: readonly T[]): CategoryGroup<T>[] {
  return CATEGORIES.map((category) => ({
    category,
    articles: filterArticlesByPrimaryTag(articles, category.tag),
  }));
}
