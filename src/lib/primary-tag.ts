import type { PrimaryTag } from "./content/taxonomy";

export const PRIMARY_TAG_COLORS = {
  "Mat & dryck": "#7d4f64",
  "Loppis & second hand": "#7a651f",
  "Hem & inredning": "#53637a",
  "Upplevelser & nöjen": "#8c5e45",
  "Utflykter & natur": "#3f6250",
} satisfies Record<PrimaryTag, string>;

export const PRIMARY_TAG_FALLBACK_COLOR =
  PRIMARY_TAG_COLORS["Upplevelser & nöjen"];

export function getPrimaryTagColor(primaryTag: string): string {
  return (
    PRIMARY_TAG_COLORS[primaryTag as PrimaryTag] ?? PRIMARY_TAG_FALLBACK_COLOR
  );
}
