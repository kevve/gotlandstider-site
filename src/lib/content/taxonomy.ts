export const PRIMARY_TAGS = [
  "Mat & dryck",
  "Loppis & second hand",
  "Hem & inredning",
  "Upplevelser & nöjen",
  "Utflykter & natur",
] as const;

export type PrimaryTag = (typeof PRIMARY_TAGS)[number];

export const QUALIFIER_TAGS = [
  "Bageri",
  "Restaurang",
  "Hantverk",
  "Husprojekt",
  "Konserter",
  "Musikquiz",
  "Stränder",
  "Utsikt",
  "Loppisrunda",
  "Weekend",
  "Sommar",
  "Höst",
  "Guide",
] as const;

export interface ArticleTaxonomy {
  primaryTag: PrimaryTag;
  primaryLocation: { title: string };
  qualifierTag: (typeof QUALIFIER_TAGS)[number];
}

export function orderedArticleTags(
  taxonomy: ArticleTaxonomy,
): [ArticleTaxonomy["primaryTag"], string, ArticleTaxonomy["qualifierTag"]] {
  return [
    taxonomy.primaryTag,
    taxonomy.primaryLocation.title,
    taxonomy.qualifierTag,
  ];
}
