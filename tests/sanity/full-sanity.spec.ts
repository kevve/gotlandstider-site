import { expect, test } from "@playwright/test";
import { CATEGORIES, categoryPath } from "../../src/lib/categories";
import { articlePath } from "../../src/lib/content";
import { getRawSanityInventory, type RawSanityInventory } from "./live-source";

let inventory: RawSanityInventory;

test.beforeAll(async () => {
  inventory = await getRawSanityInventory();
  expect(inventory.published.length).toBeGreaterThan(0);
});

test("full live Sanity walk checks every article route, layout, canonical and video privacy", async ({
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
    await expect(page.locator(".article-body")).toBeVisible();
    await expect(page.locator(".article-media")).toBeVisible();
    await expect(page.locator(".article-related")).toBeVisible();
    const intro = await page.locator(".article-intro").boundingBox();
    const body = await page.locator(".article-body").boundingBox();
    const media = await page.locator(".article-media").boundingBox();
    const related = await page.locator(".article-related").boundingBox();
    expect(intro && body && media && related, article.slug).toBeTruthy();
    expect(body!.y).toBeGreaterThanOrEqual(intro!.y + intro!.height);
    expect(related!.y).toBeGreaterThanOrEqual(media!.y + media!.height);
    if (article.video) {
      await expect(page.locator("iframe")).toHaveAttribute(
        "src",
        `https://www.youtube-nocookie.com/embed/${article.video.youtubeVideoId}`,
      );
    } else {
      await expect(page.locator("iframe")).toHaveCount(0);
    }
  }
});

test("full live Sanity category walk checks membership, responsive navigation and empty states", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const category of CATEGORIES) {
    await page.goto(categoryPath(category.slug));
    const expected = inventory.published
      .filter((article) => article.primaryTag === category.tag)
      .map((article) => articlePath(article.slug));
    const actual = await page
      .locator('[data-category-page] a[href^="/artiklar/"]')
      .evaluateAll((links) =>
        links
          .map((link) => (link as HTMLAnchorElement).getAttribute("href"))
          .filter((href): href is string => Boolean(href)),
      );
    expect(actual).toEqual(expected);
    expect(
      await page
        .locator("[data-category-nav]")
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);
    if (expected.length === 0)
      await expect(page.locator("[data-category-empty]")).toBeVisible();
  }
});

test("full live Sanity homepage interactions, no-JavaScript links and public resources remain usable", async ({
  page,
  browser,
  request,
}) => {
  await page.goto("/");
  await expect(page.locator("header")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: /meny/i }).click();
  await expect(page.locator("[data-mobile-menu]")).toBeVisible();
  await page.getByRole("button", { name: /stäng/i }).click();
  await expect(page.locator("[data-mobile-menu]")).toBeHidden();

  const noJavaScript = await browser.newContext({ javaScriptEnabled: false });
  const noJavaScriptPage = await noJavaScript.newPage();
  await noJavaScriptPage.goto("/");
  await expect(noJavaScriptPage.locator('a[href="/artiklar/"]')).toHaveCount(2);
  await noJavaScript.close();

  for (const path of [
    "/generated/content/articles.json",
    "/sitemap.xml",
    "/llms.txt",
    "/robots.txt",
    "/agent/openapi.json",
  ]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
  }
});
