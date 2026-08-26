export const publicArticleSlugs = [
  "host-pa-gotland-2026-fem-tips-varda-omvagen",
  "big-pink-glasblaseri-mitt-pa-gotland",
  "sommarens-basta-konserter-pa-gotland-2026",
  "en-ny-matklassiker-i-visby",
  "kalkstensgolv-till-sommarhuset-i-ljugarn",
  "basta-stranderna-for-ett-aventyr",
  "en-natt-i-visby",
  "gotlands-kanske-basta-bageri",
  "bageriet-en-aret-runt-favorit",
  "tre-hypade-stallen-du-maste-besoka",
  "lugna-strander-gotland",
  "fem-anledningar-att-besoka-ljugarn",
  "arets-loppis-favoriter",
  "en-strand-for-stora-och-sma",
  "fem-platser-att-besoka-pa-gotland-2026",
  "musikquiz-och-god-mat-vid-stranden",
] as const;

export const draftArticleSlugs = [
  "katthammarsvik-salteriet",
  "projekt-ljugarn-fran-tomt-till-sommarhus",
] as const;

export const articlePath = (slug: string) => `/articles/${slug}/`;
