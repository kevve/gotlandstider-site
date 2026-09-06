import { expect, test, type Locator, type Page } from "@playwright/test";
import { articlePath, draftArticleSlugs } from "./fixtures";

const categories = [
  {
    label: "Mat & dryck",
    slug: "mat-och-dryck",
    description:
      "Restauranger, bagerier och smakupplevelser värda en omväg på Gotland.",
  },
  {
    label: "Loppis & second hand",
    slug: "loppis-och-second-hand",
    description: "Loppisar, second hand och platser att fynda runt hela ön.",
  },
  {
    label: "Hem & inredning",
    slug: "hem-och-inredning",
    description: "Hem och inredning, samt resan mot ett sommarhus i Ljugarn.",
  },
  {
    label: "Upplevelser & nöjen",
    slug: "upplevelser-och-nojen",
    description: "Hantverk, evenemang och upplevelser under hela året.",
  },
  {
    label: "Utflykter & natur",
    slug: "utflykter-och-natur",
    description: "Stränder och utflyktsmål i det gotländska landskapet.",
  },
] as const;

interface PublicArticle {
  slug: string;
  primaryTag: (typeof categories)[number]["label"];
  publishedAt: string;
}

async function publishedArticles(page: Page) {
  const response = await page.request.get("/generated/content/articles.json");
  expect(response.status()).toBe(200);
  const payload = (await response.json()) as { items: PublicArticle[] };
  return payload.items;
}

function categoryPath(slug: string) {
  return `/kategorier/${slug}/`;
}

function newestFirst(articles: PublicArticle[]) {
  return [...articles].sort(
    (left, right) =>
      right.publishedAt.localeCompare(left.publishedAt) ||
      left.slug.localeCompare(right.slug),
  );
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
}

async function expectCategoryNavigationFitsMobileViewport(page: Page) {
  const navigation = page.locator("[data-category-nav]");
  expect(
    await navigation.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  const linkBoxes = await navigation.locator("a").evaluateAll((links) =>
    links.map((link) => {
      const box = link.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top };
    }),
  );
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  expect(
    linkBoxes.every((box) => box.left >= 0 && box.right <= viewport!.width),
  ).toBe(true);
  expect(new Set(linkBoxes.map((box) => box.top)).size).toBeGreaterThan(1);
}

async function focusWithKeyboard(page: Page, target: Locator) {
  for (let index = 0; index < 24; index += 1) {
    await page.keyboard.press("Tab");
    if (
      await target.evaluate((element) => document.activeElement === element)
    ) {
      return;
    }
  }
  throw new Error("Keyboard navigation did not reach the category link");
}

test("category directory exposes every category with its description", async ({
  page,
}) => {
  await page.goto("/kategorier/");

  const directory = page.locator("[data-category-directory]");
  await expect(directory).toBeVisible();
  const cards = directory.locator("[data-category-card]");
  await expect(cards).toHaveCount(categories.length);

  for (const category of categories) {
    const card = cards.filter({ hasText: category.label });
    await expect(card).toHaveCount(1);
    await expect(
      card.getByRole("link", { name: category.label }),
    ).toHaveAttribute("href", categoryPath(category.slug));
    await expect(card.locator("p")).toHaveText(category.description);
  }
  await expect(directory.getByText(/\d+ artiklar?/)).toHaveCount(0);
  await expect(
    directory.getByText("Utforska kategorin", { exact: false }),
  ).toHaveCount(0);
});

test("archive and category heroes place category navigation directly below their intros", async ({
  page,
}) => {
  for (const path of [
    "/artiklar/",
    "/kategorier/",
    categoryPath(categories[0].slug),
  ]) {
    await page.goto(path);
    const hero = page.locator(".archive-hero");
    const navigation = hero.locator("[data-category-nav]");
    await expect(navigation).toBeVisible();
    expect(
      await hero.evaluate((element) => {
        const intro = element.querySelector("p");
        const nav = element.querySelector("[data-category-nav]");
        const next = intro?.nextElementSibling;
        return next instanceof Element && next.contains(nav);
      }),
      path,
    ).toBe(true);
  }

  await page.goto(categoryPath(categories[0].slug));
  await expect(page.locator(".archive-hero > div > span")).toHaveText(
    "Arkivet",
  );
});

test("category pages contain only their published primary-tag articles, newest first", async ({
  page,
}) => {
  const articles = await publishedArticles(page);

  for (const category of categories) {
    await page.goto(categoryPath(category.slug));
    const expected = newestFirst(
      articles.filter((article) => article.primaryTag === category.label),
    );
    const cards = page.locator("[data-category-page] .article-card");
    await expect(cards).toHaveCount(expected.length);
    await expect(page.locator(".category-count")).toHaveCount(0);
    expect(
      await cards.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("data-primary-tag")),
      ),
    ).toEqual(Array(expected.length).fill(category.label));

    const hrefs = await cards
      .locator(":scope > a")
      .evaluateAll((links) =>
        links.map((link) => (link as HTMLAnchorElement).getAttribute("href")),
      );
    expect(hrefs).toEqual(expected.map((article) => articlePath(article.slug)));

    for (const draftSlug of draftArticleSlugs) {
      expect(hrefs).not.toContain(articlePath(draftSlug));
    }
  }
});

