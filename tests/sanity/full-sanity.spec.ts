import { CATEGORIES, categoryPath } from "../../src/lib/categories";
import { getPrimaryTagColor } from "../../src/lib/primary-tag";
import type { Locator, Page } from "@playwright/test";
import { expect, test } from "../e2e/browser-fixture";
import { articlePath } from "../e2e/fixtures";
import { getRawSanityInventory, type RawSanityInventory } from "./live-source";

let inventory: RawSanityInventory;

test.beforeAll(async () => {
  inventory = await getRawSanityInventory();
  expect(inventory.published.length).toBeGreaterThan(0);
});

test("full live Sanity walk retains every article desktop layout, tags, dates and video privacy contract", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  for (const article of inventory.published) {
    await page.goto(articlePath(article.slug));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      article.title,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `https://gotlandstider.se${articlePath(article.slug)}`,
    );
    const intro = await box(page, ".article-intro", article.slug);
    const body = await box(page, ".article-body", article.slug);
    const media = await box(page, ".article-media", article.slug);
    const related = await box(page, ".article-related", article.slug);
    expect(body.y, article.slug).toBeGreaterThanOrEqual(intro.y + intro.height);
    expect(body.y, article.slug).toBeLessThan(intro.y + intro.height + 48);
    expect(related.y, article.slug).toBeGreaterThanOrEqual(
      media.y + media.height,
    );
    expect(related.y, article.slug).toBeLessThan(media.y + media.height + 48);

    const tag = page.locator(".article-tags > .primary-tag");
    await expect(tag).toHaveText(article.primaryTag);
    await expect(tag).toHaveAttribute(
      "href",
      categoryPath(
        CATEGORIES.find((category) => category.tag === article.primaryTag)!
          .slug,
      ),
    );
    expect(await tag.evaluate(primaryTagColor)).toBe(
      getPrimaryTagColor(article.primaryTag),
    );
    await expect(page.locator(".article-author-name")).toHaveText(
      "Gotlandstider",
    );
    await expect(page.locator(".article-author-name")).toHaveAttribute(
      "href",
      "/#about",
    );
    await expect(page.locator(".article-author-name")).toHaveAttribute(
      "rel",
      "author",
    );
    const dates = page.locator(".article-dates time");
    await expect(dates).toHaveCount(
      article.updatedAt === article.publishedAt ? 1 : 2,
    );
    await expect(dates.last()).toHaveAttribute("datetime", article.publishedAt);
    if (article.updatedAt !== article.publishedAt)
      await expect(dates.first()).toHaveAttribute(
        "datetime",
        article.updatedAt,
      );
    if (article.video)
      await expect(page.locator("iframe")).toHaveAttribute(
        "src",
        `https://www.youtube-nocookie.com/embed/${article.video.youtubeVideoId}`,
      );
    else await expect(page.locator("iframe")).toHaveCount(0);
  }
});

test("full live Sanity archive is unique and category pages retain raw membership, links and keyboard state", async ({
  page,
}) => {
  await page.goto("/artiklar/");
  const archiveHrefs = await page
    .locator("[data-article-grid] .article-card > a")
    .evaluateAll((links) =>
      links
        .map((link) => (link as HTMLAnchorElement).getAttribute("href"))
        .filter((href): href is string => Boolean(href)),
    );
  expect(archiveHrefs).toHaveLength(new Set(archiveHrefs).size);
  expect(archiveHrefs.sort()).toEqual(
    inventory.published.map((article) => articlePath(article.slug)).sort(),
  );

  for (const category of CATEGORIES) {
    await page.goto(categoryPath(category.slug));
    const navigation = page.locator(
      '[data-category-nav][aria-label="Artikelkategorier"]',
    );
    await expect(
      navigation.getByRole("link", { name: "Alla artiklar" }),
    ).toHaveAttribute("href", "/artiklar/");
    for (const candidate of CATEGORIES) {
      const link = navigation.getByRole("link", { name: candidate.tag });
      await expect(link).toHaveAttribute("href", categoryPath(candidate.slug));
      if (candidate.slug === category.slug)
        await expect(link).toHaveAttribute("aria-current", "page");
      else await expect(link).not.toHaveAttribute("aria-current");
    }
    const cards = await page
      .locator("[data-category-page] .article-card > a")
      .evaluateAll((links) =>
        links.map((link) => (link as HTMLAnchorElement).getAttribute("href")),
      );
    expect(cards).toEqual(
      inventory.published
        .filter((article) => article.primaryTag === category.tag)
        .map((article) => articlePath(article.slug)),
    );
    const keyboardTarget = navigation.getByRole("link", {
      name: CATEGORIES.find((candidate) => candidate.slug !== category.slug)!
        .tag,
    });
    await focus(page, keyboardTarget);
    await expect(keyboardTarget).toBeFocused();
    await expect(keyboardTarget).toHaveCSS("outline-style", "solid");
  }
});