test("category SEO URLs are canonical slash URLs and appear in the sitemap", async ({
  page,
  request,
}) => {
  const articles = await publishedArticles(page);
  const sitemap = await request.get("/sitemap.xml");
  const sitemapXml = await sitemap.text();
  expect(sitemap.status()).toBe(200);
  expect(sitemapXml).toContain("https://gotlandstider.se/kategorier/");

  for (const category of categories) {
    const path = categoryPath(category.slug);
    const canonical = `https://gotlandstider.se${path}`;
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      canonical,
    );
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      "content",
      canonical,
    );
    const articleCount = articles.filter(
      (article) => article.primaryTag === category.label,
    ).length;
    if (articleCount > 0) {
      expect(sitemapXml).toContain(canonical);
    } else {
      await expect(page.locator("[data-category-empty]")).toBeVisible();
      await expect(
        page
          .locator("[data-category-empty]")
          .getByRole("link", { name: "Alla artiklar" }),
      ).toHaveAttribute("href", "/artiklar/");
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        "content",
        /noindex/,
      );
      expect(sitemapXml).not.toContain(canonical);
    }
  }
});

test("unknown category is a 404", async ({ request }) => {
  expect((await request.get("/kategorier/finns-inte/")).status()).toBe(404);
});

test("category navigation is ordinary, accessible link navigation", async ({
  page,
}) => {
  await page.goto("/artiklar/");
  const navigation = page.locator(
    '[data-category-nav][aria-label="Artikelkategorier"]',
  );
  await expect(navigation).toBeVisible();
  await expect(
    navigation.getByRole("link", { name: "Alla artiklar" }),
  ).toHaveAttribute("href", "/artiklar/");

  for (const category of categories) {
    await expect(
      navigation.getByRole("link", { name: category.label }),
    ).toHaveAttribute("href", categoryPath(category.slug));
  }

  await page.goto(categoryPath(categories[0].slug));
  const activeNavigation = page.locator(
    '[data-category-nav][aria-label="Artikelkategorier"]',
  );
  await expect(
    activeNavigation.getByRole("link", { name: categories[0].label }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    activeNavigation.getByRole("link", { name: "Alla artiklar" }),
  ).not.toHaveAttribute("aria-current");
  for (const category of categories.slice(1)) {
    await expect(
      activeNavigation.getByRole("link", { name: category.label }),
    ).not.toHaveAttribute("aria-current");
  }
  await expect(
    page.locator('.desktop-nav a[href="/artiklar/"]'),
  ).not.toHaveAttribute("aria-current", "page");

  const keyboardTarget = activeNavigation.getByRole("link", {
    name: categories[1].label,
  });
  await focusWithKeyboard(page, keyboardTarget);
  await expect(keyboardTarget).toBeFocused();
  await expect(keyboardTarget).toHaveCSS("outline-style", "solid");

  await activeNavigation
    .getByRole("link", { name: categories[1].label })
    .click();
  await expect(page).toHaveURL(categoryPath(categories[1].slug));
  await page
    .locator('[data-category-nav][aria-label="Artikelkategorier"]')
    .getByRole("link", { name: "Alla artiklar" })
    .click();
  await expect(page).toHaveURL("/artiklar/");
});

test("category archive UI stays usable at narrow mobile widths", async ({
  page,
}) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/kategorier/");
    await expectNoHorizontalOverflow(page);
    await expect(page.locator("[data-category-directory]")).toBeVisible();

    await page.goto(categoryPath(categories[0].slug));
    await expectNoHorizontalOverflow(page);
    await expectCategoryNavigationFitsMobileViewport(page);
    await expect(page.locator("[data-category-page]")).toBeVisible();
  }
});

test("article primary tags link to their standalone category pages while cards remain whole links", async ({
  page,
}) => {
  const articles = await publishedArticles(page);
  const article = articles.find(
    (item) => item.primaryTag === categories[0].label,
  );
  expect(article).toBeDefined();
  await page.goto(articlePath(article!.slug));
  const tag = page.locator(".article-tags > .primary-tag");
  await expect(tag).toHaveText(categories[0].label);
  await expect(tag).toHaveAttribute("href", categoryPath(categories[0].slug));
  await tag.click();
  await expect(page).toHaveURL(categoryPath(categories[0].slug));

  const cards = page.locator("[data-category-page] .article-card");
  await expect(cards).not.toHaveCount(0);
  for (const card of await cards.all()) {
    await expect(card.locator(":scope > a")).toHaveCount(1);
    await expect(card.locator("a")).toHaveCount(1);
  }
});

test.describe("category navigation without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("keeps the category links available and navigable", async ({ page }) => {
    await page.goto("/kategorier/");
    const navigation = page.locator(
      '[data-category-nav][aria-label="Artikelkategorier"]',
    );
    const category = categories[2];
    const link = navigation.getByRole("link", { name: category.label });
    await expect(link).toHaveAttribute("href", categoryPath(category.slug));
    await link.click();
    await expect(page).toHaveURL(categoryPath(category.slug));
    await expect(page.locator("[data-category-page]")).toBeVisible();
  });
});