test("full live Sanity keeps article tags, related cards and category navigation usable at mobile breakpoints", async ({
  page,
}) => {
  const article = inventory.published[0];
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(articlePath(article.slug));
    const body = await box(page, ".article-body", article.slug);
    const related = await box(page, ".article-related", article.slug);
    expect(related.y).toBeGreaterThanOrEqual(body.y + body.height);
    const primary = await box(
      page,
      ".article-tags > .primary-tag",
      article.slug,
    );
    const pair = await box(
      page,
      ".article-tags > .article-tag-pair",
      article.slug,
    );
    const pairRows = await page
      .locator(".article-tags > .article-tag-pair span")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getBoundingClientRect().top),
      );
    expect(new Set(pairRows).size).toBe(1);
    expect(pair.y).toBeGreaterThanOrEqual(primary.y);
    const card = page.locator(".article-related .article-card").first();
    await card.hover();
    await expect(card).toHaveCSS("border-radius", "17.6px");
    await expect(card).toHaveCSS("overflow", "hidden");

    await page.goto(categoryPath(CATEGORIES[0].slug));
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
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
    expect(linkBoxes.every((box) => box.left >= 0 && box.right <= width)).toBe(
      true,
    );
    expect(new Set(linkBoxes.map((box) => box.top)).size).toBeGreaterThan(1);
  }
});

test("full live Sanity representative pages have no broken same-origin links or assets", async ({
  page,
  request,
}) => {
  const paths = [
    "/",
    "/artiklar/",
    articlePath(inventory.published[0].slug),
    articlePath(
      inventory.published.find((article) => article.video)?.slug ??
        inventory.published[0].slug,
    ),
  ];
  const urls = new Set<string>();
  for (const path of paths) {
    await page.goto(path);
    for (const url of await page
      .locator("a[href], img[src], source[src]")
      .evaluateAll((elements) => {
        const urls = new Set<string>();
        for (const element of elements) {
          const raw =
            element.getAttribute("href") ?? element.getAttribute("src");
          if (!raw || raw.startsWith("#")) continue;
          const url = new URL(raw, window.location.href);
          if (url.origin === window.location.origin) {
            url.hash = "";
            urls.add(url.href);
          }
        }
        return [...urls];
      }))
      urls.add(url);
  }
  for (const url of urls)
    expect((await request.get(url)).status(), url).toBeLessThan(400);
});

async function box(page: Page, selector: string, label: string) {
  const value = await page.locator(selector).boundingBox();
  expect(value, label).not.toBeNull();
  return value!;
}
async function focus(page: Page, target: Locator) {
  for (let index = 0; index < 24; index += 1) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((element) => document.activeElement === element))
      return;
  }
  throw new Error("Keyboard navigation did not reach category link");
}
function primaryTagColor(element: Element): string {
  return getComputedStyle(element)
    .getPropertyValue("--primary-tag-color")
    .trim();
}
